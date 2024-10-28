import { Databases, ID, Query } from 'appwrite';
import client from './client';
import { APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID } from './config';

const databases = new Databases(client);

export const getGame = async (roomCode) => {
    try {
        const document = await databases.getDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID,
            roomCode
        );
        return {
            ...document,
            players: JSON.parse(document.players),
            questions: JSON.parse(document.questions),
            currentRound: document.currentRound ? JSON.parse(document.currentRound) : null,
            settings: JSON.parse(document.settings),
        };
    } catch (error) {
        console.error('Failed to get game:', error);
        throw error;
    }
};

export const updateGame = async (roomCode, gameState) => {
    console.log("IN UPDATE GAME")
    try {
        // Create a new object with only the fields we want to update
        const updateData = {
            currentRoundIndex: gameState.currentRoundIndex,
            status: gameState.status,
            startedAt: gameState.startedAt,
            version: gameState.version,
            players: JSON.stringify(gameState.players),
            questions: JSON.stringify(gameState.questions),
            currentRound: JSON.stringify(gameState.currentRound),
            settings: JSON.stringify(gameState.settings),
        };

        return await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID,
            roomCode,
            updateData
        );
    } catch (error) {
        console.error('Failed to update game:', error);
        throw error;
    }
};

export const createGame = async (initialGameState) => {
    try {
        const document = await databases.createDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID,
            ID.unique(),
            {
                ...initialGameState,
                players: JSON.stringify(initialGameState.players),
                questions: JSON.stringify(initialGameState.questions),
                currentRound: JSON.stringify(initialGameState.currentRound),
                settings: JSON.stringify(initialGameState.settings),
            }
        );
        return document;
    } catch (error) {
        console.error('Failed to create game:', error);
        throw error;
    }
};

// export const subscribeToGame = (roomCode, callback) => {
//     return client.subscribe(
//         `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_COLLECTION_ID}.documents.${roomCode}`,
//         callback
//     );
// };

export const subscribeToGame = (roomCode, callback) => {
    return client.subscribe([`databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_COLLECTION_ID}.documents.${roomCode}`], response => {
        if (response.events.includes(`databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_COLLECTION_ID}.documents.${roomCode}.update`)) {
            const payload = response.payload;
            
            // Parse stringified fields
            const parsedGameState = {
                ...payload,
                players: JSON.parse(payload.players),
                questions: JSON.parse(payload.questions),
                currentRound: payload.currentRound !== "null" ? JSON.parse(payload.currentRound) : null,
                settings: JSON.parse(payload.settings),
            };
            
            callback(parsedGameState);
        }
    });
};