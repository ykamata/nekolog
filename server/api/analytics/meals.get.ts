/**
 * チャート用食事分析APIエンドポイント
 * 要件1.1, 1.2, 1.3に対応
 */

import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { ChartAnalyticsQuerySchema } from '~/lib/validations/chart-analytics';
import {
  toLocalDateString,
  getStartOfDay,
  getEndOfDay,
  getLastNDaysRange,
  transformPrismaMealRecord,
} from '~/utils/cat-meal';
import {
  processChartData,
  calculateChartSummary,
  optimizeDataForPerformance,
  validateChartData,
  type ChartData,
  type DateRange,
} from '~/utils/chart-data-processing';
import type { DailyCalorieData, FoodType } from '~/types/cat-meal';

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // GETメソッドのみ許可
    assertMethod(event, 'GET');

    // クエリパラメータの解析とバリデーション
    const query = getQuery(event);
    console.log('Chart Analytics API: リクエスト受信', { query });

    let parsedQuery;
    try {
      parsedQuery = ChartAnalyticsQuerySchema.parse(query);
    }
    catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errorMessages = validationError.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`,
        ).join(', ');

        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid query parameters',
          data: {
            message: 'クエリパラメータが無効です',
            details: errorMessages,
            errors: validationError.errors,
          },
        });
      }
      throw validationError;
    }

    const {
      catId,
      startDate,
      endDate,
      days,
      chartType,
      includeEmptyDates,
      maxDataPoints,
    } = parsedQuery;

    console.log('Chart Analytics API: パース済みクエリ', {
      catId, startDate, endDate, days, chartType, includeEmptyDates, maxDataPoints,
    });

    // 日付範囲の決定（JSTで処理）
    let finalStartDate: Date;
    let finalEndDate: Date;

    if (startDate || endDate) {
      // startDateまたはendDateが指定されている場合
      if (startDate) {
        finalStartDate = getStartOfDay(startDate);
      }
      else {
        // startDateが未指定の場合は過去N日間の開始日を使用
        const defaultRange = getLastNDaysRange(days);
        finalStartDate = defaultRange.startDate;
      }

      if (endDate) {
        finalEndDate = getEndOfDay(endDate);
      }
      else {
        // endDateが未指定の場合は今日の終わりを使用
        finalEndDate = getEndOfDay(new Date());
      }
    }
    else {
      // デフォルトは過去N日間（JSTベース）
      const defaultRange = getLastNDaysRange(days);
      finalStartDate = defaultRange.startDate;
      finalEndDate = defaultRange.endDate;
    }

    // 日付範囲の妥当性チェック
    if (finalStartDate >= finalEndDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid date range',
        data: {
          message: '開始日は終了日より前である必要があります',
          code: 'INVALID_DATE_RANGE',
        },
      });
    }

    // データベースクエリの条件を構築
    const whereClause: any = {
      mealTime: {
        gte: finalStartDate,
        lte: finalEndDate,
      },
    };

    if (catId) {
      whereClause.catId = catId;
    }

    // パフォーマンス最適化：レコード数をチェック
    let recordCount: number;
    try {
      recordCount = await prisma.mealRecord.count({ where: whereClause });
    }
    catch (dbError) {
      console.error('Database count query failed:', dbError);
      throw createError({
        statusCode: 503,
        statusMessage: 'Database connection error',
        data: {
          message: 'データベースに接続できません。しばらく待ってから再試行してください。',
          code: 'DATABASE_CONNECTION_ERROR',
        },
      });
    }

    // 大量データの場合は制限を設ける
    const isLargeDataset = recordCount > 2000;
    const queryLimit = isLargeDataset ? 2000 : undefined;

    // 食事記録を取得
    let mealRecords;
    try {
      const queryOptions: any = {
        where: whereClause,
        orderBy: { mealTime: 'asc' },
        include: {
          cat: {
            select: {
              id: true,
              name: true,
            },
          },
          food: {
            select: {
              id: true,
              name: true,
              type: true,
              brand: true,
              caloriesPerGram: true,
            },
          },
        },
      };

      if (queryLimit) {
        queryOptions.take = queryLimit;
      }

      const rawRecords = await prisma.mealRecord.findMany(queryOptions);

      // Prismaの結果を型安全な形式に変換
      mealRecords = rawRecords.map(record => transformPrismaMealRecord(record));
    }
    catch (dbError) {
      console.error('Database query failed:', dbError);

      if (dbError instanceof Error) {
        if (dbError.message.includes('timeout')) {
          throw createError({
            statusCode: 504,
            statusMessage: 'Database query timeout',
            data: {
              message: 'データベースの応答が遅すぎます。しばらく待ってから再試行してください。',
              code: 'DATABASE_TIMEOUT',
            },
          });
        }
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Database query error',
        data: {
          message: 'データの取得中にエラーが発生しました。',
          code: 'DATABASE_QUERY_ERROR',
        },
      });
    }

    // データの妥当性チェック
    const validRecords = mealRecords.filter((record) => {
      if (!record.id || !record.catId || !record.foodId) {
        console.warn('Invalid record found: missing required fields', record.id);
        return false;
      }

      if (record.calories < 0 || record.calories > 10000) {
        console.warn('Invalid calorie value found:', record.calories, 'for record:', record.id);
        return false;
      }

      if (record.quantity < 0 || record.quantity > 10000) {
        console.warn('Invalid quantity value found:', record.quantity, 'for record:', record.id);
        return false;
      }

      if (!record.mealTime || isNaN(record.mealTime.getTime())) {
        console.warn('Invalid meal time found:', record.mealTime, 'for record:', record.id);
        return false;
      }

      return true;
    });

    const invalidRecordCount = mealRecords.length - validRecords.length;
    if (invalidRecordCount > 0) {
      console.warn(`${invalidRecordCount} invalid records were filtered out`);
    }

    // データが空の場合の処理
    if (validRecords.length === 0) {
      const endTime = Date.now();

      return {
        success: true,
        data: {
          chartData: {
            labels: [],
            datasets: [],
            isEmpty: true,
            dateRange: {
              start: finalStartDate,
              end: finalEndDate,
            },
          },
          dataPoints: [],
          stats: {
            totalDryCalories: 0,
            totalWetCalories: 0,
            dryFoodPercentage: 0,
            wetFoodPercentage: 0,
            averageDailyCalories: 0,
          },
          summary: {
            totalMeals: 0,
            totalCalories: 0,
            averageCaloriesPerMeal: 0,
            dateRange: {
              startDate: finalStartDate,
              endDate: finalEndDate,
            },
            catCount: 0,
          },
          performance: {
            recordCount: 0,
            processedRecords: 0,
            processingTime: endTime - startTime,
            samplingApplied: false,
          },
        },
      };
    }

    // 食事データを分析用形式に変換
    const dailyCalories: DailyCalorieData[] = validRecords
      .filter(record => record.food) // foodが存在するレコードのみ
      .map(record => ({
        date: toLocalDateString(record.mealTime),
        calories: record.calories,
        type: record.food!.type as FoodType,
      }));

    // 分析データを構築
    const mealAnalytics = {
      dailyCalories,
      dailyCaloriesByFoodType: [],
      weeklyAverage: 0,
      foodTypeBreakdown: [],
    };

    // チャートデータを生成
    let chartData: ChartData;
    try {
      chartData = processChartData(
        mealAnalytics,
        chartType as 'line' | 'bar' | 'stacked-bar',
        undefined,
        { start: finalStartDate, end: finalEndDate },
      );
    }
    catch (processingError) {
      console.error('Chart data processing failed:', processingError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Chart data processing error',
        data: {
          message: 'チャートデータの処理中にエラーが発生しました。',
          code: 'CHART_PROCESSING_ERROR',
        },
      });
    }

    // 統計情報を計算
    const stats = calculateChartSummary(mealAnalytics);

    // サマリー情報を計算
    const totalMeals = validRecords.length;
    const totalCalories = validRecords.reduce((sum, record) => sum + record.calories, 0);
    const averageCaloriesPerMeal = totalMeals > 0 ? Math.round((totalCalories / totalMeals) * 100) / 100 : 0;
    const catCount = new Set(validRecords.map(record => record.catId)).size;

    // キャッシュヘッダーを設定
    const cacheMaxAge = isLargeDataset ? 600 : 300;
    setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}`);

    const endTime = Date.now();

    return {
      success: true,
      data: {
        chartData,
        dataPoints: dailyCalories,
        stats: {
          totalDryCalories: stats.dryFoodPercentage * stats.totalCalories / 100,
          totalWetCalories: stats.wetFoodPercentage * stats.totalCalories / 100,
          dryFoodPercentage: stats.dryFoodPercentage,
          wetFoodPercentage: stats.wetFoodPercentage,
          averageDailyCalories: stats.averagePerDay,
        },
        summary: {
          totalMeals,
          totalCalories: Math.round(totalCalories * 100) / 100,
          averageCaloriesPerMeal,
          dateRange: {
            startDate: finalStartDate,
            endDate: finalEndDate,
          },
          catCount,
        },
        performance: {
          recordCount,
          processedRecords: validRecords.length,
          processingTime: endTime - startTime,
          samplingApplied: false,
        },
      },
    };
  }
  catch (error) {
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // 既にcreateErrorで作成されたエラーはそのまま再スロー
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // バリデーションエラー
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query parameters',
        data: {
          message: 'クエリパラメータが無効です',
          code: 'VALIDATION_ERROR',
          errors: error.errors,
          processingTime,
        },
      });
    }

    // Prismaエラー
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;

      switch (prismaError.code) {
        case 'P2002':
          throw createError({
            statusCode: 409,
            statusMessage: 'Unique constraint violation',
            data: {
              message: 'データの重複エラーが発生しました',
              code: 'UNIQUE_CONSTRAINT_ERROR',
              processingTime,
            },
          });

        case 'P2025':
          throw createError({
            statusCode: 404,
            statusMessage: 'Record not found',
            data: {
              message: '指定されたデータが見つかりません',
              code: 'RECORD_NOT_FOUND',
              processingTime,
            },
          });

        case 'P1001':
          throw createError({
            statusCode: 503,
            statusMessage: 'Database connection error',
            data: {
              message: 'データベースに接続できません',
              code: 'DATABASE_CONNECTION_ERROR',
              processingTime,
            },
          });

        default:
          console.error('Prisma error:', prismaError);
          throw createError({
            statusCode: 500,
            statusMessage: 'Database error',
            data: {
              message: 'データベースエラーが発生しました',
              code: 'DATABASE_ERROR',
              processingTime,
            },
          });
      }
    }

    // 予期しないエラー
    console.error('Unexpected error in chart analytics API:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: {
        message: '予期しないエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        processingTime,
      },
    });
  }
});
