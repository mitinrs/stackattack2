/**
 * Game state and scene type definitions
 */

export const GameState = {
  Menu: 'menu',
  Playing: 'playing',
  Paused: 'paused',
  LevelComplete: 'levelComplete',
  GameOver: 'gameOver',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

export const SceneType = {
  Loading: 'loading',
  MainMenu: 'mainMenu',
  CharacterSelect: 'characterSelect',
  Settings: 'settings',
  Game: 'game',
  LevelTransition: 'levelTransition',
  GameOver: 'gameOver',
} as const;

export type SceneType = (typeof SceneType)[keyof typeof SceneType];

export const InputAction = {
  MoveLeft: 'moveLeft',
  MoveRight: 'moveRight',
  Jump: 'jump',
  Pause: 'pause',
  Confirm: 'confirm',
  Back: 'back',
} as const;

export type InputAction = (typeof InputAction)[keyof typeof InputAction];

export interface GameSessionState {
  currentLevel: number;
  score: number;
  selectedCharacterId: number;
  unlockedCharacterIds: number[];
  linesCleared: number;
  hasHelmet: boolean;
  hasSuperJump: boolean;
  superJumpEndTime?: number;
}

export interface InputState {
  [InputAction.MoveLeft]: boolean;
  [InputAction.MoveRight]: boolean;
  [InputAction.Jump]: boolean;
  [InputAction.Pause]: boolean;
  [InputAction.Confirm]: boolean;
  [InputAction.Back]: boolean;
}
