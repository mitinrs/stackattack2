/**
 * Crate Entity
 * Falling crate that stacks on the game grid with animations
 */

import { Sprite, Texture } from 'pixi.js';
import { CrateType, type Position, type Velocity, type CrateColor } from '../types/entities';

export const CrateState = {
  Idle: 'idle',
  Falling: 'falling',
  Landed: 'landed',
  Sliding: 'sliding',
  Clearing: 'clearing',
  Exploding: 'exploding',
} as const;

export type CrateState = (typeof CrateState)[keyof typeof CrateState];

export interface CrateConfig {
  id: string;
  column: number;
  type: CrateType;
  fallSpeed: number;
  color?: CrateColor;
}

// Animation constants
const CLEAR_ANIMATION_DURATION = 0.3; // seconds
const FLASH_INTERVAL = 0.05; // seconds
const BOMB_FUSE_TIME = 5.0; // seconds before bomb explodes
const BOMB_WARNING_TIME = 2.0; // seconds before explosion to start warning flash

export class Crate extends Sprite {
  private crateId: string;
  private crateType: CrateType;
  private crateColor: CrateColor | null;
  private velocity: Velocity;
  private state: CrateState;
  private gridColumn: number;
  private gridRow: number;
  private fallSpeed: number;

  // Animation state
  private clearAnimationTimer: number = 0;
  private flashTimer: number = 0;
  private isFlashing: boolean = false;
  private originalAlpha: number = 1;

  // Bomb state
  private bombTimer: number = 0;
  private isBombActive: boolean = false;
  private bombWarningFlash: boolean = false;

  // Sliding state
  private slideDirection: number = 0;
  private slideTargetX: number = 0;
  private slideSpeed: number = 200; // pixels per second for auto-slide to target
  private isAutoSliding: boolean = false; // True when auto-sliding to target (key released)
  private justStopped: boolean = false; // True for one frame after stopping, prevents immediate re-push

  constructor(config: CrateConfig) {
    super();
    this.crateId = config.id;
    this.crateType = config.type;
    this.crateColor = config.color || null;
    this.gridColumn = config.column;
    this.gridRow = -1; // Not yet on grid
    this.fallSpeed = config.fallSpeed;
    this.velocity = { x: 0, y: 0 };
    this.state = CrateState.Idle;

    // Set anchor to bottom-center for grid alignment
    this.anchor.set(0.5, 1);
  }

  /**
   * Set the crate's sprite texture
   */
  setTexture(texture: Texture): void {
    this.texture = texture;
  }

  /**
   * Get the crate's unique ID
   */
  getId(): string {
    return this.crateId;
  }

  /**
   * Get the crate type (regular or special)
   */
  getCrateType(): CrateType {
    return this.crateType;
  }

  /**
   * Check if this is a special crate
   */
  isSpecial(): boolean {
    return this.crateType !== CrateType.Regular && this.crateType !== CrateType.Bomb;
  }

  /**
   * Get the crate's color (for match-3 mechanics)
   */
  getColor(): CrateColor | null {
    return this.crateColor;
  }

  /**
   * Check if this is a bomb crate
   */
  isBomb(): boolean {
    return this.crateType === CrateType.Bomb;
  }

  /**
   * Start the bomb fuse timer (called when bomb lands)
   */
  startBombTimer(): void {
    if (this.crateType === CrateType.Bomb) {
      this.isBombActive = true;
      this.bombTimer = 0;
    }
  }

  /**
   * Check if bomb is ready to explode
   */
  shouldExplode(): boolean {
    return this.isBombActive && this.bombTimer >= BOMB_FUSE_TIME;
  }

  /**
   * Get bomb timer progress (0 to 1)
   */
  getBombProgress(): number {
    if (!this.isBombActive) return 0;
    return Math.min(this.bombTimer / BOMB_FUSE_TIME, 1);
  }

  /**
   * Check if bomb is active (ticking)
   */
  isBombTicking(): boolean {
    return this.isBombActive;
  }

  /**
   * Start exploding animation
   */
  startExploding(): void {
    this.state = CrateState.Exploding;
    this.clearAnimationTimer = 0;
    this.flashTimer = 0;
    this.isFlashing = false;
    this.originalAlpha = this.alpha;
  }

  /**
   * Check if the crate is exploding
   */
  isExploding(): boolean {
    return this.state === CrateState.Exploding;
  }

  /**
   * Check if explosion animation is complete
   */
  isExplodingComplete(): boolean {
    return (
      this.state === CrateState.Exploding && this.clearAnimationTimer >= CLEAR_ANIMATION_DURATION
    );
  }

  /**
   * Get the current state
   */
  getState(): CrateState {
    return this.state;
  }

  /**
   * Get the current velocity
   */
  getVelocity(): Velocity {
    return { ...this.velocity };
  }

