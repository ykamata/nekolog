#!/usr/bin/env node

/**
 * アナリティクス機能の統合テストスクリプト
 */

const BASE_URL = 'http://localhost:3000';

async function testAnalyticsAPI() {
  console.log('🧪 アナリティクス機能テスト開始\n');

  const tests = [
    {
      name: 'cat1の過去7日間データ',
      url: `${BASE_URL}/api/meals/analytics?catId=cat1&days=7`,
    },
    {
      name: 'cat2の過去30日間データ',
      url: `${BASE_URL}/api/meals/analytics?catId=cat2&days=30`,
    },
    {
      name: 'ドライフードのみフィルター',
      url: `${BASE_URL}/api/meals/analytics?catId=cat1&days=14&foodTypeFilter=DRY`,
    },
    {
      name: 'ウェットフードのみフィルター',
      url: `${BASE_URL}/api/meals/analytics?catId=cat2&days=14&foodTypeFilter=WET`,
    },
    {
      name: '日付範囲指定',
      url: `${BASE_URL}/api/meals/analytics?catId=cat1&startDate=2025-08-01&endDate=2025-08-15`,
    },
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`📊 テスト: ${test.name}`);
      console.log(`   URL: ${test.url}`);

      const response = await fetch(test.url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // データ構造の検証
      if (!data.analytics) {
        throw new Error('analytics プロパティが見つかりません');
      }

      if (!Array.isArray(data.analytics.dailyCalories)) {
        throw new Error('dailyCalories が配列ではありません');
      }

      const dailyCaloriesCount = data.analytics.dailyCalories.length;
      const weeklyAverage = data.analytics.weeklyAverage || 0;
      const foodTypeBreakdown = data.analytics.foodTypeBreakdown || [];

      console.log(`   ✅ 成功: ${dailyCaloriesCount}日分のデータ`);
      console.log(`   📈 週平均: ${weeklyAverage.toFixed(1)} kcal`);
      console.log(`   🍽️  フードタイプ: ${foodTypeBreakdown.length}種類`);

      if (data.summary) {
        console.log(`   📊 総食事回数: ${data.summary.totalMeals}`);
        console.log(`   🔥 総カロリー: ${data.summary.totalCalories.toFixed(1)} kcal`);
      }

      passedTests++;
      console.log('');
    }
    catch (error) {
      console.log(`   ❌ 失敗: ${error.message}`);
      console.log('');
    }
  }

  console.log(`\n📋 テスト結果: ${passedTests}/${totalTests} 成功`);

  if (passedTests === totalTests) {
    console.log('🎉 すべてのテストが成功しました！');
  }
  else {
    console.log('⚠️  一部のテストが失敗しました。');
  }

  return passedTests === totalTests;
}

// パフォーマンステスト
async function testPerformance() {
  console.log('\n⚡ パフォーマンステスト開始');

  const testUrl = `${BASE_URL}/api/meals/analytics?catId=cat1&days=30`;
  const iterations = 5;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    try {
      const response = await fetch(testUrl);
      await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);
      console.log(`   テスト ${i + 1}: ${duration}ms`);
    }
    catch (error) {
      console.log(`   テスト ${i + 1}: エラー - ${error.message}`);
    }
  }

  if (times.length > 0) {
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`\n📊 パフォーマンス結果:`);
    console.log(`   平均応答時間: ${avgTime.toFixed(1)}ms`);
    console.log(`   最短応答時間: ${minTime}ms`);
    console.log(`   最長応答時間: ${maxTime}ms`);

    if (avgTime < 1000) {
      console.log('   ✅ パフォーマンス良好 (1秒未満)');
    }
    else if (avgTime < 3000) {
      console.log('   ⚠️  パフォーマンス普通 (1-3秒)');
    }
    else {
      console.log('   ❌ パフォーマンス要改善 (3秒以上)');
    }
  }
}

// エラーハンドリングテスト
async function testErrorHandling() {
  console.log('\n🚨 エラーハンドリングテスト開始');

  const errorTests = [
    {
      name: '存在しない猫ID',
      url: `${BASE_URL}/api/meals/analytics?catId=nonexistent&days=7`,
      expectedStatus: 400,
    },
    {
      name: '無効な日数',
      url: `${BASE_URL}/api/meals/analytics?catId=cat1&days=invalid`,
      expectedStatus: 400,
    },
    {
      name: '無効な日付形式',
      url: `${BASE_URL}/api/meals/analytics?catId=cat1&startDate=invalid-date`,
      expectedStatus: 400,
    },
    {
      name: '必須パラメータ不足',
      url: `${BASE_URL}/api/meals/analytics`,
      expectedStatus: 400,
    },
  ];

  let passedErrorTests = 0;

  for (const test of errorTests) {
    try {
      console.log(`🔍 エラーテスト: ${test.name}`);

      const response = await fetch(test.url);

      if (response.status === test.expectedStatus) {
        console.log(`   ✅ 期待通りのエラー (${response.status})`);
        passedErrorTests++;
      }
      else {
        console.log(`   ❌ 予期しないステータス: ${response.status} (期待値: ${test.expectedStatus})`);
      }
    }
    catch (error) {
      console.log(`   ❌ テストエラー: ${error.message}`);
    }
  }

  console.log(`\n📋 エラーハンドリング結果: ${passedErrorTests}/${errorTests.length} 成功`);
}

// メイン実行
async function main() {
  try {
    const functionalTestsPassed = await testAnalyticsAPI();
    await testPerformance();
    await testErrorHandling();

    console.log('\n🏁 全テスト完了');

    if (functionalTestsPassed) {
      console.log('✨ アナリティクス機能は正常に動作しています！');
    }
    else {
      console.log('⚠️  アナリティクス機能に問題があります。ログを確認してください。');
      process.exit(1);
    }
  }
  catch (error) {
    process.exit(1);
  }
}

// スクリプト実行
main();
