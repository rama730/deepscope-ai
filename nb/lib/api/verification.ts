import crypto from 'crypto';

/**
 * Generate a random verification token.
 * 32 bytes hex string (64 chars).
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate expiration date (e.g., 24 hours from now).
 */
export function getVerificationExpiration(hours = 24): Date {
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return date;
}