  /**
   * Set velocity directly
   */
  setVelocity(velocity: Partial<Velocity>): void {
    if (velocity.x !== undefined) this.velocity.x = velocity.x;
    if (velocity.y !== undefined) this.velocity.y = velocity.y;
  }

  /**
   * Get the grid column
   */
  getGridColumn(): number {
    return this.gridColumn;
  }

  /**
   * Get the grid row (only valid if landed)
   */
  getGridRow(): number {
    return this.gridRow;
  }

  /**
   * Set the grid position
   */
  setGridPosition(column: number, row: number): void {
    this.gridColumn = column;
    this.gridRow = row;
  }

  /**
   * Set the grid column (for pushing falling crates)
   */
  setGridColumn(column: number): void {
    this.gridColumn = column;
  }

  /**
   * Start falling
   */
  startFalling(): void {
    this.state = CrateState.Falling;
    this.velocity.y = this.fallSpeed;
  }

  /**
   * Resume falling (e.g., after support removed)
   */
  resumeFalling(): void {
    if (this.state === CrateState.Landed) {
      this.state = CrateState.Falling;
      this.velocity.y = this.fallSpeed;
      this.gridRow = -1; // No longer on a valid grid row
    }
  }

  /**
   * Land the crate at a specific Y position
   */
  land(yPosition: number): void {
    this.state = CrateState.Landed;
    this.velocity.y = 0;
    this.y = yPosition;
  }

  /**
   * Start being pushed (will move with character)
   */
  startBeingPushed(direction: number, targetX: number): void {
    this.state = CrateState.Sliding;
    this.slideDirection = direction;
    this.slideTargetX = targetX;
    this.isAutoSliding = false;
    this.velocity.x = 0; // Will be set each frame by character
    this.velocity.y = 0;
  }

  /**
   * Start auto-sliding to target (called when key is released mid-push)
   */
  startAutoSlide(): void {
    if (this.state === CrateState.Sliding) {
      this.isAutoSliding = true;
    }
  }

  /**
   * Check if crate is auto-sliding (not being actively pushed)
   */
  isAutoSlidingToTarget(): boolean {
    return this.state === CrateState.Sliding && this.isAutoSliding;
  }

  /**
   * Get the slide target X position
   */
  getSlideTargetX(): number {
    return this.slideTargetX;
  }

  /**
   * Check if crate has reached its slide target
   */
  hasReachedSlideTarget(): boolean {
    if (!this.isAutoSliding) return false;
    const distance = Math.abs(this.x - this.slideTargetX);
    return distance < 1; // Within 1 pixel
  }

  /**
   * Move crate by delta (called each frame while being pushed)
   */
  pushMove(deltaX: number): void {
    if (this.state === CrateState.Sliding) {
      this.x += deltaX;
    }
  }

  /**
   * Stop being pushed and snap to nearest grid position
   */
  stopBeingPushed(gridCenterX: number, gridY: number): void {
    if (this.state === CrateState.Sliding) {
      this.x = gridCenterX;
      this.y = gridY;
      this.velocity.x = 0;
      this.state = CrateState.Landed;
      this.justStopped = true; // Prevent immediate re-push, allow match check
    }
  }

  /**
   * Check if the crate is sliding
   */
  isSliding(): boolean {
    return this.state === CrateState.Sliding;
  }

  /**
   * Get slide direction
   */
  getSlideDirection(): number {
    return this.slideDirection;
  }

  /**
   * Start clearing animation
   */
  startClearing(): void {
    this.state = CrateState.Clearing;
    this.velocity = { x: 0, y: 0 };
    this.clearAnimationTimer = 0;
    this.flashTimer = 0;
    this.isFlashing = false;
    this.originalAlpha = this.alpha;
  }

  /**
   * Check if the crate is falling
   */
  isFalling(): boolean {
    return this.state === CrateState.Falling;
  }

  /**
   * Check if the crate is landed
   */
  isLanded(): boolean {
    return this.state === CrateState.Landed;
  }

  /**
   * Check if the crate can be pushed (not just stopped)
   */
  canBePushed(): boolean {
    return this.state === CrateState.Landed && !this.justStopped;
  }

  /**
   * Check if the crate is being cleared
   */
  isClearing(): boolean {
    return this.state === CrateState.Clearing;
  }

  /**
   * Check if the clearing animation is complete
   */
  isClearingComplete(): boolean {
    return (
      this.state === CrateState.Clearing && this.clearAnimationTimer >= CLEAR_ANIMATION_DURATION
    );
  }

