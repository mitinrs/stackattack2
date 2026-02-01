/**
 * Crate Manager System
 * Manages crate physics, stacking, collision detection, and line clearing
 * Optimized for performance with efficient collision detection
 */

import { Container } from 'pixi.js';
import { Crate } from '../entities/Crate';
import { CrateType, type CrateColor } from '../types/entities';
import type { Character } from '../entities/Character';
import { getGridLeftX } from '../config/grid';
import { MatchDetector } from './MatchDetector';

export interface CrateManagerConfig {
  gridColumns: number;
  gridRows: number;
  cellWidth: number;
  cellHeight: number;
  groundY: number;
}

export interface CollisionResult {
  collidedWithGround: boolean;
  collidedWithCrate: boolean;
  landingRow: number;
  landingY: number;
}

export interface ClearResult {
  linesCleared: number;
  points: number;
  clearedCrates: Crate[];
}

export interface MatchClearResult {
  matchesFound: number;
  points: number;
  clearedCrates: Crate[];
}

export interface BombExplosionResult {
  exploded: boolean;
  points: number;
  clearedCrates: Crate[];
}

/**
 * Point values for line clears
 */
const LINE_CLEAR_POINTS = {
  single: 100,
  double: 250,
  triple: 500,
  quadruple: 800,
};

export class CrateManager extends Container {
  private config: CrateManagerConfig;
  private crates: Crate[];
  private grid: (Crate | null)[][];
  private gameAreaLeft: number;
  private crateIdCounter: number;

  // Object pool for performance
  private cratePool: Crate[] = [];
  private maxPoolSize: number = 50;

  // Match detector for match-3 mechanics
  private matchDetector: MatchDetector;

  constructor(config: CrateManagerConfig) {
    super();
    this.config = config;
    this.crates = [];
    this.crateIdCounter = 0;

    // Initialize empty grid
    this.grid = Array.from({ length: config.gridRows }, () =>
      Array.from({ length: config.gridColumns }, () => null)
    );

    // Use centralized grid left position
    this.gameAreaLeft = getGridLeftX();

    // Initialize match detector
    this.matchDetector = new MatchDetector(config.gridColumns, config.gridRows);
  }

  /**
   * Generate a unique crate ID
   */
  private generateCrateId(): string {
    return `crate-${++this.crateIdCounter}`;
  }

  /**
   * Get the X position for a column (center of cell)
   */
  getColumnCenterX(column: number): number {
    return this.gameAreaLeft + column * this.config.cellWidth + this.config.cellWidth / 2;
  }

  /**
   * Get the Y position for the top of a row
   */
  getRowTopY(row: number): number {
    return this.config.groundY - (row + 1) * this.config.cellHeight;
  }

  /**
   * Get the Y position for the bottom of a row (where crate lands)
   */
  getRowBottomY(row: number): number {
    return this.config.groundY - row * this.config.cellHeight;
  }

  /**
   * Return a crate to the pool for reuse
   */
  private returnCrateToPool(crate: Crate): void {
    if (this.cratePool.length < this.maxPoolSize) {
      crate.reset();
      this.cratePool.push(crate);
    }
  }

  /**
   * Spawn a new crate at a column
   */
  spawnCrate(column: number, type: CrateType, fallSpeed: number, color?: CrateColor): Crate {
    const crate = new Crate({
      id: this.generateCrateId(),
      column: column,
      type: type,
      fallSpeed: fallSpeed,
      color: color,
    });

    // Position crate at top of screen, centered on column
    crate.setPosition(this.getColumnCenterX(column), 0);

    this.crates.push(crate);
    this.addChild(crate);

    return crate;
  }

  /**
   * Add an existing crate (e.g., from crane) to the manager
   */
  addExistingCrate(crate: Crate): void {
    this.crates.push(crate);
    this.addChild(crate);
  }

  /**
   * Check if a grid cell is occupied
   */
  isCellOccupied(column: number, row: number): boolean {
    if (column < 0 || column >= this.config.gridColumns) return true;
    if (row < 0 || row >= this.config.gridRows) return row < 0; // Below grid is occupied (ground)
    return this.grid[row][column] !== null;
  }

