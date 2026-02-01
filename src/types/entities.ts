/**
 * Entity type definitions for Stack Attack 2 Pro
 */

export interface CharacterAttributes {
  speed: number;
  jumpHeight: number;
  pushStrength: number;
}

export interface Character {
  id: number;
  name: string;
  attributes: CharacterAttributes;
  sprite: string;
  isUnlocked: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export const CrateType = {
  Regular: 'regular',
  ExtraPoints: 'extraPoints',
  SuperJump: 'superJump',
  Helmet: 'helmet',
  Bomb: 'bomb',
  ExtraLife: 'extraLife',
} as const;

export type CrateType = (typeof CrateType)[keyof typeof CrateType];

export const CrateColor = {
  Red: 'red',
  Blue: 'blue',
  Green: 'green',
  Yellow: 'yellow',
} as const;

export type CrateColor = (typeof CrateColor)[keyof typeof CrateColor];

export const CRATE_COLORS = Object.values(CrateColor) as CrateColor[];

export interface Crate {
  id: string;
  position: Position;
  velocity: Velocity;
  type: CrateType;
  isLanded: boolean;
  gridPosition?: {
    column: number;
    row: number;
  };
}

export interface Crane {
  id: number;
  position: Position;
  isActive: boolean;
  dropTimer: number;
}

export interface Level {
  levelNumber: number;
  craneCount: number;
  crateSpeed: number;
  linesToClear: number;
}
