/**
 * Character Selection Scene
 * Displays all 6 characters in a grid layout (2 columns x 3 rows)
 * Shows locked/unlocked status, character attributes, and allows selection
 */

import { Graphics, Text, TextStyle, Container, RenderTexture } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType } from '../types/game';
import type { LCDEffect } from '../systems/LCDEffect';
import { CHARACTERS, getCharacterById, getAttributeDescription } from '../config/characters';
import type { CharacterConfig } from '../types/config';

// Grid layout constants
const GRID_COLUMNS = 2;
const GRID_START_X = 30;
const GRID_START_Y = 55;
const CELL_WIDTH = 90;
const CELL_HEIGHT = 65;

export class CharacterSelectScene extends Scene {
  private lcdEffect: LCDEffect;

  // UI elements
  private background: Graphics | null = null;
  private titleText: Text | null = null;
  private characterCards: CharacterCard[] = [];
  private selectedIndex: number = 0;
  private backButton: ButtonContainer | null = null;

  // Attribute display panel
  private attributePanel: Container | null = null;
  private attributePanelBg: Graphics | null = null;
  private attributeNameText: Text | null = null;
  private speedBar: AttributeBar | null = null;
  private jumpBar: AttributeBar | null = null;
  private strengthBar: AttributeBar | null = null;

  // State
  private unlockedCharacterIds: number[] = [];
  private selectedCharacterId: number = 1;

  // Callbacks
  private onBack: (() => void) | null = null;
  private onCharacterSelected: ((characterId: number) => void) | null = null;

  // Asset loader reference (optional - for sprites)
  // @ts-expect-error Stored for future use when using sprite textures instead of programmatic drawing
  private characterSpriteGetter: ((charId: number) => RenderTexture | null) | null = null;

  constructor(lcdEffect: LCDEffect) {
    super(SceneType.CharacterSelect);
    this.lcdEffect = lcdEffect;
  }

  /**
   * Set the callback for when back is pressed
   */
  setOnBack(callback: () => void): void {
    this.onBack = callback;
  }

  /**
   * Set the callback for when a character is selected
   */
  setOnCharacterSelected(callback: (characterId: number) => void): void {
    this.onCharacterSelected = callback;
  }

  /**
   * Set the function to get character sprites
   */
  setCharacterSpriteGetter(getter: (charId: number) => RenderTexture | null): void {
    this.characterSpriteGetter = getter;
  }

  /**
   * Set unlocked character IDs
   */
  setUnlockedCharacterIds(ids: number[]): void {
    this.unlockedCharacterIds = [...ids];
    this.updateCardStates();
  }

