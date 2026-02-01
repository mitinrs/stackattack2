/**
 * LCDEffect - Manages LCD backlight effect and color palettes
 *
 * Provides Blue and Amber color palettes with pronounced backlight glow effect
 * to simulate authentic Siemens LCD screen aesthetic.
 */

import { Graphics } from 'pixi.js';
import EventEmitter from 'eventemitter3';

export type ColorPalette = 'blue' | 'amber';
export const ColorPalette = {
  Blue: 'blue' as ColorPalette,
  Amber: 'amber' as ColorPalette,
};

export interface PaletteColors {
  background: number;
  foreground: number;
  accent: number;
  glow: number;
}

// Blue LCD palette - authentic backlit LCD style (bright cyan background, dark pixels)
const BLUE_PALETTE: PaletteColors = {
  background: 0x6eb8d4, // Cyan/turquoise backlit LCD background (like Siemens)
  foreground: 0x0a1018, // Near-black for game elements
  accent: 0x3a5a6a, // Dark gray-blue for mid-tones
  glow: 0x8ed0e8, // Lighter cyan for center glow
};

// Amber LCD palette - authentic backlit LCD style (like Nokia 3310)
const AMBER_PALETTE: PaletteColors = {
  background: 0xc8b898, // Greenish-gray LCD background (classic Nokia style)
  foreground: 0x1a1810, // Near-black for game elements
  accent: 0x5a5848, // Dark gray for mid-tones
  glow: 0xd8c8a8, // Lighter for center glow
};

export class LCDEffect extends EventEmitter {
  private currentPalette: ColorPalette;
  private glowLayer: Graphics | null = null;

  constructor(initialPalette: ColorPalette = ColorPalette.Blue) {
    super();
    this.currentPalette = initialPalette;
  }

  /**
   * Get the current active palette
   */
  getCurrentPalette(): ColorPalette {
    return this.currentPalette;
  }

  /**
   * Set the active color palette
   */
  setPalette(palette: ColorPalette): void {
    if (this.currentPalette !== palette) {
      this.currentPalette = palette;
      this.emit('paletteChanged', palette);
    }
  }

  /**
   * Get the colors for the current palette
   */
  getPaletteColors(): PaletteColors {
    return this.currentPalette === ColorPalette.Blue ? BLUE_PALETTE : AMBER_PALETTE;
  }

  /**
   * Get colors for a specific palette
   */
  getColorsForPalette(palette: ColorPalette): PaletteColors {
    return palette === ColorPalette.Blue ? BLUE_PALETTE : AMBER_PALETTE;
  }

  /**
   * Create a glow layer for the backlight effect
   */
  createGlowLayer(width: number, height: number): Graphics {
    this.glowLayer = new Graphics();
    this.updateGlowLayer(width, height);
    return this.glowLayer;
  }

  /**
   * Update the glow layer with current palette
   * Creates authentic LCD backlight effect - bright center, darker edges (vignette)
   */
  updateGlowLayer(width: number, height: number): void {
    if (!this.glowLayer) return;

    const colors = this.getPaletteColors();
    this.glowLayer.clear();

    // Create vignette effect - darker edges simulate uneven LCD backlight
    // Outer dark ring
    this.glowLayer.rect(0, 0, width, height);
    this.glowLayer.fill({ color: 0x000000, alpha: 0.12 });

    // Inner lighter area (center is brighter)
    this.glowLayer.circle(width / 2, height / 2, Math.max(width, height) * 0.7);
    this.glowLayer.fill({ color: colors.glow, alpha: 0.08 });

    // Center brightest spot
    this.glowLayer.circle(width / 2, height / 2, Math.max(width, height) * 0.4);
    this.glowLayer.fill({ color: colors.glow, alpha: 0.05 });
  }

  /**
   * Apply palette to a container's background
   */
  applyBackgroundColor(graphics: Graphics, width: number, height: number): void {
    const colors = this.getPaletteColors();
    graphics.clear();
    graphics.rect(0, 0, width, height);
    graphics.fill({ color: colors.background });
  }

  /**
   * Get the foreground color for rendering sprites
   */
  getForegroundColor(): number {
    return this.getPaletteColors().foreground;
  }

  /**
   * Get the accent color for UI elements
   */
  getAccentColor(): number {
    return this.getPaletteColors().accent;
  }

  /**
   * Convert a color value based on current palette
   * Maps grayscale values to palette colors
   */
  convertColor(grayscaleValue: number): number {
    const colors = this.getPaletteColors();

    // Simple mapping: darker values -> background, lighter values -> foreground
    if (grayscaleValue < 0.3) {
      return colors.background;
    } else if (grayscaleValue < 0.7) {
      return colors.glow;
    } else {
      return colors.foreground;
    }
  }

  /**
   * Create LCD pixel grid overlay - simulates gaps between LCD segments
   * @param width Canvas width
   * @param height Canvas height
   * @param pixelSize Size of each LCD "pixel" cell
   */
  createPixelGrid(width: number, height: number, pixelSize = 4): Graphics {
    const grid = new Graphics();
    const gridColor = 0x000000;
    const gridAlpha = 0.08;

    // Draw vertical lines
    for (let x = 0; x <= width; x += pixelSize) {
      grid.rect(x, 0, 1, height);
      grid.fill({ color: gridColor, alpha: gridAlpha });
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += pixelSize) {
      grid.rect(0, y, width, 1);
      grid.fill({ color: gridColor, alpha: gridAlpha });
    }

    return grid;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.glowLayer) {
      this.glowLayer.destroy();
      this.glowLayer = null;
    }
    this.removeAllListeners();
  }
}
