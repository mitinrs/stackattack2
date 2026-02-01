/**
 * DisplayScaler - Handles canvas scaling while maintaining aspect ratio
 *
 * Manages the fixed logical resolution (240x320) and scales it proportionally
 * to fit any viewport size using letterboxing or pillarboxing.
 */

export class DisplayScaler {
  private logicalWidth: number;
  private logicalHeight: number;

  constructor(logicalWidth: number, logicalHeight: number) {
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
  }

  /**
   * Calculate the scale factor that maintains aspect ratio
   */
  calculateScale(viewportWidth: number, viewportHeight: number): number {
    const scaleX = viewportWidth / this.logicalWidth;
    const scaleY = viewportHeight / this.logicalHeight;

    // Use the smaller scale to ensure the entire game fits in viewport
    return Math.min(scaleX, scaleY);
  }

  /**
   * Get the scaled dimensions for the canvas
   */
  getScaledDimensions(
    viewportWidth: number,
    viewportHeight: number
  ): {
    width: number;
    height: number;
  } {
    const scale = this.calculateScale(viewportWidth, viewportHeight);

    return {
      width: Math.floor(this.logicalWidth * scale),
      height: Math.floor(this.logicalHeight * scale),
    };
  }

  /**
   * Apply scaling to a canvas element
   */
  applyScaling(canvas: HTMLCanvasElement, viewportWidth: number, viewportHeight: number): void {
    const { width, height } = this.getScaledDimensions(viewportWidth, viewportHeight);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  /**
   * Get the logical resolution
   */
  getLogicalResolution(): { width: number; height: number } {
    return {
      width: this.logicalWidth,
      height: this.logicalHeight,
    };
  }
}
