import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, getRateLimiter, resetRateLimiter } from '../src/transport/RateLimiter';
import { RetryManager, getRetryManager, resetRetryManager } from '../src/transport/RetryManager';

describe('RateLimiter', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('should allow requests under limit', () => {
    const limiter = new RateLimiter(5, 60000);

    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed()).toBe(true);
    }
  });

  it('should block requests over limit', () => {
    const limiter = new RateLimiter(3, 60000);

    expect(limiter.isAllowed()).toBe(true);
    expect(limiter.isAllowed()).toBe(true);
    expect(limiter.isAllowed()).toBe(true);
    expect(limiter.isAllowed()).toBe(false);
    expect(limiter.isAllowed()).toBe(false);
  });

  it('should track remaining requests', () => {
    const limiter = new RateLimiter(5, 60000);

    expect(limiter.getRemaining()).toBe(5);
    limiter.isAllowed();
    expect(limiter.getRemaining()).toBe(4);
    limiter.isAllowed();
    limiter.isAllowed();
    expect(limiter.getRemaining()).toBe(2);
  });

  it('should reset properly', () => {
    const limiter = new RateLimiter(3, 60000);

    limiter.isAllowed();
    limiter.isAllowed();
    limiter.isAllowed();
    expect(limiter.isAllowed()).toBe(false);

    limiter.reset();
    expect(limiter.isAllowed()).toBe(true);
    expect(limiter.getRemaining()).toBe(2);
  });

  it('should expire old requests after window', async () => {
    const limiter = new RateLimiter(2, 50); // 50ms window

    expect(limiter.isAllowed()).toBe(true);
    expect(limiter.isAllowed()).toBe(true);
    expect(limiter.isAllowed()).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(limiter.isAllowed()).toBe(true);
  });

  it('should work as singleton', () => {
    const limiter1 = getRateLimiter();
    const limiter2 = getRateLimiter();

    expect(limiter1).toBe(limiter2);
  });
});

describe('RetryManager', () => {
  beforeEach(() => {
    resetRetryManager();
    vi.useFakeTimers();
  });

  it('should enqueue events', () => {
    const manager = new RetryManager(3);
    const mockSend = vi.fn().mockResolvedValue(true);
    manager.setSendFunction(mockSend);

    const event = {
      message: 'Test error',
      severity: 'error' as const,
      timestamp: new Date().toISOString(),
      sdk: { name: 'test', version: '1.0.0' },
    };

    manager.enqueue(event);

    expect(manager.getQueueSize()).toBe(1);
  });

  it('should clear queue', () => {
    const manager = new RetryManager(3);

    manager.enqueue({
      message: 'Test',
      severity: 'error',
      timestamp: new Date().toISOString(),
      sdk: { name: 'test', version: '1.0.0' },
    });

    expect(manager.getQueueSize()).toBe(1);

    manager.clear();
    expect(manager.getQueueSize()).toBe(0);
  });

  it('should work as singleton', () => {
    const manager1 = getRetryManager();
    const manager2 = getRetryManager();

    expect(manager1).toBe(manager2);
  });
});
