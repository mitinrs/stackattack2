/**
 * Tests for Input Handling System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputManager } from '../src/systems/InputManager';
import { InputAction } from '../src/types/game';

describe('InputManager', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    inputManager = new InputManager();
    inputManager.initialize();
  });

  afterEach(() => {
    inputManager.destroy();
  });

  describe('Keyboard Input Normalization', () => {
    it('should map ArrowLeft to MoveLeft action', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      window.dispatchEvent(event);

      expect(inputManager.isActionActive(InputAction.MoveLeft)).toBe(true);
    });

    it('should map ArrowRight to MoveRight action', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      window.dispatchEvent(event);

      expect(inputManager.isActionActive(InputAction.MoveRight)).toBe(true);
    });

    it('should map ArrowUp to Jump action', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      window.dispatchEvent(event);

      expect(inputManager.isActionActive(InputAction.Jump)).toBe(true);
    });

    it('should map Space to Jump action', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      window.dispatchEvent(event);

      expect(inputManager.isActionActive(InputAction.Jump)).toBe(true);
    });

    it('should reset action state on keyup', () => {
      const keydown = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const keyup = new KeyboardEvent('keyup', { key: 'ArrowLeft' });

      window.dispatchEvent(keydown);
      expect(inputManager.isActionActive(InputAction.MoveLeft)).toBe(true);

      window.dispatchEvent(keyup);
      expect(inputManager.isActionActive(InputAction.MoveLeft)).toBe(false);
    });

    it('should track simultaneous key presses', () => {
      const leftDown = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const jumpDown = new KeyboardEvent('keydown', { key: ' ' });

      window.dispatchEvent(leftDown);
      window.dispatchEvent(jumpDown);

      expect(inputManager.isActionActive(InputAction.MoveLeft)).toBe(true);
      expect(inputManager.isActionActive(InputAction.Jump)).toBe(true);
    });
  });

  describe('Touch Button Press Registration', () => {
    it('should register touch button press for MoveLeft', () => {
      inputManager.triggerAction(InputAction.MoveLeft, true);
      expect(inputManager.isActionActive(InputAction.MoveLeft)).toBe(true);
    });

    it('should unregister touch button release', () => {
      inputManager.triggerAction(InputAction.MoveLeft, true);
      inputManager.triggerAction(InputAction.MoveLeft, false);
      expect(inputManager.isActionActive(InputAction.MoveLeft)).toBe(false);
    });

    it('should handle multiple simultaneous touch buttons', () => {
      inputManager.triggerAction(InputAction.MoveRight, true);
      inputManager.triggerAction(InputAction.Jump, true);

      expect(inputManager.isActionActive(InputAction.MoveRight)).toBe(true);
      expect(inputManager.isActionActive(InputAction.Jump)).toBe(true);
    });
  });

  describe('Swipe Gesture Recognition', () => {
    it('should detect swipe left gesture', () => {
      const listener = vi.fn();
      inputManager.onSwipe(listener);

      inputManager.handleSwipe('left');
      expect(listener).toHaveBeenCalledWith('left');
    });

    it('should detect swipe right gesture', () => {
      const listener = vi.fn();
      inputManager.onSwipe(listener);

      inputManager.handleSwipe('right');
      expect(listener).toHaveBeenCalledWith('right');
    });

    it('should detect swipe up gesture for jump', () => {
      const listener = vi.fn();
      inputManager.onSwipe(listener);

      inputManager.handleSwipe('up');
      expect(listener).toHaveBeenCalledWith('up');
    });
  });

  describe('Input Abstraction Layer', () => {
    it('should provide unified interface for all input sources', () => {
      const state = inputManager.getInputState();

      expect(state).toHaveProperty(InputAction.MoveLeft);
      expect(state).toHaveProperty(InputAction.MoveRight);
      expect(state).toHaveProperty(InputAction.Jump);
      // Push was removed - pushing is now automatic on movement
    });

    it('should normalize keyboard and touch inputs to same action', () => {
      // Test keyboard input
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      window.dispatchEvent(keyEvent);
      expect(inputManager.isActionActive(InputAction.MoveLeft)).toBe(true);

      // Reset
      const keyUpEvent = new KeyboardEvent('keyup', { key: 'ArrowLeft' });
      window.dispatchEvent(keyUpEvent);

      // Test touch input
      inputManager.triggerAction(InputAction.MoveLeft, true);
      expect(inputManager.isActionActive(InputAction.MoveLeft)).toBe(true);
    });
  });
});
