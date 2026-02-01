/**
 * Tests for Crane System (Task Group 8.1)
 * Tests crane movement, crate drop timing,
 * and special block spawn rate (5-10%)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Crane, CraneState } from '../src/entities/Crane';
import { CraneManager } from '../src/systems/CraneManager';
import { CrateType } from '../src/types/entities';
import { DEFAULT_GRID_CONFIG } from '../src/config/grid';

describe('Crane System', () => {
  describe('Crane Movement', () => {
    it('should start in idle state off-screen', () => {
      const crane = new Crane({
        id: 1,
        craneWidth: 16,
        craneHeight: 8,
        topY: 30,
        cellWidth: 20,
        gridLeftX: 20,
        gridColumns: 10,
      });

      expect(crane.isIdle()).toBe(true);
      expect(crane.getState()).toBe(CraneState.Idle);
      expect(crane.visible).toBe(false);
    });

    it('should move to target column when startDrop is called', () => {
      const crane = new Crane({
        id: 1,
        craneWidth: 16,
        craneHeight: 8,
        topY: 30,
        cellWidth: 20,
        gridLeftX: 20,
        gridColumns: 10,
      });

      crane.startDrop(5);

      expect(crane.isIdle()).toBe(false);
      expect(crane.getState()).toBe(CraneState.Entering);
      expect(crane.visible).toBe(true);
      expect(crane.getColumn()).toBe(5);
    });

    it('should complete drop cycle: entering -> dropping -> exiting -> idle', () => {
      const crane = new Crane({
        id: 1,
        craneWidth: 16,
        craneHeight: 8,
        topY: 30,
        cellWidth: 20,
        gridLeftX: 20,
        gridColumns: 10,
      });

      crane.startDrop(5);
      expect(crane.getState()).toBe(CraneState.Entering);

      // Simulate enough updates to reach target column
      for (let i = 0; i < 100; i++) {
        crane.update(0.016); // ~60fps
        if (crane.getState() !== CraneState.Entering) break;
      }

      // Should be dropping now
      expect(crane.getState()).toBe(CraneState.Dropping);

      // Continue updates to complete drop pause
      for (let i = 0; i < 50; i++) {
        crane.update(0.016);
        if (crane.getState() === CraneState.Exiting) break;
      }

      expect(crane.getState()).toBe(CraneState.Exiting);
      expect(crane.checkAndConsumeDrop()).toBe(true);

      // Continue updates to exit screen
      for (let i = 0; i < 200; i++) {
        crane.update(0.016);
        if (crane.getState() === CraneState.Idle) break;
      }

      expect(crane.getState()).toBe(CraneState.Idle);
      expect(crane.visible).toBe(false);
    });
  });

  describe('CraneManager Crane Initialization', () => {
    it('should handle 1 to 8 cranes correctly', () => {
      const craneManager = new CraneManager({
        gridConfig: DEFAULT_GRID_CONFIG,
        craneTopY: 30,
      });

      // Test with 1 crane
      craneManager.initializeCranes(1);
      expect(craneManager.getCranes().length).toBe(1);

      // Test with 8 cranes
      craneManager.initializeCranes(8);
      expect(craneManager.getCranes().length).toBe(8);
    });

    it('should create cranes in idle state', () => {
      const craneManager = new CraneManager({
        gridConfig: DEFAULT_GRID_CONFIG,
        craneTopY: 30,
      });

      craneManager.initializeCranes(4);
      const cranes = craneManager.getCranes();

      cranes.forEach((crane) => {
        expect(crane.isIdle()).toBe(true);
        expect(crane.isActive()).toBe(true);
      });
    });
  });

  describe('Crate Drop Timing', () => {
    let craneManager: CraneManager;

    beforeEach(() => {
      craneManager = new CraneManager({
        gridConfig: DEFAULT_GRID_CONFIG,
        craneTopY: 30,
      });
      craneManager.initializeCranes(2);
    });

    it('should trigger crane movement based on spawn timing', () => {
      craneManager.setSpawnInterval(1000);

      // No cranes should start moving initially
      craneManager.update(0.5); // 500ms
      const cranes = craneManager.getCranes();
      const idleCranes = cranes.filter((c) => c.isIdle());
      expect(idleCranes.length).toBe(2);

      // After 1 second total, a crane should start moving
      craneManager.update(0.5); // 1000ms total
      const idleCranesAfter = cranes.filter((c) => c.isIdle());
      expect(idleCranesAfter.length).toBeLessThan(2);
    });

    it('should randomize which crane moves next', () => {
      craneManager.initializeCranes(4);
      craneManager.setSpawnInterval(100);

      // Collect multiple drop cycles to verify randomization
      const droppedCraneIds: number[] = [];

      for (let i = 0; i < 100; i++) {
        const drops = craneManager.update(0.1);
        for (const drop of drops) {
          droppedCraneIds.push(drop.craneId);
        }
      }

      // Should have drops from more than one crane (randomized)
      const uniqueCraneIds = new Set(droppedCraneIds);
      expect(uniqueCraneIds.size).toBeGreaterThan(1);
    });

    it('should prevent simultaneous drops from overwhelming player', () => {
      craneManager.initializeCranes(8);
      craneManager.setSpawnInterval(100);

      // Even with fast spawning, should not drop more than 1 crate per update
      const drops = craneManager.update(0.1);
      expect(drops.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Special Block Spawn Rate (5-10%)', () => {
    let craneManager: CraneManager;

    beforeEach(() => {
      craneManager = new CraneManager({
        gridConfig: DEFAULT_GRID_CONFIG,
        craneTopY: 30,
      });
      craneManager.initializeCranes(4);
      craneManager.setSpawnInterval(50); // Fast spawning for test
    });

    it('should spawn special blocks approximately 5-10% of the time', () => {
      let specialCount = 0;
      let regularCount = 0;

      // Collect many drops to verify rate
      for (let i = 0; i < 2000; i++) {
        const drops = craneManager.update(0.05);
        for (const drop of drops) {
          if (drop.crateType !== CrateType.Regular) {
            specialCount++;
          } else {
            regularCount++;
          }
        }
      }

      const totalDrops = specialCount + regularCount;
      expect(totalDrops).toBeGreaterThan(0);

      const specialRate = specialCount / totalDrops;

      // Allow some variance due to randomness, but should be roughly 5-10%
      // Testing with a wider range (2-20%) to account for random variance
      expect(specialRate).toBeGreaterThanOrEqual(0.02);
      expect(specialRate).toBeLessThanOrEqual(0.2);
    });

    it('should randomly select special type from extra points, super jump, helmet', () => {
      const specialTypes: Set<CrateType> = new Set();

      // Collect many drops to find special blocks
      for (let i = 0; i < 5000; i++) {
        const drops = craneManager.update(0.05);
        for (const drop of drops) {
          if (drop.crateType !== CrateType.Regular) {
            specialTypes.add(drop.crateType);
          }
        }
        // Early exit if we've found all types
        if (specialTypes.size === 3) break;
      }

      // Should eventually see all 3 special types
      expect(specialTypes.has(CrateType.ExtraPoints)).toBe(true);
      expect(specialTypes.has(CrateType.SuperJump)).toBe(true);
      expect(specialTypes.has(CrateType.Helmet)).toBe(true);
    });
  });

  describe('Crane Entity', () => {
    it('should track active state', () => {
      const crane = new Crane({
        id: 1,
        craneWidth: 16,
        craneHeight: 8,
        topY: 30,
        cellWidth: 20,
        gridLeftX: 20,
        gridColumns: 10,
      });

      expect(crane.isActive()).toBe(true);
      crane.setActive(false);
      expect(crane.isActive()).toBe(false);
    });

    it('should return correct drop position at target column', () => {
      const crane = new Crane({
        id: 1,
        craneWidth: 16,
        craneHeight: 8,
        topY: 30,
        cellWidth: 20,
        gridLeftX: 20,
        gridColumns: 10,
      });

      crane.startDrop(5);

      // Drop position should be at center of target column
      const dropPos = crane.getDropPosition();
      const expectedX = 20 + 5 * 20 + 20 / 2; // gridLeftX + column * cellWidth + cellWidth / 2
      expect(dropPos.x).toBe(expectedX);
      expect(dropPos.y).toBe(30);
    });

    it('should reset to idle state', () => {
      const crane = new Crane({
        id: 1,
        craneWidth: 16,
        craneHeight: 8,
        topY: 30,
        cellWidth: 20,
        gridLeftX: 20,
        gridColumns: 10,
      });

      crane.startDrop(3);
      expect(crane.isIdle()).toBe(false);

      crane.reset();
      expect(crane.isIdle()).toBe(true);
      expect(crane.visible).toBe(false);
    });
  });
});
