'use client';

import { nanoid } from 'nanoid';
import redis from '../redis/client';
import { GameStatus } from './types';
import { createGame, getGame, updateGame } from '../appwrite/database';
import { areAnswersSimilar, normalizeAnswer } from './utils';

// Helper to update player's last active timestamp
export async function updatePlayerActivity(roomCode, playerName) {
  const gameState = await getGame(roomCode);
  const updatedPlayers = gameState.players.map(player => 
    player.name === playerName 
      ? { ...player, lastActive: new Date().toISOString(), isConnected: true } 
      : player
  );
  await updateGame(roomCode, { ...gameState, players: updatedPlayers });
}

// Helper to get active players
async function getActivePlayers(roomCode) {
  console.log("IN GET ACTIVE PLAYERS")
  try {
    const gameState = await getGame(roomCode);
    console.log('Game state in getActivePlayers:', gameState);
    
    if (!gameState) {
      throw new Error('Game not found');
    }

    const currentTime = Date.now();
    const activeThreshold = 10 * 60000; // 10 minutes

    const activePlayers = gameState.players.map(player => ({
      ...player,
      isConnected: (currentTime - new Date(player.lastActive).getTime()) < activeThreshold
    }));



    console.log(`Active players for `, activePlayers);

    // Update the game state with the new active statuses
    await updateGame(roomCode, { ...gameState, players: activePlayers });


    return activePlayers;
  } catch (error) {
    console.error('Failed to get active players:', error);
    throw error;
  }
}

// -----------------------------------------------------------------------------

export async function createNewGame(formData) {
  console.log("IN CREATE NEW GAME")
  const hostName = formData.get('hostName');
  const questions = JSON.parse(formData.get('questions'));
  
  if (!hostName?.trim()) {
    throw new Error('Host name is required');
  }

  if (!questions || questions.length !== 5) {
    throw new Error('Five questions are required');
  }

  const initialGameState = {
    players: [{
      id: nanoid(),
      name: hostName,
      isHost: true,
      score: 0,
      lastActive: new Date().toISOString()
    }],
    questions: questions,
    currentRoundIndex: -1,
    status: GameStatus.WAITING,
    currentRound: null,
    startedAt: new Date().toISOString(),
    version: 1,
    settings: {
      roundTimeLimit: 30,
      maxPlayers: 8,
      pointsForHerdAnswer: 1,
      pointsLostForBlackSheep: 1
    }
  };

  try {
      const game = await createGame(initialGameState);
      return { success: true, roomCode: game.$id };
  } catch (error) {
      console.error('Failed to create game:', error);
      throw error;
  }
}

// -----------------------------------------------------------------------------

export async function joinGame(formData) {
  console.log("IN JOIN GAME")
  const roomCode = formData.get('roomCode');
  const playerName = formData.get('playerName');

  try {
    const gameState = await getGame(roomCode);

    if (!gameState) {
      throw new Error('Game not found');
    }

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

    await updateGame(roomCode, gameState);

    return { success: true, gameState };
  } catch (error) {
    console.error('Failed to join game:', error);
    throw error;
  }
}

// -----------------------------------------------------------------------------

export async function getGameState(roomCode) {
  console.log("IN GET GAME STATE")
  const gameData = await redis.get(`game:${roomCode}`);
  if (!gameData) return null;

//   const gameState = JSON.parse(gameData);
  const gameState = gameData;
  
  // Update player activity statuses
  gameState.players = await getActivePlayers(roomCode, gameState.players);
  
  return gameState;
}

// -----------------------------------------------------------------------------

