/**
 * Integration Tests for Stack Attack 2 Pro (Task Group 14.3)
 *
 * Strategic integration tests focusing on:
 * - End-to-end gameplay workflows
 * - Character unlock progression
 * - Level progression with increasing difficulty
 * - Special block effects duration and behavior
 * - Multi-system integration points
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ScoreManager } from '../src/systems/ScoreManager';
import { LevelManager } from '../src/systems/LevelManager';
import { CharacterUnlockManager } from '../src/systems/CharacterUnlockManager';
import { SpecialBlockManager } from '../src/systems/SpecialBlockManager';
import { GameStateMachine } from '../src/systems/GameStateMachine';
import { CrateManager } from '../src/systems/CrateManager';
import { Character } from '../src/entities/Character';
import { Crate } from '../src/entities/Crate';
import { GameState } from '../src/types/game';
import { CrateType } from '../src/types/entities';
import { CHARACTERS, getCharacterById, checkUnlockCriteria } from '../src/config/characters';
import { getLevelConfig, getLevelUnlockRewards } from '../src/config/levels';

/**
 * Test 1: Full Game Session Flow Integration
 * Verifies: menu -> play -> level complete -> game over flow
 */
describe('Full Game Session Flow', () => {
  let stateMachine: GameStateMachine;
  let scoreManager: ScoreManager;
  let levelManager: LevelManager;

  beforeEach(() => {
    stateMachine = new GameStateMachine();
    scoreManager = new ScoreManager();
    levelManager = new LevelManager();
  });

  it('should complete full game session from menu to game over', () => {
    // 1. Start at menu
    expect(stateMachine.getState()).toBe(GameState.Menu);

    // 2. Start playing
    stateMachine.transition(GameState.Playing);
    levelManager.startLevel(1);
    expect(stateMachine.getState()).toBe(GameState.Playing);
    expect(levelManager.getCurrentLevel()).toBe(1);

    // 3. Clear lines and earn score
    scoreManager.addLineClearPoints(3);
    levelManager.addLinesCleared(3);
    expect(scoreManager.getScore()).toBe(500); // triple clear
    expect(levelManager.isLevelComplete()).toBe(true);

    // 4. Level complete - advance to level 2
    const bonus = levelManager.getCompletionBonus();
    scoreManager.addLevelCompletionBonus(1);
    expect(bonus).toBe(500);

    levelManager.advanceToNextLevel();
    expect(levelManager.getCurrentLevel()).toBe(2);

    // 5. Game over
    stateMachine.transition(GameState.GameOver);
    expect(stateMachine.getState()).toBe(GameState.GameOver);

    // 6. Final score reflects all earnings
    expect(scoreManager.getScore()).toBe(1000); // 500 (lines) + 500 (bonus)
  });

  it('should track highest level reached during session', () => {
    levelManager.startLevel(1);

    // Play through levels 1-3
    for (let level = 1; level <= 3; level++) {
      const config = getLevelConfig(level);
      levelManager.addLinesCleared(config!.linesToClear);
      scoreManager.setHighestLevelReached(level);

      if (level < 3) {
        levelManager.advanceToNextLevel();
      }
    }

    expect(scoreManager.getHighestLevelReached()).toBe(3);
    expect(levelManager.getCurrentLevel()).toBe(3);
  });
});

/**
 * Test 2: Character Unlock Progression Integration
 * Verifies: Characters unlock at correct milestones during gameplay
 */
