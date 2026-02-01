/**
 * Level Manager System
 * Manages level loading, tracking, and progression
 */

import type { LevelConfig } from '../types/config';
import { getLevelConfig, getLevelFallSpeed, hasNextLevel, getMaxLevel } from '../config/levels';

/**
 * Level completion bonus multiplier
 * Bonus = 500 x level number
 */
const LEVEL_COMPLETION_BONUS_MULTIPLIER = 500;

export interface LevelState {
  currentLevel: number;
  linesCleared: number;
  isComplete: boolean;
}

export type LevelEventType = 'levelStart' | 'levelComplete' | 'linesCleared';

export interface LevelEvent {
  type: LevelEventType;
  level: number;
  linesCleared: number;
  linesToClear: number;
  bonusPoints?: number;
}

type LevelEventListener = (event: LevelEvent) => void;

export class LevelManager {
  private currentLevel: number;
  private linesCleared: number;
  private currentConfig: LevelConfig | undefined;
  private listeners: Map<LevelEventType, LevelEventListener[]>;

  constructor() {
    this.currentLevel = 0;
    this.linesCleared = 0;
    this.currentConfig = undefined;
    this.listeners = new Map();
  }

  /**
   * Start a specific level
   */
  startLevel(levelNumber: number): boolean {
    const config = getLevelConfig(levelNumber);
    if (!config) {
      console.warn(`Level ${levelNumber} not found`);
      return false;
    }

    this.currentLevel = levelNumber;
    this.currentConfig = config;
    this.linesCleared = 0;

    this.emitEvent({
      type: 'levelStart',
      level: levelNumber,
      linesCleared: 0,
      linesToClear: config.linesToClear,
    });

    return true;
  }

  /**
   * Get the current level number
   */
  getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Get the current level configuration
   */
  getCurrentConfig(): LevelConfig | undefined {
    return this.currentConfig;
  }

  /**
   * Get the number of lines cleared in the current level
   */
  getLinesCleared(): number {
    return this.linesCleared;
  }

  /**
   * Get the number of lines remaining to clear
   */
  getLinesRemaining(): number {
    if (!this.currentConfig) return 0;
    return Math.max(0, this.currentConfig.linesToClear - this.linesCleared);
  }

  /**
   * Get the lines required to complete the current level
   */
  getLinesToClear(): number {
    return this.currentConfig?.linesToClear ?? 0;
  }

  /**
   * Add lines cleared to the current level
   */
  addLinesCleared(count: number): void {
    if (count <= 0) return;

    const previousLinesCleared = this.linesCleared;
    this.linesCleared += count;

    this.emitEvent({
      type: 'linesCleared',
      level: this.currentLevel,
      linesCleared: this.linesCleared,
      linesToClear: this.getLinesToClear(),
    });

    // Check for level completion
    if (!this.wasComplete(previousLinesCleared) && this.isLevelComplete()) {
      this.emitEvent({
        type: 'levelComplete',
        level: this.currentLevel,
        linesCleared: this.linesCleared,
        linesToClear: this.getLinesToClear(),
        bonusPoints: this.getCompletionBonus(),
      });
    }
  }

  /**
   * Check if the current level is complete
   */
  isLevelComplete(): boolean {
    if (!this.currentConfig) return false;
    return this.linesCleared >= this.currentConfig.linesToClear;
  }

  /**
   * Check if a previous lines cleared count would have been complete
   */
  private wasComplete(previousLinesCleared: number): boolean {
    if (!this.currentConfig) return false;
    return previousLinesCleared >= this.currentConfig.linesToClear;
  }

  /**
   * Get the completion bonus points for the current level
   */
  getCompletionBonus(): number {
    return this.currentLevel * LEVEL_COMPLETION_BONUS_MULTIPLIER;
  }

  /**
   * Advance to the next level
   * Returns true if successfully advanced, false if no next level
   */
  advanceToNextLevel(): boolean {
    if (!hasNextLevel(this.currentLevel)) {
      return false;
    }

    return this.startLevel(this.currentLevel + 1);
  }

  /**
   * Check if there is a next level available
   */
  hasNextLevel(): boolean {
    return hasNextLevel(this.currentLevel);
  }

  /**
   * Get the fall speed for the current level in pixels per second
   */
  getCurrentFallSpeed(): number {
    return getLevelFallSpeed(this.currentLevel);
  }

  /**
   * Get the crane count for the current level
   */
  getCurrentCraneCount(): number {
    return this.currentConfig?.craneCount ?? 1;
  }

  /**
   * Get the crate speed multiplier for the current level
   */
  getCurrentCrateSpeedMultiplier(): number {
    return this.currentConfig?.crateSpeed ?? 1.0;
  }

  /**
   * Get the maximum level number
   */
  getMaxLevel(): number {
    return getMaxLevel();
  }

  /**
   * Add an event listener
   */
  addListener(eventType: LevelEventType, listener: LevelEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  /**
   * Remove an event listener
   */
  removeListener(eventType: LevelEventType, listener: LevelEventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Clear all listeners for an event type
   */
  clearListeners(eventType?: LevelEventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: LevelEvent): void {
    const eventListeners = this.listeners.get(event.type);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in level event listener for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Reset the level manager
   */
  reset(): void {
    this.currentLevel = 0;
    this.linesCleared = 0;
    this.currentConfig = undefined;
  }

  /**
   * Get progress percentage through current level (0-100)
   */
  getLevelProgress(): number {
    if (!this.currentConfig || this.currentConfig.linesToClear === 0) return 0;
    return Math.min(100, (this.linesCleared / this.currentConfig.linesToClear) * 100);
  }

  /**
   * Get the level state as a serializable object
   */
  getState(): LevelState {
    return {
      currentLevel: this.currentLevel,
      linesCleared: this.linesCleared,
      isComplete: this.isLevelComplete(),
    };
  }
}
