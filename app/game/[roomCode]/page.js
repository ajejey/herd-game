import { redirect } from 'next/navigation';
import { getGame } from '@/lib/appwrite/database';
import GameRoom from '@/components/game/GameRoom';

async function getGameData(roomCode) {
  try {
    const gameData = await getGame(roomCode);
    console.log('Game data:', gameData);
    return gameData ? gameData : null;
  } catch (error) {
    console.error('Failed to fetch game data:', error);
    return null;
  }
}

export default async function GameRoomPage({ params }) {
  const { roomCode } = await params;
  const gameData = await getGameData(roomCode);

  if (!gameData) {
    // If game doesn't exist, redirect to join page
    redirect('/game/join');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GameRoom 
        initialGameState={gameData} 
        roomCode={roomCode}
      />
    </div>
  );
}