describe('Character Unlock Progression', () => {
  let unlockManager: CharacterUnlockManager;
  let scoreManager: ScoreManager;
  let levelManager: LevelManager;

  beforeEach(() => {
    unlockManager = new CharacterUnlockManager();
    scoreManager = new ScoreManager();
    levelManager = new LevelManager();
  });

  it('should unlock characters at correct level milestones', () => {
    // Initially only 2 characters unlocked
    expect(unlockManager.getUnlockedCharacterIds()).toEqual([1, 2]);

    // Simulate reaching level 3 - should unlock character 3
    levelManager.startLevel(3);
    const unlocksAtLevel3 = unlockManager.checkAndUnlock({
      level: 3,
      score: 0,
    });
    expect(unlocksAtLevel3.map((c) => c.id)).toContain(3);
    expect(unlockManager.isCharacterUnlocked(3)).toBe(true);

    // Simulate reaching level 5 - should unlock character 4
    levelManager.startLevel(5);
    const unlocksAtLevel5 = unlockManager.checkAndUnlock({
      level: 5,
      score: 0,
    });
    expect(unlocksAtLevel5.map((c) => c.id)).toContain(4);
    expect(unlockManager.isCharacterUnlocked(4)).toBe(true);

    // Simulate reaching level 8 - should unlock character 6
    levelManager.startLevel(8);
    const unlocksAtLevel8 = unlockManager.checkAndUnlock({
      level: 8,
      score: 0,
    });
    expect(unlocksAtLevel8.map((c) => c.id)).toContain(6);
    expect(unlockManager.isCharacterUnlocked(6)).toBe(true);
  });

  it('should unlock character 5 at 5000 points', () => {
    expect(unlockManager.isCharacterUnlocked(5)).toBe(false);

    // Accumulate score through gameplay
    scoreManager.addLineClearPoints(2); // 250
    scoreManager.addLineClearPoints(3); // 500
    scoreManager.addSpecialBlockPoints(); // 500
    scoreManager.addLevelCompletionBonus(5); // 2500
    scoreManager.addLineClearPoints(3); // 500
    scoreManager.addLineClearPoints(3); // 500
    scoreManager.addLineClearPoints(2); // 250 = 5000 total

    expect(scoreManager.getScore()).toBe(5000);

    const unlocks = unlockManager.checkAndUnlock({
      level: 1,
      score: scoreManager.getScore(),
    });
    expect(unlocks.map((c) => c.id)).toContain(5);
    expect(unlockManager.isCharacterUnlocked(5)).toBe(true);
  });
});

/**
 * Test 3: Level Progression with Increasing Difficulty
 * Verifies: Crane count and crate speed increase across levels
 */
describe('Level Progression with Increasing Difficulty', () => {
  let levelManager: LevelManager;

  beforeEach(() => {
    levelManager = new LevelManager();
  });

  it('should increase crane count and speed as levels progress', () => {
    // Level 1: 1 crane, speed 1.0
    levelManager.startLevel(1);
    expect(levelManager.getCurrentCraneCount()).toBe(1);
    expect(levelManager.getCurrentCrateSpeedMultiplier()).toBe(1.0);

    // Complete level 1 and advance
    levelManager.addLinesCleared(3);
    levelManager.advanceToNextLevel();

    // Level 2: 2 cranes, speed 1.2
    expect(levelManager.getCurrentCraneCount()).toBe(2);
    expect(levelManager.getCurrentCrateSpeedMultiplier()).toBe(1.2);

    // Skip to level 5 for more contrast
    levelManager.startLevel(5);
    expect(levelManager.getCurrentCraneCount()).toBe(4);
    expect(levelManager.getCurrentCrateSpeedMultiplier()).toBe(2.0);

    // Skip to level 10
    levelManager.startLevel(10);
    expect(levelManager.getCurrentCraneCount()).toBe(8);
    expect(levelManager.getCurrentCrateSpeedMultiplier()).toBe(4.0);
  });

  it('should require more lines to clear as levels increase', () => {
    // Level 1: 3 lines
    levelManager.startLevel(1);
    expect(levelManager.getLinesToClear()).toBe(3);

    // Level 5: 10 lines
    levelManager.startLevel(5);
    expect(levelManager.getLinesToClear()).toBe(10);

    // Level 10: 25 lines
    levelManager.startLevel(10);
    expect(levelManager.getLinesToClear()).toBe(25);
  });
});

/**
 * Test 4: Special Block Effects Integration
 * Verifies: Special block effects duration and behavior
 */
