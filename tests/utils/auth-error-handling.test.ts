import { describe, it, expect, vi } from 'vitest';
import { classifyAuthError, getErrorHandlingStrategy, logAuthError, retryableFetch } from '~/utils/auth-error-handling';

describe('auth-error-handling', () => {
  describe('classifyAuthError', () => {
    it('ネットワークエラーを正しく分類する', () => {
      const networkError = { cause: { code: 'ENOTFOUND' } };
      const result = classifyAuthError(networkError);

      expect(result.type).toBe('network');
      expect(result.message).toBe('ネットワークエラーが発生しました');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('認証エラーを正しく分類する', () => {
      const authError = { statusCode: 401, message: 'Unauthorized' };
      const result = classifyAuthError(authError);

      expect(result.type).toBe('authentication');
      expect(result.statusCode).toBe(401);
      expect(result.message).toBe('認証が無効です');
    });

    it('サーバーエラーを正しく分類する', () => {
      const serverError = { statusCode: 500, message: 'Internal Server Error' };
      const result = classifyAuthError(serverError);

      expect(result.type).toBe('server');
      expect(result.statusCode).toBe(500);
      expect(result.message).toBe('サーバーエラーが発生しました');
    });

    it('不明なエラーを正しく分類する', () => {
      const unknownError = { statusCode: 400, message: 'Bad Request' };
      const result = classifyAuthError(unknownError);

      expect(result.type).toBe('unknown');
      expect(result.statusCode).toBe(400);
    });
  });

  describe('getErrorHandlingStrategy', () => {
    it('ネットワークエラーに対して適切な戦略を返す', () => {
      const authError = { type: 'network' as const, message: 'Network error' };
      const strategy = getErrorHandlingStrategy(authError);

      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.shouldClearTokens).toBe(false);
      expect(strategy.shouldLogout).toBe(false);
      expect(strategy.maxRetries).toBe(3);
    });

    it('認証エラーに対して適切な戦略を返す', () => {
      const authError = { type: 'authentication' as const, message: 'Auth error' };
      const strategy = getErrorHandlingStrategy(authError);

      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.shouldClearTokens).toBe(true);
      expect(strategy.shouldLogout).toBe(true);
    });
  });

  describe('logAuthError', () => {
    it('開発環境でエラーログを出力する', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const authError = {
        type: 'network' as const,
        message: 'Test error',
        timestamp: new Date('2023-01-01T00:00:00Z'),
      };

      logAuthError(authError, 'テストコンテキスト');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[認証エラー] テストコンテキスト'),
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });
});