  /**
   * Set currently selected character ID
   */
  setSelectedCharacterId(id: number): void {
    this.selectedCharacterId = id;
    // Find index in characters array
    const index = CHARACTERS.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.selectedIndex = index;
    }
    this.updateSelection();
  }

  /**
   * Get the currently selected character ID
   */
  getSelectedCharacterId(): number {
    return this.selectedCharacterId;
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
      fontSize: 14,
      fill: colors.foreground,
      align: 'center',
      fontWeight: 'bold',
    });

    this.titleText = new Text({
      text: 'SELECT CHARACTER',
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.position.set(120, 25);
    this.container.addChild(this.titleText);

    // Create character grid
    this.createCharacterGrid(colors);

    // Create attribute panel
    this.createAttributePanel(colors);

    // Create back button
    this.backButton = this.createBackButton(120, 300, colors, () => {
      if (this.onBack) {
        this.onBack();
      }
    });
    this.container.addChild(this.backButton);

    // Set initial selection
    this.updateSelection();
    this.updateAttributeDisplay();
  }

  /**
   * Create the character selection grid
   */
  private createCharacterGrid(colors: {
    foreground: number;
    background: number;
    accent: number;
  }): void {
    CHARACTERS.forEach((char, index) => {
      const col = index % GRID_COLUMNS;
      const row = Math.floor(index / GRID_COLUMNS);

      const x = GRID_START_X + col * CELL_WIDTH + CELL_WIDTH / 2;
      const y = GRID_START_Y + row * CELL_HEIGHT + CELL_HEIGHT / 2;

      const card = this.createCharacterCard(char, x, y, colors);
      this.container.addChild(card);
      this.characterCards.push(card);
    });
  }

  /**
   * Create a character card
   */
  private createCharacterCard(
    char: CharacterConfig,
    x: number,
    y: number,
    colors: { foreground: number; background: number; accent: number }
  ): CharacterCard {
    const card = new Container() as CharacterCard;
    card.position.set(x, y);
    card.characterId = char.id;
    card.isLocked = !char.initiallyUnlocked;

    const cardWidth = 80;
    const cardHeight = 55;

    // Card background
    const bg = new Graphics();
    bg.rect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
    bg.fill({ color: colors.background });
    bg.stroke({ color: colors.foreground, width: 2 });
    card.addChild(bg);
    card.background = bg;

    // Character sprite preview (placeholder - simple shape)
    const spritePreview = new Graphics();
    this.drawCharacterPreview(spritePreview, char.id, colors.foreground);
    spritePreview.position.set(0, -10);
    card.addChild(spritePreview);
    card.spritePreview = spritePreview;

    // Character name
    const nameText = new Text({
      text: char.name.toUpperCase(),
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 8,
        fill: colors.foreground,
        align: 'center',
      }),
    });
    nameText.anchor.set(0.5);
    nameText.position.set(0, 18);
    card.addChild(nameText);
    card.nameText = nameText;

    // Lock icon overlay (for locked characters)
    const lockOverlay = new Container();
    lockOverlay.visible = !char.initiallyUnlocked;

    // Semi-transparent overlay
    const lockBg = new Graphics();
    lockBg.rect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
    lockBg.fill({ color: 0x000000, alpha: 0.5 });
    lockOverlay.addChild(lockBg);

    // Lock icon
    const lockIcon = new Graphics();
    this.drawLockIcon(lockIcon, colors.foreground);
    lockIcon.position.set(0, -5);
    lockOverlay.addChild(lockIcon);

    card.addChild(lockOverlay);
    card.lockOverlay = lockOverlay;
    card.lockIcon = lockIcon;

    // Make interactive
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.on('pointerdown', () => this.handleCardClick(char.id));
    card.on('pointerover', () => {
      const index = this.characterCards.indexOf(card);
      if (index !== -1) {
        this.selectedIndex = index;
        this.updateSelection();
        this.updateAttributeDisplay();
      }
    });

    return card;
  }

  /**
   * Draw a simple character preview shape
   */
  private drawCharacterPreview(graphics: Graphics, charId: number, color: number): void {
    graphics.clear();

    // Different shapes for different characters
    switch (charId) {
      case 1: // Rookie - balanced
        graphics.rect(-6, -8, 12, 12);
        graphics.fill({ color });
        graphics.rect(-5, 4, 4, 6);
        graphics.fill({ color });
        graphics.rect(1, 4, 4, 6);
        graphics.fill({ color });
        break;
      case 2: // Speedster - lean
        graphics.rect(-5, -8, 10, 10);
        graphics.fill({ color });
        graphics.rect(-4, 2, 3, 8);
        graphics.fill({ color });
        graphics.rect(1, 2, 3, 8);
        graphics.fill({ color });
        break;
      case 3: // Jumper - tall
        graphics.rect(-4, -10, 8, 8);
        graphics.fill({ color });
        graphics.rect(-4, -2, 8, 8);
        graphics.fill({ color });
        graphics.rect(-3, 6, 3, 5);
        graphics.fill({ color });
        graphics.rect(0, 6, 3, 5);
        graphics.fill({ color });
        break;
      case 4: // Brute - wide
        graphics.rect(-8, -6, 16, 10);
        graphics.fill({ color });
        graphics.rect(-6, 4, 5, 6);
        graphics.fill({ color });
        graphics.rect(1, 4, 5, 6);
        graphics.fill({ color });
        break;
      case 5: // Agile - compact
        graphics.rect(-5, -7, 10, 9);
        graphics.fill({ color });
        graphics.rect(-5, 2, 4, 7);
        graphics.fill({ color });
        graphics.rect(1, 2, 4, 7);
        graphics.fill({ color });
        break;
      case 6: // Tank - heavy
        graphics.rect(-8, -8, 16, 14);
        graphics.fill({ color });
        graphics.rect(-7, 6, 6, 6);
        graphics.fill({ color });
        graphics.rect(1, 6, 6, 6);
        graphics.fill({ color });
        break;
      default:
        graphics.rect(-6, -8, 12, 16);
        graphics.fill({ color });
    }
  }

  /**
   * Draw lock icon
   */
  private drawLockIcon(graphics: Graphics, color: number): void {
    graphics.clear();
    // Lock shackle (top arc)
    graphics.rect(-4, -8, 2, 6);
    graphics.fill({ color });
    graphics.rect(2, -8, 2, 6);
    graphics.fill({ color });
    graphics.rect(-4, -8, 10, 2);
    graphics.fill({ color });
    // Lock body
    graphics.rect(-6, -2, 12, 10);
    graphics.fill({ color });
    // Keyhole (darker)
    graphics.circle(0, 2, 2);
    graphics.fill({ color: 0x000000, alpha: 0.5 });
  }

  /**
   * Create the attribute display panel
   */
  private createAttributePanel(colors: {
    foreground: number;
    background: number;
    accent: number;
  }): void {
    this.attributePanel = new Container();
    this.attributePanel.position.set(120, 250);
    this.container.addChild(this.attributePanel);

    // Panel background
    this.attributePanelBg = new Graphics();
    this.attributePanelBg.rect(-100, -25, 200, 50);
    this.attributePanelBg.fill({ color: colors.background });
    this.attributePanelBg.stroke({ color: colors.foreground, width: 1 });
    this.attributePanel.addChild(this.attributePanelBg);

    // Character name in panel
    this.attributeNameText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 9,
        fill: colors.foreground,
        align: 'center',
        fontWeight: 'bold',
      }),
    });
    this.attributeNameText.anchor.set(0.5);
    this.attributeNameText.position.set(0, -18);
    this.attributePanel.addChild(this.attributeNameText);

    // Attribute bars
    this.speedBar = this.createAttributeBar('SPD', -90, -5, colors);
    this.attributePanel.addChild(this.speedBar);

    this.jumpBar = this.createAttributeBar('JMP', -90, 8, colors);
    this.attributePanel.addChild(this.jumpBar);

    this.strengthBar = this.createAttributeBar('STR', -90, 21, colors);
    this.attributePanel.addChild(this.strengthBar);
  }

  /**
   * Create an attribute bar
   */
  private createAttributeBar(
    label: string,
    x: number,
    y: number,
    colors: { foreground: number; background: number; accent: number }
  ): AttributeBar {
    const bar = new Container() as AttributeBar;
    bar.position.set(x, y);

    // Label
    const labelText = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 7,
        fill: colors.foreground,
        align: 'left',
      }),
    });
    labelText.anchor.set(0, 0.5);
    bar.addChild(labelText);
    bar.labelText = labelText;

    // Bar background
    const barBg = new Graphics();
    barBg.rect(25, -4, 100, 8);
    barBg.fill({ color: colors.background });
    barBg.stroke({ color: colors.foreground, width: 1 });
    bar.addChild(barBg);
    bar.barBackground = barBg;

    // Bar fill
    const barFill = new Graphics();
    bar.addChild(barFill);
    bar.barFill = barFill;

    return bar;
  }

  /**
   * Update attribute bar value
   */
  private updateAttributeBarValue(
    bar: AttributeBar,
    value: number,
    maxValue: number,
    colors: { foreground: number; accent: number }
  ): void {
    if (!bar.barFill) return;

    bar.barFill.clear();
    const fillWidth = Math.max(0, Math.min(96, (value / maxValue) * 96));
    bar.barFill.rect(27, -2, fillWidth, 4);
    bar.barFill.fill({ color: colors.accent });
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

    const buttonWidth = 80;
    const buttonHeight = 20;

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
        fontSize: 10,
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
      this.selectedIndex = CHARACTERS.length; // Back button is after all characters
      this.updateSelection();
    });

    buttonContainer.background = bg;
    buttonContainer.textElement = buttonText;

    return buttonContainer;
  }

  /**
   * Handle character card click
   */
  private handleCardClick(characterId: number): void {
    // Check if character is unlocked
    if (!this.isCharacterUnlocked(characterId)) {
      // Show unlock hint (already visible via lock overlay)
      return;
    }

    // Select the character
    this.selectedCharacterId = characterId;
    const index = CHARACTERS.findIndex((c) => c.id === characterId);
    if (index !== -1) {
      this.selectedIndex = index;
    }

    this.updateSelection();
    this.updateAttributeDisplay();

    // Notify callback
    if (this.onCharacterSelected) {
      this.onCharacterSelected(characterId);
    }
  }

  /**
   * Check if a character is unlocked
   */
  private isCharacterUnlocked(characterId: number): boolean {
    const char = getCharacterById(characterId);
    if (!char) return false;

    // Always unlock initially unlocked characters
    if (char.initiallyUnlocked) return true;

    // Check if in unlocked list
    return this.unlockedCharacterIds.includes(characterId);
  }

  /**
   * Update card states based on unlock status
   */
  private updateCardStates(): void {
    this.characterCards.forEach((card) => {
      const isUnlocked = this.isCharacterUnlocked(card.characterId);
      card.isLocked = !isUnlocked;

      if (card.lockOverlay) {
        card.lockOverlay.visible = !isUnlocked;
      }
    });
  }

  /**
   * Update visual selection highlight
   */
  private updateSelection(): void {
    const colors = this.lcdEffect.getPaletteColors();

    this.characterCards.forEach((card, index) => {
      const isSelected = index === this.selectedIndex;
      const isCurrentlySelected = card.characterId === this.selectedCharacterId;

      if (card.background) {
        card.background.clear();
        card.background.rect(-40, -27.5, 80, 55);

        // Use accent color for selected card, different highlight for currently chosen character
        if (isSelected) {
          card.background.fill({ color: colors.background });
          card.background.stroke({ color: colors.accent, width: 3 });
        } else if (isCurrentlySelected) {
          card.background.fill({ color: colors.background });
          card.background.stroke({ color: colors.accent, width: 2 });
        } else {
          card.background.fill({ color: colors.background });
          card.background.stroke({ color: colors.foreground, width: 1 });
        }
      }
    });

    // Update back button
    if (this.backButton) {
      const isBackSelected = this.selectedIndex === CHARACTERS.length;

      if (this.backButton.background) {
        this.backButton.background.clear();
        this.backButton.background.rect(-40, -10, 80, 20);
        this.backButton.background.fill({
          color: isBackSelected ? colors.accent : colors.background,
        });
        this.backButton.background.stroke({ color: colors.foreground, width: 2 });
      }

      if (this.backButton.textElement) {
        this.backButton.textElement.style.fill = isBackSelected
          ? colors.background
          : colors.foreground;
      }
    }
  }

  /**
   * Update attribute display for selected character
   */
  private updateAttributeDisplay(): void {
    if (this.selectedIndex >= CHARACTERS.length) {
      // Back button selected - show nothing or keep last character
      return;
    }

    const char = CHARACTERS[this.selectedIndex];
    if (!char) return;

    const colors = this.lcdEffect.getPaletteColors();
    const attrs = getAttributeDescription(char);
    const isLocked = !this.isCharacterUnlocked(char.id);

    // Update character name
    if (this.attributeNameText) {
      this.attributeNameText.text = isLocked
        ? `${char.name.toUpperCase()} (LOCKED)`
        : char.name.toUpperCase();
      this.attributeNameText.style.fill = colors.foreground;
    }

    // Update attribute bars (show even for locked characters)
    if (this.speedBar) {
      this.updateAttributeBarValue(this.speedBar, attrs.speedLevel, 5, colors);
    }

    if (this.jumpBar) {
      this.updateAttributeBarValue(this.jumpBar, attrs.jumpLevel, 5, colors);
    }

    if (this.strengthBar) {
      this.updateAttributeBarValue(this.strengthBar, attrs.strengthLevel, 5, colors);
    }
  }

  /**
   * Get unlock requirement text for a character
   */
  getUnlockRequirementText(characterId: number): string {
    const char = getCharacterById(characterId);
    if (!char || !char.unlockCriteria) return '';

    switch (char.unlockCriteria.type) {
      case 'level':
        return `Reach Level ${char.unlockCriteria.value}`;
      case 'score':
        return `Score ${char.unlockCriteria.value} pts`;
      default:
        return '';
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyPress = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (this.selectedIndex >= GRID_COLUMNS) {
          this.selectedIndex -= GRID_COLUMNS;
        }
        this.updateSelection();
        this.updateAttributeDisplay();
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (this.selectedIndex < CHARACTERS.length - GRID_COLUMNS) {
          this.selectedIndex += GRID_COLUMNS;
        } else if (this.selectedIndex < CHARACTERS.length) {
          this.selectedIndex = CHARACTERS.length; // Go to back button
        }
        this.updateSelection();
        this.updateAttributeDisplay();
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (this.selectedIndex > 0 && this.selectedIndex < CHARACTERS.length) {
          this.selectedIndex--;
        }
        this.updateSelection();
        this.updateAttributeDisplay();
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (this.selectedIndex < CHARACTERS.length - 1) {
          this.selectedIndex++;
        }
        this.updateSelection();
        this.updateAttributeDisplay();
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.selectedIndex < CHARACTERS.length) {
          const char = CHARACTERS[this.selectedIndex];
          this.handleCardClick(char.id);
        } else {
          // Back button
          if (this.onBack) {
            this.onBack();
          }
        }
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
   * Called when scene becomes active
   */
  override onEnter(): void {
    super.onEnter();

    // Restore selection to current selected character
    const index = CHARACTERS.findIndex((c) => c.id === this.selectedCharacterId);
    if (index !== -1) {
      this.selectedIndex = index;
    }

    this.updateCardStates();
    this.updateSelection();
    this.updateAttributeDisplay();

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
      this.titleText.style.fill = colors.foreground;
    }

    // Update character cards
    this.characterCards.forEach((card) => {
      if (card.nameText) {
        card.nameText.style.fill = colors.foreground;
      }

      if (card.spritePreview) {
        const char = getCharacterById(card.characterId);
        if (char) {
          this.drawCharacterPreview(card.spritePreview, char.id, colors.foreground);
        }
      }

      if (card.lockIcon) {
        this.drawLockIcon(card.lockIcon, colors.foreground);
      }
    });

    // Update attribute panel
    if (this.attributePanelBg) {
      this.attributePanelBg.clear();
      this.attributePanelBg.rect(-100, -25, 200, 50);
      this.attributePanelBg.fill({ color: colors.background });
      this.attributePanelBg.stroke({ color: colors.foreground, width: 1 });
    }

    // Update attribute bars
    [this.speedBar, this.jumpBar, this.strengthBar].forEach((bar) => {
      if (bar) {
        if (bar.labelText) {
          bar.labelText.style.fill = colors.foreground;
        }
        if (bar.barBackground) {
          bar.barBackground.clear();
          bar.barBackground.rect(25, -4, 100, 8);
          bar.barBackground.fill({ color: colors.background });
          bar.barBackground.stroke({ color: colors.foreground, width: 1 });
        }
      }
    });

    this.updateSelection();
    this.updateAttributeDisplay();
  }

  /**
   * Reset the scene
   */
  reset(): void {
    this.selectedIndex = 0;
    this.updateCardStates();
    this.updateSelection();
    this.updateAttributeDisplay();
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

    this.characterCards.forEach((card) => {
      card.destroy({ children: true });
    });
    this.characterCards = [];

    if (this.attributePanel) {
      this.attributePanel.destroy({ children: true });
      this.attributePanel = null;
    }

    if (this.backButton) {
      this.backButton.destroy({ children: true });
      this.backButton = null;
    }

    this.attributePanelBg = null;
    this.attributeNameText = null;
    this.speedBar = null;
    this.jumpBar = null;
    this.strengthBar = null;

    this.onBack = null;
    this.onCharacterSelected = null;
    this.characterSpriteGetter = null;

    super.destroy();
  }
}

/**
 * Extended Container interface for character card
 */
interface CharacterCard extends Container {
  characterId: number;
  isLocked: boolean;
  background?: Graphics;
  spritePreview?: Graphics;
  nameText?: Text;
  lockOverlay?: Container;
  lockIcon?: Graphics;
}

/**
 * Extended Container interface for attribute bar
 */
interface AttributeBar extends Container {
  labelText?: Text;
  barBackground?: Graphics;
  barFill?: Graphics;
}

/**
 * Extended Container interface for button
 */
interface ButtonContainer extends Container {
  background?: Graphics;
  textElement?: Text;
}
