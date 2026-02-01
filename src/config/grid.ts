/**
 * Grid Configuration
 * Defines the game area grid for crate positioning
 */

export interface GridConfig {
  /** Number of columns in the grid */
  columns: number;
  /** Number of rows in the grid */
  rows: number;
  /** Width of each cell in pixels */
  cellWidth: number;
  /** Height of each cell in pixels */
  cellHeight: number;
  /** Y position of the ground (bottom of play area) */
  groundY: number;
  /** Y position of the top threshold (game over line) */
  topThresholdY: number;
}

/**
 * Default grid configuration based on 224x320 logical resolution
 *
 * Layout:
 * - Score/HUD area at top: ~30px
 * - Crane area: ~20px
 * - Play area: ~240px
 * - Character ground: ~30px reserved
 *
 * Grid cells:
 * - 12 columns x 15 rows (fills space between 16px walls)
 * - Each cell: 16x16 pixels
 * - Total grid: 192x240 pixels
 * - Walls at x=0-16 and x=208-224
 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  columns: 12, // (224 - 16*2) / 16 = 12 columns between walls
  rows: 15,
  cellWidth: 16,
  cellHeight: 16,
  groundY: 290, // Bottom of play area
  topThresholdY: 50, // Top threshold for game over
};

// Wall thickness constant
const WALL_WIDTH = 16;

/**
 * Get the X position for the left edge of the grid
 * Grid starts right after the left wall
 */
export function getGridLeftX(_config: GridConfig = DEFAULT_GRID_CONFIG): number {
  return WALL_WIDTH; // Start right after 16px left wall
}

/**
 * Get the X position for the right edge of the grid
 */
export function getGridRightX(config: GridConfig = DEFAULT_GRID_CONFIG): number {
  return getGridLeftX(config) + config.columns * config.cellWidth;
}

/**
 * Convert pixel X position to grid column
 */
export function pixelToColumn(x: number, config: GridConfig = DEFAULT_GRID_CONFIG): number {
  const gridLeft = getGridLeftX(config);
  const column = Math.floor((x - gridLeft) / config.cellWidth);
  return Math.max(0, Math.min(config.columns - 1, column));
}

/**
 * Convert grid column to pixel X position (center of cell)
 */
export function columnToPixelX(column: number, config: GridConfig = DEFAULT_GRID_CONFIG): number {
  const gridLeft = getGridLeftX(config);
  return gridLeft + column * config.cellWidth + config.cellWidth / 2;
}

/**
 * Convert pixel Y position to grid row
 */
export function pixelToRow(y: number, config: GridConfig = DEFAULT_GRID_CONFIG): number {
  const row = Math.floor((config.groundY - y) / config.cellHeight);
  return Math.max(0, Math.min(config.rows - 1, row));
}

/**
 * Convert grid row to pixel Y position (bottom of cell)
 */
export function rowToPixelY(row: number, config: GridConfig = DEFAULT_GRID_CONFIG): number {
  return config.groundY - row * config.cellHeight;
}

/**
 * Get the CrateManager configuration from grid config
 */
export function getCrateManagerConfig(config: GridConfig = DEFAULT_GRID_CONFIG) {
  return {
    gridColumns: config.columns,
    gridRows: config.rows,
    cellWidth: config.cellWidth,
    cellHeight: config.cellHeight,
    groundY: config.groundY,
  };
}
