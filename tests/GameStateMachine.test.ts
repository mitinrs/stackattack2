/**
 * Tests for GameStateMachine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateMachine } from '../src/systems/GameStateMachine';
import { GameState } from '../src/types/game';

describe('GameStateMachine', () => {
  let stateMachine: GameStateMachine;

  beforeEach(() => {
    stateMachine = new GameStateMachine();
  });

  it('should initialize with Menu state', () => {
    expect(stateMachine.getState()).toBe(GameState.Menu);
  });

  it('should transition from Menu to Playing', () => {
    const success = stateMachine.transition(GameState.Playing);
    expect(success).toBe(true);
    expect(stateMachine.getState()).toBe(GameState.Playing);
  });

  it('should transition from Playing to Paused', () => {
    stateMachine.transition(GameState.Playing);
    const success = stateMachine.transition(GameState.Paused);
    expect(success).toBe(true);
    expect(stateMachine.getState()).toBe(GameState.Paused);
  });

  it('should transition from Playing to GameOver', () => {
    stateMachine.transition(GameState.Playing);
    const success = stateMachine.transition(GameState.GameOver);
    expect(success).toBe(true);
    expect(stateMachine.getState()).toBe(GameState.GameOver);
  });

  it('should reject invalid transition from Menu to GameOver', () => {
    const success = stateMachine.transition(GameState.GameOver);
    expect(success).toBe(false);
    expect(stateMachine.getState()).toBe(GameState.Menu);
  });

  it('should notify listeners on state change', () => {
    const listener = vi.fn();
    stateMachine.addListener(listener);

    stateMachine.transition(GameState.Playing);

    expect(listener).toHaveBeenCalledWith(GameState.Menu, GameState.Playing);
  });

  it('should allow removing listeners', () => {
    const listener = vi.fn();
    stateMachine.addListener(listener);
    stateMachine.removeListener(listener);

    stateMachine.transition(GameState.Playing);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should reset to Menu state', () => {
    stateMachine.transition(GameState.Playing);
    stateMachine.reset();
    expect(stateMachine.getState()).toBe(GameState.Menu);
  });
});
