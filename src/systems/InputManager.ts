/**
 * Input Manager
 * Unified input abstraction layer that normalizes all input sources
 * to common action events for game logic consumption
 */

import { InputAction } from '../types/game';
import type { InputState } from '../types/game';
import { KeyboardInput } from './KeyboardInput';
import { TouchInput } from './TouchInput';
import type { TouchPoint } from './TouchInput';
import { GestureRecognizer } from './GestureRecognizer';
import type { SwipeDirection, SwipeGesture } from './GestureRecognizer';

export type InputActionListener = (action: InputAction, active: boolean) => void;
export type SwipeDirectionListener = (direction: SwipeDirection) => void;

export class InputManager {
  private keyboardInput: KeyboardInput;
  private touchInput: TouchInput;
  private gestureRecognizer: GestureRecognizer;

  private inputState: InputState;
  private actionListeners: InputActionListener[] = [];
  private swipeListeners: SwipeDirectionListener[] = [];

  // Track touch buttons (for UI button overlays)
  private touchButtonStates: Map<InputAction, boolean> = new Map();

  private isInitialized: boolean = false;

  constructor() {
    this.keyboardInput = new KeyboardInput();
    this.touchInput = new TouchInput();
    this.gestureRecognizer = new GestureRecognizer();

    // Initialize input state
    this.inputState = {
      [InputAction.MoveLeft]: false,
      [InputAction.MoveRight]: false,
      [InputAction.Jump]: false,
      [InputAction.Pause]: false,
      [InputAction.Confirm]: false,
      [InputAction.Back]: false,
    };
  }

  /**
   * Initialize all input systems
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Initialize keyboard input
    this.keyboardInput.initialize();
    this.keyboardInput.addListener(this.handleKeyboardAction);

    // Initialize touch input
    this.touchInput.initialize();
    this.touchInput.onTouchEnd(this.handleTouchEnd);

    // Initialize gesture recognizer
    this.gestureRecognizer.onSwipe(this.handleSwipeGesture);

    this.isInitialized = true;
  }

  /**
   * Handle keyboard action events
   */
  private handleKeyboardAction = (action: InputAction, active: boolean): void => {
    this.setActionState(action, active);
  };

  /**
   * Handle touch end events for gesture recognition
   */
  private handleTouchEnd = (touchPoint: TouchPoint): void => {
    const gesture = this.gestureRecognizer.recognizeSwipe(touchPoint);

    if (gesture) {
      // Swipe detected - map to actions
      this.mapSwipeToAction(gesture);
    }
  };

  /**
   * Handle swipe gesture events
   */
  private handleSwipeGesture = (gesture: SwipeGesture): void => {
    // Notify swipe listeners
    this.notifySwipeListeners(gesture.direction);
  };

  /**
   * Map swipe direction to game actions
   */
  private mapSwipeToAction(gesture: SwipeGesture): void {
    switch (gesture.direction) {
      case 'left':
        // Quick tap for move left
        this.triggerTemporaryAction(InputAction.MoveLeft);
        break;
      case 'right':
        // Quick tap for move right
        this.triggerTemporaryAction(InputAction.MoveRight);
        break;
      case 'up':
        // Swipe up for jump
        this.triggerTemporaryAction(InputAction.Jump);
        break;
      case 'down':
        // Swipe down - no action (push is automatic on move)
        break;
    }
  }

  /**
   * Trigger a temporary action (for swipes and taps)
   */
  private triggerTemporaryAction(action: InputAction): void {
    this.setActionState(action, true);

    // Auto-release after a short duration
    setTimeout(() => {
      if (!this.touchButtonStates.get(action)) {
        this.setActionState(action, false);
      }
    }, 100);
  }

  /**
   * Set action state and notify listeners
   */
  private setActionState(action: InputAction, active: boolean): void {
    const wasActive = this.inputState[action];

    this.inputState[action] = active;

    // Only notify if state changed
    if (wasActive !== active) {
      this.notifyActionListeners(action, active);
    }
  }

  /**
   * Trigger action from external sources (e.g., UI touch buttons)
   */
  triggerAction(action: InputAction, active: boolean): void {
    this.touchButtonStates.set(action, active);
    this.setActionState(action, active);
  }

  /**
   * Check if an action is currently active
   */
  isActionActive(action: InputAction): boolean {
    return this.inputState[action];
  }

  /**
   * Get the complete input state
   */
  getInputState(): InputState {
    return { ...this.inputState };
  }

  /**
   * Add an action listener
   */
  onAction(listener: InputActionListener): void {
    this.actionListeners.push(listener);
  }

  /**
   * Remove an action listener
   */
  removeActionListener(listener: InputActionListener): void {
    const index = this.actionListeners.indexOf(listener);
    if (index !== -1) {
      this.actionListeners.splice(index, 1);
    }
  }

  /**
   * Add a swipe listener
   */
  onSwipe(listener: SwipeDirectionListener): void {
    this.swipeListeners.push(listener);
  }

  /**
   * Remove a swipe listener
   */
  removeSwipeListener(listener: SwipeDirectionListener): void {
    const index = this.swipeListeners.indexOf(listener);
    if (index !== -1) {
      this.swipeListeners.splice(index, 1);
    }
  }

  /**
   * Notify action listeners
   */
  private notifyActionListeners(action: InputAction, active: boolean): void {
    this.actionListeners.forEach((listener) => {
      try {
        listener(action, active);
      } catch (error) {
        console.error('Error in input action listener:', error);
      }
    });
  }

  /**
   * Notify swipe listeners
   */
  private notifySwipeListeners(direction: SwipeDirection): void {
    this.swipeListeners.forEach((listener) => {
      try {
        listener(direction);
      } catch (error) {
        console.error('Error in swipe listener:', error);
      }
    });
  }

  /**
   * For testing: manually handle swipe
   */
  handleSwipe(direction: SwipeDirection): void {
    this.notifySwipeListeners(direction);
  }

  /**
   * Clear all input states
   */
  clearStates(): void {
    Object.keys(this.inputState).forEach((key) => {
      this.inputState[key as InputAction] = false;
    });
    this.touchButtonStates.clear();
  }

  /**
   * Destroy all input systems
   */
  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    this.keyboardInput.destroy();
    this.touchInput.destroy();
    this.gestureRecognizer.clearListeners();

    this.clearStates();
    this.actionListeners = [];
    this.swipeListeners = [];
    this.isInitialized = false;
  }

  /**
   * Check if initialized
   */
  isActive(): boolean {
    return this.isInitialized;
  }

  /**
   * Get keyboard input system (for advanced usage)
   */
  getKeyboardInput(): KeyboardInput {
    return this.keyboardInput;
  }

  /**
   * Get touch input system (for advanced usage)
   */
  getTouchInput(): TouchInput {
    return this.touchInput;
  }

  /**
   * Get gesture recognizer (for advanced usage)
   */
  getGestureRecognizer(): GestureRecognizer {
    return this.gestureRecognizer;
  }
}
