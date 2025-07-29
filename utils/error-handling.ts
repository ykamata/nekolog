/**
 * Client-side error handling utilities for medication management
 */

import type { FetchError } from 'ofetch';
import { z } from 'zod';

export interface ErrorDetails {
  message: string;
  code?: string;
  field?: string;
  statusCode?: number;
}

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
 * Parse and format API errors for user display
 */
export function parseApiError(error: unknown): ApiError {
  // Handle FetchError from $fetch
  if (error && typeof error === 'object' && 'data' in error) {
    const fetchError = error as FetchError;

    return {
      message: fetchError.data?.message || fetchError.statusMessage || 'エラーが発生しました',
      statusCode: fetchError.status || 500,
      data: fetchError.data,
      validationErrors: parseValidationErrors(fetchError.data?.data),
    };
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return {
      message: '入力データが無効です',
      statusCode: 400,
      validationErrors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    };
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return {
      message: error.message || 'エラーが発生しました',
      statusCode: 500,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      statusCode: 500,
    };
  }

  // Fallback for unknown error types
  return {
    message: '予期しないエラーが発生しました',
    statusCode: 500,
  };
}

/**
 * Parse validation errors from API response
 */
function parseValidationErrors(data: any): ValidationError[] | undefined {
  if (!data || !Array.isArray(data)) {
    return undefined;
  }

  return data.map((err: any) => ({
    field: err.path?.join('.') || 'unknown',
    message: err.message || 'バリデーションエラー',
  }));
}

/**
 * Get user-friendly error message based on error type and context
 */
export function getUserFriendlyErrorMessage(error: ApiError, context?: string): string {
  const contextPrefix = context ? `${context}: ` : '';

  // Handle specific status codes
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
 * Check if error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  // Retry on server errors and service unavailable
  return error.statusCode >= 500 || error.statusCode === 429;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'cause' in error) {
    const cause = (error as any).cause;
    return cause?.code === 'NETWORK_ERROR'
      || cause?.code === 'ECONNREFUSED'
      || cause?.code === 'ENOTFOUND';
  }
  return false;
}

/**
 * Retry mechanism with exponential backoff
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

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      const apiError = parseApiError(error);

      // Don't retry non-retryable errors
      if (!isRetryableError(apiError)) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay,
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Debounced error handler for form validation
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
 * Error boundary utility for Vue components
 */
export function createErrorHandler(context: string) {
  return {
    handleError: (error: unknown, fallbackMessage?: string) => {
      const apiError = parseApiError(error);
      const message = getUserFriendlyErrorMessage(apiError, context);

      console.error(`[${context}] Error:`, error);

      return {
        error: apiError,
        message: fallbackMessage || message,
        isRetryable: isRetryableError(apiError),
        isNetworkError: isNetworkError(error),
      };
    },
  };
}

/**
 * Form validation error formatter
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Toast notification helper for errors
 */
export interface ToastOptions {
  title?: string;
  duration?: number;
  type?: 'error' | 'warning' | 'info';
  action?: {
    label: string;
    handler: () => void;
  };
}

export function createErrorToast(error: ApiError, options: ToastOptions = {}): ToastOptions {
  return {
    title: options.title || 'エラー',
    duration: options.duration || (isRetryableError(error) ? 5000 : 3000),
    type: 'error',
    ...options,
  };
}
