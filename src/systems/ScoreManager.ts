/**
 * Score Manager System
 * Manages score tracking, points calculation, and session statistics
 */

import EventEmitter from 'eventemitter3';

/**
 * Point values for different scoring events
 */
export const SCORE_VALUES = {
  LINE_CLEAR_SINGLE: 100,
  LINE_CLEAR_DOUBLE: 250,
  LINE_CLEAR_TRIPLE_PLUS: 500,
  SPECIAL_BLOCK: 500,
  LEVEL_COMPLETION_MULTIPLIER: 500,
} as const;

export type ScoreEventType = 'scoreChanged' | 'lineClear' | 'specialBlock' | 'levelComplete';

export interface ScoreEvent {
  type: ScoreEventType;
  points: number;
  totalScore: number;
  details?: {
    linesCleared?: number;
    level?: number;
  };
}

type ScoreEventListener = (event: ScoreEvent) => void;

/**
 * ScoreManager handles all scoring logic for the game
 * - Line clear points (100 single, 250 double, 500 triple+)
 * - Special block collection (500 each)
 * - Level completion bonuses (500 x level number)
 * - Session cumulative score tracking
 */
export class ScoreManager extends EventEmitter {
  private score: number;
  private highestLevelReached: number;
  private totalLinesCleared: number;
  private specialBlocksCollected: number;
  private levelsCompleted: number;
  private scoreListeners: Map<ScoreEventType, ScoreEventListener[]>;

  constructor() {
    super();
    this.score = 0;
    this.highestLevelReached = 0;
    this.totalLinesCleared = 0;
    this.specialBlocksCollected = 0;
    this.levelsCompleted = 0;
    this.scoreListeners = new Map();
  }

  /**
   * Get the current score
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Get the highest level reached in this session
   */
  getHighestLevelReached(): number {
    return this.highestLevelReached;
  }

  /**
   * Get total lines cleared in this session
   */
  getTotalLinesCleared(): number {
    return this.totalLinesCleared;
  }

  /**
   * Get total special blocks collected in this session
   */
  getSpecialBlocksCollected(): number {
    return this.specialBlocksCollected;
  }

  /**
   * Get total levels completed in this session
   */
  getLevelsCompleted(): number {
    return this.levelsCompleted;
  }

  /**
   * Add points for line clears
   * - 1 line: 100 points
   * - 2 lines: 250 points
   * - 3+ lines: 500 points
   */
  addLineClearPoints(linesCleared: number): number {
    if (linesCleared <= 0) {
      return 0;
    }

    let points = 0;

    switch (linesCleared) {
      case 1:
        points = SCORE_VALUES.LINE_CLEAR_SINGLE;
        break;
      case 2:
        points = SCORE_VALUES.LINE_CLEAR_DOUBLE;
        break;
      default:
        // 3 or more lines
        points = SCORE_VALUES.LINE_CLEAR_TRIPLE_PLUS;
        break;
    }

    this.score += points;
    this.totalLinesCleared += linesCleared;

    this.emitScoreEvent({
      type: 'lineClear',
      points,
      totalScore: this.score,
      details: { linesCleared },
    });

    this.emitScoreEvent({
      type: 'scoreChanged',
      points,
      totalScore: this.score,
    });

    return points;
  }

  /**
   * Add points for special block collection
   * - 500 points per special block
   */
  addSpecialBlockPoints(): number {
    const points = SCORE_VALUES.SPECIAL_BLOCK;
    this.score += points;
    this.specialBlocksCollected++;

    this.emitScoreEvent({
      type: 'specialBlock',
      points,
      totalScore: this.score,
    });

    this.emitScoreEvent({
      type: 'scoreChanged',
      points,
      totalScore: this.score,
    });

    return points;
  }

  /**
   * Add level completion bonus
   * - 500 x level number
   */
  addLevelCompletionBonus(levelNumber: number): number {
    if (levelNumber <= 0) {
      return 0;
    }

    const points = SCORE_VALUES.LEVEL_COMPLETION_MULTIPLIER * levelNumber;
    this.score += points;
    this.levelsCompleted++;

    this.emitScoreEvent({
      type: 'levelComplete',
      points,
      totalScore: this.score,
      details: { level: levelNumber },
    });

    this.emitScoreEvent({
      type: 'scoreChanged',
      points,
      totalScore: this.score,
    });

    return points;
  }

  /**
   * Add arbitrary points (for edge cases or future expansion)
   */
  addPoints(points: number): void {
    if (points <= 0) {
      return;
    }

    this.score += points;

    this.emitScoreEvent({
      type: 'scoreChanged',
      points,
      totalScore: this.score,
    });
  }

  /**
   * Set the highest level reached (only updates if higher)
   */
  setHighestLevelReached(level: number): void {
    if (level > this.highestLevelReached) {
      this.highestLevelReached = level;
    }
  }

  /**
   * Add a score event listener
   */
  addScoreListener(eventType: ScoreEventType, listener: ScoreEventListener): void {
    if (!this.scoreListeners.has(eventType)) {
      this.scoreListeners.set(eventType, []);
    }
    this.scoreListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove a score event listener
   */
  removeScoreListener(eventType: ScoreEventType, listener: ScoreEventListener): void {
    const eventListeners = this.scoreListeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Clear all score listeners for an event type
   */
  clearScoreListeners(eventType?: ScoreEventType): void {
    if (eventType) {
      this.scoreListeners.delete(eventType);
    } else {
      this.scoreListeners.clear();
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitScoreEvent(event: ScoreEvent): void {
    // Emit via EventEmitter3
    this.emit(event.type, event);

    // Also emit to manual listeners
    const eventListeners = this.scoreListeners.get(event.type);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in score event listener for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Get a summary of session statistics
   */
  getSessionStats(): {
    score: number;
    highestLevel: number;
    totalLinesCleared: number;
    specialBlocksCollected: number;
    levelsCompleted: number;
  } {
    return {
      score: this.score,
      highestLevel: this.highestLevelReached,
      totalLinesCleared: this.totalLinesCleared,
      specialBlocksCollected: this.specialBlocksCollected,
      levelsCompleted: this.levelsCompleted,
    };
  }

  /**
   * Reset all score data for a new session
   */
  reset(): void {
    this.score = 0;
    this.highestLevelReached = 0;
    this.totalLinesCleared = 0;
    this.specialBlocksCollected = 0;
    this.levelsCompleted = 0;

    this.emitScoreEvent({
      type: 'scoreChanged',
      points: 0,
      totalScore: 0,
    });
  }
}
