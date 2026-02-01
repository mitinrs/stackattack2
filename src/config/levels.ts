/**
 * Level Configuration
 * Defines all levels with their difficulty parameters
 */

import type { LevelConfig } from '../types/config';

/**
 * Base fall speed in pixels per second
 * Each level's crateSpeed multiplies this
 */
export const BASE_FALL_SPEED = 60;

/**
 * All level definitions with progressive difficulty
 *
 * Level Parameters:
 * - craneCount: Number of cranes dropping crates (1-8)
 * - crateSpeed: Multiplier for fall speed (1.0-4.0)
 * - linesToClear: Number of lines needed to complete the level
 * - unlockRewards: Character IDs unlocked upon completing this level
 */
export const LEVELS: LevelConfig[] = [
  {
    levelNumber: 1,
    craneCount: 1,
    crateSpeed: 1.0,
    linesToClear: 3,
    description: 'Welcome to Stack Attack!',
  },
  {
    levelNumber: 2,
    craneCount: 2,
    crateSpeed: 1.2,
    linesToClear: 5,
    description: 'Two cranes now!',
  },
  {
    levelNumber: 3,
    craneCount: 2,
    crateSpeed: 1.5,
    linesToClear: 7,
    unlockRewards: [3], // Unlocks Character 3 (Jumper)
    description: 'Crates are falling faster!',
  },
  {
    levelNumber: 4,
    craneCount: 3,
    crateSpeed: 1.8,
    linesToClear: 8,
    description: 'Three cranes in action!',
  },
  {
    levelNumber: 5,
    craneCount: 4,
    crateSpeed: 2.0,
    linesToClear: 10,
    unlockRewards: [4], // Unlocks Character 4 (Brute)
    description: 'Four cranes dropping crates!',
  },
  {
    levelNumber: 6,
    craneCount: 5,
    crateSpeed: 2.3,
    linesToClear: 12,
    description: 'Getting challenging!',
  },
  {
    levelNumber: 7,
    craneCount: 6,
    crateSpeed: 2.6,
    linesToClear: 15,
    description: 'Six cranes!',
  },
  {
    levelNumber: 8,
    craneCount: 7,
    crateSpeed: 3.0,
    linesToClear: 18,
    unlockRewards: [6], // Unlocks Character 6 (Tank)
    description: 'Seven cranes now!',
  },
  {
    levelNumber: 9,
    craneCount: 8,
    crateSpeed: 3.5,
    linesToClear: 20,
    description: 'Maximum cranes!',
  },
  {
    levelNumber: 10,
    craneCount: 8,
    crateSpeed: 4.0,
    linesToClear: 25,
    description: 'Final challenge!',
  },
];

/**
 * Get level configuration by level number
 */
export function getLevelConfig(levelNumber: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.levelNumber === levelNumber);
}

/**
 * Get the fall speed for a level in pixels per second
 */
export function getLevelFallSpeed(levelNumber: number): number {
  const level = getLevelConfig(levelNumber);
  if (!level) {
    // Default to highest difficulty if level not found
    return BASE_FALL_SPEED * 4.0;
  }
  return BASE_FALL_SPEED * level.crateSpeed;
}

/**
 * Get all levels
 */
export function getAllLevels(): LevelConfig[] {
  return [...LEVELS];
}

/**
 * Get the maximum level number
 */
export function getMaxLevel(): number {
  return Math.max(...LEVELS.map((l) => l.levelNumber));
}

/**
 * Check if there's a next level
 */
export function hasNextLevel(currentLevel: number): boolean {
  return currentLevel < getMaxLevel();
}

/**
 * Get character unlock rewards for completing a level
 */
export function getLevelUnlockRewards(levelNumber: number): number[] {
  const level = getLevelConfig(levelNumber);
  return level?.unlockRewards ?? [];
}
