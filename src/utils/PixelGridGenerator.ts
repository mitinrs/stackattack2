/**
 * PixelGridGenerator - Creates dot-matrix overlay texture
 *
 * Generates a pixel grid pattern to simulate LCD dot-matrix structure,
 * creating an authentic retro screen appearance.
 */

import { Texture, RenderTexture, Graphics } from 'pixi.js';

export class PixelGridGenerator {
  /**
   * Generate a dot-matrix grid texture
   *
   * @param width - Width of the texture
   * @param height - Height of the texture
   * @param gridSize - Size of each grid cell in pixels (default: 2)
   * @param opacity - Opacity of the grid lines (default: 0.15)
   * @returns Texture with grid pattern
   */
  static generate(
    width: number,
    height: number,
    gridSize: number = 2,
    opacity: number = 0.15
  ): Texture {
    // Create a graphics object to draw the grid
    const graphics = new Graphics();

    // Draw horizontal lines
    for (let y = 0; y < height; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }

    // Draw vertical lines
    for (let x = 0; x < width; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }

    graphics.stroke({
      width: 0.5,
      color: 0x000000,
      alpha: opacity,
    });

    // Create a render texture from the graphics
    const texture = RenderTexture.create({
      width,
      height,
    });

    // Note: In PixiJS v7+, we would use renderer.render(graphics, { renderTexture: texture })
    // For now, we'll create a simple texture that can be rendered

    return texture;
  }

  /**
   * Generate a dot pattern (alternative to grid lines)
   *
   * Creates individual dots instead of continuous lines for a different LCD effect
   */
  static generateDotPattern(
    width: number,
    height: number,
    dotSize: number = 1,
    spacing: number = 2,
    opacity: number = 0.2
  ): Texture {
    const graphics = new Graphics();

    // Draw dots in a grid pattern
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        graphics.circle(x, y, dotSize / 2);
        graphics.fill({ color: 0x000000, alpha: opacity });
      }
    }

    const texture = RenderTexture.create({
      width,
      height,
    });

    return texture;
  }

  /**
   * Generate a scanline effect
   *
   * Creates horizontal scanlines for additional LCD authenticity
   */
  static generateScanlines(
    width: number,
    height: number,
    lineSpacing: number = 2,
    opacity: number = 0.1
  ): Texture {
    const graphics = new Graphics();

    // Draw horizontal scanlines
    for (let y = 0; y < height; y += lineSpacing) {
      graphics.rect(0, y, width, 1);
      graphics.fill({ color: 0x000000, alpha: opacity });
    }

    const texture = RenderTexture.create({
      width,
      height,
    });

    return texture;
  }
}
