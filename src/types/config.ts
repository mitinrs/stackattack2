/**
 * Configuration type definitions
 */

import type { CharacterAttributes, Level } from './entities';

export interface CharacterConfig {
  id: number;
  name: string;
  attributes: CharacterAttributes;
  sprite: string;
  initiallyUnlocked: boolean;
  unlockCriteria?: {
    type: 'level' | 'score';
    value: number;
  };
}

export interface LevelConfig extends Level {
  description?: string;
}

export const LCDPalette = {
  Blue: 'blue',
  Amber: 'amber',
} as const;

export type LCDPalette = (typeof LCDPalette)[keyof typeof LCDPalette];

export interface GameConfig {
  logicalWidth: number;
  logicalHeight: number;
  targetFPS: number;
  fixedTimeStep: number;
  defaultPalette: LCDPalette;
}

export interface DisplayConfig {
  logicalWidth: number;
  logicalHeight: number;
  pixelGridSize: number;
  backgroundColor: number;
}
