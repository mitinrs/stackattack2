import { describe, it, expect, beforeEach } from 'vitest';
import { DisplayScaler } from '../src/systems/DisplayScaler';
import { LCDEffect, ColorPalette } from '../src/systems/LCDEffect';
import { PixelGridGenerator } from '../src/utils/PixelGridGenerator';

describe('Rendering System', () => {
  describe('DisplayScaler', () => {
    let scaler: DisplayScaler;

    beforeEach(() => {
      scaler = new DisplayScaler(240, 320);
    });

    it('should calculate scale that maintains aspect ratio', () => {
      const scale = scaler.calculateScale(480, 640);
      expect(scale).toBe(2);
    });

    it('should use letterboxing when viewport is wider', () => {
      const scale = scaler.calculateScale(800, 600);
      const expectedScale = 600 / 320; // Limited by height
      expect(scale).toBeCloseTo(expectedScale);
    });

    it('should use pillarboxing when viewport is taller', () => {
      const scale = scaler.calculateScale(200, 800);
      const expectedScale = 200 / 240; // Limited by width
      expect(scale).toBeCloseTo(expectedScale);
    });

    it('should return dimensions after scaling', () => {
      const { width, height } = scaler.getScaledDimensions(480, 640);
      expect(width).toBe(480);
      expect(height).toBe(640);
    });
  });

  describe('LCDEffect', () => {
    let lcdEffect: LCDEffect;

    beforeEach(() => {
      lcdEffect = new LCDEffect();
    });

    it('should initialize with Blue palette by default', () => {
      expect(lcdEffect.getCurrentPalette()).toBe(ColorPalette.Blue);
    });

    it('should switch to Amber palette', () => {
      lcdEffect.setPalette(ColorPalette.Amber);
      expect(lcdEffect.getCurrentPalette()).toBe(ColorPalette.Amber);
    });

    it('should provide Blue palette colors', () => {
      lcdEffect.setPalette(ColorPalette.Blue);
      const colors = lcdEffect.getPaletteColors();
      expect(colors.background).toBeDefined();
      expect(colors.foreground).toBeDefined();
      expect(colors.accent).toBeDefined();
    });

    it('should provide Amber palette colors', () => {
      lcdEffect.setPalette(ColorPalette.Amber);
      const colors = lcdEffect.getPaletteColors();
      expect(colors.background).toBeDefined();
      expect(colors.foreground).toBeDefined();
      expect(colors.accent).toBeDefined();
    });

    it('should emit event when palette changes', () => {
      let eventFired = false;
      lcdEffect.on('paletteChanged', () => {
        eventFired = true;
      });
      lcdEffect.setPalette(ColorPalette.Amber);
      expect(eventFired).toBe(true);
    });
  });

  describe('PixelGridGenerator', () => {
    it('should generate grid texture with correct dimensions', () => {
      const texture = PixelGridGenerator.generate(240, 320, 2);
      expect(texture).toBeDefined();
      expect(texture.width).toBe(240);
      expect(texture.height).toBe(320);
    });

    it('should create visible grid pattern', () => {
      const texture = PixelGridGenerator.generate(10, 10, 2);
      expect(texture).toBeDefined();
      // Grid should have some transparency
      expect(texture.source).toBeDefined();
    });
  });
});
