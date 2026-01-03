/**
 * Configuration tests
 */

import { describe, it, expect } from 'vitest';
import { parseDsn, resolveConfig, matchesPattern } from '../src/config/Config.js';

describe('Config', () => {
  describe('parseDsn', () => {
    it('should parse a valid DSN', () => {
      const result = parseDsn('https://ee_abc123@error-explorer.com/api/v1/webhook');

      expect(result.token).toBe('ee_abc123');
      expect(result.endpoint).toBe('https://error-explorer.com/api/v1/webhook');
    });

    it('should parse DSN with port', () => {
      const result = parseDsn('http://ee_token@localhost:8080/api/v1/webhook');

      expect(result.token).toBe('ee_token');
      expect(result.endpoint).toBe('http://localhost:8080/api/v1/webhook');
    });

    it('should throw on invalid DSN', () => {
      expect(() => parseDsn('not-a-url')).toThrow('Invalid DSN format');
    });

    it('should throw on DSN without token', () => {
      expect(() => parseDsn('https://error-explorer.com/api/v1/webhook')).toThrow(
        'DSN must contain a token'
      );
    });
  });

  describe('resolveConfig', () => {
    it('should resolve config with token', () => {
      const config = resolveConfig({
        token: 'ee_test123',
        environment: 'test',
      });

      expect(config.token).toBe('ee_test123');
      expect(config.environment).toBe('test');
      expect(config.autoCapture.uncaughtExceptions).toBe(true);
      expect(config.autoCapture.unhandledRejections).toBe(true);
      expect(config.breadcrumbs.enabled).toBe(true);
    });

    it('should resolve config with DSN', () => {
      const config = resolveConfig({
        dsn: 'https://ee_abc@api.example.com/webhook',
      });

      expect(config.token).toBe('ee_abc');
      expect(config.endpoint).toBe('https://api.example.com/webhook');
    });

    it('should use default values', () => {
      const config = resolveConfig({ token: 'ee_test' });

      expect(config.maxRetries).toBe(3);
      expect(config.timeout).toBe(5000);
      expect(config.breadcrumbs.maxBreadcrumbs).toBe(50);
      expect(config.exitOnUncaughtException).toBe(true);
    });

    it('should override default values', () => {
      const config = resolveConfig({
        token: 'ee_test',
        maxRetries: 5,
        timeout: 10000,
        exitOnUncaughtException: false,
      });

      expect(config.maxRetries).toBe(5);
      expect(config.timeout).toBe(10000);
      expect(config.exitOnUncaughtException).toBe(false);
    });

    it('should throw when neither token nor dsn provided', () => {
      expect(() => resolveConfig({})).toThrow('Either token or dsn must be provided');
    });
  });

  describe('matchesPattern', () => {
    it('should match string patterns', () => {
      expect(matchesPattern('ECONNREFUSED', ['ECONNREFUSED'])).toBe(true);
      expect(matchesPattern('Connection refused', ['refused'])).toBe(true);
      expect(matchesPattern('Some error', ['other'])).toBe(false);
    });

    it('should match regex patterns', () => {
      expect(matchesPattern('Error 404', [/Error \d+/])).toBe(true);
      expect(matchesPattern('Warning: deprecated', [/^Warning:/])).toBe(true);
      expect(matchesPattern('No match', [/^Error/])).toBe(false);
    });

    it('should handle empty patterns', () => {
      expect(matchesPattern('any error', [])).toBe(false);
    });
  });
});
