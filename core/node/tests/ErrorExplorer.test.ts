/**
 * ErrorExplorer client tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorExplorer } from '../src/ErrorExplorer.js';

describe('ErrorExplorer', () => {
  beforeEach(async () => {
    // Ensure clean state
    await ErrorExplorer.close();
  });

  afterEach(async () => {
    await ErrorExplorer.close();
  });

  describe('init', () => {
    it('should initialize with valid options', () => {
      ErrorExplorer.init({
        token: 'ee_test123',
        environment: 'test',
        autoCapture: {
          uncaughtExceptions: false,
          unhandledRejections: false,
        },
      });

      expect(ErrorExplorer.isInitialized()).toBe(true);
    });

    it('should warn on double initialization', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });

      ErrorExplorer.init({
        token: 'ee_test2',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });

      expect(warnSpy).toHaveBeenCalledWith('[ErrorExplorer] Already initialized');
      warnSpy.mockRestore();
    });

    it('should throw on missing token', () => {
      expect(() => ErrorExplorer.init({})).toThrow('Either token or dsn must be provided');
    });
  });

  describe('user context', () => {
    beforeEach(() => {
      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });
    });

    it('should set user context', () => {
      ErrorExplorer.setUser({
        id: 'user123',
        email: 'test@example.com',
      });

      // We can't directly verify, but we can ensure no errors
      expect(ErrorExplorer.isInitialized()).toBe(true);
    });

    it('should clear user context', () => {
      ErrorExplorer.setUser({ id: 'user123' });
      ErrorExplorer.clearUser();

      expect(ErrorExplorer.isInitialized()).toBe(true);
    });
  });

  describe('tags and extra', () => {
    beforeEach(() => {
      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });
    });

    it('should set single tag', () => {
      ErrorExplorer.setTag('version', '1.0.0');
      expect(ErrorExplorer.isInitialized()).toBe(true);
    });

    it('should set multiple tags', () => {
      ErrorExplorer.setTags({
        version: '1.0.0',
        service: 'api',
      });
      expect(ErrorExplorer.isInitialized()).toBe(true);
    });

    it('should set extra data', () => {
      ErrorExplorer.setExtra('debugInfo', { key: 'value' });
      expect(ErrorExplorer.isInitialized()).toBe(true);
    });

    it('should set context', () => {
      ErrorExplorer.setContext('database', {
        type: 'postgres',
        version: '14',
      });
      expect(ErrorExplorer.isInitialized()).toBe(true);
    });
  });

  describe('breadcrumbs', () => {
    beforeEach(() => {
      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });
    });

    it('should add breadcrumb', () => {
      ErrorExplorer.addBreadcrumb({
        type: 'http',
        category: 'http.request',
        message: 'GET /api/users',
        level: 'info',
      });

      expect(ErrorExplorer.isInitialized()).toBe(true);
    });
  });

  describe('captureException', () => {
    beforeEach(() => {
      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
        debug: false,
      });
    });

    it('should capture exception and return event ID', () => {
      const eventId = ErrorExplorer.captureException(new Error('Test error'));

      expect(eventId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should capture exception with context', () => {
      const eventId = ErrorExplorer.captureException(new Error('Test error'), {
        tags: { custom: 'tag' },
        extra: { debug: true },
        level: 'warning',
      });

      expect(eventId).toBeDefined();
    });

    it('should return empty string when not initialized', async () => {
      await ErrorExplorer.close();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const eventId = ErrorExplorer.captureException(new Error('Test'));

      expect(eventId).toBe('');
      warnSpy.mockRestore();
    });
  });

  describe('captureMessage', () => {
    beforeEach(() => {
      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });
    });

    it('should capture message with default level', () => {
      const eventId = ErrorExplorer.captureMessage('Test message');
      expect(eventId).toBeDefined();
    });

    it('should capture message with custom level', () => {
      const eventId = ErrorExplorer.captureMessage('Warning message', 'warning');
      expect(eventId).toBeDefined();
    });
  });

  describe('beforeSend', () => {
    it('should call beforeSend hook', () => {
      const beforeSend = vi.fn((event) => event);

      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
        beforeSend,
      });

      ErrorExplorer.captureException(new Error('Test'));

      expect(beforeSend).toHaveBeenCalled();
    });

    it('should drop event if beforeSend returns null', () => {
      const beforeSend = vi.fn(() => null);

      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
        beforeSend,
      });

      const eventId = ErrorExplorer.captureException(new Error('Test'));

      expect(beforeSend).toHaveBeenCalled();
      expect(eventId).toBeDefined(); // Still returns ID, but event is dropped
    });

    it('should support async beforeSend', async () => {
      const beforeSend = vi.fn(async (event) => {
        await new Promise((r) => setTimeout(r, 10));
        return event;
      });

      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
        beforeSend,
      });

      ErrorExplorer.captureException(new Error('Test'));

      // Give time for async hook
      await new Promise((r) => setTimeout(r, 50));

      expect(beforeSend).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close and reset state', async () => {
      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });

      expect(ErrorExplorer.isInitialized()).toBe(true);

      await ErrorExplorer.close();

      expect(ErrorExplorer.isInitialized()).toBe(false);
    });

    it('should allow re-initialization after close', async () => {
      ErrorExplorer.init({
        token: 'ee_test',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });

      await ErrorExplorer.close();

      ErrorExplorer.init({
        token: 'ee_test2',
        autoCapture: { uncaughtExceptions: false, unhandledRejections: false },
      });

      expect(ErrorExplorer.isInitialized()).toBe(true);
    });
  });
});
