/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() if available, falls back to custom implementation
 */
export function generateUuid(): string {
  // Use native crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short ID (for session, etc.)
 */
export function generateShortId(): string {
  return generateUuid().replace(/-/g, '').substring(0, 16);
}
