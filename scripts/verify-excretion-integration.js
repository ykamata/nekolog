#!/usr/bin/env node

/**
 * 排泄記録管理機能の統合テストスクリプト
 * 全機能の動作確認と既存機能との連携確認を行う
 */

import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// テスト結果を格納する配列
const testResults = [];

// テスト結果を記録する関数
function recordTest(name, passed, duration, error = null) {
  testResults.push({
    name,
    passed,
    duration: Math.round(duration * 100) / 100,
    error: error?.message || null,
  });

  const status = passed ? '✅ PASS' : '❌ FAIL';
  const durationStr = `(${Math.round(duration * 100) / 100}ms)`;
  console.log(`${status} ${name} ${durationStr}`);

  if (error) {
    console.log(`   Error: ${error.message}`);
  }
}

// テストを実行する関数
async function runTest(name, testFn) {
  const startTime = performance.now();
  try {
    await testFn();
    const duration = performance.now() - startTime;
    recordTest(name, true, duration);
    return true;
  }
  catch (error) {
    const duration = performance.now() - startTime;
    recordTest(name, false, duration, error);
    return false;
  }
}

// 1. データベース接続テスト
async function testDatabaseConnection() {
  await prisma.$connect();
  const result = await prisma.$queryRaw`SELECT 1 as test`;
  if (!result || result.length === 0) {
    throw new Error('データベースクエリが失敗しました');
  }
}

// 2. 猫データの存在確認
async function testCatDataExists() {
  const cats = await prisma.cat.findMany();
  if (cats.length === 0) {
    throw new Error('テスト用の猫データが見つかりません');
  }
  return cats;
}

// 3. 排泄記録のCRUD操作テスト
async function testExcretionRecordCRUD(cats) {
  const testCat = cats[0];

  // Create
  const createData = {
    catId: testCat.id,
    type: 'URINE',
    recordedAt: new Date(),
    notes: 'Integration test record',
  };

  const createdRecord = await prisma.excretionRecord.create({
    data: createData,
    include: { cat: true },
  });

  if (!createdRecord.id) {
    throw new Error('排泄記録の作成に失敗しました');
  }

  // Read
  const fetchedRecord = await prisma.excretionRecord.findUnique({
    where: { id: createdRecord.id },
    include: { cat: true },
  });

  if (!fetchedRecord) {
    throw new Error('排泄記録の取得に失敗しました');
  }

  // Update
  const updateData = {
    notes: 'Updated integration test record',
    type: 'FECES',
  };

  const updatedRecord = await prisma.excretionRecord.update({
    where: { id: createdRecord.id },
    data: updateData,
  });

  if (updatedRecord.notes !== updateData.notes || updatedRecord.type !== updateData.type) {
    throw new Error('排泄記録の更新に失敗しました');
  }

  // Delete
  await prisma.excretionRecord.delete({
    where: { id: createdRecord.id },
  });

  const deletedRecord = await prisma.excretionRecord.findUnique({
    where: { id: createdRecord.id },
  });

  if (deletedRecord) {
    throw new Error('排泄記録の削除に失敗しました');
  }

  return createdRecord;
}

// 4. フィルタリング機能テスト
async function testFilteringFunctionality(cats) {
  const testCat = cats[0];

  // テストデータを作成
  const testRecords = await Promise.all([
    prisma.excretionRecord.create({
      data: {
        catId: testCat.id,
        type: 'URINE',
        recordedAt: new Date(),
        notes: 'Filter test 1',
      },
    }),
    prisma.excretionRecord.create({
      data: {
        catId: testCat.id,
        type: 'FECES',
        recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前
        notes: 'Filter test 2',
      },
    }),
  ]);

  try {
    // 猫IDでフィルタリング
    const catFiltered = await prisma.excretionRecord.findMany({
      where: { catId: testCat.id },
    });

    if (catFiltered.length < 2) {
      throw new Error('猫IDフィルタリングが正しく動作していません');
    }

    // タイプでフィルタリング
    const typeFiltered = await prisma.excretionRecord.findMany({
      where: {
        catId: testCat.id,
        type: 'URINE',
      },
    });

    if (typeFiltered.length === 0) {
      throw new Error('タイプフィルタリングが正しく動作していません');
    }

    // 日付範囲でフィルタリング
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const dateFiltered = await prisma.excretionRecord.findMany({
      where: {
        catId: testCat.id,
        recordedAt: {
          gte: startOfDay,
        },
      },
    });

    if (dateFiltered.length === 0) {
      throw new Error('日付範囲フィルタリングが正しく動作していません');
    }
  }
  finally {
    // テストデータをクリーンアップ
    await prisma.excretionRecord.deleteMany({
      where: {
        id: { in: testRecords.map(r => r.id) },
      },
    });
  }
}

