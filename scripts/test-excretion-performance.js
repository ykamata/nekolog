#!/usr/bin/env node

/**
 * 排泄記録のパフォーマンステストスクリプト
 * データベースインデックスの効果を測定する
 */

import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// テスト用のダミーデータ生成
async function generateTestData() {
  console.log('テストデータを生成中...');

  // 既存の猫を取得
  const cats = await prisma.cat.findMany();
  console.log(`データベースから${cats.length}匹の猫を取得しました`);

  if (cats.length === 0) {
    console.log('猫データが見つからないため、テスト用の猫を作成します...');

    // テスト用の猫を作成
    const testCats = await Promise.all([
      prisma.cat.create({
        data: {
          name: 'テスト猫1',
          birthdate: new Date('2020-01-01'),
          weight: 4.0,
        },
      }),
      prisma.cat.create({
        data: {
          name: 'テスト猫2',
          birthdate: new Date('2021-01-01'),
          weight: 3.5,
        },
      }),
    ]);

    console.log(`${testCats.length}匹のテスト用猫を作成しました`);
    cats.push(...testCats);
  }

  // 既存の排泄記録をクリア（テスト用）
  await prisma.excretionRecord.deleteMany({
    where: {
      notes: { contains: 'TEST_DATA' },
    },
  });

  // 大量のテストデータを生成（過去3ヶ月分）
  const testRecords = [];
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  for (let i = 0; i < 1000; i++) {
    const randomDate = new Date(
      threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime()),
    );

    testRecords.push({
      catId: cats[Math.floor(Math.random() * cats.length)].id,
      type: Math.random() > 0.5 ? 'URINE' : 'FECES',
      recordedAt: randomDate,
      notes: `TEST_DATA - Record ${i}`,
    });
  }

  // バッチでデータを挿入
  await prisma.excretionRecord.createMany({
    data: testRecords,
  });

  console.log(`${testRecords.length}件のテストデータを生成しました`);
}

// パフォーマンステスト実行
async function runPerformanceTests() {
  console.log('\nパフォーマンステストを実行中...');

  const cats = await prisma.cat.findMany();
  const testCatId = cats[0]?.id;

  const tests = [
    {
      name: '全記録取得',
      query: () => prisma.excretionRecord.findMany({
        orderBy: { recordedAt: 'desc' },
        take: 50,
      }),
    },
    {
      name: '猫別フィルタリング',
      query: () => prisma.excretionRecord.findMany({
        where: { catId: testCatId },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      }),
    },
    {
      name: '日付範囲検索',
      query: () => {
        const endDate = new Date();
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        return prisma.excretionRecord.findMany({
          where: {
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { recordedAt: 'desc' },
          take: 50,
        });
      },
    },
    {
      name: 'タイプ別フィルタリング',
      query: () => prisma.excretionRecord.findMany({
        where: { type: 'URINE' },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      }),
    },
    {
      name: '複合フィルタリング（猫+日付+タイプ）',
      query: () => {
        const endDate = new Date();
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        return prisma.excretionRecord.findMany({
          where: {
            catId: testCatId,
            type: 'URINE',
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { recordedAt: 'desc' },
          take: 50,
        });
      },
    },
    {
      name: 'カレンダー用クエリ',
      query: () => {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return prisma.excretionRecord.findMany({
          where: {
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            type: true,
            recordedAt: true,
            notes: true,
            catId: true,
            cat: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { recordedAt: 'asc' },
        });
      },
    },
    {
      name: 'カウントクエリ',
      query: () => prisma.excretionRecord.count({
        where: { catId: testCatId },
      }),
    },
  ];

  const results = [];

  for (const test of tests) {
    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await test.query();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    results.push({
      name: test.name,
      avgTime: avgTime.toFixed(2),
      minTime: minTime.toFixed(2),
      maxTime: maxTime.toFixed(2),
    });

    console.log(`${test.name}: 平均 ${avgTime.toFixed(2)}ms (最小: ${minTime.toFixed(2)}ms, 最大: ${maxTime.toFixed(2)}ms)`);
  }

  return results;
}

// クリーンアップ
async function cleanup() {
  console.log('\nテストデータをクリーンアップ中...');
  await prisma.excretionRecord.deleteMany({
    where: {
      notes: { contains: 'TEST_DATA' },
    },
  });
  console.log('クリーンアップ完了');
}

// メイン実行
async function main() {
  try {
    console.log('排泄記録パフォーマンステストを開始します...');

    await generateTestData();
    const results = await runPerformanceTests();
    await cleanup();

    console.log('\n=== パフォーマンステスト結果 ===');
    console.table(results);

    console.log('\n=== 推奨事項 ===');
    console.log('- 平均応答時間が100ms以下であれば良好です');
    console.log('- 複合フィルタリングが遅い場合は、インデックスの見直しを検討してください');
    console.log('- カレンダー用クエリは特に最適化が重要です');
  }
  catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error);
  }
  finally {
    await prisma.$disconnect();
  }
}

// スクリプトが直接実行された場合のみmainを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateTestData, runPerformanceTests, cleanup };
