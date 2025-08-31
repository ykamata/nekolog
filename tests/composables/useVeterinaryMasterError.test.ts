import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVeterinaryMasterError } from '~/composables/useVeterinaryMasterError';
import { VETERINARY_ERROR_MESSAGES } from '~/lib/validations/veterinary-master';

// Toast composable のモック
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

describe('useVeterinaryMasterError', () => {
  let errorHandler: ReturnType<typeof useVeterinaryMasterError>;

  beforeEach(() => {
    errorHandler = useVeterinaryMasterError();
  });

  describe('parseError', () => {
    it('FetchErrorを正しく解析する', () => {
      const fetchError = {
        status: 409,
        data: {
          message: 'この病院名は既に登録されています',
          code: 'DUPLICATE_NAME',
        },
      };

      const result = errorHandler.parseError(fetchError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('この病院名は既に登録されています');
      expect(result.code).toBe('DUPLICATE_NAME');
    });

    it('バリデーションエラーを正しく解析する', () => {
      const validationError = {
        status: 400,
        data: {
          validationErrors: [
            { message: '病院名は必須です', path: ['name'] },
          ],
        },
      };

      const result = errorHandler.parseError(validationError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('病院名は必須です');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('404エラーを正しく解析する', () => {
      const notFoundError = {
        status: 404,
        data: {},
      };

      const result = errorHandler.parseError(notFoundError, 'hospital', 'update');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.HOSPITAL.NOT_FOUND);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('サーバーエラーを正しく解析する', () => {
      const serverError = {
        status: 500,
        data: {},
      };

      const result = errorHandler.parseError(serverError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.NETWORK.SERVER_ERROR);
      expect(result.code).toBe('SERVER_ERROR');
    });

    it('ネットワークエラーを正しく解析する', () => {
      const networkError = new TypeError('Failed to fetch');

      const result = errorHandler.parseError(networkError, 'hospital', 'fetch');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.NETWORK.CONNECTION_ERROR);
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('不明なエラーにデフォルトメッセージを使用する', () => {
      const unknownError = new Error('Unknown error');

      const result = errorHandler.parseError(unknownError, 'doctor', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.DOCTOR.CREATE_FAILED);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getLoadingMessage', () => {
    it('病院操作の正しいローディングメッセージを返す', () => {
      expect(errorHandler.getLoadingMessage('hospital', 'create')).toBe('病院を登録しています...');
      expect(errorHandler.getLoadingMessage('hospital', 'update')).toBe('病院情報を更新しています...');
      expect(errorHandler.getLoadingMessage('hospital', 'delete')).toBe('病院を削除しています...');
      expect(errorHandler.getLoadingMessage('hospital', 'fetch')).toBe('病院一覧を取得しています...');
      expect(errorHandler.getLoadingMessage('hospital', 'search')).toBe('病院を検索しています...');
    });

    it('先生操作の正しいローディングメッセージを返す', () => {
      expect(errorHandler.getLoadingMessage('doctor', 'create')).toBe('先生を登録しています...');
      expect(errorHandler.getLoadingMessage('doctor', 'update')).toBe('先生情報を更新しています...');
      expect(errorHandler.getLoadingMessage('doctor', 'delete')).toBe('先生を削除しています...');
      expect(errorHandler.getLoadingMessage('doctor', 'fetch')).toBe('先生一覧を取得しています...');
      expect(errorHandler.getLoadingMessage('doctor', 'search')).toBe('先生を検索しています...');
    });

    it('不明な操作にデフォルトメッセージを返す', () => {
      expect(errorHandler.getLoadingMessage('hospital', 'unknown')).toBe('処理中...');
    });
  });

  describe('formatValidationErrors', () => {
    it('バリデーションエラー配列を正しく整形する', () => {
      const errors = [
        { message: '病院名は必須です', path: ['name'] },
        { message: '電話番号の形式が正しくありません', path: ['phone'] },
      ];

      const result = errorHandler.formatValidationErrors(errors);
      expect(result).toBe('病院名は必須です');
    });

    it('空の配列にデフォルトメッセージを返す', () => {
      const result = errorHandler.formatValidationErrors([]);
      expect(result).toBe(VETERINARY_ERROR_MESSAGES.VALIDATION.INVALID_FORMAT);
    });

    it('無効な入力にデフォルトメッセージを返す', () => {
      const result = errorHandler.formatValidationErrors(null as any);
      expect(result).toBe(VETERINARY_ERROR_MESSAGES.VALIDATION.INVALID_FORMAT);
    });
  });
});
