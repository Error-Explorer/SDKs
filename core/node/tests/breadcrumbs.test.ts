/**
 * Breadcrumb tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ResolvedConfig } from '../src/types.js';
import {
  initBreadcrumbManager,
  getBreadcrumbManager,
  resetBreadcrumbManager,
} from '../src/breadcrumbs/BreadcrumbManager.js';

describe('BreadcrumbManager', () => {
  const mockConfig: ResolvedConfig = {
    token: 'ee_test',
    endpoint: 'http://localhost/webhook',
    environment: 'test',
    release: '1.0.0',
    serverName: 'test-server',
    autoCapture: {
      uncaughtExceptions: false,
      unhandledRejections: false,
      console: false,
    },
    breadcrumbs: {
      enabled: true,
      maxBreadcrumbs: 10,
      http: true,
      console: true,
    },
    ignoreErrors: [],
    maxRetries: 3,
    timeout: 5000,
    debug: false,
    exitOnUncaughtException: true,
  };

  beforeEach(() => {
    resetBreadcrumbManager();
  });

  afterEach(() => {
    resetBreadcrumbManager();
  });

  describe('initialization', () => {
    it('should initialize with config', () => {
      const manager = initBreadcrumbManager(mockConfig);
      expect(manager).toBeDefined();
    });

    it('should return same instance', () => {
      const manager1 = initBreadcrumbManager(mockConfig);
      const manager2 = getBreadcrumbManager();

      expect(manager1).toBe(manager2);
    });
  });

  describe('add', () => {
    it('should add breadcrumbs', () => {
      const manager = initBreadcrumbManager(mockConfig);

      manager.add({
        type: 'http',
        category: 'http.request',
        message: 'GET /api/users',
      });

      const breadcrumbs = manager.getAll();
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]?.message).toBe('GET /api/users');
    });

    it('should auto-add timestamp', () => {
      const manager = initBreadcrumbManager(mockConfig);
      const before = Date.now();

      manager.add({
        type: 'console',
        message: 'test',
      });

      const after = Date.now();
      const breadcrumbs = manager.getAll();

      expect(breadcrumbs[0]?.timestamp).toBeGreaterThanOrEqual(before);
      expect(breadcrumbs[0]?.timestamp).toBeLessThanOrEqual(after);
    });

    it('should use provided timestamp', () => {
      const manager = initBreadcrumbManager(mockConfig);
      const customTime = 1234567890;

      manager.add({
        type: 'console',
        message: 'test',
        timestamp: customTime,
      });

      expect(manager.getAll()[0]?.timestamp).toBe(customTime);
    });

    it('should respect maxBreadcrumbs limit', () => {
      const manager = initBreadcrumbManager(mockConfig);

      // Add 15 breadcrumbs (limit is 10)
      for (let i = 0; i < 15; i++) {
        manager.add({
          type: 'debug',
          message: `Breadcrumb ${i}`,
        });
      }

      const breadcrumbs = manager.getAll();
      expect(breadcrumbs).toHaveLength(10);
      // Should keep the last 10 (5-14)
      expect(breadcrumbs[0]?.message).toBe('Breadcrumb 5');
      expect(breadcrumbs[9]?.message).toBe('Breadcrumb 14');
    });
  });

  describe('getAll', () => {
    it('should return copy of breadcrumbs', () => {
      const manager = initBreadcrumbManager(mockConfig);

      manager.add({ type: 'debug', message: 'test' });

      const crumbs1 = manager.getAll();
      const crumbs2 = manager.getAll();

      expect(crumbs1).not.toBe(crumbs2);
      expect(crumbs1).toEqual(crumbs2);
    });
  });

  describe('getLast', () => {
    it('should return last N breadcrumbs', () => {
      const manager = initBreadcrumbManager(mockConfig);

      for (let i = 0; i < 5; i++) {
        manager.add({ type: 'debug', message: `Msg ${i}` });
      }

      const last3 = manager.getLast(3);
      expect(last3).toHaveLength(3);
      expect(last3[0]?.message).toBe('Msg 2');
      expect(last3[2]?.message).toBe('Msg 4');
    });
  });

  describe('clear', () => {
    it('should clear all breadcrumbs', () => {
      const manager = initBreadcrumbManager(mockConfig);

      manager.add({ type: 'debug', message: 'test' });
      expect(manager.getAll()).toHaveLength(1);

      manager.clear();
      expect(manager.getAll()).toHaveLength(0);
    });
  });
});
