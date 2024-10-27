
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Users, Send, Crown, RefreshCw } from 'lucide-react';
import {
  pollGameState,
  startGame,
  submitAnswer,
  moveToNextRound
} from '@/lib/game/actions';

export default function GameRoom({ initialGameState, roomCode }) {
  const [gameState, setGameState] = useState(initialGameState);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const playerName = localStorage.getItem('playerName');

  const refreshGameState = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const newState = await pollGameState(roomCode, playerName);
      if (newState) {
        setGameState(newState);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      setError('Failed to refresh game state');
    } finally {
      setTimeout(() => setIsRefreshing(false), 5000);
    }
  }, [roomCode, playerName, isRefreshing]);

  const handleStartGame = async () => {
    try {
      const result = await startGame({ roomCode, playerName });
      if (result.success && result.gameState) {
        setGameState(result.gameState);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;

    try {
      const result = await submitAnswer({ roomCode, playerName, answer: answer.trim() });
      if (result.success && result.gameState) {
        setGameState(result.gameState);
      }
      setAnswer('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleNextRound = async () => {
    try {
      const result = await moveToNextRound(roomCode);
      if (result.success && result.gameState) {
        setGameState(result.gameState);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const currentPlayer = gameState.players.find(p => p.name === playerName);
  const isHost = currentPlayer?.isHost;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Room Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Room: {roomCode}</h1>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>{gameState.players.length} players</span>
          </div>
        </div>
        {gameState.status !== 'waiting' && (
          <div className="mt-2">
            Round {gameState.currentRoundIndex + 1} of {gameState.questions.length}
          </div>
        )}
      </div>

      {/* Game Status */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-center">
          {gameState.status === 'waiting' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Waiting for players...
              </h2>
              {isHost && (
                <button
                  onClick={handleStartGame}
                  disabled={gameState.players.length < 2}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Game
                </button>
              )}
            </div>
          )}
          

          {gameState.status === 'playing' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {gameState.currentRound?.question}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Your answer"
                />
                <button
                  onClick={handleSubmitAnswer}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          {gameState.status === 'roundEnd' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Round Results</h2>
              <div className="space-y-2">
                {gameState.players.map((player) => (
                  <div key={player.id} className="flex justify-between items-center">
                    <span>{player.name}: {gameState.currentRound.answers[player.id] || 'No answer'}</span>
                    <span>Score: {player.score}</span>
                  </div>
                ))}
              </div>
              {isHost && (
                <button
                  onClick={handleNextRound}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Next Round
                </button>
              )}
            </div>
          )}
          {gameState.status === 'gameOver' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Game Over</h2>
              <div className="space-y-2">
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div key={player.id} className="flex justify-between items-center">
                      <span>{index === 0 && <Crown className="w-5 h-5 inline mr-2" />}{player.name}</span>
                      <span>Score: {player.score}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player List */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-3">Players</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2"
            >
              {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
              <span>{player.name}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
      {/* Add the Refresh Game button */}
      <button
            onClick={refreshGameState}
            disabled={isRefreshing}
            className={`flex w-full items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            {isRefreshing ? 'Refreshing...' : 'Refresh Game'}
          </button>
      </div>
    </div>

  );
}




