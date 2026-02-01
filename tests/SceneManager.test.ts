/**
 * Tests for SceneManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SceneManager } from '../src/systems/SceneManager';
import { Scene } from '../src/scenes/Scene';
import { SceneType } from '../src/types/game';

class TestScene extends Scene {
  constructor(type: (typeof SceneType)[keyof typeof SceneType]) {
    super(type);
  }

  protected async onCreate(): Promise<void> {
    // Test implementation
  }
}

// Mock PixiJS Application
const createMockApp = () => {
  return {
    stage: {
      addChild: vi.fn(),
      removeChild: vi.fn(),
    },
  } as any;
};

describe('SceneManager', () => {
  let mockApp: any;
  let sceneManager: SceneManager;
  let testScene1: TestScene;
  let testScene2: TestScene;

  beforeEach(() => {
    mockApp = createMockApp();
    sceneManager = new SceneManager(mockApp);
    testScene1 = new TestScene(SceneType.MainMenu);
    testScene2 = new TestScene(SceneType.Game);
  });

  it('should register scenes', () => {
    sceneManager.registerScene(testScene1);
    const retrieved = sceneManager.getScene(SceneType.MainMenu);
    expect(retrieved).toBe(testScene1);
  });

  it('should push scene onto stack', async () => {
    sceneManager.registerScene(testScene1);
    await sceneManager.push(SceneType.MainMenu);
    expect(sceneManager.getCurrentScene()).toBe(testScene1);
    expect(sceneManager.getStackSize()).toBe(1);
  });

  it('should pop scene from stack', async () => {
    sceneManager.registerScene(testScene1);
    sceneManager.registerScene(testScene2);

    await sceneManager.push(SceneType.MainMenu);
    await sceneManager.push(SceneType.Game);

    expect(sceneManager.getStackSize()).toBe(2);

    sceneManager.pop();

    expect(sceneManager.getCurrentScene()).toBe(testScene1);
    expect(sceneManager.getStackSize()).toBe(1);
  });

  it('should replace current scene', async () => {
    sceneManager.registerScene(testScene1);
    sceneManager.registerScene(testScene2);

    await sceneManager.push(SceneType.MainMenu);
    await sceneManager.replace(SceneType.Game);

    expect(sceneManager.getCurrentScene()).toBe(testScene2);
    expect(sceneManager.getStackSize()).toBe(1);
  });

  it('should clear all scenes', async () => {
    sceneManager.registerScene(testScene1);
    sceneManager.registerScene(testScene2);

    await sceneManager.push(SceneType.MainMenu);
    await sceneManager.push(SceneType.Game);

    sceneManager.clear();

    expect(sceneManager.getCurrentScene()).toBeUndefined();
    expect(sceneManager.getStackSize()).toBe(0);
  });

  it('should update current scene', async () => {
    let updateCalled = false;
    testScene1.update = () => {
      updateCalled = true;
    };

    sceneManager.registerScene(testScene1);
    await sceneManager.push(SceneType.MainMenu);

    sceneManager.update(0.016);

    expect(updateCalled).toBe(true);
  });
});
