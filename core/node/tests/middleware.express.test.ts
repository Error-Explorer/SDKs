/**
 * Express middleware tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requestHandler, errorHandler, setupExpress } from '../src/middleware/express.js';
import { ErrorExplorer } from '../src/ErrorExplorer.js';
import type { ExpressRequest, ExpressResponse, ExpressNextFunction } from '../src/types.js';

// Mock request/response objects
function createMockRequest(overrides: Partial<ExpressRequest> = {}): ExpressRequest {
  return {
    method: 'GET',
    url: '/test',
    path: '/test',
    originalUrl: '/test',
    headers: {},
    query: {},
    params: {},
    body: {},
    ip: '127.0.0.1',
    ...overrides,
  } as ExpressRequest;
}

function createMockResponse(): ExpressResponse {
  const res = {
    statusCode: 200,
    headersSent: false,
    end: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as ExpressResponse;
  return res;
}

describe('Express Middleware', () => {
  beforeEach(async () => {
    await ErrorExplorer.close();
    // Initialize with minimal config
    ErrorExplorer.init({
      token: 'ee_test_token',
      environment: 'test',
      debug: false,
      autoCapture: {
        uncaughtExceptions: false,
        unhandledRejections: false,
        console: false,
      },
      breadcrumbs: {
        enabled: true,
        console: false,
        http: false,
      },
    });
  });

  afterEach(async () => {
    await ErrorExplorer.close();
    vi.clearAllMocks();
  });

  describe('requestHandler', () => {
    it('should create middleware function', () => {
      const middleware = requestHandler();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should call next()', () => {
      const middleware = requestHandler();
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should attach errorExplorer context to request', () => {
      const middleware = requestHandler();
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.errorExplorer).toBeDefined();
      expect(req.errorExplorer?.transaction).toBeDefined();
      expect(typeof req.errorExplorer?.transaction).toBe('string');
      expect(req.errorExplorer?.startTime).toBeDefined();
    });

    it('should extract user when extractUser option is provided', () => {
      const extractUser = vi.fn().mockReturnValue({
        id: 'user_123',
        email: 'test@example.com',
      });

      const middleware = requestHandler({ extractUser });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(extractUser).toHaveBeenCalledWith(req);
      expect(req.errorExplorer?.user).toEqual({
        id: 'user_123',
        email: 'test@example.com',
      });
    });

    it('should handle extractUser errors gracefully', () => {
      const extractUser = vi.fn().mockImplementation(() => {
        throw new Error('Extract error');
      });

      const middleware = requestHandler({ extractUser });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      // Should not throw
      expect(() => middleware(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });

    it('should work with breadcrumbs disabled', () => {
      const middleware = requestHandler({ breadcrumbs: false });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.errorExplorer).toBeDefined();
    });
  });

  describe('errorHandler', () => {
    it('should create error middleware function', () => {
      const middleware = errorHandler();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(4); // err, req, res, next
    });

    it('should capture exception and call next by default', () => {
      const captureExceptionSpy = vi.spyOn(ErrorExplorer, 'captureException');

      const middleware = errorHandler();
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(error, req, res, next);

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          request: req,
          tags: expect.any(Object),
        })
      );
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should not call next when callNext is false', () => {
      const middleware = errorHandler({ callNext: false });
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(error, req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it('should skip if headers already sent', () => {
      const captureExceptionSpy = vi.spyOn(ErrorExplorer, 'captureException');

      const middleware = errorHandler();
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      res.headersSent = true;
      const next = vi.fn();

      middleware(error, req, res, next);

      expect(captureExceptionSpy).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should include request context in capture', () => {
      const captureExceptionSpy = vi.spyOn(ErrorExplorer, 'captureException');

      const middleware = errorHandler();
      const error = new Error('Test error');
      const req = createMockRequest({
        method: 'POST',
        path: '/api/users',
        query: { filter: 'active' },
        params: { id: '123' },
      });
      req.errorExplorer = {
        transaction: 'tx_abc123',
        startTime: Date.now(),
        user: { id: 'user_456' },
      };
      const res = createMockResponse();
      const next = vi.fn();

      middleware(error, req, res, next);

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          user: { id: 'user_456' },
          tags: expect.objectContaining({
            transaction: 'tx_abc123',
            route: '/api/users',
            method: 'POST',
          }),
          extra: expect.objectContaining({
            query: { filter: 'active' },
            params: { id: '123' },
          }),
        })
      );
    });

    it('should call custom onError handler', () => {
      const onError = vi.fn();

      const middleware = errorHandler({ onError });
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(error, req, res, next);

      expect(onError).toHaveBeenCalledWith(error, req, res);
    });

    it('should handle onError errors gracefully', () => {
      const onError = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      const middleware = errorHandler({ onError });
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      // Should not throw
      expect(() => middleware(error, req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('setupExpress', () => {
    it('should return both middlewares', () => {
      const { requestHandler: reqHandler, errorHandler: errHandler } = setupExpress();

      expect(typeof reqHandler).toBe('function');
      expect(typeof errHandler).toBe('function');
      expect(reqHandler.length).toBe(3);
      expect(errHandler.length).toBe(4);
    });

    it('should pass options to middlewares', () => {
      const extractUser = vi.fn().mockReturnValue({ id: '123' });
      const onError = vi.fn();

      const { requestHandler: reqHandler, errorHandler: errHandler } = setupExpress(
        { extractUser },
        { onError, callNext: false }
      );

      // Test requestHandler
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();
      reqHandler(req, res, next);
      expect(extractUser).toHaveBeenCalled();

      // Test errorHandler
      const error = new Error('Test');
      errHandler(error, req, res, next);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete request-error flow', () => {
      const captureExceptionSpy = vi.spyOn(ErrorExplorer, 'captureException');

      const reqHandler = requestHandler({
        extractUser: () => ({ id: 'user_test', email: 'test@test.com' }),
      });
      const errHandler = errorHandler();

      const req = createMockRequest({
        method: 'POST',
        path: '/api/orders',
      });
      const res = createMockResponse();
      const next = vi.fn();

      // Simulate request
      reqHandler(req, res, next);

      expect(req.errorExplorer).toBeDefined();
      expect(req.errorExplorer?.user).toEqual({ id: 'user_test', email: 'test@test.com' });

      // Simulate error
      const error = new Error('Order processing failed');
      errHandler(error, req, res, next);

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          user: { id: 'user_test', email: 'test@test.com' },
          tags: expect.objectContaining({
            method: 'POST',
            route: '/api/orders',
          }),
        })
      );
    });

    it('should handle request without error', () => {
      const reqHandler = requestHandler();

      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      reqHandler(req, res, next);

      expect(req.errorExplorer?.transaction).toBeDefined();
      expect(next).toHaveBeenCalled();

      // Simulate successful response - res.end is wrapped by middleware
      // so we just verify it can be called without error
      expect(() => res.end()).not.toThrow();
    });
  });
});
