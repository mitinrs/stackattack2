/**
 * Crane Entity
 * Moves horizontally at top of screen, enters from left or right, drops crates
 * Has hooks that grip the crate while moving, then release it
 */

import { Sprite, Texture } from 'pixi.js';
import type { Position } from '../types/entities';

export const CraneState = {
  Idle: 'idle', // Waiting off-screen
  Entering: 'entering', // Moving to target column with crate
  Dropping: 'dropping', // Brief pause while releasing crate
  Exiting: 'exiting', // Moving back off-screen
} as const;

export type CraneState = (typeof CraneState)[keyof typeof CraneState];

export interface CraneConfig {
  id: number;
  craneWidth: number;
  craneHeight: number;
  topY: number;
  cellWidth: number;
  gridLeftX: number;
  gridColumns: number;
}

// Movement speed in pixels per second
const CRANE_SPEED = 150;
// Time to pause while dropping (ms)
const DROP_PAUSE_TIME = 200;
// Hook offset from crane bottom (where crate attaches)
const HOOK_OFFSET_Y = 8; // 4 pixels * 2 scale = 8 pixels for hooks

export class Crane extends Sprite {
  private craneId: number;
  private targetColumn: number;
  private state: CraneState;
  private active: boolean;
  private craneWidth: number;
  private craneHeight: number;
  private cellWidth: number;
  private gridLeftX: number;
  private gridColumns: number;
  private topY: number;

  // Movement state
  private enterFromLeft: boolean;
  private dropPauseTimer: number;
  private readyToDrop: boolean;

  // Hook state
  private hooksOpen: boolean;
  private closedTexture: Texture | null;
  private openTexture: Texture | null;

  constructor(config: CraneConfig) {
    super();
    this.craneId = config.id;
    this.targetColumn = 0;
    this.state = CraneState.Idle;
    this.active = true;
    this.craneWidth = config.craneWidth;
    this.craneHeight = config.craneHeight;
    this.cellWidth = config.cellWidth;
    this.gridLeftX = config.gridLeftX;
    this.gridColumns = config.gridColumns;
    this.topY = config.topY;

    this.enterFromLeft = true;
    this.dropPauseTimer = 0;
    this.readyToDrop = false;

    // Hook state
    this.hooksOpen = false;
    this.closedTexture = null;
    this.openTexture = null;

    // Set anchor to bottom-center for positioning above drop point
    this.anchor.set(0.5, 1);

    // Start off-screen
    this.y = this.topY;
    this.x = this.getOffScreenX(true); // Start off left
    this.visible = false;
  }

  /**
   * Get X position for off-screen (left or right)
   */
  private getOffScreenX(left: boolean): number {
    if (left) {
      return this.gridLeftX - this.craneWidth;
    } else {
      return this.gridLeftX + this.gridColumns * this.cellWidth + this.craneWidth;
    }
  }

  /**
   * Get X position for a column center
   */
  private getColumnX(column: number): number {
    return this.gridLeftX + column * this.cellWidth + this.cellWidth / 2;
  }

  /**
   * Start moving to drop at a specific column
   */
  startDrop(column: number): void {
    if (this.state !== CraneState.Idle) {
      return; // Already busy
    }

    this.targetColumn = column;
    this.enterFromLeft = Math.random() < 0.5;
    this.x = this.getOffScreenX(this.enterFromLeft);
    this.state = CraneState.Entering;
    this.visible = true;
    this.readyToDrop = false;

    // Close hooks to grip the crate
    this.closeHooks();
  }

  /**
   * Set the crane's sprite textures (closed and open hooks)
   */
  setTexture(texture: Texture): void {
    this.texture = texture;
    this.closedTexture = texture;
  }

  /**
   * Set the open hooks texture
   */
  setOpenTexture(texture: Texture): void {
    this.openTexture = texture;
  }

  /**
   * Open the hooks (to release crate)
   */
  openHooks(): void {
    if (!this.hooksOpen && this.openTexture) {
      this.hooksOpen = true;
      this.texture = this.openTexture;
    }
  }

