/**
 * Character Entity
 * Player-controlled character with movement, jumping, and pushing abilities
 */

import { Sprite, Texture } from 'pixi.js';
import type { CharacterConfig } from '../types/config';
import type { Position, Velocity } from '../types/entities';
import type { CharacterAnimationFrame } from '../utils/SpriteGenerator';

export const CharacterState = {
  Idle: 'idle',
  Walking: 'walking',
  Jumping: 'jumping',
  Falling: 'falling',
  Pushing: 'pushing',
} as const;

export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState];

// Physics constants
const GRAVITY = 980; // pixels per second squared
const MAX_FALL_SPEED = 400; // pixels per second
const ACCELERATION = 1500; // pixels per second squared
const DECELERATION = 4000; // pixels per second squared (friction) - high value for minimal sliding
const BASE_HORIZONTAL_SPEED = 120; // base max speed for speed=1
const FAST_HORIZONTAL_SPEED = 180; // max speed for speed=2

// Crate height for jump calculation
const CRATE_HEIGHT = 16; // pixels
const JUMP_BUFFER = 6; // extra height buffer to clear crate

// Collision width ratio - character collision is narrower than sprite
// This allows fitting into 1-crate wide niches
const COLLISION_WIDTH_RATIO = 0.7; // 70% of sprite width

// Animation constants
const WALK_ANIMATION_SPEED = 0.12; // seconds per frame for walk
const PUSH_ANIMATION_SPEED = 0.15; // seconds per frame for push
const IDLE_ANIMATION_SPEED = 0.5; // seconds per frame for idle look-around
const IDLE_UP_DURATION = 1.0; // looking up lasts longer

// Walk animation sequence: walk1 -> walk2 -> walk1 -> walk3
const WALK_SEQUENCE: CharacterAnimationFrame[] = ['walk1', 'walk2', 'walk1', 'walk3'];

// Push animation sequence: push1 -> push2 -> push3
const PUSH_SEQUENCE: CharacterAnimationFrame[] = ['push1', 'push2', 'push3'];

// Idle animation sequence: up -> front -> left -> front -> right -> front -> up
const IDLE_SEQUENCE: CharacterAnimationFrame[] = [
  'idle_up',
  'idle_front',
  'idle_right', // Will be mirrored for left
  'idle_front',
  'idle_right',
  'idle_front',
];
// Track which frames are "look left" (need mirroring)
const IDLE_LOOK_LEFT_INDICES = [2]; // Index 2 is "look left"

export class Character extends Sprite {
  private config: CharacterConfig;
  private velocity: Velocity;
  private state: CharacterState;
  private onGround: boolean;
  private wasOnGround: boolean; // Track previous frame's ground state for friction
  private facingRight: boolean;

  // Special effects
  private superJumpActive: boolean = false;
  private superJumpEndTime: number = 0;

  // Animation state
  private walkAnimationTimer: number = 0;
  private walkSequenceIndex: number = 0;
  private pushAnimationTimer: number = 0;
  private pushSequenceIndex: number = 0;
  private idleAnimationTimer: number = 0;
  private idleSequenceIndex: number = 0;
  private idleLookingLeft: boolean = false; // For idle left/right mirroring
  private lastAnimationFrame: CharacterAnimationFrame = 'idle_front';

  constructor(config: CharacterConfig) {
    super();
    this.config = config;
    this.velocity = { x: 0, y: 0 };
    this.state = CharacterState.Idle;
    this.onGround = false;
    this.wasOnGround = false;
    this.facingRight = true;

    // Set anchor to bottom-center for ground alignment
    this.anchor.set(0.5, 1);
  }

  /**
   * Set the character's sprite texture
   */
  setTexture(texture: Texture): void {
    this.texture = texture;
  }

  /**
   * Get the character configuration
   */
  getConfig(): CharacterConfig {
    return this.config;
  }

