import { describe, it, expect } from 'vitest';
import { generateUuid, generateShortId } from '../src/utils/uuid';
import { safeSerialize, truncateString, describeElement } from '../src/utils/serialize';
import {
  parseStackTrace,
  getErrorName,
  getErrorMessage,
  getErrorStack,
} from '../src/utils/stacktrace';

describe('UUID Utils', () => {
  describe('generateUuid', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = generateUuid();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUuid());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('generateShortId', () => {
    it('should generate 16 character ID', () => {
      const shortId = generateShortId();
      expect(shortId).toHaveLength(16);
    });

    it('should not contain dashes', () => {
      const shortId = generateShortId();
      expect(shortId).not.toContain('-');
    });
  });
});

describe('Serialize Utils', () => {
  describe('safeSerialize', () => {
    it('should serialize primitives', () => {
      expect(safeSerialize(null)).toBe(null);
      expect(safeSerialize(undefined)).toBe(undefined);
      expect(safeSerialize(true)).toBe(true);
      expect(safeSerialize(42)).toBe(42);
      expect(safeSerialize('hello')).toBe('hello');
    });

    it('should serialize arrays', () => {
      expect(safeSerialize([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should serialize objects', () => {
      expect(safeSerialize({ a: 1, b: 'two' })).toEqual({ a: 1, b: 'two' });
    });

    it('should handle Error objects', () => {
      const error = new TypeError('Test error');
      const serialized = safeSerialize(error) as any;

      expect(serialized.name).toBe('TypeError');
      expect(serialized.message).toBe('Test error');
      expect(serialized.stack).toBeDefined();
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      expect(safeSerialize(date)).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle functions', () => {
      const fn = function testFunc() {};
      expect(safeSerialize(fn)).toBe('[Function: testFunc]');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(2000);
      const serialized = safeSerialize(longString) as string;
      expect(serialized.length).toBeLessThan(longString.length);
      expect(serialized).toContain('...');
    });

    it('should handle circular references (depth limit)', () => {
      const obj: any = { a: 1 };
      obj.nested = { level1: { level2: { level3: { level4: { level5: { level6: { level7: { level8: { level9: { level10: { level11: obj } } } } } } } } } } };

      // Should not throw
      expect(() => safeSerialize(obj)).not.toThrow();
    });
  });

  describe('truncateString', () => {
    it('should not truncate short strings', () => {
      expect(truncateString('hello', 10)).toBe('hello');
    });

    it('should truncate long strings', () => {
      expect(truncateString('hello world', 5)).toBe('hello...');
    });

    it('should handle exact length', () => {
      expect(truncateString('hello', 5)).toBe('hello');
    });
  });
});

describe('Stacktrace Utils', () => {
  describe('parseStackTrace', () => {
    it('should parse Chrome-style stack trace', () => {
      const stack = `Error: Test error
    at functionName (https://example.com/app.js:10:15)
    at anotherFunction (https://example.com/app.js:20:5)`;

      const frames = parseStackTrace(stack);

      expect(frames.length).toBeGreaterThanOrEqual(2);
      expect(frames[0]?.function).toBe('functionName');
      expect(frames[0]?.filename).toBe('https://example.com/app.js');
      expect(frames[0]?.lineno).toBe(10);
      expect(frames[0]?.colno).toBe(15);
    });

    it('should parse Firefox-style stack trace', () => {
      const stack = `functionName@https://example.com/app.js:10:15
anotherFunction@https://example.com/app.js:20:5`;

      const frames = parseStackTrace(stack);

      expect(frames.length).toBe(2);
      expect(frames[0]?.function).toBe('functionName');
    });

    it('should handle empty/undefined stack', () => {
      expect(parseStackTrace(undefined)).toEqual([]);
      expect(parseStackTrace('')).toEqual([]);
    });

    it('should detect in_app correctly', () => {
      const stack = `Error: Test
    at myFunc (https://myapp.com/app.js:10:15)
    at vendorFunc (https://cdn.example.com/vendor.js:5:10)
    at nodeModuleFunc (https://myapp.com/node_modules/lib/index.js:1:1)`;

      const frames = parseStackTrace(stack);

      expect(frames[0]?.in_app).toBe(true);
      expect(frames[1]?.in_app).toBe(false); // CDN
      expect(frames[2]?.in_app).toBe(false); // node_modules
    });
  });

  describe('getErrorName', () => {
    it('should get name from Error object', () => {
      expect(getErrorName(new TypeError('test'))).toBe('TypeError');
      expect(getErrorName(new RangeError('test'))).toBe('RangeError');
    });

    it('should return "Error" for non-Error objects', () => {
      expect(getErrorName('string error')).toBe('Error');
      expect(getErrorName(123)).toBe('Error');
    });

    it('should get name from object with name property', () => {
      expect(getErrorName({ name: 'CustomError', message: 'test' })).toBe('CustomError');
    });
  });

  describe('getErrorMessage', () => {
    it('should get message from Error object', () => {
      expect(getErrorMessage(new Error('Test message'))).toBe('Test message');
    });

    it('should return string directly', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should stringify other values', () => {
      expect(getErrorMessage(123)).toBe('123');
    });
  });

  describe('getErrorStack', () => {
    it('should get stack from Error object', () => {
      const error = new Error('Test');
      expect(getErrorStack(error)).toBeDefined();
      expect(getErrorStack(error)).toContain('Error: Test');
    });

    it('should return undefined for non-Error objects', () => {
      expect(getErrorStack('string')).toBeUndefined();
      expect(getErrorStack(123)).toBeUndefined();
    });
  });
});
