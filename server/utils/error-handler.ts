/**
 * Server-side error handling utilities for medication management
 */

import { z } from 'zod';
import type { H3Event } from 'h3';
import { logger } from '~/lib/pino-logger';

export interface ErrorContext {
  endpoint: string;
  method: string;
  userId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
}

export interface DatabaseConstraintError {
  code: string;
  constraint?: string;
  table?: string;
  column?: string;
}

/**
 * Enhanced error handler with comprehensive logging and proper HTTP responses
 */
export function createApiErrorHandler(context: ErrorContext) {
  return (error: unknown): never => {
    const errorId = generateErrorId();
    const timestamp = new Date().toISOString();

    // Log error with context
    logError(error, { ...context, errorId, timestamp });

    // Handle different error types
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '入力データが無効です',
        data: {
          errorId,
          timestamp,
          validationErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
      });
    }

    // Handle Prisma database errors
    if (isPrismaError(error)) {
      const dbError = handleDatabaseError(error);
      throw createError({
        statusCode: dbError.statusCode,
        statusMessage: dbError.message,
        data: {
          errorId,
          timestamp,
          code: dbError.code,
        },
      });
    }

    // Handle HTTP errors (re-throw with error ID)
    if (isHttpError(error)) {
      const httpError = error as any;
      throw createError({
        statusCode: httpError.statusCode,
        statusMessage: httpError.statusMessage,
        data: {
          errorId,
          timestamp,
          ...httpError.data,
        },
      });
    }

    // Handle generic errors
    if (error instanceof Error) {
      // Log stack trace for unexpected errors
      logger.error({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context,
        errorId,
        timestamp,
      }, 'Unexpected error occurred');

      throw createError({
        statusCode: 500,
        statusMessage: 'サーバーエラーが発生しました',
        data: {
          errorId,
          timestamp,
        },
      });
    }

    // Handle unknown error types
    logger.error({
      error: String(error),
      context,
      errorId,
      timestamp,
    }, 'Unknown error type');

    throw createError({
      statusCode: 500,
      statusMessage: 'サーバーエラーが発生しました',
      data: {
        errorId,
        timestamp,
      },
    });
  };
}

/**
 * Log error with appropriate level and context
 */
function logError(error: unknown, context: ErrorContext & { errorId: string; timestamp: string }) {
  const baseLog = {
    context,
    errorId: context.errorId,
    timestamp: context.timestamp,
  };

  if (error instanceof z.ZodError) {
    logger.warn({
      ...baseLog,
      validationErrors: error.errors,
    }, 'Validation error');
  }
  else if (isPrismaError(error)) {
    logger.error({
      ...baseLog,
      prismaError: {
        code: (error as any).code,
        message: (error as any).message,
        meta: (error as any).meta,
      },
    }, 'Database error');
  }
  else if (isHttpError(error)) {
    const httpError = error as any;
    const level = httpError.statusCode >= 500 ? 'error' : 'warn';
    logger[level]({
      ...baseLog,
      httpError: {
        statusCode: httpError.statusCode,
        statusMessage: httpError.statusMessage,
      },
    }, 'HTTP error');
  }
  else if (error instanceof Error) {
    logger.error({
      ...baseLog,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }, 'Unexpected error');
  }
  else {
    logger.error({
      ...baseLog,
      error: String(error),
    }, 'Unknown error');
  }
}

/**
 * Handle Prisma database errors with user-friendly messages
 */
function handleDatabaseError(error: any): { statusCode: number; message: string; code: string } {
  const code = error.code;
  const meta = error.meta || {};

  switch (code) {
    case 'P2002': // Unique constraint violation
      return {
        statusCode: 409,
        message: getUniqueConstraintMessage(meta),
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
      };

    case 'P2003': // Foreign key constraint violation
      return {
        statusCode: 400,
        message: getForeignKeyConstraintMessage(meta),
        code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
      };

    case 'P2025': // Record not found
      return {
        statusCode: 404,
        message: 'データが見つかりません',
        code: 'RECORD_NOT_FOUND',
      };

    case 'P2014': // Required relation missing
      return {
        statusCode: 400,
        message: '必要な関連データが不足しています',
        code: 'REQUIRED_RELATION_MISSING',
      };

    case 'P1001': // Database unreachable
      return {
        statusCode: 503,
        message: 'データベースに接続できません',
        code: 'DATABASE_UNREACHABLE',
      };

    case 'P1008': // Operation timeout
      return {
        statusCode: 504,
        message: 'データベース操作がタイムアウトしました',
        code: 'DATABASE_TIMEOUT',
      };

    default:
      return {
        statusCode: 500,
        message: 'データベースエラーが発生しました',
        code: 'DATABASE_ERROR',
      };
  }
}

/**
 * Generate user-friendly message for unique constraint violations
 */
function getUniqueConstraintMessage(meta: any): string {
  const target = meta.target;

  if (Array.isArray(target)) {
    if (target.includes('name')) {
      return '同じ名前のデータが既に存在します';
    }
    if (target.includes('email')) {
      return 'このメールアドレスは既に使用されています';
    }
  }

  return 'データの重複エラーが発生しました';
}

/**
 * Generate user-friendly message for foreign key constraint violations
 */
function getForeignKeyConstraintMessage(meta: any): string {
  const field = meta.field_name;

  if (field?.includes('cat')) {
    return '指定された猫が見つかりません';
  }
  if (field?.includes('medication')) {
    return '指定された薬が見つかりません';
  }
  if (field?.includes('user')) {
    return '指定されたユーザーが見つかりません';
  }

  return '関連するデータが見つかりません';
}

/**
 * Check if error is a Prisma error
 */
function isPrismaError(error: unknown): error is { code: string; clientVersion: string } {
  return !!(error && typeof error === 'object' && 'code' in error && 'clientVersion' in error);
}

/**
 * Check if error is an HTTP error
 */
function isHttpError(error: unknown): error is { statusCode: number } {
  return !!(error && typeof error === 'object' && 'statusCode' in error);
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract request context from H3 event
 */
export function getRequestContext(event: H3Event): Omit<ErrorContext, 'endpoint' | 'method'> {
  const headers = getHeaders(event);

  return {
    userId: event.context.user?.id,
    requestId: headers['x-request-id'] as string,
    userAgent: headers['user-agent'] as string,
    ip: 'unknown', // getClientIP(event) || 'unknown',
  };
}

/**
 * Middleware to add request context to event
 */
export function withErrorContext(endpoint: string) {
  return (handler: (event: H3Event) => Promise<any>) => {
    return async (event: H3Event) => {
      const method = getMethod(event);
      const context: ErrorContext = {
        endpoint,
        method,
        ...getRequestContext(event),
      };

      const handleError = createApiErrorHandler(context);

      try {
        return await handler(event);
      }
      catch (error) {
        handleError(error);
      }
    };
  };
}

/**
 * Validate request parameters with enhanced error handling
 */
export function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
  try {
    return schema.parse(params);
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request parameters',
        data: {
          validationErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
      });
    }
    throw error;
  }
}

/**
 * Validate request body with enhanced error handling
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '入力データが無効です',
        data: {
          validationErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
      });
    }
    throw error;
  }
}
