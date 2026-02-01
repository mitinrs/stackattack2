/**
 * Game State Machine
 * Manages game state transitions with validation and event emission
 */

import type { GameState } from '../types/game';
import { GameState as GameStateEnum } from '../types/game';

type StateChangeListener = (oldState: GameState, newState: GameState) => void;

export class GameStateMachine {
  private currentState: GameState = GameStateEnum.Menu;
  private listeners: StateChangeListener[] = [];

  // Valid state transitions
  private readonly validTransitions: Record<GameState, GameState[]> = {
    [GameStateEnum.Menu]: [GameStateEnum.Playing],
    [GameStateEnum.Playing]: [
      GameStateEnum.Paused,
      GameStateEnum.LevelComplete,
      GameStateEnum.GameOver,
      GameStateEnum.Menu,
    ],
    [GameStateEnum.Paused]: [GameStateEnum.Playing, GameStateEnum.Menu],
    [GameStateEnum.LevelComplete]: [GameStateEnum.Playing, GameStateEnum.Menu],
    [GameStateEnum.GameOver]: [GameStateEnum.Menu],
  };

  constructor(initialState: GameState = GameStateEnum.Menu) {
    this.currentState = initialState;
  }

  /**
   * Get the current game state
   */
  getState(): GameState {
    return this.currentState;
  }

  /**
   * Transition to a new state with validation
   */
  transition(newState: GameState): boolean {
    if (!this.isValidTransition(newState)) {
      console.warn(`Invalid state transition from ${this.currentState} to ${newState}`);
      return false;
    }

    const oldState = this.currentState;
    this.currentState = newState;

    this.notifyListeners(oldState, newState);

    return true;
  }

  /**
   * Check if a transition to the given state is valid
   */
  isValidTransition(newState: GameState): boolean {
    const allowedStates = this.validTransitions[this.currentState];
    return allowedStates.includes(newState);
  }

  /**
   * Add a state change listener
   */
  addListener(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a state change listener
   */
  removeListener(listener: StateChangeListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners = [];
  }

  /**
   * Notify all listeners of a state change
   */
  private notifyListeners(oldState: GameState, newState: GameState): void {
    this.listeners.forEach((listener) => {
      try {
        listener(oldState, newState);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  /**
   * Reset state machine to initial state
   */
  reset(): void {
    const oldState = this.currentState;
    this.currentState = GameStateEnum.Menu;
    this.notifyListeners(oldState, GameStateEnum.Menu);
  }
}
