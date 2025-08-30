// 食事データの確認スクリプト
import { prisma } from './lib/prisma';

async function checkMealData() {
  try {
    console.log('=== 食事データ確認 ===');

    // 全体の件数
    const totalCount = await prisma.mealRecord.count();
    console.log(`総食事記録数: ${totalCount}`);

    // 猫別の件数
    const catCounts = await prisma.mealRecord.groupBy({
      by: ['catId'],
      _count: {
        id: true,
      },
    });

    console.log('\n猫別の記録数:');
    for (const catCount of catCounts) {
      // 猫の名前を別途取得
      const cat = await prisma.cat.findUnique({
        where: { id: catCount.catId },
        select: { name: true },
      });
      console.log(`- 猫ID ${catCount.catId} (${cat?.name}): ${catCount._count.id}件`);
    }

    // 最新の記録
    const latestRecords = await prisma.mealRecord.findMany({
      take: 5,
      orderBy: {
        mealTime: 'desc',
      },
      include: {
        cat: {
          select: {
            name: true,
          },
        },
        food: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log('\n最新の5件:');
    for (const record of latestRecords) {
      console.log(`- ${record.mealTime.toISOString()}: ${record.cat?.name} - ${record.food?.name} (${record.calories}kcal)`);
    }

    // 日付範囲の確認
    const dateRange = await prisma.mealRecord.aggregate({
      _min: {
        mealTime: true,
      },
      _max: {
        mealTime: true,
      },
    });

    console.log('\n日付範囲:');
    console.log(`最古: ${dateRange._min.mealTime?.toISOString()}`);
    console.log(`最新: ${dateRange._max.mealTime?.toISOString()}`);

    // 過去90日間のデータ
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentCount = await prisma.mealRecord.count({
      where: {
        mealTime: {
          gte: ninetyDaysAgo,
        },
      },
    });

    console.log(`\n過去90日間の記録数: ${recentCount}`);

    // 過去30日間のデータ
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthCount = await prisma.mealRecord.count({
      where: {
        mealTime: {
          gte: thirtyDaysAgo,
        },
      },
    });

    console.log(`過去30日間の記録数: ${monthCount}`);
  }
  catch (error) {

  }
  finally {
    await prisma.$disconnect();
  }
}

checkMealData();
