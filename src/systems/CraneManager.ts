/**
 * Crane Manager System
 * Manages crane movement, crate dropping, and special block spawning
 * Cranes move horizontally carrying crates, then release them
 */

import { Container, Texture } from 'pixi.js';
import { Crane } from '../entities/Crane';
import type { CraneConfig } from '../entities/Crane';
import { Crate } from '../entities/Crate';
import { CrateType, CRATE_COLORS, type CrateColor } from '../types/entities';
import type { GridConfig } from '../config/grid';
import { getGridLeftX } from '../config/grid';

export interface CraneManagerConfig {
  gridConfig: GridConfig;
  craneTopY: number;
}

export interface CrateDropInfo {
  craneId: number;
  column: number;
  crateType: CrateType;
  crateColor?: CrateColor;
  dropX: number;
  dropY: number;
  attachedCrate: Crate | null; // Reference to the crate being dropped
}

export interface AttachedCrateInfo {
  crateType: CrateType;
  crateColor?: CrateColor;
}

/**
 * Special block spawn rate configuration
 * 5-10% chance for special blocks
 */
const SPECIAL_BLOCK_SPAWN_RATE = {
  min: 0.05, // 5%
  max: 0.1, // 10%
};

/**
 * Bomb spawn rate - rare (2-3% chance)
 */
const BOMB_SPAWN_RATE = 0.025; // 2.5%

/**
 * Default crane dimensions
 */
const DEFAULT_CRANE_WIDTH = 16;
const DEFAULT_CRANE_HEIGHT = 8;

/**
 * Default spawn interval in milliseconds
 */
const DEFAULT_SPAWN_INTERVAL = 2000; // 2 seconds

export class CraneManager extends Container {
  private config: CraneManagerConfig;
  private cranes: Crane[];
  private spawnTimer: number;
  private spawnInterval: number;
  private gridLeftX: number;

  // Track crates attached to each crane (by crane ID)
  private attachedCrates: Map<number, Crate>;
  private attachedCrateInfo: Map<number, AttachedCrateInfo>;

  // Callback to create crate textures
  private crateTextureCallback: ((type: CrateType, color?: CrateColor) => Texture | null) | null =
    null;

  // Crate ID counter
  private crateIdCounter: number = 0;

  constructor(config: CraneManagerConfig) {
    super();
    this.config = config;
    this.cranes = [];
    this.spawnTimer = 0;
    this.spawnInterval = DEFAULT_SPAWN_INTERVAL;

    // Use centralized grid left position
    this.gridLeftX = getGridLeftX(config.gridConfig);

    // Initialize attached crates tracking
    this.attachedCrates = new Map();
    this.attachedCrateInfo = new Map();
  }

  /**
   * Set the callback for creating crate textures
   */
  setCrateTextureCallback(callback: (type: CrateType, color?: CrateColor) => Texture | null): void {
    this.crateTextureCallback = callback;
  }

  /**
   * Initialize cranes for a level
   */
  initializeCranes(craneCount: number): void {
    // Clear existing cranes
    this.clearCranes();

    // Create cranes
    for (let i = 0; i < craneCount; i++) {
      const craneConfig: CraneConfig = {
        id: i + 1,
        craneWidth: DEFAULT_CRANE_WIDTH,
        craneHeight: DEFAULT_CRANE_HEIGHT,
        topY: this.config.craneTopY,
        cellWidth: this.config.gridConfig.cellWidth,
        gridLeftX: this.gridLeftX,
        gridColumns: this.config.gridConfig.columns,
      };

      const crane = new Crane(craneConfig);
      this.cranes.push(crane);
      this.addChild(crane);
    }

    // Reset spawn timer
    this.spawnTimer = 0;
  }

  /**
   * Clear all cranes
   */
  private clearCranes(): void {
    for (const crane of this.cranes) {
      this.removeChild(crane);
      crane.destroy();
    }
    this.cranes = [];
  }

  /**
   * Set the spawn interval (time between crate drops)
   */
  setSpawnInterval(intervalMs: number): void {
    this.spawnInterval = intervalMs;
  }

  /**
   * Get the spawn interval
   */
  getSpawnInterval(): number {
    return this.spawnInterval;
  }

  /**
   * Update the crane manager
   * Returns an array of crate drop info for crates that should be released
   */
  update(deltaTime: number): CrateDropInfo[] {
    const drops: CrateDropInfo[] = [];
    const deltaMs = deltaTime * 1000;

    // Update spawn timer
    this.spawnTimer += deltaMs;

    // Check if it's time to spawn a crate
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;

      // Find an idle crane
      const idleCranes = this.cranes.filter((c) => c.isIdle() && c.isActive());
      if (idleCranes.length > 0) {
        // Select random idle crane
        const crane = idleCranes[Math.floor(Math.random() * idleCranes.length)];

        // Select random column
        const targetColumn = Math.floor(Math.random() * this.config.gridConfig.columns);

        // Determine crate type and color
        const { crateType, crateColor } = this.determineSpawnTypeAndColor();

        // Create attached crate
        this.createAttachedCrate(crane, crateType, crateColor);

        // Start crane movement
        crane.startDrop(targetColumn);
      }
    }

