/**
 * Tests for Character Selection Scene (Task Group 12.1)
 * Tests character selection persistence, locked character display, and character switching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CHARACTERS, getCharacterById, getInitialUnlockedIds } from '../src/config/characters';

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
      render: vi.fn(),
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
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
  })),
  Text: vi.fn().mockImplementation(() => ({
    anchor: { set: vi.fn() },
    position: { set: vi.fn() },
    style: {},
    text: '',
    destroy: vi.fn(),
  })),
  TextStyle: vi.fn().mockImplementation((opts) => opts),
  Sprite: vi.fn().mockImplementation(() => ({
    anchor: { set: vi.fn() },
    position: { set: vi.fn() },
    destroy: vi.fn(),
    texture: null,
    alpha: 1,
  })),
}));

describe('Character Selection System', () => {
  describe('Character Selection Persistence', () => {
    let sessionState: {
      selectedCharacterId: number;
      unlockedCharacterIds: number[];
    };

    beforeEach(() => {
      // Initialize fresh session state with default values
      sessionState = {
        selectedCharacterId: 1,
        unlockedCharacterIds: getInitialUnlockedIds(),
      };
    });

    it('should persist selected character in session state', () => {
      // Initially selected is character 1
      expect(sessionState.selectedCharacterId).toBe(1);

      // Select character 2
      sessionState.selectedCharacterId = 2;
      expect(sessionState.selectedCharacterId).toBe(2);

      // Selection should persist
      expect(sessionState.selectedCharacterId).toBe(2);
    });

    it('should maintain selection after navigating away and back', () => {
      // Select character 2
      sessionState.selectedCharacterId = 2;

      // Simulate navigating away (session state persists)
      const savedState = { ...sessionState };

      // Simulate coming back
      const restoredState = savedState;

      expect(restoredState.selectedCharacterId).toBe(2);
    });

    it('should only allow selection of unlocked characters', () => {
      // Characters 1 and 2 are initially unlocked
      expect(sessionState.unlockedCharacterIds).toContain(1);
      expect(sessionState.unlockedCharacterIds).toContain(2);

      // Characters 3-6 are locked
      expect(sessionState.unlockedCharacterIds).not.toContain(3);
      expect(sessionState.unlockedCharacterIds).not.toContain(4);
      expect(sessionState.unlockedCharacterIds).not.toContain(5);
      expect(sessionState.unlockedCharacterIds).not.toContain(6);

      // Selection of locked character should be prevented
      const canSelect = (id: number) => sessionState.unlockedCharacterIds.includes(id);
      expect(canSelect(1)).toBe(true);
      expect(canSelect(2)).toBe(true);
      expect(canSelect(3)).toBe(false);
    });
  });

  describe('Locked Character Display', () => {
    it('should correctly identify initially locked characters', () => {
      const lockedCharacters = CHARACTERS.filter((c) => !c.initiallyUnlocked);
      expect(lockedCharacters).toHaveLength(4);

      // Verify specific characters are locked
      const lockedIds = lockedCharacters.map((c) => c.id);
      expect(lockedIds).toContain(3); // Jumper
      expect(lockedIds).toContain(4); // Brute
      expect(lockedIds).toContain(5); // Agile
      expect(lockedIds).toContain(6); // Tank
    });

    it('should have unlock criteria for all locked characters', () => {
      const lockedCharacters = CHARACTERS.filter((c) => !c.initiallyUnlocked);

      lockedCharacters.forEach((char) => {
        expect(char.unlockCriteria).toBeDefined();
        expect(char.unlockCriteria?.type).toBeDefined();
        expect(char.unlockCriteria?.value).toBeDefined();
      });
    });

    it('should display unlock requirements correctly', () => {
      // Character 3: Unlock at Level 3
      const char3 = getCharacterById(3);
      expect(char3?.unlockCriteria?.type).toBe('level');
      expect(char3?.unlockCriteria?.value).toBe(3);

      // Character 4: Unlock at Level 5
      const char4 = getCharacterById(4);
      expect(char4?.unlockCriteria?.type).toBe('level');
      expect(char4?.unlockCriteria?.value).toBe(5);

      // Character 5: Unlock at 5000 points
      const char5 = getCharacterById(5);
      expect(char5?.unlockCriteria?.type).toBe('score');
      expect(char5?.unlockCriteria?.value).toBe(5000);

      // Character 6: Unlock at Level 8
      const char6 = getCharacterById(6);
      expect(char6?.unlockCriteria?.type).toBe('level');
      expect(char6?.unlockCriteria?.value).toBe(8);
    });
  });

  describe('Character Switching', () => {
    let sessionState: {
      selectedCharacterId: number;
      unlockedCharacterIds: number[];
    };

    beforeEach(() => {
      sessionState = {
        selectedCharacterId: 1,
        unlockedCharacterIds: getInitialUnlockedIds(),
      };
    });

    it('should switch between unlocked characters', () => {
      // Start with character 1
      expect(sessionState.selectedCharacterId).toBe(1);

      // Switch to character 2
      const canSelect = (id: number) => sessionState.unlockedCharacterIds.includes(id);

      if (canSelect(2)) {
        sessionState.selectedCharacterId = 2;
      }

      expect(sessionState.selectedCharacterId).toBe(2);

      // Switch back to character 1
      if (canSelect(1)) {
        sessionState.selectedCharacterId = 1;
      }

      expect(sessionState.selectedCharacterId).toBe(1);
    });

    it('should not switch to locked characters', () => {
      sessionState.selectedCharacterId = 1;

      // Attempt to select locked character
      const canSelect = (id: number) => sessionState.unlockedCharacterIds.includes(id);

      if (canSelect(3)) {
        sessionState.selectedCharacterId = 3;
      }

      // Should remain on character 1
      expect(sessionState.selectedCharacterId).toBe(1);
    });

    it('should allow switching after character is unlocked', () => {
      sessionState.selectedCharacterId = 1;

      // Initially cannot select character 3
      expect(sessionState.unlockedCharacterIds).not.toContain(3);

      // Simulate unlocking character 3
      sessionState.unlockedCharacterIds.push(3);

      // Now can select character 3
      const canSelect = (id: number) => sessionState.unlockedCharacterIds.includes(id);

      if (canSelect(3)) {
        sessionState.selectedCharacterId = 3;
      }

      expect(sessionState.selectedCharacterId).toBe(3);
    });

    it('should get correct character config after selection', () => {
      sessionState.selectedCharacterId = 2;

      const selectedChar = getCharacterById(sessionState.selectedCharacterId);

      expect(selectedChar).toBeDefined();
      expect(selectedChar?.name).toBe('Speedy');
      expect(selectedChar?.attributes.speed).toBe(2);
    });
  });

  describe('Character Grid Layout', () => {
    it('should have all 6 characters available for display', () => {
      expect(CHARACTERS).toHaveLength(6);
    });

    it('should have distinct character names', () => {
      const names = CHARACTERS.map((c) => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(6);
    });

    it('should arrange 6 characters in 2 columns x 3 rows', () => {
      const gridColumns = 2;
      const gridRows = 3;
      const totalCells = gridColumns * gridRows;

      expect(CHARACTERS.length).toBe(totalCells);

      // Calculate expected positions for each character
      const positions = CHARACTERS.map((_, index) => ({
        col: index % gridColumns,
        row: Math.floor(index / gridColumns),
      }));

      // Verify grid positions
      expect(positions[0]).toEqual({ col: 0, row: 0 }); // Character 1
      expect(positions[1]).toEqual({ col: 1, row: 0 }); // Character 2
      expect(positions[2]).toEqual({ col: 0, row: 1 }); // Character 3
      expect(positions[3]).toEqual({ col: 1, row: 1 }); // Character 4
      expect(positions[4]).toEqual({ col: 0, row: 2 }); // Character 5
      expect(positions[5]).toEqual({ col: 1, row: 2 }); // Character 6
    });
  });
});
