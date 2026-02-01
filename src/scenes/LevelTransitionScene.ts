/**
 * Level Transition Scene
 * Displays level completion congratulations and continue button
 */

import { Graphics, Text, TextStyle } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType } from '../types/game';
import type { LCDEffect } from '../systems/LCDEffect';
import type { LevelConfig } from '../types/config';
import { getLevelConfig, hasNextLevel } from '../config/levels';

export interface LevelTransitionData {
  completedLevel: number;
  currentScore: number;
  bonusPoints: number;
  nextLevelConfig?: LevelConfig;
}

export class LevelTransitionScene extends Scene {
  private lcdEffect: LCDEffect;
  private transitionData: LevelTransitionData | null = null;

  // UI elements
  private background: Graphics | null = null;
  private congratsText: Text | null = null;
  private levelText: Text | null = null;
  private scoreText: Text | null = null;
  private bonusText: Text | null = null;
  private nextLevelText: Text | null = null;
  private continueButton: Graphics | null = null;
  private continueButtonText: Text | null = null;

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
   */
  setLevelInfo(level: number, score: number): void {
    const nextLevel = level + 1;
    const nextLevelConfig = getLevelConfig(nextLevel);
    const bonusPoints = level * 500;

    this.transitionData = {
      completedLevel: level,
      currentScore: score,
      bonusPoints: bonusPoints,
      nextLevelConfig: nextLevelConfig,
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
   * Create the scene content
   */
  protected async onCreate(): Promise<void> {
    const colors = this.lcdEffect.getPaletteColors();

    // Create background
    this.background = new Graphics();
    this.background.rect(0, 0, 240, 320);
    this.background.fill({ color: colors.background });
    this.container.addChild(this.background);

    // Congratulations text
    const congratsStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: colors.accent,
      align: 'center',
      fontWeight: 'bold',
    });

    this.congratsText = new Text({
      text: 'GREAT JOB!',
      style: congratsStyle,
    });
    this.congratsText.anchor.set(0.5);
    this.congratsText.position.set(120, 50);
    this.container.addChild(this.congratsText);

    // Level completed text
    const levelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: colors.foreground,
      align: 'center',
    });

    this.levelText = new Text({
      text: 'Level 1 Complete',
      style: levelStyle,
    });
    this.levelText.anchor.set(0.5);
    this.levelText.position.set(120, 90);
    this.container.addChild(this.levelText);

    // Score display
    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: colors.foreground,
      align: 'center',
    });

    this.scoreText = new Text({
      text: 'Score: 0',
      style: textStyle,
    });
    this.scoreText.anchor.set(0.5);
    this.scoreText.position.set(120, 130);
    this.container.addChild(this.scoreText);

    // Bonus points
    this.bonusText = new Text({
      text: 'Bonus: +0',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 12,
        fill: colors.accent,
        align: 'center',
      }),
    });
    this.bonusText.anchor.set(0.5);
    this.bonusText.position.set(120, 150);
    this.container.addChild(this.bonusText);

    // Next level preview
    this.nextLevelText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 11,
        fill: colors.foreground,
        align: 'center',
      }),
    });
    this.nextLevelText.anchor.set(0.5);
    this.nextLevelText.position.set(120, 195);
    this.container.addChild(this.nextLevelText);

    // Continue button
    this.continueButton = new Graphics();
    this.continueButton.roundRect(60, 240, 120, 40, 4);
    this.continueButton.fill({ color: colors.accent });
    this.continueButton.eventMode = 'static';
    this.continueButton.cursor = 'pointer';
    this.continueButton.on('pointerdown', this.handleContinue.bind(this));
    this.container.addChild(this.continueButton);

    // Continue button text
    this.continueButtonText = new Text({
      text: 'CONTINUE',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 14,
        fill: colors.background,
        align: 'center',
        fontWeight: 'bold',
      }),
    });
    this.continueButtonText.anchor.set(0.5);
    this.continueButtonText.position.set(120, 260);
    this.container.addChild(this.continueButtonText);
  }

  /**
   * Update the display with current transition data
   */
  private updateDisplay(): void {
    if (!this.transitionData) return;

    // Update level text
    if (this.levelText) {
      this.levelText.text = `Level ${this.transitionData.completedLevel} Complete`;
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
        this.nextLevelText.text = 'You beat all levels!';
      }
    }

    // Update button text based on whether there's a next level
    if (this.continueButtonText) {
      if (hasNextLevel(this.transitionData.completedLevel)) {
        this.continueButtonText.text = 'CONTINUE';
      } else {
        this.continueButtonText.text = 'FINISH';
      }
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
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
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

    if (this.congratsText) {
      this.congratsText.style.fill = colors.accent;
    }

    if (this.levelText) {
      this.levelText.style.fill = colors.foreground;
    }

    if (this.scoreText) {
      this.scoreText.style.fill = colors.foreground;
    }

    if (this.bonusText) {
      this.bonusText.style.fill = colors.accent;
    }

    if (this.nextLevelText) {
      this.nextLevelText.style.fill = colors.foreground;
    }

    if (this.continueButton) {
      this.continueButton.clear();
      this.continueButton.roundRect(60, 240, 120, 40, 4);
      this.continueButton.fill({ color: colors.accent });
    }

    if (this.continueButtonText) {
      this.continueButtonText.style.fill = colors.background;
    }
  }

  /**
   * Reset the scene for reuse
   */
  reset(): void {
    this.transitionData = null;
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

    if (this.congratsText) {
      this.congratsText.destroy();
      this.congratsText = null;
    }

    if (this.levelText) {
      this.levelText.destroy();
      this.levelText = null;
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

    if (this.continueButton) {
      this.continueButton.destroy();
      this.continueButton = null;
    }

    if (this.continueButtonText) {
      this.continueButtonText.destroy();
      this.continueButtonText = null;
    }

    super.destroy();
  }
}
