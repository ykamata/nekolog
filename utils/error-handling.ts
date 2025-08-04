/**
 * エラーハンドリング用のユーティリティ関数
 * 要件7.3, 7.4対応
 */

export interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cleanedData?: unknown;
}

export interface AnomalyDetectionResult {
  hasAnomalies: boolean;
  anomalies: Array<{
    index: number;
    value: number;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  cleanedData: number[];
  statistics: {
    originalCount: number;
    cleanedCount: number;
    removedCount: number;
    mean: number;
    median: number;
    standardDeviation: number;
  };
}

/**
 * エラー情報を作成する
 */
export function createErrorInfo(
  code: string,
  message: string,
  userMessage: string,
  severity: 'low' | 'medium' | 'high' = 'medium',
  context?: Record<string, unknown>,
): ErrorInfo {
  return {
    code,
    message,
    userMessage,
    severity,
    timestamp: new Date(),
    context,
  };
}

/**
 * APIエラーを解析してユーザーフレンドリーなメッセージに変換
 */
export function parseApiError(error: unknown): ErrorInfo {
  if (error instanceof Error) {
    // ネットワークエラー
    if (error.message.includes('fetch')) {
      return createErrorInfo(
        'NETWORK_ERROR',
        error.message,
        'ネットワークに接続できません。インターネット接続を確認してください。',
        'high',
        { originalError: error.message },
      );
    }

    // タイムアウトエラー
    if (error.message.includes('timeout')) {
      return createErrorInfo(
        'TIMEOUT_ERROR',
        error.message,
        'サーバーからの応答がありません。しばらく待ってから再試行してください。',
        'medium',
        { originalError: error.message },
      );
    }

    // 認証エラー
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return createErrorInfo(
        'AUTH_ERROR',
        error.message,
        'ログインが必要です。再度ログインしてください。',
        'high',
        { originalError: error.message },
      );
    }

    // サーバーエラー
    if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
      return createErrorInfo(
        'SERVER_ERROR',
        error.message,
        'サーバーでエラーが発生しました。しばらく待ってから再試行してください。',
        'high',
        { originalError: error.message },
      );
    }

    // データ不正エラー
    if (error.message.includes('400') || error.message.includes('Bad Request')) {
      return createErrorInfo(
        'DATA_ERROR',
        error.message,
        'データに問題があります。入力内容を確認してください。',
        'medium',
        { originalError: error.message },
      );
    }

    // その他のエラー
    return createErrorInfo(
      'UNKNOWN_ERROR',
      error.message,
      '予期しないエラーが発生しました。',
      'medium',
      { originalError: error.message },
    );
  }

  // 文字列エラー
  if (typeof error === 'string') {
    return createErrorInfo(
      'STRING_ERROR',
      error,
      error,
      'medium',
    );
  }

  // その他の型のエラー
  return createErrorInfo(
    'UNKNOWN_ERROR',
    'Unknown error occurred',
    '予期しないエラーが発生しました。',
    'medium',
    { error },
  );
}

/**
 * カロリーデータの異常値を検出・除外する
 */
export function detectCalorieAnomalies(data: number[]): AnomalyDetectionResult {
  if (data.length === 0) {
    return {
      hasAnomalies: false,
      anomalies: [],
      cleanedData: [],
      statistics: {
        originalCount: 0,
        cleanedCount: 0,
        removedCount: 0,
        mean: 0,
        median: 0,
        standardDeviation: 0,
      },
    };
  }

  const anomalies: AnomalyDetectionResult['anomalies'] = [];
  const validData: number[] = [];

  // 基本的な統計値を計算
  const sortedData = [...data].sort((a, b) => a - b);
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const median = sortedData.length % 2 === 0
    ? (sortedData[sortedData.length / 2 - 1]! + sortedData[sortedData.length / 2]!) / 2
    : sortedData[Math.floor(sortedData.length / 2)]!;

  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const standardDeviation = Math.sqrt(variance);

  // 異常値検出の閾値設定
  const lowerBound = Math.max(0, mean - 3 * standardDeviation); // 負の値は除外
  const upperBound = mean + 3 * standardDeviation;
  const extremeUpperBound = 10000; // 1日10000kcal以上は明らかに異常

  // 各データポイントを検証
  data.forEach((value, index) => {
    let isAnomaly = false;
    let reason = '';
    let severity: 'low' | 'medium' | 'high' = 'low';

    // 負の値チェック
    if (value < 0) {
      isAnomaly = true;
      reason = '負のカロリー値';
      severity = 'high';
    }
    // 極端に大きい値チェック
    else if (value > extremeUpperBound) {
      isAnomaly = true;
      reason = `異常に大きいカロリー値 (${value}kcal)`;
      severity = 'high';
    }
    // 統計的異常値チェック（3σ法）
    else if (value < lowerBound || value > upperBound) {
      isAnomaly = true;
      reason = `統計的異常値 (平均±3σの範囲外: ${value}kcal)`;
      severity = 'medium';
    }
    // 極端に小さい値チェック（猫の場合、1日5kcal未満は異常）
    else if (value > 0 && value < 5) {
      isAnomaly = true;
      reason = `異常に小さいカロリー値 (${value}kcal)`;
      severity = 'medium';
    }

    if (isAnomaly) {
      anomalies.push({
        index,
        value,
        reason,
        severity,
      });
    }
    else {
      validData.push(value);
    }
  });

  // クリーンアップされたデータの統計値を再計算
  const cleanedSortedData = [...validData].sort((a, b) => a - b);
  const cleanedMean = validData.length > 0
    ? validData.reduce((sum, val) => sum + val, 0) / validData.length
    : 0;
  const cleanedMedian = cleanedSortedData.length === 0
    ? 0
    : cleanedSortedData.length % 2 === 0
      ? (cleanedSortedData[cleanedSortedData.length / 2 - 1]! + cleanedSortedData[cleanedSortedData.length / 2]!) / 2
      : cleanedSortedData[Math.floor(cleanedSortedData.length / 2)]!;

  const cleanedVariance = validData.length > 0
    ? validData.reduce((sum, val) => sum + Math.pow(val - cleanedMean, 2), 0) / validData.length
    : 0;
  const cleanedStandardDeviation = Math.sqrt(cleanedVariance);

  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
    cleanedData: validData,
    statistics: {
      originalCount: data.length,
      cleanedCount: validData.length,
      removedCount: anomalies.length,
      mean: cleanedMean,
      median: cleanedMedian,
      standardDeviation: cleanedStandardDeviation,
    },
  };
}

