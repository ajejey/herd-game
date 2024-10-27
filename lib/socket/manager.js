import { Server } from 'socket.io'
import redis from '../redis/client'

export class GameStateManager {
  constructor(io) {
    this.io = io
    this.games = new Map()
  }

  // Fast in-memory state access
  getState(roomCode) {
    return this.games.get(roomCode)
  }

  // Immediate state update and broadcast
  setState(roomCode, state) {
    this.games.set(roomCode, state)
    this.io.to(roomCode).emit('gameStateUpdate', state)
    
    // Background persistence
    this.persistState(roomCode, state).catch(console.error)
  }

  // Async Redis persistence
  async persistState(roomCode, state) {
    try {
      await redis.set(
        `game:${roomCode}`,
        JSON.stringify(state),
        { ex: 24 * 60 * 60 } // 24hr expiry
      )
    } catch (error) {
      console.error('Redis persistence failed:', error)
    }
  }

  // State recovery
  async recoverState(roomCode) {
    // Try memory first
    const memoryState = this.games.get(roomCode)
    if (memoryState) return memoryState

    // Fallback to Redis
    try {
      const savedState = await redis.get(`game:${roomCode}`)
      if (savedState) {
        const state = JSON.parse(savedState)
        this.games.set(roomCode, state)
        return state
      }
    } catch (error) {
      console.error('State recovery failed:', error)
    }

    return null
  }
}