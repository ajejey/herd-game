import { Users, Plus, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
            Herd Mentality
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Think like the herd! The party game where being unique is not the goal. 
            Join your friends and try to match their answers.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link 
            href="/game/create"
            className="flex items-center justify-center gap-3 p-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg group"
          >
            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold text-lg">Create Game</div>
              <div className="text-sm text-blue-100">Start a new game room</div>
            </div>
          </Link>

          <Link 
            href="/game/join"
            className="flex items-center justify-center gap-3 p-6 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-colors border-2 border-gray-200 shadow-lg group"
          >
            <LogIn className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold text-lg">Join Game</div>
              <div className="text-sm text-gray-500">Enter an existing room</div>
            </div>
          </Link>
        </div>

        {/* How to Play */}
        <div className="mt-24 text-center space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">How to Play</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">Gather Your Herd</h3>
              <p className="text-gray-600">Create a room and invite your friends to join using the room code</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">Answer Questions</h3>
              <p className="text-gray-600">Each round, answer the question trying to match what others will say</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">Score Points</h3>
              <p className="text-gray-600">Get points when your answer matches the majority of the group</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}