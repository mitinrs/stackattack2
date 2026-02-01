/**
 * Level Transition Scene
 * Displays level completion message, score, and next level preview
 * Auto-advances after 3 seconds or on button press
 */

import { Graphics, Text, TextStyle } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType } from '../types/game';
import type { LCDEffect } from '../systems/LCDEffect';
import type { LevelConfig } from '../types/config';
import { getLevelConfig } from '../config/levels';

/**
 * Auto-advance delay in milliseconds
 */
const AUTO_ADVANCE_DELAY = 3000;

export interface LevelTransitionData {
  completedLevel: number;
  currentScore: number;
  bonusPoints: number;
  nextLevelConfig?: LevelConfig;
  unlockedCharacters?: number[];
}

export class LevelTransitionScene extends Scene {
  private lcdEffect: LCDEffect;
  private transitionData: LevelTransitionData | null = null;
  private autoAdvanceTimer: number = 0;
  private isAutoAdvanceEnabled: boolean = true;

  // UI elements
  private background: Graphics | null = null;
  private levelCompleteText: Text | null = null;
  private scoreText: Text | null = null;
  private bonusText: Text | null = null;
  private nextLevelText: Text | null = null;
  private unlockText: Text | null = null;
  private continueText: Text | null = null;
  private progressBar: Graphics | null = null;

  // Callbacks
  private onContinue: (() => void) | null = null;

  constructor(lcdEffect: LCDEffect) {
    super(SceneType.LevelTransition);
    this.lcdEffect = lcdEffect;
  }

  /**
   * Set the transition data for this scene
   */
  setTransitionData(data: LevelTransitionData): void {
    this.transitionData = data;
    this.updateDisplay();
  }

  /**
   * Set level info (convenience method)
   * @param level - The level that was completed
   * @param score - Current score
   * @param unlocks - Array of unlocked character IDs
   */
  setLevelInfo(level: number, score: number, unlocks: number[] = []): void {
    const nextLevel = level + 1;
    const nextLevelConfig = getLevelConfig(nextLevel);
    const bonusPoints = level * 500; // Level completion bonus

    this.transitionData = {
      completedLevel: level,
      currentScore: score,
      bonusPoints: bonusPoints,
      nextLevelConfig: nextLevelConfig,
      unlockedCharacters: unlocks,
    };
    this.updateDisplay();
  }

  /**
   * Set the callback for when continuing to next level
   */
  setOnContinue(callback: () => void): void {
    this.onContinue = callback;
  }

  /**
   * Enable or disable auto-advance
   */
  setAutoAdvanceEnabled(enabled: boolean): void {
    this.isAutoAdvanceEnabled = enabled;
  }