  /**
   * Get the crate at a grid position
   */
  getCrateAt(column: number, row: number): Crate | null {
    if (column < 0 || column >= this.config.gridColumns) return null;
    if (row < 0 || row >= this.config.gridRows) return null;
    return this.grid[row][column];
  }

  /**
   * Get the next available landing row for a column
   */
  getNextLandingRow(column: number): number {
    for (let row = 0; row < this.config.gridRows; row++) {
      if (!this.isCellOccupied(column, row)) {
        return row;
      }
    }
    return this.config.gridRows; // Column is full
  }

  /**
   * Get the height of crates stacked in a column (number of occupied rows from bottom)
   */
  getColumnHeight(column: number): number {
    return this.getNextLandingRow(column);
  }

  /**
   * Land a crate at a specific row
   */
  landCrate(crate: Crate, row: number): void {
    const column = crate.getGridColumn();

    // Set grid position
    crate.setGridPosition(column, row);

    // Update grid
    if (row >= 0 && row < this.config.gridRows) {
      this.grid[row][column] = crate;
    }

    // Land the crate at the correct Y position
    const landingY = this.getRowBottomY(row);
    crate.land(landingY);

    // Start bomb timer if this is a bomb crate
    if (crate.isBomb()) {
      crate.startBombTimer();
    }
  }

  /**
   * Remove a crate from the grid and manager
   */
  removeCrate(crate: Crate): void {
    // Remove from grid
    const row = crate.getGridRow();
    const column = crate.getGridColumn();
    if (row >= 0 && row < this.config.gridRows && column >= 0 && column < this.config.gridColumns) {
      if (this.grid[row][column] === crate) {
        this.grid[row][column] = null;
      }
    }

    // Remove from crates array
    const index = this.crates.indexOf(crate);
    if (index !== -1) {
      this.crates.splice(index, 1);
    }

    // Remove from display
    this.removeChild(crate);

    // Return to pool instead of destroying
    this.returnCrateToPool(crate);
  }

  /**
   * Check collisions for a falling crate (optimized)
   */
  checkCollisions(crate: Crate): CollisionResult {
    const column = crate.getGridColumn();
    const crateY = crate.y;
    const crateBottomY = crateY; // Anchor is at bottom
    const crateHeight = this.config.crateSize;

    // Check ground collision first (most common)
    if (crateBottomY >= this.config.groundY) {
      return {
        collidedWithGround: true,
        collidedWithCrate: false,
        landingRow: 0,
        landingY: this.getRowBottomY(0),
      };
    }

    // Check collision with stacked crates in the same column (from grid)
    const nextLandingRow = this.getNextLandingRow(column);
    if (nextLandingRow > 0) {
      // There's a crate below
      const topOfStackY = this.getRowTopY(nextLandingRow - 1);
      if (crateBottomY >= topOfStackY) {
        return {
          collidedWithGround: false,
          collidedWithCrate: true,
          landingRow: nextLandingRow,
          landingY: this.getRowBottomY(nextLandingRow),
        };
      }
    }

    // Check collision with other falling crates in the same column
    for (const other of this.crates) {
      if (other === crate) continue;
      if (other.getGridColumn() !== column) continue;
      if (!other.isFalling()) continue;

      // Check if this crate is above the other and they overlap
      const otherTopY = other.y - crateHeight;
      if (crateBottomY >= otherTopY && crate.y < other.y) {
        // This crate landed on top of the other falling crate
        // The lower crate will handle its own landing, so we stop this one just above
        const landingY = otherTopY;
        const landingRow = Math.max(0, Math.floor((this.config.groundY - landingY) / crateHeight));
        return {
          collidedWithGround: false,
          collidedWithCrate: true,
          landingRow: Math.min(landingRow, this.config.gridRows - 1),
          landingY: landingY,
        };
      }
    }

    // Check collision with sliding crates in the same column
    for (const other of this.crates) {
      if (other === crate) continue;
      if (!other.isSliding()) continue;

      // Check if sliding crate is in or moving through this column
      const otherColumn = Math.round((other.x - this.config.leftMargin) / this.config.crateSize);
      if (otherColumn !== column) continue;

      const otherTopY = other.y - crateHeight;
      if (crateBottomY >= otherTopY) {
        const landingRow = other.getGridRow() + 1;
        if (landingRow < this.config.gridRows) {
          return {
            collidedWithGround: false,
            collidedWithCrate: true,
            landingRow: landingRow,
            landingY: this.getRowBottomY(landingRow),
          };
        }
      }
    }

    return {
      collidedWithGround: false,
      collidedWithCrate: false,
      landingRow: -1,
      landingY: -1,
    };
  }

