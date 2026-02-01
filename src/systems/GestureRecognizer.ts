/**
 * Gesture Recognizer
 * Detects directional swipes with velocity thresholds
 */

import type { TouchPoint } from './TouchInput';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeGesture {
  direction: SwipeDirection;
  distance: number;
  velocity: number;
  duration: number;
}

export type SwipeListener = (gesture: SwipeGesture) => void;

export class GestureRecognizer {
  private swipeListeners: SwipeListener[] = [];

  // Gesture detection thresholds
  private readonly minSwipeDistance: number = 30; // pixels
  private readonly minSwipeVelocity: number = 0.3; // pixels per millisecond
  private readonly maxSwipeDuration: number = 300; // milliseconds

  /**
   * Analyze a touch point and detect if it's a swipe gesture
   */
  recognizeSwipe(touchPoint: TouchPoint): SwipeGesture | null {
    const deltaX = touchPoint.currentX - touchPoint.startX;
    const deltaY = touchPoint.currentY - touchPoint.startY;
    const duration = performance.now() - touchPoint.startTime;

    // Calculate distance and velocity
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = duration > 0 ? distance / duration : 0;

    // Check if gesture meets minimum requirements
    if (distance < this.minSwipeDistance) {
      return null;
    }

    if (velocity < this.minSwipeVelocity) {
      return null;
    }

    if (duration > this.maxSwipeDuration) {
      return null;
    }

    // Determine primary direction
    const direction = this.getSwipeDirection(deltaX, deltaY);

    if (!direction) {
      return null;
    }

    const gesture: SwipeGesture = {
      direction,
      distance,
      velocity,
      duration,
    };

    // Notify listeners
    this.notifySwipeListeners(gesture);

    return gesture;
  }

  /**
   * Determine swipe direction based on delta values
   */
  private getSwipeDirection(deltaX: number, deltaY: number): SwipeDirection | null {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine if horizontal or vertical swipe
    if (absX > absY) {
      // Horizontal swipe
      return deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Quick check for swipe direction without full gesture object
   */
  detectSwipeDirection(touchPoint: TouchPoint): SwipeDirection | null {
    const deltaX = touchPoint.currentX - touchPoint.startX;
    const deltaY = touchPoint.currentY - touchPoint.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < this.minSwipeDistance) {
      return null;
    }

    return this.getSwipeDirection(deltaX, deltaY);
  }

  /**
   * Add a swipe listener
   */
  onSwipe(listener: SwipeListener): void {
    this.swipeListeners.push(listener);
  }

  /**
   * Remove a swipe listener
   */
  removeSwipeListener(listener: SwipeListener): void {
    const index = this.swipeListeners.indexOf(listener);
    if (index !== -1) {
      this.swipeListeners.splice(index, 1);
    }
  }

  /**
   * Notify all swipe listeners
   */
  private notifySwipeListeners(gesture: SwipeGesture): void {
    this.swipeListeners.forEach((listener) => {
      try {
        listener(gesture);
      } catch (error) {
        console.error('Error in swipe listener:', error);
      }
    });
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.swipeListeners = [];
  }

  /**
   * Set custom thresholds for gesture detection
   */
  setThresholds(options: {
    minDistance?: number;
    minVelocity?: number;
    maxDuration?: number;
  }): void {
    if (options.minDistance !== undefined) {
      (this as any).minSwipeDistance = options.minDistance;
    }
    if (options.minVelocity !== undefined) {
      (this as any).minSwipeVelocity = options.minVelocity;
    }
    if (options.maxDuration !== undefined) {
      (this as any).maxSwipeDuration = options.maxDuration;
    }
  }

  /**
   * Get current thresholds
   */
  getThresholds(): {
    minDistance: number;
    minVelocity: number;
    maxDuration: number;
  } {
    return {
      minDistance: this.minSwipeDistance,
      minVelocity: this.minSwipeVelocity,
      maxDuration: this.maxSwipeDuration,
    };
  }
}
