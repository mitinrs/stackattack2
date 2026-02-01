/**
 * Game Over Scene
 * Displays final score, highest level reached, and restart options
 * Matches LCD aesthetic with pixel-art UI
 */

import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType } from '../types/game';
import type { LCDEffect } from '../systems/LCDEffect';

export interface GameOverData {
  finalScore: number;
  highestLevel: number;
  totalLinesCleared: number;
  specialBlocksCollected: number;
}

export type GameOverAction = 'playAgain' | 'mainMenu';

export class GameOverScene extends Scene {
  private lcdEffect: LCDEffect;
  private gameOverData: GameOverData | null = null;
  private isNewHighScore: boolean = false;

  // UI elements
  private background: Graphics | null = null;
  private titleText: Text | null = null;
  private newHighScoreText: Text | null = null;
  private scoreText: Text | null = null;
  private levelText: Text | null = null;
  private statsText: Text | null = null;
  private playAgainButton: Container | null = null;
  private mainMenuButton: Container | null = null;
  private selectedIndex: number = 0;
  private buttons: Container[] = [];

  // Callbacks
  private onAction: ((action: GameOverAction) => void) | null = null;
  private onPlayAgainCallback: (() => void) | null = null;
  private onMainMenuCallback: (() => void) | null = null;

  constructor(lcdEffect: LCDEffect) {
    super(SceneType.GameOver);
    this.lcdEffect = lcdEffect;
  }

  /**
   * Set the game over data to display
   */
  setGameOverData(data: GameOverData): void {
    this.gameOverData = data;
    this.updateDisplay();
  }

  /**
   * Set final score (convenience method)
   */
  setFinalScore(score: number): void {
    if (!this.gameOverData) {
      this.gameOverData = {
        finalScore: score,
        highestLevel: 1,
        totalLinesCleared: 0,
        specialBlocksCollected: 0,
      };
    } else {
      this.gameOverData.finalScore = score;
    }
    this.updateDisplay();
  }

  /**
   * Set highest level (convenience method)
   */
  setHighestLevel(level: number): void {
    if (!this.gameOverData) {
      this.gameOverData = {
        finalScore: 0,
        highestLevel: level,
        totalLinesCleared: 0,
        specialBlocksCollected: 0,
      };
    } else {
      this.gameOverData.highestLevel = level;
    }
    this.updateDisplay();
  }

  /**
   * Set the callback for when an action is selected
   */
  setOnAction(callback: (action: GameOverAction) => void): void {
    this.onAction = callback;
  }

  /**
   * Set callback for play again action (convenience method)
   */
  setOnPlayAgain(callback: () => void): void {
    this.onPlayAgainCallback = callback;
  }

  /**
   * Set callback for main menu action (convenience method)
   */
  setOnMainMenu(callback: () => void): void {
    this.onMainMenuCallback = callback;
  }

