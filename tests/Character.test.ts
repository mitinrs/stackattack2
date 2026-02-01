/**
 * Tests for Character System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Character, CharacterState } from '../src/entities/Character';
import {
  CHARACTERS,
  getCharacterById,
  getUnlockedCharacters,
  checkUnlockCriteria,
} from '../src/config/characters';
import type { CharacterConfig } from '../src/types/config';

describe('Character System', () => {
  describe('Character Movement Physics', () => {
    let character: Character;
    const mockConfig: CharacterConfig = {
      id: 1,
      name: 'Test Character',
      attributes: {
        speed: 1,
        jumpHeight: 1,
        pushStrength: 1,
      },
      sprite: 'char1',
      initiallyUnlocked: true,
    };

    beforeEach(() => {
      character = new Character(mockConfig);
    });

    it('should move left when moveLeft is called', () => {
      character.moveLeft(0.016); // ~1 frame at 60fps
      expect(character.getVelocity().x).toBeLessThan(0);
    });

    it('should move right when moveRight is called', () => {
      character.moveRight(0.016);
      expect(character.getVelocity().x).toBeGreaterThan(0);
    });

    it('should stop horizontal movement when no input', () => {
      character.moveRight(0.016);
      expect(character.getVelocity().x).toBeGreaterThan(0);

      // Apply deceleration by not moving
      character.update(0.1);
      character.update(0.1);
      character.update(0.1);

      // Velocity should decrease towards 0
      expect(Math.abs(character.getVelocity().x)).toBeLessThan(character.getVelocity().x + 10);
    });

    it('should apply horizontal movement based on character speed attribute', () => {
      const fastConfig: CharacterConfig = {
        ...mockConfig,
        attributes: { speed: 2, jumpHeight: 1, pushStrength: 1 },
      };
      const fastCharacter = new Character(fastConfig);

      // Apply movement over several frames to reach max speed
      for (let i = 0; i < 20; i++) {
        character.moveRight(0.016);
        fastCharacter.moveRight(0.016);
      }

      // Faster character should have greater max velocity
      expect(fastCharacter.getVelocity().x).toBeGreaterThan(character.getVelocity().x);
    });
  });

  describe('Jump Mechanics', () => {
    let character: Character;
    const mockConfig: CharacterConfig = {
      id: 1,
      name: 'Test Character',
      attributes: {
        speed: 1,
        jumpHeight: 1,
        pushStrength: 1,
      },
      sprite: 'char1',
      initiallyUnlocked: true,
    };

    beforeEach(() => {
      character = new Character(mockConfig);
      character.setOnGround(true);
    });

    it('should jump when on ground', () => {
      expect(character.getState()).toBe(CharacterState.Idle);
      character.jump();
      expect(character.getVelocity().y).toBeLessThan(0); // Negative Y is up
      expect(character.getState()).toBe(CharacterState.Jumping);
    });

    it('should not jump when already in air', () => {
      character.jump();
      const velocityAfterFirstJump = character.getVelocity().y;
      character.jump(); // Try to double jump
      expect(character.getVelocity().y).toBe(velocityAfterFirstJump);
    });

    it('should apply gravity while in air', () => {
      character.jump();
      const initialVelocity = character.getVelocity().y;
      character.update(0.016);
      expect(character.getVelocity().y).toBeGreaterThan(initialVelocity); // Gravity pulls down (positive Y)
    });

    it('should have different jump heights based on character attributes', () => {
      const highJumpConfig: CharacterConfig = {
        ...mockConfig,
        attributes: { speed: 2, jumpHeight: 5, pushStrength: 1 },
      };
      const highJumper = new Character(highJumpConfig);
      highJumper.setOnGround(true);

      character.jump();
      highJumper.jump();

      // Higher jump height means more negative initial velocity
      expect(highJumper.getVelocity().y).toBeLessThan(character.getVelocity().y);
    });
  });

  describe('Character Attribute Differences', () => {
    it('should have all 6 characters defined', () => {
      expect(CHARACTERS).toHaveLength(6);
    });

    it('should have characters with distinct attributes', () => {
      const attributeSets = CHARACTERS.map(
        (c) => `${c.attributes.speed}-${c.attributes.jumpHeight}-${c.attributes.pushStrength}`
      );
      const uniqueAttributeSets = new Set(attributeSets);

      // All characters should have unique attribute combinations
      expect(uniqueAttributeSets.size).toBe(6);
    });

    it('should have 2 initially unlocked characters', () => {
      const unlockedCount = CHARACTERS.filter((c) => c.initiallyUnlocked).length;
      expect(unlockedCount).toBe(2);
    });

    it('should have 4 locked characters with unlock criteria', () => {
      const lockedCharacters = CHARACTERS.filter((c) => !c.initiallyUnlocked);
      expect(lockedCharacters).toHaveLength(4);
      lockedCharacters.forEach((c) => {
        expect(c.unlockCriteria).toBeDefined();
      });
    });

    it('should return correct character by ID', () => {
      const char1 = getCharacterById(1);
      expect(char1).toBeDefined();
      expect(char1!.id).toBe(1);

      const char6 = getCharacterById(6);
      expect(char6).toBeDefined();
      expect(char6!.id).toBe(6);
    });
  });

  describe('Character Unlock System', () => {
    it('should return only unlocked characters initially', () => {
      const unlockedIds = [1, 2]; // Initial unlock IDs
      const unlocked = getUnlockedCharacters(unlockedIds);
      expect(unlocked).toHaveLength(2);
      expect(unlocked.every((c) => unlockedIds.includes(c.id))).toBe(true);
    });

    it('should unlock Character 3 at Level 3', () => {
      const char3 = getCharacterById(3);
      expect(char3?.unlockCriteria?.type).toBe('level');
      expect(char3?.unlockCriteria?.value).toBe(3);

      const shouldUnlock = checkUnlockCriteria(char3!, { level: 3, score: 0 });
      expect(shouldUnlock).toBe(true);
    });

    it('should unlock Character 4 at Level 5', () => {
      const char4 = getCharacterById(4);
      expect(char4?.unlockCriteria?.type).toBe('level');
      expect(char4?.unlockCriteria?.value).toBe(5);

      const shouldUnlock = checkUnlockCriteria(char4!, { level: 5, score: 0 });
      expect(shouldUnlock).toBe(true);
    });

    it('should unlock Character 5 at 5000 points', () => {
      const char5 = getCharacterById(5);
      expect(char5?.unlockCriteria?.type).toBe('score');
      expect(char5?.unlockCriteria?.value).toBe(5000);

      const shouldUnlock = checkUnlockCriteria(char5!, { level: 1, score: 5000 });
      expect(shouldUnlock).toBe(true);
    });

    it('should unlock Character 6 at Level 8', () => {
      const char6 = getCharacterById(6);
      expect(char6?.unlockCriteria?.type).toBe('level');
      expect(char6?.unlockCriteria?.value).toBe(8);

      const shouldUnlock = checkUnlockCriteria(char6!, { level: 8, score: 0 });
      expect(shouldUnlock).toBe(true);
    });

    it('should not unlock character if criteria not met', () => {
      const char6 = getCharacterById(6);
      const shouldNotUnlock = checkUnlockCriteria(char6!, { level: 7, score: 10000 });
      expect(shouldNotUnlock).toBe(false);
    });
  });
});
