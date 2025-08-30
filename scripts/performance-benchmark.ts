#!/usr/bin/env tsx

/**
 * チャートパフォーマンスベンチマークスクリプト
 * 大規模データセットでのパフォーマンステストを実行
 */

import { performance } from 'perf_hooks';
import {
  processChartData,
  transformMealDataForChart,
  processLargeDataset,
  measureProcessingTime,
  optimizeDataForPerformance,
} from '../utils/chart-data-processing';
import type { MealAnalytics } from '../types/cat-meal';

// テストデータ生成
function generateTestData(size: number): MealAnalytics {
  const dailyCalories = [];
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < size; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor(i / 10));

    dailyCalories.push({
      date: date.toISOString().split('T')[0],
      calories: Math.floor(Math.random() * 200) + 100,
      type: (i % 2 === 0 ? 'DRY' : 'WET') as 'DRY' | 'WET',
    });
  }

  return {
    dailyCalories,
    summary: {
      totalMeals: size,
      averageCalories: 150,
      dateRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
    },
  };
}

// メモリ使用量測定
function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0;
}

// ベンチマーク実行
async function runBenchmark() {
  console.log('🚀 チャートパフォーマンスベンチマーク開始\n');

  const testSizes = [100, 500, 1000, 2000, 5000, 10000];
  const results: Array<{
    size: number;
    processingTime: number;
    memoryUsed: number;
    optimizedTime: number;
    optimizedMemory: number;
  }> = [];

  for (const size of testSizes) {
    console.log(`📊 ${size}データポイントのテスト...`);

    const testData = generateTestData(size);
    const memoryBefore = getMemoryUsage();

    // 通常の処理時間測定
    const { duration: processingTime } = measureProcessingTime(() => {
      return processChartData(testData, 'line');
    }, `${size}ポイント処理`);

    const memoryAfter = getMemoryUsage();
    const memoryUsed = memoryAfter - memoryBefore;

    // 最適化処理時間測定
    const memoryBeforeOptimized = getMemoryUsage();
    const { duration: optimizedTime } = measureProcessingTime(() => {
      const optimized = optimizeDataForPerformance(testData, 1000);
      return processChartData(optimized, 'line');
    }, `${size}ポイント最適化処理`);

    const memoryAfterOptimized = getMemoryUsage();
    const optimizedMemory = memoryAfterOptimized - memoryBeforeOptimized;

    results.push({
      size,
      processingTime,
      memoryUsed,
      optimizedTime,
      optimizedMemory,
    });

    console.log(`  通常処理: ${processingTime.toFixed(2)}ms, メモリ: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  最適化処理: ${optimizedTime.toFixed(2)}ms, メモリ: ${(optimizedMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  改善率: ${((processingTime - optimizedTime) / processingTime * 100).toFixed(1)}%\n`);

    // メモリクリーンアップ
    if (global.gc) {
      global.gc();
    }
  }

  // 結果サマリー
  console.log('📈 ベンチマーク結果サマリー');
  console.log('='.repeat(80));
  console.log('サイズ\t通常処理(ms)\t最適化(ms)\t改善率\tメモリ使用量(MB)');
  console.log('-'.repeat(80));

  results.forEach((result) => {
    const improvement = ((result.processingTime - result.optimizedTime) / result.processingTime * 100);
    console.log(
      `${result.size}\t${result.processingTime.toFixed(1)}\t\t${result.optimizedTime.toFixed(1)}\t\t${improvement.toFixed(1)}%\t${(result.memoryUsed / 1024 / 1024).toFixed(2)}`,
    );
  });

  // パフォーマンス要件チェック
  console.log('\n✅ パフォーマンス要件チェック');
  console.log('-'.repeat(40));

  const largeDataResult = results.find(r => r.size >= 1000);
  if (largeDataResult) {
    const meets2SecRequirement = largeDataResult.optimizedTime < 2000;
    const meetsMemoryRequirement = largeDataResult.optimizedMemory < 50 * 1024 * 1024;

    console.log(`1000+データポイント処理時間: ${largeDataResult.optimizedTime.toFixed(2)}ms ${meets2SecRequirement ? '✅' : '❌'} (要件: <2000ms)`);
    console.log(`メモリ使用量: ${(largeDataResult.optimizedMemory / 1024 / 1024).toFixed(2)}MB ${meetsMemoryRequirement ? '✅' : '❌'} (要件: <50MB)`);
  }

  // 推奨設定
  console.log('\n💡 推奨設定');
  console.log('-'.repeat(40));

  const optimalSize = results.find(r => r.optimizedTime > 1000)?.size || 10000;
  console.log(`最適なデータポイント数: ${optimalSize}以下`);
  console.log('大規模データセットでは自動最適化を有効にすることを推奨');

  console.log('\n🎉 ベンチマーク完了!');
}

// スクリプト実行
if (require.main === module) {
  runBenchmark().catch(console.error);
}

export { runBenchmark, generateTestData };
