/**
 * Minimal JWT utilities — no external dependencies.
 * Only decodes the payload; does NOT verify the signature (that's the server's job).
 */

interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
}

/**
 * Decodes the Base64URL-encoded payload of a JWT.
 * Returns null if the token is malformed.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64URL → Base64 → decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // atob is available in React Native's Hermes engine
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT is expired or invalid.
 * Accepts an optional `bufferSeconds` to treat tokens expiring soon as expired.
 */
export function isTokenExpired(token: string | null | undefined, bufferSeconds = 30): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true; // no exp claim → treat as expired
  return payload.exp - bufferSeconds < Date.now() / 1000;
}
