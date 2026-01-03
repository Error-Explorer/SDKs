/**
 * UUID generation utilities
 */

import * as crypto from 'node:crypto';

/**
 * Generate a UUID v4
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Generate a short ID (8 chars)
 */
export function generateShortId(): string {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Generate a transaction ID
 */
export function generateTransactionId(): string {
  return `txn_${crypto.randomBytes(12).toString('hex')}`;
}
