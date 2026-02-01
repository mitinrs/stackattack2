/**
 * Main Menu Scene
 * Displays game title and four menu options: Play Game, High Scores, Character Select, Settings
 * Applies LCD aesthetic with current color palette
 */

import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType } from '../types/game';
import type { LCDEffect } from '../systems/LCDEffect';

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

  // Callbacks
  private onAction: ((action: MainMenuAction) => void) | null = null;

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
   * Create the high scores placeholder modal
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

    // Modal box
    const modalBox = new Graphics();
    const boxWidth = 180;
    const boxHeight = 120;
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
    title.position.set(120, boxY + 25);
    modal.addChild(title);

    // Coming soon message
    const message = new Text({
      text: 'Coming Soon!',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 12,
        fill: colors.foreground,
        align: 'center',
      }),
    });
    message.anchor.set(0.5);
    message.position.set(120, boxY + 55);
    modal.addChild(message);

    // Back button
    const backButton = new Container();
    backButton.position.set(120, boxY + 90);

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
    (modal as HighScoresModal).messageText = message;
    (modal as HighScoresModal).backButton = backButton;
    (modal as HighScoresModal).backBg = backBg;
    (modal as HighScoresModal).backText = backText;

    return modal;
  }

  /**
   * Show the high scores modal
   */
  private showHighScoresModal(): void {
    if (this.highScoresModal) {
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
    if (this.isModalVisible) {
      // Only escape or enter closes modal
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
      const boxWidth = 180;
      const boxHeight = 120;
      const boxX = (240 - boxWidth) / 2;
      const boxY = (320 - boxHeight) / 2;
      modal.modalBox.rect(boxX, boxY, boxWidth, boxHeight);
      modal.modalBox.fill({ color: colors.background });
      modal.modalBox.stroke({ color: colors.accent, width: 3 });
    }

    if (modal.titleText) {
      modal.titleText.style.fill = colors.accent;
    }

    if (modal.messageText) {
      modal.messageText.style.fill = colors.foreground;
    }

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
    this.isModalVisible = false;
    if (this.highScoresModal) {
      this.highScoresModal.visible = false;
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

    this.onAction = null;

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
  messageText?: Text;
  backButton?: Container;
  backBg?: Graphics;
  backText?: Text;
}
