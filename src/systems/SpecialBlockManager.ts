/**
 * Special Block Manager System
 * Handles special block activation, effects, and visual feedback
 */

import { Container, Text, TextStyle } from 'pixi.js';
import { SPECIAL_BLOCK_EFFECTS } from '../entities/SpecialBlock';
import type { SpecialBlockEffect } from '../entities/SpecialBlock';
import { Crate } from '../entities/Crate';
import { Character } from '../entities/Character';
import { CrateType } from '../types/entities';

export interface SpecialEffectState {
  superJumpActive: boolean;
  superJumpEndTime: number;
  helmetActive: boolean;
  extraLives: number;
}

export interface ActivationResult {
  activated: boolean;
  effect: SpecialBlockEffect | null;
  message: string;
}

export interface SpecialBlockManagerConfig {
  effectDurationSuperJump: number; // milliseconds
  extraPointsValue: number;
  initialExtraLives: number; // Starting extra lives
  maxExtraLives: number; // Maximum extra lives allowed
}

const DEFAULT_CONFIG: SpecialBlockManagerConfig = {
  effectDurationSuperJump: 10000, // 10 seconds
  extraPointsValue: 500,
  initialExtraLives: 1, // Start with 1 extra life
  maxExtraLives: 3, // Maximum 3 extra lives
};

export class SpecialBlockManager extends Container {
  private config: SpecialBlockManagerConfig;
  private effectState: SpecialEffectState;
  private feedbackTexts: Text[];
  private pendingScore: number;

  constructor(config: Partial<SpecialBlockManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.effectState = {
      superJumpActive: false,
      superJumpEndTime: 0,
      helmetActive: false,
      extraLives: this.config.initialExtraLives,
    };
    this.feedbackTexts = [];
    this.pendingScore = 0;
  }

  /**
   * Check for player-special block collision and activate if found
   */
  checkAndActivateCollision(character: Character, crates: Crate[]): ActivationResult | null {
    const charBounds = character.getCollisionBounds();

    for (const crate of crates) {
      // Skip non-special or already activated blocks
      if (!crate.isSpecial() || !crate.isLanded()) {
        continue;
      }

      const crateBounds = crate.getCollisionBounds();

      // Check collision
      if (this.boundsOverlap(charBounds, crateBounds)) {
        return this.activateBlock(crate, character);
      }
    }

    return null;
  }

