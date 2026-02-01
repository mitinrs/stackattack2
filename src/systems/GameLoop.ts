/**
 * Game Loop System
 * Manages update/render cycle with fixed timestep for physics consistency
 */

import type { Application, Ticker } from 'pixi.js';

export type UpdateCallback = (deltaTime: number) => void;
export type RenderCallback = () => void;

export class GameLoop {
  private app: Application;
  private ticker: Ticker;
  private updateCallbacks: UpdateCallback[] = [];
  private renderCallbacks: RenderCallback[] = [];

  private readonly targetFPS: number = 60;
  private readonly fixedTimeStep: number = 1000 / 60; // 16.67ms for 60 FPS
  private accumulator: number = 0;
  private lastTime: number = 0;
  private isPaused: boolean = false;

  constructor(app: Application) {
    this.app = app;
    this.ticker = this.app.ticker;
    this.ticker.maxFPS = this.targetFPS;

    this.ticker.add(this.tick.bind(this));
  }

  /**
   * Main game loop tick function
   */
  private tick(): void {
    if (this.isPaused) {
      return;
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Accumulate time for fixed timestep updates
    this.accumulator += deltaTime;

    // Process physics/game logic updates at fixed timestep
    while (this.accumulator >= this.fixedTimeStep) {
      this.update(this.fixedTimeStep / 1000); // Convert to seconds
      this.accumulator -= this.fixedTimeStep;
    }

    // Render with interpolation factor if needed
    this.render();
  }

  /**
   * Execute all update callbacks
   */
  private update(deltaTime: number): void {
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(deltaTime);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  /**
   * Execute all render callbacks
   */
  private render(): void {
    this.renderCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in render callback:', error);
      }
    });
  }

  /**
   * Add an update callback
   */
  addUpdateCallback(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Remove an update callback
   */
  removeUpdateCallback(callback: UpdateCallback): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index !== -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * Add a render callback
   */
  addRenderCallback(callback: RenderCallback): void {
    this.renderCallbacks.push(callback);
  }

  /**
   * Remove a render callback
   */
  removeRenderCallback(callback: RenderCallback): void {
    const index = this.renderCallbacks.indexOf(callback);
    if (index !== -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  /**
   * Start the game loop
   */
  start(): void {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.ticker.start();
  }

  /**
   * Pause the game loop
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the game loop
   */
  resume(): void {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.ticker.stop();
    this.isPaused = true;
  }

  /**
   * Check if game loop is paused
   */
  isGamePaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.ticker.FPS;
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this.updateCallbacks = [];
    this.renderCallbacks = [];
  }

  /**
   * Destroy the game loop
   */
  destroy(): void {
    this.ticker.remove(this.tick.bind(this));
    this.clearCallbacks();
  }
}
