/**
 * Context collector tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { collectProcessContext } from '../src/context/ProcessContext.js';
import { collectOsContext, resetOsContext } from '../src/context/OsContext.js';
import { collectRuntimeContext, resetRuntimeContext } from '../src/context/RuntimeContext.js';
import {
  getServerContext,
  setServerName,
  resetServerContext,
} from '../src/context/ServerContext.js';
import {
  getUserContextManager,
  resetUserContextManager,
} from '../src/context/UserContext.js';

describe('Context Collectors', () => {
  describe('collectProcessContext', () => {
    it('should collect process information', () => {
      const context = collectProcessContext();

      expect(context.pid).toBe(process.pid);
      expect(context.ppid).toBe(process.ppid);
      expect(typeof context.uptime).toBe('number');
      expect(context.uptime).toBeGreaterThan(0);
    });

    it('should collect memory information', () => {
      const context = collectProcessContext();

      expect(context.memory).toBeDefined();
      expect(context.memory?.rss).toBeGreaterThan(0);
      expect(context.memory?.heapTotal).toBeGreaterThan(0);
      expect(context.memory?.heapUsed).toBeGreaterThan(0);
    });

    it('should collect CPU information', () => {
      const context = collectProcessContext();

      expect(context.cpu).toBeDefined();
      expect(typeof context.cpu?.user).toBe('number');
      expect(typeof context.cpu?.system).toBe('number');
    });
  });

  describe('collectOsContext', () => {
    beforeEach(() => {
      resetOsContext();
    });

    it('should collect OS information', () => {
      const context = collectOsContext();

      expect(context.name).toBeDefined();
      expect(context.version).toBeDefined();
      expect(context.arch).toBeDefined();
    });

    it('should cache OS context', () => {
      const context1 = collectOsContext();
      const context2 = collectOsContext();

      expect(context1).toBe(context2); // Same object reference
    });
  });

  describe('collectRuntimeContext', () => {
    beforeEach(() => {
      resetRuntimeContext();
    });

    it('should collect runtime information', () => {
      const context = collectRuntimeContext();

      expect(context.name).toBe('node');
      expect(context.version).toBe(process.version);
    });

    it('should cache runtime context', () => {
      const context1 = collectRuntimeContext();
      const context2 = collectRuntimeContext();

      expect(context1).toBe(context2);
    });
  });

  describe('ServerContext', () => {
    beforeEach(() => {
      resetServerContext();
    });

    afterEach(() => {
      resetServerContext();
    });

    it('should have default hostname', () => {
      const context = getServerContext();

      expect(context.hostname).toBeDefined();
      expect(context.name).toBeUndefined();
    });

    it('should allow setting server name', () => {
      setServerName('my-server');
      const context = getServerContext();

      expect(context.name).toBe('my-server');
    });
  });

  describe('UserContext', () => {
    beforeEach(() => {
      resetUserContextManager();
    });

    afterEach(() => {
      resetUserContextManager();
    });

    it('should start with no user', () => {
      const manager = getUserContextManager();
      expect(manager.getUser()).toBeNull();
    });

    it('should set and get user', () => {
      const manager = getUserContextManager();

      manager.setUser({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(manager.getUser()).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should clear user', () => {
      const manager = getUserContextManager();

      manager.setUser({ id: 'user123' });
      manager.clearUser();

      expect(manager.getUser()).toBeNull();
    });

    it('should allow custom properties', () => {
      const manager = getUserContextManager();

      manager.setUser({
        id: 'user123',
        customProp: 'custom value',
        plan: 'premium',
      });

      const user = manager.getUser();
      expect(user?.customProp).toBe('custom value');
      expect(user?.plan).toBe('premium');
    });
  });
});
