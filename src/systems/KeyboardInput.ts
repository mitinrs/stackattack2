/**
 * Keyboard Input Handler
 * Manages keyboard event listeners and maps keys to game actions
 */

import type { InputAction } from '../types/game';
import { InputAction as InputActionEnum } from '../types/game';

export type KeyMapping = Record<string, InputAction>;
export type ActionStateListener = (action: InputAction, active: boolean) => void;

export class KeyboardInput {
  private keyMapping: KeyMapping;
  private keyStates: Map<string, boolean> = new Map();
  private listeners: ActionStateListener[] = [];
  private isInitialized: boolean = false;

  constructor() {
    // Default key mappings
    this.keyMapping = {
      ArrowLeft: InputActionEnum.MoveLeft,
      a: InputActionEnum.MoveLeft,
      A: InputActionEnum.MoveLeft,

      ArrowRight: InputActionEnum.MoveRight,
      d: InputActionEnum.MoveRight,
      D: InputActionEnum.MoveRight,

      ArrowUp: InputActionEnum.Jump,
      w: InputActionEnum.Jump,
      W: InputActionEnum.Jump,
      ' ': InputActionEnum.Jump, // Spacebar

      Escape: InputActionEnum.Pause,
      p: InputActionEnum.Pause,
      P: InputActionEnum.Pause,

      Enter: InputActionEnum.Confirm,

      Backspace: InputActionEnum.Back,
    };
  }

  /**
   * Initialize keyboard event listeners
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.isInitialized = true;
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const action = this.keyMapping[event.key];

    if (action) {
      // Prevent default browser behavior for game keys
      event.preventDefault();

      // Only trigger if key wasn't already pressed (prevent key repeat)
      if (!this.keyStates.get(event.key)) {
        this.keyStates.set(event.key, true);
        this.notifyListeners(action, true);
      }
    }
  };

  /**
   * Handle keyup events
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const action = this.keyMapping[event.key];

    if (action) {
      event.preventDefault();
      this.keyStates.set(event.key, false);
      this.notifyListeners(action, false);
    }
  };

  /**
   * Check if a specific key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return this.keyStates.get(key) || false;
  }

  /**
   * Get the action mapped to a specific key
   */
  getActionForKey(key: string): InputAction | undefined {
    return this.keyMapping[key];
  }

  /**
   * Add a listener for action state changes
   */
  addListener(listener: ActionStateListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   */
  removeListener(listener: ActionStateListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of an action state change
   */
  private notifyListeners(action: InputAction, active: boolean): void {
    this.listeners.forEach((listener) => {
      try {
        listener(action, active);
      } catch (error) {
        console.error('Error in keyboard input listener:', error);
      }
    });
  }

  /**
   * Clear all key states
   */
  clearStates(): void {
    this.keyStates.clear();
  }

  /**
   * Destroy the keyboard input handler
   */
  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.clearStates();
    this.listeners = [];
    this.isInitialized = false;
  }

  /**
   * Check if initialized
   */
  isActive(): boolean {
    return this.isInitialized;
  }
}
