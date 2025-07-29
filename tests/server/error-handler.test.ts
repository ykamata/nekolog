import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createApiErrorHandler,
  validateParams,
  validateBody,
  getRequestContext,
} from '~/server/utils/error-handler';

// Mock logger
vi.mock('~/lib/pino-logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock H3 utilities
vi.mock('h3', () => ({
  createError: vi.fn((options) => {
    const error = new Error(options.statusMessage);
    (error as any).statusCode = options.statusCode;
    (error as any).data = options.data;
    throw error;
  }),
  getHeaders: vi.fn(() => ({
    'user-agent': 'test-agent',
    'x-request-id': 'test-request-id',
  })),
  getClientIP: vi.fn(() => '127.0.0.1'),
  getMethod: vi.fn(() => 'POST'),
}));

describe('Server Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiErrorHandler', () => {
    const context = {
      endpoint: '/api/test',
      method: 'POST',
      userId: 'user-123',
    };

    it('should handle Zod validation errors', () => {
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

        try {
          handleError(zodError);
        }
        catch (error: any) {
          expect(error.statusCode).toBe(400);
          expect(error.message).toBe('入力データが無効です');
          expect(error.data.validationErrors).toHaveLength(2);
          expect(error.data.errorId).toBeDefined();
          expect(error.data.timestamp).toBeDefined();
        }
      }
    });

    it('should handle Prisma unique constraint errors', () => {
      const handleError = createApiErrorHandler(context);
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['name'] },
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError)).toThrow();

      try {
        handleError(prismaError);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(409);
        expect(error.message).toBe('同じ名前のデータが既に存在します');
        expect(error.data.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
      }
    });

    it('should handle Prisma foreign key constraint errors', () => {
      const handleError = createApiErrorHandler(context);
      const prismaError = {
        code: 'P2003',
        message: 'Foreign key constraint failed',
        meta: { field_name: 'cat_id' },
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError)).toThrow();

      try {
        handleError(prismaError);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('指定された猫が見つかりません');
        expect(error.data.code).toBe('FOREIGN_KEY_CONSTRAINT_VIOLATION');
      }
    });

    it('should handle Prisma record not found errors', () => {
      const handleError = createApiErrorHandler(context);
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
        clientVersion: '4.0.0',
      };

      expect(() => handleError(prismaError)).toThrow();

      try {
        handleError(prismaError);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('データが見つかりません');
        expect(error.data.code).toBe('RECORD_NOT_FOUND');
      }
    });

    it('should handle HTTP errors', () => {
      const handleError = createApiErrorHandler(context);
      const httpError = {
        statusCode: 404,
        statusMessage: 'Not Found',
        data: { custom: 'data' },
      };

      expect(() => handleError(httpError)).toThrow();

      try {
        handleError(httpError);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Not Found');
        expect(error.data.custom).toBe('data');
        expect(error.data.errorId).toBeDefined();
      }
    });

    it('should handle generic errors', () => {
      const handleError = createApiErrorHandler(context);
      const genericError = new Error('Something went wrong');

      expect(() => handleError(genericError)).toThrow();

      try {
        handleError(genericError);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('サーバーエラーが発生しました');
        expect(error.data.errorId).toBeDefined();
        expect(error.data.timestamp).toBeDefined();
      }
    });

    it('should handle unknown error types', () => {
      const handleError = createApiErrorHandler(context);
      const unknownError = 'string error';

      expect(() => handleError(unknownError)).toThrow();

      try {
        handleError(unknownError);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('サーバーエラーが発生しました');
        expect(error.data.errorId).toBeDefined();
      }
    });
  });

  describe('validateParams', () => {
    it('should validate valid parameters', () => {
      const schema = z.object({
        id: z.string().min(1),
        page: z.number().optional(),
      });

      const params = { id: 'test-id', page: 1 };
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
        expect(error.message).toBe('Invalid request parameters');
        expect(error.data.validationErrors).toHaveLength(1);
        expect(error.data.validationErrors[0].field).toBe('id');
        expect(error.data.validationErrors[0].message).toBe('ID is required');
      }
    });
  });

  describe('validateBody', () => {
    it('should validate valid body', () => {
      const schema = z.object({
        name: z.string().min(1),
        type: z.enum(['MEDICINE', 'SUPPLEMENT']),
      });

      const body = { name: 'Test Medicine', type: 'MEDICINE' };
      const result = validateBody(schema, body);

      expect(result).toEqual(body);
    });

    it('should throw error for invalid body', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['MEDICINE', 'SUPPLEMENT'], {
          errorMap: () => ({ message: 'Invalid type' }),
        }),
      });

      const body = { name: '', type: 'INVALID' };

      expect(() => validateBody(schema, body)).toThrow();

      try {
        validateBody(schema, body);
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('入力データが無効です');
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
      } as unknown;

      const context = getRequestContext(mockEvent);

      expect(context.userId).toBeUndefined();
      expect(context.requestId).toBe('test-request-id');
    });
  });
});
