/**
 * User context manager for @error-explorer/node SDK
 */

import type { UserContext } from '../types.js';

/**
 * Global user context manager
 */
class UserContextManager {
  private user: UserContext | null = null;

  /**
   * Set user context
   */
  setUser(user: UserContext | null): void {
    this.user = user;
  }

  /**
   * Get current user context
   */
  getUser(): UserContext | null {
    return this.user;
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.user = null;
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.user = null;
  }
}

// Singleton instance
let userContextManager: UserContextManager | null = null;

export function getUserContextManager(): UserContextManager {
  if (!userContextManager) {
    userContextManager = new UserContextManager();
  }
  return userContextManager;
}

export function resetUserContextManager(): void {
  if (userContextManager) {
    userContextManager.reset();
  }
  userContextManager = null;
}