    // Update individual cranes and collect drops
    for (const crane of this.cranes) {
      const wasCarrying = crane.isCarryingCrate();
      crane.update(deltaTime);

      // Update attached crate position if crane is carrying one
      const attachedCrate = this.attachedCrates.get(crane.getId());
      if (attachedCrate && crane.isCarryingCrate()) {
        const attachPos = crane.getCrateAttachPosition();
        attachedCrate.setPosition(attachPos.x, attachPos.y);
      }

      // Check if crane just released the crate (was carrying, now hooks are open)
      if (wasCarrying && !crane.isCarryingCrate() && crane.checkAndConsumeDrop()) {
        const craneId = crane.getId();
        const crate = this.attachedCrates.get(craneId);
        const info = this.attachedCrateInfo.get(craneId);

        if (crate && info) {
          const dropPosition = crane.getDropPosition();

          drops.push({
            craneId: craneId,
            column: crane.getColumn(),
            crateType: info.crateType,
            crateColor: info.crateColor,
            dropX: dropPosition.x,
            dropY: dropPosition.y,
            attachedCrate: crate,
          });

          // Remove from attached tracking (crate will be managed by CrateManager now)
          this.removeChild(crate);
          this.attachedCrates.delete(craneId);
          this.attachedCrateInfo.delete(craneId);
        }
      }
    }

    return drops;
  }

  /**
   * Create a crate attached to a crane
   */
  private createAttachedCrate(crane: Crane, crateType: CrateType, crateColor?: CrateColor): void {
    const crateId = `crane-crate-${++this.crateIdCounter}`;
    const crate = new Crate({
      id: crateId,
      column: crane.getColumn(),
      type: crateType,
      fallSpeed: 100, // Will be set properly when released
      color: crateColor,
    });

    // Set texture if callback is available
    if (this.crateTextureCallback) {
      const texture = this.crateTextureCallback(crateType, crateColor);
      if (texture) {
        crate.texture = texture;
      }
    }

    // Position at crane's attachment point
    const attachPos = crane.getCrateAttachPosition();
    crate.setPosition(attachPos.x, attachPos.y);
    crate.visible = true;

    // Add to this container (will be visible with crane)
    this.addChild(crate);

    // Track attached crate
    this.attachedCrates.set(crane.getId(), crate);
    this.attachedCrateInfo.set(crane.getId(), { crateType, crateColor });
  }

  /**
   * Determine what type and color of crate to spawn
   * - 2.5% chance for bomb
   * - 5-10% chance for special blocks
   * - Remaining chance for regular crates with random color
   */
  private determineSpawnTypeAndColor(): { crateType: CrateType; crateColor?: CrateColor } {
    const random = Math.random();

    // Check for bomb first (rare)
    if (random < BOMB_SPAWN_RATE) {
      return { crateType: CrateType.Bomb };
    }

    // Check for special blocks
    const spawnRate = (SPECIAL_BLOCK_SPAWN_RATE.min + SPECIAL_BLOCK_SPAWN_RATE.max) / 2;
    if (random < BOMB_SPAWN_RATE + spawnRate) {
      return { crateType: this.selectRandomSpecialType() };
    }

    // Regular crate with random color
    const crateColor = this.selectRandomColor();
    return { crateType: CrateType.Regular, crateColor };
  }

  /**
   * Select a random special block type
   */
  private selectRandomSpecialType(): CrateType {
    const specialTypes = [CrateType.ExtraPoints, CrateType.SuperJump, CrateType.Helmet];
    return specialTypes[Math.floor(Math.random() * specialTypes.length)];
  }

  /**
   * Select a random color for regular crates
   */
  private selectRandomColor(): CrateColor {
    return CRATE_COLORS[Math.floor(Math.random() * CRATE_COLORS.length)];
  }

  /**
   * Get all cranes
   */
  getCranes(): Crane[] {
    return [...this.cranes];
  }

  /**
   * Get active cranes
   */
  getActiveCranes(): Crane[] {
    return this.cranes.filter((c) => c.isActive());
  }

  /**
   * Get crane by ID
   */
  getCraneById(id: number): Crane | undefined {
    return this.cranes.find((c) => c.getId() === id);
  }

  /**
   * Get crane count
   */
  getCraneCount(): number {
    return this.cranes.length;
  }

  /**
   * Get the grid left X position
   */
  getGridLeftX(): number {
    return this.gridLeftX;
  }

  /**
   * Get the configuration
   */
  getConfig(): CraneManagerConfig {
    return { ...this.config };
  }

  /**
   * Reset the crane manager
   */
  reset(): void {
    this.spawnTimer = 0;

    // Clear attached crates
    for (const crate of this.attachedCrates.values()) {
      this.removeChild(crate);
      crate.destroy();
    }
    this.attachedCrates.clear();
    this.attachedCrateInfo.clear();

    for (const crane of this.cranes) {
      crane.reset();
    }
  }

  /**
   * Destroy the crane manager and all cranes
   */
  destroy(): void {
    // Clear attached crates
    for (const crate of this.attachedCrates.values()) {
      crate.destroy();
    }
    this.attachedCrates.clear();
    this.attachedCrateInfo.clear();

    this.clearCranes();
    super.destroy();
  }

  /**
   * Set both closed and open textures for all cranes
   */
  setCraneTextures(closedTexture: Texture, openTexture: Texture): void {
    for (const crane of this.cranes) {
      crane.setTexture(closedTexture);
      crane.setOpenTexture(openTexture);
    }
  }
}