  /**
   * Get the character's current velocity
   */
  getVelocity(): Velocity {
    return { ...this.velocity };
  }

  /**
   * Set velocity directly (for external physics)
   */
  setVelocity(velocity: Partial<Velocity>): void {
    if (velocity.x !== undefined) this.velocity.x = velocity.x;
    if (velocity.y !== undefined) this.velocity.y = velocity.y;
  }

  /**
   * Get the current state
   */
  getState(): CharacterState {
    return this.state;
  }

  /**
   * Set whether the character is on ground
   */
  setOnGround(onGround: boolean): void {
    this.onGround = onGround;

    // Only trigger "just landed" logic if character was truly in the air
    // Use wasOnGround (saved at start of frame) to detect real landings
    // This prevents false triggers when onGround is temporarily reset for crate collision detection
    if (onGround && !this.wasOnGround) {
      // Just landed
      this.velocity.y = 0;
      this.state = CharacterState.Idle;
    }
  }

  /**
   * Called at start of frame before ground state is reset
   * Saves current ground state for friction calculations
   */
  saveGroundState(): void {
    this.wasOnGround = this.onGround;
  }

  /**
   * Check if character is on the ground
   */
  isOnGround(): boolean {
    return this.onGround;
  }

  /**
   * Get effective max horizontal speed (based on character speed attribute)
   * speed=1: normal, speed=2: fast
   */
  private getMaxHorizontalSpeed(): number {
    return this.config.attributes.speed === 2 ? FAST_HORIZONTAL_SPEED : BASE_HORIZONTAL_SPEED;
  }

  /**
   * Get effective jump velocity (based on character jumpHeight attribute and super jump)
   * jumpHeight=1: jump 1 crate, jumpHeight=2: jump 2 crates
   * Uses physics formula: v = sqrt(2 * g * h)
   */
  private getJumpVelocity(): number {
    let crateCount = this.config.attributes.jumpHeight;
    if (this.superJumpActive) {
      crateCount += 1; // Super jump adds 1 extra crate height
    }
    // Calculate required height in pixels
    const targetHeight = crateCount * CRATE_HEIGHT + JUMP_BUFFER;
    // v = sqrt(2 * g * h), negative because up is negative Y
    return -Math.sqrt(2 * GRAVITY * targetHeight);
  }

  /**
   * Move character left
   */
  moveLeft(deltaTime: number): void {
    this.facingRight = false;
    this.scale.x = -Math.abs(this.scale.x); // Flip sprite

    // Apply acceleration
    this.velocity.x -= ACCELERATION * deltaTime;

    // Clamp to max speed
    const maxSpeed = this.getMaxHorizontalSpeed();
    if (this.velocity.x < -maxSpeed) {
      this.velocity.x = -maxSpeed;
    }

    if (this.onGround && this.state !== CharacterState.Pushing) {
      this.state = CharacterState.Walking;
    }
  }

  /**
   * Move character right
   */
  moveRight(deltaTime: number): void {
    this.facingRight = true;
    this.scale.x = Math.abs(this.scale.x); // Normal sprite direction

    // Apply acceleration
    this.velocity.x += ACCELERATION * deltaTime;

    // Clamp to max speed
    const maxSpeed = this.getMaxHorizontalSpeed();
    if (this.velocity.x > maxSpeed) {
      this.velocity.x = maxSpeed;
    }

    if (this.onGround && this.state !== CharacterState.Pushing) {
      this.state = CharacterState.Walking;
    }
  }

  /**
   * Make character jump
   */
  jump(): void {
    if (!this.onGround) {
      return; // Can't jump in air
    }

    this.velocity.y = this.getJumpVelocity();
    this.onGround = false;
    this.state = CharacterState.Jumping;
  }

  /**
   * Get push strength for interacting with crates
   */
  getPushStrength(): number {
    return this.config.attributes.pushStrength;
  }

