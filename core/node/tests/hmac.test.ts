/**
 * HMAC signing tests
 */

import { describe, it, expect } from 'vitest';
import { HmacSigner } from '../src/security/HmacSigner.js';

describe('HmacSigner', () => {
  const testSecret = 'test-secret-key-12345';

  describe('sign', () => {
    it('should sign a payload', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';
      const timestamp = 1700000000;

      const signature = signer.sign(payload, timestamp);

      expect(signature).toHaveLength(64); // SHA256 hex = 64 chars
      expect(signature).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce consistent signatures', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';
      const timestamp = 1700000000;

      const sig1 = signer.sign(payload, timestamp);
      const sig2 = signer.sign(payload, timestamp);

      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const signer = new HmacSigner(testSecret);
      const timestamp = 1700000000;

      const sig1 = signer.sign('{"a":1}', timestamp);
      const sig2 = signer.sign('{"a":2}', timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different timestamps', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';

      const sig1 = signer.sign(payload, 1700000000);
      const sig2 = signer.sign(payload, 1700000001);

      expect(sig1).not.toBe(sig2);
    });

    it('should use current time if no timestamp provided', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';

      // These should be different (time passes between calls)
      // or at least not throw
      const sig = signer.sign(payload);
      expect(sig).toHaveLength(64);
    });
  });

  describe('buildHeaders', () => {
    it('should return signature and timestamp headers', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';

      const headers = signer.buildHeaders(payload);

      expect(headers['X-Webhook-Signature']).toHaveLength(64);
      expect(headers['X-Webhook-Timestamp']).toBeDefined();
      expect(parseInt(headers['X-Webhook-Timestamp'] as string)).toBeGreaterThan(0);
    });
  });

  describe('verify', () => {
    it('should verify a valid signature', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signer.sign(payload, timestamp);

      expect(signer.verify(payload, signature, timestamp)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';
      const timestamp = Math.floor(Date.now() / 1000);

      expect(signer.verify(payload, 'a'.repeat(64), timestamp)).toBe(false);
    });

    it('should reject expired timestamp', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signature = signer.sign(payload, oldTimestamp);

      // With default maxAge of 5 minutes
      expect(signer.verify(payload, signature, oldTimestamp)).toBe(false);
    });

    it('should accept recent timestamp', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';
      const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const signature = signer.sign(payload, recentTimestamp);

      expect(signer.verify(payload, signature, recentTimestamp)).toBe(true);
    });

    it('should respect custom maxAge', () => {
      const signer = new HmacSigner(testSecret);
      const payload = '{"message":"test"}';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signature = signer.sign(payload, oldTimestamp);

      // With custom maxAge of 1 hour
      expect(signer.verify(payload, signature, oldTimestamp, 3600)).toBe(true);
    });
  });
});
