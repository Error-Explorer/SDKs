import type { ErrorEvent, TransportOptions } from '../types';
import { HmacSigner } from '../security/HmacSigner';

/**
 * HTTP transport for sending error events to the API
 */
export class HttpTransport {
  private endpoint: string;
  private token: string;
  private timeout: number;
  private hmacSigner: HmacSigner | null = null;

  constructor(options: TransportOptions) {
    this.endpoint = options.endpoint;
    this.token = options.token;
    this.timeout = options.timeout;

    if (options.hmacSecret) {
      this.hmacSigner = new HmacSigner(options.hmacSecret);
    }
  }

  /**
   * Send an error event to the API
   */
  async send(event: ErrorEvent): Promise<boolean> {
    try {
      const payload = JSON.stringify(event);

      // Try sendBeacon first (non-blocking, works during page unload)
      // Note: sendBeacon doesn't support custom headers, so no HMAC for beacon
      if (!this.hmacSigner && this.trySendBeacon(payload)) {
        return true;
      }

      // Fall back to fetch (supports HMAC headers)
      return await this.sendFetch(payload);
    } catch (error) {
      console.warn('[ErrorExplorer] Failed to send event:', error);
      return false;
    }
  }

  /**
   * Try to send using sendBeacon (best for page unload)
   * Note: sendBeacon doesn't support custom headers, so HMAC is not used
   */
  private trySendBeacon(payload: string): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
      return false;
    }

    try {
      const blob = new Blob([payload], { type: 'application/json' });
      return navigator.sendBeacon(this.endpoint, blob);
    } catch {
      return false;
    }
  }

  /**
   * Send using fetch with timeout and optional HMAC signing
   */
  private async sendFetch(payload: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Token': this.token,
      };

      // Add HMAC signature headers if configured
      if (this.hmacSigner) {
        const hmacHeaders = await this.hmacSigner.buildHeaders(payload);
        Object.assign(headers, hmacHeaders);
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
        keepalive: true, // Allow request to outlive the page
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);

      // Don't log abort errors (expected on timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[ErrorExplorer] Request timed out');
      }

      return false;
    }
  }
}
