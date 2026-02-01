/**
 * Loading Scene
 * Displays a loading screen during asset preloading before game starts.
 * Shows progress bar and loading text with LCD aesthetic.
 */

import { Graphics, Text, TextStyle, Container, Sprite, Application, RenderTexture } from 'pixi.js';
import { Scene } from './Scene';
import { SceneType } from '../types/game';
import { generateLogoSprite, getLogoDimensions } from '../utils/SpriteGenerator';

// Game area constants
const LOGICAL_WIDTH = 240;
const LOGICAL_HEIGHT = 320;

export class LoadingScene extends Scene {
  // UI elements
  private background: Graphics | null = null;
  private loadingText: Text | null = null;
  private progressBarBg: Graphics | null = null;
  private progressBarFill: Graphics | null = null;
  private statusText: Text | null = null;
  private percentageText: Text | null = null;
  private logoSprite: Sprite | null = null;
  private logoTexture: RenderTexture | null = null;

  // App reference for sprite generation
  private app: Application | null = null;

  // Loading state
  private progress: number = 0;
  private targetProgress: number = 0;
  private loadingComplete: boolean = false;
  private onLoadComplete: (() => void) | null = null;

  // Animation state
  private dotCount: number = 0;
  private dotTimer: number = 0;

  // Colors (default blue palette)
  private colors = {
    background: 0x0a1628,
    foreground: 0x4a9eff,
    accent: 0x7fbfff,
  };

  constructor() {
    super(SceneType.Loading);
  }

  /**
   * Set the app reference for sprite generation
   */
  setApp(app: Application): void {
    this.app = app;
  }

  /**
   * Set the colors for the loading scene
   */
  setColors(colors: { background: number; foreground: number; accent: number }): void {
    this.colors = colors;
  }

  /**
   * Set the callback for when loading is complete
   */
  setOnLoadComplete(callback: () => void): void {
    this.onLoadComplete = callback;
  }

  /**
   * Create the scene content
   */
  protected async onCreate(): Promise<void> {
    // Create background
    this.background = new Graphics();
    this.background.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.background.fill({ color: this.colors.background });
    this.container.addChild(this.background);

    // Create game title logo sprite
    if (this.app) {
      const paletteColors = {
        foreground: this.colors.foreground,
        background: this.colors.background,
        accent: this.colors.accent,
        glow: this.colors.accent,
      };

      // Generate logo at scale 2 for better visibility
      this.logoTexture = generateLogoSprite(paletteColors, this.app, 2);
      this.logoSprite = new Sprite(this.logoTexture);
      this.logoSprite.anchor.set(0.5);
      this.logoSprite.position.set(LOGICAL_WIDTH / 2, 75);

      // Scale down to fit the loading screen nicely (logo is 150*2 = 300 wide)
      const targetWidth = 200;
      const logoDims = getLogoDimensions();
      const scale = targetWidth / (logoDims.width * 2);
      this.logoSprite.scale.set(scale);

      this.container.addChild(this.logoSprite);
    } else {
      // Fallback to text if app not available
      const titleStyle = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 16,
        fill: this.colors.foreground,
        align: 'center',
        fontWeight: 'bold',
        letterSpacing: 1,
      });

