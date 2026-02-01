import { Application, Graphics, Sprite } from 'pixi.js';
import './style.css';
import { LCDEffect, ColorPalette } from './systems/LCDEffect';
import { DisplayScaler } from './systems/DisplayScaler';
import { PixelGridGenerator } from './utils/PixelGridGenerator';
import { AssetLoader } from './utils/AssetLoader';
import { SceneManager } from './systems/SceneManager';
import { InputManager } from './systems/InputManager';
import { LoadingScene } from './scenes/LoadingScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LevelTransitionScene } from './scenes/LevelTransitionScene';
import { SceneType, InputAction } from './types/game';
import { getInitialUnlockedIds } from './config/characters';

const LOGICAL_WIDTH = 224; // 12 columns × 16px + 16px walls × 2 = 224px
const LOGICAL_HEIGHT = 320;
const BASE_SCALE = 1.5; // Scale up display for better visibility

// Global instances
let lcdEffect: LCDEffect;
let displayScaler: DisplayScaler;
let assetLoader: AssetLoader;
let sceneManager: SceneManager;
let inputManager: InputManager;

// Performance tracking
let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 60;

// Session state for character selection and game progress
let sessionState = {
  selectedCharacterId: 1,
  unlockedCharacterIds: getInitialUnlockedIds(),
  currentScore: 0,
  currentLevel: 1,
};

/**
 * Initialize the game with loading screen
 */