/**
 * 日付データの妥当性を検証
 */
export function validateDateData(dates: string[]): DataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cleanedDates: string[] = [];

  dates.forEach((date, index) => {
    // 日付形式の検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      errors.push(`インデックス ${index}: 無効な日付形式 "${date}"`);
      return;
    }

    // 日付の妥当性検証
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      errors.push(`インデックス ${index}: 無効な日付 "${date}"`);
      return;
    }

    // 未来の日付チェック
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 今日の終わりまで許可
    if (dateObj > today) {
      warnings.push(`インデックス ${index}: 未来の日付 "${date}"`);
    }

    // 過去すぎる日付チェック（10年前より古い）
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (dateObj < tenYearsAgo) {
      warnings.push(`インデックス ${index}: 古すぎる日付 "${date}"`);
    }

    cleanedDates.push(date);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cleanedData: cleanedDates,
  };
}

/**
 * エラーログを記録する（開発環境のみ）
 */
export function logError(errorInfo: ErrorInfo): void {
  if (import.meta.dev) {
    console.group(`🚨 Error [${errorInfo.severity.toUpperCase()}]: ${errorInfo.code}`);
    console.error('Message:', errorInfo.message);
    console.error('User Message:', errorInfo.userMessage);
    console.error('Timestamp:', errorInfo.timestamp.toISOString());
    if (errorInfo.context) {
      console.error('Context:', errorInfo.context);
    }
    console.groupEnd();
  }

  // 本番環境では外部ログサービスに送信することも可能
  // if (import.meta.prod) {
  //   // Send to external logging service
  // }
}

/**
 * リトライ機能付きのデータ取得
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    }
    catch (error) {
      lastError = error;
      const errorInfo = parseApiError(error);

      logError({
        ...errorInfo,
        code: `RETRY_ATTEMPT_${attempt}`,
        context: {
          ...errorInfo.context,
          attempt,
          maxRetries,
        },
      });

      // 最後の試行でない場合は待機
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  // すべての試行が失敗した場合
  const finalError = parseApiError(lastError);
  logError({
    ...finalError,
    code: 'RETRY_FAILED',
    userMessage: `${finalError.userMessage} (${maxRetries}回試行しました)`,
    severity: 'high',
    context: {
      ...finalError.context,
      maxRetries,
      finalAttempt: true,
    },
  });

  throw lastError;
}

/**
 * データ品質レポートを生成
 */
