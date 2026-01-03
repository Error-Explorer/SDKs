import { describe, it, expect, beforeEach } from 'vitest';
import {
  UserContextManager,
  getUserContextManager,
  resetUserContextManager,
} from '../src/context/UserContext';

describe('UserContextManager', () => {
  beforeEach(() => {
    resetUserContextManager();
  });

  it('should initialize without user', () => {
    const manager = getUserContextManager();
    expect(manager.getUser()).toBeNull();
    expect(manager.hasUser()).toBe(false);
  });

  it('should set user', () => {
    const manager = getUserContextManager();

    manager.setUser({
      id: 'user_123',
      email: 'john@example.com',
      name: 'John Doe',
    });

    expect(manager.hasUser()).toBe(true);

    const user = manager.getUser();
    expect(user?.id).toBe('user_123');
    expect(user?.email).toBe('john@example.com');
    expect(user?.name).toBe('John Doe');
  });

  it('should clear user', () => {
    const manager = getUserContextManager();

    manager.setUser({ id: 'user_123' });
    expect(manager.hasUser()).toBe(true);

    manager.clearUser();
    expect(manager.hasUser()).toBe(false);
    expect(manager.getUser()).toBeNull();
  });

  it('should return copy of user (not reference)', () => {
    const manager = getUserContextManager();

    manager.setUser({ id: 'user_123', name: 'John' });

    const user1 = manager.getUser();
    const user2 = manager.getUser();

    expect(user1).not.toBe(user2);
    expect(user1).toEqual(user2);
  });

  it('should work as singleton', () => {
    const manager1 = getUserContextManager();
    const manager2 = getUserContextManager();

    expect(manager1).toBe(manager2);

    manager1.setUser({ id: 'test' });
    expect(manager2.getUser()?.id).toBe('test');
  });

  it('should handle custom fields', () => {
    const manager = getUserContextManager();

    manager.setUser({
      id: 'user_123',
      plan: 'pro',
      organization: 'Acme Inc',
      customField: 42,
    });

    const user = manager.getUser();
    expect(user?.plan).toBe('pro');
    expect(user?.organization).toBe('Acme Inc');
    expect(user?.customField).toBe(42);
  });
});
