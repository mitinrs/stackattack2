/**
 * Tests for Level System (Task Group 9.1)
 * Tests level configuration loading, level completion detection, difficulty progression
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LEVELS,
  getLevelConfig,
  getLevelFallSpeed,
  getMaxLevel,
  hasNextLevel,
  getLevelUnlockRewards,
  BASE_FALL_SPEED,
} from '../src/config/levels';
import { LevelManager } from '../src/systems/LevelManager';

describe('Level System', () => {
  describe('Level Configuration Loading', () => {
    it('should have at least 10 levels defined', () => {
      expect(LEVELS.length).toBeGreaterThanOrEqual(10);
    });

    it('should load level configuration by level number', () => {
      const level1 = getLevelConfig(1);
      expect(level1).toBeDefined();
      expect(level1?.levelNumber).toBe(1);
      expect(level1?.craneCount).toBe(1);
      expect(level1?.crateSpeed).toBe(1.0);
      expect(level1?.linesToClear).toBe(3);
    });

    it('should return undefined for non-existent level', () => {
      const level = getLevelConfig(999);
      expect(level).toBeUndefined();
    });

    it('should have sequential level numbers', () => {
      for (let i = 1; i <= LEVELS.length; i++) {
        const level = getLevelConfig(i);
        expect(level).toBeDefined();
        expect(level?.levelNumber).toBe(i);
      }
    });

    it('should correctly calculate fall speed for levels', () => {
      const level1Speed = getLevelFallSpeed(1);
      expect(level1Speed).toBe(BASE_FALL_SPEED * 1.0);

      const level10Speed = getLevelFallSpeed(10);
      expect(level10Speed).toBe(BASE_FALL_SPEED * 4.0);
    });
  });

  describe('Level Completion Detection', () => {
    let levelManager: LevelManager;

    beforeEach(() => {
      levelManager = new LevelManager();
      levelManager.startLevel(1);
    });

    it('should track lines cleared in current level', () => {
      expect(levelManager.getLinesCleared()).toBe(0);
      levelManager.addLinesCleared(1);
      expect(levelManager.getLinesCleared()).toBe(1);
    });

    it('should detect level completion when lines requirement is met', () => {
      const level1 = getLevelConfig(1);
      expect(level1?.linesToClear).toBe(3);

      // Clear 2 lines - not complete
      levelManager.addLinesCleared(2);
      expect(levelManager.isLevelComplete()).toBe(false);

      // Clear 1 more line - now complete
      levelManager.addLinesCleared(1);
      expect(levelManager.isLevelComplete()).toBe(true);
    });

    it('should calculate correct level completion bonus points', () => {
      // Level 1 bonus = 500 x 1 = 500
      levelManager.startLevel(1);
      expect(levelManager.getCompletionBonus()).toBe(500);

      // Level 5 bonus = 500 x 5 = 2500
      levelManager.startLevel(5);
      expect(levelManager.getCompletionBonus()).toBe(2500);

      // Level 10 bonus = 500 x 10 = 5000
      levelManager.startLevel(10);
      expect(levelManager.getCompletionBonus()).toBe(5000);
    });

    it('should detect when exceeding lines requirement', () => {
      levelManager.startLevel(1); // 3 lines to clear
      levelManager.addLinesCleared(5);
      expect(levelManager.isLevelComplete()).toBe(true);
    });
  });

  describe('Difficulty Progression', () => {
    it('should have increasing crane counts across levels', () => {
      let previousCraneCount = 0;
      for (const level of LEVELS) {
        expect(level.craneCount).toBeGreaterThanOrEqual(previousCraneCount);
        previousCraneCount = level.craneCount;
      }
    });

    it('should have increasing crate speeds across levels', () => {
      let previousSpeed = 0;
      for (const level of LEVELS) {
        expect(level.crateSpeed).toBeGreaterThanOrEqual(previousSpeed);
        previousSpeed = level.crateSpeed;
      }
    });

    it('should have crane count between 1 and 8 for all levels', () => {
      for (const level of LEVELS) {
        expect(level.craneCount).toBeGreaterThanOrEqual(1);
        expect(level.craneCount).toBeLessThanOrEqual(8);
      }
    });

    it('should have correct unlock rewards at specific levels', () => {
      // Level 3 unlocks Character 3
      const level3Rewards = getLevelUnlockRewards(3);
      expect(level3Rewards).toContain(3);

      // Level 5 unlocks Character 4
      const level5Rewards = getLevelUnlockRewards(5);
      expect(level5Rewards).toContain(4);

      // Level 8 unlocks Character 6
      const level8Rewards = getLevelUnlockRewards(8);
      expect(level8Rewards).toContain(6);
    });

    it('should correctly report if next level exists', () => {
      expect(hasNextLevel(1)).toBe(true);
      expect(hasNextLevel(9)).toBe(true);
      expect(hasNextLevel(10)).toBe(false);
    });

    it('should return correct max level', () => {
      expect(getMaxLevel()).toBe(10);
    });
  });

  describe('Level Manager System', () => {
    let levelManager: LevelManager;

    beforeEach(() => {
      levelManager = new LevelManager();
    });

    it('should load and apply level configuration', () => {
      levelManager.startLevel(3);

      expect(levelManager.getCurrentLevel()).toBe(3);
      expect(levelManager.getCurrentConfig()?.craneCount).toBe(2);
      expect(levelManager.getCurrentConfig()?.crateSpeed).toBe(1.5);
      expect(levelManager.getCurrentConfig()?.linesToClear).toBe(7);
    });

    it('should reset lines cleared when starting new level', () => {
      levelManager.startLevel(1);
      levelManager.addLinesCleared(2);
      expect(levelManager.getLinesCleared()).toBe(2);

      levelManager.startLevel(2);
      expect(levelManager.getLinesCleared()).toBe(0);
    });

    it('should advance to next level correctly', () => {
      levelManager.startLevel(1);
      levelManager.advanceToNextLevel();
      expect(levelManager.getCurrentLevel()).toBe(2);
    });

    it('should not advance beyond max level', () => {
      levelManager.startLevel(10);
      const advanced = levelManager.advanceToNextLevel();
      expect(advanced).toBe(false);
      expect(levelManager.getCurrentLevel()).toBe(10);
    });

    it('should return unlock rewards for current level', () => {
      levelManager.startLevel(3);
      const rewards = levelManager.getCurrentLevelUnlockRewards();
      expect(rewards).toContain(3);
    });

    it('should calculate lines remaining correctly', () => {
      levelManager.startLevel(1); // 3 lines to clear
      expect(levelManager.getLinesRemaining()).toBe(3);

      levelManager.addLinesCleared(1);
      expect(levelManager.getLinesRemaining()).toBe(2);

      levelManager.addLinesCleared(3); // Exceeded
      expect(levelManager.getLinesRemaining()).toBe(0);
    });
  });
});
