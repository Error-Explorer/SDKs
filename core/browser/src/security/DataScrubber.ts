/**
 * Default fields to scrub (case-insensitive)
 */
const DEFAULT_SCRUB_FIELDS = [
  'password',
  'passwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'auth',
  'authorization',
  'credit_card',
  'creditcard',
  'card_number',
  'cardnumber',
  'cvv',
  'cvc',
  'ssn',
  'social_security',
  'private_key',
  'privatekey',
];

/**
 * Replacement string for scrubbed values
 */
const SCRUBBED = '[FILTERED]';

/**
 * Data scrubber to remove sensitive information before sending
 */
export class DataScrubber {
  private scrubFields: Set<string>;

  constructor(additionalFields: string[] = []) {
    // Combine default and additional fields, all lowercase
    this.scrubFields = new Set([
      ...DEFAULT_SCRUB_FIELDS.map((f) => f.toLowerCase()),
      ...additionalFields.map((f) => f.toLowerCase()),
    ]);
  }

  /**
   * Scrub sensitive data from an object
   */
  scrub<T>(data: T): T {
    return this.scrubValue(data, 0) as T;
  }

  /**
   * Recursively scrub a value
   */
  private scrubValue(value: unknown, depth: number): unknown {
    // Limit recursion depth
    if (depth > 10) {
      return value;
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitives
    if (typeof value !== 'object') {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.scrubValue(item, depth + 1));
    }

    // Handle objects
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (this.shouldScrub(key)) {
        result[key] = SCRUBBED;
      } else if (typeof val === 'string') {
        result[key] = this.scrubString(val);
      } else {
        result[key] = this.scrubValue(val, depth + 1);
      }
    }

    return result;
  }

  /**
   * Check if a key should be scrubbed
   */
  private shouldScrub(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.scrubFields.has(lowerKey);
  }

  /**
   * Scrub sensitive patterns from strings
   */
  private scrubString(value: string): string {
    let result = value;

    // Scrub credit card numbers (13-19 digits, possibly with spaces/dashes)
    result = result.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g, SCRUBBED);

    // Scrub email addresses (optional, can be disabled if needed)
    // result = result.replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, SCRUBBED);

    // Scrub potential API keys (long alphanumeric strings)
    result = result.replace(/\b(sk|pk|api|key|token|secret)_[a-zA-Z0-9]{20,}\b/gi, SCRUBBED);

    // Scrub Bearer tokens
    result = result.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, `Bearer ${SCRUBBED}`);

    return result;
  }

  /**
   * Add fields to scrub
   */
  addFields(fields: string[]): void {
    for (const field of fields) {
      this.scrubFields.add(field.toLowerCase());
    }
  }
}

// Singleton instance
let instance: DataScrubber | null = null;

export function getDataScrubber(): DataScrubber {
  if (!instance) {
    instance = new DataScrubber();
  }
  return instance;
}

export function initDataScrubber(additionalFields: string[] = []): DataScrubber {
  instance = new DataScrubber(additionalFields);
  return instance;
}

export function resetDataScrubber(): void {
  instance = null;
}
