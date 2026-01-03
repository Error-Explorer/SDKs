import { describe, it, expect, beforeEach } from 'vitest';
import { HmacSigner, initHmacSigner, getHmacSigner, resetHmacSigner } from '../src/security/HmacSigner';

describe('HmacSigner', () => {
  beforeEach(() => {
    resetHmacSigner();
  });

  describe('sign', () => {
    it('should generate a hex signature', async () => {
      const signer = new HmacSigner('test-secret');
      const signature = await signer.sign('test payload', 1234567890);

      expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA-256 = 64 hex chars
    });

    it('should generate consistent signatures for same input', async () => {
      const signer = new HmacSigner('test-secret');
      const sig1 = await signer.sign('test payload', 1234567890);
      const sig2 = await signer.sign('test payload', 1234567890);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different payloads', async () => {
      const signer = new HmacSigner('test-secret');
      const sig1 = await signer.sign('payload 1', 1234567890);
      const sig2 = await signer.sign('payload 2', 1234567890);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different timestamps', async () => {
      const signer = new HmacSigner('test-secret');
      const sig1 = await signer.sign('test payload', 1234567890);
      const sig2 = await signer.sign('test payload', 1234567891);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', async () => {
      const signer1 = new HmacSigner('secret-1');
      const signer2 = new HmacSigner('secret-2');

      const sig1 = await signer1.sign('test payload', 1234567890);
      const sig2 = await signer2.sign('test payload', 1234567890);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('buildHeaders', () => {
    it('should return signature and timestamp headers', async () => {
      const signer = new HmacSigner('test-secret');
      const headers = await signer.buildHeaders('test payload');

      expect(headers).toHaveProperty('X-Webhook-Signature');
      expect(headers).toHaveProperty('X-Webhook-Timestamp');
      expect(headers['X-Webhook-Signature']).toMatch(/^[a-f0-9]{64}$/);
      expect(parseInt(headers['X-Webhook-Timestamp'])).toBeGreaterThan(0);
    });
  });

  describe('singleton', () => {
    it('should initialize and get signer', () => {
      const signer = initHmacSigner('my-secret');
      expect(signer).toBeInstanceOf(HmacSigner);

      const retrieved = getHmacSigner();
      expect(retrieved).toBe(signer);
    });

    it('should reset signer', () => {
      initHmacSigner('my-secret');
      expect(getHmacSigner()).not.toBeNull();

      resetHmacSigner();
      expect(getHmacSigner()).toBeNull();
    });
  });
});
