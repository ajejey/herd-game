'use server'

import { nanoid } from 'nanoid';
import redis from '../redis/client';
import { GameStatus } from './types';

// Helper to update player's last active timestamp
async function updatePlayerActivity(roomCode, playerName) {
  const key = `activity:${roomCode}:${playerName}`;
  await redis.set(key, Date.now(), { ex: 60 }); // Expire after 1 minute
}

// Helper to get active players
async function getActivePlayers(roomCode, players) {
  const activeStatuses = await Promise.all(
    players.map(async (player) => {
      const lastActive = await redis.get(`activity:${roomCode}:${player.name}`);
      return {
        ...player,
        isConnected: lastActive && (Date.now() - parseInt(lastActive)) < 60000
      };
    })
  );
  return activeStatuses;
}

// export async function createGame(formData) {
//   const hostName = formData.get('hostName');
  
//   if (!hostName?.trim()) {
//     throw new Error('Host name is required');
//   }

//   const roomCode = nanoid(6).toUpperCase();
  
// //   const gameState = {
// //     roomCode,
// //     version: 1,
// //     startedAt: new Date().toISOString(),
// //     players: [{
// //       id: nanoid(),
// //       name: hostName,
// //       isHost: true,
// //       score: 0
// //     }],
// //     currentRound: null,
// //     status: GameStatus.WAITING
// //   };
// const gameState = {
//     roomCode,
//     version: 1,
//     startedAt: new Date().toISOString(),
//     players: [{
//       id: nanoid(),
//       name: hostName,
//       isHost: true,
//       score: 0
//     }],
//     questions: [], // This will store the list of questions for the game
//     currentRoundIndex: -1, // -1 indicates the game hasn't started yet
//     currentRound: null,
//     status: GameStatus.WAITING
//   };

//   await redis.set(
//     `game:${roomCode}`,
//     JSON.stringify(gameState),
//     { ex: 24 * 60 * 60 }
//   );

//   // Set initial activity
//   await updatePlayerActivity(roomCode, hostName);

//   return { success: true, roomCode };
// }

export async function createGame(formData) {
    const hostName = formData.get('hostName');
    const questions = JSON.parse(formData.get('questions'));
    
    if (!hostName?.trim()) {
      throw new Error('Host name is required');
    }
  
    if (!questions || questions.length !== 5) {
      throw new Error('Five questions are required');
    }
  
    const roomCode = nanoid(6).toUpperCase();
    
    const gameState = {
      roomCode,
      version: 1,
      startedAt: new Date().toISOString(),
      players: [{
        id: nanoid(),
        name: hostName,
        isHost: true,
        score: 0
      }],
      questions: questions,
      currentRoundIndex: -1, // -1 indicates the game hasn't started yet
      currentRound: null,
      status: GameStatus.WAITING
    };
  
    await redis.set(
      `game:${roomCode}`,
      JSON.stringify(gameState),
      { ex: 24 * 60 * 60 }
    );
  
    // Set initial activity
    await updatePlayerActivity(roomCode, hostName);
  
    return { success: true, roomCode };
  }

export async function joinGame(formData) {
  const roomCode = formData.get('roomCode');
  const playerName = formData.get('playerName');

  const gameData = await redis.get(`game:${roomCode}`);
  if (!gameData) {
    throw new Error('Game not found');
  }

//   const gameState = JSON.parse(gameData);
  const gameState = gameData;
  
  // Check if game already started
  if (gameState.status !== GameStatus.WAITING) {
    throw new Error('Game already in progress');
  }

  // Check if name is taken
  if (gameState.players.some(p => p.name === playerName)) {
    throw new Error('Name already taken');
  }

  // Add new player
  gameState.players.push({
    id: nanoid(),
    name: playerName,
    isHost: false,
    score: 0
  });

  await redis.set(
    `game:${roomCode}`,
    JSON.stringify(gameState),
    { ex: 24 * 60 * 60 }
  );

  // Set initial activity
  await updatePlayerActivity(roomCode, playerName);

  return { success: true };
}

export async function getGameState(roomCode) {
  const gameData = await redis.get(`game:${roomCode}`);
  if (!gameData) return null;

//   const gameState = JSON.parse(gameData);
  const gameState = gameData;
  
  // Update player activity statuses
  gameState.players = await getActivePlayers(roomCode, gameState.players);
  
  return gameState;
}

// export async function startGame(formData) {
//   const roomCode = formData.get('roomCode');
//   const playerName = formData.get('playerName');

//   const gameData = await redis.get(`game:${roomCode}`);
//   if (!gameData) throw new Error('Game not found');

// //   const gameState = JSON.parse(gameData);
//   const gameState = gameData;
  
//   // Verify host
//   const player = gameState.players.find(p => p.name === playerName);
//   if (!player?.isHost) throw new Error('Only host can start the game');

//   // Need at least 2 players
//   const activePlayers = await getActivePlayers(roomCode, gameState.players);
//   if (activePlayers.filter(p => p.isConnected).length < 2) {
//     throw new Error('Need at least 2 active players');
//   }

//   // Start game
//   gameState.status = GameStatus.PLAYING;
//   gameState.currentRound = {
//     question: "What's your favorite color?", // Replace with your question logic
//     answers: {},
//     endTime: new Date(Date.now() + 30000).toISOString() // 30 second rounds
//   };