  /**
   * Set whether this is a new high score
   */
  setIsNewHighScore(isNew: boolean): void {
    this.isNewHighScore = isNew;
    this.updateNewHighScoreDisplay();
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

    // Create text styles
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 20,
      fill: colors.accent,
      align: 'center',
      fontWeight: 'bold',
    });

    const scoreStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 16,
      fill: colors.foreground,
      align: 'center',
    });

    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: colors.foreground,
      align: 'center',
    });

    const statsStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: colors.foreground,
      align: 'center',
    });

    // Game Over title
    this.titleText = new Text({
      text: 'GAME OVER',
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.position.set(120, 50);
    this.container.addChild(this.titleText);

    // New High Score indicator (hidden by default)
    this.newHighScoreText = new Text({
      text: 'NEW HIGH SCORE!',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 12,
        fill: colors.accent,
        align: 'center',
        fontWeight: 'bold',
      }),
    });
    this.newHighScoreText.anchor.set(0.5);
    this.newHighScoreText.position.set(120, 75);
    this.newHighScoreText.visible = false;
    this.container.addChild(this.newHighScoreText);

    // Final score
    this.scoreText = new Text({
      text: 'Final Score: 0',
      style: scoreStyle,
    });
    this.scoreText.anchor.set(0.5);
    this.scoreText.position.set(120, 100);
    this.container.addChild(this.scoreText);

    // Highest level
    this.levelText = new Text({
      text: 'Level Reached: 1',
      style: textStyle,
    });
    this.levelText.anchor.set(0.5);
    this.levelText.position.set(120, 130);
    this.container.addChild(this.levelText);

    // Session stats
    this.statsText = new Text({
      text: '',
      style: statsStyle,
    });
    this.statsText.anchor.set(0.5);
    this.statsText.position.set(120, 165);
    this.container.addChild(this.statsText);

    // Create buttons
    this.playAgainButton = this.createButton('PLAY AGAIN', 120, 220, colors, () => {
      this.handleAction('playAgain');
    });
    this.container.addChild(this.playAgainButton);

    this.mainMenuButton = this.createButton('MAIN MENU', 120, 260, colors, () => {
      this.handleAction('mainMenu');
    });
    this.container.addChild(this.mainMenuButton);

    this.buttons = [this.playAgainButton, this.mainMenuButton];
    this.updateButtonHighlight();
  }

  /**
   * Create a pixel-art styled button
   */
  private createButton(
    text: string,
    x: number,
    y: number,
    colors: { foreground: number; background: number; accent: number },
    onClick: () => void
  ): Container {
    const buttonContainer = new Container();
    buttonContainer.position.set(x, y);

    const buttonWidth = 120;
    const buttonHeight = 24;

    // Button background
    const bg = new Graphics();
    bg.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
    bg.fill({ color: colors.background });
    bg.stroke({ color: colors.foreground, width: 2 });
    buttonContainer.addChild(bg);

    // Button text
    const buttonText = new Text({
      text: text,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: colors.foreground,
        align: 'center',
      }),
    });
    buttonText.anchor.set(0.5);
    buttonContainer.addChild(buttonText);

    // Make button interactive
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';
    buttonContainer.on('pointerdown', onClick);
    buttonContainer.on('pointerover', () => {
      const index = this.buttons.indexOf(buttonContainer);
      if (index !== -1) {
        this.selectedIndex = index;
        this.updateButtonHighlight();
      }
    });

    // Store references for highlight updates
    (buttonContainer as ButtonContainer).background = bg;
    (buttonContainer as ButtonContainer).textElement = buttonText;

    return buttonContainer;
  }

  /**
   * Update button highlight based on selection
   */
  private updateButtonHighlight(): void {
    const colors = this.lcdEffect.getPaletteColors();

    this.buttons.forEach((button, index) => {
      const buttonWithRefs = button as ButtonContainer;
      const isSelected = index === this.selectedIndex;

      if (buttonWithRefs.background) {
        buttonWithRefs.background.clear();
        buttonWithRefs.background.rect(-60, -12, 120, 24);
        buttonWithRefs.background.fill({ color: isSelected ? colors.accent : colors.background });
        buttonWithRefs.background.stroke({ color: colors.foreground, width: 2 });
      }

      if (buttonWithRefs.textElement) {
        buttonWithRefs.textElement.style.fill = isSelected ? colors.background : colors.foreground;
      }
    });
  }

  /**
   * Handle button action
   */
  private handleAction(action: GameOverAction): void {
    // Call the generic action callback
    if (this.onAction) {
      this.onAction(action);
    }

    // Call the specific action callbacks
    if (action === 'playAgain' && this.onPlayAgainCallback) {
      this.onPlayAgainCallback();
    } else if (action === 'mainMenu' && this.onMainMenuCallback) {
      this.onMainMenuCallback();
    }
  }

  /**
   * Update the display with current game over data
   */
  private updateDisplay(): void {
    if (!this.gameOverData) return;

    if (this.scoreText) {
      this.scoreText.text = `Final Score: ${this.gameOverData.finalScore}`;
    }

    if (this.levelText) {
      this.levelText.text = `Level Reached: ${this.gameOverData.highestLevel}`;
    }

    if (this.statsText) {
      this.statsText.text =
        `Lines Cleared: ${this.gameOverData.totalLinesCleared}\n` +
        `Special Blocks: ${this.gameOverData.specialBlocksCollected}`;
    }
  }

  /**
   * Update the new high score indicator visibility
   */
  private updateNewHighScoreDisplay(): void {
    if (this.newHighScoreText) {
      this.newHighScoreText.visible = this.isNewHighScore;
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyPress = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateButtonHighlight();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.buttons.length - 1, this.selectedIndex + 1);
        this.updateButtonHighlight();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.selectedIndex === 0) {
          this.handleAction('playAgain');
        } else {
          this.handleAction('mainMenu');
        }
        break;
    }
  };

  /**
   * Called when scene becomes active
   */
  override onEnter(): void {
    super.onEnter();
    this.selectedIndex = 0;
    this.updateButtonHighlight();
    this.updateDisplay();
    this.updateNewHighScoreDisplay();

    // Add keyboard listener
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
   * Update colors when palette changes
   */
  updatePalette(): void {
    const colors = this.lcdEffect.getPaletteColors();

    if (this.background) {
      this.background.clear();
      this.background.rect(0, 0, 240, 320);
      this.background.fill({ color: colors.background });
    }

    if (this.titleText) {
      this.titleText.style.fill = colors.accent;
    }

    if (this.newHighScoreText) {
      this.newHighScoreText.style.fill = colors.accent;
    }

    if (this.scoreText) {
      this.scoreText.style.fill = colors.foreground;
    }

    if (this.levelText) {
      this.levelText.style.fill = colors.foreground;
    }

    if (this.statsText) {
      this.statsText.style.fill = colors.foreground;
    }

    this.updateButtonHighlight();
  }

  /**
   * Reset the scene for reuse
   */
  reset(): void {
    this.gameOverData = null;
    this.isNewHighScore = false;
    this.selectedIndex = 0;
    this.updateButtonHighlight();
    this.updateNewHighScoreDisplay();
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

    if (this.titleText) {
      this.titleText.destroy();
      this.titleText = null;
    }

    if (this.newHighScoreText) {
      this.newHighScoreText.destroy();
      this.newHighScoreText = null;
    }

    if (this.scoreText) {
      this.scoreText.destroy();
      this.scoreText = null;
    }

    if (this.levelText) {
      this.levelText.destroy();
      this.levelText = null;
    }

    if (this.statsText) {
      this.statsText.destroy();
      this.statsText = null;
    }

    if (this.playAgainButton) {
      this.playAgainButton.destroy({ children: true });
      this.playAgainButton = null;
    }

    if (this.mainMenuButton) {
      this.mainMenuButton.destroy({ children: true });
      this.mainMenuButton = null;
    }

    this.buttons = [];
    this.onAction = null;
    this.onPlayAgainCallback = null;
    this.onMainMenuCallback = null;

    super.destroy();
  }
}

/**
 * Extended Container interface for button references
 */
interface ButtonContainer extends Container {
  background?: Graphics;
  textElement?: Text;
}
