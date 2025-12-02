<template>
  <div class="meal-chart-container">
    <!-- Chart Controls -->
    <div class="chart-controls mb-4 flex flex-wrap gap-4 items-center">
      <!-- Chart Type Toggle -->
      <div class="chart-type-toggle">
        <label
          id="chart-type-label"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          表示タイプ
          <span class="text-xs text-gray-500 ml-1">
            (設定は自動保存されます)
          </span>
        </label>
        <div
          class="flex rounded-lg border border-gray-300 overflow-hidden shadow-sm"
          role="radiogroup"
          aria-labelledby="chart-type-label"
        >
          <button
            type="button"
            role="radio"
            :aria-checked="chartType === 'line'"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2',
              chartType === 'line'
                ? 'bg-blue-600 text-white shadow-inner'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :title="'線グラフ表示に切り替え'"
            aria-label="線グラフ表示"
            :disabled="isTransitioning"
            @click="switchChartType('line')"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 12l3-3 3 3 4-4"
              />
            </svg>
            線グラフ
          </button>
          <button
            type="button"
            role="radio"
            :aria-checked="chartType === 'bar'"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 border-l border-gray-300 flex items-center gap-2',
              chartType === 'bar'
                ? 'bg-blue-600 text-white shadow-inner'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :title="'積み上げ棒グラフ表示に切り替え'"
            aria-label="積み上げ棒グラフ表示"
            :disabled="isTransitioning"
            @click="switchChartType('bar')"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            積み上げ棒グラフ
          </button>
        </div>
      </div>

      <!-- Food Type Filter -->
      <div class="food-type-filter">
        <label
          id="food-type-label"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          フードタイプ
          <span
            v-if="chartType === 'bar'"
            class="text-xs text-gray-500"
          >
            （積み上げ表示では無効）
          </span>
        </label>
        <div
          class="flex rounded-lg border border-gray-300 overflow-hidden shadow-sm"
          role="radiogroup"
          aria-labelledby="food-type-label"
          :aria-disabled="chartType === 'bar'"
        >
          <button
            type="button"
            role="radio"
            :aria-checked="selectedFoodType === ''"
            :disabled="chartType === 'bar'"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1',
              chartType === 'bar'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : selectedFoodType === ''
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :title="chartType === 'bar' ? '積み上げ表示では無効' : 'すべてのフードタイプを表示'"
            aria-label="すべてのフードタイプを表示"
            @click="setFoodTypeFilter('')"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            すべて
          </button>
          <button
            type="button"
            role="radio"
            :aria-checked="selectedFoodType === FoodType.DRY"
            :disabled="chartType === 'bar'"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 border-l border-gray-300 flex items-center gap-2 flex-1',
              chartType === 'bar'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : selectedFoodType === FoodType.DRY
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :title="chartType === 'bar' ? '積み上げ表示では無効' : 'ドライフードのみ表示'"
            aria-label="ドライフードのみ表示"
            @click="setFoodTypeFilter(FoodType.DRY)"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            ドライ
          </button>
          <button
            type="button"
            role="radio"
            :aria-checked="selectedFoodType === FoodType.WET"
            :disabled="chartType === 'bar'"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 border-l border-gray-300 flex items-center gap-2 flex-1',
              chartType === 'bar'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : selectedFoodType === FoodType.WET
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :title="chartType === 'bar' ? '積み上げ表示では無効' : 'ウェットフードのみ表示'"
            aria-label="ウェットフードのみ表示"
            @click="setFoodTypeFilter(FoodType.WET)"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            ウェット
          </button>
        </div>
      </div>

      <!-- Date Range -->
      <div class="date-range-filter">
        <label
          for="date-range-select"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          期間
        </label>
        <select
          id="date-range-select"
          v-model="selectedDays"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          aria-label="表示期間を選択"
          @change="refreshData"
        >
          <option value="7">
            過去7日
          </option>
          <option value="14">
            過去14日
          </option>
          <option value="30">
            過去30日
          </option>
          <option value="60">
            過去60日
          </option>
          <option value="90">
            過去90日
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex justify-center items-center h-64"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
      />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error || chartError"
      class="error-container bg-red-50 border border-red-200 rounded-lg p-6 text-center"
    >
      <div class="error-icon text-red-500 text-4xl mb-4">
        ⚠️
      </div>
      <h3 class="error-title text-lg font-semibold text-red-800 mb-2">
        データの読み込みに失敗しました
      </h3>
      <p class="error-message text-red-700 mb-4">
        {{ error || chartError }}
      </p>

      <!-- エラーの詳細情報（開発環境のみ） -->
      <div
        v-if="isDevelopment && analyticsStore.errorInfo"
        class="error-details bg-red-100 rounded p-3 mb-4 text-left text-sm"
      >
        <details>
          <summary class="cursor-pointer font-medium text-red-800">
            エラー詳細（開発環境）
          </summary>
          <div class="mt-2 space-y-1 text-red-700">
            <div><strong>コード:</strong> {{ analyticsStore.errorInfo.code }}</div>
            <div><strong>重要度:</strong> {{ analyticsStore.errorInfo.severity }}</div>
            <div><strong>時刻:</strong> {{ analyticsStore.errorInfo.timestamp.toLocaleString() }}</div>
            <div v-if="retryCount > 0">
              <strong>リトライ回数:</strong> {{ retryCount }}
            </div>
          </div>
        </details>
      </div>

      <!-- リトライボタン -->
      <div class="error-actions flex flex-col sm:flex-row gap-2 justify-center">
        <button
          type="button"
          class="retry-button px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
          @click="retryFetch"
        >
          <span v-if="loading">再試行中...</span>
          <span v-else-if="analyticsStore.canRetry">再試行 ({{ 3 - retryCount }}/3)</span>
          <span v-else>再試行</span>
        </button>

        <!-- 認証エラーの場合はログインページへのリンクを表示 -->
        <NuxtLink
          v-if="analyticsStore.errorInfo?.code === 'AUTH_ERROR'"
          to="/login"
          class="auth-link px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          ログインページへ
        </NuxtLink>
      </div>
    </div>

    <!-- Real-time Update Status -->
    <div
      v-if="autoRefreshEnabled && lastUpdateTime"
      class="realtime-status bg-green-50 border border-green-200 rounded-lg p-3 mb-4"
    >
      <div class="flex items-center gap-2">
        <div class="status-indicator w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span class="text-sm text-green-800">
          リアルタイム更新中 - 最終更新: {{ lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : '未更新' }}
        </span>
        <button
          type="button"
          class="ml-auto text-xs text-green-600 hover:text-green-800 underline"
          @click="analyticsStore.stopAutoRefresh()"
        >
          停止
        </button>
      </div>
    </div>

    <!-- Data Gap Warning -->
    <div
      v-if="missingDataInfo && missingDataInfo.hasGaps"
      class="data-gap-warning bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4"
    >
      <div class="flex items-start gap-3">
        <div class="warning-icon text-orange-500 text-xl flex-shrink-0">
          📊
        </div>
        <div class="warning-content flex-1">
          <h4 class="warning-title font-semibold text-orange-800 mb-2">
            データ欠損期間があります
          </h4>
          <div class="warning-details text-orange-700 text-sm space-y-1">
            <p>
              データ完全性: <strong>{{ missingDataInfo.completeness }}%</strong>
              ({{ missingDataInfo.totalDays }}日中{{ missingDataInfo.totalDays - missingDataInfo.missingDays }}日分のデータ)
            </p>
            <p v-if="missingDataInfo.longestGap > 0">
              最長欠損期間: <strong>{{ missingDataInfo.longestGap }}日間</strong>
            </p>
          </div>

          <!-- 欠損期間の詳細 -->
          <div
            v-if="missingDataInfo.missingRanges.length > 0"
            class="missing-ranges mt-3"
          >
            <details class="cursor-pointer">
              <summary class="font-medium text-orange-800 hover:text-orange-900">
                欠損期間の詳細を表示 ({{ missingDataInfo.missingRanges.length }}件)
              </summary>
              <ul class="mt-2 space-y-1 text-sm text-orange-700">
                <li
                  v-for="(range, index) in missingDataInfo.missingRanges.slice(0, 5)"
                  :key="index"
                  class="flex justify-between"
                >
                  <span>{{ range.start }} 〜 {{ range.end }}</span>
                  <span class="font-medium">{{ range.days }}日間</span>
                </li>
                <li
                  v-if="missingDataInfo.missingRanges.length > 5"
                  class="text-xs text-orange-600"
                >
                  他{{ missingDataInfo.missingRanges.length - 5 }}件...
                </li>
              </ul>
            </details>
          </div>

          <!-- 警告を閉じるボタン -->
          <button
            type="button"
            class="dismiss-warning mt-3 text-xs text-orange-600 hover:text-orange-800 underline"
            @click="missingDataInfo.hasGaps = false"
          >
            この警告を閉じる
          </button>
        </div>
      </div>
    </div>

    <!-- Data Quality Warning -->
    <div
      v-if="showDataQualityWarning && localDataQualityInfo"
      class="data-quality-warning bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"
    >
      <div class="flex items-start gap-3">
        <div class="warning-icon text-yellow-500 text-xl flex-shrink-0">
          ⚠️
        </div>
        <div class="warning-content flex-1">
          <h4 class="warning-title font-semibold text-yellow-800 mb-2">
            データ品質に関する注意
          </h4>
          <div class="warning-details text-yellow-700 text-sm space-y-1">
            <p>
              データ品質スコア: <strong>{{ localDataQualityInfo.score }}/100</strong>
              ({{ localDataQualityInfo.level === 'poor' ? '低い' : '普通' }})
            </p>
            <p v-if="localDataQualityInfo.anomaliesCount > 0">
              {{ localDataQualityInfo.anomaliesCount }}件の異常値が検出され、除外されました。
            </p>
          </div>

          <!-- 推奨事項 -->
          <div
            v-if="localDataQualityInfo.recommendations.length > 0"
            class="recommendations mt-3"
          >
            <details class="cursor-pointer">
              <summary class="font-medium text-yellow-800 hover:text-yellow-900">
                改善提案を表示
              </summary>
              <ul class="mt-2 space-y-1 text-sm text-yellow-700 list-disc list-inside">
                <li
                  v-for="recommendation in localDataQualityInfo.recommendations"
                  :key="recommendation"
                >
                  {{ recommendation }}
                </li>
              </ul>
            </details>
          </div>

          <!-- 警告を閉じるボタン -->
          <button
            type="button"
            class="dismiss-warning mt-3 text-xs text-yellow-600 hover:text-yellow-800 underline"
            @click="showDataQualityWarning = false"
          >
            この警告を閉じる
          </button>
        </div>
      </div>
    </div>

    <!-- Chart Container -->
    <div
      v-else
      class="chart-wrapper"
    >
      <div class="chart-canvas-container relative">
        <!-- Chart Canvas with Accessibility Support -->
        <canvas
          :id="`meal-chart-${props.catId || 'default'}-${canvasKey}`"
          :key="`chart-canvas-${canvasKey}`"
          ref="chartCanvas"
          class="max-w-full h-auto"
          :style="{ height: chartHeight + 'px' }"
          :aria-label="chartAriaLabel"
          :aria-describedby="chartDescriptionId"
          role="img"
          tabindex="0"
          @keydown="handleChartKeydown"
          @focus="handleChartFocus"
          @blur="handleChartBlur"
        />

        <!-- Screen Reader Description -->
        <div
          :id="chartDescriptionId"
          class="sr-only"
          aria-live="polite"
        >
          {{ chartDescription }}
        </div>

        <!-- Keyboard Navigation Instructions -->
        <div
          v-if="showKeyboardInstructions"
          class="keyboard-instructions absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-10"
          role="tooltip"
        >
          <div class="mb-1">
            <strong>キーボード操作:</strong>
          </div>
          <div>← → : データポイント移動</div>
          <div>↑ ↓ : データセット切り替え</div>
          <div>Enter/Space : 詳細表示</div>
          <div>Esc : 操作終了</div>
        </div>

        <!-- Data Point Details for Screen Readers -->
        <div
          v-if="currentDataPoint"
          class="sr-only"
          aria-live="assertive"
        >
          {{ currentDataPointDescription }}
        </div>
      </div>

      <!-- Chart Summary -->
      <div
        v-if="analytics"
        class="chart-summary mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
        role="region"
        aria-label="チャートサマリー"
      >
        <div
          class="summary-card bg-gray-50 p-4 rounded-lg"
          role="article"
          aria-labelledby="total-calories-title"
        >
          <h3
            id="total-calories-title"
            class="text-sm font-medium text-gray-700"
          >
            総カロリー
          </h3>
          <p
            class="text-2xl font-bold text-gray-900"
            aria-label="総カロリー {{ totalCalories.toFixed(1) }}キロカロリー"
          >
            {{ totalCalories.toFixed(1) }} kcal
          </p>
        </div>
        <div
          class="summary-card bg-gray-50 p-4 rounded-lg"
          role="article"
          aria-labelledby="daily-average-title"
        >
          <h3
            id="daily-average-title"
            class="text-sm font-medium text-gray-700"
          >
            1日平均
          </h3>
          <p
            class="text-2xl font-bold text-gray-900"
            aria-label="1日平均 {{ averageCaloriesPerDay.toFixed(1) }}キロカロリー"
          >
            {{ averageCaloriesPerDay.toFixed(1) }} kcal
          </p>
        </div>
        <div
          class="summary-card bg-gray-50 p-4 rounded-lg"
          role="article"
          aria-labelledby="weekly-average-title"
        >
          <h3
            id="weekly-average-title"
            class="text-sm font-medium text-gray-700"
          >
            週平均
          </h3>
          <p
            class="text-2xl font-bold text-gray-900"
            aria-label="週平均 {{ (analytics?.weeklyAverage || 0).toFixed(1) }}キロカロリー"
          >
            {{ (analytics?.weeklyAverage || 0).toFixed(1) }} kcal
          </p>
        </div>
      </div>

      <!-- Food Type Breakdown -->
      <div
        v-if="analytics && chartType === 'bar'"
        class="food-breakdown mt-4"
      >
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          フードタイプ別内訳（積み上げ表示）
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="breakdown in (analytics?.foodTypeBreakdown || [])"
            :key="breakdown.type"
            class="breakdown-item bg-gray-50 p-4 rounded-lg"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium text-gray-700">
                {{
                  breakdown.type === "DRY" ? "ドライフード" : "ウェットフード"
                }}
              </span>
              <span class="text-lg font-bold text-gray-900">
                {{ breakdown.percentage }}%
              </span>
            </div>
            <div class="text-xs text-gray-600 mb-2">
              合計カロリー: {{ (totalCalories * breakdown.percentage / 100).toFixed(1) }} kcal
            </div>
            <div class="bg-gray-200 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-300"
                :class="
                  breakdown.type === 'DRY' ? 'bg-blue-600' : 'bg-green-600'
                "
                :style="{ width: breakdown.percentage + '%' }"
              />
            </div>
          </div>
        </div>
        <div class="mt-4 p-3 bg-blue-50 rounded-lg">
          <p class="text-sm text-blue-800">
            <strong>積み上げ表示:</strong> 各日のドライフードとウェットフードのカロリーを積み上げて表示しています。
            グラフ上の各セクションをクリックすると詳細が確認できます。
          </p>
        </div>
      </div>

      <!-- Performance Information (開発環境のみ) -->
      <div
        v-if="isDevelopment && performanceMetrics.updateCount > 0"
        class="performance-info mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
      >
        <h4 class="text-sm font-medium text-yellow-800 mb-2">
          パフォーマンス情報（開発環境）
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-yellow-700">
          <div>
            <span class="font-medium">更新回数:</span>
            {{ performanceMetrics.updateCount }}
          </div>
          <div>
            <span class="font-medium">最終更新時間:</span>
            {{ performanceMetrics.lastUpdateTime.toFixed(1) }}ms
          </div>
          <div>
            <span class="font-medium">平均更新時間:</span>
            {{ performanceMetrics.averageUpdateTime.toFixed(1) }}ms
          </div>
          <div>
            <span class="font-medium">データポイント:</span>
            {{ performanceMetrics.dataPointCount }}
          </div>
        </div>
        <div
          v-if="performanceMetrics.samplingApplied"
          class="mt-2 text-xs text-yellow-700"
        >
          <span class="font-medium">⚡ サンプリング適用:</span>
          大量データのためサンプリングが適用されています
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChartData } from 'chart.js';
import type { MealAnalytics } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

