'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { joinGame } from '@/lib/game/actions';

export default function JoinGame() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData) {
    setIsLoading(true);
    setError('');

    try {
      const result = await joinGame(formData);
      if (result.success) {
        // Save player name for future use
        localStorage.setItem('playerName', formData.get('playerName'));
        router.push(`/game/${formData.get('roomCode')}`);
      }
    } catch (error) {
      setError(error.message || 'Failed to join game');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Join Game</h1>
        </div>

        {/* Join Game Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="roomCode" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Room Code
              </label>
              <input
                type="text"
                id="roomCode"
                name="roomCode"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter room code"
              />
            </div>
            <div>
              <label 
                htmlFor="playerName" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                name="playerName"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your name"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Join Game'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}