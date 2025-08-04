import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createApiErrorHandler,
  validateParams,
  validateBody,
  getRequestContext,
} from '~/server/utils/error-handler';

// Mock dependencies
vi.mock('h3', () => ({
  createError: vi.fn((options) => {
    const error = new Error(options.statusMessage) as any;
    error.statusCode = options.statusCode;
    error.statusMessage = options.statusMessage;
    error.data = options.data;
    return error;
  }),
  getHeaders: vi.fn(() => ({
    'user-agent': 'test-agent',
    'x-request-id': 'test-request-id',
    'x-forwarded-for': '127.0.0.1',
  })),
}));

vi.mock('~/server/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('Server Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiErrorHandler', () => {
    it('should handle Zod validation errors', () => {
      const handleError = createApiErrorHandler();
      const mockEvent = {
        context: { user: { id: 'user-123' } },
      } as any;

      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        age: z.number().min(0, 'Age must be positive'),
      });

      try {
        schema.parse({ name: '', age: -1 });
      }
      catch (zodError) {
        expect(() => handleError(zodError, mockEvent)).toThrow();

        try {
          handleError(zodError, mockEvent);
        }
        catch (error: any) {
          expect(error.statusCode).toBe(400);
          expect(error.statusMessage).toBe('入力データが無効です');
          expect(error.data.validationErrors).toHaveLength(2);
          expect(error.data.errorId).toBeDefined();
          expect(error.data.timestamp).toBeDefined();
        }
      }
    });

    it('should handle Prisma unique constraint errors', () => {
      const handleError = createApiErrorHandler();
      const mockEvent = {
        context: { user: { id: 'user-123' } },
      } as any;

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['name'] },
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError, mockEvent)).toThrow();

      try {
        handleError(prismaError, mockEvent);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(409);
        expect(error.statusMessage).toBe('同じ名前のデータが既に存在します');
        expect(error.data.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
      }
    });

    it('should handle Prisma foreign key constraint errors', () => {
      const handleError = createApiErrorHandler();
      const mockEvent = {
        context: { user: { id: 'user-123' } },
      } as any;

      const prismaError = {
        code: 'P2003',
        message: 'Foreign key constraint failed',
        meta: { field_name: 'catId' },
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError, mockEvent)).toThrow();

      try {
        handleError(prismaError, mockEvent);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.statusMessage).toBe('指定された猫が見つかりません');
        expect(error.data.code).toBe('FOREIGN_KEY_CONSTRAINT_VIOLATION');
      }
    });

    it('should handle Prisma record not found errors', () => {
      const handleError = createApiErrorHandler();
      const mockEvent = {
        context: { user: { id: 'user-123' } },
      } as any;

      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
        meta: { cause: 'Record to update not found.' },
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError, mockEvent)).toThrow();

      try {
        handleError(prismaError, mockEvent);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.statusMessage).toBe('データが見つかりません');
        expect(error.data.code).toBe('RECORD_NOT_FOUND');
      }
    });

    it('should handle HTTP errors', () => {
      const handleError = createApiErrorHandler();
      const mockEvent = {
        context: { user: { id: 'user-123' } },
      } as any;

      const httpError = {
        statusCode: 404,
        statusMessage: 'Not Found',
        data: { custom: 'data' },
      };

      expect(() => handleError(httpError, mockEvent)).toThrow();

      try {
        handleError(httpError, mockEvent);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.statusMessage).toBe('Not Found');
        expect(error.data.custom).toBe('data');
      }
    });

    it('should handle generic errors', () => {
      const handleError = createApiErrorHandler();
      const mockEvent = {
        context: { user: { id: 'user-123' } },
      } as any;

      const genericError = new Error('Something went wrong');

      expect(() => handleError(genericError, mockEvent)).toThrow();

      try {
        handleError(genericError, mockEvent);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.statusMessage).toBe('サーバーエラーが発生しました');
        expect(error.data.errorId).toBeDefined();
        expect(error.data.timestamp).toBeDefined();
      }
    });

    it('should handle unknown error types', () => {
      const handleError = createApiErrorHandler();
      const mockEvent = {
        context: { user: { id: 'user-123' } },
      } as any;

      const unknownError = 'string error';

      expect(() => handleError(unknownError, mockEvent)).toThrow();

      try {
        handleError(unknownError, mockEvent);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.statusMessage).toBe('サーバーエラーが発生しました');
        expect(error.data.errorId).toBeDefined();
      }
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

      try {
        validateParams(schema, params);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.statusMessage).toBe('Invalid request parameters');
        expect(error.data.validationErrors).toHaveLength(1);
        expect(error.data.validationErrors[0].field).toBe('id');
        expect(error.data.validationErrors[0].message).toBe('ID is required');
      }
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

      try {
        validateBody(schema, body);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.statusMessage).toBe('入力データが無効です');
        expect(error.data.validationErrors).toHaveLength(2);
      }
    });
  });

  describe('getRequestContext', () => {
    it('should extract request context from H3 event', () => {
      const mockEvent = {
        context: {
          user: { id: 'user-123' },
        },
      } as any;

      const context = getRequestContext(mockEvent);

      expect(context).toEqual({
        userId: 'user-123',
        requestId: 'test-request-id',
        userAgent: 'test-agent',
        ip: '127.0.0.1',
      });
    });

    it('should handle missing user context', () => {
      const mockEvent = {
        context: {},
      } as any;

      const context = getRequestContext(mockEvent);

      expect(context).toEqual({
        userId: 'anonymous',
        requestId: 'test-request-id',
        userAgent: 'test-agent',
        ip: '127.0.0.1',
      });
    });
  });
});
