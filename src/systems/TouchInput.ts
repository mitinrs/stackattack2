/**
 * Touch Input Handler
 * Manages touch event listeners and handles multi-touch scenarios
 */

export interface TouchPoint {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
}

export type TouchStartListener = (touch: TouchPoint) => void;
export type TouchMoveListener = (touch: TouchPoint) => void;
export type TouchEndListener = (touch: TouchPoint) => void;

export class TouchInput {
  private activeTouches: Map<number, TouchPoint> = new Map();
  private touchStartListeners: TouchStartListener[] = [];
  private touchMoveListeners: TouchMoveListener[] = [];
  private touchEndListeners: TouchEndListener[] = [];
  private isInitialized: boolean = false;

  /**
   * Initialize touch event listeners
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });

    this.isInitialized = true;
  }

  /**
   * Handle touchstart events
   */
  private handleTouchStart = (event: TouchEvent): void => {
    // Prevent default to avoid mouse events and scrolling
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint: TouchPoint = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: performance.now(),
      };

      this.activeTouches.set(touch.identifier, touchPoint);
      this.notifyTouchStart(touchPoint);
    }
  };

  /**
   * Handle touchmove events
   */
  private handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint = this.activeTouches.get(touch.identifier);

      if (touchPoint) {
        touchPoint.currentX = touch.clientX;
        touchPoint.currentY = touch.clientY;
        this.notifyTouchMove(touchPoint);
      }
    }
  };

  /**
   * Handle touchend and touchcancel events
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint = this.activeTouches.get(touch.identifier);

      if (touchPoint) {
        touchPoint.currentX = touch.clientX;
        touchPoint.currentY = touch.clientY;
        this.notifyTouchEnd(touchPoint);
        this.activeTouches.delete(touch.identifier);
      }
    }
  };

  /**
   * Get all currently active touches
   */
  getActiveTouches(): TouchPoint[] {
    return Array.from(this.activeTouches.values());
  }

  /**
   * Get a specific active touch by ID
   */
  getTouch(id: number): TouchPoint | undefined {
    return this.activeTouches.get(id);
  }

  /**
   * Check if there are any active touches
   */
  hasActiveTouches(): boolean {
    return this.activeTouches.size > 0;
  }

  /**
   * Add a touch start listener
   */
  onTouchStart(listener: TouchStartListener): void {
    this.touchStartListeners.push(listener);
  }

  /**
   * Add a touch move listener
   */
  onTouchMove(listener: TouchMoveListener): void {
    this.touchMoveListeners.push(listener);
  }

  /**
   * Add a touch end listener
   */
  onTouchEnd(listener: TouchEndListener): void {
    this.touchEndListeners.push(listener);
  }

  /**
   * Remove a touch start listener
   */
  removeTouchStartListener(listener: TouchStartListener): void {
    const index = this.touchStartListeners.indexOf(listener);
    if (index !== -1) {
      this.touchStartListeners.splice(index, 1);
    }
  }

  /**
   * Remove a touch move listener
   */
  removeTouchMoveListener(listener: TouchMoveListener): void {
    const index = this.touchMoveListeners.indexOf(listener);
    if (index !== -1) {
      this.touchMoveListeners.splice(index, 1);
    }
  }

  /**
   * Remove a touch end listener
   */
  removeTouchEndListener(listener: TouchEndListener): void {
    const index = this.touchEndListeners.indexOf(listener);
    if (index !== -1) {
      this.touchEndListeners.splice(index, 1);
    }
  }

  /**
   * Notify touch start listeners
   */
  private notifyTouchStart(touchPoint: TouchPoint): void {
    this.touchStartListeners.forEach((listener) => {
      try {
        listener(touchPoint);
      } catch (error) {
        console.error('Error in touch start listener:', error);
      }
    });
  }

  /**
   * Notify touch move listeners
   */
  private notifyTouchMove(touchPoint: TouchPoint): void {
    this.touchMoveListeners.forEach((listener) => {
      try {
        listener(touchPoint);
      } catch (error) {
        console.error('Error in touch move listener:', error);
      }
    });
  }

  /**
   * Notify touch end listeners
   */
  private notifyTouchEnd(touchPoint: TouchPoint): void {
    this.touchEndListeners.forEach((listener) => {
      try {
        listener(touchPoint);
      } catch (error) {
        console.error('Error in touch end listener:', error);
      }
    });
  }

  /**
   * Clear all active touches
   */
  clearTouches(): void {
    this.activeTouches.clear();
  }

  /**
   * Destroy the touch input handler
   */
  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);

    this.clearTouches();
    this.touchStartListeners = [];
    this.touchMoveListeners = [];
    this.touchEndListeners = [];
    this.isInitialized = false;
  }

  /**
   * Check if initialized
   */
  isActive(): boolean {
    return this.isInitialized;
  }
}