  /**
   * Set character into pushing state
   * Can push both on ground and in air
   */
  startPushing(): void {
    this.state = CharacterState.Pushing;
  }

  /**
   * End pushing state
   */
  stopPushing(): void {
    if (this.state === CharacterState.Pushing) {
      this.state = this.velocity.x !== 0 ? CharacterState.Walking : CharacterState.Idle;
    }
  }

  /**
   * Stop horizontal movement input (transitions from Walking to Idle)
   * Called when no movement keys are pressed
   */
  stopMoving(): void {
    if (this.onGround && this.state === CharacterState.Walking) {
      this.state = CharacterState.Idle;
    }
  }

  /**
   * Activate super jump power-up
   */
  activateSuperJump(duration: number = 10000): void {
    this.superJumpActive = true;
    this.superJumpEndTime = Date.now() + duration;
  }

  /**
   * Check if super jump is active
   */
  hasSuperJump(): boolean {
    return this.superJumpActive;
  }

  /**
   * Update character state
   */
  update(deltaTime: number): void {
    // Check super jump expiration
    if (this.superJumpActive && Date.now() >= this.superJumpEndTime) {
      this.superJumpActive = false;
    }

    // Apply friction when no movement input (deceleration)
    // Use wasOnGround (saved at start of frame) because onGround may be temporarily reset
    // Only apply when in Idle state (no movement keys pressed)
    // IMPORTANT: This must happen BEFORE gravity/falling state changes below
    if (this.wasOnGround && this.state === CharacterState.Idle) {
      if (this.velocity.x > 0) {
        this.velocity.x -= DECELERATION * deltaTime;
        if (this.velocity.x < 0) this.velocity.x = 0;
      } else if (this.velocity.x < 0) {
        this.velocity.x += DECELERATION * deltaTime;
        if (this.velocity.x > 0) this.velocity.x = 0;
      }
    }

    // Apply gravity if not on ground
    // Use wasOnGround for state changes to avoid animation flickering on crates
    // (onGround is temporarily reset each frame before crate collision detection)
    if (!this.wasOnGround) {
      this.velocity.y += GRAVITY * deltaTime;

      // Cap fall speed
      if (this.velocity.y > MAX_FALL_SPEED) {
        this.velocity.y = MAX_FALL_SPEED;
      }

      // Update state based on vertical velocity
      this.state = this.velocity.y < 0 ? CharacterState.Jumping : CharacterState.Falling;
    }

    // Transition to Idle when stopped and on ground
    if (this.onGround && Math.abs(this.velocity.x) < 1 && this.state === CharacterState.Walking) {
      this.velocity.x = 0;
      this.state = CharacterState.Idle;
    }

    // Update animation timers based on state
    if (this.state === CharacterState.Walking) {
      // Walk animation: walk1 -> walk2 -> walk1 -> walk3
      this.walkAnimationTimer += deltaTime;
      if (this.walkAnimationTimer >= WALK_ANIMATION_SPEED) {
        this.walkAnimationTimer = 0;
        this.walkSequenceIndex = (this.walkSequenceIndex + 1) % WALK_SEQUENCE.length;
      }
      // Reset other animations
      this.pushAnimationTimer = 0;
      this.pushSequenceIndex = 0;
      this.idleAnimationTimer = 0;
      this.idleSequenceIndex = 0;
    } else if (this.state === CharacterState.Pushing) {
      // Push animation: push1 -> push2 -> push3
      this.pushAnimationTimer += deltaTime;
      if (this.pushAnimationTimer >= PUSH_ANIMATION_SPEED) {
        this.pushAnimationTimer = 0;
        this.pushSequenceIndex = (this.pushSequenceIndex + 1) % PUSH_SEQUENCE.length;
      }
      // Reset other animations
      this.walkAnimationTimer = 0;
      this.walkSequenceIndex = 0;
      this.idleAnimationTimer = 0;
      this.idleSequenceIndex = 0;
    } else if (this.state === CharacterState.Idle) {
      // Idle animation: up -> front -> left -> front -> right -> front
      const currentIdleSpeed =
        this.idleSequenceIndex === 0 ? IDLE_UP_DURATION : IDLE_ANIMATION_SPEED;
      this.idleAnimationTimer += deltaTime;
      if (this.idleAnimationTimer >= currentIdleSpeed) {
        this.idleAnimationTimer = 0;
        this.idleSequenceIndex = (this.idleSequenceIndex + 1) % IDLE_SEQUENCE.length;
        // Check if current frame is "look left"
        this.idleLookingLeft = IDLE_LOOK_LEFT_INDICES.includes(this.idleSequenceIndex);
      }
      // Reset other animations
      this.walkAnimationTimer = 0;
      this.walkSequenceIndex = 0;
      this.pushAnimationTimer = 0;
      this.pushSequenceIndex = 0;
    } else {
      // Reset all animations when jumping/falling
      this.walkAnimationTimer = 0;
      this.walkSequenceIndex = 0;
      this.pushAnimationTimer = 0;
      this.pushSequenceIndex = 0;
      this.idleAnimationTimer = 0;
      this.idleSequenceIndex = 0;
    }

    // Update position based on velocity
    this.x += this.velocity.x * deltaTime;
    this.y += this.velocity.y * deltaTime;
  }