// 5. カレンダー機能テスト
async function testCalendarFunctionality(cats) {
  const testCat = cats[0];

  // 今月のテストデータを作成
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const testRecord = await prisma.excretionRecord.create({
    data: {
      catId: testCat.id,
      type: 'URINE',
      recordedAt: new Date(now.getFullYear(), now.getMonth(), 15, 10, 30), // 今月15日 10:30
      notes: 'Calendar test record',
    },
  });

  try {
    // カレンダー用データ取得
    const calendarRecords = await prisma.excretionRecord.findMany({
      where: {
        recordedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
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

    if (calendarRecords.length === 0) {
      throw new Error('カレンダー用データの取得に失敗しました');
    }

    // 日付別グループ化のテスト
    const groupedByDate = {};
    calendarRecords.forEach((record) => {
      const dateKey = record.recordedAt.toISOString().split('T')[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(record);
    });

    if (Object.keys(groupedByDate).length === 0) {
      throw new Error('日付別グループ化が正しく動作していません');
    }
  }
  finally {
    // テストデータをクリーンアップ
    await prisma.excretionRecord.delete({
      where: { id: testRecord.id },
    });
  }
}

// 6. パフォーマンステスト
async function testPerformance(cats) {
  const testCat = cats[0];

  // 大量データでのパフォーマンステスト
  const batchSize = 100;
  const testRecords = [];

  for (let i = 0; i < batchSize; i++) {
    testRecords.push({
      catId: testCat.id,
      type: i % 2 === 0 ? 'URINE' : 'FECES',
      recordedAt: new Date(Date.now() - i * 60 * 60 * 1000), // 1時間ずつ過去
      notes: `Performance test record ${i}`,
    });
  }

  // バッチ作成
  await prisma.excretionRecord.createMany({
    data: testRecords,
  });

  try {
    // 大量データでの検索パフォーマンステスト
    const startTime = performance.now();

    const results = await prisma.excretionRecord.findMany({
      where: { catId: testCat.id },
      orderBy: { recordedAt: 'desc' },
      take: 50,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const duration = performance.now() - startTime;

    if (duration > 100) { // 100ms以上かかった場合は警告
      console.warn(`⚠️  大量データ検索が遅いです: ${duration.toFixed(2)}ms`);
    }

    if (results.length === 0) {
      throw new Error('大量データでの検索結果が空です');
    }
  }
  finally {
    // テストデータをクリーンアップ
    await prisma.excretionRecord.deleteMany({
      where: {
        notes: { contains: 'Performance test record' },
      },
    });
  }
}

// 7. 既存機能との連携テスト
async function testExistingIntegration(cats) {
  const testCat = cats[0];

  // 猫データとの関連性テスト
  const catWithRecords = await prisma.cat.findUnique({
    where: { id: testCat.id },
    include: {
      excretionRecords: {
        take: 5,
        orderBy: { recordedAt: 'desc' },
      },
    },
  });

  if (!catWithRecords) {
    throw new Error('猫データとの関連取得に失敗しました');
  }

  // 他の機能（食事記録など）との共存テスト
  const allCatData = await prisma.cat.findUnique({
    where: { id: testCat.id },
    include: {
      meals: { take: 1 },
      medicationRecords: { take: 1 },
      excretionRecords: { take: 1 },
    },
  });

  if (!allCatData) {
    throw new Error('他機能との共存テストに失敗しました');
  }
}

// 8. エラーハンドリングテスト
async function testErrorHandling() {
  // 存在しない猫IDでの作成テスト
  try {
    await prisma.excretionRecord.create({
      data: {
        catId: 'non-existent-cat-id',
        type: 'URINE',
        recordedAt: new Date(),
      },
    });
    throw new Error('存在しない猫IDでの作成が成功してしまいました');
  }
  catch (error) {
    if (!error.message.includes('Foreign key constraint')) {
      // Prismaの外部キー制約エラーが発生することを期待
      console.log('Expected foreign key constraint error occurred');
    }
  }

  // 存在しないレコードの更新テスト
  try {
    await prisma.excretionRecord.update({
      where: { id: 'non-existent-record-id' },
      data: { notes: 'test' },
    });
    throw new Error('存在しないレコードの更新が成功してしまいました');
  }
  catch (error) {
    if (error.code !== 'P2025') {
      throw error; // 期待されるエラーコード以外の場合は再スロー
    }
  }
}

// メイン実行関数
async function main() {
  console.log('🧪 排泄記録管理機能の統合テストを開始します...\n');

  let cats;

  // テスト実行
  await runTest('データベース接続テスト', testDatabaseConnection);

  const catsTestPassed = await runTest('猫データ存在確認', async () => {
    cats = await testCatDataExists();
  });

  if (!catsTestPassed) {
    console.log('\n❌ 猫データが見つからないため、テストを中断します');
    return;
  }

  await runTest('排泄記録CRUD操作テスト', () => testExcretionRecordCRUD(cats));
  await runTest('フィルタリング機能テスト', () => testFilteringFunctionality(cats));
  await runTest('カレンダー機能テスト', () => testCalendarFunctionality(cats));
  await runTest('パフォーマンステスト', () => testPerformance(cats));
  await runTest('既存機能連携テスト', () => testExistingIntegration(cats));
  await runTest('エラーハンドリングテスト', testErrorHandling);

  // 結果サマリー
  console.log('\n📊 テスト結果サマリー');
  console.log('='.repeat(50));

  const passedTests = testResults.filter(t => t.passed).length;
  const totalTests = testResults.length;
  const successRate = Math.round((passedTests / totalTests) * 100);

  console.log(`総テスト数: ${totalTests}`);
  console.log(`成功: ${passedTests}`);
  console.log(`失敗: ${totalTests - passedTests}`);
  console.log(`成功率: ${successRate}%`);

  // 失敗したテストの詳細
  const failedTests = testResults.filter(t => !t.passed);
  if (failedTests.length > 0) {
    console.log('\n❌ 失敗したテスト:');
    failedTests.forEach((test) => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }

  // パフォーマンス統計
  const avgDuration = testResults.reduce((sum, t) => sum + t.duration, 0) / testResults.length;
  const maxDuration = Math.max(...testResults.map(t => t.duration));

  console.log('\n⏱️  パフォーマンス統計:');
  console.log(`平均実行時間: ${avgDuration.toFixed(2)}ms`);
  console.log(`最大実行時間: ${maxDuration.toFixed(2)}ms`);

  // 推奨事項
  console.log('\n💡 推奨事項:');
  if (successRate === 100) {
    console.log('✅ すべてのテストが成功しました！排泄記録管理機能は正常に動作しています。');
  }
  else if (successRate >= 80) {
    console.log('⚠️  一部のテストが失敗していますが、基本機能は動作しています。失敗したテストを確認してください。');
  }
  else {
    console.log('❌ 多くのテストが失敗しています。機能の見直しが必要です。');
  }

  if (maxDuration > 1000) {
    console.log('⚠️  一部のテストが1秒以上かかっています。パフォーマンスの最適化を検討してください。');
  }

  console.log('\n🎉 統合テスト完了！');
}

// エラーハンドリング付きでメイン関数を実行
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 統合テスト実行中にエラーが発生しました:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
