/**
 * Settings Scene
 * Allows users to toggle between Blue and Amber LCD palettes
 * Provides visual preview of palette selection
 */

import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType } from '../types/game';
import { LCDEffect, ColorPalette } from '../systems/LCDEffect';

export class SettingsScene extends Scene {
  private lcdEffect: LCDEffect;

  // UI elements
  private background: Graphics | null = null;
  private titleText: Text | null = null;
  private paletteLabel: Text | null = null;
  private blueOption: ToggleOption | null = null;
  private amberOption: ToggleOption | null = null;
  private previewBox: Graphics | null = null;
  private previewCharacter: Graphics | null = null;
  private previewCrate: Graphics | null = null;
  private backButton: ButtonContainer | null = null;

  private selectedOptionIndex: number = 0; // 0 = blue, 1 = amber, 2 = back

  // Callbacks
  private onBack: (() => void) | null = null;

  constructor(lcdEffect: LCDEffect) {
    super(SceneType.Settings);
    this.lcdEffect = lcdEffect;
  }

  /**
   * Set the callback for when back is pressed
   */
  setOnBack(callback: () => void): void {
    this.onBack = callback;
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

    // Title
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: colors.accent,
      align: 'center',
      fontWeight: 'bold',
    });

    this.titleText = new Text({
      text: 'SETTINGS',
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.position.set(120, 40);
    this.container.addChild(this.titleText);

    // Palette section label
    const labelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: colors.foreground,
      align: 'center',
    });

    this.paletteLabel = new Text({
      text: 'LCD PALETTE',
      style: labelStyle,
    });
    this.paletteLabel.anchor.set(0.5);
    this.paletteLabel.position.set(120, 80);
    this.container.addChild(this.paletteLabel);

    // Create palette toggle options
    const isBlueSelected = this.lcdEffect.getCurrentPalette() === ColorPalette.Blue;

    this.blueOption = this.createToggleOption('BLUE', 120, 115, isBlueSelected, colors, () => {
      this.selectPalette(ColorPalette.Blue);
    });
    this.container.addChild(this.blueOption);

    this.amberOption = this.createToggleOption('AMBER', 120, 155, !isBlueSelected, colors, () => {
      this.selectPalette(ColorPalette.Amber);
    });
    this.container.addChild(this.amberOption);

    // Create preview box
    this.createPreviewBox(colors);

    // Create back button
    this.backButton = this.createBackButton(120, 285, colors, () => {
      if (this.onBack) {
        this.onBack();
      }
    });
    this.container.addChild(this.backButton);

    // Set initial selection based on current palette
    this.selectedOptionIndex = isBlueSelected ? 0 : 1;
    this.updateSelectionHighlight();
  }

  /**
   * Create a toggle option (radio button style)
   */
  private createToggleOption(
    text: string,
    x: number,
    y: number,
    isSelected: boolean,
    colors: { foreground: number; background: number; accent: number },
    onClick: () => void
  ): ToggleOption {
    const optionContainer = new Container() as ToggleOption;
    optionContainer.position.set(x, y);

    // Radio circle background
    const radioBg = new Graphics();
    radioBg.circle(-60, 0, 10);
    radioBg.fill({ color: colors.background });
    radioBg.stroke({ color: colors.foreground, width: 2 });
    optionContainer.addChild(radioBg);

    // Radio circle fill (selected indicator)
    const radioFill = new Graphics();
    radioFill.circle(-60, 0, 5);
    radioFill.fill({ color: isSelected ? colors.accent : colors.background });
    optionContainer.addChild(radioFill);

    // Option text
    const optionText = new Text({
      text: text,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 12,
        fill: colors.foreground,
        align: 'left',
      }),
    });
    optionText.anchor.set(0, 0.5);
    optionText.position.set(-40, 0);
    optionContainer.addChild(optionText);

    // Make interactive
    optionContainer.eventMode = 'static';
    optionContainer.cursor = 'pointer';
    optionContainer.hitArea = {
      contains: (px: number, py: number) => px >= -80 && px <= 80 && py >= -15 && py <= 15,
    };
    optionContainer.on('pointerdown', onClick);

    // Store references
    optionContainer.radioBg = radioBg;
    optionContainer.radioFill = radioFill;
    optionContainer.textElement = optionText;
    optionContainer.isSelected = isSelected;

    return optionContainer;
  }

  /**
   * Create a preview box showing palette colors
   */
  private createPreviewBox(colors: {
    foreground: number;
    background: number;
    accent: number;
    glow: number;
  }): void {
    // Preview container
    const previewContainer = new Container();
    previewContainer.position.set(120, 220);

    // Preview box background
    this.previewBox = new Graphics();
    this.previewBox.rect(-80, -35, 160, 70);
    this.previewBox.fill({ color: colors.background });
    this.previewBox.stroke({ color: colors.foreground, width: 2 });
    previewContainer.addChild(this.previewBox);

    // Preview label
    const previewLabel = new Text({
      text: 'PREVIEW',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 8,
        fill: colors.foreground,
        align: 'center',
      }),
    });
    previewLabel.anchor.set(0.5);
    previewLabel.position.set(0, -28);
    previewContainer.addChild(previewLabel);

    // Preview character (simple pixel art representation)
    this.previewCharacter = new Graphics();
    this.drawPreviewCharacter(colors.foreground);
    previewContainer.addChild(this.previewCharacter);

    // Preview crate
    this.previewCrate = new Graphics();
    this.drawPreviewCrate(colors.foreground);
    previewContainer.addChild(this.previewCrate);

    this.container.addChild(previewContainer);
  }

  /**
   * Draw a simple character preview
   */
  private drawPreviewCharacter(color: number): void {
    if (!this.previewCharacter) return;

    this.previewCharacter.clear();
    this.previewCharacter.position.set(-40, 0);

    // Simple pixel character shape
    // Head
    this.previewCharacter.rect(-4, -12, 8, 8);
    this.previewCharacter.fill({ color });

    // Body
    this.previewCharacter.rect(-6, -4, 12, 12);
    this.previewCharacter.fill({ color });

    // Legs
    this.previewCharacter.rect(-6, 8, 4, 8);
    this.previewCharacter.fill({ color });
    this.previewCharacter.rect(2, 8, 4, 8);
    this.previewCharacter.fill({ color });
  }

  /**
   * Draw a simple crate preview
   */
  private drawPreviewCrate(color: number): void {
    if (!this.previewCrate) return;

    this.previewCrate.clear();
    this.previewCrate.position.set(40, 0);

    // Crate rectangle
    this.previewCrate.rect(-12, -8, 24, 16);
    this.previewCrate.fill({ color });

    // Cross pattern on crate (darker)
    this.previewCrate.rect(-10, -1, 20, 2);
    this.previewCrate.fill({ color: 0x000000, alpha: 0.3 });
    this.previewCrate.rect(-1, -6, 2, 12);
    this.previewCrate.fill({ color: 0x000000, alpha: 0.3 });
  }

  /**
   * Create back button
   */
  private createBackButton(
    x: number,
    y: number,
    colors: { foreground: number; background: number; accent: number },
    onClick: () => void
  ): ButtonContainer {
    const buttonContainer = new Container() as ButtonContainer;
    buttonContainer.position.set(x, y);

    const buttonWidth = 100;
    const buttonHeight = 24;

    // Button background
    const bg = new Graphics();
    bg.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
    bg.fill({ color: colors.background });
    bg.stroke({ color: colors.foreground, width: 2 });
    buttonContainer.addChild(bg);

    // Button text
    const buttonText = new Text({
      text: 'BACK',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 11,
        fill: colors.foreground,
        align: 'center',
      }),
    });
    buttonText.anchor.set(0.5);
    buttonContainer.addChild(buttonText);

    // Make interactive
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';
    buttonContainer.on('pointerdown', onClick);
    buttonContainer.on('pointerover', () => {
      this.selectedOptionIndex = 2;
      this.updateSelectionHighlight();
    });

    buttonContainer.background = bg;
    buttonContainer.textElement = buttonText;

    return buttonContainer;
  }

  /**
   * Select a palette and apply immediately
   */
  private selectPalette(palette: ColorPalette): void {
    this.lcdEffect.setPalette(palette);
    this.selectedOptionIndex = palette === ColorPalette.Blue ? 0 : 1;
    this.updateToggleStates();
    this.updatePalette();
  }

  /**
   * Update toggle states based on current palette
   */
  private updateToggleStates(): void {
    const isBlue = this.lcdEffect.getCurrentPalette() === ColorPalette.Blue;
    const colors = this.lcdEffect.getPaletteColors();

    if (this.blueOption) {
      this.blueOption.isSelected = isBlue;
      if (this.blueOption.radioFill) {
        this.blueOption.radioFill.clear();
        this.blueOption.radioFill.circle(-60, 0, 5);
        this.blueOption.radioFill.fill({ color: isBlue ? colors.accent : colors.background });
      }
    }

    if (this.amberOption) {
      this.amberOption.isSelected = !isBlue;
      if (this.amberOption.radioFill) {
        this.amberOption.radioFill.clear();
        this.amberOption.radioFill.circle(-60, 0, 5);
        this.amberOption.radioFill.fill({ color: !isBlue ? colors.accent : colors.background });
      }
    }
  }

  /**
   * Update selection highlight for keyboard navigation
   */
  private updateSelectionHighlight(): void {
    const colors = this.lcdEffect.getPaletteColors();

    // Update blue option highlight
    if (this.blueOption && this.blueOption.radioBg) {
      this.blueOption.radioBg.clear();
      this.blueOption.radioBg.circle(-60, 0, 10);
      this.blueOption.radioBg.fill({ color: colors.background });
      this.blueOption.radioBg.stroke({
        color: this.selectedOptionIndex === 0 ? colors.accent : colors.foreground,
        width: this.selectedOptionIndex === 0 ? 3 : 2,
      });
    }

    // Update amber option highlight
    if (this.amberOption && this.amberOption.radioBg) {
      this.amberOption.radioBg.clear();
      this.amberOption.radioBg.circle(-60, 0, 10);
      this.amberOption.radioBg.fill({ color: colors.background });
      this.amberOption.radioBg.stroke({
        color: this.selectedOptionIndex === 1 ? colors.accent : colors.foreground,
        width: this.selectedOptionIndex === 1 ? 3 : 2,
      });
    }

    // Update back button highlight
    if (this.backButton && this.backButton.background) {
      const isSelected = this.selectedOptionIndex === 2;
      this.backButton.background.clear();
      this.backButton.background.rect(-50, -12, 100, 24);
      this.backButton.background.fill({ color: isSelected ? colors.accent : colors.background });
      this.backButton.background.stroke({ color: colors.foreground, width: 2 });

      if (this.backButton.textElement) {
        this.backButton.textElement.style.fill = isSelected ? colors.background : colors.foreground;
      }
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyPress = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.selectedOptionIndex = Math.max(0, this.selectedOptionIndex - 1);
        this.updateSelectionHighlight();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.selectedOptionIndex = Math.min(2, this.selectedOptionIndex + 1);
        this.updateSelectionHighlight();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateSelection();
        break;
      case 'Escape':
        event.preventDefault();
        if (this.onBack) {
          this.onBack();
        }
        break;
    }
  };

  /**
   * Activate the currently selected option
   */
  private activateSelection(): void {
    switch (this.selectedOptionIndex) {
      case 0:
        this.selectPalette(ColorPalette.Blue);
        break;
      case 1:
        this.selectPalette(ColorPalette.Amber);
        break;
      case 2:
        if (this.onBack) {
          this.onBack();
        }
        break;
    }
  }

  /**
   * Called when scene becomes active
   */
  override onEnter(): void {
    super.onEnter();

    // Set initial selection based on current palette
    const isBlue = this.lcdEffect.getCurrentPalette() === ColorPalette.Blue;
    this.selectedOptionIndex = isBlue ? 0 : 1;
    this.updateToggleStates();
    this.updateSelectionHighlight();

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

    if (this.paletteLabel) {
      this.paletteLabel.style.fill = colors.foreground;
    }

    // Update toggle options
    if (this.blueOption) {
      if (this.blueOption.radioBg) {
        this.blueOption.radioBg.clear();
        this.blueOption.radioBg.circle(-60, 0, 10);
        this.blueOption.radioBg.fill({ color: colors.background });
        this.blueOption.radioBg.stroke({ color: colors.foreground, width: 2 });
      }
      if (this.blueOption.textElement) {
        this.blueOption.textElement.style.fill = colors.foreground;
      }
    }

    if (this.amberOption) {
      if (this.amberOption.radioBg) {
        this.amberOption.radioBg.clear();
        this.amberOption.radioBg.circle(-60, 0, 10);
        this.amberOption.radioBg.fill({ color: colors.background });
        this.amberOption.radioBg.stroke({ color: colors.foreground, width: 2 });
      }
      if (this.amberOption.textElement) {
        this.amberOption.textElement.style.fill = colors.foreground;
      }
    }

    this.updateToggleStates();

    // Update preview box
    if (this.previewBox) {
      this.previewBox.clear();
      this.previewBox.rect(-80, -35, 160, 70);
      this.previewBox.fill({ color: colors.background });
      this.previewBox.stroke({ color: colors.foreground, width: 2 });
    }

    // Update preview elements
    this.drawPreviewCharacter(colors.foreground);
    this.drawPreviewCrate(colors.foreground);

    this.updateSelectionHighlight();
  }

  /**
   * Reset the scene
   */
  reset(): void {
    const isBlue = this.lcdEffect.getCurrentPalette() === ColorPalette.Blue;
    this.selectedOptionIndex = isBlue ? 0 : 1;
    this.updateToggleStates();
    this.updateSelectionHighlight();
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

    if (this.paletteLabel) {
      this.paletteLabel.destroy();
      this.paletteLabel = null;
    }

    if (this.blueOption) {
      this.blueOption.destroy({ children: true });
      this.blueOption = null;
    }

    if (this.amberOption) {
      this.amberOption.destroy({ children: true });
      this.amberOption = null;
    }

    if (this.previewBox) {
      this.previewBox.destroy();
      this.previewBox = null;
    }

    if (this.previewCharacter) {
      this.previewCharacter.destroy();
      this.previewCharacter = null;
    }

    if (this.previewCrate) {
      this.previewCrate.destroy();
      this.previewCrate = null;
    }

    if (this.backButton) {
      this.backButton.destroy({ children: true });
      this.backButton = null;
    }

    this.onBack = null;

    super.destroy();
  }
}

/**
 * Extended Container interface for toggle option
 */
interface ToggleOption extends Container {
  radioBg?: Graphics;
  radioFill?: Graphics;
  textElement?: Text;
  isSelected?: boolean;
}

/**
 * Extended Container interface for button references
 */
interface ButtonContainer extends Container {
  background?: Graphics;
  textElement?: Text;
}
