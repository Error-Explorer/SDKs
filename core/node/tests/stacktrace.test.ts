/**
 * Stack trace parsing tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseStackTrace,
  getErrorName,
  getErrorMessage,
  getErrorStack,
} from '../src/utils/stacktrace.js';

describe('Stacktrace Utils', () => {
  describe('parseStackTrace', () => {
    it('should parse V8 stack trace with function names', () => {
      const stack = `Error: Test error
    at functionName (/app/src/service.ts:42:15)
    at Object.handler (/app/src/handler.ts:10:3)
    at process (/app/node_modules/express/lib/router.js:100:12)`;

      const frames = parseStackTrace(stack);

      expect(frames).toHaveLength(3);
      expect(frames[0]).toEqual({
        function: 'functionName',
        filename: '/app/src/service.ts',
        abs_path: '/app/src/service.ts',
        lineno: 42,
        colno: 15,
        in_app: true,
        module: 'service',
      });

      expect(frames[1]?.function).toBe('handler');
      expect(frames[2]?.in_app).toBe(false); // node_modules
    });

    it('should parse anonymous functions', () => {
      const stack = `Error: Test
    at /app/src/file.ts:10:5`;

      const frames = parseStackTrace(stack);

      expect(frames).toHaveLength(1);
      expect(frames[0]?.function).toBeUndefined();
      expect(frames[0]?.filename).toBe('/app/src/file.ts');
    });

    it('should parse async stack frames', () => {
      const stack = `Error: Async error
    at async processRequest (/app/src/api.ts:25:10)`;

      const frames = parseStackTrace(stack);

      expect(frames).toHaveLength(1);
      expect(frames[0]?.function).toBe('processRequest');
    });

    it('should handle undefined stack', () => {
      const frames = parseStackTrace(undefined);
      expect(frames).toEqual([]);
    });

    it('should mark node: modules as not in_app', () => {
      const stack = `Error: Test
    at userCode (/app/src/index.ts:1:1)
    at process (node:events:100:20)`;

      const frames = parseStackTrace(stack);

      expect(frames[0]?.in_app).toBe(true);
      expect(frames[1]?.in_app).toBe(false);
    });
  });

  describe('getErrorName', () => {
    it('should get name from Error', () => {
      const error = new TypeError('test');
      expect(getErrorName(error)).toBe('TypeError');
    });

    it('should get name from custom Error', () => {
      class CustomError extends Error {
        constructor() {
          super('test');
          this.name = 'CustomError';
        }
      }
      expect(getErrorName(new CustomError())).toBe('CustomError');
    });

    it('should return "Error" for non-errors', () => {
      expect(getErrorName('string')).toBe('Error');
      expect(getErrorName(42)).toBe('Error');
      expect(getErrorName(null)).toBe('Error');
    });

    it('should get name from error-like object', () => {
      expect(getErrorName({ name: 'MyError', message: 'test' })).toBe('MyError');
    });
  });

  describe('getErrorMessage', () => {
    it('should get message from Error', () => {
      expect(getErrorMessage(new Error('test message'))).toBe('test message');
    });

    it('should handle string input', () => {
      expect(getErrorMessage('error string')).toBe('error string');
    });

    it('should handle object with message', () => {
      expect(getErrorMessage({ message: 'obj message' })).toBe('obj message');
    });

    it('should serialize objects without message', () => {
      expect(getErrorMessage({ code: 'ERR' })).toBe('{"code":"ERR"}');
    });
  });

  describe('getErrorStack', () => {
    it('should get stack from Error', () => {
      const error = new Error('test');
      expect(getErrorStack(error)).toBeDefined();
      expect(getErrorStack(error)).toContain('Error: test');
    });

    it('should get stack from error-like object', () => {
      expect(getErrorStack({ stack: 'custom stack' })).toBe('custom stack');
    });

    it('should return undefined for non-errors', () => {
      expect(getErrorStack('string')).toBeUndefined();
      expect(getErrorStack(42)).toBeUndefined();
    });
  });
});
