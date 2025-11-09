import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

import {
  createApiErrorHandler,
  validateParams,
  validateBody,
  getRequestContext,
} from '~/server/utils/error-handler';

// Mock dependencies
const mockCreateError = vi.fn((options) => {
  const error = new Error(options.statusMessage) as any;
  error.statusCode = options.statusCode;
  error.statusMessage = options.statusMessage;
  error.data = options.data;
  return error;
});

// Mock global createError
global.createError = mockCreateError;

vi.mock('h3', () => ({
  getHeaders: vi.fn(() => ({
    'user-agent': 'test-agent',
    'x-request-id': 'test-request-id',
  })),
  getMethod: vi.fn(() => 'GET'),
}));

vi.mock('~/lib/pino-logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Server Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateError.mockClear();
  });

  describe('createApiErrorHandler', () => {
    it('should handle Zod validation errors', () => {
      const context = {
        endpoint: '/api/test',
        method: 'POST',
        userId: 123,
      };
      const handleError = createApiErrorHandler(context);

      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        age: z.number().min(0, 'Age must be positive'),
      });

      try {
        schema.parse({ name: '', age: -1 });
      }
      catch (zodError) {
        expect(() => handleError(zodError)).toThrow();

        // Check that createError was called with correct parameters
        expect(mockCreateError).toHaveBeenCalledWith({
          statusCode: 400,
          statusMessage: '入力データが無効です',
          data: expect.objectContaining({
            errorId: expect.any(String),
            timestamp: expect.any(String),
            validationErrors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String),
                message: expect.any(String),
                code: expect.any(String),
              }),
            ]),
          }),
        });
      }
    });

    it('should handle Prisma unique constraint errors', () => {
      const context = {
        endpoint: '/api/test',
        method: 'POST',
        userId: 123,
      };
      const handleError = createApiErrorHandler(context);

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['name'] },
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError)).toThrow();

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 409,
        statusMessage: '同じ名前のデータが既に存在します',
        data: expect.objectContaining({
          errorId: expect.any(String),
          timestamp: expect.any(String),
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
        }),
      });
    });

    it('should handle Prisma foreign key constraint errors', () => {
      const context = {
        endpoint: '/api/test',
        method: 'POST',
        userId: 123,
      };
      const handleError = createApiErrorHandler(context);

      const prismaError = {
        code: 'P2003',
        message: 'Foreign key constraint failed',
        meta: { field_name: 'catId' },
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError)).toThrow();

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 400,
        statusMessage: '指定された猫が見つかりません',
        data: expect.objectContaining({
          errorId: expect.any(String),
          timestamp: expect.any(String),
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
        }),
      });
    });

    it('should handle Prisma record not found errors', () => {
      const context = {
        endpoint: '/api/test',
        method: 'POST',
        userId: 123,
      };
      const handleError = createApiErrorHandler(context);

      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
        meta: { cause: 'Record to update not found.' },
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError)).toThrow();

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 404,
        statusMessage: 'データが見つかりません',
        data: expect.objectContaining({
          errorId: expect.any(String),
          timestamp: expect.any(String),
          code: 'RECORD_NOT_FOUND',
        }),
      });
    });

    it('should handle HTTP errors', () => {
      const context = {
        endpoint: '/api/test',
        method: 'POST',
        userId: 123,
      };
      const handleError = createApiErrorHandler(context);

      const httpError = {
        statusCode: 404,
        statusMessage: 'Not Found',
        data: { custom: 'data' },
      };

      expect(() => handleError(httpError)).toThrow();

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 404,
        statusMessage: 'Not Found',
        data: expect.objectContaining({
          errorId: expect.any(String),
          timestamp: expect.any(String),
          custom: 'data',
        }),
      });
    });

    it('should handle generic errors', () => {
      const context = {
        endpoint: '/api/test',
        method: 'POST',
        userId: 123,
      };
      const handleError = createApiErrorHandler(context);

      const genericError = new Error('Something went wrong');

      expect(() => handleError(genericError)).toThrow();

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 500,
        statusMessage: 'サーバーエラーが発生しました',
        data: expect.objectContaining({
          errorId: expect.any(String),
          timestamp: expect.any(String),
        }),
      });
    });

    it('should handle unknown error types', () => {
      const context = {
        endpoint: '/api/test',
        method: 'POST',
        userId: 123,
      };
      const handleError = createApiErrorHandler(context);

      const unknownError = 'string error';

      expect(() => handleError(unknownError)).toThrow();

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 500,
        statusMessage: 'サーバーエラーが発生しました',
        data: expect.objectContaining({
          errorId: expect.any(String),
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('validateParams', () => {
    it('should validate valid parameters', () => {
      const schema = z.object({
        id: z.string().min(1, 'ID is required'),
      });

      const params = { id: 'test-id' };
      const result = validateParams(schema, params);

      expect(result).toEqual(params);
    });

    it('should throw error for invalid parameters', () => {
      const schema = z.object({
        id: z.string().min(1, 'ID is required'),
      });

      const params = { id: '' };

      expect(() => validateParams(schema, params)).toThrow();

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 400,
        statusMessage: 'Invalid request parameters',
        data: expect.objectContaining({
          validationErrors: expect.arrayContaining([
            expect.objectContaining({
              field: 'id',
              message: 'ID is required',
              code: expect.any(String),
            }),
          ]),
        }),
      });
    });
  });

  describe('validateBody', () => {
    it('should validate valid body', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['DRY', 'WET']),
      });

      const body = { name: 'Test Food', type: 'DRY' };
      const result = validateBody(schema, body);

      expect(result).toEqual(body);
    });

    it('should throw error for invalid body', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['DRY', 'WET']),
      });

      const body = { name: '', type: 'INVALID' };

      expect(() => validateBody(schema, body)).toThrow();

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 400,
        statusMessage: '入力データが無効です',
        data: expect.objectContaining({
          validationErrors: expect.arrayContaining([
            expect.objectContaining({
              field: expect.any(String),
              message: expect.any(String),
              code: expect.any(String),
            }),
          ]),
        }),
      });
    });
  });

  describe('getRequestContext', () => {
    it('should extract request context from H3 event', () => {
      const mockEvent = {
        context: {
          user: { id: 123 },
        },
      } as any;

      const context = getRequestContext(mockEvent);

      expect(context).toEqual({
        userId: 123,
        requestId: 'test-request-id',
        userAgent: 'test-agent',
        ip: 'unknown',
      });
    });

    it('should handle missing user context', () => {
      const mockEvent = {
        context: {},
      } as unknown;

      const context = getRequestContext(mockEvent);

      expect(context).toEqual({
        userId: undefined,
        requestId: 'test-request-id',
        userAgent: 'test-agent',
        ip: 'unknown',
      });
    });
  });
});
