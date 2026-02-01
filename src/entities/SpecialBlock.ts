/**
 * Special Block Entity
 * Extends Crate with special effect functionality
 *
 * Special blocks look identical to regular crates until activated.
 * Types:
 * - ExtraPoints: Add 500 bonus points immediately
 * - SuperJump: Increase character jumpHeight by 50% for 10 seconds
 * - Helmet: Prevent next game over (single use)
 */

import { Crate } from './Crate';
import type { CrateConfig } from './Crate';
import { CrateType } from '../types/entities';

export interface SpecialBlockConfig extends CrateConfig {
  type: CrateType;
}

export const SPECIAL_BLOCK_EFFECTS = {
  [CrateType.ExtraPoints]: {
    name: 'Extra Points',
    description: 'Add 500 bonus points immediately',
    pointValue: 500,
    duration: 0, // Instant effect
  },
  [CrateType.SuperJump]: {
    name: 'Super Jump',
    description: 'Increase jump height by 50% for 10 seconds',
    pointValue: 0,
    duration: 10000, // 10 seconds in milliseconds
    jumpMultiplier: 1.5,
  },
  [CrateType.Helmet]: {
    name: 'Helmet Protection',
    description: 'Prevent next game over (single use)',
    pointValue: 0,
    duration: -1, // Until used
  },
  [CrateType.ExtraLife]: {
    name: 'Extra Life',
    description: 'Add one extra life (max 3)',
    pointValue: 0,
    duration: 0, // Instant effect
  },
  [CrateType.Regular]: {
    name: 'Regular',
    description: 'No special effect',
    pointValue: 0,
    duration: 0,
  },
  [CrateType.Bomb]: {
    name: 'Bomb',
    description: 'Explodes after 5 seconds, destroying nearby crates',
    pointValue: 0,
    duration: 5000, // 5 seconds fuse time
  },
};

export class SpecialBlock extends Crate {
  private activated: boolean;
  private activationTime: number;

  constructor(config: SpecialBlockConfig) {
    super(config);
    this.activated = false;
    this.activationTime = 0;
  }

  /**
   * Check if this block has been activated
   */
  isActivated(): boolean {
    return this.activated;
  }

  /**
   * Get the time this block was activated
   */
  getActivationTime(): number {
    return this.activationTime;
  }

  /**
   * Activate the special block effect
   * Returns the effect data for the caller to apply
   */
  activate(): SpecialBlockEffect {
    if (this.activated) {
      return { type: CrateType.Regular, applied: false };
    }

    this.activated = true;
    this.activationTime = Date.now();

    const effectData = SPECIAL_BLOCK_EFFECTS[this.getCrateType()];

    return {
      type: this.getCrateType(),
      applied: true,
      points: effectData.pointValue,
      duration: effectData.duration,
      jumpMultiplier:
        this.getCrateType() === CrateType.SuperJump
          ? (effectData as (typeof SPECIAL_BLOCK_EFFECTS)[typeof CrateType.SuperJump])
              .jumpMultiplier
          : undefined,
    };
  }

  /**
   * Get the effect description for this special block
   */
  getEffectDescription(): string {
    return SPECIAL_BLOCK_EFFECTS[this.getCrateType()].description;
  }

  /**
   * Get the effect name for this special block
   */
  getEffectName(): string {
    return SPECIAL_BLOCK_EFFECTS[this.getCrateType()].name;
  }

  /**
   * Reset the special block state
   */
  resetSpecial(): void {
    this.activated = false;
    this.activationTime = 0;
    this.reset();
  }
}

export interface SpecialBlockEffect {
  type: CrateType;
  applied: boolean;
  points?: number;
  duration?: number;
  jumpMultiplier?: number;
}
