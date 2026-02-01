/**
 * Main Menu Scene
 * Displays game title and four menu options: Play Game, High Scores, Character Select, Settings
 * Applies LCD aesthetic with current color palette
 */

import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType } from '../types/game';
import type { LCDEffect } from '../systems/LCDEffect';
import { GameStorage } from '../systems/GameStorage';

export type MainMenuAction = 'playGame' | 'highScores' | 'settings';

export class MainMenuScene extends Scene {
  private lcdEffect: LCDEffect;

  // UI elements
  private background: Graphics | null = null;
  private titleText: Text | null = null;
  private subtitleText: Text | null = null;
  private buttons: ButtonContainer[] = [];
  private selectedIndex: number = 0;

  // High scores modal
  private highScoresModal: Container | null = null;
  private isModalVisible: boolean = false;

  // Level select modal
  private levelSelectModal: Container | null = null;
  private levelButtons: ButtonContainer[] = [];
  private selectedLevelIndex: number = 0;

  // Callbacks
  private onAction: ((action: MainMenuAction) => void) | null = null;
  private onStartGame: ((startLevel: number) => void) | null = null;

  constructor(lcdEffect: LCDEffect) {
    super(SceneType.MainMenu);
    this.lcdEffect = lcdEffect;
  }

  /**
   * Set the callback for when an action is selected
   */
  setOnAction(callback: (action: MainMenuAction) => void): void {
    this.onAction = callback;
  }