  /**
   * Close the hooks (to grip crate)
   */
  closeHooks(): void {
    if (this.hooksOpen && this.closedTexture) {
      this.hooksOpen = false;
      this.texture = this.closedTexture;
    }
  }

  /**
   * Check if hooks are open
   */
  areHooksOpen(): boolean {
    return this.hooksOpen;
  }

  /**
   * Get the position where crate should be attached (below hooks)
   */
  getCrateAttachPosition(): Position {
    return {
      x: this.x,
      y: this.y + HOOK_OFFSET_Y, // Below the hooks
    };
  }

  /**
   * Check if crane is carrying a crate (entering or dropping state with closed hooks)
   */
  isCarryingCrate(): boolean {
    return (
      (this.state === CraneState.Entering || this.state === CraneState.Dropping) && !this.hooksOpen
    );
  }

  /**
   * Get the crane's unique ID
   */
  getId(): number {
    return this.craneId;
  }

  /**
   * Get the current column (based on position)
   */
  getColumn(): number {
    return this.targetColumn;
  }

  /**
   * Check if the crane is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Check if crane is idle and ready for new drop
   */
  isIdle(): boolean {
    return this.state === CraneState.Idle;
  }

  /**
   * Check if crane just dropped and is ready to spawn crate
   */
  checkAndConsumeDrop(): boolean {
    if (this.readyToDrop) {
      this.readyToDrop = false;
      return true;
    }
    return false;
  }

  /**
   * Get current state
   */
  getState(): CraneState {
    return this.state;
  }

  /**
   * Set the active state
   */
  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.visible = false;
      this.state = CraneState.Idle;
    }
  }

  /**
   * Get the position for a dropped crate (center-bottom of crane)
   */
  getDropPosition(): Position {
    return {
      x: this.getColumnX(this.targetColumn),
      y: this.y,
    };
  }

  /**
   * Get the crane's position
   */
  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  /**
   * Get the crane width
   */
  getCraneWidth(): number {
    return this.craneWidth;
  }

  /**
   * Get the crane height
   */
  getCraneHeight(): number {
    return this.craneHeight;
  }

  /**
   * Update the crane movement
   */
  update(deltaTime: number): void {
    if (!this.active) return;

    const targetX = this.getColumnX(this.targetColumn);
    const moveAmount = CRANE_SPEED * deltaTime;

    switch (this.state) {
      case CraneState.Entering:
        // Move towards target column
        if (this.enterFromLeft) {
          this.x += moveAmount;
          if (this.x >= targetX) {
            this.x = targetX;
            this.state = CraneState.Dropping;
            this.dropPauseTimer = 0;
          }
        } else {
          this.x -= moveAmount;
          if (this.x <= targetX) {
            this.x = targetX;
            this.state = CraneState.Dropping;
            this.dropPauseTimer = 0;
          }
        }
        break;

      case CraneState.Dropping:
        // Pause briefly then trigger drop
        this.dropPauseTimer += deltaTime * 1000;
        if (this.dropPauseTimer >= DROP_PAUSE_TIME) {
          // Open hooks to release crate
          this.openHooks();
          this.readyToDrop = true;
          this.state = CraneState.Exiting;
        }
        break;

      case CraneState.Exiting:
        // Move back off-screen
        if (this.enterFromLeft) {
          this.x -= moveAmount;
          if (this.x <= this.getOffScreenX(true)) {
            this.state = CraneState.Idle;
            this.visible = false;
          }
        } else {
          this.x += moveAmount;
          if (this.x >= this.getOffScreenX(false)) {
            this.state = CraneState.Idle;
            this.visible = false;
          }
        }
        break;

      case CraneState.Idle:
        // Do nothing, waiting for next drop command
        break;
    }
  }

  /**
   * Reset the crane to initial state
   */
  reset(): void {
    this.state = CraneState.Idle;
    this.active = true;
    this.visible = false;
    this.readyToDrop = false;
    this.dropPauseTimer = 0;
    this.hooksOpen = false;
    if (this.closedTexture) {
      this.texture = this.closedTexture;
    }
    this.x = this.getOffScreenX(true);
  }
}
