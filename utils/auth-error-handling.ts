/**
 * 認証エラーの分類と処理のためのユーティリティ
 */

export interface AuthError {
  type: 'network' | 'authentication' | 'server' | 'validation' | 'timeout' | 'unknown';
  statusCode?: number;
  message: string;
  originalError?: unknown;
  timestamp?: Date;
  category?: string; // エラーカテゴリ（詳細分類）
  severity?: 'low' | 'medium' | 'high' | 'critical'; // エラーの重要度
  troubleshooting?: readonly string[]; // トラブルシューティング手順
  context?: Record<string, unknown>; // エラー発生時のコンテキスト情報
}

/**
 * エラーカテゴリの詳細定義
 */
const ERROR_CATEGORIES = {
  // ネットワークエラー
  NETWORK_UNREACHABLE: {
    category: 'ネットワーク到達不可',
    severity: 'high' as const,
    troubleshooting: [
      'インターネット接続を確認してください',
      'VPNやプロキシ設定を確認してください',
      'ファイアウォール設定を確認してください',
      'サーバーのステータスを確認してください',
    ],
  },
  NETWORK_TIMEOUT: {
    category: 'ネットワークタイムアウト',
    severity: 'medium' as const,
    troubleshooting: [
      'しばらく時間をおいて再試行してください',
      'ネットワーク速度を確認してください',
      'サーバーの負荷状況を確認してください',
    ],
  },
  NETWORK_DNS: {
    category: 'DNS解決エラー',
    severity: 'high' as const,
    troubleshooting: [
      'DNS設定を確認してください',
      'ホスト名が正しいか確認してください',
      'ネットワーク管理者に連絡してください',
    ],
  },

  // 認証エラー
  AUTH_INVALID_CREDENTIALS: {
    category: '認証情報無効',
    severity: 'medium' as const,
    troubleshooting: [
      'メールアドレスとパスワードを確認してください',
      'パスワードをリセットしてください',
      'アカウントがロックされていないか確認してください',
    ],
  },
  AUTH_TOKEN_EXPIRED: {
    category: 'トークン期限切れ',
    severity: 'low' as const,
    troubleshooting: [
      '自動的にトークンを更新します',
      '再ログインが必要な場合があります',
    ],
  },
  AUTH_INSUFFICIENT_PERMISSIONS: {
    category: 'アクセス権限不足',
    severity: 'medium' as const,
    troubleshooting: [
      'アカウントの権限を確認してください',
      '管理者に権限の付与を依頼してください',
    ],
  },

  // サーバーエラー
  SERVER_INTERNAL_ERROR: {
    category: 'サーバー内部エラー',
    severity: 'high' as const,
    troubleshooting: [
      'しばらく時間をおいて再試行してください',
      'サーバーログを確認してください',
      'システム管理者に連絡してください',
    ],
  },
  SERVER_MAINTENANCE: {
    category: 'サーバーメンテナンス',
    severity: 'medium' as const,
    troubleshooting: [
      'メンテナンス完了まで待機してください',
      'メンテナンス情報を確認してください',
    ],
  },
  SERVER_OVERLOAD: {
    category: 'サーバー過負荷',
    severity: 'medium' as const,
    troubleshooting: [
      'しばらく時間をおいて再試行してください',
      'アクセス集中時間を避けてください',
    ],
  },

  // バリデーションエラー
  VALIDATION_INVALID_FORMAT: {
    category: '入力形式エラー',
    severity: 'low' as const,
    troubleshooting: [
      '入力形式を確認してください',
      '必須項目が入力されているか確認してください',
    ],
  },

  // その他
  UNKNOWN_ERROR: {
    category: '不明なエラー',
    severity: 'medium' as const,
    troubleshooting: [
      'ページを再読み込みしてください',
      'ブラウザのキャッシュをクリアしてください',
      'サポートに連絡してください',
    ],
  },
} as const;

/**
 * 認証エラーをログに記録する（強化版）
 */