  /**
   * Get all crates that have no support below them
   */
  getUnsupportedCrates(): Crate[] {
    const unsupported: Crate[] = [];

    for (const crate of this.crates) {
      if (!crate.isLanded()) continue;

      const column = crate.getGridColumn();
      const row = crate.getGridRow();

      // Row 0 is always supported by ground
      if (row === 0) continue;

      // Check if there's support below
      if (!this.isCellOccupied(column, row - 1)) {
        unsupported.push(crate);
      }
    }

    return unsupported;
  }

  /**
   * Get all rows that are complete (all columns filled)
   */
  getCompleteRows(): number[] {
    const completeRows: number[] = [];

    for (let row = 0; row < this.config.gridRows; row++) {
      let isComplete = true;
      for (let col = 0; col < this.config.gridColumns; col++) {
        if (this.grid[row][col] === null) {
          isComplete = false;
          break;
        }
      }
      if (isComplete) {
        completeRows.push(row);
      }
    }

    return completeRows;
  }

  /**
   * Clear complete rows and return the number cleared
   */
  clearCompleteRows(): number {
    const completeRows = this.getCompleteRows();

    for (const row of completeRows) {
      this.clearRow(row);
    }

    return completeRows.length;
  }

  /**
   * Clear a specific row
   */
  private clearRow(row: number): Crate[] {
    const clearedCrates: Crate[] = [];

    for (let col = 0; col < this.config.gridColumns; col++) {
      const crate = this.grid[row][col];
      if (crate) {
        clearedCrates.push(crate);
        crate.startClearing();
        // Remove from grid but keep in crates array for animation
        this.grid[row][col] = null;
      }
    }

    return clearedCrates;
  }

  /**
   * Clear complete rows and calculate points
   */
  clearCompleteRowsWithPoints(): ClearResult {
    const completeRows = this.getCompleteRows();
    const clearedCrates: Crate[] = [];

    for (const row of completeRows) {
      clearedCrates.push(...this.clearRow(row));
    }

    const linesCleared = completeRows.length;
    let points = 0;

    // Calculate points based on number of lines cleared
    switch (linesCleared) {
      case 1:
        points = LINE_CLEAR_POINTS.single;
        break;
      case 2:
        points = LINE_CLEAR_POINTS.double;
        break;
      case 3:
        points = LINE_CLEAR_POINTS.triple;
        break;
      case 4:
      default:
        points = linesCleared >= 4 ? LINE_CLEAR_POINTS.quadruple : 0;
        break;
    }

    return { linesCleared, points, clearedCrates };
  }

  /**
   * Detect and clear color matches (3+ in a row)
   * Returns points awarded and crates cleared
   */
  detectAndClearMatches(): MatchClearResult {
    const result = this.matchDetector.detectMatches(this.grid);

    if (result.cratesToClear.length === 0) {
      return { matchesFound: 0, points: 0, clearedCrates: [] };
    }

    // Start clearing animation for matched crates (only landed crates)
    for (const crate of result.cratesToClear) {
      crate.startClearing();
      // Remove from grid immediately (crate will animate and be removed later)
      const row = crate.getGridRow();
      const col = crate.getGridColumn();
      if (row >= 0 && row < this.config.gridRows && col >= 0 && col < this.config.gridColumns) {
        if (this.grid[row][col] === crate) {
          this.grid[row][col] = null;
        }
      }
    }

    return {
      matchesFound: result.matches.length,
      points: result.totalPoints,
      clearedCrates: result.cratesToClear,
    };
  }

