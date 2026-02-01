/**
 * Scene Manager System
 * Manages scene stack and transitions with smooth animations
 */

import type { Application, Container } from 'pixi.js';
import { Container as PixiContainer } from 'pixi.js';
import type { Scene } from '../scenes/Scene';
import type { SceneType } from '../types/game';

export class SceneManager {
  private app: Application;
  private sceneStack: Scene[] = [];
  private sceneRegistry: Map<SceneType, Scene> = new Map();
  private sceneContainer: Container;
  private isTransitioning: boolean = false;

  constructor(app: Application) {
    this.app = app;
    this.sceneContainer = new PixiContainer();
    this.app.stage.addChild(this.sceneContainer);
  }

  /**
   * Get the PixiJS application instance
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Register a scene for later use
   */
  registerScene(scene: Scene): void {
    this.sceneRegistry.set(scene.getType(), scene);
  }

  /**
   * Get a registered scene
   */
  getScene(sceneType: SceneType): Scene | undefined {
    return this.sceneRegistry.get(sceneType);
  }

  /**
   * Get the current active scene
   */
  getCurrentScene(): Scene | undefined {
    return this.sceneStack.length > 0 ? this.sceneStack[this.sceneStack.length - 1] : undefined;
  }

  /**
   * Check if a transition is in progress
   */
  isTransitionInProgress(): boolean {
    return this.isTransitioning;
  }

  /**
   * Push a new scene onto the stack with optional transition
   */
  async push(sceneType: SceneType, animate: boolean = false): Promise<void> {
    if (this.isTransitioning) {
      console.warn('Scene transition already in progress');
      return;
    }

    const scene = this.sceneRegistry.get(sceneType);
    if (!scene) {
      console.error(`Scene ${sceneType} not registered`);
      return;
    }

    this.isTransitioning = true;

    try {
      // Exit current scene if exists
      const currentScene = this.getCurrentScene();
      if (currentScene) {
        if (animate) {
          await this.animateSceneOut(currentScene);
        }
        currentScene.onExit();
      }

      // Initialize scene if not already initialized
      if (!scene.isReady()) {
        await scene.init();
      }

      // Add scene to stack and container
      this.sceneStack.push(scene);
      this.sceneContainer.addChild(scene.getContainer());

      if (animate) {
        await this.animateSceneIn(scene);
      }

      scene.onEnter();
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Pop the current scene from the stack
   */
  pop(animate: boolean = false): void {
    if (this.isTransitioning) {
      console.warn('Scene transition already in progress');
      return;
    }

    if (this.sceneStack.length === 0) {
      console.warn('Cannot pop scene: stack is empty');
      return;
    }

    this.isTransitioning = true;

    // Exit and remove current scene
    const currentScene = this.sceneStack.pop();
    if (currentScene) {
      if (animate) {
        this.animateSceneOut(currentScene).then(() => {
          currentScene.onExit();
          this.sceneContainer.removeChild(currentScene.getContainer());
          this.finishPop();
        });
      } else {
        currentScene.onExit();
        this.sceneContainer.removeChild(currentScene.getContainer());
        this.finishPop();
      }
    } else {
      this.isTransitioning = false;
    }
  }

  private finishPop(): void {
    // Enter previous scene if exists
    const previousScene = this.getCurrentScene();
    if (previousScene) {
      previousScene.onEnter();
    }
    this.isTransitioning = false;
  }

  /**
   * Replace the current scene with a new one
   */
  async replace(sceneType: SceneType, animate: boolean = false): Promise<void> {
    if (this.isTransitioning) {
      console.warn('Scene transition already in progress');
      return;
    }

    const scene = this.sceneRegistry.get(sceneType);
    if (!scene) {
      console.error(`Scene ${sceneType} not registered`);
      return;
    }

    this.isTransitioning = true;

    try {
      // Remove current scene if exists
      if (this.sceneStack.length > 0) {
        const currentScene = this.sceneStack.pop();
        if (currentScene) {
          if (animate) {
            await this.animateSceneOut(currentScene);
          }
          currentScene.onExit();
          this.sceneContainer.removeChild(currentScene.getContainer());
        }
      }

      // Initialize scene if not already initialized
      if (!scene.isReady()) {
        await scene.init();
      }

      // Add new scene
      this.sceneStack.push(scene);
      this.sceneContainer.addChild(scene.getContainer());

      if (animate) {
        await this.animateSceneIn(scene);
      }

      scene.onEnter();
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Clear all scenes from the stack
   */
  clear(): void {
    while (this.sceneStack.length > 0) {
      const scene = this.sceneStack.pop();
      if (scene) {
        scene.onExit();
        this.sceneContainer.removeChild(scene.getContainer());
      }
    }
  }

  /**
   * Update the current scene
   */
  update(deltaTime: number): void {
    const currentScene = this.getCurrentScene();
    if (currentScene) {
      currentScene.update(deltaTime);
    }
  }

  /**
   * Get the size of the scene stack
   */
  getStackSize(): number {
    return this.sceneStack.length;
  }

  /**
   * Animate scene entering (fade in)
   */
  private async animateSceneIn(scene: Scene): Promise<void> {
    const container = scene.getContainer();
    container.alpha = 0;

    return new Promise((resolve) => {
      const duration = 200; // ms
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        container.alpha = this.easeOutQuad(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          container.alpha = 1;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Animate scene exiting (fade out)
   */
  private async animateSceneOut(scene: Scene): Promise<void> {
    const container = scene.getContainer();

    return new Promise((resolve) => {
      const duration = 150; // ms
      const startTime = performance.now();
      const startAlpha = container.alpha;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        container.alpha = startAlpha * (1 - this.easeInQuad(progress));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          container.alpha = 0;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Easing function: ease out quad
   */
  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  /**
   * Easing function: ease in quad
   */
  private easeInQuad(t: number): number {
    return t * t;
  }

  /**
   * Destroy the scene manager
   */
  destroy(): void {
    this.clear();
    this.sceneRegistry.clear();
    this.sceneContainer.destroy({ children: true });
  }
}
