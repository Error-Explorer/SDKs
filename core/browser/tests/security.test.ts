import { describe, it, expect, beforeEach } from 'vitest';
import { DataScrubber, initDataScrubber, resetDataScrubber } from '../src/security/DataScrubber';

describe('DataScrubber', () => {
  beforeEach(() => {
    resetDataScrubber();
  });

  describe('scrub', () => {
    it('should scrub password fields', () => {
      const scrubber = new DataScrubber();
      const data = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.username).toBe('john');
      expect(scrubbed.password).toBe('[FILTERED]');
      expect(scrubbed.email).toBe('john@example.com');
    });

    it('should scrub various sensitive field names', () => {
      const scrubber = new DataScrubber();
      const data = {
        password: 'secret',
        passwd: 'secret',
        secret: 'secret',
        token: 'abc123',
        api_key: 'key123',
        apikey: 'key123',
        access_token: 'token123',
        authorization: 'Bearer xxx',
        credit_card: '4111111111111111',
        cvv: '123',
        ssn: '123-45-6789',
      };

      const scrubbed = scrubber.scrub(data);

      Object.values(scrubbed).forEach((value) => {
        expect(value).toBe('[FILTERED]');
      });
    });

    it('should be case-insensitive', () => {
      const scrubber = new DataScrubber();
      const data = {
        PASSWORD: 'secret',
        Password: 'secret',
        pAsSwOrD: 'secret',
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.PASSWORD).toBe('[FILTERED]');
      expect(scrubbed.Password).toBe('[FILTERED]');
      expect(scrubbed.pAsSwOrD).toBe('[FILTERED]');
    });

    it('should scrub nested objects', () => {
      const scrubber = new DataScrubber();
      const data = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            token: 'abc123',
          },
        },
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.user.name).toBe('John');
      expect(scrubbed.user.credentials.password).toBe('[FILTERED]');
      expect(scrubbed.user.credentials.token).toBe('[FILTERED]');
    });

    it('should scrub arrays', () => {
      const scrubber = new DataScrubber();
      const data = {
        users: [
          { name: 'John', password: 'secret1' },
          { name: 'Jane', password: 'secret2' },
        ],
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.users[0].name).toBe('John');
      expect(scrubbed.users[0].password).toBe('[FILTERED]');
      expect(scrubbed.users[1].password).toBe('[FILTERED]');
    });

    it('should scrub credit card numbers in strings', () => {
      const scrubber = new DataScrubber();
      const data = {
        message: 'Payment with card 4111-1111-1111-1111 failed',
        log: 'Card number: 4111111111111111',
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.message).not.toContain('4111');
      expect(scrubbed.log).not.toContain('4111');
    });

    it('should scrub API keys in strings', () => {
      const scrubber = new DataScrubber();
      const data = {
        // Pattern: sk_<20+ alphanumeric chars>
        error: 'Invalid key: sk_abcdefghijklmnopqrstuvwxyz1234',
        log: 'Using token_123456789012345678901234567890',
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.error).toContain('[FILTERED]');
      expect(scrubbed.log).toContain('[FILTERED]');
    });

    it('should scrub Bearer tokens in strings', () => {
      const scrubber = new DataScrubber();
      const data = {
        header: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc',
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.header).toContain('Bearer [FILTERED]');
    });

    it('should handle null and undefined', () => {
      const scrubber = new DataScrubber();

      expect(scrubber.scrub(null)).toBe(null);
      expect(scrubber.scrub(undefined)).toBe(undefined);
    });

    it('should handle primitives', () => {
      const scrubber = new DataScrubber();

      expect(scrubber.scrub(42)).toBe(42);
      expect(scrubber.scrub('hello')).toBe('hello');
      expect(scrubber.scrub(true)).toBe(true);
    });
  });

  describe('addFields', () => {
    it('should add custom scrub fields', () => {
      const scrubber = new DataScrubber();
      scrubber.addFields(['custom_secret', 'my_token']);

      const data = {
        custom_secret: 'value1',
        my_token: 'value2',
        normal: 'value3',
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.custom_secret).toBe('[FILTERED]');
      expect(scrubbed.my_token).toBe('[FILTERED]');
      expect(scrubbed.normal).toBe('value3');
    });
  });

  describe('initDataScrubber', () => {
    it('should initialize with additional fields', () => {
      const scrubber = initDataScrubber(['custom_field']);

      const data = {
        custom_field: 'secret',
        password: 'also_secret',
      };

      const scrubbed = scrubber.scrub(data);

      expect(scrubbed.custom_field).toBe('[FILTERED]');
      expect(scrubbed.password).toBe('[FILTERED]');
    });
  });
});
