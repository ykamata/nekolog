import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VeterinaryMasterError, VETERINARY_ERROR_MESSAGES } from '~/lib/validations/veterinary-master';

// useToastのモック
const mockAddToast = vi.fn();
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

// Composableを動的にインポート
const { useVeterinaryMasterError } = await import('~/composables/useVeterinaryMasterError');

describe('useVeterinaryMasterError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseError', () => {
    const { parseError } = useVeterinaryMasterError();

    it('VeterinaryMasterErrorを正しく解析する', () => {
      const error = new VeterinaryMasterError(
        '病院名が重複しています',
        'DUPLICATE_NAME',
        409,
        { existingId: 'hospital-1' },
      );

      const result = parseError(error, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('病院名が重複しています');
      expect(result.code).toBe('DUPLICATE_NAME');
      expect(result.details).toEqual({ existingId: 'hospital-1' });
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('バリデーションエラー（400）を正しく解析する', () => {
      const fetchError = {
        status: 400,
        data: {
          validationErrors: [
            { message: '病院名は必須です', path: 'name' },
          ],
        },
      };

      const result = parseError(fetchError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('病院名は必須です');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.details).toEqual({ validationErrors: fetchError.data.validationErrors });
    });

    it('重複エラー（409）を正しく解析する - 病院', () => {
      const fetchError = {
        status: 409,
        data: { message: 'カスタム重複メッセージ' },
      };

      const result = parseError(fetchError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('カスタム重複メッセージ');
      expect(result.code).toBe('DUPLICATE_NAME');
    });

    it('重複エラー（409）を正しく解析する - 先生', () => {
      const fetchError = {
        status: 409,
        data: {},
      };

      const result = parseError(fetchError, 'doctor', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.DOCTOR.DUPLICATE_NAME);
      expect(result.code).toBe('DUPLICATE_NAME');
    });

    it('404エラーを正しく解析する - 病院', () => {
      const fetchError = {
        status: 404,
        data: { message: '病院が見つかりません' },
      };

      const result = parseError(fetchError, 'hospital', 'update');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('病院が見つかりません');
      expect(result.code).toBe('NOT_FOUND');
    });

    it('404エラーを正しく解析する - 先生', () => {
      const fetchError = {
        status: 404,
        data: {},
      };

      const result = parseError(fetchError, 'doctor', 'delete');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.DOCTOR.NOT_FOUND);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('サーバーエラー（500）を正しく解析する', () => {
      const fetchError = {
        status: 500,
        data: { message: 'Internal Server Error' },
      };

      const result = parseError(fetchError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.NETWORK.SERVER_ERROR);
      expect(result.code).toBe('SERVER_ERROR');
    });

    it('APIエラーメッセージを正しく解析する', () => {
      const fetchError = {
        status: 422,
        data: {
          message: 'カスタムAPIエラー',
          code: 'CUSTOM_ERROR',
        },
      };

      const result = parseError(fetchError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('カスタムAPIエラー');
      expect(result.code).toBe('CUSTOM_ERROR');
    });

    it('ネットワークエラーを正しく解析する', () => {
      const networkError = new TypeError('Failed to fetch');

      const result = parseError(networkError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.NETWORK.CONNECTION_ERROR);
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('不明なエラーをデフォルトメッセージで解析する - 病院作成', () => {
      const unknownError = new Error('Unknown error');

      const result = parseError(unknownError, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.HOSPITAL.CREATE_FAILED);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('不明なエラーをデフォルトメッセージで解析する - 先生更新', () => {
      const unknownError = { unexpected: 'error' };

      const result = parseError(unknownError, 'doctor', 'update');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.DOCTOR.UPDATE_FAILED);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('不明な操作の場合、サーバーエラーメッセージを使用する', () => {
      const unknownError = new Error('Unknown error');

      const result = parseError(unknownError, 'hospital', 'unknown_operation');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe(VETERINARY_ERROR_MESSAGES.NETWORK.SERVER_ERROR);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('handleError', () => {
    const { handleError } = useVeterinaryMasterError();

    it('エラーを処理してトーストを表示する', () => {
      const error = new VeterinaryMasterError('テストエラー', 'TEST_ERROR');

      const result = handleError(error, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('テストエラー');
      expect(mockAddToast).toHaveBeenCalledWith('error', {
        message: 'テストエラー',
        duration: 5000,
      });
    });

    it('通知を無効にした場合、トーストを表示しない', () => {
      const error = new VeterinaryMasterError('テストエラー', 'TEST_ERROR');

      const result = handleError(error, 'hospital', 'create', false);

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('テストエラー');
      expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('コンソールエラーが出力される', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new VeterinaryMasterError('テストエラー', 'TEST_ERROR');

      handleError(error, 'doctor', 'update');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Veterinary doctor update error:',
        expect.objectContaining({
          error,
          errorState: expect.objectContaining({
            hasError: true,
            message: 'テストエラー',
          }),
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('showSuccess', () => {
    const { showSuccess } = useVeterinaryMasterError();

    it('病院作成の成功メッセージを表示する', () => {
      showSuccess('hospital', 'create');

      expect(mockAddToast).toHaveBeenCalledWith('success', {
        message: '病院を登録しました',
      });
    });

    it('先生更新の成功メッセージを表示する', () => {
      showSuccess('doctor', 'update');

      expect(mockAddToast).toHaveBeenCalledWith('success', {
        message: '先生情報を更新しました',
      });
    });

    it('カスタムメッセージを表示する', () => {
      showSuccess('hospital', 'create', 'カスタム成功メッセージ');

      expect(mockAddToast).toHaveBeenCalledWith('success', {
        message: 'カスタム成功メッセージ',
      });
    });

    it('不明な操作の場合、デフォルトメッセージを表示する', () => {
      showSuccess('hospital', 'unknown_operation');

      expect(mockAddToast).toHaveBeenCalledWith('success', {
        message: '操作が完了しました',
      });
    });
  });

  describe('showWarning', () => {
    const { showWarning } = useVeterinaryMasterError();

    it('警告メッセージを表示する', () => {
      showWarning('警告メッセージです');

      expect(mockAddToast).toHaveBeenCalledWith('warning', {
        message: '警告メッセージです',
        duration: 7000,
        action: undefined,
      });
    });

    it('アクション付きの警告メッセージを表示する', () => {
      const action = { label: 'アクション', handler: vi.fn() };
      showWarning('警告メッセージです', action);

      expect(mockAddToast).toHaveBeenCalledWith('warning', {
        message: '警告メッセージです',
        duration: 7000,
        action,
      });
    });
  });

  describe('showDeleteWarning', () => {
    const { showDeleteWarning } = useVeterinaryMasterError();

    it('病院の削除警告を表示する（関連データなし）', () => {
      showDeleteWarning('hospital', 'テスト病院', false);

      expect(mockAddToast).toHaveBeenCalledWith('warning', {
        message: '「テスト病院」を削除しますか？',
        duration: 7000,
        action: undefined,
      });
    });

    it('病院の削除警告を表示する（関連データあり）', () => {
      showDeleteWarning('hospital', 'テスト病院', true);

      expect(mockAddToast).toHaveBeenCalledWith('warning', {
        message: '「テスト病院」を削除しますか？ この病院には所属している先生や通院記録がある可能性があります。',
        duration: 7000,
        action: undefined,
      });
    });

    it('先生の削除警告を表示する（関連データあり）', () => {
      showDeleteWarning('doctor', 'テスト先生', true);

      expect(mockAddToast).toHaveBeenCalledWith('warning', {
        message: '「テスト先生」を削除しますか？ この先生には通院記録がある可能性があります。',
        duration: 7000,
        action: undefined,
      });
    });
  });

  describe('getLoadingMessage', () => {
    const { getLoadingMessage } = useVeterinaryMasterError();

    it('病院作成のローディングメッセージを取得する', () => {
      const message = getLoadingMessage('hospital', 'create');
      expect(message).toBe('病院を登録しています...');
    });

    it('先生検索のローディングメッセージを取得する', () => {
      const message = getLoadingMessage('doctor', 'search');
      expect(message).toBe('先生を検索しています...');
    });

    it('不明な操作の場合、デフォルトメッセージを取得する', () => {
      const message = getLoadingMessage('hospital', 'unknown_operation');
      expect(message).toBe('処理中...');
    });
  });

  describe('formatValidationErrors', () => {
    const { formatValidationErrors } = useVeterinaryMasterError();

    it('バリデーションエラー配列を正しく整形する', () => {
      const errors = [
        { message: '病院名は必須です', path: 'name' },
        { message: '電話番号の形式が正しくありません', path: 'phone' },
      ];

      const result = formatValidationErrors(errors);
      expect(result).toBe('病院名は必須です');
    });

    it('空配列の場合、デフォルトメッセージを返す', () => {
      const result = formatValidationErrors([]);
      expect(result).toBe(VETERINARY_ERROR_MESSAGES.VALIDATION.INVALID_FORMAT);
    });

    it('配列でない場合、デフォルトメッセージを返す', () => {
      const result = formatValidationErrors('not an array' as unknown);
      expect(result).toBe(VETERINARY_ERROR_MESSAGES.VALIDATION.INVALID_FORMAT);
    });

    it('メッセージがないエラーの場合、デフォルトメッセージを返す', () => {
      const errors = [{ path: 'name' }]; // messageがない

      const result = formatValidationErrors(errors);
      expect(result).toBe(VETERINARY_ERROR_MESSAGES.VALIDATION.INVALID_FORMAT);
    });
  });

  describe('useToastが利用できない環境', () => {
    it('useToastがエラーを投げる場合でも正常に動作する', async () => {
      // useToastをモックしてエラーを投げるようにする
      vi.doMock('~/composables/useToast', () => ({
        useToast: vi.fn(() => {
          throw new Error('useToast is not available');
        }),
      }));

      // コンソール警告をモック
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Composableを再インポート
      const { useVeterinaryMasterError: useVeterinaryMasterErrorNoToast } = await import('~/composables/useVeterinaryMasterError');
      const { handleError, showSuccess } = useVeterinaryMasterErrorNoToast();

      // エラーハンドリングが正常に動作することを確認
      const error = new VeterinaryMasterError('テストエラー', 'TEST_ERROR');
      const result = handleError(error, 'hospital', 'create');

      expect(result.hasError).toBe(true);
      expect(result.message).toBe('テストエラー');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useToast is not available, toast notifications will be disabled',
      );

      // 成功メッセージも正常に動作することを確認（エラーを投げない）
      expect(() => showSuccess('hospital', 'create')).not.toThrow();

      consoleWarnSpy.mockRestore();
    });
  });
});
