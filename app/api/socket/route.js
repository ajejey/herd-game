import { Server } from 'socket.io';
import redis from '@/lib/redis/client';
import { GameStatus } from '@/lib/game/types';

const ioHandler = (req, res) => {
    console.log('SOCKET SERVER INITIALIZED 1............');
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;
    console.log('SOCKET SERVER INITIALIZED 2............');

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle joining a game
      socket.on('joinGame', async ({ roomCode, playerName, isReconnecting }) => {
        try {
          // Get current game state
          const gameData = await redis.get(`game:${roomCode}`);
          if (!gameData) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          const gameState = JSON.parse(gameData);
          
          // Find or create player
          let player = gameState.players.find(p => p.name === playerName);
          
          if (!player && !isReconnecting) {
            player = {
              id: socket.id,
              name: playerName,
              isHost: false,
              isConnected: true,
              score: 0
            };
            gameState.players.push(player);
          } else if (player) {
            player.isConnected = true;
            player.id = socket.id; // Update socket ID
          }

          // Join socket room
          socket.join(roomCode);
          
          // Update game state
          await redis.set(
            `game:${roomCode}`,
            JSON.stringify(gameState),
            { ex: 24 * 60 * 60 }
          );

          // Broadcast updated state to all players
          io.to(roomCode).emit('gameStateUpdate', gameState);
        } catch (error) {
          console.error('Join game error:', error);
          socket.emit('error', { message: 'Failed to join game' });
        }
      });

      // Handle starting the game
      socket.on('startGame', async ({ roomCode }) => {
        try {
          const gameData = await redis.get(`game:${roomCode}`);
          if (!gameData) return;

          const gameState = JSON.parse(gameData);
          
          // Only host can start the game
          const player = gameState.players.find(p => p.id === socket.id);
          if (!player?.isHost) return;

          // Need at least 2 players to start
          if (gameState.players.length < 2) return;

          // Update game state
          gameState.status = GameStatus.PLAYING;
          gameState.currentRound = {
            question: "What's your favorite color?", // Replace with your question logic
            answers: {},
            endTime: new Date(Date.now() + 30000).toISOString() // 30 seconds per round
          };

          await redis.set(
            `game:${roomCode}`,
            JSON.stringify(gameState),
            { ex: 24 * 60 * 60 }
          );

          io.to(roomCode).emit('gameStateUpdate', gameState);
        } catch (error) {
          console.error('Start game error:', error);
        }
      });

      // Handle submitting answers
      socket.on('submitAnswer', async ({ roomCode, answer }) => {
        try {
          const gameData = await redis.get(`game:${roomCode}`);
          if (!gameData) return;

          const gameState = JSON.parse(gameData);
          if (gameState.status !== GameStatus.PLAYING) return;

          const player = gameState.players.find(p => p.id === socket.id);
          if (!player) return;

          // Record player's answer
          gameState.currentRound.answers[player.id] = answer;

          // Check if all players have answered
          const allAnswered = gameState.players.every(
            p => p.id in gameState.currentRound.answers
          );

          if (allAnswered) {
            // Calculate scores - Implement your scoring logic here
            // For now, just moving to round end
            gameState.status = GameStatus.ROUND_END;
          }

          await redis.set(
            `game:${roomCode}`,
            JSON.stringify(gameState),
            { ex: 24 * 60 * 60 }
          );

          io.to(roomCode).emit('gameStateUpdate', gameState);
        } catch (error) {
          console.error('Submit answer error:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          // Find the game this player was in
          const games = await redis.keys('game:*');
          for (const gameKey of games) {
            const gameData = await redis.get(gameKey);
            if (!gameData) continue;

            const gameState = JSON.parse(gameData);
            const player = gameState.players.find(p => p.id === socket.id);
            
            if (player) {
              player.isConnected = false;
              await redis.set(
                gameKey,
                JSON.stringify(gameState),
                { ex: 24 * 60 * 60 }
              );
              
              io.to(gameState.roomCode).emit('gameStateUpdate', gameState);
              break;
            }
          }
        } catch (error) {
          console.error('Disconnect error:', error);
        }
      });
    });
  }

  res.end();
};

// export default SocketHandler;

export const GET = ioHandler;
export const POST = ioHandler;