  /**
   * Set the callback for starting a game with a specific level
   */
  setOnStartGame(callback: (startLevel: number) => void): void {
    this.onStartGame = callback;
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

    // Create title text style
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: colors.accent,
      align: 'center',
      fontWeight: 'bold',
      letterSpacing: 1,
    });

    const subtitleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: colors.foreground,
      align: 'center',
    });

    // Game title
    this.titleText = new Text({
      text: 'STACK ATTACK\n2 PRO',
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.position.set(120, 55);
    this.container.addChild(this.titleText);

    // Subtitle
    this.subtitleText = new Text({
      text: 'A Classic Reimagined',
      style: subtitleStyle,
    });
    this.subtitleText.anchor.set(0.5);
    this.subtitleText.position.set(120, 95);
    this.container.addChild(this.subtitleText);

    // Create menu buttons
    const buttonLabels: { text: string; action: MainMenuAction }[] = [
      { text: 'PLAY GAME', action: 'playGame' },
      { text: 'HIGH SCORES', action: 'highScores' },
      { text: 'SETTINGS', action: 'settings' },
    ];

    const startY = 140;
    const buttonSpacing = 40;

    buttonLabels.forEach((btn, index) => {
      const button = this.createButton(btn.text, 120, startY + index * buttonSpacing, colors, () =>
        this.handleAction(btn.action)
      );
      this.container.addChild(button);
      this.buttons.push(button);
    });

    // Create high scores modal (hidden by default)
    this.highScoresModal = this.createHighScoresModal(colors);
    this.highScoresModal.visible = false;
    this.container.addChild(this.highScoresModal);

    // Create level select modal (hidden by default)
    this.levelSelectModal = this.createLevelSelectModal(colors);
    this.levelSelectModal.visible = false;
    this.container.addChild(this.levelSelectModal);

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
  ): ButtonContainer {
    const buttonContainer = new Container() as ButtonContainer;
    buttonContainer.position.set(x, y);

    const buttonWidth = 160;
    const buttonHeight = 28;

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
        fontSize: 11,
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
      if (!this.isModalVisible) {
        const index = this.buttons.indexOf(buttonContainer);
        if (index !== -1) {
          this.selectedIndex = index;
          this.updateButtonHighlight();
        }
      }
    });

    // Store references for highlight updates
    buttonContainer.background = bg;
    buttonContainer.textElement = buttonText;

    return buttonContainer;
  }

  /**
   * Create the high scores modal
   */
  private createHighScoresModal(colors: {
    foreground: number;
    background: number;
    accent: number;
  }): Container {
    const modal = new Container();

    // Semi-transparent overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, 240, 320);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    overlay.eventMode = 'static';
    modal.addChild(overlay);

    // Modal box - larger to fit scores
    const modalBox = new Graphics();
    const boxWidth = 200;
    const boxHeight = 220;
    const boxX = (240 - boxWidth) / 2;
    const boxY = (320 - boxHeight) / 2;

    modalBox.rect(boxX, boxY, boxWidth, boxHeight);
    modalBox.fill({ color: colors.background });
    modalBox.stroke({ color: colors.accent, width: 3 });
    modal.addChild(modalBox);

    // Modal title
    const title = new Text({
      text: 'HIGH SCORES',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 14,
        fill: colors.accent,
        align: 'center',
        fontWeight: 'bold',
      }),
    });
    title.anchor.set(0.5);
    title.position.set(120, boxY + 20);
    modal.addChild(title);

    // Scores list container
    const scoresContainer = new Container();
    scoresContainer.position.set(boxX + 10, boxY + 40);
    modal.addChild(scoresContainer);

    // Back button
    const backButton = new Container();
    backButton.position.set(120, boxY + boxHeight - 25);

    const backBg = new Graphics();
    backBg.rect(-50, -12, 100, 24);
    backBg.fill({ color: colors.accent });
    backBg.stroke({ color: colors.foreground, width: 2 });
    backButton.addChild(backBg);

    const backText = new Text({
      text: 'BACK',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: colors.background,
        align: 'center',
      }),
    });
    backText.anchor.set(0.5);
    backButton.addChild(backText);

    backButton.eventMode = 'static';
    backButton.cursor = 'pointer';
    backButton.on('pointerdown', () => this.hideHighScoresModal());
    modal.addChild(backButton);

    // Store references for palette updates
    (modal as HighScoresModal).modalBox = modalBox;
    (modal as HighScoresModal).titleText = title;
    (modal as HighScoresModal).scoresContainer = scoresContainer;
    (modal as HighScoresModal).backButton = backButton;
    (modal as HighScoresModal).backBg = backBg;
    (modal as HighScoresModal).backText = backText;

    return modal;
  }

  /**
   * Update the scores display in the modal
   */
  private updateHighScoresDisplay(): void {
    if (!this.highScoresModal) return;

    const modal = this.highScoresModal as HighScoresModal;
    const container = modal.scoresContainer;
    if (!container) return;

    const colors = this.lcdEffect.getPaletteColors();

    // Clear existing scores
    container.removeChildren();

    const highScores = GameStorage.getHighScores();

    if (highScores.length === 0) {
      // Show "No scores yet" message
      const noScores = new Text({
        text: 'No scores yet!\nPlay a game to set\nyour first record.',
        style: new TextStyle({
          fontFamily: 'monospace',
          fontSize: 10,
          fill: colors.foreground,
          align: 'center',
        }),
      });
      noScores.anchor.set(0.5, 0);
      noScores.position.set(90, 40);
      container.addChild(noScores);
    } else {
      // Show scores list
      const scoreStyle = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 9,
        fill: colors.foreground,
        align: 'left',
      });

      // Header
      const header = new Text({
        text: '#  SCORE   LVL',
        style: new TextStyle({
          fontFamily: 'monospace',
          fontSize: 9,
          fill: colors.accent,
          align: 'left',
        }),
      });
      header.position.set(0, 0);
      container.addChild(header);

      // Score entries (max 10)
      highScores.slice(0, 10).forEach((entry, index) => {
        const rank = (index + 1).toString().padStart(2, ' ');
        const score = entry.score.toString().padStart(6, ' ');
        const level = entry.level.toString().padStart(3, ' ');

        const scoreText = new Text({
          text: `${rank} ${score}  ${level}`,
          style: scoreStyle,
        });
        scoreText.position.set(0, 15 + index * 13);
        container.addChild(scoreText);
      });
    }
  }

  /**
   * Create the level select modal
   */
  private createLevelSelectModal(colors: {
    foreground: number;
    background: number;
    accent: number;
  }): Container {
    const modal = new Container();

    // Semi-transparent overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, 240, 320);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    overlay.eventMode = 'static';
    modal.addChild(overlay);

    // Modal box
    const modalBox = new Graphics();
    const boxWidth = 180;
    const boxHeight = 180;
    const boxX = (240 - boxWidth) / 2;
    const boxY = (320 - boxHeight) / 2;

    modalBox.rect(boxX, boxY, boxWidth, boxHeight);
    modalBox.fill({ color: colors.background });
    modalBox.stroke({ color: colors.accent, width: 3 });
    modal.addChild(modalBox);

    // Modal title
    const title = new Text({
      text: 'SELECT LEVEL',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 14,
        fill: colors.accent,
        align: 'center',
        fontWeight: 'bold',
      }),
    });
    title.anchor.set(0.5);
    title.position.set(120, boxY + 25);
    modal.addChild(title);

    // Level buttons
    const levels = [1, 3, 5];
    const buttonStartY = boxY + 55;
    const buttonSpacing = 35;

    this.levelButtons = [];

    levels.forEach((level, index) => {
      const button = this.createLevelButton(
        `LEVEL ${level}`,
        120,
        buttonStartY + index * buttonSpacing,
        colors,
        () => this.startGameWithLevel(level)
      );
      modal.addChild(button);
      this.levelButtons.push(button);
    });

    // Back button
    const backButton = new Container();
    backButton.position.set(120, boxY + 160);

    const backBg = new Graphics();
    backBg.rect(-40, -10, 80, 20);
    backBg.fill({ color: colors.background });
    backBg.stroke({ color: colors.foreground, width: 1 });
    backButton.addChild(backBg);

    const backText = new Text({
      text: 'BACK',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: colors.foreground,
        align: 'center',
      }),
    });
    backText.anchor.set(0.5);
    backButton.addChild(backText);

    backButton.eventMode = 'static';
    backButton.cursor = 'pointer';
    backButton.on('pointerdown', () => this.hideLevelSelectModal());
    modal.addChild(backButton);

    // Store references for palette updates
    (modal as LevelSelectModal).modalBox = modalBox;
    (modal as LevelSelectModal).titleText = title;
    (modal as LevelSelectModal).backBg = backBg;
    (modal as LevelSelectModal).backText = backText;

    return modal;
  }

  /**
   * Create a level button for the modal
   */
  private createLevelButton(
    text: string,
    x: number,
    y: number,
    colors: { foreground: number; background: number; accent: number },
    onClick: () => void
  ): ButtonContainer {
    const buttonContainer = new Container() as ButtonContainer;
    buttonContainer.position.set(x, y);

    const buttonWidth = 120;
    const buttonHeight = 26;

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
        fontSize: 12,
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
      const index = this.levelButtons.indexOf(buttonContainer);
      if (index !== -1) {
        this.selectedLevelIndex = index;
        this.updateLevelButtonHighlight();
      }
    });

    // Store references for highlight updates
    buttonContainer.background = bg;
    buttonContainer.textElement = buttonText;

    return buttonContainer;
  }

  /**
   * Update level button highlight
   */
  private updateLevelButtonHighlight(): void {
    const colors = this.lcdEffect.getPaletteColors();

    this.levelButtons.forEach((button, index) => {
      const isSelected = index === this.selectedLevelIndex;

      if (button.background) {
        button.background.clear();
        button.background.rect(-60, -13, 120, 26);
        button.background.fill({ color: isSelected ? colors.accent : colors.background });
        button.background.stroke({ color: colors.foreground, width: 2 });
      }

      if (button.textElement) {
        button.textElement.style.fill = isSelected ? colors.background : colors.foreground;
      }
    });
  }

  /**
   * Show the level select modal
   */
  private showLevelSelectModal(): void {
    if (this.levelSelectModal) {
      this.levelSelectModal.visible = true;
      this.isModalVisible = true;
      this.selectedLevelIndex = 0;
      this.updateLevelButtonHighlight();
    }
  }

  /**
   * Hide the level select modal
   */
  private hideLevelSelectModal(): void {
    if (this.levelSelectModal) {
      this.levelSelectModal.visible = false;
      this.isModalVisible = false;
    }
  }

  /**
   * Start game with selected level
   */
  private startGameWithLevel(level: number): void {
    this.hideLevelSelectModal();
    if (this.onStartGame) {
      this.onStartGame(level);
    }
  }

  /**
   * Show the high scores modal
   */
  private showHighScoresModal(): void {
    if (this.highScoresModal) {
      this.updateHighScoresDisplay();
      this.highScoresModal.visible = true;
      this.isModalVisible = true;
    }
  }

  /**
   * Hide the high scores modal
   */
  private hideHighScoresModal(): void {
    if (this.highScoresModal) {
      this.highScoresModal.visible = false;
      this.isModalVisible = false;
    }
  }

  /**
   * Update button highlight based on selection
   */
  private updateButtonHighlight(): void {
    const colors = this.lcdEffect.getPaletteColors();

    this.buttons.forEach((button, index) => {
      const isSelected = index === this.selectedIndex;

      if (button.background) {
        button.background.clear();
        button.background.rect(-80, -14, 160, 28);
        button.background.fill({ color: isSelected ? colors.accent : colors.background });
        button.background.stroke({ color: colors.foreground, width: 2 });
      }

      if (button.textElement) {
        button.textElement.style.fill = isSelected ? colors.background : colors.foreground;
      }
    });
  }

  /**
   * Handle button action
   */
  private handleAction(action: MainMenuAction): void {
    if (this.isModalVisible) {
      return;
    }

    if (action === 'playGame') {
      this.showLevelSelectModal();
      return;
    }

    if (action === 'highScores') {
      this.showHighScoresModal();
      return;
    }

    if (this.onAction) {
      this.onAction(action);
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyPress = (event: KeyboardEvent): void => {
    // Handle level select modal navigation
    if (this.isModalVisible && this.levelSelectModal?.visible) {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          this.hideLevelSelectModal();
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.selectedLevelIndex = Math.max(0, this.selectedLevelIndex - 1);
          this.updateLevelButtonHighlight();
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.selectedLevelIndex = Math.min(this.levelButtons.length - 1, this.selectedLevelIndex + 1);
          this.updateLevelButtonHighlight();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          const levels = [1, 3, 5];
          this.startGameWithLevel(levels[this.selectedLevelIndex]);
          break;
      }
      return;
    }

    // Handle high scores modal
    if (this.isModalVisible) {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.hideHighScoresModal();
      }
      return;
    }

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
        this.activateSelectedButton();
        break;
    }
  };

  /**
   * Activate the currently selected button
   */
  private activateSelectedButton(): void {
    const actions: MainMenuAction[] = ['playGame', 'highScores', 'settings'];
    this.handleAction(actions[this.selectedIndex]);
  }

  /**
   * Called when scene becomes active
   */
  override onEnter(): void {
    super.onEnter();
    this.selectedIndex = 0;
    this.isModalVisible = false;
    if (this.highScoresModal) {
      this.highScoresModal.visible = false;
    }
    this.updateButtonHighlight();

    // Add keyboard listener
    window.addEventListener('keydown', this.handleKeyPress);
  }

  /**
   * Called when scene becomes inactive
   */
  override onExit(): void {
    super.onExit();
    window.removeEventListener('keydown', this.handleKeyPress);
    this.hideHighScoresModal();
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

    if (this.subtitleText) {
      this.subtitleText.style.fill = colors.foreground;
    }

    this.updateButtonHighlight();
    this.updateHighScoresModalPalette(colors);
    this.updateLevelSelectModalPalette(colors);
  }

  /**
   * Update level select modal palette
   */
  private updateLevelSelectModalPalette(colors: {
    foreground: number;
    background: number;
    accent: number;
  }): void {
    if (!this.levelSelectModal) return;

    const modal = this.levelSelectModal as LevelSelectModal;

    if (modal.modalBox) {
      modal.modalBox.clear();
      const boxWidth = 180;
      const boxHeight = 180;
      const boxX = (240 - boxWidth) / 2;
      const boxY = (320 - boxHeight) / 2;
      modal.modalBox.rect(boxX, boxY, boxWidth, boxHeight);
      modal.modalBox.fill({ color: colors.background });
      modal.modalBox.stroke({ color: colors.accent, width: 3 });
    }

    if (modal.titleText) {
      modal.titleText.style.fill = colors.accent;
    }

    if (modal.backBg) {
      modal.backBg.clear();
      modal.backBg.rect(-40, -10, 80, 20);
      modal.backBg.fill({ color: colors.background });
      modal.backBg.stroke({ color: colors.foreground, width: 1 });
    }

    if (modal.backText) {
      modal.backText.style.fill = colors.foreground;
    }

    // Update level buttons
    this.updateLevelButtonHighlight();
  }

  /**
   * Update high scores modal palette
   */
  private updateHighScoresModalPalette(colors: {
    foreground: number;
    background: number;
    accent: number;
  }): void {
    if (!this.highScoresModal) return;

    const modal = this.highScoresModal as HighScoresModal;

    if (modal.modalBox) {
      modal.modalBox.clear();
      const boxWidth = 200;
      const boxHeight = 220;
      const boxX = (240 - boxWidth) / 2;
      const boxY = (320 - boxHeight) / 2;
      modal.modalBox.rect(boxX, boxY, boxWidth, boxHeight);
      modal.modalBox.fill({ color: colors.background });
      modal.modalBox.stroke({ color: colors.accent, width: 3 });
    }

    if (modal.titleText) {
      modal.titleText.style.fill = colors.accent;
    }

    // Refresh scores display with new colors
    this.updateHighScoresDisplay();

    if (modal.backBg) {
      modal.backBg.clear();
      modal.backBg.rect(-50, -12, 100, 24);
      modal.backBg.fill({ color: colors.accent });
      modal.backBg.stroke({ color: colors.foreground, width: 2 });
    }

    if (modal.backText) {
      modal.backText.style.fill = colors.background;
    }
  }

  /**
   * Reset the scene for reuse
   */
  reset(): void {
    this.selectedIndex = 0;
    this.selectedLevelIndex = 0;
    this.isModalVisible = false;
    if (this.highScoresModal) {
      this.highScoresModal.visible = false;
    }
    if (this.levelSelectModal) {
      this.levelSelectModal.visible = false;
    }
    this.updateButtonHighlight();
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

    if (this.subtitleText) {
      this.subtitleText.destroy();
      this.subtitleText = null;
    }

    this.buttons.forEach((button) => {
      button.destroy({ children: true });
    });
    this.buttons = [];

    if (this.highScoresModal) {
      this.highScoresModal.destroy({ children: true });
      this.highScoresModal = null;
    }

    if (this.levelSelectModal) {
      this.levelSelectModal.destroy({ children: true });
      this.levelSelectModal = null;
    }

    this.levelButtons = [];
    this.onAction = null;
    this.onStartGame = null;

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

/**
 * Extended Container interface for high scores modal
 */
interface HighScoresModal extends Container {
  modalBox?: Graphics;
  titleText?: Text;
  scoresContainer?: Container;
  backButton?: Container;
  backBg?: Graphics;
  backText?: Text;
}

/**
 * Extended Container interface for level select modal
 */
interface LevelSelectModal extends Container {
  modalBox?: Graphics;
  titleText?: Text;
  backBg?: Graphics;
  backText?: Text;
}
