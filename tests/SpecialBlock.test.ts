/**
 * Tests for Special Block System (Task Group 8.4-8.5)
 * Tests special block spawning and activation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpecialBlock, SPECIAL_BLOCK_EFFECTS } from '../src/entities/SpecialBlock';
import { SpecialBlockManager } from '../src/systems/SpecialBlockManager';
import { Crate } from '../src/entities/Crate';
import { Character } from '../src/entities/Character';
import { CrateType } from '../src/types/entities';
import { CHARACTERS } from '../src/config/characters';

describe('Special Block System', () => {
  describe('SpecialBlock Entity', () => {
    it('should create a special block with correct type', () => {
      const block = new SpecialBlock({
        id: 'special-1',
        column: 5,
        type: CrateType.ExtraPoints,
        fallSpeed: 100,
      });

      expect(block.getCrateType()).toBe(CrateType.ExtraPoints);
      expect(block.isSpecial()).toBe(true);
    });

    it('should not be activated initially', () => {
      const block = new SpecialBlock({
        id: 'special-1',
        column: 5,
        type: CrateType.SuperJump,
        fallSpeed: 100,
      });

      expect(block.isActivated()).toBe(false);
    });

    it('should return correct effect when activated', () => {
      const block = new SpecialBlock({
        id: 'special-1',
        column: 5,
        type: CrateType.ExtraPoints,
        fallSpeed: 100,
      });

      const effect = block.activate();
      expect(effect.applied).toBe(true);
      expect(effect.type).toBe(CrateType.ExtraPoints);
      expect(effect.points).toBe(500);
    });

    it('should only activate once', () => {
      const block = new SpecialBlock({
        id: 'special-1',
        column: 5,
        type: CrateType.ExtraPoints,
        fallSpeed: 100,
      });

      const firstActivation = block.activate();
      const secondActivation = block.activate();

      expect(firstActivation.applied).toBe(true);
      expect(secondActivation.applied).toBe(false);
    });

    it('should have correct effect descriptions', () => {
      expect(SPECIAL_BLOCK_EFFECTS[CrateType.ExtraPoints].name).toBe('Extra Points');
      expect(SPECIAL_BLOCK_EFFECTS[CrateType.SuperJump].name).toBe('Super Jump');
      expect(SPECIAL_BLOCK_EFFECTS[CrateType.Helmet].name).toBe('Helmet Protection');
    });
  });

  describe('SpecialBlockManager', () => {
    let manager: SpecialBlockManager;
    let character: Character;

    beforeEach(() => {
      manager = new SpecialBlockManager();
      character = new Character(CHARACTERS[0]); // Use first character
      character.setOnGround(true);
      character.width = 10;
      character.height = 16;
    });

    describe('Extra Points Effect', () => {
      it('should add 500 bonus points immediately on activation', () => {
        const crate = new Crate({
          id: 'special-1',
          column: 5,
          type: CrateType.ExtraPoints,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;

        // Land the crate
        crate.setPosition(100, 200);
        crate.land(200);

        // Position character at same position
        character.setPosition(100, 200);

        const result = manager.activateBlock(crate, character);

        expect(result.activated).toBe(true);
        expect(result.effect?.points).toBe(500);
        expect(manager.getPendingScore()).toBe(500);
      });
    });

    describe('Super Jump Effect', () => {
      it('should increase character jumpHeight by 50% for 10 seconds', () => {
        const crate = new Crate({
          id: 'special-1',
          column: 5,
          type: CrateType.SuperJump,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;

        crate.setPosition(100, 200);
        crate.land(200);
        character.setPosition(100, 200);

        const result = manager.activateBlock(crate, character);

        expect(result.activated).toBe(true);
        expect(result.effect?.duration).toBe(10000); // 10 seconds
        expect(result.effect?.jumpMultiplier).toBe(1.5);
        expect(manager.isSuperJumpActive()).toBe(true);
        expect(character.hasSuperJump()).toBe(true);
      });

      it('should show remaining super jump time', () => {
        const crate = new Crate({
          id: 'special-1',
          column: 5,
          type: CrateType.SuperJump,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;
        crate.setPosition(100, 200);
        crate.land(200);
        character.setPosition(100, 200);

        manager.activateBlock(crate, character);

        const remaining = manager.getSuperJumpRemainingTime();
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(10000);
      });
    });

    describe('Helmet Protection Effect', () => {
      it('should activate helmet protection on collection', () => {
        const crate = new Crate({
          id: 'special-1',
          column: 5,
          type: CrateType.Helmet,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;

        crate.setPosition(100, 200);
        crate.land(200);
        character.setPosition(100, 200);

        const result = manager.activateBlock(crate, character);

        expect(result.activated).toBe(true);
        expect(manager.isHelmetActive()).toBe(true);
      });

      it('should consume helmet protection (single use)', () => {
        const crate = new Crate({
          id: 'special-1',
          column: 5,
          type: CrateType.Helmet,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;
        crate.setPosition(100, 200);
        crate.land(200);
        character.setPosition(100, 200);

        manager.activateBlock(crate, character);

        expect(manager.isHelmetActive()).toBe(true);

        // Consume the helmet
        const consumed = manager.consumeHelmet();
        expect(consumed).toBe(true);
        expect(manager.isHelmetActive()).toBe(false);

        // Try to consume again
        const consumedAgain = manager.consumeHelmet();
        expect(consumedAgain).toBe(false);
      });
    });

    describe('Visual Feedback', () => {
      it('should show brief visual feedback on activation', () => {
        const crate = new Crate({
          id: 'special-1',
          column: 5,
          type: CrateType.ExtraPoints,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;
        crate.setPosition(100, 200);
        crate.land(200);
        character.setPosition(100, 200);

        const result = manager.activateBlock(crate, character);

        expect(result.message).toBe('+500 Points!');
      });
    });

    describe('Collision Detection', () => {
      it('should detect player-special block collision', () => {
        const crate = new Crate({
          id: 'special-1',
          column: 5,
          type: CrateType.ExtraPoints,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;
        crate.setPosition(100, 200);
        crate.land(200);

        // Position character overlapping with crate
        character.setPosition(105, 200);

        const result = manager.checkAndActivateCollision(character, [crate]);

        expect(result).not.toBeNull();
        expect(result?.activated).toBe(true);
      });

      it('should not activate regular crates', () => {
        const crate = new Crate({
          id: 'regular-1',
          column: 5,
          type: CrateType.Regular,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;
        crate.setPosition(100, 200);
        crate.land(200);

        character.setPosition(105, 200);

        const result = manager.checkAndActivateCollision(character, [crate]);

        expect(result).toBeNull();
      });

      it('should not activate non-landed crates', () => {
        const crate = new Crate({
          id: 'special-1',
          column: 5,
          type: CrateType.ExtraPoints,
          fallSpeed: 100,
        });
        crate.width = 16;
        crate.height = 16;
        crate.setPosition(100, 200);
        crate.startFalling(); // Still falling

        character.setPosition(105, 200);

        const result = manager.checkAndActivateCollision(character, [crate]);

        expect(result).toBeNull();
      });
    });
  });
});
