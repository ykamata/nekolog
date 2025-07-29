import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  parseApiError,
  getUserFriendlyErrorMessage,
  isRetryableError,
  isNetworkError,
  retryWithBackoff,
  createDebouncedValidator,
  formatValidationErrors,
  createErrorHandler,
} from '~/utils/error-handling';

describe('Error Handling Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseApiError', () => {
    it('should parse FetchError correctly', () => {
      const fetchError = {
        data: {
          message: 'Test error message',
          data: [
            { path: ['name'], message: 'Name is required' },
          ],
        },
        status: 400,
        statusMessage: 'Bad Request',
      };

      const result = parseApiError(fetchError);

      expect(result).toEqual({
        message: 'Test error message',
        statusCode: 400,
        data: fetchError.data,
        validationErrors: [
          { field: 'name', message: 'Name is required' },
        ],
      });
    });

    it('should parse ZodError correctly', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        age: z.number().min(0, 'Age must be positive'),
      });

      try {
        schema.parse({ name: '', age: -1 });
      }
      catch (error) {
        const result = parseApiError(error);

        expect(result.message).toBe('入力データが無効です');
        expect(result.statusCode).toBe(400);
        expect(result.validationErrors).toHaveLength(2);
        expect(result.validationErrors).toContainEqual({
          field: 'name',
          message: 'Name is required',
        });
        expect(result.validationErrors).toContainEqual({
          field: 'age',
          message: 'Age must be positive',
        });
      }
    });

    it('should parse generic Error correctly', () => {
      const error = new Error('Generic error message');
      const result = parseApiError(error);

      expect(result).toEqual({
        message: 'Generic error message',
        statusCode: 500,
      });
    });

    it('should parse string error correctly', () => {
      const result = parseApiError('String error message');

      expect(result).toEqual({
        message: 'String error message',
        statusCode: 500,
      });
    });

    it('should handle unknown error types', () => {
      const result = parseApiError({ unknown: 'object' });

      expect(result).toEqual({
        message: '予期しないエラーが発生しました',
        statusCode: 500,
      });
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return context-specific messages for different status codes', () => {
      const testCases = [
        { statusCode: 400, expected: 'テスト: 入力データに問題があります。Test message' },
        { statusCode: 401, expected: 'テスト: 認証が必要です。ログインしてください。' },
        { statusCode: 403, expected: 'テスト: この操作を実行する権限がありません。' },
        { statusCode: 404, expected: 'テスト: 指定されたデータが見つかりません。' },
        { statusCode: 409, expected: 'テスト: データの競合が発生しました。Test message' },
        { statusCode: 500, expected: 'テスト: サーバーエラーが発生しました。しばらく待ってから再試行してください。' },
      ];

      testCases.forEach(({ statusCode, expected }) => {
        const error = { message: 'Test message', statusCode };
        const result = getUserFriendlyErrorMessage(error, 'テスト');
        expect(result).toBe(expected);
      });
    });

    it('should work without context', () => {
      const error = { message: 'Test message', statusCode: 400 };
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toBe('入力データに問題があります。Test message');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError({ message: 'Error', statusCode: 500 })).toBe(true);
      expect(isRetryableError({ message: 'Error', statusCode: 502 })).toBe(true);
      expect(isRetryableError({ message: 'Error', statusCode: 503 })).toBe(true);
      expect(isRetryableError({ message: 'Error', statusCode: 429 })).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      expect(isRetryableError({ message: 'Error', statusCode: 400 })).toBe(false);
      expect(isRetryableError({ message: 'Error', statusCode: 401 })).toBe(false);
      expect(isRetryableError({ message: 'Error', statusCode: 404 })).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      const networkError = {
        cause: { code: 'NETWORK_ERROR' },
      };
      expect(isNetworkError(networkError)).toBe(true);

      const connectionError = {
        cause: { code: 'ECONNREFUSED' },
      };
      expect(isNetworkError(connectionError)).toBe(true);
    });

    it('should identify non-network errors', () => {
      expect(isNetworkError(new Error('Regular error'))).toBe(false);
      expect(isNetworkError({ message: 'Not a network error' })).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retryWithBackoff(operation, 2, 10)).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('createDebouncedValidator', () => {
    it('should debounce validation calls', async () => {
      const validator = vi.fn().mockResolvedValue(undefined);
      const debouncedValidator = createDebouncedValidator(validator, 50);

      // Call multiple times quickly
      debouncedValidator('test1');
      debouncedValidator('test2');
      debouncedValidator('test3');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(validator).toHaveBeenCalledTimes(1);
      expect(validator).toHaveBeenCalledWith('test3');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Invalid email format' },
      ];

      const result = formatValidationErrors(errors);

      expect(result).toEqual({
        name: 'Name is required',
        email: 'Invalid email format',
      });
    });
  });

  describe('createErrorHandler', () => {
    it('should create error handler with context', () => {
      const handler = createErrorHandler('Test Context');
      const error = new Error('Test error');

      const result = handler.handleError(error);

      expect(result.message).toContain('Test Context');
      expect(result.error.message).toBe('Test error');
    });

    it('should handle error with fallback message', () => {
      const handler = createErrorHandler('Test Context');
      const error = new Error('Test error');

      const result = handler.handleError(error, 'Fallback message');

      expect(result.message).toBe('Fallback message');
    });
  });
});
