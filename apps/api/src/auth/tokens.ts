import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

const ACCESS_SECRET = requireSecret('JWT_ACCESS_SECRET');
const REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET');

export interface TokenPayload {
  sub: string;
  deviceId: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as unknown as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as unknown as TokenPayload;
}

// Refresh tokens are long, high-entropy JWTs, not human passwords — bcrypt would
// silently truncate them at 72 bytes (and this app's tokens share a common prefix,
// since iat/exp land near the end of the payload), so hashes would collide across
// rotations. Use a plain SHA-256 digest + constant-time comparison instead.
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenMatchesHash(token: string, hash: string): boolean {
  const candidate = Buffer.from(hashRefreshToken(token), 'hex');
  const stored = Buffer.from(hash, 'hex');
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}
