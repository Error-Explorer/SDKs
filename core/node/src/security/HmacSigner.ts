/**
 * HMAC signing for secure webhook requests
 */

import * as crypto from 'node:crypto';

export class HmacSigner {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Sign a payload with HMAC-SHA256
   * @param payload - The JSON payload string to sign
   * @param timestamp - Unix timestamp (defaults to current time)
   * @returns Hex-encoded signature
   */
  sign(payload: string, timestamp?: number): string {
    const ts = timestamp ?? Math.floor(Date.now() / 1000);
    const signedPayload = `${ts}.${payload}`;

    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(signedPayload);

    return hmac.digest('hex');
  }

  /**
   * Build headers for a signed request
   * @param payload - The JSON payload string
   * @returns Headers object with signature and timestamp
   */
  buildHeaders(payload: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.sign(payload, timestamp);

    return {
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': String(timestamp),
    };
  }

  /**
   * Verify a signature (useful for testing)
   * @param payload - The payload that was signed
   * @param signature - The signature to verify
   * @param timestamp - The timestamp used in signing
   * @param maxAge - Maximum age in seconds (default: 5 minutes)
   */
  verify(payload: string, signature: string, timestamp: number, maxAge = 300): boolean {
    // Check timestamp age
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > maxAge) {
      return false;
    }

    // Calculate expected signature
    const expected = this.sign(payload, timestamp);

    // Compare using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  }
}
