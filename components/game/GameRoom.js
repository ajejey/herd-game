
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Users, Send, Crown, RefreshCw, Home, RefreshCwIcon, User, Check, Copy } from 'lucide-react';
import { subscribeToGame } from '@/lib/appwrite/database';
import { startGame, submitAnswer, moveToNextRound } from '@/lib/game/actions';
import Link from 'next/link';
import { GameStatus } from '@/lib/game/types';
import Spinner from '../Spinner';

export default function GameRoom({ initialGameState, roomCode }) {
  const [gameState, setGameState] = useState(initialGameState);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const playerName = localStorage.getItem('playerName');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isMovingToNextRound, setIsMovingToNextRound] = useState(false);


  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || hasAnswered) return;
    setIsSubmittingAnswer(true);
    try {
      await submitAnswer({ roomCode, playerName, answer: answer.trim() });
      setAnswer('');
      setHasAnswered(true);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };
  
  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING) {
      setHasAnswered(false);
    }
  }, [gameState.currentRoundIndex, gameState.status]);

  useEffect(() => {
    const unsubscribe = subscribeToGame(roomCode, (updatedGameState) => {
      // updatedGameState is already parsed in the subscribeToGame function
      setGameState(updatedGameState);
    });

    return () => {
      unsubscribe();
    };
  }, [roomCode]);


 const handleStartGame = async () => {
    setIsStartingGame(true);
    try {
      await startGame({ roomCode, playerName });
    } catch (error) {
      console.error('Failed to start game:', error);
      setError('Failed to start game. Please try again.');
    } finally {
      setIsStartingGame(false);
    }
  };

  // const handleSubmitAnswer = async () => {
  //   if (!answer.trim()) return;
  //   try {
  //     await submitAnswer({ roomCode, playerName, answer: answer.trim() });
  //     setAnswer('');
  //   } catch (error) {
  //     console.error('Failed to submit answer:', error);
  //   }
  // };

  const handleNextRound = async () => {
    setIsMovingToNextRound(true);
    try {
      await moveToNextRound(roomCode);
    } catch (error) {
      console.error('Failed to move to next round:', error);
      setError('Failed to move to next round. Please try again.');
    } finally {
      setIsMovingToNextRound(false);
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
        {gameState.status === GameStatus.WAITING && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Waiting for players...</h2>
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 2 || isStartingGame}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isStartingGame ? <Spinner /> : 'Start Game'}
            </button>
          )}
        </div>
      )}


{gameState.status === GameStatus.PLAYING && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{gameState.currentRound.question}</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md flex-grow disabled:bg-gray-100"
              placeholder={hasAnswered ? "Waiting for other players..." : "Your answer"}
              disabled={hasAnswered || isSubmittingAnswer}
            />
            <button
              onClick={handleSubmitAnswer}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={hasAnswered || isSubmittingAnswer}
            >
              {isSubmittingAnswer ? <Spinner /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          {hasAnswered && (
            <p className="text-sm text-gray-600">Your answer has been submitted. Waiting for other players...</p>
          )}
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
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center"
              disabled={isMovingToNextRound}
            >
              {isMovingToNextRound ? <Spinner /> : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Next Round
                </>
              )}
            </button>
          )}
            </div>
          )}
          {gameState.status === 'gameOver' && (
            <div className="space-y-6">
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
              <Link href="/" className="inline-block w-full">
                <button className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-300 ease-in-out transform hover:-translate-y-1 shadow-md flex items-center justify-center">
                  <RefreshCwIcon className="w-5 h-5 mr-2" />
                  Play Again
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>


      <div className="bg-white rounded-lg p-6 shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Players</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className="bg-gray-50 rounded-lg p-3 flex items-center space-x-3 transition-all duration-300 hover:shadow-md hover:bg-gray-100"
            >
              <div className="flex-shrink-0">
                {player.isHost ? (
                  <Crown className="w-6 h-6 text-yellow-500" />
                ) : (
                  <User className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {player.name}
                </p>
                <p className="text-xs text-gray-500">
                  {player.isHost ? 'Host' : 'Player'}
                </p>
              </div>
              <div className="flex-shrink-0 text-sm font-semibold text-blue-600">
                {player.score}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

    </div>

  );
}




