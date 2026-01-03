/**
 * Stack trace parsing utilities for Node.js
 */

import * as path from 'node:path';
import type { StackFrame } from '../types.js';

/**
 * Parse a V8 stack trace string into structured frames
 */
export function parseStackTrace(stack: string | undefined): StackFrame[] {
  if (!stack) {
    return [];
  }

  const frames: StackFrame[] = [];
  const lines = stack.split('\n');

  for (const line of lines) {
    const frame = parseStackLine(line);
    if (frame) {
      frames.push(frame);
    }
  }

  return frames;
}

/**
 * Parse a single stack line
 * V8 formats:
 * - "    at functionName (file:line:col)"
 * - "    at file:line:col"
 * - "    at async functionName (file:line:col)"
 * - "    at Object.<anonymous> (file:line:col)"
 */
function parseStackLine(line: string): StackFrame | null {
  // Skip non-stack lines
  if (!line.trim().startsWith('at ')) {
    return null;
  }

  // Remove "at " prefix and trim
  const content = line.replace(/^\s*at\s+/, '').trim();

  // Pattern: "async? functionName (file:line:col)"
  const withFunctionMatch = content.match(
    /^(?:async\s+)?(.+?)\s+\((.+?):(\d+):(\d+)\)$/
  );

  if (withFunctionMatch) {
    const [, fn, file, lineNo, colNo] = withFunctionMatch;
    return createFrame(fn, file, lineNo, colNo);
  }

  // Pattern: "file:line:col" (anonymous)
  const anonymousMatch = content.match(/^(.+?):(\d+):(\d+)$/);

  if (anonymousMatch) {
    const [, file, lineNo, colNo] = anonymousMatch;
    return createFrame(undefined, file, lineNo, colNo);
  }

  // Pattern: "native code" or other
  return null;
}

/**
 * Create a stack frame object
 */
function createFrame(
  fn: string | undefined,
  file: string | undefined,
  lineNo: string | undefined,
  colNo: string | undefined
): StackFrame {
  const frame: StackFrame = {};

  if (fn) {
    // Clean up function name
    frame.function = cleanFunctionName(fn);
  }

  if (file) {
    frame.filename = file;
    frame.abs_path = path.isAbsolute(file) ? file : undefined;

    // Determine if in_app (not from node_modules)
    frame.in_app = !file.includes('node_modules') && !file.startsWith('node:');

    // Extract module name from path
    if (frame.in_app && file.includes('/')) {
      const parts = file.split('/');
      frame.module = parts[parts.length - 1]?.replace(/\.[^/.]+$/, '');
    }
  }

  if (lineNo) {
    frame.lineno = parseInt(lineNo, 10);
  }

  if (colNo) {
    frame.colno = parseInt(colNo, 10);
  }

  return frame;
}

/**
 * Clean up function name
 */
function cleanFunctionName(name: string): string {
  // Remove "Object." prefix
  name = name.replace(/^Object\./, '');

  // Remove "Module." prefix
  name = name.replace(/^Module\./, '');

  // Clean up "<anonymous>"
  if (name === '<anonymous>') {
    return '(anonymous)';
  }

  return name;
}

/**
 * Get error name from an error-like object
 */
export function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name || error.constructor.name;
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
 * Get error message from an error-like object
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
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

/**
 * Get error stack from an error-like object
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
