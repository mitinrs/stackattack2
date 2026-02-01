/**
 * GameScene - Main gameplay scene
 *
 * Primary container for gameplay with HUD, mobile controls, and pause functionality.
 * Integrates all game systems: character, crates, cranes, level, and score management.
 * Optimized for 60 FPS performance with efficient update loops.
 */

import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType, InputAction, GameState } from '../types/game';
import type { LCDEffect } from '../systems/LCDEffect';
import type { AssetLoader } from '../utils/AssetLoader';
import type { InputManager } from '../systems/InputManager';
import type { CharacterConfig } from '../types/config';
import { Character } from '../entities/Character';
import { CrateManager } from '../systems/CrateManager';
import { CraneManager } from '../systems/CraneManager';
import { SpecialBlockManager } from '../systems/SpecialBlockManager';
import { ScoreManager } from '../systems/ScoreManager';
import { LevelManager } from '../systems/LevelManager';
import { CharacterUnlockManager } from '../systems/CharacterUnlockManager';
import { GameStateMachine } from '../systems/GameStateMachine';
import { DEFAULT_GRID_CONFIG, getGridLeftX, getGridRightX } from '../config/grid';
import { getCharacterById } from '../config/characters';

// Game area constants
const LOGICAL_WIDTH = 224; // 12 columns × 16px + 16px walls × 2 = 224px
const LOGICAL_HEIGHT = 320;
const CRANE_AREA_Y = 35;
const GROUND_Y = DEFAULT_GRID_CONFIG.groundY;

// Spawn zone dithering constants
const SPAWN_ZONE_HEIGHT = 80; // Height of the dithered spawn zone
const DITHER_PIXEL_SIZE = 2; // Size of each dither pixel

// Minimum mobile touch target size (44x44px recommended by Apple/Google)
const MIN_TOUCH_TARGET_SIZE = 44;

export interface GameSceneCallbacks {
  onGameOver: (score: number, level: number, linesCleared?: number) => void;
  onLevelComplete: (level: number, score: number) => void;
  onQuitToMenu: () => void;
}

export class GameScene extends Scene {
  private lcdEffect: LCDEffect;
  private assetLoader: AssetLoader | null = null;
  private inputManager: InputManager | null = null;
  private isMovementKeyPressed: boolean = false; // Track if movement key is actively pressed

  // Layers for organization
  private backgroundLayer: Container;
  private gameLayer: Container;
  private crateLayer: Container;
  private characterLayer: Container;
  private uiLayer: Container;
  private hudLayer: Container;
  private pauseLayer: Container;
  private mobileControlsLayer: Container;

  // Game entities
  private character: Character | null = null;
  private selectedCharacterConfig: CharacterConfig | null = null;

  // Game systems
  private crateManager: CrateManager | null = null;
  private craneManager: CraneManager | null = null;
  private specialBlockManager: SpecialBlockManager | null = null;
  private scoreManager: ScoreManager;
  private levelManager: LevelManager;
  private unlockManager: CharacterUnlockManager;
  private stateMachine: GameStateMachine;

  // HUD elements
  private scoreText: Text | null = null;
  private levelText: Text | null = null;
  private linesText: Text | null = null;
  private livesText: Text | null = null;
  private superJumpIcon: Sprite | null = null;
  private helmetIcon: Sprite | null = null;

  // Pause overlay elements
  private pauseOverlay: Container | null = null;
  private isPauseVisible: boolean = false;

  // Mobile controls
  private leftButton: Container | null = null;
  private rightButton: Container | null = null;
  private jumpButton: Container | null = null;

  // Game state
  private isGameRunning: boolean = false;
  private callbacks: GameSceneCallbacks | null = null;

  // Input handling
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;

  // Performance optimization: track if line check is needed
  private pendingLineCheck: boolean = false;

  // Dithering graphics for spawn zone (need reference for palette updates)
  private ditheringGraphics: Graphics | null = null;

  // Environment containers for palette updates
  private environmentContainer: Container | null = null;