describe('Special Block Effects Integration', () => {
  let specialBlockManager: SpecialBlockManager;
  let character: Character;

  beforeEach(() => {
    vi.useFakeTimers();
    specialBlockManager = new SpecialBlockManager();
    character = new Character(CHARACTERS[0]);
    character.setOnGround(true);
    character.width = 10;
    character.height = 16;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should apply super jump effect with correct duration', () => {
    const crate = new Crate({
      id: 'super-jump-1',
      column: 5,
      type: CrateType.SuperJump,
      fallSpeed: 100,
    });
    crate.width = 16;
    crate.height = 16;
    crate.setPosition(100, 200);
    crate.land(200);
    character.setPosition(100, 200);

    // Activate super jump
    const result = specialBlockManager.activateBlock(crate, character);
    expect(result.activated).toBe(true);
    expect(result.effect?.duration).toBe(10000); // 10 seconds
    expect(specialBlockManager.isSuperJumpActive()).toBe(true);
    expect(character.hasSuperJump()).toBe(true);

    // Simulate time passing (just under expiration - 9.9 seconds)
    vi.advanceTimersByTime(9900);
    specialBlockManager.update(0.016); // call update to check expiration
    expect(specialBlockManager.isSuperJumpActive()).toBe(true);

    // Simulate time passing (past expiration - total 10.1 seconds)
    vi.advanceTimersByTime(200);
    specialBlockManager.update(0.016);
    expect(specialBlockManager.isSuperJumpActive()).toBe(false);
  });

  it('should handle helmet protection preventing game over once', () => {
    const helmetCrate = new Crate({
      id: 'helmet-1',
      column: 5,
      type: CrateType.Helmet,
      fallSpeed: 100,
    });
    helmetCrate.width = 16;
    helmetCrate.height = 16;
    helmetCrate.setPosition(100, 200);
    helmetCrate.land(200);
    character.setPosition(100, 200);

    // Collect helmet
    specialBlockManager.activateBlock(helmetCrate, character);
    expect(specialBlockManager.isHelmetActive()).toBe(true);

    // First game over attempt - should be prevented
    const consumed = specialBlockManager.consumeHelmet();
    expect(consumed).toBe(true);
    expect(specialBlockManager.isHelmetActive()).toBe(false);

    // Second game over attempt - helmet already used
    const consumedAgain = specialBlockManager.consumeHelmet();
    expect(consumedAgain).toBe(false);
  });
});

/**
 * Test 5: Score Accumulation Across Gameplay
 * Verifies: Scores from all sources accumulate correctly in full session
 */
describe('Score Accumulation Across Gameplay', () => {
  let scoreManager: ScoreManager;
  let levelManager: LevelManager;

  beforeEach(() => {
    scoreManager = new ScoreManager();
    levelManager = new LevelManager();
    levelManager.startLevel(1);
  });

  it('should accumulate score from all sources in a session', () => {
    // Start with 0
    expect(scoreManager.getScore()).toBe(0);

    // Clear 1 line: 100 points
    scoreManager.addLineClearPoints(1);
    expect(scoreManager.getScore()).toBe(100);

    // Clear 2 lines (double): 250 points
    scoreManager.addLineClearPoints(2);
    expect(scoreManager.getScore()).toBe(350);

    // Clear 3 lines (triple): 500 points
    scoreManager.addLineClearPoints(3);
    expect(scoreManager.getScore()).toBe(850);

    // Collect special block: 500 points
    scoreManager.addSpecialBlockPoints();
    expect(scoreManager.getScore()).toBe(1350);

    // Complete level 1: 500 x 1 = 500 points
    scoreManager.addLevelCompletionBonus(1);
    expect(scoreManager.getScore()).toBe(1850);

    // Complete level 2: 500 x 2 = 1000 points
    scoreManager.addLevelCompletionBonus(2);
    expect(scoreManager.getScore()).toBe(2850);

    // Track statistics
    expect(scoreManager.getTotalLinesCleared()).toBe(6);
    expect(scoreManager.getSpecialBlocksCollected()).toBe(1);
  });
});

/**
 * Test 6: Session State Reset on Game Over
 * Verifies: All session state properly resets when starting new game
 */
