/**
 * Match Detector System
 * Detects 3/4/5 in a row matches (horizontal and vertical) for match-3 mechanics
 *
 * Points:
 * - 3 in a row: 50 points
 * - 4 in a row: 100 points
 * - 5 in a row: 500 points
 */

import type { Crate } from '../entities/Crate';
import type { CrateColor } from '../types/entities';
import { CrateType } from '../types/entities';

export interface MatchResult {
  matches: Match[];
  totalPoints: number;
  cratesToClear: Crate[];
}

export interface Match {
  crates: Crate[];
  length: number;
  direction: 'horizontal' | 'vertical';
  points: number;
}

// Point values for matches
const MATCH_POINTS = {
  3: 50,
  4: 100,
  5: 500,
} as const;

export class MatchDetector {
  private gridColumns: number;
  private gridRows: number;

  constructor(gridColumns: number, gridRows: number) {
    this.gridColumns = gridColumns;
    this.gridRows = gridRows;
  }

  /**
   * Detect all matches in the grid
   * @param grid 2D array of crates (grid[row][column])
   * @returns MatchResult containing all matches and total points
   */
  detectMatches(grid: (Crate | null)[][]): MatchResult {
    const matches: Match[] = [];
    const matchedCrates = new Set<Crate>();

    // Detect horizontal matches
    const horizontalMatches = this.detectHorizontalMatches(grid);
    matches.push(...horizontalMatches);
    horizontalMatches.forEach((m) => m.crates.forEach((c) => matchedCrates.add(c)));

    // Detect vertical matches
    const verticalMatches = this.detectVerticalMatches(grid);
    matches.push(...verticalMatches);
    verticalMatches.forEach((m) => m.crates.forEach((c) => matchedCrates.add(c)));

    // Calculate total points
    const totalPoints = matches.reduce((sum, match) => sum + match.points, 0);

    return {
      matches,
      totalPoints,
      cratesToClear: Array.from(matchedCrates),
    };
  }

  /**
   * Detect horizontal matches (3+ in a row)
   */
  private detectHorizontalMatches(grid: (Crate | null)[][]): Match[] {
    const matches: Match[] = [];

    for (let row = 0; row < this.gridRows; row++) {
      let currentColor: CrateColor | null = null;
      const currentMatch: Crate[] = [];

      for (let col = 0; col <= this.gridColumns; col++) {
        const crate = col < this.gridColumns ? grid[row]?.[col] : null;
        const crateColor = this.getCrateColorForMatching(crate);

        if (crateColor && crateColor === currentColor) {
          // Continue match
          currentMatch.push(crate!);
        } else {
          // End of potential match
          if (currentMatch.length >= 3) {
            const points = this.getPointsForMatch(currentMatch.length);
            matches.push({
              crates: [...currentMatch],
              length: currentMatch.length,
              direction: 'horizontal',
              points,
            });
          }

          // Start new potential match
          currentMatch.length = 0;
          if (crateColor && crate) {
            currentMatch.push(crate);
            currentColor = crateColor;
          } else {
            currentColor = null;
          }
        }
      }
    }

    return matches;
  }

  /**
   * Detect vertical matches (3+ in a row)
   */
  private detectVerticalMatches(grid: (Crate | null)[][]): Match[] {
    const matches: Match[] = [];

    for (let col = 0; col < this.gridColumns; col++) {
      let currentColor: CrateColor | null = null;
      const currentMatch: Crate[] = [];

      for (let row = 0; row <= this.gridRows; row++) {
        const crate = row < this.gridRows ? grid[row]?.[col] : null;
        const crateColor = this.getCrateColorForMatching(crate);

        if (crateColor && crateColor === currentColor) {
          // Continue match
          currentMatch.push(crate!);
        } else {
          // End of potential match
          if (currentMatch.length >= 3) {
            const points = this.getPointsForMatch(currentMatch.length);
            matches.push({
              crates: [...currentMatch],
              length: currentMatch.length,
              direction: 'vertical',
              points,
            });
          }

          // Start new potential match
          currentMatch.length = 0;
          if (crateColor && crate) {
            currentMatch.push(crate);
            currentColor = crateColor;
          } else {
            currentColor = null;
          }
        }
      }
    }

    return matches;
  }

  /**
   * Get the color of a crate for matching purposes
   * Only regular crates participate in matching
   */
  private getCrateColorForMatching(crate: Crate | null): CrateColor | null {
    if (!crate) return null;

    // Only landed crates participate in matching
    // Sliding crates must stop first before being matched
    if (!crate.isLanded()) return null;
    if (crate.getCrateType() !== CrateType.Regular) return null;
    if (crate.isClearing()) return null;
    if (crate.isExploding()) return null;

    return crate.getColor();
  }

  /**
   * Get points for a match of given length
   */
  private getPointsForMatch(length: number): number {
    if (length >= 5) return MATCH_POINTS[5];
    if (length === 4) return MATCH_POINTS[4];
    if (length === 3) return MATCH_POINTS[3];
    return 0;
  }
}
