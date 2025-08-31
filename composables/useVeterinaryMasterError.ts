import type { FetchError } from 'ofetch';
import {
  VeterinaryMasterError,
  VETERINARY_ERROR_MESSAGES,
  type LoadingState,
  type ErrorState,
  type UserFeedback,
} from '~/lib/validations/veterinary-master';

/**
 * 獣医マスタ管理専用のエラーハンドリングコンポーザブル
 */
export const useVeterinaryMasterError = () => {
  // Toast機能を安全に取得（テスト環境では利用できない場合がある）
  let addToast: ((type: string, options: any) => void) | null = null;
  try {
    const toast = useToast();
    addToast = toast.addToast;
  }
  catch (error) {
    // テスト環境などでuseToastが利用できない場合
    console.warn('useToast is not available, toast notifications will be disabled');
    addToast = () => {}; // no-op function
  }

  /**
   * エラーを解析してユーザーフレンドリーなメッセージを生成
   */
  const parseError = (error: unknown, context: 'hospital' | 'doctor', operation: string): ErrorState => {
    const timestamp = new Date();

    // VeterinaryMasterError の場合
    if (error instanceof VeterinaryMasterError) {
      return {
        hasError: true,
        message: error.message,
        code: error.code,
        details: error.details,
        timestamp,
      };
    }

    // FetchError (API エラー) の場合
    if (error && typeof error === 'object' && 'data' in error) {
      const fetchError = error as FetchError;

      // バリデーションエラーの場合
      if (fetchError.status === 400 && fetchError.data?.validationErrors) {
        const validationErrors = fetchError.data.validationErrors;
        const firstError = Array.isArray(validationErrors) ? validationErrors[0] : validationErrors;

        return {
          hasError: true,
          message: firstError?.message || VETERINARY_ERROR_MESSAGES.VALIDATION.INVALID_FORMAT,
          code: 'VALIDATION_ERROR',
          details: { validationErrors },
          timestamp,
        };
      }

      // 重複エラーの場合
      if (fetchError.status === 409) {
        const message = context === 'hospital'
          ? VETERINARY_ERROR_MESSAGES.HOSPITAL.DUPLICATE_NAME
          : VETERINARY_ERROR_MESSAGES.DOCTOR.DUPLICATE_NAME;

        return {
          hasError: true,
          message: fetchError.data?.message || message,
          code: 'DUPLICATE_NAME',
          timestamp,
        };
      }

      // 404エラーの場合
      if (fetchError.status === 404) {
        const message = context === 'hospital'
          ? VETERINARY_ERROR_MESSAGES.HOSPITAL.NOT_FOUND
          : VETERINARY_ERROR_MESSAGES.DOCTOR.NOT_FOUND;

        return {
          hasError: true,
          message: fetchError.data?.message || message,
          code: 'NOT_FOUND',
          timestamp,
        };
      }

      // その他のHTTPエラー
      if (fetchError.status >= 500) {
        return {
          hasError: true,
          message: VETERINARY_ERROR_MESSAGES.NETWORK.SERVER_ERROR,
          code: 'SERVER_ERROR',
          timestamp,
        };
      }

      // APIから返されたエラーメッセージを使用
      if (fetchError.data?.message) {
        return {
          hasError: true,
          message: fetchError.data.message,
          code: fetchError.data.code || 'API_ERROR',
          timestamp,
        };
      }
    }

    // ネットワークエラーの場合
    if (error && typeof error === 'object' && 'name' in error) {
      const networkError = error as Error;
      if (networkError.name === 'TypeError' || networkError.message.includes('fetch')) {
        return {
          hasError: true,
          message: VETERINARY_ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
          code: 'NETWORK_ERROR',
          timestamp,
        };
      }
    }

    // デフォルトエラーメッセージ
    const defaultMessages = {
      hospital: {
        create: VETERINARY_ERROR_MESSAGES.HOSPITAL.CREATE_FAILED,
        update: VETERINARY_ERROR_MESSAGES.HOSPITAL.UPDATE_FAILED,
        delete: VETERINARY_ERROR_MESSAGES.HOSPITAL.DELETE_FAILED,
        fetch: VETERINARY_ERROR_MESSAGES.HOSPITAL.FETCH_FAILED,
        search: VETERINARY_ERROR_MESSAGES.HOSPITAL.SEARCH_FAILED,
      },
      doctor: {
        create: VETERINARY_ERROR_MESSAGES.DOCTOR.CREATE_FAILED,
        update: VETERINARY_ERROR_MESSAGES.DOCTOR.UPDATE_FAILED,
        delete: VETERINARY_ERROR_MESSAGES.DOCTOR.DELETE_FAILED,
        fetch: VETERINARY_ERROR_MESSAGES.DOCTOR.FETCH_FAILED,
        search: VETERINARY_ERROR_MESSAGES.DOCTOR.SEARCH_FAILED,
      },
    };

    return {
      hasError: true,
      message: defaultMessages[context][operation as keyof typeof defaultMessages[typeof context]]
        || VETERINARY_ERROR_MESSAGES.NETWORK.SERVER_ERROR,
      code: 'UNKNOWN_ERROR',
      timestamp,
    };
  };

  /**
   * エラーを処理してユーザーに通知
   */
  const handleError = (
    error: unknown,
    context: 'hospital' | 'doctor',
    operation: string,
    showNotification = true,
  ): ErrorState => {
    const errorState = parseError(error, context, operation);

    // コンソールにエラーログを出力
    console.error(`Veterinary ${context} ${operation} error:`, {
      error,
      errorState,
      timestamp: errorState.timestamp,
    });

    // ユーザーに通知
    if (showNotification && addToast) {
      addToast('error', {
        message: errorState.message,
        duration: 5000, // エラーは少し長めに表示
      });
    }

    return errorState;
  };

  /**
   * 成功メッセージを表示
   */
  const showSuccess = (context: 'hospital' | 'doctor', operation: string, customMessage?: string): void => {
    const successMessages = {
      hospital: {
        create: '病院を登録しました',
        update: '病院情報を更新しました',
        delete: '病院を削除しました',
        fetch: '病院一覧を取得しました',
      },
      doctor: {
        create: '先生を登録しました',
        update: '先生情報を更新しました',
        delete: '先生を削除しました',
        fetch: '先生一覧を取得しました',
      },
    };

    const message = customMessage
      || successMessages[context][operation as keyof typeof successMessages[typeof context]]
      || '操作が完了しました';

    if (addToast) {
      addToast('success', {
        message,
      });
    }
  };

  /**
   * 警告メッセージを表示
   */
  const showWarning = (message: string, action?: { label: string; handler: () => void }): void => {
    if (addToast) {
      addToast('warning', {
        message,
        duration: 7000, // 警告は長めに表示
        action,
      });
    }
  };

  /**
   * 削除確認のための警告メッセージ
   */
  const showDeleteWarning = (
    context: 'hospital' | 'doctor',
    name: string,
    hasRelatedData: boolean = false,
  ): void => {
    let message = `「${name}」を削除しますか？`;

    if (hasRelatedData) {
      message += context === 'hospital'
        ? ' この病院には所属している先生や通院記録がある可能性があります。'
        : ' この先生には通院記録がある可能性があります。';
    }

    showWarning(message);
  };

  /**
   * ローディング状態のメッセージを生成
   */
  const getLoadingMessage = (context: 'hospital' | 'doctor', operation: string): string => {
    const loadingMessages = {
      hospital: {
        create: '病院を登録しています...',
        update: '病院情報を更新しています...',
        delete: '病院を削除しています...',
        fetch: '病院一覧を取得しています...',
        search: '病院を検索しています...',
      },
      doctor: {
        create: '先生を登録しています...',
        update: '先生情報を更新しています...',
        delete: '先生を削除しています...',
        fetch: '先生一覧を取得しています...',
        search: '先生を検索しています...',
      },
    };

    return loadingMessages[context][operation as keyof typeof loadingMessages[typeof context]]
      || '処理中...';
  };

  /**
   * バリデーションエラーを整形
   */
  const formatValidationErrors = (errors: unknown[]): string => {
    if (!Array.isArray(errors) || errors.length === 0) {
      return VETERINARY_ERROR_MESSAGES.VALIDATION.INVALID_FORMAT;
    }

    // 最初のエラーメッセージを返す（複数ある場合は最も重要なもの）
    const firstError = errors[0];
    return firstError?.message || VETERINARY_ERROR_MESSAGES.VALIDATION.INVALID_FORMAT;
  };

  return {
    parseError,
    handleError,
    showSuccess,
    showWarning,
    showDeleteWarning,
    getLoadingMessage,
    formatValidationErrors,
  };
};
