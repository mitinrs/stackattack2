/**
 * AssetLoader - Loads and manages all game sprites
 *
 * Provides palette-aware sprite loading and caching for all game entities.
 * Generates sprites programmatically to maintain authentic LCD aesthetic.
 */

import { Application, RenderTexture } from 'pixi.js';
import type { ColorPalette, PaletteColors } from '../systems/LCDEffect';
import {
  generateCharacterSprites,
  generateCharacterAnimationSprites,
  generateCrateSprite,
  generateAllCrateSprites,
  generateCraneSprite,
  generateCraneOpenSprite,
  generateInvertedCraneSprite,
  generateInvertedCraneOpenSprite,
  generateUISprites,
  generateEnvironmentSprites,
  getCrateVariantCount,
  type CharacterAnimationFrame,
} from './SpriteGenerator';
import { CrateType, type CrateColor } from '../types/entities';

export interface AssetCache {
  characters: Map<string, RenderTexture>;
  characterAnimations: Map<CharacterAnimationFrame, RenderTexture>;
  crate: RenderTexture;
  crates: Map<string, RenderTexture>;
  crane: RenderTexture;
  craneOpen: RenderTexture;
  craneInverted: RenderTexture;
  craneInvertedOpen: RenderTexture;
  ui: Map<string, RenderTexture>;
  environment: Map<string, RenderTexture>;
}

/**
 * AssetLoader manages sprite generation and caching
 */
export class AssetLoader {
  private app: Application;
  private cache: Map<ColorPalette, AssetCache>;
  private isLoaded: boolean = false;

  constructor(app: Application) {
    this.app = app;
    this.cache = new Map();
  }

  /**
   * Load all assets for both palettes
   */
  async load(bluePaletteColors: PaletteColors, amberPaletteColors: PaletteColors): Promise<void> {
    if (this.isLoaded) {
      console.warn('AssetLoader: Assets already loaded');
      return;
    }

    // Generate sprites for Blue palette
    const blueAssets: AssetCache = {
      characters: generateCharacterSprites(bluePaletteColors, this.app),
      characterAnimations: generateCharacterAnimationSprites(bluePaletteColors, this.app),
      crate: generateCrateSprite(bluePaletteColors, this.app),
      crates: generateAllCrateSprites(bluePaletteColors, this.app),
      crane: generateCraneSprite(bluePaletteColors, this.app),
      craneOpen: generateCraneOpenSprite(bluePaletteColors, this.app),
      craneInverted: generateInvertedCraneSprite(bluePaletteColors, this.app),
      craneInvertedOpen: generateInvertedCraneOpenSprite(bluePaletteColors, this.app),
      ui: generateUISprites(bluePaletteColors, this.app),
      environment: generateEnvironmentSprites(bluePaletteColors, this.app),
    };

    this.cache.set('blue', blueAssets);

    // Generate sprites for Amber palette
    const amberAssets: AssetCache = {
      characters: generateCharacterSprites(amberPaletteColors, this.app),
      characterAnimations: generateCharacterAnimationSprites(amberPaletteColors, this.app),
      crate: generateCrateSprite(amberPaletteColors, this.app),
      crates: generateAllCrateSprites(amberPaletteColors, this.app),
      crane: generateCraneSprite(amberPaletteColors, this.app),
      craneOpen: generateCraneOpenSprite(amberPaletteColors, this.app),
      craneInverted: generateInvertedCraneSprite(amberPaletteColors, this.app),
      craneInvertedOpen: generateInvertedCraneOpenSprite(amberPaletteColors, this.app),
      ui: generateUISprites(amberPaletteColors, this.app),
      environment: generateEnvironmentSprites(amberPaletteColors, this.app),
    };

    this.cache.set('amber', amberAssets);

    this.isLoaded = true;
    console.log('AssetLoader: All sprites generated for both palettes');
  }

  /**
   * Get character sprite for a specific character and palette
   */
  getCharacterSprite(characterId: number, palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.characters.get(`character_${characterId}`) || null;
  }

  /**
   * Get character sprite by name
   */
  getCharacterSpriteByName(name: string, palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.characters.get(name) || null;
  }

  /**
   * Get crate sprite for a specific palette (default regular crate)
   */
  getCrateSprite(palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.crate;
  }