  /**
   * Get the crate's position
   */
  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  /**
   * Set the crate's position
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Update crate physics and animations
   */
  update(deltaTime: number): void {
    // Reset justStopped flag at start of each frame
    this.justStopped = false;

    if (this.state === CrateState.Falling) {
      // Update position based on velocity
      this.y += this.velocity.y * deltaTime;
    } else if (this.state === CrateState.Sliding) {
      // If auto-sliding (key released), move towards target
      if (this.isAutoSliding) {
        const distance = this.slideTargetX - this.x;
        const moveAmount = this.slideSpeed * deltaTime;

        if (Math.abs(distance) <= moveAmount) {
          // Reached target
          this.x = this.slideTargetX;
        } else {
          // Move towards target
          this.x += Math.sign(distance) * moveAmount;
        }
      }
      // Otherwise, crate is moved externally via pushMove()
    } else if (this.state === CrateState.Clearing) {
      // Update clearing animation
      this.updateClearingAnimation(deltaTime);
    } else if (this.state === CrateState.Exploding) {
      // Update exploding animation (same as clearing)
      this.updateClearingAnimation(deltaTime);
    } else if (this.state === CrateState.Landed && this.isBombActive) {
      // Update bomb timer
      this.updateBombTimer(deltaTime);
    }
  }

  /**
   * Update bomb timer and warning flash
   */
  private updateBombTimer(deltaTime: number): void {
    this.bombTimer += deltaTime;

    // Warning flash in last 2 seconds
    if (this.bombTimer >= BOMB_FUSE_TIME - BOMB_WARNING_TIME) {
      this.flashTimer += deltaTime;
      // Faster flashing as time runs out
      const flashInterval =
        0.1 * (1 - (this.bombTimer - (BOMB_FUSE_TIME - BOMB_WARNING_TIME)) / BOMB_WARNING_TIME);
      const actualInterval = Math.max(0.05, flashInterval);

      if (this.flashTimer >= actualInterval) {
        this.flashTimer = 0;
        this.bombWarningFlash = !this.bombWarningFlash;
        this.alpha = this.bombWarningFlash ? 0.5 : 1;
      }
    }
  }

  /**
   * Update the clearing animation (flashing effect then fade out)
   */
  private updateClearingAnimation(deltaTime: number): void {
    this.clearAnimationTimer += deltaTime;
    this.flashTimer += deltaTime;

    // Flash effect during first half of animation
    if (this.clearAnimationTimer < CLEAR_ANIMATION_DURATION * 0.6) {
      if (this.flashTimer >= FLASH_INTERVAL) {
        this.flashTimer = 0;
        this.isFlashing = !this.isFlashing;
        this.alpha = this.isFlashing ? 0.3 : this.originalAlpha;
      }
    } else {
      // Fade out during second half
      const fadeProgress =
        (this.clearAnimationTimer - CLEAR_ANIMATION_DURATION * 0.6) /
        (CLEAR_ANIMATION_DURATION * 0.4);
      this.alpha = this.originalAlpha * (1 - fadeProgress);

      // Scale down slightly for visual effect
      const scaleProgress = Math.min(fadeProgress, 1);
      this.scale.set(1 - scaleProgress * 0.3);
    }
  }

  /**
   * Get bounding box for collision detection
   */
  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Check if this crate collides with another crate's bounds
   */
  collidesWithBounds(bounds: { x: number; y: number; width: number; height: number }): boolean {
    const myBounds = this.getCollisionBounds();
    return (
      myBounds.x < bounds.x + bounds.width &&
      myBounds.x + myBounds.width > bounds.x &&
      myBounds.y < bounds.y + bounds.height &&
      myBounds.y + myBounds.height > bounds.y
    );
  }

  /**
   * Reset crate to initial state
   */
  reset(): void {
    this.velocity = { x: 0, y: 0 };
    this.state = CrateState.Idle;
    this.gridRow = -1;
    this.alpha = 1;
    this.scale.set(1);
    this.clearAnimationTimer = 0;
    this.flashTimer = 0;
    this.isFlashing = false;
    // Reset bomb state
    this.bombTimer = 0;
    this.isBombActive = false;
    this.bombWarningFlash = false;
    // Reset slide state
    this.slideDirection = 0;
    this.slideTargetX = 0;
    this.isAutoSliding = false;
  }

  /**
   * Get the fall speed
   */
  getFallSpeed(): number {
    return this.fallSpeed;
  }

  /**
   * Set the fall speed (for level difficulty changes)
   */
  setFallSpeed(speed: number): void {
    this.fallSpeed = speed;
    if (this.state === CrateState.Falling) {
      this.velocity.y = speed;
    }
  }

  /**
   * Get clearing animation progress (0 to 1)
   */
  getClearingProgress(): number {
    if (this.state !== CrateState.Clearing) return 0;
    return Math.min(this.clearAnimationTimer / CLEAR_ANIMATION_DURATION, 1);
  }
}
