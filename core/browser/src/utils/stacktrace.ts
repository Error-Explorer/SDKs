import type { StackFrame } from '../types';

/**
 * Parse a stack trace string into structured frames
 */
export function parseStackTrace(stack: string | undefined): StackFrame[] {
  if (!stack) {
    return [];
  }

  const lines = stack.split('\n');
  const frames: StackFrame[] = [];

  for (const line of lines) {
    const frame = parseStackLine(line);
    if (frame) {
      frames.push(frame);
    }
  }

  return frames;
}

/**
 * Parse a single stack trace line
 * Handles Chrome/V8, Firefox, and Safari formats
 */
function parseStackLine(line: string): StackFrame | null {
  const trimmed = line.trim();

  // Skip empty lines and "Error:" header
  if (!trimmed || trimmed.startsWith('Error:') || trimmed === 'Error') {
    return null;
  }

  // Chrome/V8 format: "    at functionName (filename:line:col)"
  // or "    at filename:line:col"
  const chromeMatch = trimmed.match(
    /^\s*at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|(.+?):(\d+)|(.+?))\)?$/
  );

  if (chromeMatch) {
    const [, func, file1, line1, col1, file2, line2, file3] = chromeMatch;
    return {
      function: func || '<anonymous>',
      filename: file1 || file2 || file3,
      lineno: line1 ? parseInt(line1, 10) : line2 ? parseInt(line2, 10) : undefined,
      colno: col1 ? parseInt(col1, 10) : undefined,
      in_app: isInApp(file1 || file2 || file3),
    };
  }

  // Firefox format: "functionName@filename:line:col"
  const firefoxMatch = trimmed.match(/^(.+?)@(.+?):(\d+):(\d+)$/);

  if (firefoxMatch) {
    const [, func, file, line, col] = firefoxMatch;
    return {
      function: func || '<anonymous>',
      filename: file,
      lineno: parseInt(line ?? '0', 10),
      colno: parseInt(col ?? '0', 10),
      in_app: isInApp(file),
    };
  }

  // Safari format: "functionName@filename:line:col" or just "filename:line:col"
  const safariMatch = trimmed.match(/^(?:(.+?)@)?(.+?):(\d+)(?::(\d+))?$/);

  if (safariMatch) {
    const [, func, file, line, col] = safariMatch;
    return {
      function: func || '<anonymous>',
      filename: file,
      lineno: parseInt(line ?? '0', 10),
      colno: col ? parseInt(col, 10) : undefined,
      in_app: isInApp(file),
    };
  }

  // If no format matches, return a basic frame
  if (trimmed.length > 0) {
    return {
      function: trimmed,
      in_app: false,
    };
  }

  return null;
}

/**
 * Check if a filename is "in app" (not from node_modules, CDN, or browser internals)
 */
function isInApp(filename: string | undefined): boolean {
  if (!filename) {
    return false;
  }

  // Browser internal
  if (filename.startsWith('<')) {
    return false;
  }

  // Native code
  if (filename === '[native code]' || filename.includes('native code')) {
    return false;
  }

  // Node modules
  if (filename.includes('node_modules')) {
    return false;
  }

  // CDN or external
  const externalPatterns = [
    /cdn\./i,
    /unpkg\.com/i,
    /jsdelivr\.net/i,
    /cdnjs\.cloudflare\.com/i,
    /googleapis\.com/i,
    /gstatic\.com/i,
  ];

  for (const pattern of externalPatterns) {
    if (pattern.test(filename)) {
      return false;
    }
  }

  return true;
}

/**
 * Get error name from an Error object or unknown value
 */
export function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name || 'Error';
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj['name'] === 'string') {
      return obj['name'];
    }
  }

  return 'Error';
}

/**
 * Get error message from an Error object or unknown value
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj['message'] === 'string') {
      return obj['message'];
    }
  }

  try {
    return String(error);
  } catch {
    return 'Unknown error';
  }
}

/**
 * Get stack trace from an Error object or unknown value
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj['stack'] === 'string') {
      return obj['stack'];
    }
  }

  return undefined;
}
