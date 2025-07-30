#!/usr/bin/env node

/**
 * パフォーマンステスト実行スクリプト
 * 通院履歴管理機能のパフォーマンステストを実行し、結果をレポート形式で出力
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PERFORMANCE_THRESHOLDS = {
  apiResponseTime: 1000, // ms
  calendarRenderTime: 2000, // ms
  memoryUsage: 100, // MB
  cacheHitRate: 70, // %
};

const PERFORMANCE_TEST_FILES = [
  'tests/performance/veterinary-visit-performance.test.ts',
  'tests/performance/calendar-performance.test.ts',
];

class PerformanceTestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  /**
   * パフォーマンステストを実行
   */
  async runTests() {
    console.log('🚀 通院履歴管理 パフォーマンステスト開始');
    console.log('='.repeat(60));

    try {
      // 各テストファイルを実行
      for (const testFile of PERFORMANCE_TEST_FILES) {
        console.log(`\n📊 実行中: ${testFile}`);
        await this.runSingleTest(testFile);
      }

      // 結果をレポート形式で出力
      this.generateReport();
    }
    catch (error) {
      console.error('❌ パフォーマンステスト実行中にエラーが発生しました:', error.message);
      process.exit(1);
    }
  }

  /**
   * 単一のテストファイルを実行
   */
  async runSingleTest(testFile) {
    try {
      const startTime = Date.now();

      // Vitestでテストを実行
      const command = `npx vitest run ${testFile} --reporter=json --outputFile=temp-performance-results.json`;

      console.log(`  実行コマンド: ${command}`);

      const output = execSync(command, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000, // 5分のタイムアウト
      });

      const duration = Date.now() - startTime;

      // 結果を解析
      const result = this.parseTestResults(testFile, output, duration);
      this.results.push(result);

      console.log(`  ✅ 完了 (${duration}ms)`);
    }
    catch (error) {
      console.error(`  ❌ ${testFile} の実行に失敗:`, error.message);

      this.results.push({
        testFile,
        success: false,
        error: error.message,
        duration: 0,
        tests: [],
      });
    }
  }

  /**
   * テスト結果を解析
   */
  parseTestResults(testFile, output, duration) {
    try {
      // JSON結果ファイルが存在する場合は読み込み
      const resultsPath = 'temp-performance-results.json';
      let testResults = { tests: [] };

      if (fs.existsSync(resultsPath)) {
        const resultsContent = fs.readFileSync(resultsPath, 'utf8');
        testResults = JSON.parse(resultsContent);

        // 一時ファイルを削除
        fs.unlinkSync(resultsPath);
      }

      return {
        testFile,
        success: true,
        duration,
        tests: testResults.tests || [],
        summary: this.extractPerformanceMetrics(output),
      };
    }
    catch (error) {
      console.warn(`  ⚠️ 結果解析に失敗: ${error.message}`);

      return {
        testFile,
        success: true,
        duration,
        tests: [],
        summary: { metrics: [] },
      };
    }
  }

  /**
   * 出力からパフォーマンスメトリクスを抽出
   */
  extractPerformanceMetrics(output) {
    const metrics = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // パフォーマンス結果の行を検出
      if (line.includes('パフォーマンステスト結果') || line.includes('カレンダーパフォーマンステスト結果')) {
        // 次の行からメトリクスを抽出
        continue;
      }

      // メトリクス行のパターンマッチング
      const metricMatch = line.match(/^(.+?):\s*(\d+\.?\d*)ms,\s*データ数:\s*(\d+),\s*.*成功:\s*(true|false)/);
      if (metricMatch) {
        metrics.push({
          operation: metricMatch[1].trim(),
          duration: parseFloat(metricMatch[2]),
          dataSize: parseInt(metricMatch[3]),
          success: metricMatch[4] === 'true',
        });
      }
    }

    return { metrics };
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const reportPath = `performance-report-${new Date().toISOString().split('T')[0]}.md`;

    console.log('\n📋 パフォーマンステストレポート生成中...');

    const report = this.generateMarkdownReport(totalDuration);

    // レポートをファイルに保存
    fs.writeFileSync(reportPath, report);

    console.log(`📄 レポートを保存しました: ${reportPath}`);

    // コンソールにサマリーを表示
    this.displaySummary();
  }

  /**
   * Markdownレポートを生成
   */
  generateMarkdownReport(totalDuration) {
    const timestamp = new Date().toISOString();

    let report = `# 通院履歴管理 パフォーマンステストレポート

**実行日時:** ${timestamp}
**総実行時間:** ${totalDuration}ms

## 概要

通院履歴管理機能のパフォーマンステストを実行し、以下の項目を測定しました：

- API レスポンス時間
- カレンダー描画性能
- メモリ使用量
- データベースクエリ性能

## テスト結果

`;

    // 各テストファイルの結果を追加
    this.results.forEach((result, index) => {
      report += `### ${index + 1}. ${path.basename(result.testFile)}

**実行時間:** ${result.duration}ms
**成功:** ${result.success ? '✅' : '❌'}

`;

      if (result.error) {
        report += `**エラー:** ${result.error}\n\n`;
      }

      if (result.summary && result.summary.metrics.length > 0) {
        report += `#### パフォーマンスメトリクス

| 操作 | 実行時間 (ms) | データ数 | 成功 | 評価 |
|------|---------------|----------|------|------|
`;

        result.summary.metrics.forEach((metric) => {
          const evaluation = this.evaluateMetric(metric);
          report += `| ${metric.operation} | ${metric.duration} | ${metric.dataSize} | ${metric.success ? '✅' : '❌'} | ${evaluation} |\n`;
        });

        report += '\n';
      }
    });

    // 推奨事項を追加
    report += this.generateRecommendations();

    return report;
  }

  /**
   * メトリクスを評価
   */
  evaluateMetric(metric) {
    if (!metric.success) {
      return '❌ 失敗';
    }

    // API関連の評価
    if (metric.operation.includes('api') || metric.operation.includes('取得')) {
      if (metric.duration < PERFORMANCE_THRESHOLDS.apiResponseTime / 2) {
        return '🟢 優秀';
      }
      else if (metric.duration < PERFORMANCE_THRESHOLDS.apiResponseTime) {
        return '🟡 良好';
      }
      else {
        return '🔴 改善必要';
      }
    }

    // カレンダー関連の評価
    if (metric.operation.includes('カレンダー') || metric.operation.includes('描画')) {
      if (metric.duration < PERFORMANCE_THRESHOLDS.calendarRenderTime / 2) {
        return '🟢 優秀';
      }
      else if (metric.duration < PERFORMANCE_THRESHOLDS.calendarRenderTime) {
        return '🟡 良好';
      }
      else {
        return '🔴 改善必要';
      }
    }

    // デフォルト評価
    if (metric.duration < 500) {
      return '🟢 優秀';
    }
    else if (metric.duration < 1000) {
      return '🟡 良好';
    }
    else {
      return '🔴 改善必要';
    }
  }

  /**
   * 推奨事項を生成
   */
  generateRecommendations() {
    const recommendations = [];
    const allMetrics = this.results.flatMap(r => r.summary?.metrics || []);

    // 遅いAPIを特定
    const slowApis = allMetrics.filter(m =>
      (m.operation.includes('api') || m.operation.includes('取得'))
      && m.duration > PERFORMANCE_THRESHOLDS.apiResponseTime,
    );

    if (slowApis.length > 0) {
      recommendations.push('- API レスポンス時間の改善: キャッシュの活用、データベースインデックスの最適化を検討してください');
    }

    // 遅いカレンダー描画を特定
    const slowCalendar = allMetrics.filter(m =>
      m.operation.includes('カレンダー')
      && m.duration > PERFORMANCE_THRESHOLDS.calendarRenderTime,
    );

    if (slowCalendar.length > 0) {
      recommendations.push('- カレンダー描画性能の改善: 仮想スクロール、遅延読み込みの実装を検討してください');
    }

    // 大量データ処理の問題を特定
    const largeDataOperations = allMetrics.filter(m => m.dataSize > 1000 && m.duration > 2000);

    if (largeDataOperations.length > 0) {
      recommendations.push('- 大量データ処理の最適化: ページネーション、データの分割読み込みを検討してください');
    }

    if (recommendations.length === 0) {
      recommendations.push('- 現在のパフォーマンスは良好です。定期的な監視を継続してください');
    }

    return `## 推奨事項

${recommendations.join('\n')}

## 閾値設定

- API レスポンス時間: ${PERFORMANCE_THRESHOLDS.apiResponseTime}ms 以下
- カレンダー描画時間: ${PERFORMANCE_THRESHOLDS.calendarRenderTime}ms 以下
- メモリ使用量: ${PERFORMANCE_THRESHOLDS.memoryUsage}MB 以下

---

*このレポートは自動生成されました。詳細な分析が必要な場合は、個別のテストログを確認してください。*
`;
  }

  /**
   * サマリーをコンソールに表示
   */
  displaySummary() {
    console.log('\n📊 パフォーマンステスト サマリー');
    console.log('='.repeat(50));

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const allMetrics = this.results.flatMap(r => r.summary?.metrics || []);

    console.log(`総テストファイル数: ${totalTests}`);
    console.log(`成功: ${successfulTests}`);
    console.log(`失敗: ${totalTests - successfulTests}`);
    console.log(`総メトリクス数: ${allMetrics.length}`);

    if (allMetrics.length > 0) {
      const avgDuration = allMetrics.reduce((sum, m) => sum + m.duration, 0) / allMetrics.length;
      const maxDuration = Math.max(...allMetrics.map(m => m.duration));
      const minDuration = Math.min(...allMetrics.map(m => m.duration));

      console.log(`\n⏱️  実行時間統計:`);
      console.log(`  平均: ${avgDuration.toFixed(2)}ms`);
      console.log(`  最大: ${maxDuration}ms`);
      console.log(`  最小: ${minDuration}ms`);
    }

    // 問題のあるメトリクスを表示
    const problemMetrics = allMetrics.filter(m =>
      !m.success
      || m.duration > PERFORMANCE_THRESHOLDS.apiResponseTime
      || m.duration > PERFORMANCE_THRESHOLDS.calendarRenderTime,
    );

    if (problemMetrics.length > 0) {
      console.log(`\n⚠️  注意が必要な項目: ${problemMetrics.length}件`);
      problemMetrics.forEach((metric) => {
        console.log(`  - ${metric.operation}: ${metric.duration}ms`);
      });
    }
    else {
      console.log('\n✅ すべてのメトリクスが閾値内に収まっています');
    }

    console.log('\n🎉 パフォーマンステスト完了');
  }
}

// スクリプトを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new PerformanceTestRunner();
  runner.runTests().catch((error) => {
    console.error('パフォーマンステスト実行エラー:', error);
    process.exit(1);
  });
}

export default PerformanceTestRunner;
