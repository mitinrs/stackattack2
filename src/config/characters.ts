/**
 * Character Configuration
 * Defines all 6 characters with their distinct attributes and unlock criteria
 */

import type { CharacterConfig } from '../types/config';

/**
 * All character definitions with distinct gameplay attributes
 *
 * Attribute Values (1 or 2):
 * - speed: 1 = normal, 2 = fast
 * - jumpHeight: 1 = jump 1 crate, 2 = jump 2 crates
 * - pushStrength: 1 = push 1 crate, 2 = push stack of 2 crates
 */
export const CHARACTERS: CharacterConfig[] = [
  {
    id: 1,
    name: 'Basic',
    attributes: {
      speed: 1,
      jumpHeight: 1,
      pushStrength: 1,
    },
    sprite: 'char1',
    initiallyUnlocked: true,
  },
  {
    id: 2,
    name: 'Speedy',
    attributes: {
      speed: 2,
      jumpHeight: 1,
      pushStrength: 1,
    },
    sprite: 'char2',
    initiallyUnlocked: true,
  },
  {
    id: 3,
    name: 'Jumper',
    attributes: {
      speed: 1,
      jumpHeight: 2,
      pushStrength: 1,
    },
    sprite: 'char3',
    initiallyUnlocked: false,
    unlockCriteria: {
      type: 'level',
      value: 3,
    },
  },
  {
    id: 4,
    name: 'Strong',
    attributes: {
      speed: 1,
      jumpHeight: 1,
      pushStrength: 2,
    },
    sprite: 'char4',
    initiallyUnlocked: false,
    unlockCriteria: {
      type: 'level',
      value: 5,
    },
  },
  {
    id: 5,
    name: 'Agile',
    attributes: {
      speed: 2,
      jumpHeight: 2,
      pushStrength: 1,
    },
    sprite: 'char5',
    initiallyUnlocked: false,
    unlockCriteria: {
      type: 'score',
      value: 5000,
    },
  },
  {
    id: 6,
    name: 'Tank',
    attributes: {
      speed: 2,
      jumpHeight: 1,
      pushStrength: 2,
    },
    sprite: 'char6',
    initiallyUnlocked: false,
    unlockCriteria: {
      type: 'level',
      value: 8,
    },
  },
];

/**
 * Get character configuration by ID
 */
export function getCharacterById(id: number): CharacterConfig | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

/**
 * Get all initially unlocked characters
 */
export function getInitiallyUnlockedCharacters(): CharacterConfig[] {
  return CHARACTERS.filter((c) => c.initiallyUnlocked);
}

/**
 * Get unlocked characters based on provided unlock IDs
 */
export function getUnlockedCharacters(unlockedIds: number[]): CharacterConfig[] {
  return CHARACTERS.filter((c) => unlockedIds.includes(c.id));
}

/**
 * Get all locked characters
 */
export function getLockedCharacters(): CharacterConfig[] {
  return CHARACTERS.filter((c) => !c.initiallyUnlocked);
}

/**
 * Check unlock criteria for a character based on current progress
 */
export function checkUnlockCriteria(
  character: CharacterConfig,
  progress: { level: number; score: number }
): boolean {
  if (character.initiallyUnlocked) {
    return true;
  }

  if (!character.unlockCriteria) {
    return false;
  }

  switch (character.unlockCriteria.type) {
    case 'level':
      return progress.level >= character.unlockCriteria.value;
    case 'score':
      return progress.score >= character.unlockCriteria.value;
    default:
      return false;
  }
}

/**
 * Get all characters that should be unlocked based on progress
 */
export function getNewlyUnlockedCharacters(
  currentUnlockedIds: number[],
  progress: { level: number; score: number }
): CharacterConfig[] {
  return CHARACTERS.filter((c) => {
    // Skip already unlocked
    if (currentUnlockedIds.includes(c.id)) {
      return false;
    }

    // Check if criteria is now met
    return checkUnlockCriteria(c, progress);
  });
}

/**
 * Get the initial unlocked character IDs
 */
export function getInitialUnlockedIds(): number[] {
  return CHARACTERS.filter((c) => c.initiallyUnlocked).map((c) => c.id);
}

/**
 * Get character attribute description for UI display
 */
export function getAttributeDescription(character: CharacterConfig): {
  speedLevel: number;
  jumpLevel: number;
  strengthLevel: number;
} {
  // Attributes are now 1-2, display as 1-2 bars
  return {
    speedLevel: character.attributes.speed,
    jumpLevel: character.attributes.jumpHeight,
    strengthLevel: character.attributes.pushStrength,
  };
}