export function logAuthError(authError: AuthError, context?: string, additionalData?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();

    // 基本ログ情報
    const logData = {
      timestamp,
      context: context || 'Unknown context',
      errorType: authError.type,
      errorCategory: authError.category || 'Unknown',
      severity: authError.severity || 'medium',
      statusCode: authError.statusCode,
      message: authError.message,
      troubleshooting: authError.troubleshooting || [],
      ...authError.context,
      ...additionalData,
    };

    // 構造化ログ出力
    console.group(`🚨 [認証エラー] ${context || ''} - ${authError.severity?.toUpperCase()}`);
    console.error('エラー詳細:', logData);

    if (authError.originalError) {
      console.error('元のエラー:', authError.originalError);

      // スタックトレースがある場合は出力
      if (authError.originalError instanceof Error && authError.originalError.stack) {
        console.error('スタックトレース:', authError.originalError.stack);
      }
    }

    // トラブルシューティング情報
    if (authError.troubleshooting && authError.troubleshooting.length > 0) {
      console.info('💡 トラブルシューティング手順:');
      authError.troubleshooting.forEach((step, index) => {
        console.info(`  ${index + 1}. ${step}`);
      });
    }

    // 重要度に応じた追加情報
    if (authError.severity === 'critical' || authError.severity === 'high') {
      console.warn('⚠️ このエラーは重要度が高いため、すぐに対処が必要です');
    }

    console.groupEnd();

    // デバッグ用の詳細ログも記録
    try {
      const { logAuthError: debugLogAuthError } = useAuthDebug();
      debugLogAuthError(authError.originalError, context || 'auth-error-handling', {
        authErrorType: authError.type,
        authErrorCategory: authError.category,
        severity: authError.severity,
        statusCode: authError.statusCode,
        troubleshootingSteps: authError.troubleshooting?.length || 0,
        ...additionalData,
      });
    }
    catch {
      // デバッグログでエラーが発生しても処理を継続
    }
  }
}

/**
 * エラーを分類して適切なAuthErrorオブジェクトを返す（強化版）
 */
export function classifyAuthError(error: unknown): AuthError {
  // エラーオブジェクトの型チェック
  const errorObj = error as {
    statusCode?: number;
    response?: { status?: number; statusText?: string };
    message?: string;
    statusMessage?: string;
    cause?: { code?: string; errno?: number };
    name?: string;
    data?: { message?: string; code?: string };
  };

  const statusCode = errorObj?.statusCode || errorObj?.response?.status;
  const message = errorObj?.statusMessage || errorObj?.message || errorObj?.data?.message || 'Unknown error';
  const causeCode = errorObj?.cause?.code;
  const timestamp = new Date();

  // ネットワークエラーの詳細分類
  if (causeCode === 'ENOTFOUND' || message.includes('ENOTFOUND')) {
    const errorInfo = ERROR_CATEGORIES.NETWORK_DNS;
    return {
      type: 'network',
      statusCode,
      message: 'DNS解決に失敗しました',
      originalError: error,
      timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      troubleshooting: errorInfo.troubleshooting,
      context: { causeCode, networkErrorType: 'DNS' },
    };
  }

  if (causeCode === 'ECONNREFUSED' || message.includes('ECONNREFUSED')) {
    const errorInfo = ERROR_CATEGORIES.NETWORK_UNREACHABLE;
    return {
      type: 'network',
      statusCode,
      message: 'サーバーへの接続が拒否されました',
      originalError: error,
      timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      troubleshooting: errorInfo.troubleshooting,
      context: { causeCode, networkErrorType: 'CONNECTION_REFUSED' },
    };
  }

  if (causeCode === 'ETIMEDOUT' || message.includes('timeout') || message.includes('ETIMEDOUT')) {
    const errorInfo = ERROR_CATEGORIES.NETWORK_TIMEOUT;
    return {
      type: 'timeout',
      statusCode,
      message: 'リクエストがタイムアウトしました',
      originalError: error,
      timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      troubleshooting: errorInfo.troubleshooting,
      context: { causeCode, networkErrorType: 'TIMEOUT' },
    };
  }

  if (message.includes('fetch') || message.includes('network') || (!statusCode && !causeCode)) {
    const errorInfo = ERROR_CATEGORIES.NETWORK_UNREACHABLE;
    return {
      type: 'network',
      statusCode,
      message: 'ネットワークエラーが発生しました',
      originalError: error,
      timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      troubleshooting: errorInfo.troubleshooting,
      context: { networkErrorType: 'GENERAL' },
    };
  }

  // 認証エラーの詳細分類
  if (statusCode === 401) {
    // トークン期限切れかどうかを判定
    if (message.includes('expired') || message.includes('期限')) {
      const errorInfo = ERROR_CATEGORIES.AUTH_TOKEN_EXPIRED;
      return {
        type: 'authentication',
        statusCode,
        message: '認証トークンの期限が切れています',
        originalError: error,
        timestamp,
        category: errorInfo.category,
        severity: errorInfo.severity,
        troubleshooting: errorInfo.troubleshooting,
        context: { authErrorType: 'TOKEN_EXPIRED' },
      };
    }

    // 認証情報無効
    const errorInfo = ERROR_CATEGORIES.AUTH_INVALID_CREDENTIALS;
    return {
      type: 'authentication',
      statusCode,
      message: '認証情報が無効です',
      originalError: error,
      timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      troubleshooting: errorInfo.troubleshooting,
      context: { authErrorType: 'INVALID_CREDENTIALS' },
    };
  }

  if (statusCode === 403) {
    const errorInfo = ERROR_CATEGORIES.AUTH_INSUFFICIENT_PERMISSIONS;
    return {
      type: 'authentication',
      statusCode,
      message: 'アクセス権限がありません',
      originalError: error,
      timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      troubleshooting: errorInfo.troubleshooting,
      context: { authErrorType: 'INSUFFICIENT_PERMISSIONS' },
    };
  }

  // サーバーエラーの詳細分類
  if (statusCode && statusCode >= 500) {
    if (statusCode === 503) {
      const errorInfo = ERROR_CATEGORIES.SERVER_MAINTENANCE;
      return {
        type: 'server',
        statusCode,
        message: 'サーバーがメンテナンス中です',
        originalError: error,
        timestamp,
        category: errorInfo.category,
        severity: errorInfo.severity,
        troubleshooting: errorInfo.troubleshooting,
        context: { serverErrorType: 'MAINTENANCE' },
      };
    }

    if (statusCode === 502 || statusCode === 504) {
      const errorInfo = ERROR_CATEGORIES.SERVER_OVERLOAD;
      return {
        type: 'server',
        statusCode,
        message: 'サーバーが過負荷状態です',
        originalError: error,
        timestamp,
        category: errorInfo.category,
        severity: errorInfo.severity,
        troubleshooting: errorInfo.troubleshooting,
        context: { serverErrorType: 'OVERLOAD' },
      };
    }

    const errorInfo = ERROR_CATEGORIES.SERVER_INTERNAL_ERROR;
    return {
      type: 'server',
      statusCode,
      message: 'サーバー内部エラーが発生しました',
      originalError: error,
      timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      troubleshooting: errorInfo.troubleshooting,
      context: { serverErrorType: 'INTERNAL' },
    };
  }

  // バリデーションエラーの判定
  if (statusCode === 400 || statusCode === 422) {
    const errorInfo = ERROR_CATEGORIES.VALIDATION_INVALID_FORMAT;
    return {
      type: 'validation',
      statusCode,
      message: '入力データが無効です',
      originalError: error,
      timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      troubleshooting: errorInfo.troubleshooting,
      context: { validationErrorType: 'INVALID_FORMAT' },
    };
  }

  // その他のエラー
  const errorInfo = ERROR_CATEGORIES.UNKNOWN_ERROR;
  return {
    type: 'unknown',
    statusCode,
    message: message || '予期しないエラーが発生しました',
    originalError: error,
    timestamp,
    category: errorInfo.category,
    severity: errorInfo.severity,
    troubleshooting: errorInfo.troubleshooting,
    context: {
      errorName: errorObj?.name,
      hasStatusCode: !!statusCode,
      hasCauseCode: !!causeCode,
    },
  };
}