async function initializeGame() {
  // Initialize LCD effect system
  lcdEffect = new LCDEffect(ColorPalette.Blue);
  displayScaler = new DisplayScaler(LOGICAL_WIDTH, LOGICAL_HEIGHT);

  const app = new Application();

  // Get initial background color from LCD effect
  const colors = lcdEffect.getPaletteColors();

  await app.init({
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    backgroundColor: colors.background,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: false,
    // Performance optimizations
    powerPreference: 'high-performance',
    hello: false, // Disable PixiJS hello message
  });

  const gameContainer = document.getElementById('app');
  if (!gameContainer) {
    throw new Error('Game container element not found');
  }

  // Create frame wrapper for LCD bezel effect
  const frame = document.createElement('div');
  frame.className = 'game-frame';
  frame.appendChild(app.canvas);
  gameContainer.appendChild(frame);

  // Set pixel-perfect rendering
  app.canvas.style.imageRendering = 'pixelated';
  app.canvas.style.imageRendering = 'crisp-edges';

  // Create background layer
  const background = new Graphics();
  lcdEffect.applyBackgroundColor(background, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  app.stage.addChild(background);

  // Create glow layer for backlight effect
  const glowLayer = lcdEffect.createGlowLayer(LOGICAL_WIDTH, LOGICAL_HEIGHT);
  app.stage.addChild(glowLayer);

  // Initialize scene manager first
  sceneManager = new SceneManager(app);

  // Create and show loading scene immediately
  const loadingScene = new LoadingScene();
  loadingScene.setColors(colors);
  sceneManager.registerScene(loadingScene);

  // Create dot-matrix overlay
  const gridTexture = PixelGridGenerator.generate(LOGICAL_WIDTH, LOGICAL_HEIGHT, 2, 0.1);
  const gridOverlay = new Sprite(gridTexture);
  gridOverlay.alpha = 0.3;
  app.stage.addChild(gridOverlay);

  // Handle resize
  handleResize(app);
  window.addEventListener('resize', () => handleResize(app));

  // Set up game loop
  app.ticker.add((ticker) => {
    const deltaTime = ticker.deltaTime / 60; // Normalize to seconds

    // Update FPS counter
    updateFpsCounter();

    // Update scene manager
    sceneManager.update(deltaTime);
  });

  // Show loading scene
  await sceneManager.push(SceneType.Loading);
  loadingScene.setProgress(0.1, 'Initializing systems...');

  // Load assets with progress updates
  assetLoader = new AssetLoader(app);
  loadingScene.setProgress(0.2, 'Loading sprites...');

  const blueColors = lcdEffect.getColorsForPalette(ColorPalette.Blue);
  const amberColors = lcdEffect.getColorsForPalette(ColorPalette.Amber);

  // Simulate loading stages for better UX
  await new Promise((resolve) => setTimeout(resolve, 100));
  loadingScene.setProgress(0.4, 'Generating character sprites...');

  await assetLoader.load(blueColors, amberColors);
  loadingScene.setProgress(0.6, 'Setting up game systems...');

  // Initialize input manager
  inputManager = new InputManager();
  inputManager.initialize();

  // Set up HTML mobile controls
  setupMobileControls();

  loadingScene.setProgress(0.7, 'Creating scenes...');

  // Create and register all scenes
  await createAndRegisterScenes(loadingScene, background);

  loadingScene.setProgress(1.0, 'Ready!');
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Mark loading complete
  loadingScene.completeLoading();
  loadingScene.setOnLoadComplete(async () => {
    // Transition to main menu
    await sceneManager.replace(SceneType.MainMenu);
  });

  // Load palette preference from session
  const savedPalette = sessionStorage.getItem('lcdPalette') as ColorPalette;
  if (savedPalette && Object.values(ColorPalette).includes(savedPalette)) {
    lcdEffect.setPalette(savedPalette);
  }
}

/**
 * Create and register all game scenes
 */
async function createAndRegisterScenes(
  loadingScene: LoadingScene,
  background: Graphics
): Promise<void> {
  // Create scenes
  const mainMenuScene = new MainMenuScene(lcdEffect);
  const settingsScene = new SettingsScene(lcdEffect);
  const gameScene = new GameScene(lcdEffect);
  const gameOverScene = new GameOverScene(lcdEffect);
  const levelTransitionScene = new LevelTransitionScene(lcdEffect);

  loadingScene.setProgress(0.75, 'Registering scenes...');

  // Register scenes
  sceneManager.registerScene(mainMenuScene);
  sceneManager.registerScene(settingsScene);
  sceneManager.registerScene(gameScene);
  sceneManager.registerScene(gameOverScene);
  sceneManager.registerScene(levelTransitionScene);

  loadingScene.setProgress(0.8, 'Configuring game logic...');

  // Set up game scene
  gameScene.setAssetLoader(assetLoader);
  gameScene.setInputManager(inputManager);
  gameScene.setCallbacks({
    onGameOver: async (score: number, level: number) => {
      sessionState.currentScore = score;
      sessionState.currentLevel = level;
      gameOverScene.setFinalScore(score);
      gameOverScene.setHighestLevel(level);
      await sceneManager.replace(SceneType.GameOver);
    },
    onLevelComplete: async (level: number, score: number, unlocks: number[]) => {
      sessionState.currentScore = score;
      sessionState.currentLevel = level + 1;

      // Add any new unlocks to session state
      for (const unlockId of unlocks) {
        if (!sessionState.unlockedCharacterIds.includes(unlockId)) {
          sessionState.unlockedCharacterIds.push(unlockId);
        }
      }

      levelTransitionScene.setLevelInfo(level, score, unlocks);
      await sceneManager.push(SceneType.LevelTransition);
    },
    onQuitToMenu: async () => {
      await sceneManager.replace(SceneType.MainMenu);
    },
  });

  loadingScene.setProgress(0.85, 'Setting up transitions...');

  // Set up level transition scene
  levelTransitionScene.setOnContinue(async () => {
    await sceneManager.pop();
    // Advance to next level in game scene
    const currentGameScene = sceneManager.getScene(SceneType.Game) as GameScene;
    if (currentGameScene) {
      currentGameScene.advanceToNextLevel();
    }
  });

  // Set up game over scene
  gameOverScene.setOnPlayAgain(async () => {
    // Reset session state
    sessionState.currentScore = 0;
    sessionState.currentLevel = 1;
    sessionState.unlockedCharacterIds = getInitialUnlockedIds();

    // Reset and start new game
    gameScene.reset();
    await sceneManager.replace(SceneType.Game);
    gameScene.initializeGame(sessionState.selectedCharacterId);
  });

  gameOverScene.setOnMainMenu(async () => {
    // Reset session state
    sessionState.currentScore = 0;
    sessionState.currentLevel = 1;
    sessionState.unlockedCharacterIds = getInitialUnlockedIds();

    gameScene.reset();
    await sceneManager.replace(SceneType.MainMenu);
  });

  loadingScene.setProgress(0.95, 'Finalizing...');

  // Set up scene callbacks
  mainMenuScene.setOnAction(async (action) => {
    switch (action) {
      case 'playGame':
        // Update game scene with current session state
        gameScene.setUnlockedCharacterIds(sessionState.unlockedCharacterIds);
        await sceneManager.push(SceneType.Game);
        gameScene.initializeGame(sessionState.selectedCharacterId);
        break;
      case 'settings':
        await sceneManager.push(SceneType.Settings);
        break;
    }
  });

  settingsScene.setOnBack(() => {
    sceneManager.pop();
  });

  // Listen for palette changes
  lcdEffect.on('paletteChanged', (_palette: ColorPalette) => {
    const newColors = lcdEffect.getPaletteColors();
    sceneManager.getApp()!.renderer.background.color = newColors.background;
    lcdEffect.applyBackgroundColor(background, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    lcdEffect.updateGlowLayer(LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Update all scenes with new palette
    mainMenuScene.updatePalette();
    settingsScene.updatePalette();
    gameScene.updatePalette();
    gameOverScene.updatePalette();
    levelTransitionScene.updatePalette();

    // Update HTML mobile controls palette
    updateMobileControlsPalette(_palette);

    // Store palette preference in session
    sessionStorage.setItem('lcdPalette', _palette);
  });
}

/**
 * Set up HTML mobile controls and wire them to InputManager
 */
function setupMobileControls(): void {
  const mobileControls = document.getElementById('mobile-controls');
  const leftBtn = document.getElementById('btn-left');
  const rightBtn = document.getElementById('btn-right');
  const jumpBtn = document.getElementById('btn-jump');
  const pauseBtn = document.getElementById('btn-pause');

  if (!mobileControls || !leftBtn || !rightBtn || !jumpBtn || !pauseBtn) {
    console.warn('Mobile controls not found in DOM');
    return;
  }

  // Helper to handle press/release for movement buttons
  const setupButton = (
    btn: HTMLElement,
    action: InputAction,
    _name: string
  ) => {
    const handlePress = (e: Event) => {
      e.preventDefault();
      btn.classList.add('pressed');
      inputManager.triggerAction(action, true);
    };

    const handleRelease = (e: Event) => {
      e.preventDefault();
      btn.classList.remove('pressed');
      inputManager.triggerAction(action, false);
    };

    // Touch events
    btn.addEventListener('touchstart', handlePress, { passive: false });
    btn.addEventListener('touchend', handleRelease, { passive: false });
    btn.addEventListener('touchcancel', handleRelease, { passive: false });

    // Mouse events (for testing in browser)
    btn.addEventListener('mousedown', handlePress);
    btn.addEventListener('mouseup', handleRelease);
    btn.addEventListener('mouseleave', handleRelease);
  };

  // Helper for single-tap buttons (pause)
  const setupTapButton = (btn: HTMLElement, action: InputAction) => {
    const handleTap = (e: Event) => {
      e.preventDefault();
      btn.classList.add('pressed');
      inputManager.triggerAction(action, true);
      // Reset action after brief delay
      setTimeout(() => {
        btn.classList.remove('pressed');
        inputManager.triggerAction(action, false);
      }, 100);
    };

    btn.addEventListener('touchstart', handleTap, { passive: false });
    btn.addEventListener('click', handleTap);
  };

  setupButton(leftBtn, InputAction.MoveLeft, 'left');
  setupButton(rightBtn, InputAction.MoveRight, 'right');
  setupButton(jumpBtn, InputAction.Jump, 'jump');
  setupTapButton(pauseBtn, InputAction.Pause);
}

/**
 * Update mobile controls color palette
 */
function updateMobileControlsPalette(palette: ColorPalette): void {
  const mobileControls = document.getElementById('mobile-controls');
  if (!mobileControls) return;

  // Toggle amber class based on palette
  if (palette === ColorPalette.Amber) {
    mobileControls.classList.add('amber');
  } else {
    mobileControls.classList.remove('amber');
  }
}

/**
 * Handle window resize with optimized debouncing
 */
let resizeTimeout: number | null = null;

function handleResize(app: Application) {
  // Cancel any pending resize
  if (resizeTimeout) {
    window.clearTimeout(resizeTimeout);
  }

  // Debounce resize for performance
  resizeTimeout = window.setTimeout(() => {
    const canvas = app.canvas;
    const parent = canvas.parentElement;
    if (!parent) return;

    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;

    // Scale to fill viewport, but at minimum use BASE_SCALE for larger display
    const fitScale = Math.min(parentWidth / LOGICAL_WIDTH, parentHeight / LOGICAL_HEIGHT);
    const scale = Math.max(fitScale, BASE_SCALE);

    const scaledWidth = LOGICAL_WIDTH * scale;
    const scaledHeight = LOGICAL_HEIGHT * scale;

    canvas.style.width = `${scaledWidth}px`;
    canvas.style.height = `${scaledHeight}px`;
  }, 16); // ~60fps debounce
}

/**
 * Update FPS counter (for debugging/profiling)
 */
function updateFpsCounter(): void {
  frameCount++;
  const now = performance.now();

  if (now - lastFpsUpdate >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;

    // Log FPS in development mode only
    if (import.meta.env.DEV && currentFps < 55) {
      console.warn(`FPS drop detected: ${currentFps}`);
    }
  }
}

/**
 * Get the LCD effect instance
 */
export function getLCDEffect(): LCDEffect {
  return lcdEffect;
}

/**
 * Get the display scaler instance
 */
export function getDisplayScaler(): DisplayScaler {
  return displayScaler;
}

/**
 * Get the asset loader instance
 */
export function getAssetLoader(): AssetLoader {
  return assetLoader;
}

/**
 * Get the scene manager instance
 */
export function getSceneManager(): SceneManager {
  return sceneManager;
}

/**
 * Get the input manager instance
 */
export function getInputManager(): InputManager {
  return inputManager;
}

/**
 * Get session state (for external access)
 */
export function getSessionState() {
  return sessionState;
}

/**
 * Update session state (for external access)
 */
export function updateSessionState(updates: Partial<typeof sessionState>) {
  sessionState = { ...sessionState, ...updates };
}

/**
 * Get current FPS (for monitoring)
 */
export function getCurrentFps(): number {
  return currentFps;
}

initializeGame().catch((error) => {
  console.error('Failed to initialize game:', error);
});
