import { describe, it, expect, beforeEach } from 'vitest';
import {
  BreadcrumbManager,
  initBreadcrumbManager,
  getBreadcrumbManager,
  resetBreadcrumbManager,
} from '../src/breadcrumbs/BreadcrumbManager';
import type { ResolvedConfig } from '../src/types';

const mockConfig: ResolvedConfig = {
  token: 'ee_test',
  endpoint: 'https://test.com',
  environment: 'test',
  release: '1.0.0',
  autoCapture: { errors: true, unhandledRejections: true, console: true },
  breadcrumbs: {
    enabled: true,
    maxBreadcrumbs: 5,
    clicks: true,
    navigation: true,
    fetch: true,
    xhr: true,
    console: true,
    inputs: false,
  },
  denyUrls: [],
  allowUrls: [],
  ignoreErrors: [],
  maxRetries: 3,
  timeout: 5000,
  offline: true,
  debug: false,
};

describe('BreadcrumbManager', () => {
  beforeEach(() => {
    resetBreadcrumbManager();
  });

  it('should initialize singleton', () => {
    const manager = initBreadcrumbManager(mockConfig);
    expect(manager).toBeInstanceOf(BreadcrumbManager);
    expect(getBreadcrumbManager()).toBe(manager);
  });

  it('should add breadcrumbs', () => {
    const manager = initBreadcrumbManager(mockConfig);

    manager.add({
      type: 'click',
      message: 'Button clicked',
    });

    const breadcrumbs = manager.getAll();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]?.type).toBe('click');
    expect(breadcrumbs[0]?.message).toBe('Button clicked');
    expect(breadcrumbs[0]?.timestamp).toBeDefined();
  });

  it('should respect maxBreadcrumbs limit (FIFO)', () => {
    const manager = initBreadcrumbManager(mockConfig);

    // Add 7 breadcrumbs (max is 5)
    for (let i = 0; i < 7; i++) {
      manager.add({
        type: 'click',
        message: `Click ${i}`,
      });
    }

    const breadcrumbs = manager.getAll();
    expect(breadcrumbs).toHaveLength(5);
    // First 2 should be removed (FIFO)
    expect(breadcrumbs[0]?.message).toBe('Click 2');
    expect(breadcrumbs[4]?.message).toBe('Click 6');
  });

  it('should clear breadcrumbs', () => {
    const manager = initBreadcrumbManager(mockConfig);

    manager.add({ type: 'click', message: 'Test' });
    expect(manager.count).toBe(1);

    manager.clear();
    expect(manager.count).toBe(0);
    expect(manager.getAll()).toHaveLength(0);
  });

  it('should add timestamp if not provided', () => {
    const manager = initBreadcrumbManager(mockConfig);
    const before = Date.now();

    manager.add({ type: 'click', message: 'Test' });

    const after = Date.now();
    const breadcrumbs = manager.getAll();
    const timestamp = breadcrumbs[0]?.timestamp ?? 0;

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should preserve custom timestamp', () => {
    const manager = initBreadcrumbManager(mockConfig);
    const customTimestamp = 1234567890;

    manager.add({
      type: 'click',
      message: 'Test',
      timestamp: customTimestamp,
    });

    const breadcrumbs = manager.getAll();
    expect(breadcrumbs[0]?.timestamp).toBe(customTimestamp);
  });

  it('should return copy of breadcrumbs array', () => {
    const manager = initBreadcrumbManager(mockConfig);
    manager.add({ type: 'click', message: 'Test' });

    const breadcrumbs1 = manager.getAll();
    const breadcrumbs2 = manager.getAll();

    expect(breadcrumbs1).not.toBe(breadcrumbs2);
    expect(breadcrumbs1).toEqual(breadcrumbs2);
  });
});