// デバウンス関数
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface Props {
  catId?: number;
  height?: number;
  periodDays?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 400,
  periodDays: 30,
});

// Chart.js管理用のcomposable
const { chart, isInitialized, error: chartError, initChart, updateChart: updateChartData, destroyChart, resize } = useChart();

// Reactive data
const chartCanvas = ref<HTMLCanvasElement>();
const canvasKey = ref(0); // Canvas再作成用のキー

// エラーハンドリング強化用の状態
const retryCount = ref(0);
const showDataQualityWarning = ref(false);
const localDataQualityInfo = ref<{
  hasIssues: boolean;
  score: number;
  level: string;
  anomaliesCount: number;
  recommendations: string[];
} | null>(null);

// Analytics Store
const analyticsStore = useAnalyticsStore();

// Use analytics store data directly
const loading = computed(() => analyticsStore.loading);
const error = computed(() => analyticsStore.errorMessage);
const analytics = computed(() => analyticsStore.analytics);

// リアルタイム更新関連の状態
const lastUpdateTime = computed(() => analyticsStore.lastDataUpdate);
const autoRefreshEnabled = computed(() => analyticsStore.autoRefreshEnabled);

// Chart configuration - Analytics Storeから状態を取得
const chartType = computed({
  get: () => analyticsStore.currentChartMode,
  set: (value: 'line' | 'bar') => analyticsStore.setChartDisplayMode(value),
});
const selectedFoodType = ref<FoodType | ''>('');
const selectedDays = ref<number>(props.periodDays);