//   await redis.set(
//     `game:${roomCode}`,
//     JSON.stringify(gameState),
//     { ex: 24 * 60 * 60 }
//   );

//   return { success: true };
// }

export async function startGame({ roomCode, playerName }) {
    const gameData = await redis.get(`game:${roomCode}`);
    if (!gameData) throw new Error('Game not found');
  
    const gameState = gameData
    
    // Verify host
    const player = gameState.players.find(p => p.name === playerName);
    if (!player?.isHost) throw new Error('Only host can start the game');
  
    // Need at least 2 players
    const activePlayers = await getActivePlayers(roomCode, gameState.players);
    if (activePlayers.filter(p => p.isConnected).length < 2) {
      throw new Error('Need at least 2 active players');
    }
  
    // Start game
    gameState.status = GameStatus.PLAYING;
    gameState.currentRoundIndex = 0;
    gameState.currentRound = {
      question: gameState.questions[0],
      answers: {},
      endTime: new Date(Date.now() + 30000).toISOString() // 30 second rounds
    };
  
    await redis.set(
      `game:${roomCode}`,
      JSON.stringify(gameState),
      { ex: 24 * 60 * 60 }
    );
  
    return { success: true, gameState };
  }

  export async function submitAnswer({ roomCode, playerName, answer }) {
    const gameData = await redis.get(`game:${roomCode}`);
    if (!gameData) throw new Error('Game not found');
  
    const gameState = gameData;
  
    if (gameState.status !== GameStatus.PLAYING) {
      throw new Error('Game is not in playing state');
    }
  
    const player = gameState.players.find(p => p.name === playerName);
    if (!player) throw new Error('Player not found');
  
    // Record answer
    gameState.currentRound.answers[player.id] = answer;
  
    // Update activity
    await updatePlayerActivity(roomCode, playerName);
  
    // Check if all active players have answered
    const activePlayers = await getActivePlayers(roomCode, gameState.players);
    const activePlayerIds = activePlayers
      .filter(p => p.isConnected)
      .map(p => p.id);
    
    const allAnswered = activePlayerIds.every(
      id => id in gameState.currentRound.answers
    );
  
    if (allAnswered) {
      // Move to round end and calculate scores
      gameState.status = GameStatus.ROUND_END;
  
      // Count answers
      const answerCounts = {};
      Object.values(gameState.currentRound.answers).forEach(ans => {
        answerCounts[ans] = (answerCounts[ans] || 0) + 1;
      });
  
      // Find the most common answer(s)
      const maxCount = Math.max(...Object.values(answerCounts));
      const herdAnswers = Object.keys(answerCounts).filter(ans => answerCounts[ans] === maxCount);
  
      // Award points for herd answers
      if (herdAnswers.length === 1) {
        Object.entries(gameState.currentRound.answers).forEach(([playerId, playerAnswer]) => {
          if (playerAnswer === herdAnswers[0]) {
            const player = gameState.players.find(p => p.id === playerId);
            if (player) player.score += 1;
          }
        });
      }
  
      // Deduct point for unique answer (black sheep)
      const uniqueAnswers = Object.keys(answerCounts).filter(ans => answerCounts[ans] === 1);
      if (uniqueAnswers.length === 1) {
        const blackSheepId = Object.entries(gameState.currentRound.answers)
          .find(([, ans]) => ans === uniqueAnswers[0])[0];
        const blackSheep = gameState.players.find(p => p.id === blackSheepId);
        if (blackSheep) blackSheep.score = Math.max(0, blackSheep.score - 1); // Ensure score doesn't go below 0
      }
  
      // Store round results for display
      gameState.currentRound.herdAnswers = herdAnswers;
      gameState.currentRound.blackSheepAnswer = uniqueAnswers[0] || null;
    }
  
    await redis.set(
      `game:${roomCode}`,
      JSON.stringify(gameState),
      { ex: 24 * 60 * 60 }
    );
  
    return { success: true, gameState };
  }

export async function moveToNextRound(roomCode) {
    const gameData = await redis.get(`game:${roomCode}`);
    if (!gameData) throw new Error('Game not found');
  
    const gameState = gameData
    
    gameState.currentRoundIndex++;
  
    if (gameState.currentRoundIndex >= gameState.questions.length) {
      // Game is over
      gameState.status = GameStatus.GAME_OVER;
      gameState.currentRound = null;
    } else {
      // Start next round
      gameState.status = GameStatus.PLAYING;
      gameState.currentRound = {
        question: gameState.questions[gameState.currentRoundIndex],
        answers: {},
        endTime: new Date(Date.now() + 30000).toISOString() // 30 second rounds
      };
    }
  
    await redis.set(
      `game:${roomCode}`,
      JSON.stringify(gameState),
      { ex: 24 * 60 * 60 }
    );
  
    return { success: true, gameState };
  }

// Lightweight polling endpoint for game state
export async function pollGameState(roomCode, playerName) {
    const gameState = await getGameState(roomCode);
    if (!gameState) return null;
  
    // Update player activity
    await updatePlayerActivity(roomCode, playerName);
  
    return gameState;
  }