  /**
   * Get the current animation frame based on character state
   * Returns the frame name to use for texture lookup
   */
  getCurrentAnimationFrame(): CharacterAnimationFrame {
    let frame: CharacterAnimationFrame;

    switch (this.state) {
      case CharacterState.Jumping:
      case CharacterState.Falling:
        frame = 'jump';
        break;
      case CharacterState.Walking:
        frame = WALK_SEQUENCE[this.walkSequenceIndex];
        break;
      case CharacterState.Pushing:
        frame = PUSH_SEQUENCE[this.pushSequenceIndex];
        break;
      case CharacterState.Idle:
      default:
        frame = IDLE_SEQUENCE[this.idleSequenceIndex];
        break;
    }

    this.lastAnimationFrame = frame;
    return frame;
  }

  /**
   * Check if idle animation is currently looking left (needs sprite mirror)
   */
  isIdleLookingLeft(): boolean {
    return this.state === CharacterState.Idle && this.idleLookingLeft;
  }

  /**
   * Check if animation frame has changed since last call
   */
  hasAnimationFrameChanged(): boolean {
    const currentFrame = this.getCurrentAnimationFrame();
    return currentFrame !== this.lastAnimationFrame;
  }

  /**
   * Get the character's position
   */
  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  /**
   * Set the character's position
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Reset character to initial state
   */
  reset(): void {
    this.velocity = { x: 0, y: 0 };
    this.state = CharacterState.Idle;
    this.onGround = false;
    this.wasOnGround = false;
    this.superJumpActive = false;
    this.superJumpEndTime = 0;
    this.facingRight = true;
    this.scale.x = Math.abs(this.scale.x);
    // Reset all animation states
    this.walkAnimationTimer = 0;
    this.walkSequenceIndex = 0;
    this.pushAnimationTimer = 0;
    this.pushSequenceIndex = 0;
    this.idleAnimationTimer = 0;
    this.idleSequenceIndex = 0;
    this.idleLookingLeft = false;
    this.lastAnimationFrame = 'idle_front';
  }

  /**
   * Check if character is facing right
   */
  isFacingRight(): boolean {
    return this.facingRight;
  }

  /**
   * Get bounding box for collision detection
   * Uses narrower collision width than sprite so character can fit in 1-crate niches
   */
  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    const collisionWidth = this.width * COLLISION_WIDTH_RATIO;
    return {
      x: this.x - collisionWidth / 2,
      y: this.y - this.height,
      width: collisionWidth,
      height: this.height,
    };
  }
}