// チャートタイプ切り替え用の状態管理
const isTransitioning = ref(false);
const transitionDuration = 300; // ミリ秒

/**
 * データフィルタリングとリアルタイム更新機能
 * Requirements: 1.2, 1.3, 4.2 - 猫選択、日付範囲フィルタリング、ローディング状態
 */

// フィルタリング状態管理
const filterState = ref({
  isUpdating: false,
  lastFilterChange: Date.now(),
  pendingUpdates: 0,
});

// デバウンス機能付きのデータ更新
const debouncedRefreshData = debounce(async () => {
  if (filterState.value.isUpdating) {
    filterState.value.pendingUpdates++;
    return;
  }

  try {
    filterState.value.isUpdating = true;
    filterState.value.lastFilterChange = Date.now();

    await refreshData();

    // 保留中の更新があれば実行
    if (filterState.value.pendingUpdates > 0) {
      filterState.value.pendingUpdates = 0;
      setTimeout(() => debouncedRefreshData(), 100);
    }
  }
  finally {
    filterState.value.isUpdating = false;
  }
}, 300);

// propsの変更を監視
watch(() => props.periodDays, (newPeriod) => {
  console.log('MealChart: periodDays変更', { old: selectedDays.value, new: newPeriod });
  selectedDays.value = newPeriod;
  debouncedRefreshData();
});

watch(() => props.catId, (newCatId) => {
  console.log('MealChart: catId変更', { catId: newCatId });
  if (newCatId) {
    debouncedRefreshData();
  }
});

// フードタイプフィルタの変更を監視
watch(selectedFoodType, (newType, oldType) => {
  console.log('MealChart: フードタイプ変更', { old: oldType, new: newType });
  // 線グラフの場合のみリアルタイム更新（積み上げ棒グラフは常に両方表示）
  if (chartType.value === 'line') {
    nextTick(() => {
      updateChartWithCurrentData();
    });
  }
});

// チャートタイプ変更を監視
watch(chartType, async (newType, oldType) => {
  console.log('MealChart: チャートタイプ変更', { old: oldType, new: newType });
  if (oldType && newType !== oldType) {
    await nextTick();
    updateChartWithCurrentData();
  }
});

