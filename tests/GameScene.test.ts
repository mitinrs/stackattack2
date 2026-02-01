/**
 * Tests for GameScene - HUD, Pause functionality, and cleanup
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ScoreManager } from '../src/systems/ScoreManager';
import { LevelManager } from '../src/systems/LevelManager';
import { GameStateMachine } from '../src/systems/GameStateMachine';
import { GameState } from '../src/types/game';

/**
 * Test 1: HUD updates with score changes
 */
describe('HUD updates with score changes', () => {
  let scoreManager: ScoreManager;

  beforeEach(() => {
    scoreManager = new ScoreManager();
  });

  it('should emit score change events when lines are cleared', () => {
    const listener = vi.fn();
    scoreManager.on('scoreChanged', listener);

    scoreManager.addLineClearPoints(1);

    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].totalScore).toBe(100);
  });

  it('should emit score change events for special blocks', () => {
    const listener = vi.fn();
    scoreManager.on('scoreChanged', listener);

    scoreManager.addSpecialBlockPoints();

    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].totalScore).toBe(500);
  });

  it('should track cumulative score correctly', () => {
    scoreManager.addLineClearPoints(1); // 100
    scoreManager.addLineClearPoints(2); // 250
    scoreManager.addSpecialBlockPoints(); // 500

    expect(scoreManager.getScore()).toBe(850);
  });

  it('should emit level complete events with bonus points', () => {
    const listener = vi.fn();
    scoreManager.on('levelComplete', listener);

    scoreManager.addLevelCompletionBonus(3);

    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].points).toBe(1500); // 500 * 3
  });
});

/**
 * Test 2: Pause functionality
 */
describe('Pause functionality', () => {
  let stateMachine: GameStateMachine;

  beforeEach(() => {
    stateMachine = new GameStateMachine(GameState.Playing);
  });

  it('should transition from Playing to Paused', () => {
    const result = stateMachine.transition(GameState.Paused);
    expect(result).toBe(true);
    expect(stateMachine.getState()).toBe(GameState.Paused);
  });

  it('should transition from Paused back to Playing', () => {
    stateMachine.transition(GameState.Paused);
    const result = stateMachine.transition(GameState.Playing);
    expect(result).toBe(true);
    expect(stateMachine.getState()).toBe(GameState.Playing);
  });

  it('should allow transition from Paused to Menu', () => {
    stateMachine.transition(GameState.Paused);
    const result = stateMachine.transition(GameState.Menu);
    expect(result).toBe(true);
    expect(stateMachine.getState()).toBe(GameState.Menu);
  });

  it('should emit state change events on pause', () => {
    const listener = vi.fn();
    stateMachine.addListener(listener);

    stateMachine.transition(GameState.Paused);

    expect(listener).toHaveBeenCalledWith(GameState.Playing, GameState.Paused);
  });

  it('should not allow invalid transitions from Paused', () => {
    stateMachine.transition(GameState.Paused);

    // Can't go directly to GameOver from Paused
    const result = stateMachine.transition(GameState.GameOver);
    expect(result).toBe(false);
    expect(stateMachine.getState()).toBe(GameState.Paused);
  });
});

/**
 * Test 3: Level Manager integration with HUD
 */
describe('Level Manager HUD integration', () => {
  let levelManager: LevelManager;

  beforeEach(() => {
    levelManager = new LevelManager();
    levelManager.startLevel(1);
  });

  afterEach(() => {
    levelManager.clearListeners();
  });

  it('should track lines cleared for HUD display', () => {
    levelManager.addLinesCleared(2);
    expect(levelManager.getLinesCleared()).toBe(2);
    expect(levelManager.getLinesRemaining()).toBe(1); // Level 1 requires 3 lines
  });

  it('should emit lines cleared events for HUD updates', () => {
    const listener = vi.fn();
    levelManager.addListener('linesCleared', listener);

    levelManager.addLinesCleared(1);

    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].linesCleared).toBe(1);
    expect(listener.mock.calls[0][0].linesToClear).toBe(3);
  });

  it('should provide level progress percentage', () => {
    expect(levelManager.getLevelProgress()).toBe(0);

    levelManager.addLinesCleared(1);
    expect(levelManager.getLevelProgress()).toBeCloseTo(33.33, 1);

    levelManager.addLinesCleared(2);
    expect(levelManager.getLevelProgress()).toBe(100);
  });

  it('should emit level complete event when lines requirement met', () => {
    const listener = vi.fn();
    levelManager.addListener('levelComplete', listener);

    levelManager.addLinesCleared(3); // Level 1 requires 3 lines

    expect(listener).toHaveBeenCalled();
    expect(levelManager.isLevelComplete()).toBe(true);
  });
});

/**
 * Test 4: Game scene cleanup
 */
describe('Game scene cleanup', () => {
  it('should reset score manager on cleanup', () => {
    const scoreManager = new ScoreManager();
    scoreManager.addLineClearPoints(5);
    expect(scoreManager.getScore()).toBeGreaterThan(0);

    scoreManager.reset();

    expect(scoreManager.getScore()).toBe(0);
    expect(scoreManager.getTotalLinesCleared()).toBe(0);
    expect(scoreManager.getSpecialBlocksCollected()).toBe(0);
  });

  it('should reset level manager on cleanup', () => {
    const levelManager = new LevelManager();
    levelManager.startLevel(5);
    levelManager.addLinesCleared(3);

    levelManager.reset();

    expect(levelManager.getCurrentLevel()).toBe(0);
    expect(levelManager.getLinesCleared()).toBe(0);
  });

  it('should reset state machine on cleanup', () => {
    const stateMachine = new GameStateMachine(GameState.Playing);
    stateMachine.transition(GameState.GameOver);

    stateMachine.reset();

    expect(stateMachine.getState()).toBe(GameState.Menu);
  });

  it('should clear listeners on cleanup', () => {
    const scoreManager = new ScoreManager();
    const listener = vi.fn();
    scoreManager.on('scoreChanged', listener);

    scoreManager.removeAllListeners();
    scoreManager.addLineClearPoints(1);

    expect(listener).not.toHaveBeenCalled();
  });
});