  /**
   * Get crate sprite by type for a specific palette
   * For regular crates, optionally specify a visual variant (0-4)
   */
  getCrateSpriteByType(
    crateType: CrateType,
    palette: ColorPalette,
    variant?: number
  ): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    // For regular crates, use variant if specified
    if (crateType === 'regular' && variant !== undefined) {
      const variantKey = `crate_regular_${variant}`;
      return assets.crates.get(variantKey) || assets.crate;
    }

    const spriteKey = `crate_${crateType}`;
    return assets.crates.get(spriteKey) || assets.crate;
  }

  /**
   * Get a random visual variant number for regular crates
   */
  getRandomCrateVariant(): number {
    return Math.floor(Math.random() * getCrateVariantCount());
  }

  /**
   * Get colored crate sprite for match-3 mechanics
   */
  getColoredCrateSprite(color: CrateColor, palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    const spriteKey = `crate_${color}`;
    return assets.crates.get(spriteKey) || assets.crate;
  }

  /**
   * Get bomb crate sprite
   */
  getBombCrateSprite(palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.crates.get('crate_bomb') || assets.crate;
  }

  /**
   * Get environment sprite by name for a specific palette
   */
  getEnvironmentSprite(name: string, palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.environment.get(name) || null;
  }

  /**
   * Get crane sprite for a specific palette
   */
  getCraneSprite(palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.crane;
  }

  /**
   * Get inverted crane sprite (light on dark) for a specific palette
   */
  getInvertedCraneSprite(palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.craneInverted;
  }

  /**
   * Get inverted crane sprite with open hooks (light on dark) for a specific palette
   */
  getInvertedCraneOpenSprite(palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.craneInvertedOpen;
  }

  /**
   * Get crane sprite with open hooks for a specific palette
   */
  getCraneOpenSprite(palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.craneOpen;
  }

  /**
   * Get UI element sprite
   */
  getUISprite(name: string, palette: ColorPalette): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.ui.get(name) || null;
  }

  /**
   * Get all character sprites for a palette
   */
  getAllCharacterSprites(palette: ColorPalette): Map<string, RenderTexture> | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.characters;
  }

  /**
   * Get character animation sprite by frame name
   */
  getCharacterAnimationSprite(
    frame: CharacterAnimationFrame,
    palette: ColorPalette
  ): RenderTexture | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.characterAnimations.get(frame) || null;
  }

  /**
   * Get all character animation sprites for a palette
   */
  getAllCharacterAnimationSprites(
    palette: ColorPalette
  ): Map<CharacterAnimationFrame, RenderTexture> | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.characterAnimations;
  }

  /**
   * Get all UI sprites for a palette
   */
  getAllUISprites(palette: ColorPalette): Map<string, RenderTexture> | null {
    const assets = this.cache.get(palette);
    if (!assets) {
      console.error(`AssetLoader: No assets cached for palette: ${palette}`);
      return null;
    }

    return assets.ui;
  }

  /**
   * Check if assets are loaded
   */
  isAssetsLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Clean up all cached assets
   */
  destroy(): void {
    this.cache.forEach((assets) => {
      // Destroy character textures
      assets.characters.forEach((texture) => {
        texture.destroy(true);
      });
      assets.characters.clear();

      // Destroy character animation textures
      assets.characterAnimations.forEach((texture) => {
        texture.destroy(true);
      });
      assets.characterAnimations.clear();

      // Destroy crate texture
      assets.crate.destroy(true);

      // Destroy all crate type textures
      assets.crates.forEach((texture) => {
        texture.destroy(true);
      });
      assets.crates.clear();

      // Destroy crane textures
      assets.crane.destroy(true);
      assets.craneOpen.destroy(true);
      assets.craneInverted.destroy(true);
      assets.craneInvertedOpen.destroy(true);

      // Destroy UI textures
      assets.ui.forEach((texture) => {
        texture.destroy(true);
      });
      assets.ui.clear();

      // Destroy environment textures
      assets.environment.forEach((texture) => {
        texture.destroy(true);
      });
      assets.environment.clear();
    });

    this.cache.clear();
    this.isLoaded = false;
    console.log('AssetLoader: All assets destroyed');
  }
}

/**
 * Factory function to create a new AssetLoader instance
 */
export function createAssetLoader(app: Application): AssetLoader {
  return new AssetLoader(app);
}