  /**
   * Create the scene content
   */
  protected async onCreate(): Promise<void> {
    const colors = this.lcdEffect.getPaletteColors();

    // Create background
    this.background = new Graphics();
    this.background.rect(0, 0, 240, 320);
    this.background.fill({ color: colors.background });
    this.container.addChild(this.background);

    // Create pixel-art style text
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 16,
      fill: colors.accent,
      align: 'center',
    });

    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: colors.foreground,
      align: 'center',
    });

    const smallStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: colors.foreground,
      align: 'center',
    });

    // Level complete title
    this.levelCompleteText = new Text({
      text: 'LEVEL COMPLETE!',
      style: titleStyle,
    });
    this.levelCompleteText.anchor.set(0.5);
    this.levelCompleteText.position.set(120, 60);
    this.container.addChild(this.levelCompleteText);

    // Score display
    this.scoreText = new Text({
      text: 'Score: 0',
      style: textStyle,
    });
    this.scoreText.anchor.set(0.5);
    this.scoreText.position.set(120, 100);
    this.container.addChild(this.scoreText);

    // Bonus points display
    this.bonusText = new Text({
      text: 'Bonus: +0',
      style: textStyle,
    });
    this.bonusText.anchor.set(0.5);
    this.bonusText.position.set(120, 120);
    this.container.addChild(this.bonusText);

    // Next level preview
    this.nextLevelText = new Text({
      text: '',
      style: textStyle,
    });
    this.nextLevelText.anchor.set(0.5);
    this.nextLevelText.position.set(120, 160);
    this.container.addChild(this.nextLevelText);

    // Character unlock notification
    this.unlockText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 11,
        fill: colors.accent,
        align: 'center',
      }),
    });
    this.unlockText.anchor.set(0.5);
    this.unlockText.position.set(120, 200);
    this.container.addChild(this.unlockText);

    // Continue text
    this.continueText = new Text({
      text: 'Press any key to continue...',
      style: smallStyle,
    });
    this.continueText.anchor.set(0.5);
    this.continueText.position.set(120, 260);
    this.container.addChild(this.continueText);

    // Progress bar background
    this.progressBar = new Graphics();
    this.progressBar.position.set(40, 280);
    this.container.addChild(this.progressBar);

    this.drawProgressBar(0);

    // Add click/touch listener for manual advance
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.on('pointerdown', this.handleContinue.bind(this));
  }

  /**
   * Update the display with current transition data
   */
  private updateDisplay(): void {
    if (!this.transitionData) return;

    const colors = this.lcdEffect.getPaletteColors();

    // Update level complete text
    if (this.levelCompleteText) {
      this.levelCompleteText.text = `LEVEL ${this.transitionData.completedLevel}\nCOMPLETE!`;
    }

    // Update score
    if (this.scoreText) {
      this.scoreText.text = `Score: ${this.transitionData.currentScore}`;
    }

    // Update bonus
    if (this.bonusText) {
      this.bonusText.text = `Bonus: +${this.transitionData.bonusPoints}`;
    }

    // Update next level preview
    if (this.nextLevelText) {
      if (this.transitionData.nextLevelConfig) {
        const next = this.transitionData.nextLevelConfig;
        this.nextLevelText.text =
          `Next: Level ${next.levelNumber}\n` +
          `${next.craneCount} crane${next.craneCount > 1 ? 's' : ''}, ` +
          `${next.linesToClear} lines`;
      } else {
        this.nextLevelText.text = 'You have conquered\nall levels!';
      }
    }

    // Update unlock notification
    if (this.unlockText) {
      if (
        this.transitionData.unlockedCharacters &&
        this.transitionData.unlockedCharacters.length > 0
      ) {
        const charIds = this.transitionData.unlockedCharacters;
        this.unlockText.text =
          `NEW CHARACTER${charIds.length > 1 ? 'S' : ''} UNLOCKED!\n` +
          `Character ${charIds.join(', ')}`;
        this.unlockText.style.fill = colors.accent;
      } else {
        this.unlockText.text = '';
      }
    }
  }

  /**
   * Draw the progress bar
   */
  private drawProgressBar(progress: number): void {
    if (!this.progressBar) return;

    const colors = this.lcdEffect.getPaletteColors();
    const barWidth = 160;
    const barHeight = 8;

    this.progressBar.clear();

    // Background
    this.progressBar.rect(0, 0, barWidth, barHeight);
    this.progressBar.fill({ color: colors.background });
    this.progressBar.stroke({ color: colors.foreground, width: 1 });

    // Progress fill
    const fillWidth = Math.min(barWidth - 2, (barWidth - 2) * progress);
    if (fillWidth > 0) {
      this.progressBar.rect(1, 1, fillWidth, barHeight - 2);
      this.progressBar.fill({ color: colors.accent });
    }
  }

  /**
   * Handle continue action
   */
  private handleContinue(): void {
    if (this.onContinue) {
      this.onContinue();
    }
  }

  /**
   * Called when scene becomes active
   */
  override onEnter(): void {
    super.onEnter();
    this.autoAdvanceTimer = 0;
    this.updateDisplay();

    // Add keyboard listener
    this.handleKeyPress = this.handleKeyPress.bind(this);
    window.addEventListener('keydown', this.handleKeyPress);
  }

  /**
   * Called when scene becomes inactive
   */
  override onExit(): void {
    super.onExit();
    window.removeEventListener('keydown', this.handleKeyPress);
  }

  /**
   * Handle keyboard input
   */
  private handleKeyPress(event: KeyboardEvent): void {
    // Any key continues to next level
    if (event.key === ' ' || event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      this.handleContinue();
    }
  }

  /**
   * Update the scene
   */
  override update(deltaTime: number): void {
    if (!this.isAutoAdvanceEnabled) return;

    // Update auto-advance timer
    this.autoAdvanceTimer += deltaTime * 1000; // Convert to milliseconds

    // Update progress bar
    const progress = Math.min(1, this.autoAdvanceTimer / AUTO_ADVANCE_DELAY);
    this.drawProgressBar(progress);

    // Auto-advance when timer completes
    if (this.autoAdvanceTimer >= AUTO_ADVANCE_DELAY) {
      this.autoAdvanceTimer = 0;
      this.handleContinue();
    }
  }

  /**
   * Update colors when palette changes
   */
  updatePalette(): void {
    const colors = this.lcdEffect.getPaletteColors();

    if (this.background) {
      this.background.clear();
      this.background.rect(0, 0, 240, 320);
      this.background.fill({ color: colors.background });
    }

    if (this.levelCompleteText) {
      this.levelCompleteText.style.fill = colors.accent;
    }

    if (this.scoreText) {
      this.scoreText.style.fill = colors.foreground;
    }

    if (this.bonusText) {
      this.bonusText.style.fill = colors.foreground;
    }

    if (this.nextLevelText) {
      this.nextLevelText.style.fill = colors.foreground;
    }

    if (this.continueText) {
      this.continueText.style.fill = colors.foreground;
    }

    this.drawProgressBar(this.autoAdvanceTimer / AUTO_ADVANCE_DELAY);
  }

  /**
   * Reset the scene for reuse
   */
  reset(): void {
    this.transitionData = null;
    this.autoAdvanceTimer = 0;
    this.drawProgressBar(0);
  }

  /**
   * Destroy the scene
   */
  override destroy(): void {
    window.removeEventListener('keydown', this.handleKeyPress);

    if (this.background) {
      this.background.destroy();
      this.background = null;
    }

    if (this.levelCompleteText) {
      this.levelCompleteText.destroy();
      this.levelCompleteText = null;
    }

    if (this.scoreText) {
      this.scoreText.destroy();
      this.scoreText = null;
    }

    if (this.bonusText) {
      this.bonusText.destroy();
      this.bonusText = null;
    }

    if (this.nextLevelText) {
      this.nextLevelText.destroy();
      this.nextLevelText = null;
    }

    if (this.unlockText) {
      this.unlockText.destroy();
      this.unlockText = null;
    }

    if (this.continueText) {
      this.continueText.destroy();
      this.continueText = null;
    }

    if (this.progressBar) {
      this.progressBar.destroy();
      this.progressBar = null;
    }

    super.destroy();
  }
}