// Computed properties
const chartHeight = computed(() => {
  // Responsive height based on screen size
  if (import.meta.client) {
    const isMobile = window.innerWidth < 768;
    return isMobile ? 300 : props.height;
  }
  return props.height;
});

const filteredDailyCalories = computed(() => {
  if (!analytics.value) return [];

  let data = analytics.value.dailyCalories;

  // Filter by food type only for line chart
  // Bar chart always shows both types for stacked comparison
  if (chartType.value === 'line' && selectedFoodType.value) {
    data = data.filter(item => item.type === selectedFoodType.value);
  }

  return data;
});

const totalCalories = computed(() => {
  if (chartType.value === 'bar' && analytics.value) {
    // For stacked bar chart, show total from all data
    return analytics.value.dailyCalories.reduce(
      (sum, item) => sum + item.calories,
      0,
    );
  }
  return (filteredDailyCalories.value || []).reduce(
    (sum, item) => sum + item.calories,
    0,
  );
});

const averageCaloriesPerDay = computed(() => {
  if (chartType.value === 'bar' && analytics.value) {
    // For stacked bar chart, calculate from all data grouped by date
    const dateMap = new Map<string, number>();
    analytics.value.dailyCalories.forEach((item) => {
      const current = dateMap.get(item.date) || 0;
      dateMap.set(item.date, current + item.calories);
    });
    const dailyTotals = Array.from(dateMap.values());
    return dailyTotals.length > 0
      ? dailyTotals.reduce((sum, total) => sum + total, 0) / dailyTotals.length
      : 0;
  }

  const data = filteredDailyCalories.value || [];
  return data.length > 0 ? totalCalories.value / data.length : 0;
});

/**
 * チャートタイプ切り替え機能
 * Requirements: 1.1 - 線グラフと積み上げ棒グラフの切り替え
 */
const switchChartType = async (newType: 'line' | 'bar') => {
  if (isTransitioning.value || chartType.value === newType) return;

  try {
    isTransitioning.value = true;

    // フェードアウト効果
    if (chartCanvas.value) {
      chartCanvas.value.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
      chartCanvas.value.style.opacity = '0.3';
    }

    // 短い遅延後にチャートタイプを変更
    await new Promise(resolve => setTimeout(resolve, transitionDuration / 2));

    chartType.value = newType;

    // チャートの再初期化を待つ
    await nextTick();

    // フェードイン効果
    if (chartCanvas.value) {
      chartCanvas.value.style.opacity = '1';
    }
  }
  finally {
    setTimeout(() => {
      isTransitioning.value = false;
      if (chartCanvas.value) {
        chartCanvas.value.style.transition = '';
      }
    }, transitionDuration);
  }
};

