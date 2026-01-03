/**
 * UUID utility tests
 */

import { describe, it, expect } from 'vitest';
import { generateUuid, generateShortId, generateTransactionId } from '../src/utils/uuid.js';

describe('UUID Utils', () => {
  describe('generateUuid', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUuid();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        uuids.add(generateUuid());
      }
      expect(uuids.size).toBe(1000);
    });
  });

  describe('generateShortId', () => {
    it('should generate an 8-character hex string', () => {
      const id = generateShortId();

      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateShortId());
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('generateTransactionId', () => {
    it('should generate a transaction ID with prefix', () => {
      const txn = generateTransactionId();

      expect(txn).toMatch(/^txn_[0-9a-f]{24}$/);
    });

    it('should generate unique transaction IDs', () => {
      const txns = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        txns.add(generateTransactionId());
      }
      expect(txns.size).toBe(1000);
    });
  });
});
