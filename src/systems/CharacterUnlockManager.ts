/**
 * Character Unlock Manager
 * Manages character unlock tracking within a game session
 */

import { EventEmitter } from 'pixi.js';
import type { CharacterConfig } from '../types/config';
import {
  CHARACTERS,
  getInitialUnlockedIds,
  getNewlyUnlockedCharacters,
  getCharacterById,
  getUnlockedCharacters,
} from '../config/characters';

export interface UnlockEvent {
  character: CharacterConfig;
  unlockedBy: 'level' | 'score';
  value: number;
}

export class CharacterUnlockManager extends EventEmitter {
  private unlockedCharacterIds: number[];
  private notifiedUnlocks: Set<number>;

  constructor() {
    super();
    this.unlockedCharacterIds = getInitialUnlockedIds();
    this.notifiedUnlocks = new Set(this.unlockedCharacterIds);
  }

  /**
   * Get all currently unlocked character IDs
   */
  getUnlockedCharacterIds(): number[] {
    return [...this.unlockedCharacterIds];
  }

  /**
   * Get all unlocked character configurations
   */
  getUnlockedCharacters(): CharacterConfig[] {
    return getUnlockedCharacters(this.unlockedCharacterIds);
  }

  /**
   * Check if a specific character is unlocked
   */
  isCharacterUnlocked(characterId: number): boolean {
    return this.unlockedCharacterIds.includes(characterId);
  }

  /**
   * Check progress and unlock any newly available characters
   * Returns array of newly unlocked characters
   */
  checkAndUnlock(progress: { level: number; score: number }): CharacterConfig[] {
    const newlyUnlocked = getNewlyUnlockedCharacters(this.unlockedCharacterIds, progress);

    newlyUnlocked.forEach((character) => {
      this.unlockedCharacterIds.push(character.id);

      // Only emit if not already notified
      if (!this.notifiedUnlocks.has(character.id)) {
        this.notifiedUnlocks.add(character.id);

        const event: UnlockEvent = {
          character,
          unlockedBy: character.unlockCriteria!.type,
          value: character.unlockCriteria!.value,
        };

        this.emit('characterUnlocked', event);
      }
    });

    return newlyUnlocked;
  }

  /**
   * Manually unlock a character (for testing or special scenarios)
   */
  unlockCharacter(characterId: number): boolean {
    if (this.unlockedCharacterIds.includes(characterId)) {
      return false; // Already unlocked
    }

    const character = getCharacterById(characterId);
    if (!character) {
      return false; // Invalid character ID
    }

    this.unlockedCharacterIds.push(characterId);

    if (!this.notifiedUnlocks.has(characterId)) {
      this.notifiedUnlocks.add(characterId);

      const event: UnlockEvent = {
        character,
        unlockedBy: character.unlockCriteria?.type || 'level',
        value: character.unlockCriteria?.value || 0,
      };

      this.emit('characterUnlocked', event);
    }

    return true;
  }

  /**
   * Get all characters with their unlock status
   */
  getAllCharactersWithStatus(): Array<CharacterConfig & { isUnlocked: boolean }> {
    return CHARACTERS.map((character) => ({
      ...character,
      isUnlocked: this.unlockedCharacterIds.includes(character.id),
    }));
  }

  /**
   * Get locked characters
   */
  getLockedCharacters(): CharacterConfig[] {
    return CHARACTERS.filter((c) => !this.unlockedCharacterIds.includes(c.id));
  }

  /**
   * Get the next character to unlock based on progress type
   */
  getNextUnlockByLevel(): CharacterConfig | undefined {
    return CHARACTERS.find(
      (c) => !this.unlockedCharacterIds.includes(c.id) && c.unlockCriteria?.type === 'level'
    );
  }

  /**
   * Get the next character to unlock by score
   */
  getNextUnlockByScore(): CharacterConfig | undefined {
    return CHARACTERS.find(
      (c) => !this.unlockedCharacterIds.includes(c.id) && c.unlockCriteria?.type === 'score'
    );
  }

  /**
   * Reset to initial state (for new game session)
   */
  reset(): void {
    this.unlockedCharacterIds = getInitialUnlockedIds();
    this.notifiedUnlocks = new Set(this.unlockedCharacterIds);
  }

  /**
   * Restore state from session data
   */
  restoreState(unlockedIds: number[]): void {
    this.unlockedCharacterIds = [...unlockedIds];
    this.notifiedUnlocks = new Set(unlockedIds);
  }

  /**
   * Get unlock progress summary
   */
  getUnlockProgress(): {
    unlocked: number;
    total: number;
    remaining: CharacterConfig[];
  } {
    return {
      unlocked: this.unlockedCharacterIds.length,
      total: CHARACTERS.length,
      remaining: this.getLockedCharacters(),
    };
  }
}