// Chart data preparation
const chartData = computed((): ChartData => {
  if (chartType.value === 'line') {
    // Line chart - show filtered data based on food type selection
    const data = filteredDailyCalories.value || [];
    return {
      labels: data.map(item => item.date),
      datasets: [
        {
          label: selectedFoodType.value
            ? (selectedFoodType.value === 'DRY' ? 'ドライフード' : 'ウェットフード')
            : 'カロリー',
          data: data.map(item => item.calories),
          borderColor: selectedFoodType.value === 'WET'
            ? 'rgb(34, 197, 94)'
            : 'rgb(59, 130, 246)',
          backgroundColor: selectedFoodType.value === 'WET'
            ? 'rgba(34, 197, 94, 0.1)'
            : 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }
  else {
    // Stacked bar chart - always show both food types for comparison
    if (!analytics.value) {
      return { labels: [], datasets: [] };
    }

    // Get all daily calories data (not filtered by food type for stacked view)
    const allDailyData = analytics.value.dailyCalories || [];

    // Create a map to aggregate calories by date and food type
    const dateMap = new Map<string, { dry: number; wet: number }>();

    // Initialize all dates with zero values
    allDailyData.forEach((item) => {
      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, { dry: 0, wet: 0 });
      }
    });

    // Aggregate calories by food type for each date
    allDailyData.forEach((item) => {
      const entry = dateMap.get(item.date)!;
      if (item.type === 'DRY') {
        entry.dry += item.calories;
      }
      else if (item.type === 'WET') {
        entry.wet += item.calories;
      }
    });

    // Convert map to sorted arrays
    const sortedEntries = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    const labels = sortedEntries.map(([date]) => date);
    const dryData = sortedEntries.map(([, calories]) => calories.dry);
    const wetData = sortedEntries.map(([, calories]) => calories.wet);

    return {
      labels,
      datasets: [
        {
          label: 'ドライフード (kcal)',
          data: dryData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          stack: 'calories', // Enable stacking
        },
        {
          label: 'ウェットフード (kcal)',
          data: wetData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          stack: 'calories', // Enable stacking
        },
      ],
    };
  }
});

/**
 * リアルタイムチャート更新機能
 * Requirements: 4.2 - ローディング状態とリアルタイム更新
 */
const updateChartWithCurrentData = async () => {
  if (!chart || !isInitialized.value || !chartCanvas.value) {
    return;
  }

  try {
    const startTime = performance.now();

    // 現在のデータでチャート設定を生成
    const config = createResponsiveChartConfig(
      chartType.value,
      chartData.value,
      {
        animation: {
          duration: isTransitioning.value ? 0 : 300,
        },
      },
    );

    // チャートを更新
    await updateChartData(chartData.value, config.options);

    // パフォーマンス測定
    const updateTime = performance.now() - startTime;
    performanceMetrics.value.lastUpdateTime = updateTime;
    performanceMetrics.value.updateCount++;
    performanceMetrics.value.averageUpdateTime
      = (performanceMetrics.value.averageUpdateTime * (performanceMetrics.value.updateCount - 1) + updateTime)
        / performanceMetrics.value.updateCount;
    performanceMetrics.value.dataPointCount = chartData.value.labels?.length || 0;

    console.log('チャート更新完了', {
      type: chartType.value,
      updateTime: updateTime.toFixed(1) + 'ms',
      dataPoints: performanceMetrics.value.dataPointCount,
    });
  }
  catch (err) {
    console.error('チャート更新エラー:', err);
  }
};

// Chart設定はcreateResponsiveChartConfig関数で生成

// パフォーマンス最適化用の状態管理
const lastChartData = ref<ChartData | null>(null);
const updateQueue = ref<(() => void)[]>([]);
const isUpdating = ref(false);
const performanceMetrics = ref({
  lastUpdateTime: 0,
  averageUpdateTime: 0,
  updateCount: 0,
  dataPointCount: 0,
  samplingApplied: false,
});

// データ変更の監視とチャート更新
watch(chartData, async (newData, oldData) => {
  // データが実際に変更された場合のみ更新
  if (JSON.stringify(newData) !== JSON.stringify(oldData)) {
    await nextTick();
    updateChartWithCurrentData();
  }
}, { deep: true });

/**
 * フードタイプフィルタ機能
 * Requirements: 1.2 - 猫選択フィルタリング
 */
const setFoodTypeFilter = (type: FoodType | '') => {
  if (selectedFoodType.value === type) return;

  selectedFoodType.value = type;

  // 線グラフの場合は即座に更新、積み上げ棒グラフの場合は無効
  if (chartType.value === 'line') {
    nextTick(() => {
      updateChartWithCurrentData();
    });
  }
};

/**
 * データ再取得機能
 * Requirements: 1.3 - 日付範囲フィルタリング
 */
const refreshData = async () => {
  try {
    console.log('データ再取得開始', {
      catId: props.catId,
      days: selectedDays.value,
      foodType: selectedFoodType.value,
    });

    // Analytics Storeからデータを取得
    await analyticsStore.fetchAnalytics({
      catId: props.catId,
      days: selectedDays.value,
    });

    console.log('データ再取得完了');
  }
  catch (err) {
    console.error('データ再取得エラー:', err);
  }
};

// 開発環境判定
const isDevelopment = computed(() => {
  return import.meta.dev;
});

// アクセシビリティ関連の状態
const showKeyboardInstructions = ref(false);
const currentDataPoint = ref<{
  datasetIndex: number;
  dataIndex: number;
  value: number;
  label: string;
  datasetLabel: string;
} | null>(null);
const chartDescriptionId = `chart-description-${Math.random().toString(36).substr(2, 9)}`;

// キーボードナビゲーション用の状態
const keyboardNavigation = ref({
  activeDatasetIndex: 0,
  activeDataIndex: 0,
  isNavigating: false,
});

// アクセシビリティ用のcomputed properties
const chartAriaLabel = computed(() => {
  const chartTypeText = chartType.value === 'line' ? '線グラフ' : '積み上げ棒グラフ';
  const foodTypeText = selectedFoodType.value
    ? (selectedFoodType.value === 'DRY' ? 'ドライフード' : 'ウェットフード')
    : 'すべてのフードタイプ';
  const periodText = `過去${selectedDays.value}日間`;

  return `${chartTypeText}による食事カロリー推移。${foodTypeText}の${periodText}のデータを表示。キーボードで操作可能。`;
});

const chartDescription = computed(() => {
  if (!analytics.value || !chartData.value.labels) {
    return 'データを読み込み中です。';
  }

  const dataCount = chartData.value.labels.length;
  const datasetCount = chartData.value.datasets.length;
  const totalCaloriesText = totalCalories.value.toFixed(1);
  const averageCaloriesText = averageCaloriesPerDay.value.toFixed(1);

  let description = `${dataCount}日分のデータを含む${chartType.value === 'line' ? '線グラフ' : '積み上げ棒グラフ'}。`;
  description += `${datasetCount}つのデータセットがあります。`;
  description += `総カロリー: ${totalCaloriesText}kcal、1日平均: ${averageCaloriesText}kcal。`;

  if (chartType.value === 'bar') {
    description += 'ドライフードとウェットフードの内訳を積み上げ表示しています。';
  }

  description += 'キーボードの矢印キーでデータポイントを移動できます。';

  return description;
});

const currentDataPointDescription = computed(() => {
  if (!currentDataPoint.value || !chartData.value.labels) {
    return '';
  }

  const point = currentDataPoint.value;
  const date = chartData.value.labels[point.dataIndex];
  const value = point.value.toFixed(1);
  const datasetLabel = point.datasetLabel;

  return `${date}の${datasetLabel}: ${value}kcal`;
});

// データ欠損情報の取得
const dataQualityInfo = computed(() => analyticsStore.dataQualityInfo);
const missingDataInfo = computed(() => {
  const quality = dataQualityInfo.value;
  if (!quality) return null;

  return {
    hasGaps: quality.hasSignificantGaps,
    missingDays: quality.missingDays,
    totalDays: quality.totalDays,
    completeness: quality.dataCompleteness,
    missingRanges: quality.missingDateRanges || [],
    longestGap: quality.longestMissingPeriod || 0,
  };
});

// Methods
async function fetchAnalytics() {
  try {
    console.log('MealChart: fetchAnalytics開始', {
      catId: props.catId,
      selectedDays: selectedDays.value,
      selectedFoodType: selectedFoodType.value,
    });

    // Analytics Storeを使用してデータを取得（エラーハンドリング強化済み）
    await analyticsStore.fetchAnalytics({
      catId: props.catId,
      startDate: new Date(Date.now() - selectedDays.value * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      foodType: selectedFoodType.value || undefined,
    });

    console.log('MealChart: fetchAnalytics成功', {
      analyticsData: analyticsStore.analytics,
      hasData: analyticsStore.hasData,
    });

    // データ品質情報を更新
    updateDataQualityInfo();

    // 成功時はリトライカウントをリセット
    retryCount.value = 0;
  }
  catch (err) {
    // エラーログを記録
    console.error('MealChart: fetchAnalytics失敗:', err);
    console.error('エラー詳細:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      catId: props.catId,
      selectedDays: selectedDays.value,
    });
  }
}

// データ品質情報を更新
function updateDataQualityInfo() {
  if (!analyticsStore.hasData) {
    localDataQualityInfo.value = null;
    showDataQualityWarning.value = false;
    return;
  }

  const hasIssues = analyticsStore.hasDataQualityIssues;
  const score = analyticsStore.dataQualityScore;
  const level = analyticsStore.dataQualityLevel || 'unknown';
  const anomalies = analyticsStore.anomaliesInfo;
  const recommendations = analyticsStore.qualityRecommendations;

  localDataQualityInfo.value = {
    hasIssues,
    score,
    level,
    anomaliesCount: anomalies?.anomalies?.length || 0,
    recommendations,
  };

  // 品質が低い場合は警告を表示
  showDataQualityWarning.value = hasIssues && level !== 'good' && level !== 'unknown';
}

// リトライ機能
async function retryFetch() {
  if (analyticsStore.canRetry) {
    try {
      await analyticsStore.retryLastOperation();
      updateDataQualityInfo();
    }
    catch (err) {
      console.error('Retry failed:', err);
    }
  }
  else {
    // 手動でのリトライ
    await fetchAnalytics();
  }
}

// 重複した関数定義を削除（上部で既に定義済み）

// Chart破棄処理はuseChart composableに委譲

function recreateCanvas() {
  // Canvas要素を完全に再作成してChart.jsの内部状態をクリア
  destroyChart();
  canvasKey.value++;
  console.log('MealChart: Canvas recreated with key:', canvasKey.value);
}

async function createChart() {
  if (!chartCanvas.value) {
    console.log('MealChart: Canvas not available');
    return;
  }

  if (isInitialized.value) {
    console.log('MealChart: Chart already initialized');
    return;
  }

  try {
    // useChart composableを使用してチャートを初期化
    const config = createResponsiveChartConfig(chartType.value, chartData.value);
    await initChart(chartCanvas.value, config);
    console.log('MealChart: Chart created successfully');
  }
  catch (error) {
    console.error('MealChart: Chart creation failed:', error);

    // Canvas再作成を試行
    recreateCanvas();

    // 次のtickで再試行
    await nextTick();
    if (chartCanvas.value && !isInitialized.value) {
      try {
        const config = createResponsiveChartConfig(chartType.value, chartData.value);
        await initChart(chartCanvas.value, config);
        console.log('MealChart: Chart created successfully after canvas recreation');
      }
      catch (retryError) {
        console.error('MealChart: Chart creation failed even after canvas recreation:', retryError);
      }
    }
  }
}

// 差分レンダリング機能（要件6.1, 6.2対応）
function hasDataChanged(newData: ChartData, oldData: ChartData | null): boolean {
  if (!oldData) return true;

  // ラベル数の変更をチェック
  if (!newData.labels || !oldData.labels) return true;
  if (newData.labels.length !== oldData.labels.length) return true;

  // データセット数の変更をチェック
  if (newData.datasets.length !== oldData.datasets.length) return true;

  // 各データセットの変更をチェック
  for (let i = 0; i < newData.datasets.length; i++) {
    const newDataset = newData.datasets[i];
    const oldDataset = oldData.datasets[i];

    if (!oldDataset || !newDataset) return true;
    if (newDataset.label !== oldDataset.label) return true;
    if (!newDataset.data || !oldDataset.data) return true;
    if (newDataset.data.length !== oldDataset.data.length) return true;

    // データ値の変更をチェック（浮動小数点の比較）
    for (let j = 0; j < newDataset.data.length; j++) {
      const newValue = newDataset.data[j] as number;
      const oldValue = oldDataset.data[j] as number;
      if (Math.abs(newValue - oldValue) > 0.01) return true; // 0.01kcal以上の差があれば更新
    }
  }

  return false;
}

// 更新キューの処理（パフォーマンス最適化）
function processUpdateQueue() {
  if (isUpdating.value || updateQueue.value.length === 0) return;

  isUpdating.value = true;

  // 複数の更新要求をバッチ処理
  const updates = [...updateQueue.value];
  updateQueue.value = [];

  // 最新の更新のみ実行（中間の更新をスキップ）
  const latestUpdate = updates[updates.length - 1];
  if (latestUpdate) {
    latestUpdate();
  }

  // 次のフレームで更新完了をマーク
  requestAnimationFrame(() => {
    isUpdating.value = false;
    // キューに新しい更新があれば再処理
    if (updateQueue.value.length > 0) {
      processUpdateQueue();
    }
  });
}

async function updateChart() {
  if (!chart.value) {
    console.log('MealChart: Chart not available for update');
    return;
  }

  const newChartData = chartData.value;

  // データが空の場合はスキップ
  if (!newChartData.labels || newChartData.labels.length === 0) {
    console.log('MealChart: No data to update chart');
    return;
  }

  // 差分レンダリング：データが変更されていない場合はスキップ
  if (!hasDataChanged(newChartData, lastChartData.value)) {
    return;
  }

  // パフォーマンス測定開始
  const updateStartTime = performance.now();

  // 更新をキューに追加（バッチ処理）
  updateQueue.value.push(async () => {
    try {
      // useChart composableを使用してチャートを更新
      await updateChartData(newChartData);

      // 最後のデータを保存
      lastChartData.value = JSON.parse(JSON.stringify(newChartData));

      // パフォーマンス測定終了
      const updateEndTime = performance.now();
      const updateTime = updateEndTime - updateStartTime;

      // パフォーマンスメトリクスを更新
      performanceMetrics.value.lastUpdateTime = updateTime;
      performanceMetrics.value.updateCount++;
      performanceMetrics.value.dataPointCount = newChartData.labels?.length || 0;

      // 平均更新時間を計算
      const totalTime = performanceMetrics.value.averageUpdateTime * (performanceMetrics.value.updateCount - 1) + updateTime;
      performanceMetrics.value.averageUpdateTime = totalTime / performanceMetrics.value.updateCount;

      // サンプリング適用状況を記録
      const chartDataWithSampling = newChartData as { samplingInfo?: { applied: boolean } };
      performanceMetrics.value.samplingApplied = chartDataWithSampling.samplingInfo?.applied || false;

      // パフォーマンス警告（開発環境のみ）
      if (isDevelopment.value && updateTime > 100) {
        console.warn(`MealChart: 更新時間が長すぎます: ${updateTime.toFixed(1)}ms`);
      }
    }
    catch (error) {
      console.error('MealChart: Chart update failed:', error);
    }
  });

  // キューを処理
  processUpdateQueue();
}

// 重複したrefreshData関数を削除（上部で既に定義済み）

// アクセシビリティ関連のメソッド
function handleChartFocus() {
  showKeyboardInstructions.value = true;
  keyboardNavigation.value.isNavigating = true;

  // 初期データポイントを設定
  if (chartData.value.labels && chartData.value.labels.length > 0) {
    updateCurrentDataPoint(0, 0);
  }
}

function handleChartBlur() {
  showKeyboardInstructions.value = false;
  keyboardNavigation.value.isNavigating = false;
  currentDataPoint.value = null;
}

function handleChartKeydown(event: KeyboardEvent) {
  if (!keyboardNavigation.value.isNavigating || !chartData.value.labels) {
    return;
  }

  const maxDataIndex = chartData.value.labels.length - 1;
  const maxDatasetIndex = chartData.value.datasets.length - 1;

  let { activeDatasetIndex, activeDataIndex } = keyboardNavigation.value;
  let handled = true;

  switch (event.key) {
    case 'ArrowLeft':
      // 前のデータポイントに移動
      activeDataIndex = Math.max(0, activeDataIndex - 1);
      break;

    case 'ArrowRight':
      // 次のデータポイントに移動
      activeDataIndex = Math.min(maxDataIndex, activeDataIndex + 1);
      break;

    case 'ArrowUp':
      // 前のデータセットに移動（積み上げ棒グラフの場合）
      if (chartType.value === 'bar' && maxDatasetIndex > 0) {
        activeDatasetIndex = Math.max(0, activeDatasetIndex - 1);
      }
      break;

    case 'ArrowDown':
      // 次のデータセットに移動（積み上げ棒グラフの場合）
      if (chartType.value === 'bar' && maxDatasetIndex > 0) {
        activeDatasetIndex = Math.min(maxDatasetIndex, activeDatasetIndex + 1);
      }
      break;

    case 'Enter':
    case ' ':
      // 現在のデータポイントの詳細を表示
      announceDataPointDetails();
      break;

    case 'Home':
      // 最初のデータポイントに移動
      activeDataIndex = 0;
      activeDatasetIndex = 0;
      break;

    case 'End':
      // 最後のデータポイントに移動
      activeDataIndex = maxDataIndex;
      activeDatasetIndex = maxDatasetIndex;
      break;

    case 'Escape':
      // キーボードナビゲーションを終了
      if (chartCanvas.value) {
        chartCanvas.value.blur();
      }
      break;

    default:
      handled = false;
  }

  if (handled) {
    event.preventDefault();
    keyboardNavigation.value.activeDatasetIndex = activeDatasetIndex;
    keyboardNavigation.value.activeDataIndex = activeDataIndex;
    updateCurrentDataPoint(activeDatasetIndex, activeDataIndex);

    // チャート上でのハイライト表示
    highlightDataPoint(activeDatasetIndex, activeDataIndex);
  }
}

function updateCurrentDataPoint(datasetIndex: number, dataIndex: number) {
  if (!chartData.value.labels || !chartData.value.datasets[datasetIndex]) {
    return;
  }

  const dataset = chartData.value.datasets[datasetIndex];
  const value = dataset.data[dataIndex] as number;
  const label = chartData.value.labels[dataIndex] as string;

  currentDataPoint.value = {
    datasetIndex,
    dataIndex,
    value,
    label,
    datasetLabel: dataset.label || '',
  };
}

function highlightDataPoint(datasetIndex: number, dataIndex: number) {
  if (!chart.value) return;

  // 既存のハイライトをクリア
  chart.value.setActiveElements([]);

  // 新しいデータポイントをハイライト
  chart.value.setActiveElements([{
    datasetIndex,
    index: dataIndex,
  }]);

  chart.value.update('none');
}

function announceDataPointDetails() {
  if (!currentDataPoint.value) return;

  const point = currentDataPoint.value;
  const announcement = `詳細: ${point.label}の${point.datasetLabel}は${point.value.toFixed(1)}キロカロリーです。`;

  // スクリーンリーダー用の詳細情報を更新
  const detailsElement = document.createElement('div');
  detailsElement.setAttribute('aria-live', 'assertive');
  detailsElement.className = 'sr-only';
  detailsElement.textContent = announcement;

  if (chartCanvas.value?.parentElement) {
    chartCanvas.value.parentElement.appendChild(detailsElement);

    // 少し遅れて要素を削除
    setTimeout(() => {
      if (detailsElement.parentElement) {
        detailsElement.parentElement.removeChild(detailsElement);
      }
    }, 1000);
  }
}

// Watchers
watch(chartType, async (newType) => {
  // Reset food type filter when switching to bar chart
  if (newType === 'bar') {
    selectedFoodType.value = '';
  }

  await nextTick();
  if (analytics.value) {
    // チャートタイプ変更時はCanvas再作成
    recreateCanvas();
    await nextTick();
    await createChart();
  }
});

watch(selectedFoodType, (newFoodType, oldFoodType) => {
  // フィルター変更時のリアルタイム更新
  if (newFoodType !== oldFoodType) {
    nextTick(() => {
      if (analytics.value) {
        updateChart();
      }
    });
  }
});

watch(analytics, async (newAnalytics, oldAnalytics) => {
  // 初回マウント時は手動でチャートを作成するのでスキップ
  if (!oldAnalytics && newAnalytics) {
    return;
  }

  if (newAnalytics && newAnalytics.dailyCalories.length > 0) {
    await nextTick();
    if (chart.value && isInitialized.value) {
      await updateChart();
    }
    else {
      // Canvas再作成してからチャート作成
      recreateCanvas();
      await nextTick();
      await createChart();
    }
  }
}, { immediate: false });

// リアルタイム更新の監視
watch(lastUpdateTime, (newTime) => {
  if (newTime && analytics.value) {
    nextTick(() => {
      updateChart();
    });
  }
});

/**
 * コンポーネントライフサイクル管理
 * Requirements: 2.1, 4.2 - Chart.js初期化とローディング状態
 */
onMounted(async () => {
  console.log('MealChart: onMounted開始', { catId: props.catId, periodDays: props.periodDays });

  // チャート状態をリセット
  canvasKey.value = 0;
  retryCount.value = 0;

  // Chart.jsの初期化を待つ
  await nextTick();

  // localStorageから表示設定を復元
  analyticsStore.restoreDisplaySettings();

  // localStorageからフード種別フィルター設定を復元
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedFoodType = localStorage.getItem('analytics-food-type-filter') as FoodType | null;
    if (savedFoodType && (savedFoodType === FoodType.DRY || savedFoodType === FoodType.WET)) {
      selectedFoodType.value = savedFoodType;
    }
  }

  // catIdが設定されている場合のみデータを取得
  if (props.catId) {
    try {
      await refreshData();

      // データ取得後にチャートを初期化
      await nextTick();
      if (analytics.value && analytics.value.dailyCalories.length > 0 && chartCanvas.value) {
        const config = createResponsiveChartConfig(chartType.value, chartData.value);
        await initChart(chartCanvas.value, config);
      }
    }
    catch (error) {
      console.error('MealChart: 初期データ取得エラー:', error);
    }
  }
  else {
    console.log('MealChart: catIdが未設定のため、データ取得をスキップ');
  }

  // パフォーマンス最適化：定期的なメモリクリーンアップ
  const memoryOptimizationInterval = setInterval(() => {
    if (analyticsStore.optimizeMemoryUsage) {
      analyticsStore.optimizeMemoryUsage();
    }
  }, 5 * 60 * 1000); // 5分ごと

  // コンポーネント破棄時にインターバルをクリア
  const cleanupInterval = () => {
    clearInterval(memoryOptimizationInterval);
  };

  // Handle window resize and orientation change for responsive behavior
  if (import.meta.client) {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      // デバウンス処理でパフォーマンス向上
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (chart.value) {
          // useChart composableのresize機能を使用
          resize();
        }
      }, 150);
    };

    const handleOrientationChange = () => {
      // オリエンテーション変更時の処理
      setTimeout(() => {
        if (chart.value) {
          resize();
        }
      }, 100);
    };

    // タッチデバイスの検出
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // リアルタイム更新イベントリスナー
    const handleDataUpdate = (event: CustomEvent) => {

      // チャートの更新は watch で自動的に行われる
    };

    // イベントリスナーの追加
    window.addEventListener('resize', handleResize);
    window.addEventListener('analytics-data-updated', handleDataUpdate as EventListener);
    if (isTouchDevice) {
      window.addEventListener('orientationchange', handleOrientationChange);
    }

    // Intersection Observer for performance optimization
    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window && chartCanvas.value) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && chart.value) {
              // チャートが表示されている時のみ更新
              resize();
            }
          });
        },
        { threshold: 0.1 },
      );
      observer.observe(chartCanvas.value);
    }

    const cleanupEventListeners = () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('analytics-data-updated', handleDataUpdate as EventListener);
      if (isTouchDevice) {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
      if (observer) {
        observer.disconnect();
      }
    };

    onUnmounted(() => {
      cleanupInterval();
      cleanupEventListeners();
      destroyChart(); // useChart composableのdestroyChart関数を使用

      // Canvas要素を完全にリセット
      canvasKey.value++;
    });
  }
});