export async function startGame({ roomCode, playerName }) {
  console.log("IN START GAME")
  const gameState = await getGame(roomCode);
    
    // Verify host
    const player = gameState.players.find(p => p.name === playerName);
    if (!player?.isHost) throw new Error('Only host can start the game');
  
    // Need at least 2 players
    const activePlayers = await getActivePlayers(roomCode, gameState.players);
    // if (activePlayers.filter(p => p.isConnected).length < 2) {
    if (activePlayers.length < 2) {
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
  
    await updateGame(roomCode, gameState);
  
    return { success: true, gameState };
  }

  //  ----------------------------------------------------------------------------


  export async function submitAnswer({ roomCode, playerName, answer }) {
    console.log("IN SUBMIT ANSWER");
    const gameState = await getGame(roomCode);
  
    if (gameState.status !== GameStatus.PLAYING) {
      throw new Error('Game is not in playing state');
    }
  
    const player = gameState.players.find(p => p.name === playerName);
    if (!player) throw new Error('Player not found');
  
    // Record answer - with normalization
    if (!gameState.currentRound.answers) {
      gameState.currentRound.answers = {};
    }
    gameState.currentRound.answers[player.id] = normalizeAnswer(answer);
  
    // Update activity
    await updatePlayerActivity(roomCode, playerName);
  
    // Check if all active players have answered
    const allAnswered = gameState.players.every(
      player => player.id in gameState.currentRound.answers
    );
  
    if (allAnswered) {
      // Move to round end and calculate scores
      gameState.status = GameStatus.ROUND_END;
  
      // Group similar answers together
      const answerGroups = {};
      Object.values(gameState.currentRound.answers).forEach(ans => {
        let foundGroup = false;
        for (const groupKey in answerGroups) {
          if (areAnswersSimilar(ans, groupKey)) {
            answerGroups[groupKey].push(ans);
            foundGroup = true;
            break;
          }
        }
        if (!foundGroup) {
          answerGroups[ans] = [ans];
        }
      });

      // Count answers using the grouped answers
      const answerCounts = {};
      Object.entries(answerGroups).forEach(([groupKey, answers]) => {
        answerCounts[groupKey] = answers.length;
      });
  
      // Find the most common answer(s)
      const maxCount = Math.max(...Object.values(answerCounts));
      const herdAnswers = Object.keys(answerCounts).filter(ans => answerCounts[ans] === maxCount);
  
      // Award points for herd answers
      if (herdAnswers.length === 1) {
        Object.entries(gameState.currentRound.answers).forEach(([playerId, playerAnswer]) => {
          if (areAnswersSimilar(playerAnswer, herdAnswers[0])) {
            const player = gameState.players.find(p => p.id === playerId);
            if (player) player.score += 1;
          }
        });
      }
  
      // Find unique answers (potential black sheep)
      const uniqueAnswers = Object.keys(answerCounts).filter(ans => answerCounts[ans] === 1);

      // Deduct point for unique answer (black sheep)
      if (uniqueAnswers.length === 1) {
        const blackSheepId = Object.entries(gameState.currentRound.answers)
          .find(([, ans]) => areAnswersSimilar(ans, uniqueAnswers[0]))[0];
        const blackSheep = gameState.players.find(p => p.id === blackSheepId);
        if (blackSheep) blackSheep.score = Math.max(0, blackSheep.score - 1); // Ensure score doesn't go below 0
      }
  
      // Store round results for display
      gameState.currentRound.herdAnswers = herdAnswers;
      gameState.currentRound.blackSheepAnswer = uniqueAnswers[0] || null;

      // Store the answer groups for UI display (optional - helps players understand grouping)
      gameState.currentRound.answerGroups = answerGroups;

      // You might also want to store the original answers for display
      gameState.currentRound.originalAnswers = { ...gameState.currentRound.answers };
    }
  
    // Update game state
    await updateGame(roomCode, gameState);
  
    return { success: true, gameState };
}

  // export async function submitAnswer({ roomCode, playerName, answer }) {
  //   console.log("IN SUBMIT ANSWER");
  //   const gameState = await getGame(roomCode);
  
  //   if (gameState.status !== GameStatus.PLAYING) {
  //     throw new Error('Game is not in playing state');
  //   }
  
  //   const player = gameState.players.find(p => p.name === playerName);
  //   if (!player) throw new Error('Player not found');
  
  //   // Record answer
  //   if (!gameState.currentRound.answers) {
  //     gameState.currentRound.answers = {};
  //   }
  //   gameState.currentRound.answers[player.id] = answer;
  
  //   // Update activity
  //   await updatePlayerActivity(roomCode, playerName);
  
  //   // Check if all active players have answered
  //   // const activePlayers = gameState.players.filter(p => p.isConnected);
  //   const allAnswered = gameState.players.every(
  //     player => player.id in gameState.currentRound.answers
  //   );
  
  //   if (allAnswered) {
  //     // Move to round end and calculate scores
  //     gameState.status = GameStatus.ROUND_END;
  
  //     // Count answers
  //     const answerCounts = {};
  //     Object.values(gameState.currentRound.answers).forEach(ans => {
  //       answerCounts[ans] = (answerCounts[ans] || 0) + 1;
  //     });
  
  //     // Find the most common answer(s)
  //     const maxCount = Math.max(...Object.values(answerCounts));
  //     const herdAnswers = Object.keys(answerCounts).filter(ans => answerCounts[ans] === maxCount);
  
  //     // Award points for herd answers
  //     if (herdAnswers.length === 1) {
  //       Object.entries(gameState.currentRound.answers).forEach(([playerId, playerAnswer]) => {
  //         if (playerAnswer === herdAnswers[0]) {
  //           const player = gameState.players.find(p => p.id === playerId);
  //           if (player) player.score += 1;
  //         }
  //       });
  //     }
  
  //     // Deduct point for unique answer (black sheep)
  //     const uniqueAnswers = Object.keys(answerCounts).filter(ans => answerCounts[ans] === 1);
  //     if (uniqueAnswers.length === 1) {
  //       const blackSheepId = Object.entries(gameState.currentRound.answers)
  //         .find(([, ans]) => ans === uniqueAnswers[0])[0];
  //       const blackSheep = gameState.players.find(p => p.id === blackSheepId);
  //       if (blackSheep) blackSheep.score = Math.max(0, blackSheep.score - 1); // Ensure score doesn't go below 0
  //     }
  
  //     // Store round results for display
  //     gameState.currentRound.herdAnswers = herdAnswers;
  //     gameState.currentRound.blackSheepAnswer = uniqueAnswers[0] || null;
  //   }
  
  //   // Update game state
  //   await updateGame(roomCode, gameState);
  
  //   return { success: true, gameState };
  // }

  //  ----------------------------------------------------------------------------

export async function moveToNextRound(roomCode) {
  console.log("IN MOVE TO NEXT ROUND")
  const gameState = await getGame(roomCode);
    
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
  
    await updateGame(roomCode, gameState);
  
    return { success: true, gameState };
  }

  //  ----------------------------------------------------------------------------

// Lightweight polling endpoint for game state
export async function pollGameState(roomCode, playerName) {
    console.log("IN POLL GAME STATE")
    const gameState = await getGameState(roomCode);
    if (!gameState) return null;
  
    // Update player activity
    await updatePlayerActivity(roomCode, playerName);
  
    return gameState;
  }