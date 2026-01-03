import { describe, it, expect } from 'vitest';
import { resolveConfig, matchesPattern } from '../src/config/Config';

describe('Config', () => {
  describe('resolveConfig', () => {
    it('should resolve config with token', () => {
      const config = resolveConfig({
        token: 'ee_test_token_123',
      });

      expect(config.token).toBe('ee_test_token_123');
      expect(config.endpoint).toContain('ee_test_token_123');
      expect(config.environment).toBe('production');
    });

    it('should resolve config with DSN', () => {
      const config = resolveConfig({
        dsn: 'https://ee_my_token@error-explorer.com/api/v1/webhook',
      });

      expect(config.token).toBe('ee_my_token');
      expect(config.endpoint).toContain('error-explorer.com');
    });

    it('should throw if neither token nor dsn provided', () => {
      expect(() => resolveConfig({} as any)).toThrow('Either token or dsn is required');
    });

    it('should use custom environment', () => {
      const config = resolveConfig({
        token: 'ee_test',
        environment: 'staging',
      });

      expect(config.environment).toBe('staging');
    });

    it('should use custom release', () => {
      const config = resolveConfig({
        token: 'ee_test',
        release: '1.2.3',
      });

      expect(config.release).toBe('1.2.3');
    });

    it('should apply default autoCapture settings', () => {
      const config = resolveConfig({ token: 'ee_test' });

      expect(config.autoCapture.errors).toBe(true);
      expect(config.autoCapture.unhandledRejections).toBe(true);
      expect(config.autoCapture.console).toBe(true);
    });

    it('should override autoCapture settings', () => {
      const config = resolveConfig({
        token: 'ee_test',
        autoCapture: {
          errors: false,
          console: false,
        },
      });

      expect(config.autoCapture.errors).toBe(false);
      expect(config.autoCapture.unhandledRejections).toBe(true);
      expect(config.autoCapture.console).toBe(false);
    });

    it('should apply default breadcrumbs settings', () => {
      const config = resolveConfig({ token: 'ee_test' });

      expect(config.breadcrumbs.enabled).toBe(true);
      expect(config.breadcrumbs.maxBreadcrumbs).toBe(20);
      expect(config.breadcrumbs.clicks).toBe(true);
      expect(config.breadcrumbs.inputs).toBe(false);
    });

    it('should set beforeSend hook', () => {
      const hook = (event: any) => event;
      const config = resolveConfig({
        token: 'ee_test',
        beforeSend: hook,
      });

      expect(config.beforeSend).toBe(hook);
    });

    it('should set ignoreErrors patterns', () => {
      const config = resolveConfig({
        token: 'ee_test',
        ignoreErrors: [/ResizeObserver/, 'Script error'],
      });

      expect(config.ignoreErrors).toHaveLength(2);
    });
  });

  describe('matchesPattern', () => {
    it('should match string pattern', () => {
      expect(matchesPattern('https://example.com/path', ['example.com'])).toBe(true);
      expect(matchesPattern('https://other.com/path', ['example.com'])).toBe(false);
    });

    it('should match regex pattern', () => {
      expect(matchesPattern('https://example.com/path', [/example\.com/])).toBe(true);
      expect(matchesPattern('https://other.com/path', [/example\.com/])).toBe(false);
    });

    it('should return false for empty patterns', () => {
      expect(matchesPattern('https://example.com', [])).toBe(false);
    });

    it('should match any pattern in array', () => {
      expect(matchesPattern('https://cdn.example.com', ['cdn.', /\.min\.js$/])).toBe(true);
      expect(matchesPattern('https://example.com/app.min.js', ['cdn.', /\.min\.js$/])).toBe(true);
    });
  });
});