/**
 * エラータイプに応じた処理を決定する
 */
export interface ErrorHandlingStrategy {
  shouldRetry: boolean;
  shouldClearTokens: boolean;
  shouldLogout: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

export function getErrorHandlingStrategy(authError: AuthError): ErrorHandlingStrategy {
  switch (authError.type) {
    case 'network':
      // ネットワークエラーは重要度に応じてリトライ戦略を調整
      return {
        shouldRetry: true,
        shouldClearTokens: false,
        shouldLogout: false,
        retryDelay: authError.severity === 'high' ? 2000 : 1000,
        maxRetries: authError.severity === 'high' ? 2 : 3,
      };

    case 'timeout':
      // タイムアウトエラーは少し長めの間隔でリトライ
      return {
        shouldRetry: true,
        shouldClearTokens: false,
        shouldLogout: false,
        retryDelay: 3000,
        maxRetries: 2,
      };

    case 'authentication':
      // 認証エラーはトークン期限切れかどうかで処理を分ける
      if (authError.context?.authErrorType === 'TOKEN_EXPIRED') {
        return {
          shouldRetry: false,
          shouldClearTokens: false, // リフレッシュトークンで復旧を試行
          shouldLogout: false,
        };
      }

      return {
        shouldRetry: false,
        shouldClearTokens: true,
        shouldLogout: true,
      };

    case 'server':
      // サーバーエラーは種類に応じてリトライ戦略を調整
      const isMaintenanceOrOverload
        = authError.context?.serverErrorType === 'MAINTENANCE'
          || authError.context?.serverErrorType === 'OVERLOAD';

      return {
        shouldRetry: true,
        shouldClearTokens: false,
        shouldLogout: false,
        retryDelay: isMaintenanceOrOverload ? 5000 : 2000,
        maxRetries: isMaintenanceOrOverload ? 1 : 2,
      };

    case 'validation':
      // バリデーションエラーはリトライしない
      return {
        shouldRetry: false,
        shouldClearTokens: false,
        shouldLogout: false,
      };

    case 'unknown':
    default:
      // 不明なエラーは慎重に処理
      return {
        shouldRetry: authError.severity === 'low',
        shouldClearTokens: false,
        shouldLogout: false,
        retryDelay: 2000,
        maxRetries: 1,
      };
  }
}

/**
 * リトライ機能付きのfetch関数（強化版）
 */
export async function retryableFetch<T>(
  url: string,
  options: Parameters<typeof $fetch>[1] = {},
  maxRetries = 3,
  retryDelay = 1000,
): Promise<T> {
  let lastError: unknown;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStartTime = Date.now();

    try {
      // デバッグログ: リクエスト開始
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FETCH] ${attempt > 0 ? `リトライ ${attempt}回目` : '初回'} - ${url}`);
      }

      const result = await $fetch<T>(url, options);

      // デバッグログ: リクエスト成功
      if (process.env.NODE_ENV === 'development') {
        const duration = Date.now() - attemptStartTime;
        const totalDuration = Date.now() - startTime;
        console.log(`[FETCH SUCCESS] ${url} - ${duration}ms (総時間: ${totalDuration}ms, 試行回数: ${attempt + 1})`);
      }

      return result as T;
    }
    catch (error) {
      lastError = error;
      const authError = classifyAuthError(error);
      const strategy = getErrorHandlingStrategy(authError);
      const attemptDuration = Date.now() - attemptStartTime;

      // エラーログを記録
      logAuthError(authError, `リクエスト失敗 (${url})`, {
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        attemptDuration,
        url,
        method: options?.method || 'GET',
      });

      // リトライしない場合はエラーを再スロー
      if (!strategy.shouldRetry || attempt === maxRetries) {
        // 最終的な失敗ログ
        if (process.env.NODE_ENV === 'development') {
          const totalDuration = Date.now() - startTime;
          console.error(`[FETCH FAILED] ${url} - 全ての試行が失敗 (総時間: ${totalDuration}ms, 試行回数: ${attempt + 1})`);
        }
        throw error;
      }

      // リトライ可能なエラーの場合
      if (authError.type === 'network' || authError.type === 'server' || authError.type === 'timeout') {
        const delayTime = strategy.retryDelay || retryDelay;

        if (process.env.NODE_ENV === 'development') {
          console.warn(`[FETCH RETRY] ${url} - ${delayTime}ms後にリトライします (エラー: ${authError.category})`);
        }

        // 指定された遅延時間待機
        await new Promise(resolve => setTimeout(resolve, delayTime));
        continue;
      }

      // 認証エラーやバリデーションエラーの場合はリトライしない
      throw error;
    }
  }

  throw lastError;
}

/**
 * エラー統計情報を取得する
 */
export function getErrorStatistics() {
  if (process.env.NODE_ENV !== 'development') return null;

  try {
    const { getAuthSessionStats } = useAuthDebug();
    const sessionStats = getAuthSessionStats();

    if (!sessionStats) return null;

    // セッションログからエラーログを抽出
    const allLogs = (sessionStats as any).allLogs || [];
    const errorLogs = allLogs.filter((log: any) => log.step === 'ERROR');

    const errorsByType = errorLogs.reduce((acc: Record<string, number>, log: any) => {
      const errorType = log.data?.errorType || 'unknown';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByCategory = errorLogs.reduce((acc: Record<string, number>, log: any) => {
      const category = log.data?.authErrorCategory || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: errorLogs.length,
      errorsByType,
      errorsByCategory,
      recentErrors: errorLogs.slice(-5),
      mostCommonError: Object.entries(errorsByType).sort(([,a], [,b]) => (b as number) - (a as number))[0],
    };
  }
  catch {
    return null;
  }
}

/**
 * エラー統計をコンソールに出力する
 */
export function printErrorStatistics() {
  if (process.env.NODE_ENV !== 'development') return;

  const stats = getErrorStatistics();
  if (!stats) {
    console.log('[ERROR STATS] エラー統計情報がありません');
    return;
  }

  console.group('📊 認証エラー統計');
  console.log(`総エラー数: ${stats.totalErrors}`);

  if (stats.mostCommonError) {
    console.log(`最も多いエラー: ${stats.mostCommonError[0]} (${stats.mostCommonError[1]}回)`);
  }

  console.log('エラータイプ別:', stats.errorsByType);
  console.log('エラーカテゴリ別:', stats.errorsByCategory);

  if (stats.recentErrors.length > 0) {
    console.log('最近のエラー:', stats.recentErrors.map((error: any) => ({
      timestamp: error.timestamp,
      type: error.data?.errorType,
      message: error.data?.errorMessage,
    })));
  }
}