// onUnmountedは上記で統合済み
</script>

<style scoped>
.meal-chart-container {
  @apply w-full;
}

.chart-controls {
  @apply flex-wrap gap-4;
}

/* タブレット対応 */
@media (max-width: 1024px) and (min-width: 769px) {
  .chart-controls {
    @apply gap-3;
  }

  .chart-controls > div {
    @apply flex-1 min-w-0;
  }

  .food-type-filter .flex {
    @apply text-sm;
  }

  .food-type-filter button {
    @apply px-3 py-2;
  }

  .chart-type-toggle button {
    @apply px-3 py-2;
  }
}

/* モバイル対応 */
@media (max-width: 768px) {
  .chart-controls {
    @apply flex-col gap-3;
  }

  .chart-controls > div {
    @apply w-full;
  }

  .food-type-filter .flex {
    @apply text-xs;
  }

  .food-type-filter button {
    @apply px-2 py-2 text-xs;
  }

  .food-type-filter svg {
    @apply w-3 h-3;
  }

  .chart-type-toggle button {
    @apply px-3 py-2 text-xs;
  }

  .chart-type-toggle svg {
    @apply w-3 h-3;
  }

  /* モバイルでのラベル調整 */
  .chart-controls label {
    @apply text-sm font-medium;
  }

  .date-range-filter select {
    @apply text-sm py-2;
  }
}