      const title = new Text({
        text: 'STACK ATTACK\n2 PRO',
        style: titleStyle,
      });
      title.anchor.set(0.5);
      title.position.set(LOGICAL_WIDTH / 2, 80);
      this.container.addChild(title);
    }

    // Create loading text
    this.loadingText = new Text({
      text: 'LOADING',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 12,
        fill: this.colors.foreground,
        align: 'center',
      }),
    });
    this.loadingText.anchor.set(0.5);
    this.loadingText.position.set(LOGICAL_WIDTH / 2, 160);
    this.container.addChild(this.loadingText);

    // Create progress bar background
    const barWidth = 160;
    const barHeight = 16;
    const barX = (LOGICAL_WIDTH - barWidth) / 2;
    const barY = 185;

    this.progressBarBg = new Graphics();
    this.progressBarBg.rect(barX, barY, barWidth, barHeight);
    this.progressBarBg.fill({ color: this.colors.background });
    this.progressBarBg.stroke({ color: this.colors.foreground, width: 2 });
    this.container.addChild(this.progressBarBg);

    // Create progress bar fill
    this.progressBarFill = new Graphics();
    this.progressBarFill.position.set(barX + 2, barY + 2);
    this.container.addChild(this.progressBarFill);

    // Create percentage text
    this.percentageText = new Text({
      text: '0%',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: this.colors.foreground,
        align: 'center',
      }),
    });
    this.percentageText.anchor.set(0.5);
    this.percentageText.position.set(LOGICAL_WIDTH / 2, barY + barHeight + 15);
    this.container.addChild(this.percentageText);

    // Create status text
    this.statusText = new Text({
      text: 'Initializing...',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 9,
        fill: this.colors.foreground,
        align: 'center',
      }),
    });
    this.statusText.anchor.set(0.5);
    this.statusText.position.set(LOGICAL_WIDTH / 2, 240);
    this.container.addChild(this.statusText);

    // Create decorative pixel art elements
    this.createDecorativeElements();
  }

  /**
   * Create decorative pixel art elements for visual interest
   */
  private createDecorativeElements(): void {
    const decorContainer = new Container();

    // Draw some pixel art crates in the background
    const crateSize = 8;
    const positions = [
      { x: 30, y: 280 },
      { x: 200, y: 275 },
      { x: 60, y: 290 },
      { x: 170, y: 285 },
    ];

    positions.forEach((pos) => {
      const crate = new Graphics();
      crate.rect(0, 0, crateSize, crateSize);
      crate.fill({ color: this.colors.foreground, alpha: 0.3 });
      crate.stroke({ color: this.colors.foreground, width: 1, alpha: 0.5 });
      crate.position.set(pos.x, pos.y);
      decorContainer.addChild(crate);
    });

    this.container.addChild(decorContainer);
  }

  /**
   * Update progress bar
   */
  setProgress(progress: number, status?: string): void {
    this.targetProgress = Math.min(1, Math.max(0, progress));

    if (status && this.statusText) {
      this.statusText.text = status;
    }
  }

  /**
   * Mark loading as complete
   */
  completeLoading(): void {
    this.targetProgress = 1;
    this.loadingComplete = true;

    if (this.statusText) {
      this.statusText.text = 'Press any key to start';
    }
    if (this.loadingText) {
      this.loadingText.text = 'READY!';
    }
  }

  /**
   * Update scene animation
   */
  override update(deltaTime: number): void {
    // Animate progress bar smoothly
    if (this.progress < this.targetProgress) {
      this.progress = Math.min(this.targetProgress, this.progress + deltaTime * 2);
      this.updateProgressBar();
    }

    // Animate loading dots
    if (!this.loadingComplete) {
      this.dotTimer += deltaTime;
      if (this.dotTimer >= 0.5) {
        this.dotTimer = 0;
        this.dotCount = (this.dotCount + 1) % 4;
        if (this.loadingText) {
          this.loadingText.text = 'LOADING' + '.'.repeat(this.dotCount);
        }
      }
    }
  }

  /**
   * Update the progress bar fill
   */
  private updateProgressBar(): void {
    if (!this.progressBarFill) return;

    const barWidth = 156; // Inner width (160 - 4 for border)
    const barHeight = 12; // Inner height (16 - 4 for border)
    const fillWidth = barWidth * this.progress;

    this.progressBarFill.clear();
    if (fillWidth > 0) {
      this.progressBarFill.rect(0, 0, fillWidth, barHeight);
      this.progressBarFill.fill({ color: this.colors.accent });
    }

    if (this.percentageText) {
      this.percentageText.text = `${Math.round(this.progress * 100)}%`;
    }
  }

  /**
   * Handle keyboard input to skip loading
   */
  private handleKeyPress = (event: KeyboardEvent): void => {
    if (this.loadingComplete && this.onLoadComplete) {
      event.preventDefault();
      this.onLoadComplete();
    }
  };

  /**
   * Handle touch/click to skip loading
   */
  private handlePointerDown = (): void => {
    if (this.loadingComplete && this.onLoadComplete) {
      this.onLoadComplete();
    }
  };

  /**
   * Called when scene becomes active
   */
  override onEnter(): void {
    super.onEnter();
    window.addEventListener('keydown', this.handleKeyPress);
    window.addEventListener('pointerdown', this.handlePointerDown);
  }

  /**
   * Called when scene becomes inactive
   */
  override onExit(): void {
    super.onExit();
    window.removeEventListener('keydown', this.handleKeyPress);
    window.removeEventListener('pointerdown', this.handlePointerDown);
  }

  /**
   * Update colors (for palette support)
   */
  updatePalette(colors: { background: number; foreground: number; accent: number }): void {
    this.colors = colors;

    if (this.background) {
      this.background.clear();
      this.background.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      this.background.fill({ color: colors.background });
    }

    // Update logo sprite with new palette colors
    if (this.app && this.logoSprite) {
      const paletteColors = {
        foreground: colors.foreground,
        background: colors.background,
        accent: colors.accent,
        glow: colors.accent,
      };

      // Destroy old texture
      if (this.logoTexture) {
        this.logoTexture.destroy();
      }

      // Generate new logo with updated colors
      this.logoTexture = generateLogoSprite(paletteColors, this.app, 2);
      this.logoSprite.texture = this.logoTexture;
    }

    if (this.loadingText) {
      this.loadingText.style.fill = colors.foreground;
    }

    if (this.progressBarBg) {
      this.progressBarBg.clear();
      const barWidth = 160;
      const barHeight = 16;
      const barX = (LOGICAL_WIDTH - barWidth) / 2;
      const barY = 185;
      this.progressBarBg.rect(barX, barY, barWidth, barHeight);
      this.progressBarBg.fill({ color: colors.background });
      this.progressBarBg.stroke({ color: colors.foreground, width: 2 });
    }

    if (this.percentageText) {
      this.percentageText.style.fill = colors.foreground;
    }

    if (this.statusText) {
      this.statusText.style.fill = colors.foreground;
    }

    this.updateProgressBar();
  }

  /**
   * Reset the scene
   */
  reset(): void {
    this.progress = 0;
    this.targetProgress = 0;
    this.loadingComplete = false;
    this.dotCount = 0;
    this.dotTimer = 0;

    if (this.loadingText) {
      this.loadingText.text = 'LOADING';
    }
    if (this.statusText) {
      this.statusText.text = 'Initializing...';
    }
    this.updateProgressBar();
  }

  /**
   * Destroy the scene
   */
  override destroy(): void {
    window.removeEventListener('keydown', this.handleKeyPress);
    window.removeEventListener('pointerdown', this.handlePointerDown);

    // Clean up logo texture
    if (this.logoTexture) {
      this.logoTexture.destroy();
      this.logoTexture = null;
    }

    this.onLoadComplete = null;
    this.app = null;

    super.destroy();
  }
}