describe('Session State Reset on Game Over', () => {
  it('should reset all game state for new session', () => {
    const stateMachine = new GameStateMachine();
    const scoreManager = new ScoreManager();
    const levelManager = new LevelManager();
    const unlockManager = new CharacterUnlockManager();

    // Simulate a game session
    stateMachine.transition(GameState.Playing);
    levelManager.startLevel(3);
    scoreManager.addLineClearPoints(5);
    scoreManager.setHighestLevelReached(3);

    // Unlock character 3
    unlockManager.checkAndUnlock({ level: 3, score: 0 });
    expect(unlockManager.isCharacterUnlocked(3)).toBe(true);

    // Game over
    stateMachine.transition(GameState.GameOver);

    // Reset all managers (simulating "Play Again")
    stateMachine.reset();
    scoreManager.reset();
    levelManager.reset();
    unlockManager.reset();

    // Verify all state is reset
    expect(stateMachine.getState()).toBe(GameState.Menu);
    expect(scoreManager.getScore()).toBe(0);
    expect(scoreManager.getHighestLevelReached()).toBe(0);
    expect(levelManager.getCurrentLevel()).toBe(0);
    expect(levelManager.getLinesCleared()).toBe(0);

    // Unlocks should be reset to initial state
    expect(unlockManager.getUnlockedCharacterIds()).toEqual([1, 2]);
    expect(unlockManager.isCharacterUnlocked(3)).toBe(false);
  });
});

/**
 * Test 7: Character Attribute Impact on Gameplay
 * Verifies: Different characters have meaningfully different attributes
 */
describe('Character Attribute Impact on Gameplay', () => {
  it('should have characters with distinct gameplay attributes', () => {
    const basicChar = new Character(CHARACTERS[0]); // Basic: jump=1, speed=1
    const speedyChar = new Character(CHARACTERS[1]); // Speedy: jump=1, speed=2
    const jumperChar = new Character(getCharacterById(3)!); // Jumper: jump=2, speed=1
    const agileChar = new Character(getCharacterById(5)!); // Agile: jump=2, speed=2

    // Set up for jumping
    basicChar.setOnGround(true);
    speedyChar.setOnGround(true);
    jumperChar.setOnGround(true);
    agileChar.setOnGround(true);

    // Test different jump heights
    basicChar.jump();
    speedyChar.jump();
    jumperChar.jump();
    agileChar.jump();

    // Jumper (jumpHeight=2) should have higher jump than Basic (jumpHeight=1)
    // More negative velocity = higher jump
    expect(jumperChar.getVelocity().y).toBeLessThan(basicChar.getVelocity().y);

    // Agile (jumpHeight=2) should have same jump as Jumper
    expect(agileChar.getVelocity().y).toBe(jumperChar.getVelocity().y);

    // Basic and Speedy have same jumpHeight=1, so same jump velocity
    expect(basicChar.getVelocity().y).toBe(speedyChar.getVelocity().y);
  });

  it('should have characters with different movement speeds', () => {
    const rookieChar = new Character(CHARACTERS[0]);
    const speedsterChar = new Character(CHARACTERS[1]);

    // Apply movement for several frames
    for (let i = 0; i < 20; i++) {
      rookieChar.moveRight(0.016);
      speedsterChar.moveRight(0.016);
    }

    // Speedster should move faster
    expect(Math.abs(speedsterChar.getVelocity().x)).toBeGreaterThan(
      Math.abs(rookieChar.getVelocity().x)
    );
  });
});

/**
 * Test 8: Line Clear and Gravity Integration
 * Verifies: Crates fall after line clears and stack correctly
 */
