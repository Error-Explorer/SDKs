/**
 * HTTP transport for sending events to Error Explorer
 */

import * as http from 'node:http';
import * as https from 'node:https';
import type { TransportOptions, ErrorEvent } from '../types.js';
import { HmacSigner } from '../security/HmacSigner.js';

export class HttpTransport {
  private endpoint: string;
  private token: string;
  private timeout: number;
  private maxRetries: number;
  private hmacSigner: HmacSigner | null = null;
  private debug: boolean;

  constructor(options: TransportOptions) {
    this.endpoint = options.endpoint;
    this.token = options.token;
    this.timeout = options.timeout;
    this.maxRetries = options.maxRetries;
    this.debug = options.debug ?? false;

    if (options.hmacSecret) {
      this.hmacSigner = new HmacSigner(options.hmacSecret);
    }
  }

  /**
   * Send an event to the Error Explorer API
   */
  async send(event: ErrorEvent): Promise<boolean> {
    const payload = JSON.stringify(event);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const success = await this.doSend(payload);
        if (success) {
          if (this.debug) {
            console.log('[ErrorExplorer] Event sent successfully');
          }
          return true;
        }
      } catch (error) {
        lastError = error as Error;
        if (this.debug) {
          console.error(`[ErrorExplorer] Send attempt ${attempt + 1} failed:`, error);
        }

        // Exponential backoff
        if (attempt < this.maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 100);
        }
      }
    }

    if (this.debug && lastError) {
      console.error('[ErrorExplorer] All send attempts failed:', lastError);
    }

    return false;
  }

  /**
   * Perform the actual HTTP request
   */
  private doSend(payload: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.endpoint);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload)),
        'X-Webhook-Token': this.token,
        'User-Agent': '@error-explorer/node/1.0.0',
        // Include Host header for proper virtual host routing
        'Host': url.host,
      };

      // Add HMAC signature if configured
      if (this.hmacSigner) {
        const hmacHeaders = this.hmacSigner.buildHeaders(payload);
        Object.assign(headers, hmacHeaders);
      }

      const options: http.RequestOptions = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        headers,
        timeout: this.timeout,
      };

      const req = transport.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const statusCode = res.statusCode || 0;

          if (statusCode >= 200 && statusCode < 300) {
            resolve(true);
          } else if (statusCode === 429) {
            // Rate limited
            const retryAfter = res.headers['retry-after'];
            reject(new Error(`Rate limited. Retry after: ${retryAfter}`));
          } else if (statusCode >= 500) {
            // Server error - retry
            reject(new Error(`Server error: ${statusCode}`));
          } else {
            // Client error - don't retry
            if (this.debug) {
              console.error(`[ErrorExplorer] Client error ${statusCode}:`, data);
            }
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Send synchronously (blocking) - for use in exit handlers
   */
  sendSync(event: ErrorEvent): void {
    // In Node.js, we can't truly send synchronously
    // But we can use a sync-rpc pattern or just fire and forget
    // For critical errors, we'll use a best-effort approach
    this.send(event).catch((err) => {
      if (this.debug) {
        console.error('[ErrorExplorer] Sync send failed:', err);
      }
    });
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
