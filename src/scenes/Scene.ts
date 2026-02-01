/**
 * Base Scene abstract class
 * Provides lifecycle methods for all scenes
 */

import { Container } from 'pixi.js';
import type { SceneType } from '../types/game';

export abstract class Scene {
  protected container: Container;
  protected sceneType: SceneType;
  protected isInitialized: boolean = false;

  constructor(sceneType: SceneType) {
    this.sceneType = sceneType;
    this.container = new Container();
  }

  /**
   * Get the scene's container
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Get the scene type
   */
  getType(): SceneType {
    return this.sceneType;
  }

  /**
   * Initialize the scene (called once)
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    await this.onCreate();
    this.isInitialized = true;
  }

  /**
   * Called when scene is created (override in subclasses)
   */
  protected abstract onCreate(): Promise<void>;

  /**
   * Called when scene becomes active
   */
  onEnter(): void {
    this.container.visible = true;
  }

  /**
   * Called when scene becomes inactive
   */
  onExit(): void {
    this.container.visible = false;
  }

  /**
   * Update scene logic (called every frame)
   */
  update(_deltaTime: number): void {
    // Override in subclasses if needed
  }

  /**
   * Called when scene is destroyed
   */
  destroy(): void {
    this.container.destroy({ children: true });
    this.isInitialized = false;
  }

  /**
   * Check if scene is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
