/**
 * HMAC Signer for secure webhook transmission
 *
 * Uses timestamp-based signing to prevent replay attacks:
 * - Signature = HMAC-SHA256(timestamp.payload, secret)
 * - Headers: X-Webhook-Signature, X-Webhook-Timestamp
 */
export class HmacSigner {
  private secret: string;
  private encoder: TextEncoder;

  constructor(secret: string) {
    this.secret = secret;
    this.encoder = new TextEncoder();
  }

  /**
   * Sign a payload with timestamp
   */
  async sign(payload: string, timestamp?: number): Promise<string> {
    const ts = timestamp ?? Math.floor(Date.now() / 1000);
    const signedPayload = `${ts}.${payload}`;

    const key = await this.getKey();
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      this.encoder.encode(signedPayload)
    );

    return this.arrayBufferToHex(signature);
  }

  /**
   * Build headers for a signed request
   */
  async buildHeaders(payload: string): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await this.sign(payload, timestamp);

    return {
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': String(timestamp),
    };
  }

  /**
   * Get or create the HMAC key
   */
  private async getKey(): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      this.encoder.encode(this.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

let hmacSignerInstance: HmacSigner | null = null;

/**
 * Initialize HMAC signer with secret
 */
export function initHmacSigner(secret: string): HmacSigner {
  hmacSignerInstance = new HmacSigner(secret);
  return hmacSignerInstance;
}

/**
 * Get current HMAC signer instance
 */
export function getHmacSigner(): HmacSigner | null {
  return hmacSignerInstance;
}

/**
 * Reset HMAC signer (for testing)
 */
export function resetHmacSigner(): void {
  hmacSignerInstance = null;
}
