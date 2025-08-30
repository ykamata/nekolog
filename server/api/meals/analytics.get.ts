import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { generateMealAnalytics, calculateDailyCaloriesWithFoodType, fillMissingDatesForFoodType } from '~/utils/cat-meal';

const querySchema = z.object({
  catId: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .transform((str) => {
      if (!str) return undefined;
      try {
        // URLデコードしてから日付をパース
        const decodedStr = decodeURIComponent(str);
        const date = new Date(decodedStr);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        return date;
      }
      catch (error) {
        throw new Error(`Invalid startDate format: ${str}`);
      }
    }),
  endDate: z
    .string()
    .optional()
    .transform((str) => {
      if (!str) return undefined;
      try {
        // URLデコードしてから日付をパース
        const decodedStr = decodeURIComponent(str);
        const date = new Date(decodedStr);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        return date;
      }
      catch (error) {
        throw new Error(`Invalid endDate format: ${str}`);
      }
    }),
  days: z
    .string()
    .optional()
    .default('30')
    .transform((str) => {
      const num = Number(str);
      if (isNaN(num) || num <= 0 || num > 365) {
        throw new Error('Days must be a positive number between 1 and 365');
      }
      return num;
    }),
  chartType: z
    .enum(['line', 'bar'])
    .optional()
    .default('line'),
  foodTypeFilter: z
    .enum(['all', 'DRY', 'WET'])
    .optional()
    .default('all'),
});

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    console.log('Analytics API: リクエスト受信', { query });
    let parsedQuery;

    try {
      parsedQuery = querySchema.parse(query);
    }
    catch (validationError) {
      // より詳細なバリデーションエラーメッセージ
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

    const { catId, startDate, endDate, days, chartType, foodTypeFilter } = parsedQuery;
    console.log('Analytics API: パース済みクエリ', { catId, startDate, endDate, days, chartType, foodTypeFilter });

    // 日付変数を事前に宣言
    let finalStartDate: Date;
    let finalEndDate: Date;

    // Build where clause
    const where: Record<string, any> = {};

    if (catId) {
      where.catId = catId;
    }

    // Apply food type filter
    if (foodTypeFilter !== 'all') {
      where.food = {
        type: foodTypeFilter,
      };
    }

    // Set date range - either from parameters or last N days
    if (startDate || endDate) {
      where.mealTime = {};

      // startDateの処理
      if (startDate) {
        where.mealTime.gte = startDate;
        finalStartDate = startDate;
      }
      else {
        finalStartDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        finalStartDate.setHours(0, 0, 0, 0);
        where.mealTime.gte = finalStartDate;
      }

      // endDateの処理
      if (endDate) {
        where.mealTime.lte = endDate;
        finalEndDate = endDate;
      }
      else {
        finalEndDate = new Date();
        finalEndDate.setHours(23, 59, 59, 999);
        where.mealTime.lte = finalEndDate;
      }
    }
    else {
      // Default to last N days
      finalEndDate = new Date();
      finalStartDate = new Date();
      finalStartDate.setDate(finalStartDate.getDate() - days + 1);
      finalStartDate.setHours(0, 0, 0, 0);
      finalEndDate.setHours(23, 59, 59, 999);

      where.mealTime = {
        gte: finalStartDate,
        lte: finalEndDate,
      };
    }

    // パフォーマンス最適化：大量データ時のクエリ最適化（要件6.1, 6.2対応）
    let recordCount: number;
    let isLargeDataset: boolean;

    try {
      recordCount = await prisma.mealRecord.count({ where });
      isLargeDataset = recordCount > 1000;
    }
    catch (dbError) {
      // データベース接続エラーの詳細なハンドリング
      console.error('Database count query failed:', dbError);
      throw createError({
        statusCode: 503,
        statusMessage: 'Database connection error',
        data: {
          message: 'データベースに接続できません。しばらく待ってから再試行してください。',
          code: 'DATABASE_CONNECTION_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 大量データの場合はページネーションを使用
    let mealRecords;

    try {
      if (isLargeDataset) {
        // 大量データの場合は最新のデータを優先して取得
        mealRecords = await prisma.mealRecord.findMany({
          where,
          orderBy: { mealTime: 'desc' },
          take: 2000, // 最大2000件に制限
          select: {
            id: true,
            catId: true,
            foodId: true,
            quantity: true,
            calories: true,
            mealTime: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
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
              },
            },
          },
        });

        // 時系列順に並び替え
        mealRecords.reverse();
      }
      else {
        // 通常のクエリ
        mealRecords = await prisma.mealRecord.findMany({
          where,
          orderBy: { mealTime: 'asc' },
          select: {
            id: true,
            catId: true,
            foodId: true,
            quantity: true,
            calories: true,
            mealTime: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
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
              },
            },
          },
        });
      }
    }
    catch (dbError) {
      // データベースクエリエラーの詳細なハンドリング
      console.error('Database query failed:', dbError);

      // エラーの種類に応じて適切なレスポンスを返す
      if (dbError instanceof Error) {
        if (dbError.message.includes('timeout')) {
          throw createError({
            statusCode: 504,
            statusMessage: 'Database query timeout',
            data: {
              message: 'データベースの応答が遅すぎます。しばらく待ってから再試行してください。',
              code: 'DATABASE_TIMEOUT',
              timestamp: new Date().toISOString(),
            },
          });
        }

        if (dbError.message.includes('connection')) {
          throw createError({
            statusCode: 503,
            statusMessage: 'Database connection error',
            data: {
              message: 'データベースに接続できません。しばらく待ってから再試行してください。',
              code: 'DATABASE_CONNECTION_ERROR',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // その他のデータベースエラー
      throw createError({
        statusCode: 500,
        statusMessage: 'Database query error',
        data: {
          message: 'データの取得中にエラーが発生しました。',
          code: 'DATABASE_QUERY_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Transform data for analytics utility
    const transformedRecords = mealRecords.map(record => ({
      id: record.id,
      catId: record.catId,
      foodId: record.foodId,
      quantity: record.quantity,
      calories: record.calories,
      mealTime: record.mealTime,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cat: record.cat
        ? {
            id: record.cat.id,
            name: record.cat.name,
            birthdate: undefined,
            weight: undefined,
            photoUrl: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : undefined,
      food: record.food
        ? {
            id: record.food.id,
            name: record.food.name,
            type: record.food.type as 'DRY' | 'WET',
            brand: record.food.brand,
            caloriesPerGram: 0, // Not needed for analytics
            pricePerUnit: undefined,
            unit: 'g',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : undefined,
    }));

    // データの妥当性チェック（要件7.3, 7.4対応）
    const validRecords = transformedRecords.filter((record) => {
      // 基本的なデータ妥当性チェック
      if (!record.id || !record.catId || !record.foodId) {
        console.warn('Invalid record found: missing required fields', record.id);
        return false;
      }

      // カロリー値の妥当性チェック
      if (record.calories < 0 || record.calories > 10000) {
        console.warn('Invalid calorie value found:', record.calories, 'for record:', record.id);
        return false;
      }

      // 数量の妥当性チェック
      if (record.quantity < 0 || record.quantity > 10000) {
        console.warn('Invalid quantity value found:', record.quantity, 'for record:', record.id);
        return false;
      }

      // 日付の妥当性チェック
      if (!record.mealTime || isNaN(record.mealTime.getTime())) {
        console.warn('Invalid meal time found:', record.mealTime, 'for record:', record.id);
        return false;
      }

      return true;
    });

    // 無効なレコードが多い場合は警告
    const invalidRecordCount = transformedRecords.length - validRecords.length;
    if (invalidRecordCount > 0) {
      console.warn(`${invalidRecordCount} invalid records were filtered out of ${transformedRecords.length} total records`);
    }

    // データが空の場合の処理
    if (validRecords.length === 0) {
      // 空のデータでも正常なレスポンスを返す
      const emptyAnalytics = {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [
          { type: 'DRY' as const, percentage: 0, totalCalories: 0, totalWeight: 0 },
          { type: 'WET' as const, percentage: 0, totalCalories: 0, totalWeight: 0 },
        ],
        totalMeals: 0,
        averageCaloriesPerMeal: 0,
      };

      const endTime = Date.now();

      return {
        analytics: emptyAnalytics,
        chartData: {
          chartType,
          dailyCalories: [],
          dailyCaloriesByFoodType: [],
        },
        summary: {
          totalMeals: 0,
          totalCalories: 0,
          averageCaloriesPerMeal: 0,
          dateRange: {
            startDate: finalStartDate,
            endDate: finalEndDate,
          },
        },
        performanceInfo: {
          recordCount: 0,
          isLargeDataset: false,
          processedRecords: 0,
          queryOptimized: false,
          processingTime: endTime - startTime,
          invalidRecordCount,
        },
        dataQuality: {
          totalRecords: transformedRecords.length,
          validRecords: validRecords.length,
          invalidRecords: invalidRecordCount,
          dataCompleteness: 0,
        },
      };
    }

    // Generate analytics
    let analytics;
    try {
      analytics = generateMealAnalytics(validRecords.map(record => ({
        ...record,
        notes: record.notes || undefined,
        food: record.food
          ? {
              ...record.food,
              type: record.food.type as 'DRY' | 'WET',
              pricePerUnit: record.food.pricePerUnit || undefined,
              brand: record.food.brand || undefined,
            }
          : undefined,
      })) as any[]);
    }
    catch (analyticsError) {
      console.error('Analytics generation failed:', analyticsError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Analytics processing error',
        data: {
          message: 'データの分析中にエラーが発生しました。',
          code: 'ANALYTICS_PROCESSING_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Generate chart-specific data based on chart type
    let chartData = {};
    if (chartType === 'bar') {
      // For bar chart, provide daily calories by food type for stacked bar chart
      const dailyCaloriesByFoodType = calculateDailyCaloriesWithFoodType(
        transformedRecords.map(record => ({
          ...record,
          notes: record.notes || undefined,
          food: record.food
            ? {
                ...record.food,
                type: record.food.type as 'DRY' | 'WET',
                pricePerUnit: record.food.pricePerUnit || undefined,
                brand: record.food.brand || undefined,
              }
            : undefined,
        })) as any[],
      );

      // Fill missing dates with zero values to show data gaps
      const filledData = fillMissingDatesForFoodType(
        dailyCaloriesByFoodType,
        finalStartDate,
        finalEndDate,
      );

      chartData = {
        chartType: 'bar',
        dailyCaloriesByFoodType: filledData,
      };
    }
    else {
      // For line chart, use existing daily calories data
      chartData = {
        chartType: 'line',
        dailyCalories: analytics.dailyCalories,
      };
    }

    // Get additional summary data
    const totalMeals = mealRecords.length;
    const totalCalories = mealRecords.reduce(
      (sum, record) => sum + record.calories,
      0,
    );
    const averageCaloriesPerMeal
      = totalMeals > 0 ? Math.round((totalCalories / totalMeals) * 100) / 100 : 0;

    // Get cat-specific data if no specific cat is requested
    let catBreakdown = undefined;
    if (!catId) {
      const catGroups = mealRecords.reduce((groups, record) => {
        const catId = record.catId;
        if (!groups[catId]) {
          groups[catId] = {
            cat: record.cat,
            totalCalories: 0,
            mealCount: 0,
          };
        }
        groups[catId].totalCalories += record.calories;
        groups[catId].mealCount += 1;
        return groups;
      }, {} as Record<string, any>);

      catBreakdown = Object.values(catGroups).map((group: any) => ({
        catId: group.cat.id,
        catName: group.cat.name,
        totalCalories: Math.round(group.totalCalories * 100) / 100,
        mealCount: group.mealCount,
        averageCaloriesPerMeal:
          group.mealCount > 0
            ? Math.round((group.totalCalories / group.mealCount) * 100) / 100
            : 0,
      }));
    }

    // パフォーマンス情報を追加
    const endTime = Date.now();
    const performanceInfo = {
      recordCount,
      isLargeDataset,
      processedRecords: mealRecords.length,
      queryOptimized: isLargeDataset,
      processingTime: endTime - startTime,
      invalidRecordCount,
    };

    // データ品質情報を追加
    const dataQuality = {
      totalRecords: transformedRecords.length,
      validRecords: validRecords.length,
      invalidRecords: invalidRecordCount,
      dataCompleteness: transformedRecords.length > 0
        ? Math.round((validRecords.length / transformedRecords.length) * 100 * 100) / 100
        : 100,
    };

    // Add caching headers for analytics data
    // 大量データの場合はキャッシュ時間を延長
    const cacheMaxAge = isLargeDataset ? 600 : 300;
    const cacheSharedMaxAge = isLargeDataset ? 1200 : 600;
    setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheSharedMaxAge}`);

    return {
      analytics,
      chartData,
      summary: {
        totalMeals,
        totalCalories: Math.round(totalCalories * 100) / 100,
        averageCaloriesPerMeal,
        dateRange: {
          startDate: finalStartDate,
          endDate: finalEndDate,
        },
      },
      performanceInfo,
      dataQuality,
      ...(catBreakdown && { catBreakdown }),
    };
  }
  catch (error) {
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // すでにcreateErrorで作成されたエラーはそのまま再スローする
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query parameters',
        data: {
          message: 'クエリパラメータが無効です',
          code: 'VALIDATION_ERROR',
          errors: error.errors,
          timestamp: new Date().toISOString(),
          processingTime,
        },
      });
    }

    // Prisma specific errors
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
              timestamp: new Date().toISOString(),
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
              timestamp: new Date().toISOString(),
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
              timestamp: new Date().toISOString(),
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
              timestamp: new Date().toISOString(),
              processingTime,
            },
          });
      }
    }

    // Handle unexpected errors
    console.error('Unexpected error in analytics API:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: {
        message: '予期しないエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
        processingTime,
      },
    });
  }
});
