'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createNewGame } from '@/lib/game/actions';
import { NO_OF_QUESTIONS, PREDEFINED_QUESTIONS } from '@/lib/game/constants';
import Spinner from '@/components/Spinner';

// This can be placed outside the component if you want to maintain the state across renders
const recentlyUsedQuestions = new Set();

export default function CreateGame() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useCustomQuestions, setUseCustomQuestions] = useState(false);
  const [customQuestions, setCustomQuestions] = useState(Array(NO_OF_QUESTIONS).fill(''));
  const [availableQuestions, setAvailableQuestions] = useState([]);

  async function handleSubmit(formData) {
    setIsLoading(true);
    setError('');

    try {
      // Add custom questions or random predefined questions to formData
      if (useCustomQuestions) {
        formData.append('questions', JSON.stringify(customQuestions));
      } else {
        const randomQuestions = getRandomQuestions(NO_OF_QUESTIONS);
        formData.append('questions', JSON.stringify(randomQuestions));
      }

      const result = await createNewGame(formData);
      if (result.success) {
        // Save player name for socket connection
        localStorage.setItem('playerName', formData.get('hostName'));
        router.push(`/game/${result.roomCode}`);
      }
    } catch (error) {
      setError(error.message || 'Failed to create game');
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Initialize available questions
    setAvailableQuestions([...PREDEFINED_QUESTIONS]);
  }, []);

  function getRandomQuestions(count) {
    // If we're running low on available questions, reset the pool
    if (availableQuestions.length < count) {
      setAvailableQuestions([...PREDEFINED_QUESTIONS]);
      recentlyUsedQuestions.clear();
    }

    const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = [];

    for (let i = 0; i < count; i++) {
      let question = shuffled.pop();
      
      // If this question was recently used, try to get another one
      while (recentlyUsedQuestions.has(question) && shuffled.length > 0) {
        question = shuffled.pop();
      }

      selectedQuestions.push(question);
      recentlyUsedQuestions.add(question);

      // Limit the size of recentlyUsedQuestions to prevent it from growing too large
      if (recentlyUsedQuestions.size > PREDEFINED_QUESTIONS.length / 2) {
        recentlyUsedQuestions.delete(recentlyUsedQuestions.values().next().value);
      }
    }

    // Update the available questions
    setAvailableQuestions(shuffled);

    return selectedQuestions;
  }


  function handleCustomQuestionChange(index, value) {
    const newQuestions = [...customQuestions];
    newQuestions[index] = value;
    setCustomQuestions(newQuestions);
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Game</h1>
        </div>

        {/* Create Game Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="hostName" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Your Name
              </label>
              <input
                type="text"
                id="hostName"
                name="hostName"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Type
              </label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="questionType"
                    value="predefined"
                    checked={!useCustomQuestions}
                    onChange={() => setUseCustomQuestions(false)}
                  />
                  <span className="ml-2">Use predefined questions</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="questionType"
                    value="custom"
                    checked={useCustomQuestions}
                    onChange={() => setUseCustomQuestions(true)}
                  />
                  <span className="ml-2">Create custom questions</span>
                </label>
              </div>
            </div>

            {useCustomQuestions && (
              <div className="space-y-4">
                {customQuestions.map((question, index) => (
                  <div key={index}>
                    <label 
                      htmlFor={`question-${index}`} 
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Question {index + 1}
                    </label>
                    <input
                      type="text"
                      id={`question-${index}`}
                      value={question}
                      onChange={(e) => handleCustomQuestionChange(index, e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Enter question ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

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
                'Create Game'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}




// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Users, ArrowLeft, Loader2 } from 'lucide-react';
// import Link from 'next/link';
// import { createGame } from '@/lib/game/actions';

// export default function CreateGame() {
//   const router = useRouter();
//   const [error, setError] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   async function handleSubmit(formData) {
//     setIsLoading(true);
//     setError('');

//     try {
//       const result = await createGame(formData);
//       if (result.success) {
//         // Save player name for socket connection
//         localStorage.setItem('playerName', formData.get('hostName'));
//         router.push(`/game/${result.roomCode}`);
//       }
//     } catch (error) {
//       setError(error.message || 'Failed to create game');
//       setIsLoading(false);
//     }
//   }

//   return (
//     <main className="min-h-screen bg-gray-50">
//       <div className="max-w-xl mx-auto px-4 py-16">
//         {/* Header */}
//         <div className="mb-8">
//           <Link 
//             href="/"
//             className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
//           >
//             <ArrowLeft className="w-4 h-4 mr-2" />
//             Back to Home
//           </Link>
//           <h1 className="text-3xl font-bold text-gray-900">Create New Game</h1>
//         </div>

//         {/* Create Game Form */}
//         <div className="bg-white rounded-xl shadow-sm p-6">
//           <form action={handleSubmit} className="space-y-6">
//             <div>
//               <label 
//                 htmlFor="hostName" 
//                 className="block text-sm font-medium text-gray-700 mb-1"
//               >
//                 Your Name
//               </label>
//               <input
//                 type="text"
//                 id="hostName"
//                 name="hostName"
//                 required
//                 maxLength={20}
//                 className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 placeholder="Enter your name"
//               />
//             </div>

//             {error && (
//               <div className="text-red-500 text-sm">{error}</div>
//             )}

//             <button
//               type="submit"
//               disabled={isLoading}
//               className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {isLoading ? (
//                 <Loader2 className="w-5 h-5 animate-spin" />
//               ) : (
//                 <Users className="w-5 h-5" />
//               )}
//               Create Room
//             </button>
//           </form>
//         </div>

//         {/* Game Rules */}
//         <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
//           <h2 className="font-semibold mb-4">Game Setup Tips</h2>
//           <ul className="space-y-2 text-gray-600">
//             <li>• Minimum 3 players recommended</li>
//             <li>• Share the room code with your friends</li>
//             <li>• Game sessions expire after 24 hours</li>
//             <li>• All players need to join before starting</li>
//           </ul>
//         </div>
//       </div>
//     </main>
//   );
// }