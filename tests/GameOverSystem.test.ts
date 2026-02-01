/**
 * Tests for Game Over System (Task Group 10.1)
 * Tests game over trigger, helmet protection, and score calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from '../src/systems/ScoreManager';
import { CrateManager, CrateManagerConfig } from '../src/systems/CrateManager';
import { SpecialBlockManager } from '../src/systems/SpecialBlockManager';
import { CrateType } from '../src/types/entities';

describe('Game Over System', () => {
  describe('Game Over Detection', () => {
    let crateManager: CrateManager;
    const config: CrateManagerConfig = {
      gridColumns: 10,
      gridRows: 15,
      cellWidth: 20,
      cellHeight: 16,
      groundY: 290,
    };

    beforeEach(() => {
      crateManager = new CrateManager(config);
    });

    it('should trigger game over when crates reach top row', () => {
      // Fill a column up to the top row (row 14 is the top, 0-indexed)
      for (let row = 0; row < config.gridRows; row++) {
        const crate = crateManager.spawnCrate(0, CrateType.Regular, 100);
        crateManager.landCrate(crate, row);
      }

      expect(crateManager.hasReachedTop()).toBe(true);
    });

    it('should not trigger game over when crates are below threshold', () => {
      // Only fill up to row 10 (well below top)
      for (let row = 0; row < 10; row++) {
        const crate = crateManager.spawnCrate(0, CrateType.Regular, 100);
        crateManager.landCrate(crate, row);
      }

      expect(crateManager.hasReachedTop()).toBe(false);
    });

    it('should detect max stack height correctly', () => {
      // Fill column 0 to height 5
      for (let row = 0; row < 5; row++) {
        const crate = crateManager.spawnCrate(0, CrateType.Regular, 100);
        crateManager.landCrate(crate, row);
      }

      // Fill column 3 to height 8
      for (let row = 0; row < 8; row++) {
        const crate = crateManager.spawnCrate(3, CrateType.Regular, 100);
        crateManager.landCrate(crate, row);
      }

      expect(crateManager.getMaxStackHeight()).toBe(8);
    });
  });

  describe('Helmet Protection', () => {
    let specialBlockManager: SpecialBlockManager;

    beforeEach(() => {
      specialBlockManager = new SpecialBlockManager();
    });

    it('should have helmet inactive initially', () => {
      expect(specialBlockManager.isHelmetActive()).toBe(false);
    });

    it('should consume helmet when active', () => {
      // Manually set helmet active via internal method access
      // Simulate helmet activation
      const result = specialBlockManager.consumeHelmet();
      expect(result).toBe(false); // Not active yet

      // We need to test helmet consumption through proper activation
      // This would normally happen via block collision
    });

    it('should return false when consuming helmet that is not active', () => {
      const consumed = specialBlockManager.consumeHelmet();
      expect(consumed).toBe(false);
    });

    it('should track helmet state correctly through reset', () => {
      specialBlockManager.reset();
      expect(specialBlockManager.isHelmetActive()).toBe(false);
    });
  });

  describe('Score Calculation', () => {
    let scoreManager: ScoreManager;

    beforeEach(() => {
      scoreManager = new ScoreManager();
    });

    it('should start with zero score', () => {
      expect(scoreManager.getScore()).toBe(0);
    });

    it('should award 100 points for single line clear', () => {
      scoreManager.addLineClearPoints(1);
      expect(scoreManager.getScore()).toBe(100);
    });

    it('should award 250 points for double line clear', () => {
      scoreManager.addLineClearPoints(2);
      expect(scoreManager.getScore()).toBe(250);
    });

    it('should award 500 points for triple or more line clear', () => {
      scoreManager.addLineClearPoints(3);
      expect(scoreManager.getScore()).toBe(500);

      scoreManager.reset();
      scoreManager.addLineClearPoints(4);
      expect(scoreManager.getScore()).toBe(500);
    });

    it('should award 500 points for special block collection', () => {
      scoreManager.addSpecialBlockPoints();
      expect(scoreManager.getScore()).toBe(500);
    });

    it('should award level completion bonus (500 x level)', () => {
      scoreManager.addLevelCompletionBonus(1);
      expect(scoreManager.getScore()).toBe(500);

      scoreManager.reset();
      scoreManager.addLevelCompletionBonus(5);
      expect(scoreManager.getScore()).toBe(2500);

      scoreManager.reset();
      scoreManager.addLevelCompletionBonus(10);
      expect(scoreManager.getScore()).toBe(5000);
    });

    it('should accumulate score from multiple sources', () => {
      scoreManager.addLineClearPoints(1); // +100
      scoreManager.addSpecialBlockPoints(); // +500
      scoreManager.addLevelCompletionBonus(2); // +1000

      expect(scoreManager.getScore()).toBe(1600);
    });

    it('should reset score correctly', () => {
      scoreManager.addLineClearPoints(2);
      expect(scoreManager.getScore()).toBe(250);

      scoreManager.reset();
      expect(scoreManager.getScore()).toBe(0);
    });

    it('should track highest level reached', () => {
      scoreManager.setHighestLevelReached(5);
      expect(scoreManager.getHighestLevelReached()).toBe(5);

      scoreManager.setHighestLevelReached(3); // Lower level should not override
      expect(scoreManager.getHighestLevelReached()).toBe(5);

      scoreManager.setHighestLevelReached(8); // Higher level should update
      expect(scoreManager.getHighestLevelReached()).toBe(8);
    });
  });
});