  /**
   * Check if two bounding boxes overlap
   */
  private boundsOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }

  /**
   * Activate a special block
   */
  activateBlock(crate: Crate, character: Character): ActivationResult {
    const crateType = crate.getCrateType();

    // Handle based on type
    let message = '';
    let effect: SpecialBlockEffect | null = null;

    switch (crateType) {
      case CrateType.ExtraPoints:
        effect = this.activateExtraPoints();
        message = `+${this.config.extraPointsValue} Points!`;
        break;

      case CrateType.SuperJump:
        effect = this.activateSuperJump(character);
        message = 'Super Jump!';
        break;

      case CrateType.Helmet:
        effect = this.activateHelmet();
        message = 'Helmet Protection!';
        break;

      case CrateType.ExtraLife:
        effect = this.activateExtraLife();
        if (effect.applied) {
          message = `+1 Life! (${this.effectState.extraLives}/${this.config.maxExtraLives})`;
        } else {
          message = 'Lives Full!';
        }
        break;

      default:
        return { activated: false, effect: null, message: '' };
    }

    // Show visual feedback
    if (effect && effect.applied) {
      this.showActivationFeedback(message, crate.x, crate.y);
    }

    return { activated: true, effect, message };
  }

  /**
   * Activate extra points effect
   */
  private activateExtraPoints(): SpecialBlockEffect {
    this.pendingScore += this.config.extraPointsValue;

    return {
      type: CrateType.ExtraPoints,
      applied: true,
      points: this.config.extraPointsValue,
    };
  }

  /**
   * Activate super jump effect
   */
  private activateSuperJump(character: Character): SpecialBlockEffect {
    this.effectState.superJumpActive = true;
    this.effectState.superJumpEndTime = Date.now() + this.config.effectDurationSuperJump;

    // Apply to character
    character.activateSuperJump(this.config.effectDurationSuperJump);

    return {
      type: CrateType.SuperJump,
      applied: true,
      duration: this.config.effectDurationSuperJump,
      jumpMultiplier: 1.5,
    };
  }

  /**
   * Activate helmet protection effect
   */
  private activateHelmet(): SpecialBlockEffect {
    this.effectState.helmetActive = true;

    return {
      type: CrateType.Helmet,
      applied: true,
      duration: -1, // Until used
    };
  }

  /**
   * Activate extra life effect
   */
  private activateExtraLife(): SpecialBlockEffect {
    if (this.effectState.extraLives >= this.config.maxExtraLives) {
      // Already at max lives
      return {
        type: CrateType.ExtraLife,
        applied: false,
      };
    }

    this.effectState.extraLives++;

    return {
      type: CrateType.ExtraLife,
      applied: true,
    };
  }

  /**
   * Show visual feedback when a special block is activated
   */
  private showActivationFeedback(message: string, x: number, y: number): void {
    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 8,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 2 },
    });

    const text = new Text({ text: message, style });
    text.anchor.set(0.5, 1);
    text.x = x;
    text.y = y - 10;

    // Store for animation
    (text as FeedbackText).createdAt = Date.now();
    (text as FeedbackText).duration = 1500; // 1.5 seconds

    this.feedbackTexts.push(text);
    this.addChild(text);
  }

  /**
   * Update the special block manager
   */
  update(_deltaTime: number): void {
    const currentTime = Date.now();

    // Update super jump effect
    if (this.effectState.superJumpActive && currentTime >= this.effectState.superJumpEndTime) {
      this.effectState.superJumpActive = false;
    }

    // Update feedback texts (animate and remove expired)
    for (let i = this.feedbackTexts.length - 1; i >= 0; i--) {
      const text = this.feedbackTexts[i] as FeedbackText;
      const elapsed = currentTime - text.createdAt;

      if (elapsed >= text.duration) {
        // Remove expired text
        this.removeChild(text);
        text.destroy();
        this.feedbackTexts.splice(i, 1);
      } else {
        // Animate: float upward and fade
        const progress = elapsed / text.duration;
        text.y -= 0.5; // Float up
        text.alpha = 1 - progress; // Fade out
      }
    }
  }

  /**
   * Get the current effect state
   */
  getEffectState(): SpecialEffectState {
    return { ...this.effectState };
  }

  /**
   * Check if super jump is active
   */
  isSuperJumpActive(): boolean {
    return this.effectState.superJumpActive;
  }

  /**
   * Get remaining super jump time in milliseconds
   */
  getSuperJumpRemainingTime(): number {
    if (!this.effectState.superJumpActive) {
      return 0;
    }
    return Math.max(0, this.effectState.superJumpEndTime - Date.now());
  }

  /**
   * Check if helmet protection is active
   */
  isHelmetActive(): boolean {
    return this.effectState.helmetActive;
  }

  /**
   * Consume helmet protection (returns true if helmet was active and consumed)
   */
  consumeHelmet(): boolean {
    if (this.effectState.helmetActive) {
      this.effectState.helmetActive = false;
      return true;
    }
    return false;
  }

  /**
   * Get current extra lives count
   */
  getExtraLives(): number {
    return this.effectState.extraLives;
  }

  /**
   * Get maximum extra lives allowed
   */
  getMaxExtraLives(): number {
    return this.config.maxExtraLives;
  }

  /**
   * Consume an extra life (returns true if a life was available and consumed)
   */
  consumeLife(): boolean {
    if (this.effectState.extraLives > 0) {
      this.effectState.extraLives--;
      return true;
    }
    return false;
  }

  /**
   * Get and clear pending score (from extra points blocks)
   */
  getPendingScore(): number {
    const score = this.pendingScore;
    this.pendingScore = 0;
    return score;
  }

  /**
   * Check pending score without clearing
   */
  peekPendingScore(): number {
    return this.pendingScore;
  }

  /**
   * Get effect description for a crate type
   */
  static getEffectDescription(crateType: CrateType): string {
    return SPECIAL_BLOCK_EFFECTS[crateType].description;
  }

  /**
   * Get effect name for a crate type
   */
  static getEffectName(crateType: CrateType): string {
    return SPECIAL_BLOCK_EFFECTS[crateType].name;
  }

  /**
   * Reset the special block manager
   */
  reset(): void {
    this.effectState = {
      superJumpActive: false,
      superJumpEndTime: 0,
      helmetActive: false,
      extraLives: this.config.initialExtraLives,
    };
    this.pendingScore = 0;

    // Clear feedback texts
    for (const text of this.feedbackTexts) {
      this.removeChild(text);
      text.destroy();
    }
    this.feedbackTexts = [];
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.reset();
    super.destroy();
  }
}

// Extended Text interface for feedback animation
interface FeedbackText extends Text {
  createdAt: number;
  duration: number;
}