  constructor(lcdEffect: LCDEffect) {
    super(SceneType.Game);
    this.lcdEffect = lcdEffect;

    // Initialize layers
    this.backgroundLayer = new Container();
    this.gameLayer = new Container();
    this.crateLayer = new Container();
    this.characterLayer = new Container();
    this.uiLayer = new Container();
    this.hudLayer = new Container();
    this.pauseLayer = new Container();
    this.mobileControlsLayer = new Container();

    // Initialize systems
    this.scoreManager = new ScoreManager();
    this.levelManager = new LevelManager();
    this.unlockManager = new CharacterUnlockManager();
    this.stateMachine = new GameStateMachine(GameState.Menu);

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set the asset loader
   */
  setAssetLoader(loader: AssetLoader): void {
    this.assetLoader = loader;
  }

  /**
   * Set the input manager
   */
  setInputManager(manager: InputManager): void {
    this.inputManager = manager;
  }

  /**
   * Set callbacks for game events
   */
  setCallbacks(callbacks: GameSceneCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set the selected character ID
   */
  setSelectedCharacter(characterId: number): void {
    const config = getCharacterById(characterId);
    if (config) {
      this.selectedCharacterConfig = config;
    }
  }

  /**
   * Set unlocked character IDs for the unlock manager
   */
  setUnlockedCharacterIds(ids: number[]): void {
    this.unlockManager.restoreState(ids);
  }

  /**
   * Create the scene content
   */
  protected async onCreate(): Promise<void> {
    const colors = this.lcdEffect.getPaletteColors();

    // Create background - light for game area
    const background = new Graphics();
    background.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    background.fill({ color: colors.background });
    this.backgroundLayer.addChild(background);

    // Create dark header background for HUD and crane area
    this.createHeaderBackground(colors);

    // Create environment (walls, floor, crane rail) - rail must be ON TOP of header
    this.createEnvironment();

    // Create dithered spawn zone at top (transitions from dark header to light game area)
    this.createSpawnZoneDithering(colors);

    // Add layers to container in order
    this.container.addChild(this.backgroundLayer);
    this.container.addChild(this.gameLayer);
    this.container.addChild(this.crateLayer);
    this.container.addChild(this.characterLayer);
    this.container.addChild(this.uiLayer);
    this.container.addChild(this.hudLayer);
    this.container.addChild(this.mobileControlsLayer);
    this.container.addChild(this.pauseLayer);

    // Create HUD
    this.createHUD(colors);

    // Create pause overlay (hidden by default)
    this.createPauseOverlay(colors);

    // Create mobile controls (hidden by default)
    this.createMobileControls(colors);

    // Check initial viewport for mobile controls
    this.checkMobileViewport();
  }

  // Header background graphics for palette updates
  private headerBackground: Graphics | null = null;

  /**
   * Create dark header background for HUD and crane area
   */
  private createHeaderBackground(colors: { foreground: number; background: number }): void {
    // Remove existing header if any
    if (this.headerBackground) {
      this.backgroundLayer.removeChild(this.headerBackground);
      this.headerBackground.destroy();
    }

    this.headerBackground = new Graphics();
    // Dark background from top to crane area
    this.headerBackground.rect(0, 0, LOGICAL_WIDTH, CRANE_AREA_Y);
    this.headerBackground.fill({ color: colors.foreground });
    this.backgroundLayer.addChild(this.headerBackground);
  }

  /**
   * Create dithered spawn zone effect at the top of the screen
   * Creates a gradient dithering pattern that transitions from dark header to light game area
   * Uses foreground (dark) pixels on light background, dense at top becoming sparse at bottom
   */
  private createSpawnZoneDithering(colors: { foreground: number; background: number }): void {
    // Remove existing dithering if any
    if (this.ditheringGraphics) {
      this.backgroundLayer.removeChild(this.ditheringGraphics);
      this.ditheringGraphics.destroy();
    }

    this.ditheringGraphics = new Graphics();

    // Create dithering pattern - denser at top (header), sparser at bottom (game area)
    // This creates dark pixels on light background, transitioning into dark header
    for (let y = CRANE_AREA_Y; y < CRANE_AREA_Y + SPAWN_ZONE_HEIGHT; y += DITHER_PIXEL_SIZE) {
      // Calculate density based on vertical position (1.0 at top, 0.0 at bottom)
      const progress = (y - CRANE_AREA_Y) / SPAWN_ZONE_HEIGHT;
      const density = 1.0 - progress; // Dense at top, sparse at bottom

      for (let x = 0; x < LOGICAL_WIDTH; x += DITHER_PIXEL_SIZE) {
        // Use ordered dithering pattern (Bayer matrix style)
        const ditherX = Math.floor(x / DITHER_PIXEL_SIZE) % 4;
        const ditherY = Math.floor(y / DITHER_PIXEL_SIZE) % 4;

        // 4x4 Bayer dithering matrix threshold values (normalized 0-1)
        const bayerMatrix = [
          [0 / 16, 8 / 16, 2 / 16, 10 / 16],
          [12 / 16, 4 / 16, 14 / 16, 6 / 16],
          [3 / 16, 11 / 16, 1 / 16, 9 / 16],
          [15 / 16, 7 / 16, 13 / 16, 5 / 16],
        ];

        const threshold = bayerMatrix[ditherY][ditherX];

        // Draw dark pixel on light area if density exceeds threshold
        if (density > threshold) {
          this.ditheringGraphics.rect(x, y, DITHER_PIXEL_SIZE, DITHER_PIXEL_SIZE);
          this.ditheringGraphics.fill({ color: colors.foreground });
        }
      }
    }

    this.backgroundLayer.addChild(this.ditheringGraphics);
  }

  /**
   * Create environment elements: brick walls, floor, and crane rail
   */
  private createEnvironment(): void {
    // Remove existing environment if any
    if (this.environmentContainer) {
      this.backgroundLayer.removeChild(this.environmentContainer);
      this.environmentContainer.destroy({ children: true });
    }

    this.environmentContainer = new Container();

    // Get sprite textures
    const wallTexture = this.assetLoader?.getEnvironmentSprite(
      'brick_wall',
      this.lcdEffect.getCurrentPalette()
    );
    const floorTexture = this.assetLoader?.getEnvironmentSprite(
      'floor_tile',
      this.lcdEffect.getCurrentPalette()
    );

    const tileSize = 16; // 8x8 pixels at 2x scale

    // Create left wall (at left edge of screen x=0)
    if (wallTexture) {
      const leftWallContainer = new Container();
      const wallHeight = GROUND_Y - CRANE_AREA_Y;
      const tilesNeeded = Math.ceil(wallHeight / tileSize);

      for (let i = 0; i < tilesNeeded; i++) {
        const wallSprite = new Sprite(wallTexture);
        // Left wall at x=0, mirrored for visual symmetry
        wallSprite.position.set(tileSize, CRANE_AREA_Y + i * tileSize);
        wallSprite.scale.x = -1;
        leftWallContainer.addChild(wallSprite);
      }
      this.environmentContainer.addChild(leftWallContainer);

      // Create right wall (at right edge of screen)
      const rightWallContainer = new Container();
      for (let i = 0; i < tilesNeeded; i++) {
        const wallSprite = new Sprite(wallTexture);
        wallSprite.position.set(LOGICAL_WIDTH - tileSize, CRANE_AREA_Y + i * tileSize);
        rightWallContainer.addChild(wallSprite);
      }
      this.environmentContainer.addChild(rightWallContainer);
    }

    // Create floor (spans full width)
    if (floorTexture) {
      const floorContainer = new Container();
      const tilesNeeded = Math.ceil(LOGICAL_WIDTH / tileSize);

      for (let i = 0; i < tilesNeeded; i++) {
        const floorSprite = new Sprite(floorTexture);
        floorSprite.position.set(i * tileSize, GROUND_Y);
        floorContainer.addChild(floorSprite);
      }
      this.environmentContainer.addChild(floorContainer);
    }

    // Create crane rail (spans play area width) - use inverted version for dark header
    const invertedRailTexture = this.assetLoader?.getEnvironmentSprite(
      'crane_rail_inverted',
      this.lcdEffect.getCurrentPalette()
    );
    if (invertedRailTexture) {
      const railContainer = new Container();
      const railWidth = LOGICAL_WIDTH;
      const tilesNeeded = Math.ceil(railWidth / tileSize);

      for (let i = 0; i < tilesNeeded; i++) {
        const railSprite = new Sprite(invertedRailTexture);
        railSprite.position.set(i * tileSize, CRANE_AREA_Y - tileSize);
        railContainer.addChild(railSprite);
      }
      this.environmentContainer.addChild(railContainer);
    }

    // Add to background layer (on top of header, before dithering)
    this.backgroundLayer.addChild(this.environmentContainer);
  }

  /**
   * Create the HUD overlay
   */
  private createHUD(colors: { foreground: number; background: number; accent: number }): void {
    // Use background (light) color for text on dark header
    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: colors.background,
      align: 'left',
    });

    // Score display (top-left)
    this.scoreText = new Text({
      text: 'SCORE: 0',
      style: textStyle,
    });
    this.scoreText.position.set(5, 5);
    this.hudLayer.addChild(this.scoreText);

    // Level display (top-center)
    this.levelText = new Text({
      text: 'LEVEL: 1',
      style: new TextStyle({
        ...textStyle,
        align: 'center',
      }),
    });
    this.levelText.anchor.set(0.5, 0);
    this.levelText.position.set(LOGICAL_WIDTH / 2, 5);
    this.hudLayer.addChild(this.levelText);

    // Lines cleared display (top-right)
    this.linesText = new Text({
      text: '0/3',
      style: new TextStyle({
        ...textStyle,
        align: 'right',
      }),
    });
    this.linesText.anchor.set(1, 0);
    this.linesText.position.set(LOGICAL_WIDTH - 5, 5);
    this.hudLayer.addChild(this.linesText);

    // Lives display (top row, between level and lines)
    this.livesText = new Text({
      text: '♥1',
      style: new TextStyle({
        ...textStyle,
        align: 'right',
      }),
    });
    this.livesText.anchor.set(1, 0);
    this.livesText.position.set(LOGICAL_WIDTH - 35, 5);
    this.hudLayer.addChild(this.livesText);

    // Special effect icons (below score)
    this.createEffectIcons(colors);
  }

  /**
   * Create special effect icons for HUD
   */
  private createEffectIcons(colors: { foreground: number; accent: number }): void {
    // Super Jump icon (small up arrow)
    const superJumpGraphics = new Graphics();
    superJumpGraphics.moveTo(6, 0);
    superJumpGraphics.lineTo(12, 8);
    superJumpGraphics.lineTo(8, 8);
    superJumpGraphics.lineTo(8, 12);
    superJumpGraphics.lineTo(4, 12);
    superJumpGraphics.lineTo(4, 8);
    superJumpGraphics.lineTo(0, 8);
    superJumpGraphics.closePath();
    superJumpGraphics.fill({ color: colors.accent });

    this.superJumpIcon = new Sprite();
    this.superJumpIcon.position.set(5, 18);
    this.superJumpIcon.visible = false;
    this.hudLayer.addChild(superJumpGraphics);
    superJumpGraphics.position.set(5, 18);
    superJumpGraphics.visible = false;
    this.superJumpIcon = superJumpGraphics as unknown as Sprite;

    // Helmet icon (small helmet shape)
    const helmetGraphics = new Graphics();
    helmetGraphics.arc(6, 6, 6, Math.PI, 0, false);
    helmetGraphics.lineTo(12, 10);
    helmetGraphics.lineTo(0, 10);
    helmetGraphics.closePath();
    helmetGraphics.fill({ color: colors.accent });

    this.helmetIcon = new Sprite();
    this.helmetIcon.position.set(25, 18);
    this.helmetIcon.visible = false;
    this.hudLayer.addChild(helmetGraphics);
    helmetGraphics.position.set(25, 18);
    helmetGraphics.visible = false;
    this.helmetIcon = helmetGraphics as unknown as Sprite;
  }