describe('Line Clear and Gravity Integration', () => {
  let crateManager: CrateManager;

  beforeEach(() => {
    crateManager = new CrateManager({
      gridColumns: 10,
      gridRows: 15,
      cellWidth: 20,
      cellHeight: 16,
      groundY: 280,
    });
  });

  it('should drop multiple stacked crates after line clear', () => {
    // Create a complete row at row 0
    for (let col = 0; col < 10; col++) {
      const crate = crateManager.spawnCrate(col, CrateType.Regular, 100);
      crateManager.landCrate(crate, 0);
    }

    // Add crates on row 1 in columns 3, 5, 7
    const crateOnRow1Col3 = crateManager.spawnCrate(3, CrateType.Regular, 100);
    crateManager.landCrate(crateOnRow1Col3, 1);

    const crateOnRow1Col5 = crateManager.spawnCrate(5, CrateType.Regular, 100);
    crateManager.landCrate(crateOnRow1Col5, 1);

    const crateOnRow1Col7 = crateManager.spawnCrate(7, CrateType.Regular, 100);
    crateManager.landCrate(crateOnRow1Col7, 1);

    // Clear row 0
    const clearedCount = crateManager.clearCompleteRows();
    expect(clearedCount).toBe(1);

    // Remove cleared crates
    crateManager.removeClearingCrates();

    // Process gravity
    crateManager.processGravity();

    // Crates that were on row 1 should now be on row 0
    expect(crateOnRow1Col3.getGridRow()).toBe(0);
    expect(crateOnRow1Col5.getGridRow()).toBe(0);
    expect(crateOnRow1Col7.getGridRow()).toBe(0);

    // Verify grid state
    expect(crateManager.isCellOccupied(3, 0)).toBe(true);
    expect(crateManager.isCellOccupied(5, 0)).toBe(true);
    expect(crateManager.isCellOccupied(7, 0)).toBe(true);
    expect(crateManager.isCellOccupied(3, 1)).toBe(false);
  });
});

/**
 * Test 9: Level Unlock Rewards Integration
 * Verifies: Level completion triggers correct character unlocks
 */
describe('Level Unlock Rewards Integration', () => {
  it('should integrate level completion with character unlocks', () => {
    const unlockManager = new CharacterUnlockManager();
    const levelManager = new LevelManager();

    // Check unlock rewards defined in level config
    const level3Rewards = getLevelUnlockRewards(3);
    expect(level3Rewards).toContain(3);

    const level5Rewards = getLevelUnlockRewards(5);
    expect(level5Rewards).toContain(4);

    const level8Rewards = getLevelUnlockRewards(8);
    expect(level8Rewards).toContain(6);

    // Simulate completing level 3
    levelManager.startLevel(3);
    levelManager.addLinesCleared(7); // Level 3 requires 7 lines
    expect(levelManager.isLevelComplete()).toBe(true);

    // Get unlock rewards from level manager
    const rewards = levelManager.getCurrentLevelUnlockRewards();
    expect(rewards).toContain(3);

    // Apply unlocks through unlock manager
    for (const charId of rewards) {
      const char = getCharacterById(charId);
      if (char && checkUnlockCriteria(char, { level: 3, score: 0 })) {
        unlockManager.checkAndUnlock({ level: 3, score: 0 });
      }
    }

    expect(unlockManager.isCharacterUnlocked(3)).toBe(true);
  });
});

/**
 * Test 10: Pause/Resume Game State Integration
 * Verifies: Pause correctly freezes and resume correctly restores game state
 */
describe('Pause/Resume Game State Integration', () => {
  it('should properly transition between playing and paused states', () => {
    const stateMachine = new GameStateMachine();
    const stateChanges: GameState[] = [];

    // Track state changes
    stateMachine.addListener((_old, newState) => {
      stateChanges.push(newState);
    });

    // Start game
    stateMachine.transition(GameState.Playing);
    expect(stateMachine.getState()).toBe(GameState.Playing);

    // Pause
    stateMachine.transition(GameState.Paused);
    expect(stateMachine.getState()).toBe(GameState.Paused);

    // Resume
    stateMachine.transition(GameState.Playing);
    expect(stateMachine.getState()).toBe(GameState.Playing);

    // Pause again
    stateMachine.transition(GameState.Paused);
    expect(stateMachine.getState()).toBe(GameState.Paused);

    // Quit to menu from pause
    stateMachine.transition(GameState.Menu);
    expect(stateMachine.getState()).toBe(GameState.Menu);

    // Verify state transition history
    expect(stateChanges).toEqual([
      GameState.Playing,
      GameState.Paused,
      GameState.Playing,
      GameState.Paused,
      GameState.Menu,
    ]);
  });
});