  /**
   * Check for and process bomb explosions
   * Returns explosion results
   */
  checkAndProcessBombs(): BombExplosionResult {
    const explodingBombs: Crate[] = [];

    // Find all bombs ready to explode
    for (const crate of this.crates) {
      if (crate.isBomb() && crate.isLanded() && crate.shouldExplode()) {
        explodingBombs.push(crate);
      }
    }

    if (explodingBombs.length === 0) {
      return { exploded: false, points: 0, clearedCrates: [] };
    }

    const clearedCrates: Crate[] = [];
    let totalPoints = 0;

    for (const bomb of explodingBombs) {
      const col = bomb.getGridColumn();
      const row = bomb.getGridRow();

      // Explode in 3x3 area around bomb (1 cell radius)
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const targetCol = col + dc;
          const targetRow = row + dr;

          if (targetCol < 0 || targetCol >= this.config.gridColumns) continue;
          if (targetRow < 0 || targetRow >= this.config.gridRows) continue;

          const targetCrate = this.grid[targetRow][targetCol];
          if (targetCrate && !targetCrate.isClearing() && !targetCrate.isExploding()) {
            // Start explosion animation
            targetCrate.startExploding();
            clearedCrates.push(targetCrate);

            // Remove from grid
            this.grid[targetRow][targetCol] = null;

            // Award points for destroyed crates (10 points each)
            totalPoints += 10;
          }
        }
      }

