// Roza FM Suite — Password Hashing Utility
// Industry-standard bcrypt hashing (never store plaintext passwords).
//
// WHY BCRYPT?
//  - Auto-salts each hash (no need for a separate salt column)
//  - Configurable work factor (cost) — can be increased as hardware improves
//  - Resistant to rainbow-table + brute-force attacks
//  - Industry standard since 1999, still recommended in 2025
//
// We use `bcryptjs` (pure JS) instead of `bcrypt` (native) so it works
// on Vercel serverless + any OS without native compilation.
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10; // ~100ms per hash — strong enough for production, fast enough for login

/**
 * Hash a plaintext password using bcrypt.
 * Use this on signup, password reset, and password change.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plaintext, salt);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 * Returns true if they match.
 * Handles legacy plaintext passwords gracefully (returns false, never throws).
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  // Defensive: if the stored value isn't a bcrypt hash (e.g. legacy plaintext),
  // return false — forces a password reset rather than leaking a plaintext comparison.
  if (!hash || !hash.startsWith('$2')) return false;
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}

/**
 * Check if a stored password value is a bcrypt hash (vs legacy plaintext).
 * Used by the migration script + login to decide whether to re-hash.
 */
export function isBcryptHash(value: string): boolean {
  return !!value && value.startsWith('$2') && value.length >= 50;
}

/**
 * Generate a random one-time password for email-based onboarding.
 * 12 characters, mixed case + digits + symbols — strong but memorable-enough to type.
 */
export function generateTempPassword(length = 12): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@$%*';
  const all = lower + upper + digits + symbols;
  let out = '';
  // Guarantee at least one of each class
  out += lower[Math.floor(Math.random() * lower.length)];
  out += upper[Math.floor(Math.random() * upper.length)];
  out += digits[Math.floor(Math.random() * digits.length)];
  out += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 4; i < length; i++) {
    out += all[Math.floor(Math.random() * all.length)];
  }
  // Shuffle to avoid predictable positions
  return out.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate a random secure token for email-based invite links.
 * Used in /auth/set-password?token=XXX flows.
 */
export function generateInviteToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}