export function generateDataQualityReport(data: {
  dates: string[];
  calories: number[];
}): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    score: number; // 0-100
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      count?: number;
    }>;
    recommendations: string[];
  } {
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    count?: number;
  }> = [];
  const recommendations: string[] = [];

  // 日付データの検証
  const dateValidation = validateDateData(data.dates);
  if (!dateValidation.isValid) {
    issues.push({
      type: 'error',
      message: '無効な日付データが含まれています',
      count: dateValidation.errors.length,
    });
    recommendations.push('日付データの形式を確認してください');
  }

  if (dateValidation.warnings.length > 0) {
    issues.push({
      type: 'warning',
      message: '注意が必要な日付データがあります',
      count: dateValidation.warnings.length,
    });
  }

  // カロリーデータの異常値検出
  const anomalyDetection = detectCalorieAnomalies(data.calories);
  if (anomalyDetection.hasAnomalies) {
    const highSeverityAnomalies = anomalyDetection.anomalies.filter(a => a.severity === 'high');
    const mediumSeverityAnomalies = anomalyDetection.anomalies.filter(a => a.severity === 'medium');

    if (highSeverityAnomalies.length > 0) {
      issues.push({
        type: 'error',
        message: '重大な異常値が検出されました',
        count: highSeverityAnomalies.length,
      });
      recommendations.push('異常に大きいまたは小さいカロリー値を確認してください');
    }

    if (mediumSeverityAnomalies.length > 0) {
      issues.push({
        type: 'warning',
        message: '統計的異常値が検出されました',
        count: mediumSeverityAnomalies.length,
      });
      recommendations.push('平均から大きく外れたデータを確認してください');
    }
  }

  // データ完全性の確認
  const dataCompleteness = data.dates.length > 0 ? (data.calories.length / data.dates.length) * 100 : 0;
  if (dataCompleteness < 80) {
    issues.push({
      type: 'warning',
      message: 'データの欠損が多く見られます',
    });
    recommendations.push('定期的なデータ記録を心がけてください');
  }

  // スコア計算
  let score = 100;
  issues.forEach((issue) => {
    if (issue.type === 'error') {
      score -= 20;
    }
    else if (issue.type === 'warning') {
      score -= 10;
    }
  });
  score = Math.max(0, score);

  // 総合評価
  let overall: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 90) {
    overall = 'excellent';
  }
  else if (score >= 70) {
    overall = 'good';
  }
  else if (score >= 50) {
    overall = 'fair';
  }
  else {
    overall = 'poor';
  }

  // 推奨事項の追加
  if (issues.length === 0) {
    recommendations.push('データ品質は良好です。現在の記録方法を継続してください。');
  }

  return {
    overall,
    score,
    issues,
    recommendations,
  };
}

// 後方互換性のための関数（既存コードで使用されている）
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  data?: any;
  validationErrors?: ValidationError[];
}

/**
 * ErrorInfoをApiErrorに変換する
 */
export function errorInfoToApiError(errorInfo: ErrorInfo): ApiError {
  return {
    message: errorInfo.message,
    statusCode: errorInfo.code === 'AUTH_ERROR'
      ? 401
      : errorInfo.code === 'NETWORK_ERROR'
        ? 500
        : errorInfo.code === 'TIMEOUT_ERROR'
          ? 408
          : errorInfo.code === 'DATA_ERROR' ? 400 : 500,
    data: errorInfo.context,
  };
}

/**
 * 後方互換性のためのAPIエラー解析関数
 */
export function getUserFriendlyErrorMessage(error: ApiError, context?: string): string {
  const contextPrefix = context ? `${context}: ` : '';

  switch (error.statusCode) {
    case 400:
      return `${contextPrefix}入力データに問題があります。${error.message}`;
    case 401:
      return `${contextPrefix}認証が必要です。ログインしてください。`;
    case 403:
      return `${contextPrefix}この操作を実行する権限がありません。`;
    case 404:
      return `${contextPrefix}指定されたデータが見つかりません。`;
    case 409:
      return `${contextPrefix}データの競合が発生しました。${error.message}`;
    case 422:
      return `${contextPrefix}入力データを確認してください。${error.message}`;
    case 429:
      return `${contextPrefix}リクエストが多すぎます。しばらく待ってから再試行してください。`;
    case 500:
      return `${contextPrefix}サーバーエラーが発生しました。しばらく待ってから再試行してください。`;
    case 503:
      return `${contextPrefix}サービスが一時的に利用できません。しばらく待ってから再試行してください。`;
    default:
      return `${contextPrefix}${error.message}`;
  }
}

/**
 * エラーがリトライ可能かチェック
 */
export function isRetryableError(error: ApiError): boolean {
  return error.statusCode >= 500 || error.statusCode === 429;
}

/**
 * バリデーションエラーのフォーマット
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * デバウンス付きバリデーター作成
 */
export function createDebouncedValidator<T>(
  validator: (data: T) => Promise<void> | void,
  delay: number = 300,
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (data: T): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        try {
          await validator(data);
          resolve();
        }
        catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * エラーハンドラー作成
 */
export function createErrorHandler(context: string) {
  return {
    handleError: (error: unknown, fallbackMessage?: string) => {
      const errorInfo = parseApiError(error);

      // ErrorInfoをApiErrorに変換
      const apiError: ApiError = {
        message: errorInfo.message,
        statusCode: errorInfo.code === 'AUTH_ERROR'
          ? 401
          : errorInfo.code === 'NETWORK_ERROR'
            ? 500
            : errorInfo.code === 'TIMEOUT_ERROR'
              ? 408
              : errorInfo.code === 'DATA_ERROR' ? 400 : 500,
        data: errorInfo.context,
      };

      const message = getUserFriendlyErrorMessage(apiError, context);

      console.error(`[${context}] Error:`, error);

      return {
        error: apiError,
        message: fallbackMessage || message,
        isRetryable: isRetryableError(apiError),
        isNetworkError: errorInfo.code === 'NETWORK_ERROR',
      };
    },
  };
}

/**
 * 指数バックオフ付きリトライ
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    }
    catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      const errorInfo = parseApiError(error);
      const apiError: ApiError = {
        message: errorInfo.message,
        statusCode: errorInfo.code === 'AUTH_ERROR' ? 401 : 500,
      };

      if (!isRetryableError(apiError)) {
        break;
      }

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay,
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
