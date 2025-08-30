import { prisma } from '~/lib/prisma';

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    console.log('📊 ダッシュボード統計API: 開始');

    // Get counts for each data type
    const [catCount, foodCount, mealCount, todaysMealCount] = await Promise.all([
      prisma.cat.count(),
      prisma.food.count(),
      prisma.mealRecord.count(),
      prisma.mealRecord.count({
        where: {
          mealTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    const stats = {
      cats: catCount,
      foods: foodCount,
      totalMeals: mealCount,
      todaysMeals: todaysMealCount,
      timestamp: new Date().toISOString(),
    };

    console.log('📊 ダッシュボード統計API: 結果', stats);

    // Add caching headers
    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=120');

    return stats;
  }
  catch (error) {
    console.error('📊 ダッシュボード統計API: エラー', error);

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch dashboard stats',
      data: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
