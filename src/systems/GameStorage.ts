/**
 * Game Storage System
 * Manages persistent storage for high scores and game settings using cookies
 */

import { getCookie, setCookie, areCookiesEnabled } from '../utils/CookieStorage';
import { ColorPalette } from './LCDEffect';

// Cookie keys
const COOKIE_HIGH_SCORES = 'stackattack_highscores';
const COOKIE_SETTINGS = 'stackattack_settings';

// Maximum number of high scores to store
const MAX_HIGH_SCORES = 10;

/**
 * High score entry
 */
export interface HighScoreEntry {
  score: number;
  level: number;
  date: string; // ISO date string
  linesCleared?: number;
}

/**
 * Game settings
 */
export interface GameSettings {
  palette: ColorPalette;
  selectedCharacterId: number;
  soundEnabled?: boolean;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: GameSettings = {
  palette: ColorPalette.Blue,
  selectedCharacterId: 1,
  soundEnabled: true,
};

/**
 * GameStorage singleton for managing persistent game data
 */
class GameStorageClass {
  private cookiesEnabled: boolean;

  constructor() {
    this.cookiesEnabled = areCookiesEnabled();
    if (!this.cookiesEnabled) {
      console.warn('Cookies are disabled. Game progress will not be saved.');
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    return this.cookiesEnabled;
  }

  // ============ HIGH SCORES ============

  /**
   * Get all high scores sorted by score descending
   */
  getHighScores(): HighScoreEntry[] {
    const scores = getCookie<HighScoreEntry[]>(COOKIE_HIGH_SCORES, []);
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Add a new high score if it qualifies
   * Returns true if score was added to the leaderboard
   */
  addHighScore(score: number, level: number, linesCleared?: number): boolean {
    if (!this.cookiesEnabled || score <= 0) {
      return false;
    }

    const scores = this.getHighScores();

    // Check if score qualifies for the leaderboard
    if (scores.length >= MAX_HIGH_SCORES && score <= scores[scores.length - 1].score) {
      return false;
    }

    // Add new score
    const newEntry: HighScoreEntry = {
      score,
      level,
      date: new Date().toISOString(),
      linesCleared,
    };

    scores.push(newEntry);

    // Sort and trim to max size
    scores.sort((a, b) => b.score - a.score);
    const trimmedScores = scores.slice(0, MAX_HIGH_SCORES);

    setCookie(COOKIE_HIGH_SCORES, trimmedScores);

    return true;
  }

  /**
   * Check if a score qualifies for the high score list
   */
  isHighScore(score: number): boolean {
    const scores = this.getHighScores();
    if (scores.length < MAX_HIGH_SCORES) {
      return score > 0;
    }
    return score > scores[scores.length - 1].score;
  }

  /**
   * Get the highest score ever achieved
   */
  getBestScore(): number {
    const scores = this.getHighScores();
    return scores.length > 0 ? scores[0].score : 0;
  }

  /**
   * Get the highest level ever reached
   */
  getBestLevel(): number {
    const scores = this.getHighScores();
    if (scores.length === 0) return 0;
    return Math.max(...scores.map((s) => s.level));
  }

  /**
   * Clear all high scores
   */
  clearHighScores(): void {
    setCookie(COOKIE_HIGH_SCORES, []);
  }

  // ============ SETTINGS ============

  /**
   * Get game settings
   */
  getSettings(): GameSettings {
    return getCookie<GameSettings>(COOKIE_SETTINGS, DEFAULT_SETTINGS);
  }

  /**
   * Save game settings
   */
  saveSettings(settings: Partial<GameSettings>): void {
    if (!this.cookiesEnabled) {
      return;
    }

    const currentSettings = this.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    setCookie(COOKIE_SETTINGS, newSettings);
  }

  /**
   * Get current palette setting
   */
  getPalette(): ColorPalette {
    return this.getSettings().palette;
  }

  /**
   * Save palette setting
   */
  savePalette(palette: ColorPalette): void {
    this.saveSettings({ palette });
  }

  /**
   * Get selected character ID
   */
  getSelectedCharacterId(): number {
    return this.getSettings().selectedCharacterId;
  }

  /**
   * Save selected character ID
   */
  saveSelectedCharacterId(characterId: number): void {
    this.saveSettings({ selectedCharacterId: characterId });
  }

  /**
   * Reset all settings to defaults
   */
  resetSettings(): void {
    setCookie(COOKIE_SETTINGS, DEFAULT_SETTINGS);
  }

  /**
   * Clear all stored data
   */
  clearAll(): void {
    this.clearHighScores();
    this.resetSettings();
  }
}

// Export singleton instance
export const GameStorage = new GameStorageClass();