  /**
   * Create pause overlay
   */
  private createPauseOverlay(colors: {
    foreground: number;
    background: number;
    accent: number;
  }): void {
    this.pauseOverlay = new Container();
    this.pauseOverlay.visible = false;

    // Semi-transparent background
    const overlay = new Graphics();
    overlay.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.pauseOverlay.addChild(overlay);

    // Pause box
    const boxWidth = 160;
    const boxHeight = 100;
    const boxX = (LOGICAL_WIDTH - boxWidth) / 2;
    const boxY = (LOGICAL_HEIGHT - boxHeight) / 2;

    const box = new Graphics();
    box.rect(boxX, boxY, boxWidth, boxHeight);
    box.fill({ color: colors.background });
    box.stroke({ color: colors.accent, width: 3 });
    this.pauseOverlay.addChild(box);

    // Pause title
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: colors.foreground,
      fontWeight: 'bold',
    });

    const title = new Text({ text: 'PAUSED', style: titleStyle });
    title.anchor.set(0.5);
    title.position.set(LOGICAL_WIDTH / 2, boxY + 25);
    this.pauseOverlay.addChild(title);

    // Resume button
    const resumeButton = this.createPauseButton('RESUME', boxY + 50, colors, () => {
      this.resumeGame();
    });
    this.pauseOverlay.addChild(resumeButton);

    // Quit button
    const quitButton = this.createPauseButton('QUIT TO MENU', boxY + 78, colors, () => {
      this.quitToMenu();
    });
    this.pauseOverlay.addChild(quitButton);

    this.pauseLayer.addChild(this.pauseOverlay);
  }

  /**
   * Create a button for the pause menu
   */
  private createPauseButton(
    text: string,
    y: number,
    colors: { foreground: number; background: number; accent: number },
    onClick: () => void
  ): Container {
    const button = new Container();
    button.position.set(LOGICAL_WIDTH / 2, y);

    const buttonWidth = 120;
    const buttonHeight = Math.max(20, MIN_TOUCH_TARGET_SIZE / 2); // Ensure minimum touch target

    const bg = new Graphics();
    bg.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
    bg.fill({ color: colors.background });
    bg.stroke({ color: colors.foreground, width: 2 });
    button.addChild(bg);

    const buttonText = new Text({
      text,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 9,
        fill: colors.foreground,
      }),
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);

    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.on('pointerdown', onClick);

    return button;
  }

  /**
   * Create mobile touch control overlay with appropriate touch target sizes
   */
  private createMobileControls(colors: {
    foreground: number;
    background: number;
    accent: number;
  }): void {
    // Use minimum touch target size (44x44px) for mobile buttons
    const buttonSize = Math.max(40, MIN_TOUCH_TARGET_SIZE);
    const padding = 10;
    const bottomY = LOGICAL_HEIGHT - padding - buttonSize;

    // Left arrow button (bottom-left)
    this.leftButton = this.createMobileButton(
      'left',
      padding,
      bottomY,
      buttonSize,
      colors,
      () => this.handleMobileInput(InputAction.MoveLeft, true),
      () => this.handleMobileInput(InputAction.MoveLeft, false)
    );
    this.mobileControlsLayer.addChild(this.leftButton);

    // Right arrow button (next to left)
    this.rightButton = this.createMobileButton(
      'right',
      padding + buttonSize + 5,
      bottomY,
      buttonSize,
      colors,
      () => this.handleMobileInput(InputAction.MoveRight, true),
      () => this.handleMobileInput(InputAction.MoveRight, false)
    );
    this.mobileControlsLayer.addChild(this.rightButton);

    // Jump button (bottom-right)
    this.jumpButton = this.createMobileButton(
      'jump',
      LOGICAL_WIDTH - padding - buttonSize,
      bottomY,
      buttonSize,
      colors,
      () => this.handleMobileInput(InputAction.Jump, true),
      () => this.handleMobileInput(InputAction.Jump, false)
    );
    this.mobileControlsLayer.addChild(this.jumpButton);

    // Hide by default
    this.mobileControlsLayer.visible = false;
  }

  /**
   * Create a mobile control button with minimum touch target size
   */
  private createMobileButton(
    type: 'left' | 'right' | 'jump',
    x: number,
    y: number,
    size: number,
    colors: { foreground: number; background: number; accent: number },
    onPress: () => void,
    onRelease: () => void
  ): Container {
    const button = new Container();
    button.position.set(x, y);

    // Ensure minimum touch target size
    const touchSize = Math.max(size, MIN_TOUCH_TARGET_SIZE);

    // Button background
    const bg = new Graphics();
    bg.roundRect(0, 0, touchSize, touchSize, 6);
    bg.fill({ color: colors.background, alpha: 0.8 });
    bg.stroke({ color: colors.foreground, width: 2 });
    button.addChild(bg);

    // Button icon
    const icon = new Graphics();
    const centerX = touchSize / 2;
    const centerY = touchSize / 2;
    const iconSize = touchSize * 0.4;

    switch (type) {
      case 'left':
        // Left arrow
        icon.moveTo(centerX + iconSize / 2, centerY - iconSize / 2);
        icon.lineTo(centerX - iconSize / 2, centerY);
        icon.lineTo(centerX + iconSize / 2, centerY + iconSize / 2);
        icon.stroke({ color: colors.foreground, width: 3 });
        break;
      case 'right':
        // Right arrow
        icon.moveTo(centerX - iconSize / 2, centerY - iconSize / 2);
        icon.lineTo(centerX + iconSize / 2, centerY);
        icon.lineTo(centerX - iconSize / 2, centerY + iconSize / 2);
        icon.stroke({ color: colors.foreground, width: 3 });
        break;
      case 'jump':
        // Up arrow
        icon.moveTo(centerX - iconSize / 2, centerY + iconSize / 4);
        icon.lineTo(centerX, centerY - iconSize / 2);
        icon.lineTo(centerX + iconSize / 2, centerY + iconSize / 4);
        icon.stroke({ color: colors.foreground, width: 3 });
        break;
    }
    button.addChild(icon);

    // Make interactive with expanded hit area for touch
    button.eventMode = 'static';
    button.hitArea = {
      contains: (px: number, py: number) =>
        px >= 0 && px <= touchSize && py >= 0 && py <= touchSize,
    };
    button.on('pointerdown', onPress);
    button.on('pointerup', onRelease);
    button.on('pointerupoutside', onRelease);

    return button;
  }

  /**
   * Handle mobile input
   */
  private handleMobileInput(action: InputAction, active: boolean): void {
    if (this.inputManager && this.isGameRunning && !this.isPauseVisible) {
      this.inputManager.triggerAction(action, active);
    }
  }

  /**
   * Check viewport and show/hide mobile controls
   * Note: PIXI mobile controls are disabled - using HTML controls instead
   */
  private checkMobileViewport(): void {
    // HTML mobile controls are used instead of PIXI-based controls
    // Keep PIXI controls hidden to avoid overlap
    this.mobileControlsLayer.visible = false;
  }

  /**
   * Set up event listeners for systems
   */
  private setupEventListeners(): void {
    // Score events
    this.scoreManager.on('scoreChanged', () => {
      this.updateHUDScore();
    });

    // Level events
    this.levelManager.addListener('linesCleared', () => {
      this.updateHUDLines();
    });

    this.levelManager.addListener('levelComplete', (event) => {
      this.handleLevelComplete(event.level, event.bonusPoints || 0);
    });

    // State machine events
    this.stateMachine.addListener((_oldState, newState) => {
      this.handleStateChange(newState);
    });
  }

  /**
   * Initialize game entities for a new game
   */
  initializeGame(characterId: number, startLevel: number = 1): void {
    // Set character config
    this.setSelectedCharacter(characterId);

    // Reset systems
    this.scoreManager.reset();
    this.levelManager.reset();
    this.stateMachine.reset();

    // Clear existing entities
    this.clearGameEntities();

    // Create character
    this.createCharacter();

    // Create game managers
    this.createGameManagers();

    // Start at selected level
    this.levelManager.startLevel(startLevel);
    this.updateHUD();

    // Initialize cranes for level
    if (this.craneManager) {
      this.craneManager.initializeCranes(this.levelManager.getCurrentCraneCount());
      this.craneManager.setSpawnInterval(2000 / this.levelManager.getCurrentCrateSpeedMultiplier());

      // Set crane textures - use inverted version for dark header (closed and open hooks)
      if (this.assetLoader) {
        const closedTexture = this.assetLoader.getInvertedCraneSprite(
          this.lcdEffect.getCurrentPalette()
        );
        const openTexture = this.assetLoader.getInvertedCraneOpenSprite(
          this.lcdEffect.getCurrentPalette()
        );
        if (closedTexture && openTexture) {
          this.craneManager.setCraneTextures(closedTexture, openTexture);
        }

        // Set up crate texture callback for crane manager
        this.craneManager.setCrateTextureCallback((type, color) => {
          if (type === 'regular' && color) {
            return this.assetLoader!.getColoredCrateSprite(color, this.lcdEffect.getCurrentPalette());
          } else if (type === 'bomb') {
            return this.assetLoader!.getBombCrateSprite(this.lcdEffect.getCurrentPalette());
          } else {
            return this.assetLoader!.getCrateSpriteByType(type, this.lcdEffect.getCurrentPalette());
          }
        });
      }
    }

    // Transition to playing state
    this.stateMachine.transition(GameState.Playing);
    this.isGameRunning = true;
    this.pendingLineCheck = false;
  }

  /**
   * Create the player character
   */
  private createCharacter(): void {
    if (!this.selectedCharacterConfig) {
      this.selectedCharacterConfig = getCharacterById(1)!;
    }

    this.character = new Character(this.selectedCharacterConfig);

    // Set initial position (center-bottom of play area)
    const gridLeft = getGridLeftX(DEFAULT_GRID_CONFIG);
    const gridRight = getGridRightX(DEFAULT_GRID_CONFIG);
    const centerX = (gridLeft + gridRight) / 2;
    this.character.setPosition(centerX, GROUND_Y);
    this.character.setOnGround(true);

    // Set sprite texture using animation system
    if (this.assetLoader) {
      const frame = this.character.getCurrentAnimationFrame();
      const texture = this.assetLoader.getCharacterAnimationSprite(
        frame,
        this.lcdEffect.getCurrentPalette()
      );
      if (texture) {
        this.character.texture = texture;
      }
    }

    this.characterLayer.addChild(this.character);
  }

  /**
   * Create game managers
   */
  private createGameManagers(): void {
    // Crate manager
    this.crateManager = new CrateManager({
      gridColumns: DEFAULT_GRID_CONFIG.columns,
      gridRows: DEFAULT_GRID_CONFIG.rows,
      cellWidth: DEFAULT_GRID_CONFIG.cellWidth,
      cellHeight: DEFAULT_GRID_CONFIG.cellHeight,
      groundY: GROUND_Y,
    });
    this.crateLayer.addChild(this.crateManager);

    // Crane manager
    this.craneManager = new CraneManager({
      gridConfig: DEFAULT_GRID_CONFIG,
      craneTopY: CRANE_AREA_Y,
    });
    this.gameLayer.addChild(this.craneManager);

    // Special block manager
    this.specialBlockManager = new SpecialBlockManager();
    this.uiLayer.addChild(this.specialBlockManager);
  }

  /**
   * Clear all game entities
   */
  private clearGameEntities(): void {
    // Remove character
    if (this.character) {
      this.characterLayer.removeChild(this.character);
      this.character.destroy();
      this.character = null;
    }

    // Remove crate manager
    if (this.crateManager) {
      this.crateLayer.removeChild(this.crateManager);
      this.crateManager.destroy();
      this.crateManager = null;
    }

    // Remove crane manager
    if (this.craneManager) {
      this.gameLayer.removeChild(this.craneManager);
      this.craneManager.destroy();
      this.craneManager = null;
    }

    // Remove special block manager
    if (this.specialBlockManager) {
      this.uiLayer.removeChild(this.specialBlockManager);
      this.specialBlockManager.destroy();
      this.specialBlockManager = null;
    }
  }

  /**
   * Update HUD elements
   */
  private updateHUD(): void {
    this.updateHUDScore();
    this.updateHUDLevel();
    this.updateHUDLines();
    this.updateHUDLives();
    this.updateHUDEffects();
  }

  /**
   * Update score display
   */
  private updateHUDScore(): void {
    if (this.scoreText) {
      this.scoreText.text = `SCORE: ${this.scoreManager.getScore()}`;
    }
  }

  /**
   * Update level display
   */
  private updateHUDLevel(): void {
    if (this.levelText) {
      this.levelText.text = `LEVEL: ${this.levelManager.getCurrentLevel()}`;
    }
  }

  /**
   * Update lines cleared display
   */
  private updateHUDLines(): void {
    if (this.linesText) {
      const cleared = this.levelManager.getLinesCleared();
      const required = this.levelManager.getLinesToClear();
      this.linesText.text = `${cleared}/${required}`;
    }
  }

  /**
   * Update lives display
   */
  private updateHUDLives(): void {
    if (this.livesText && this.specialBlockManager) {
      const lives = this.specialBlockManager.getExtraLives();
      this.livesText.text = `♥${lives}`;
    }
  }

  /**
   * Update special effect icons
   */
  private updateHUDEffects(): void {
    if (this.specialBlockManager) {
      const state = this.specialBlockManager.getEffectState();

      if (this.superJumpIcon) {
        (this.superJumpIcon as unknown as Graphics).visible = state.superJumpActive;
      }

      if (this.helmetIcon) {
        (this.helmetIcon as unknown as Graphics).visible = state.helmetActive;
      }
    }
  }

  /**
   * Handle state changes
   */
  private handleStateChange(newState: GameState): void {
    switch (newState) {
      case GameState.Paused:
        this.showPauseOverlay();
        break;
      case GameState.Playing:
        this.hidePauseOverlay();
        break;
      case GameState.GameOver:
        this.handleGameOver();
        break;
    }
  }

  /**
   * Handle level complete
   */
  private handleLevelComplete(level: number, bonusPoints: number): void {
    // Award bonus points
    this.scoreManager.addPoints(bonusPoints);

    // Update highest level reached
    this.scoreManager.setHighestLevelReached(level);

    // Notify callback
    if (this.callbacks?.onLevelComplete) {
      this.callbacks.onLevelComplete(level, this.scoreManager.getScore());
    }
  }

  /**
   * Handle game over
   */
  private handleGameOver(): void {
    this.isGameRunning = false;

    if (this.callbacks?.onGameOver) {
      this.callbacks.onGameOver(
        this.scoreManager.getScore(),
        this.levelManager.getCurrentLevel(),
        this.scoreManager.getTotalLinesCleared()
      );
    }
  }

  /**
   * Pause the game
   */
  pauseGame(): void {
    if (this.isGameRunning && this.stateMachine.getState() === GameState.Playing) {
      this.stateMachine.transition(GameState.Paused);
    }
  }

  /**
   * Resume the game
   */
  resumeGame(): void {
    if (this.stateMachine.getState() === GameState.Paused) {
      this.stateMachine.transition(GameState.Playing);
    }
  }

  /**
   * Quit to main menu
   */
  quitToMenu(): void {
    this.isGameRunning = false;
    this.hidePauseOverlay();
    this.stateMachine.transition(GameState.Menu);

    if (this.callbacks?.onQuitToMenu) {
      this.callbacks.onQuitToMenu();
    }
  }

  /**
   * Show pause overlay
   */
  private showPauseOverlay(): void {
    this.isPauseVisible = true;
    if (this.pauseOverlay) {
      this.pauseOverlay.visible = true;
    }
  }

  /**
   * Hide pause overlay
   */
  private hidePauseOverlay(): void {
    this.isPauseVisible = false;
    if (this.pauseOverlay) {
      this.pauseOverlay.visible = false;
    }
  }

  /**
   * Handle keyboard input
   */
  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.isPauseVisible) {
        this.resumeGame();
      } else if (this.isGameRunning) {
        this.pauseGame();
      }
    }
  };

  /**
   * Update game scene (optimized for 60 FPS)
   */
  override update(deltaTime: number): void {
    if (!this.isGameRunning || this.isPauseVisible) {
      return;
    }

    // Process input
    this.processInput(deltaTime);

    // Update character
    this.updateCharacter(deltaTime);

    // Update cranes and spawn crates
    this.updateCranes(deltaTime);

    // Update crates (includes clearing animation updates)
    this.updateCrates(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Update special block manager
    if (this.specialBlockManager) {
      this.specialBlockManager.update(deltaTime);
    }

    // Update HUD effects
    this.updateHUDEffects();

    // Check game over condition
    this.checkGameOverCondition();
  }

  /**
   * Process player input
   */
  private processInput(deltaTime: number): void {
    if (!this.inputManager || !this.character) {
      return;
    }

    const inputState = this.inputManager.getInputState();

    // Movement
    const movingLeft = inputState[InputAction.MoveLeft];
    const movingRight = inputState[InputAction.MoveRight];

    // Track if movement key is actively pressed (used for push detection)
    this.isMovementKeyPressed = movingLeft || movingRight;

    if (movingLeft) {
      this.character.moveLeft(deltaTime);
    }
    if (movingRight) {
      this.character.moveRight(deltaTime);
    }

    // If no horizontal movement input, stop moving (apply friction)
    if (!movingLeft && !movingRight) {
      this.character.stopMoving();
    }

    // Jump
    if (inputState[InputAction.Jump]) {
      this.character.jump();
    }

    // Pause
    if (inputState[InputAction.Pause]) {
      this.pauseGame();
    }
  }

  /**
   * Update character physics and boundaries
   */
  private updateCharacter(deltaTime: number): void {
    if (!this.character) {
      return;
    }

    // Save ground state BEFORE resetting - used for friction calculation
    this.character.saveGroundState();

    // Reset onGround before collision checks - gravity will apply if not on a surface
    // Only reset if not on the actual floor
    if (this.character.y < GROUND_Y) {
      this.character.setOnGround(false);
    }

    this.character.update(deltaTime);

    // Keep character within bounds
    const gridLeft = getGridLeftX(DEFAULT_GRID_CONFIG);
    const gridRight = getGridRightX(DEFAULT_GRID_CONFIG);
    const charWidth = this.character.width / 2;

    if (this.character.x - charWidth < gridLeft) {
      this.character.x = gridLeft + charWidth;
    }
    if (this.character.x + charWidth > gridRight) {
      this.character.x = gridRight - charWidth;
    }

    // Check collision with crates - will re-set onGround if standing on a crate
    this.checkCharacterCrateCollisions(deltaTime);

    // Ground collision
    if (this.character.y >= GROUND_Y) {
      this.character.y = GROUND_Y;
      this.character.setOnGround(true);
    }

    // Update character animation texture AFTER all collisions are resolved
    // This ensures the state is stable when selecting animation frame
    if (this.assetLoader) {
      const frame = this.character.getCurrentAnimationFrame();
      const texture = this.assetLoader.getCharacterAnimationSprite(
        frame,
        this.lcdEffect.getCurrentPalette()
      );
      if (texture) {
        this.character.texture = texture;
      }

      // Handle idle looking direction - mirror sprite for left, normal for others
      if (this.character.getState() === 'idle') {
        if (this.character.isIdleLookingLeft()) {
          this.character.scale.x = -Math.abs(this.character.scale.x);
        } else {
          // For idle_front, idle_up, idle_right - always face forward (no flip)
          this.character.scale.x = Math.abs(this.character.scale.x);
        }
      }
    }
  }

  /**
   * Check and resolve character-crate collisions with push-on-move mechanics
   */
  private checkCharacterCrateCollisions(deltaTime: number): void {
    if (!this.character || !this.crateManager) {
      return;
    }

    // Reset pushing state at start - will be set if pushing happens
    this.character.stopPushing();

    // Track crates being actively pushed this frame
    const activelyPushedCrates = new Set<import('../entities/Crate').Crate>();

    const allCrates = this.crateManager.getAllCrates();
    if (allCrates.length === 0) {
      return;
    }

    // Track if character was blocked horizontally - stop processing more horizontal collisions
    let horizontallyBlocked = false;

    const charBounds = this.character.getCollisionBounds();
    const charVelocity = this.character.getVelocity();

    for (const crate of allCrates) {
      const crateBounds = crate.getCollisionBounds();

      // Check for overlap
      // Use >= for bottom edge check to detect collision when standing exactly on top of a crate
      // This prevents flickering between Idle and Falling states when character.y == crateBounds.y
      const overlapX =
        charBounds.x < crateBounds.x + crateBounds.width &&
        charBounds.x + charBounds.width > crateBounds.x;
      const overlapY =
        charBounds.y < crateBounds.y + crateBounds.height &&
        charBounds.y + charBounds.height >= crateBounds.y;

      if (overlapX && overlapY) {
        // Calculate overlap amounts
        const charCenterX = charBounds.x + charBounds.width / 2;
        const crateCenterX = crateBounds.x + crateBounds.width / 2;
        const charCenterY = charBounds.y + charBounds.height / 2;
        const crateCenterY = crateBounds.y + crateBounds.height / 2;

        // Determine collision direction based on relative positions
        const overlapLeft = charBounds.x + charBounds.width - crateBounds.x;
        const overlapRight = crateBounds.x + crateBounds.width - charBounds.x;
        const overlapTop = charBounds.y + charBounds.height - crateBounds.y;
        const overlapBottom = crateBounds.y + crateBounds.height - charBounds.y;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        // Determine which axis has less penetration
        if (minOverlapY < minOverlapX) {
          // Vertical collision
          if (charCenterY < crateCenterY) {
            // Character is above crate - land on top (only for landed crates)
            if (crate.isLanded()) {
              this.character.y = crateBounds.y;
              this.character.setOnGround(true);
              this.character.setVelocity({ y: 0 });
            }
          } else {
            // Character is below crate - hit head (possible death from falling crate)
            if (crate.isFalling()) {
              // Only deadly if character is SUBSTANTIALLY under the crate (not just touching edge)
              // Require at least 50% horizontal overlap to count as "under"
              const horizontalOverlap =
                Math.min(charBounds.x + charBounds.width, crateBounds.x + crateBounds.width) -
                Math.max(charBounds.x, crateBounds.x);
              const overlapRatio =
                horizontalOverlap / Math.min(charBounds.width, crateBounds.width);

              if (overlapRatio >= 0.5) {
                // Character is truly under the falling crate
                // Special blocks don't kill - they activate instead
                if (crate.isSpecial()) {
                  this.handleSpecialBlockCollision(crate);
                  return;
                }
                // Regular crate falling on head - game over (unless helmet)
                const survived = this.handleCrateFallingOnHead();
                if (!survived) {
                  return; // Game over
                }
                // Helmet saved us - push character aside so crate doesn't hit again
                if (charCenterX < crateCenterX) {
                  this.character.x = crateBounds.x - charBounds.width / 2 - 1;
                } else {
                  this.character.x = crateBounds.x + crateBounds.width + charBounds.width / 2 + 1;
                }
                continue; // Continue checking other crates
              } else {
                // Character is just touching the edge - push them aside instead
                if (charCenterX < crateCenterX) {
                  this.character.x = crateBounds.x - charBounds.width / 2 - 1;
                } else {
                  this.character.x = crateBounds.x + crateBounds.width + charBounds.width / 2 + 1;
                }
                continue; // Skip to next crate
              }
            }
            this.character.y = crateBounds.y + crateBounds.height + charBounds.height;
            this.character.setVelocity({ y: Math.max(0, charVelocity.y) });
          }
        } else {
          // Horizontal collision - try to push crate

          // Skip if already blocked by another crate (prevents passing through stacks)
          if (horizontallyBlocked) {
            continue;
          }

          const pushDirection = charCenterX < crateCenterX ? 1 : -1;

          // Special crates can be picked up on horizontal collision (landed or falling)
          if (crate.isSpecial()) {
            this.handleSpecialBlockCollision(crate);
            continue; // Skip to next crate - special crate was picked up
          }

          // Only try to push if character is moving towards the crate
          // Only push if movement key is actively pressed AND moving towards crate
          const isMovingTowardsCrate =
            this.isMovementKeyPressed &&
            ((pushDirection > 0 && charVelocity.x > 0) ||
              (pushDirection < 0 && charVelocity.x < 0));

          if (isMovingTowardsCrate) {
            // Activate pushing animation when moving against crate
            this.character.startPushing();

            // Check if crate is already sliding or try to start pushing
            const canPush = crate.isSliding() || this.tryPushCrate(crate, pushDirection);

            if (canPush) {
              // Move crate with character
              const deltaX = charVelocity.x * deltaTime;
              this.crateManager.moveSlidingCrate(crate, deltaX);
              activelyPushedCrates.add(crate);

              // Also track any stacked crates
              const column = crate.getGridColumn();
              let checkRow = crate.getGridRow() + 1;
              while (checkRow < 15) {
                const crateAbove = this.crateManager.getCrateAt(column, checkRow);
                if (crateAbove && crateAbove.isSliding()) {
                  this.crateManager.moveSlidingCrate(crateAbove, deltaX);
                  activelyPushedCrates.add(crateAbove);
                  checkRow++;
                } else {
                  break;
                }
              }
            } else {
              // Can't push - stop character at crate edge and mark as blocked
              if (charCenterX < crateCenterX) {
                this.character.x = crateBounds.x - charBounds.width / 2;
              } else {
                this.character.x = crateBounds.x + crateBounds.width + charBounds.width / 2;
              }
              this.character.setVelocity({ x: 0 });
              horizontallyBlocked = true; // Prevent other crates from moving character
            }
          } else {
            // Not moving towards crate - just stop and block
            if (charCenterX < crateCenterX) {
              this.character.x = crateBounds.x - charBounds.width / 2;
            } else {
              this.character.x = crateBounds.x + crateBounds.width + charBounds.width / 2;
            }
            horizontallyBlocked = true;
          }
        }
      }
    }

    // Handle sliding crates that weren't actively pushed this frame
    const slidingCrates = this.crateManager.getSlidingCrates();
    for (const crate of slidingCrates) {
      if (!activelyPushedCrates.has(crate)) {
        // Start auto-slide if not already auto-sliding
        if (!crate.isAutoSlidingToTarget()) {
          crate.startAutoSlide();
        }

        // Check if auto-slide is complete
        if (crate.hasReachedSlideTarget()) {
          const oldX = crate.x;
          const result = this.crateManager.completeAutoSlide(crate);

          // Move character with crate
          if (this.character) {
            const deltaX = result.newX - oldX;
            this.character.x += deltaX;
          }
        } else if (crate.isAutoSlidingToTarget() && this.character) {
          // Crate is still auto-sliding - move character with it
          // Character needs to maintain contact with crate
          const charBounds = this.character.getCollisionBounds();
          const crateBounds = crate.getCollisionBounds();
          const direction = crate.getSlideDirection();

          // Position character adjacent to crate
          if (direction > 0) {
            // Pushing right - character on left side
            this.character.x = crateBounds.x - charBounds.width / 2;
          } else {
            // Pushing left - character on right side
            this.character.x = crateBounds.x + crateBounds.width + charBounds.width / 2;
          }
        }
      }
    }
  }

  /**
   * Try to push a crate in the given direction
   * Returns true if push was successful
   *
   * Rule: Push from the LOWEST crate in the column that the character physically touches.
   * "Physically touches" = has vertical overlap with character's collision bounds.
   */
  private tryPushCrate(crate: import('../entities/Crate').Crate, direction: number): boolean {
    if (!this.character || !this.crateManager) {
      return false;
    }

    // Don't allow push if crate just stopped (wait for match check)
    if (!crate.canBePushed() && !crate.isFalling() && !crate.isSliding()) {
      return false;
    }

    const pushStrength = this.character.getPushStrength();
    const column = crate.getGridColumn();
    const crateRow = crate.getGridRow();

    // For falling crates, check if we can push them sideways
    if (crate.isFalling()) {
      return this.pushFallingCrate(crate, direction);
    }

    // Get character bounds for overlap checking
    const charBounds = this.character.getCollisionBounds();

    // Find the LOWEST crate in this column that the character physically touches
    // This is where we start pushing from
    let actualPushRow = crateRow;

    for (let row = crateRow - 1; row >= 0; row--) {
      const crateBelow = this.crateManager.getCrateAt(column, row);
      if (!crateBelow) break; // No crate below - stop searching

      // Check if character has vertical overlap with this crate
      const crateBelowBounds = crateBelow.getCollisionBounds();
      const hasVerticalOverlap =
        charBounds.y < crateBelowBounds.y + crateBelowBounds.height &&
        charBounds.y + charBounds.height > crateBelowBounds.y;

      if (hasVerticalOverlap) {
        actualPushRow = row; // Character touches this crate too - push from here
      } else {
        break; // Character doesn't touch this crate - stop searching
      }
    }

    // Build the stack of crates to push (from actualPushRow upward)
    const cratesToPush: import('../entities/Crate').Crate[] = [];
    for (let row = actualPushRow; row < 15; row++) {
      const crateAtRow = this.crateManager.getCrateAt(column, row);
      if (crateAtRow) {
        cratesToPush.push(crateAtRow);
      } else {
        break;
      }
    }

    // Check if stack is too heavy
    if (cratesToPush.length > pushStrength) {
      return false;
    }

    // Check if target column is free for all crates
    const targetColumn = column + direction;
    if (targetColumn < 0 || targetColumn >= DEFAULT_GRID_CONFIG.columns) {
      return false;
    }

    // Check if there's space in target column for all crates
    for (let i = 0; i < cratesToPush.length; i++) {
      const targetRow = actualPushRow + i;
      const existingCrate = this.crateManager.getCrateAt(targetColumn, targetRow);
      if (existingCrate) {
        return false; // Blocked
      }
    }

    // Push the crates
    this.crateManager.pushCrates(cratesToPush, direction);
    this.pendingLineCheck = true;

    return true;
  }

  /**
   * Push a falling crate sideways
   */
  private pushFallingCrate(crate: import('../entities/Crate').Crate, direction: number): boolean {
    if (!this.crateManager) {
      return false;
    }

    const currentColumn = crate.getGridColumn();
    const targetColumn = currentColumn + direction;

    // Check bounds
    if (targetColumn < 0 || targetColumn >= DEFAULT_GRID_CONFIG.columns) {
      return false;
    }

    // Check if there's a blocking crate in the target column at the same height or lower
    const crateY = crate.y;
    const crateSize = DEFAULT_GRID_CONFIG.cellWidth;

    // Get the height of the stack in target column
    const stackHeight = this.crateManager.getColumnHeight(targetColumn);
    if (stackHeight > 0) {
      const topOfStackY = this.crateManager.getRowTopY(stackHeight - 1);
      // If the falling crate would collide with the stack, don't allow push
      if (crateY >= topOfStackY - crateSize) {
        return false;
      }
    }

    // Check for other falling crates in the target column that would block
    const fallingCrates = this.crateManager.getFallingCrates();
    for (const other of fallingCrates) {
      if (other === crate) continue;
      if (other.getGridColumn() !== targetColumn) continue;

      // Check if they would overlap horizontally after the push
      const otherY = other.y;
      if (Math.abs(crateY - otherY) < crateSize) {
        return false;
      }
    }

    // Move the falling crate to the new column
    crate.setGridColumn(targetColumn);
    const newX = this.crateManager.getColumnCenterX(targetColumn);
    crate.setPosition(newX, crate.y);

    return true;
  }

  /**
   * Handle crate falling on character's head
   * Returns true if player survived (helmet or extra life), false if game over
   */
  private handleCrateFallingOnHead(): boolean {
    // Check for helmet protection first (single-use shield)
    if (this.specialBlockManager?.consumeHelmet()) {
      // Helmet saved us
      return true;
    }

    // Check for extra lives
    if (this.specialBlockManager?.consumeLife()) {
      // Extra life saved us, update HUD
      this.updateHUDLives();
      return true;
    }

    // No protection left - game over
    this.stateMachine.transition(GameState.GameOver);
    return false;
  }

  /**
   * Handle special block collision (activation when touched by falling block)
   */
  private handleSpecialBlockCollision(crate: import('../entities/Crate').Crate): void {
    if (!this.character || !this.specialBlockManager || !this.crateManager) {
      return;
    }

    // Activate the special block effect
    const result = this.specialBlockManager.activateBlock(crate, this.character);

    if (result?.activated) {
      // Get pending score from special blocks
      const pendingScore = this.specialBlockManager.getPendingScore();
      if (pendingScore > 0) {
        this.scoreManager.addSpecialBlockPoints();
      }

      // Remove the special block
      this.crateManager.removeCrate(crate);
    }
  }

  /**
   * Update crane manager and spawn crates
   */
  private updateCranes(deltaTime: number): void {
    if (!this.craneManager || !this.crateManager) {
      return;
    }

    const drops = this.craneManager.update(deltaTime);

    for (const drop of drops) {
      if (drop.attachedCrate) {
        // Use the crate that was attached to the crane (already has texture)
        const crate = drop.attachedCrate;
        const fallSpeed = this.levelManager.getCurrentFallSpeed();

        // Update crate with correct fall speed and column
        crate.setFallSpeed(fallSpeed);
        crate.setGridColumn(drop.column);

        // Position at drop point
        crate.setPosition(drop.dropX, drop.dropY);

        // Add to crate manager
        this.crateManager.addExistingCrate(crate);

        // Start falling
        crate.startFalling();
      }
    }
  }

  /**
   * Update crate physics (optimized - animations handled by CrateManager)
   */
  private updateCrates(deltaTime: number): void {
    if (!this.crateManager) {
      return;
    }

    // Update crate manager (includes clearing animation and auto-removal)
    this.crateManager.update(deltaTime);

    // Check for bomb explosions
    this.checkBombExplosions();

    // Check for line clears after crates land or after push
    // Only check when no crates are sliding (wait for push to complete)
    const slidingCrates = this.crateManager.getSlidingCrates();
    const landedCrates = this.crateManager.getLandedCrates();

    if (slidingCrates.length === 0 && (landedCrates.length > 0 || this.pendingLineCheck)) {
      this.checkLineClears();
      // Check for color matches (match-3 mechanics)
      this.checkColorMatches();
      this.pendingLineCheck = false;
    }
  }

  /**
   * Check for and process bomb explosions
   */
  private checkBombExplosions(): void {
    if (!this.crateManager) {
      return;
    }

    const result = this.crateManager.checkAndProcessBombs();

    if (result.exploded) {
      // Add points for explosion
      this.scoreManager.addPoints(result.points);

      // Check if character is in blast radius
      if (this.character && result.clearedCrates.length > 0) {
        this.checkCharacterInBlast(result.clearedCrates);
      }

      // Process gravity after explosion
      this.crateManager.processGravity();

      // Mark that we need to check for matches after gravity
      this.pendingLineCheck = true;
    }
  }

  /**
   * Check if character is in the blast radius of exploded crates
   */
  private checkCharacterInBlast(explodedCrates: import('../entities/Crate').Crate[]): void {
    if (!this.character || this.stateMachine.getState() === GameState.GameOver) {
      return;
    }

    const charBounds = this.character.getCollisionBounds();
    const blastRadius = DEFAULT_GRID_CONFIG.cellWidth; // 1 cell radius around each exploded crate

    for (const crate of explodedCrates) {
      const crateX = crate.x;
      const crateY = crate.y;

      // Calculate blast zone (3x3 cells around crate center)
      const blastLeft = crateX - blastRadius - DEFAULT_GRID_CONFIG.cellWidth / 2;
      const blastRight = crateX + blastRadius + DEFAULT_GRID_CONFIG.cellWidth / 2;
      const blastTop = crateY - blastRadius - DEFAULT_GRID_CONFIG.cellHeight / 2;
      const blastBottom = crateY + blastRadius + DEFAULT_GRID_CONFIG.cellHeight / 2;

      // Check if character overlaps with blast zone
      const charInBlast =
        charBounds.x < blastRight &&
        charBounds.x + charBounds.width > blastLeft &&
        charBounds.y < blastBottom &&
        charBounds.y + charBounds.height > blastTop;

      if (charInBlast) {
        // Character hit by explosion - try to survive
        const survived = this.handleBombExplosionHit();
        if (!survived) {
          return; // Game over
        }
        // Only consume one life per explosion event
        return;
      }
    }
  }

  /**
   * Handle character hit by bomb explosion
   * Returns true if survived, false if game over
   * Note: Only extra lives protect from bomb explosions (helmet doesn't help)
   */
  private handleBombExplosionHit(): boolean {
    // Only extra lives protect from bomb explosions
    if (this.specialBlockManager?.consumeLife()) {
      this.updateHUDLives();
      return true;
    }

    // No extra lives - game over
    this.stateMachine.transition(GameState.GameOver);
    return false;
  }

  /**
   * Check for color matches (3/4/5 in a row)
   */
  private checkColorMatches(): void {
    if (!this.crateManager) {
      return;
    }

    const result = this.crateManager.detectAndClearMatches();

    if (result.matchesFound > 0) {
      // Add points for matches
      this.scoreManager.addPoints(result.points);

      // Process gravity after clearing matches
      this.crateManager.processGravity();

      // Check for cascading matches (matches created by falling crates)
      // This creates a chain reaction effect
      this.pendingLineCheck = true;
    }
  }

  /**
   * Check line clears (optimized - no setTimeout, animation handled by Crate)
   */
  private checkLineClears(): void {
    if (!this.crateManager) {
      return;
    }

    const result = this.crateManager.clearCompleteRowsWithPoints();

    if (result.linesCleared > 0) {
      // Add score
      this.scoreManager.addLineClearPoints(result.linesCleared);

      // Update level progress
      this.levelManager.addLinesCleared(result.linesCleared);

      // Process gravity after clearing animation starts
      // The crates will be removed automatically by CrateManager when animation completes
      this.crateManager.processGravity();
    }
  }

  /**
   * Check collisions between character and special blocks
   */
  private checkCollisions(): void {
    if (!this.character || !this.crateManager || !this.specialBlockManager) {
      return;
    }

    const crates = this.crateManager.getAllCrates();
    const result = this.specialBlockManager.checkAndActivateCollision(this.character, crates);

    if (result?.activated) {
      // Get pending score from special blocks
      const pendingScore = this.specialBlockManager.getPendingScore();
      if (pendingScore > 0) {
        this.scoreManager.addSpecialBlockPoints();
      }

      // Check for character unlocks based on score
      this.unlockManager.checkAndUnlock({
        level: this.levelManager.getCurrentLevel(),
        score: this.scoreManager.getScore(),
      });
    }
  }

  /**
   * Check game over condition
   */
  private checkGameOverCondition(): void {
    if (!this.crateManager) {
      return;
    }

    if (this.crateManager.hasReachedTop()) {
      // Check for helmet protection first
      if (this.specialBlockManager?.consumeHelmet()) {
        // Helmet consumed, clear some crates from top
        return;
      }

      // Check for extra lives
      if (this.specialBlockManager?.consumeLife()) {
        // Life consumed, update HUD and continue
        this.updateHUDLives();
        return;
      }

      // Game over - no lives remaining
      this.stateMachine.transition(GameState.GameOver);
    }
  }

  /**
   * Advance to next level
   */
  advanceToNextLevel(): void {
    if (this.levelManager.advanceToNextLevel()) {
      this.updateHUDLevel();
      this.updateHUDLines();

      // Update crane count and speed for new level
      if (this.craneManager) {
        this.craneManager.initializeCranes(this.levelManager.getCurrentCraneCount());
        this.craneManager.setSpawnInterval(
          2000 / this.levelManager.getCurrentCrateSpeedMultiplier()
        );
      }
    }
  }

  /**
   * Called when scene becomes active
   */
  override onEnter(): void {
    super.onEnter();

    // Add keyboard listener for pause
    this.keydownHandler = this.handleKeydown;
    window.addEventListener('keydown', this.keydownHandler);

    // Add resize listener for mobile controls
    this.resizeHandler = () => this.checkMobileViewport();
    window.addEventListener('resize', this.resizeHandler);

    // Check mobile viewport
    this.checkMobileViewport();
  }

  /**
   * Called when scene becomes inactive
   */
  override onExit(): void {
    super.onExit();

    // Remove keyboard listener
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    // Remove resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Pause game when leaving
    if (this.isGameRunning) {
      this.pauseGame();
    }
  }

  /**
   * Update palette colors
   */
  updatePalette(): void {
    const colors = this.lcdEffect.getPaletteColors();

    // Update background
    const background = this.backgroundLayer.getChildAt(0) as Graphics;
    if (background) {
      background.clear();
      background.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      background.fill({ color: colors.background });
    }

    // Recreate header background with new colors
    this.createHeaderBackground(colors);

    // Recreate environment with new colors (rail must be ON TOP of header)
    this.createEnvironment();

    // Recreate dithering with new colors
    this.createSpawnZoneDithering(colors);

    // Update HUD text colors - use background (light) color on dark header
    if (this.scoreText) {
      this.scoreText.style.fill = colors.background;
    }
    if (this.levelText) {
      this.levelText.style.fill = colors.background;
    }
    if (this.linesText) {
      this.linesText.style.fill = colors.background;
    }
    if (this.livesText) {
      this.livesText.style.fill = colors.background;
    }

    // Recreate pause overlay with new colors
    const wasPauseVisible = this.isPauseVisible;
    if (this.pauseOverlay) {
      this.pauseLayer.removeChild(this.pauseOverlay);
      this.pauseOverlay.destroy({ children: true });
      this.pauseOverlay = null;
    }
    this.createPauseOverlay(colors);
    if (wasPauseVisible) {
      this.showPauseOverlay();
    }

    // Update character sprite using animation system
    if (this.character && this.assetLoader) {
      const frame = this.character.getCurrentAnimationFrame();
      const texture = this.assetLoader.getCharacterAnimationSprite(
        frame,
        this.lcdEffect.getCurrentPalette()
      );
      if (texture) {
        this.character.texture = texture;
      }
    }

    // Update crane textures to inverted version (closed and open hooks)
    if (this.craneManager && this.assetLoader) {
      const closedTexture = this.assetLoader.getInvertedCraneSprite(
        this.lcdEffect.getCurrentPalette()
      );
      const openTexture = this.assetLoader.getInvertedCraneOpenSprite(
        this.lcdEffect.getCurrentPalette()
      );
      if (closedTexture && openTexture) {
        this.craneManager.setCraneTextures(closedTexture, openTexture);
      }
    }
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return this.stateMachine.getState();
  }

  /**
   * Get current score
   */
  getScore(): number {
    return this.scoreManager.getScore();
  }

  /**
   * Get current level
   */
  getLevel(): number {
    return this.levelManager.getCurrentLevel();
  }

  /**
   * Get unlocked character IDs
   */
  getUnlockedCharacterIds(): number[] {
    return this.unlockManager.getUnlockedCharacterIds();
  }

  /**
   * Check if game is running
   */
  isPlaying(): boolean {
    return this.isGameRunning;
  }

  /**
   * Check if game is paused
   */
  isPaused(): boolean {
    return this.isPauseVisible;
  }

  /**
   * Reset the scene for reuse
   */
  reset(): void {
    this.clearGameEntities();
    this.scoreManager.reset();
    this.levelManager.reset();
    this.unlockManager.reset();
    this.stateMachine.reset();
    this.isGameRunning = false;
    this.isPauseVisible = false;
    this.pendingLineCheck = false;
    this.hidePauseOverlay();
    this.updateHUD();
  }

  /**
   * Destroy the scene
   */
  override destroy(): void {
    // Remove event listeners
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    // Clear entities
    this.clearGameEntities();

    // Clear environment
    if (this.environmentContainer) {
      this.environmentContainer.destroy({ children: true });
      this.environmentContainer = null;
    }

    // Clear header background
    if (this.headerBackground) {
      this.headerBackground.destroy();
      this.headerBackground = null;
    }

    // Clear listeners
    this.scoreManager.removeAllListeners();
    this.levelManager.clearListeners();
    this.stateMachine.clearListeners();

    // Destroy layers
    this.backgroundLayer.destroy({ children: true });
    this.gameLayer.destroy({ children: true });
    this.crateLayer.destroy({ children: true });
    this.characterLayer.destroy({ children: true });
    this.uiLayer.destroy({ children: true });
    this.hudLayer.destroy({ children: true });
    this.pauseLayer.destroy({ children: true });
    this.mobileControlsLayer.destroy({ children: true });

    this.callbacks = null;

    super.destroy();
  }
}
