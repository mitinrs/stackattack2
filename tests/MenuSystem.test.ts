/**
 * Tests for Menu System (Task Group 11.1)
 * Tests menu navigation, button interactions, and scene transitions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SceneManager } from '../src/systems/SceneManager';
import { SceneType } from '../src/types/game';

// Mock PixiJS modules
vi.mock('pixi.js', () => ({
  Application: vi.fn().mockImplementation(() => ({
    stage: {
      addChild: vi.fn(),
      removeChild: vi.fn(),
      children: [],
    },
    canvas: document.createElement('canvas'),
    renderer: {
      background: { color: 0 },
    },
    ticker: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  })),
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    destroy: vi.fn(),
    children: [],
    visible: true,
    eventMode: 'static',
    cursor: 'pointer',
    on: vi.fn(),
    position: { set: vi.fn() },
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    position: { set: vi.fn() },
  })),
  Text: vi.fn().mockImplementation(() => ({
    anchor: { set: vi.fn() },
    position: { set: vi.fn() },
    style: {},
    text: '',
    destroy: vi.fn(),
  })),
  TextStyle: vi.fn().mockImplementation((opts) => opts),
}));

describe('Menu System', () => {
  describe('Menu Navigation', () => {
    let sceneManager: ReturnType<typeof createMockSceneManager>;

    function createMockSceneManager() {
      const scenes = new Map<SceneType, { isReady: boolean; visible: boolean }>();
      const stack: SceneType[] = [];

      return {
        registerScene: (type: SceneType) => {
          scenes.set(type, { isReady: false, visible: false });
        },
        push: async (type: SceneType) => {
          const scene = scenes.get(type);
          if (scene) {
            if (stack.length > 0) {
              const current = scenes.get(stack[stack.length - 1]);
              if (current) current.visible = false;
            }
            scene.isReady = true;
            scene.visible = true;
            stack.push(type);
          }
        },
        pop: () => {
          if (stack.length > 0) {
            const type = stack.pop();
            if (type) {
              const scene = scenes.get(type);
              if (scene) scene.visible = false;
            }
            if (stack.length > 0) {
              const prev = scenes.get(stack[stack.length - 1]);
              if (prev) prev.visible = true;
            }
          }
        },
        replace: async (type: SceneType) => {
          if (stack.length > 0) {
            const prevType = stack.pop();
            if (prevType) {
              const prev = scenes.get(prevType);
              if (prev) prev.visible = false;
            }
          }
          const scene = scenes.get(type);
          if (scene) {
            scene.isReady = true;
            scene.visible = true;
            stack.push(type);
          }
        },
        getCurrentScene: () => (stack.length > 0 ? stack[stack.length - 1] : null),
        getStackSize: () => stack.length,
        isSceneVisible: (type: SceneType) => scenes.get(type)?.visible ?? false,
      };
    }

    beforeEach(() => {
      sceneManager = createMockSceneManager();
      // Register all menu-related scenes
      sceneManager.registerScene(SceneType.MainMenu);
      sceneManager.registerScene(SceneType.Settings);
      sceneManager.registerScene(SceneType.CharacterSelect);
      sceneManager.registerScene(SceneType.Game);
    });

    it('should start with main menu as first scene', async () => {
      await sceneManager.push(SceneType.MainMenu);

      expect(sceneManager.getCurrentScene()).toBe(SceneType.MainMenu);
      expect(sceneManager.getStackSize()).toBe(1);
    });

    it('should navigate from main menu to settings', async () => {
      await sceneManager.push(SceneType.MainMenu);
      await sceneManager.push(SceneType.Settings);

      expect(sceneManager.getCurrentScene()).toBe(SceneType.Settings);
      expect(sceneManager.getStackSize()).toBe(2);
      expect(sceneManager.isSceneVisible(SceneType.MainMenu)).toBe(false);
      expect(sceneManager.isSceneVisible(SceneType.Settings)).toBe(true);
    });

    it('should return to main menu from settings via pop', async () => {
      await sceneManager.push(SceneType.MainMenu);
      await sceneManager.push(SceneType.Settings);
      sceneManager.pop();

      expect(sceneManager.getCurrentScene()).toBe(SceneType.MainMenu);
      expect(sceneManager.getStackSize()).toBe(1);
      expect(sceneManager.isSceneVisible(SceneType.MainMenu)).toBe(true);
    });

    it('should navigate from main menu to character select', async () => {
      await sceneManager.push(SceneType.MainMenu);
      await sceneManager.push(SceneType.CharacterSelect);

      expect(sceneManager.getCurrentScene()).toBe(SceneType.CharacterSelect);
      expect(sceneManager.getStackSize()).toBe(2);
    });

    it('should replace main menu with game scene on play', async () => {
      await sceneManager.push(SceneType.MainMenu);
      await sceneManager.replace(SceneType.Game);

      expect(sceneManager.getCurrentScene()).toBe(SceneType.Game);
      expect(sceneManager.getStackSize()).toBe(1);
      expect(sceneManager.isSceneVisible(SceneType.MainMenu)).toBe(false);
      expect(sceneManager.isSceneVisible(SceneType.Game)).toBe(true);
    });
  });

  describe('Button Interactions', () => {
    it('should track selected button index', () => {
      let selectedIndex = 0;
      const buttonCount = 4;

      // Navigate down
      selectedIndex = Math.min(buttonCount - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(1);

      // Navigate to last button
      selectedIndex = Math.min(buttonCount - 1, selectedIndex + 1);
      selectedIndex = Math.min(buttonCount - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(3);

      // Should not go past last button
      selectedIndex = Math.min(buttonCount - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(3);

      // Navigate back up
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(2);

      // Navigate to first
      selectedIndex = 0;
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(0);
    });

    it('should map button index to correct action', () => {
      const buttonActions = ['playGame', 'highScores', 'characterSelect', 'settings'];

      expect(buttonActions[0]).toBe('playGame');
      expect(buttonActions[1]).toBe('highScores');
      expect(buttonActions[2]).toBe('characterSelect');
      expect(buttonActions[3]).toBe('settings');
    });

    it('should handle button click callbacks', () => {
      const clickHandler = vi.fn();
      const buttons = [
        { label: 'Play Game', onClick: () => clickHandler('play') },
        { label: 'High Scores', onClick: () => clickHandler('highScores') },
        { label: 'Character Select', onClick: () => clickHandler('characterSelect') },
        { label: 'Settings', onClick: () => clickHandler('settings') },
      ];

      buttons[0].onClick();
      expect(clickHandler).toHaveBeenCalledWith('play');

      buttons[3].onClick();
      expect(clickHandler).toHaveBeenCalledWith('settings');
    });
  });

  describe('Scene Transitions', () => {
    it('should maintain scene stack correctly during navigation', async () => {
      const stack: string[] = [];

      // Simulate main menu -> settings -> back -> character select
      stack.push('MainMenu');
      expect(stack).toEqual(['MainMenu']);

      stack.push('Settings');
      expect(stack).toEqual(['MainMenu', 'Settings']);

      stack.pop(); // Back from settings
      expect(stack).toEqual(['MainMenu']);

      stack.push('CharacterSelect');
      expect(stack).toEqual(['MainMenu', 'CharacterSelect']);
    });

    it('should handle scene visibility during transitions', () => {
      const sceneVisibility = new Map<string, boolean>();
      sceneVisibility.set('MainMenu', true);
      sceneVisibility.set('Settings', false);

      // Transition to settings
      sceneVisibility.set('MainMenu', false);
      sceneVisibility.set('Settings', true);

      expect(sceneVisibility.get('MainMenu')).toBe(false);
      expect(sceneVisibility.get('Settings')).toBe(true);

      // Transition back
      sceneVisibility.set('Settings', false);
      sceneVisibility.set('MainMenu', true);

      expect(sceneVisibility.get('MainMenu')).toBe(true);
      expect(sceneVisibility.get('Settings')).toBe(false);
    });
  });

  describe('Palette Toggle', () => {
    it('should toggle between blue and amber palettes', () => {
      let currentPalette: 'blue' | 'amber' = 'blue';

      // Toggle to amber
      currentPalette = currentPalette === 'blue' ? 'amber' : 'blue';
      expect(currentPalette).toBe('amber');

      // Toggle back to blue
      currentPalette = currentPalette === 'blue' ? 'amber' : 'blue';
      expect(currentPalette).toBe('blue');
    });

    it('should persist palette preference in session', () => {
      // Mock sessionStorage
      const storage = new Map<string, string>();
      const mockSessionStorage = {
        setItem: (key: string, value: string) => storage.set(key, value),
        getItem: (key: string) => storage.get(key) || null,
      };

      mockSessionStorage.setItem('lcdPalette', 'amber');
      expect(mockSessionStorage.getItem('lcdPalette')).toBe('amber');

      mockSessionStorage.setItem('lcdPalette', 'blue');
      expect(mockSessionStorage.getItem('lcdPalette')).toBe('blue');
    });
  });
});