      // Start explosion animation for the bomb itself if not already added
      if (!clearedCrates.includes(bomb)) {
        bomb.startExploding();
        clearedCrates.push(bomb);
        this.grid[row][col] = null;
      }
    }

    return {
      exploded: true,
      points: totalPoints,
      clearedCrates,
    };
  }

  /**
   * Get the grid (for external match detection if needed)
   */
  getGrid(): (Crate | null)[][] {
    return this.grid;
  }

  /**
   * Process gravity for unsupported crates after line clear
   * Crates will fall with animation instead of teleporting
   */
  processGravity(): void {
    // Need to process from bottom to top to avoid cascading issues
    for (let row = 1; row < this.config.gridRows; row++) {
      for (let col = 0; col < this.config.gridColumns; col++) {
        const crate = this.grid[row][col];
        if (crate && !this.isCellOccupied(col, row - 1)) {
          // Remove from grid - crate will be re-added when it lands
          this.grid[row][col] = null;

          // Start falling animation (crate will land naturally via update loop)
          crate.resumeFalling();
        }
      }
    }
  }

  /**
   * Check for character-crate collision and handle pushing (optimized)
   */
  checkPushCollision(
    character: Character,
    pushDirection: number
  ): { canPush: boolean; cratesToPush: Crate[] } {
    const charBounds = character.getCollisionBounds();
    const pushStrength = character.getPushStrength();

    // Find crate character is ADJACENT to (not overlapping, but next to)
    let touchedCrate: Crate | null = null;
    let touchedColumn = -1;
    let touchedRow = -1;

    // Only check landed crates
    const landedCrates = this.crates.filter((c) => c.isLanded());

    // Adjacency threshold - how close character needs to be to push
    const adjacencyThreshold = 4; // pixels

    for (const crate of landedCrates) {
      const crateBounds = crate.getCollisionBounds();

      // Check if character is at same vertical level as crate
      const verticalMatch =
        charBounds.y + charBounds.height > crateBounds.y + 2 &&
        charBounds.y < crateBounds.y + crateBounds.height - 2;

      if (!verticalMatch) continue;

      // Check adjacency based on push direction
      if (pushDirection > 0) {
        // Pushing right - character should be to the LEFT of crate
        const charRight = charBounds.x + charBounds.width;
        const crateLeft = crateBounds.x;
        const distance = crateLeft - charRight;

        if (distance >= -2 && distance <= adjacencyThreshold) {
          touchedCrate = crate;
          touchedColumn = crate.getGridColumn();
          touchedRow = crate.getGridRow();
          break;
        }
      } else {
        // Pushing left - character should be to the RIGHT of crate
        const charLeft = charBounds.x;
        const crateRight = crateBounds.x + crateBounds.width;
        const distance = charLeft - crateRight;

        if (distance >= -2 && distance <= adjacencyThreshold) {
          touchedCrate = crate;
          touchedColumn = crate.getGridColumn();
          touchedRow = crate.getGridRow();
          break;
        }
      }
    }

    if (!touchedCrate) {
      return { canPush: false, cratesToPush: [] };
    }

    // Count crates in push direction
    const cratesToPush: Crate[] = [touchedCrate];
    let checkColumn = touchedColumn + pushDirection;
    let crateCount = 1;

    while (
      checkColumn >= 0 &&
      checkColumn < this.config.gridColumns &&
      crateCount < pushStrength + 1
    ) {
      const crateInWay = this.getCrateAt(checkColumn, touchedRow);
      if (crateInWay) {
        cratesToPush.push(crateInWay);
        crateCount++;
        checkColumn += pushDirection;
      } else {
        break;
      }
    }

    // Check if there's room to push
    const targetColumn = touchedColumn + pushDirection * cratesToPush.length;
    if (targetColumn < 0 || targetColumn >= this.config.gridColumns) {
      return { canPush: false, cratesToPush: [] };
    }

    // Check if crate count exceeds push strength
    if (cratesToPush.length > pushStrength) {
      return { canPush: false, cratesToPush: [] };
    }

    return { canPush: true, cratesToPush };
  }

  /**
   * Push crates in a direction
   */
  pushCrates(crates: Crate[], direction: number): void {
    // Sort crates by column to push in correct order
    const sortedCrates = [...crates].sort((a, b) =>
      direction > 0 ? b.getGridColumn() - a.getGridColumn() : a.getGridColumn() - b.getGridColumn()
    );

    for (const crate of sortedCrates) {
      // Just start sliding - grid position updated when crate crosses cell boundary
      if (!crate.isSliding()) {
        // Calculate target X (next cell center)
        const currentColumn = crate.getGridColumn();
        const currentRow = crate.getGridRow();
        const targetColumn = currentColumn + direction;
        const targetX = this.getColumnCenterX(targetColumn);

        // Remove from grid immediately to prevent phantom collisions
        if (this.grid[currentRow][currentColumn] === crate) {
          this.grid[currentRow][currentColumn] = null;
        }

        crate.startBeingPushed(direction, targetX);
      }
    }
  }

  /**
   * Start auto-slide for all sliding crates (called when key is released)
   */
  startAutoSlideForCrates(crates: Crate[]): void {
    for (const crate of crates) {
      if (crate.isSliding() && !crate.isAutoSlidingToTarget()) {
        crate.startAutoSlide();
      }
    }
  }

  /**
   * Complete auto-slide for a crate that has reached its target
   * Updates grid position and snaps crate
   */
  completeAutoSlide(crate: Crate): { newColumn: number; newX: number; newY: number } {
    const currentColumn = crate.getGridColumn();
    const currentRow = crate.getGridRow();
    const direction = crate.getSlideDirection();
    const targetColumn = currentColumn + direction;

    // Check if target column is valid
    if (targetColumn < 0 || targetColumn >= this.config.gridColumns) {
      // Stay in current column - add back to grid
      const newX = this.getColumnCenterX(currentColumn);
      const newY = this.getRowBottomY(currentRow);
      crate.stopBeingPushed(newX, newY);
      this.grid[currentRow][currentColumn] = crate;
      return { newColumn: currentColumn, newX, newY };
    }

    // Check landing row in new column
    const newLandingRow = this.getNextLandingRowForColumn(targetColumn, currentRow);

    // Update to new position
    crate.setGridPosition(targetColumn, newLandingRow);
    this.grid[newLandingRow][targetColumn] = crate;

    const newX = this.getColumnCenterX(targetColumn);
    const newY = this.getRowBottomY(newLandingRow);
    crate.stopBeingPushed(newX, newY);

    return { newColumn: targetColumn, newX, newY };
  }

  /**
   * Move a sliding crate by delta and update grid when crossing cell boundary
   */
  moveSlidingCrate(crate: Crate, deltaX: number): void {
    if (!crate.isSliding()) return;

    const oldX = crate.x;
    crate.pushMove(deltaX);
    const newX = crate.x;

    const direction = crate.getSlideDirection();
    const oldColumn = crate.getGridColumn();
    const oldRow = crate.getGridRow();

    // Check if crossed into new cell
    const oldCellCenter = this.getColumnCenterX(oldColumn);
    const newColumn = oldColumn + direction;

    // Only update grid if we have a valid target column
    if (newColumn < 0 || newColumn >= this.config.gridColumns) {
      // Hit boundary - stop, snap back, and add back to grid
      crate.stopBeingPushed(oldCellCenter, this.getRowBottomY(oldRow));
      // Add back to grid at original position
      this.grid[oldRow][oldColumn] = crate;
      return;
    }

    const newCellCenter = this.getColumnCenterX(newColumn);
    const crossedBoundary =
      (direction > 0 && oldX < newCellCenter && newX >= newCellCenter) ||
      (direction < 0 && oldX > newCellCenter && newX <= newCellCenter);

    if (crossedBoundary) {
      // Check landing row in new column
      const newLandingRow = this.getNextLandingRowForColumn(newColumn, oldRow);
      crate.setGridPosition(newColumn, newLandingRow);
      // Add to new position in grid
      this.grid[newLandingRow][newColumn] = crate;

      // Snap to new cell center
      crate.stopBeingPushed(newCellCenter, this.getRowBottomY(newLandingRow));
    }
  }

  /**
   * Stop all sliding crates and snap to grid
   */
  stopAllSlidingCrates(): void {
    for (const crate of this.crates) {
      if (crate.isSliding()) {
        const column = crate.getGridColumn();
        const row = crate.getGridRow();
        crate.stopBeingPushed(this.getColumnCenterX(column), this.getRowBottomY(row));
        // Add back to grid at current position
        this.grid[row][column] = crate;
      }
    }
  }

  /**
   * Get all currently sliding crates
   */
  getSlidingCrates(): Crate[] {
    return this.crates.filter((c) => c.isSliding());
  }

  /**
   * Snap a sliding crate to nearest column (current or next based on position)
   * Only snaps to next column if crossed the midpoint between columns
   */
  snapCrateToNearestColumn(crate: Crate): { newColumn: number; newX: number; newY: number } {
    const currentColumn = crate.getGridColumn();
    const currentRow = crate.getGridRow();
    const direction = crate.getSlideDirection();
    const crateX = crate.x;

    const currentCenterX = this.getColumnCenterX(currentColumn);
    const nextColumn = currentColumn + direction;

    // Check if next column is valid
    const nextColumnValid = nextColumn >= 0 && nextColumn < this.config.gridColumns;

    if (nextColumnValid) {
      const nextCenterX = this.getColumnCenterX(nextColumn);
      // Calculate midpoint between current and next column centers
      const midpointX = (currentCenterX + nextCenterX) / 2;

      // Only snap to next column if crossed the midpoint
      const crossedMidpoint =
        (direction > 0 && crateX >= midpointX) || (direction < 0 && crateX <= midpointX);

      if (crossedMidpoint) {
        // Check if next column has space
        const nextLandingRow = this.getNextLandingRowForColumn(nextColumn, currentRow);

        // Update to new position (crate was already removed from grid when sliding started)
        crate.setGridPosition(nextColumn, nextLandingRow);
        this.grid[nextLandingRow][nextColumn] = crate;

        const newX = nextCenterX;
        const newY = this.getRowBottomY(nextLandingRow);
        crate.stopBeingPushed(newX, newY);

        return { newColumn: nextColumn, newX, newY };
      }
    }

    // Stay in current column - add back to grid
    const newX = currentCenterX;
    const newY = this.getRowBottomY(currentRow);
    crate.stopBeingPushed(newX, newY);
    this.grid[currentRow][currentColumn] = crate;

    return { newColumn: currentColumn, newX, newY };
  }

  /**
   * Get the landing row for a crate being pushed to a column
   */
  private getNextLandingRowForColumn(column: number, maxRow: number): number {
    for (let row = 0; row <= maxRow; row++) {
      if (!this.isCellOccupied(column, row)) {
        return row;
      }
    }
    return maxRow;
  }

  /**
   * Update all crates (optimized to minimize iterations)
   */
  update(deltaTime: number): void {
    // Track crates that need removal
    const cratesToRemove: Crate[] = [];

    for (const crate of this.crates) {
      if (crate.isFalling()) {
        crate.update(deltaTime);

        // Check for collision
        const collision = this.checkCollisions(crate);
        if (collision.collidedWithGround || collision.collidedWithCrate) {
          this.landCrate(crate, collision.landingRow);
        }
      } else if (crate.isClearing()) {
        crate.update(deltaTime);

        // Check if clearing animation is complete
        if (crate.isClearingComplete()) {
          cratesToRemove.push(crate);
        }
      } else if (crate.isExploding()) {
        crate.update(deltaTime);

        // Check if exploding animation is complete
        if (crate.isExplodingComplete()) {
          cratesToRemove.push(crate);
        }
      } else if (crate.isSliding()) {
        // Update sliding crates (pushed by player)
        crate.update(deltaTime);
      } else if (crate.isLanded()) {
        // Update landed crates (for bomb timer updates)
        crate.update(deltaTime);
      }
    }

    // Remove crates that finished clearing/exploding animation
    for (const crate of cratesToRemove) {
      this.removeCrate(crate);
    }
  }

  /**
   * Remove all crates that are in clearing state (after animation)
   */
  removeClearingCrates(): void {
    const clearingCrates = this.crates.filter((c) => c.isClearing());
    for (const crate of clearingCrates) {
      this.removeCrate(crate);
    }
  }

  /**
   * Get all crates
   */
  getAllCrates(): Crate[] {
    return [...this.crates];
  }

  /**
   * Get all landed crates
   */
  getLandedCrates(): Crate[] {
    return this.crates.filter((c) => c.isLanded());
  }

  /**
   * Get all falling crates
   */
  getFallingCrates(): Crate[] {
    return this.crates.filter((c) => c.isFalling());
  }

  /**
   * Check if any crate has reached the top (game over condition)
   */
  hasReachedTop(): boolean {
    // Check if any crate is in the top row
    for (let col = 0; col < this.config.gridColumns; col++) {
      if (this.isCellOccupied(col, this.config.gridRows - 1)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the maximum stack height (in rows)
   */
  getMaxStackHeight(): number {
    let maxHeight = 0;
    for (let col = 0; col < this.config.gridColumns; col++) {
      for (let row = this.config.gridRows - 1; row >= 0; row--) {
        if (this.isCellOccupied(col, row)) {
          maxHeight = Math.max(maxHeight, row + 1);
          break;
        }
      }
    }
    return maxHeight;
  }

  /**
   * Get grid configuration
   */
  getConfig(): CrateManagerConfig {
    return { ...this.config };
  }

  /**
   * Reset the crate manager
   */
  reset(): void {
    // Return all crates to pool instead of destroying
    for (const crate of this.crates) {
      this.removeChild(crate);
      this.returnCrateToPool(crate);
    }
    this.crates = [];

    // Clear grid
    this.grid = Array.from({ length: this.config.gridRows }, () =>
      Array.from({ length: this.config.gridColumns }, () => null)
    );

    this.crateIdCounter = 0;
  }

  /**
   * Get the number of crates currently in the game
   */
  getCrateCount(): number {
    return this.crates.length;
  }

  /**
   * Get the number of crates in the pool
   */
  getPoolSize(): number {
    return this.cratePool.length;
  }
}
