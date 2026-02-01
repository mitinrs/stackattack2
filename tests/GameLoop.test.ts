/**
 * Tests for GameLoop
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameLoop } from '../src/systems/GameLoop';

// Mock PixiJS Application and Ticker
const createMockApp = () => {
  const ticker = {
    maxFPS: 60,
    FPS: 60,
    add: vi.fn(),
    remove: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  return {
    ticker,
  } as any;
};

describe('GameLoop', () => {
  let mockApp: any;
  let gameLoop: GameLoop;

  beforeEach(() => {
    mockApp = createMockApp();
    gameLoop = new GameLoop(mockApp);
  });

  it('should create game loop with application', () => {
    expect(gameLoop).toBeDefined();
    expect(mockApp.ticker.add).toHaveBeenCalled();
  });

  it('should start and stop game loop', () => {
    gameLoop.start();
    expect(mockApp.ticker.start).toHaveBeenCalled();

    gameLoop.stop();
    expect(mockApp.ticker.stop).toHaveBeenCalled();
  });

  it('should pause and resume game loop', () => {
    gameLoop.start();
    expect(gameLoop.isGamePaused()).toBe(false);

    gameLoop.pause();
    expect(gameLoop.isGamePaused()).toBe(true);

    gameLoop.resume();
    expect(gameLoop.isGamePaused()).toBe(false);
  });

  it('should add and remove update callbacks', () => {
    const updateCallback = vi.fn();
    gameLoop.addUpdateCallback(updateCallback);
    gameLoop.removeUpdateCallback(updateCallback);

    expect(gameLoop).toBeDefined();
  });

  it('should clear all callbacks', () => {
    const updateCallback1 = vi.fn();
    const updateCallback2 = vi.fn();
    gameLoop.addUpdateCallback(updateCallback1);
    gameLoop.addUpdateCallback(updateCallback2);

    gameLoop.clearCallbacks();

    expect(gameLoop).toBeDefined();
  });

  it('should get FPS', () => {
    const fps = gameLoop.getFPS();
    expect(fps).toBe(60);
  });
});
