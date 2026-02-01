/**
 * Cookie Storage Utility
 * Simple wrapper for managing cookies with JSON serialization
 */

export interface CookieOptions {
  /** Cookie expiration in days (default: 365) */
  maxAge?: number;
  /** Cookie path (default: '/') */
  path?: string;
  /** SameSite attribute (default: 'Lax') */
  sameSite?: 'Strict' | 'Lax' | 'None';
  /** Secure flag for HTTPS only (default: auto-detect) */
  secure?: boolean;
}

const DEFAULT_OPTIONS: CookieOptions = {
  maxAge: 365,
  path: '/',
  sameSite: 'Lax',
  secure: window.location.protocol === 'https:',
};

/**
 * Set a cookie with JSON value
 */
export function setCookie<T>(name: string, value: T, options: CookieOptions = {}): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const jsonValue = JSON.stringify(value);
  const encodedValue = encodeURIComponent(jsonValue);

  let cookieString = `${name}=${encodedValue}`;

  if (opts.maxAge !== undefined) {
    const maxAgeSeconds = opts.maxAge * 24 * 60 * 60;
    cookieString += `; max-age=${maxAgeSeconds}`;
  }

  if (opts.path) {
    cookieString += `; path=${opts.path}`;
  }

  if (opts.sameSite) {
    cookieString += `; samesite=${opts.sameSite}`;
  }

  if (opts.secure) {
    cookieString += '; secure';
  }

  document.cookie = cookieString;
}

/**
 * Get a cookie value parsed as JSON
 */
export function getCookie<T>(name: string, defaultValue: T): T {
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [cookieName, ...cookieValueParts] = cookie.trim().split('=');
    if (cookieName === name) {
      try {
        const cookieValue = cookieValueParts.join('=');
        const decodedValue = decodeURIComponent(cookieValue);
        return JSON.parse(decodedValue) as T;
      } catch {
        return defaultValue;
      }
    }
  }

  return defaultValue;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, path: string = '/'): void {
  document.cookie = `${name}=; max-age=0; path=${path}`;
}

/**
 * Check if cookies are available
 */
export function areCookiesEnabled(): boolean {
  try {
    const testKey = '__cookie_test__';
    document.cookie = `${testKey}=1`;
    const enabled = document.cookie.includes(testKey);
    document.cookie = `${testKey}=; max-age=0`;
    return enabled;
  } catch {
    return false;
  }
}