/* 小さなモバイル画面対応 */
@media (max-width: 480px) {
  .chart-controls {
    @apply gap-2;
  }

  .food-type-filter button,
  .chart-type-toggle button {
    @apply px-2 py-1.5 text-xs;
  }

  .food-type-filter svg,
  .chart-type-toggle svg {
    @apply w-2.5 h-2.5;
  }

  .chart-controls label {
    @apply text-xs;
  }

  .date-range-filter select {
    @apply text-xs py-1.5;
  }
}

.chart-canvas-container {
  @apply relative w-full;
  /* タッチデバイス用の設定 */
  touch-action: pan-x pan-y;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* チャートキャンバスのタッチ最適化 */
.chart-canvas-container canvas {
  @apply max-w-full h-auto;
  /* タッチ操作の改善 */
  touch-action: manipulation;
}

.chart-summary {
  @apply grid gap-4;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

/* タブレット対応 */
@media (max-width: 1024px) and (min-width: 769px) {
  .chart-summary {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* モバイル対応 */
@media (max-width: 768px) {
  .chart-summary {
    @apply grid-cols-1 gap-3;
  }

  .summary-card {
    @apply p-3;
  }

  .summary-card h3 {
    @apply text-xs;
  }

  .summary-card p {
    @apply text-lg;
  }
}

/* 小さなモバイル画面対応 */
@media (max-width: 480px) {
  .chart-summary {
    @apply gap-2;
  }

  .summary-card {
    @apply p-2;
  }

  .summary-card h3 {
    @apply text-xs;
  }

  .summary-card p {
    font-size: 1rem;
    line-height: 1.5rem;
  }
}

.summary-card {
  @apply bg-gray-50 p-4 rounded-lg;
}

.food-breakdown {
  @apply mt-4;
}

.breakdown-item {
  @apply bg-gray-50 p-4 rounded-lg;
}

/* タブレット対応 */
@media (max-width: 1024px) and (min-width: 769px) {
  .food-breakdown {
    @apply mt-3;
  }

  .breakdown-item {
    @apply p-3;
  }

  .food-breakdown h3 {
    font-size: 1rem;
    line-height: 1.5rem;
  }
}

/* モバイル対応 */
@media (max-width: 768px) {
  .food-breakdown {
    @apply mt-3;
  }

  .breakdown-item {
    @apply p-3;
  }

  .food-breakdown h3 {
    @apply text-sm mb-2;
  }

  .food-breakdown .grid {
    @apply grid-cols-1 gap-3;
  }

  .breakdown-item .text-lg {
    font-size: 1rem;
    line-height: 1.5rem;
  }

  .breakdown-item .text-xs {
    font-size: 0.75rem;
    line-height: 1rem;
  }
}

/* 小さなモバイル画面対応 */
@media (max-width: 480px) {
  .food-breakdown {
    @apply mt-2;
  }

  .breakdown-item {
    @apply p-2;
  }

  .food-breakdown h3 {
    font-size: 0.75rem;
    line-height: 1rem;
    @apply mb-1;
  }

  .breakdown-item .text-base {
    @apply text-sm;
  }

  .breakdown-item .text-xs {
    font-size: 0.75rem;
    line-height: 1rem;
  }
}

/* ローディング状態のレスポンシブ対応 */
@media (max-width: 768px) {
  .loading-container {
    @apply h-48;
  }

  .loading-container .animate-spin {
    @apply h-6 w-6;
  }
}

/* エラー状態のレスポンシブ対応 */
@media (max-width: 768px) {
  .error-container {
    @apply p-3;
  }

  .error-container button {
    @apply px-3 py-2 text-sm;
  }
}

/* 高コントラストモード対応 */
@media (prefers-contrast: high) {
  .chart-controls button {
    @apply border-2 border-gray-800;
  }

  .chart-controls button:hover {
    @apply bg-gray-800 text-white;
  }

  .summary-card,
  .breakdown-item {
    @apply border-2 border-gray-800;
  }
}

/* 動きを減らす設定に対応 */
@media (prefers-reduced-motion: reduce) {
  .chart-controls button {
    @apply transition-none;
  }

  .breakdown-item .h-2 > div {
    @apply transition-none;
  }
}

/* アクセシビリティ対応 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* キーボードナビゲーション用のスタイル */
.keyboard-instructions {
  font-family: monospace;
  line-height: 1.4;
  max-width: 200px;
  z-index: 1000;
}

/* チャートキャンバスのフォーカス表示 */
.chart-canvas-container canvas:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
  outline-offset: 2px;
}

/* フォーカス表示の改善（アクセシビリティ） */
.chart-controls button:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

.date-range-filter select:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

/* ハイコントラストモード対応 */
@media (prefers-contrast: high) {
  .keyboard-instructions {
    background-color: black !important;
    color: white !important;
    border: 2px solid white;
  }

  .chart-canvas-container canvas:focus {
    outline: 3px solid #ffffff;
    outline-offset: 2px;
  }
}

/* タッチターゲットサイズの確保 */
@media (max-width: 768px) {
  .chart-controls button {
    min-height: 44px;
    min-width: 44px;
  }

  .date-range-filter select {
    min-height: 44px;
  }
}
</style>
