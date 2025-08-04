<template>
  <div class="meal-chart-container">
    <!-- Chart Controls -->
    <div class="chart-controls mb-4 flex flex-wrap gap-4 items-center">
      <!-- Chart Type Toggle -->
      <div class="chart-type-toggle">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          表示タイプ
          <span class="text-xs text-gray-500 ml-1">
            (設定は自動保存されます)
          </span>
        </label>
        <div class="flex rounded-lg border border-gray-300 overflow-hidden shadow-sm">
          <button
            type="button"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2',
              chartType === 'line'
                ? 'bg-blue-600 text-white shadow-inner'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :title="'線グラフ表示に切り替え'"
            @click="chartType = 'line'"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 border-l border-gray-300 flex items-center gap-2',
              chartType === 'bar'
                ? 'bg-blue-600 text-white shadow-inner'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :title="'積み上げ棒グラフ表示に切り替え'"
            @click="chartType = 'bar'"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
        <label class="block text-sm font-medium text-gray-700 mb-2">
          フードタイプ
          <span
            v-if="chartType === 'bar'"
            class="text-xs text-gray-500"
          >
            （積み上げ表示では無効）
          </span>
        </label>
        <div class="flex rounded-lg border border-gray-300 overflow-hidden shadow-sm">
          <button
            type="button"
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
            @click="setFoodTypeFilter('')"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
            @click="setFoodTypeFilter(FoodType.DRY)"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
            @click="setFoodTypeFilter(FoodType.WET)"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
        <label class="block text-sm font-medium text-gray-700 mb-2">
          期間
        </label>
        <select
          v-model="selectedDays"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
      v-else-if="error"
      class="error-container bg-red-50 border border-red-200 rounded-lg p-6 text-center"
    >
      <div class="error-icon text-red-500 text-4xl mb-4">
        ⚠️
      </div>
      <h3 class="error-title text-lg font-semibold text-red-800 mb-2">
        データの読み込みに失敗しました
      </h3>
      <p class="error-message text-red-700 mb-4">
        {{ error }}
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

    <!-- Data Quality Warning -->
    <div
      v-if="showDataQualityWarning && dataQualityInfo"
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
              データ品質スコア: <strong>{{ dataQualityInfo.score }}/100</strong>
              ({{ dataQualityInfo.level === 'poor' ? '低い' : '普通' }})
            </p>
            <p v-if="dataQualityInfo.anomaliesCount > 0">
              {{ dataQualityInfo.anomaliesCount }}件の異常値が検出され、除外されました。
            </p>
          </div>

          <!-- 推奨事項 -->
          <div
            v-if="dataQualityInfo.recommendations.length > 0"
            class="recommendations mt-3"
          >
            <details class="cursor-pointer">
              <summary class="font-medium text-yellow-800 hover:text-yellow-900">
                改善提案を表示
              </summary>
              <ul class="mt-2 space-y-1 text-sm text-yellow-700 list-disc list-inside">
                <li
                  v-for="recommendation in dataQualityInfo.recommendations"
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
        <canvas
          ref="chartCanvas"
          class="max-w-full h-auto"
          :style="{ height: chartHeight + 'px' }"
        />
      </div>

      <!-- Chart Summary -->
      <div
        v-if="analytics"
        class="chart-summary mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div class="summary-card bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-700">
            総カロリー
          </h3>
          <p class="text-2xl font-bold text-gray-900">
            {{ totalCalories.toFixed(1) }} kcal
          </p>
        </div>
        <div class="summary-card bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-700">
            1日平均
          </h3>
          <p class="text-2xl font-bold text-gray-900">
            {{ averageCaloriesPerDay.toFixed(1) }} kcal
          </p>
        </div>
        <div class="summary-card bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-700">
            週平均
          </h3>
          <p class="text-2xl font-bold text-gray-900">
            {{ analytics.weeklyAverage.toFixed(1) }} kcal
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
            v-for="breakdown in analytics.foodTypeBreakdown"
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
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartConfiguration,
  type ChartData,
} from 'chart.js';
import type { MealAnalytics } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface Props {
  catId?: string;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 400,
});

// Reactive data
const chartCanvas = ref<HTMLCanvasElement>();
const chart = ref<Chart>();
const loading = ref(false);
const error = ref<string>();
const analytics = ref<MealAnalytics>();

// エラーハンドリング強化用の状態
const retryCount = ref(0);
const showDataQualityWarning = ref(false);
const dataQualityInfo = ref<{
  hasIssues: boolean;
  score: number;
  level: string;
  anomaliesCount: number;
  recommendations: string[];
} | null>(null);

// Analytics Store
const analyticsStore = useAnalyticsStore();

// Chart configuration - Analytics Storeから状態を取得
const chartType = computed({
  get: () => analyticsStore.currentChartMode,
  set: (value: 'line' | 'bar') => analyticsStore.setChartDisplayMode(value),
});
const selectedFoodType = ref<FoodType | ''>('');
const selectedDays = ref<number>(30);

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
  return filteredDailyCalories.value.reduce(
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

  const data = filteredDailyCalories.value;
  return data.length > 0 ? totalCalories.value / data.length : 0;
});

// Chart data preparation
const chartData = computed((): ChartData => {
  if (chartType.value === 'line') {
    // Line chart - show filtered data based on food type selection
    const data = filteredDailyCalories.value;
    return {
      labels: data.map(item => item.date),
      datasets: [
        {
          label: 'カロリー (kcal)',
          data: data.map(item => item.calories),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
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
    const allDailyData = analytics.value.dailyCalories;

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

// Chart configuration
const chartConfig = computed((): ChartConfiguration => {
  const isMobile = import.meta.client && window.innerWidth < 768;
  const isTablet = import.meta.client && window.innerWidth >= 768 && window.innerWidth < 1024;
  const isTouchDevice = import.meta.client && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return {
    type: chartType.value,
    data: chartData.value,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // タッチデバイス対応の設定
      interaction: {
        mode: chartType.value === 'bar' ? 'index' : 'nearest',
        axis: 'x',
        intersect: false,
      },
      // タッチ操作の最適化
      onHover: isTouchDevice
        ? undefined
        : (event, activeElements) => {
            if (chartCanvas.value) {
              chartCanvas.value.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
            }
          },
      plugins: {
        title: {
          display: true,
          text: chartType.value === 'bar' ? '食事カロリー推移（積み上げ）' : '食事カロリー推移',
          font: {
            size: isMobile ? 14 : isTablet ? 15 : 16,
          },
          padding: {
            top: isMobile ? 10 : 20,
            bottom: isMobile ? 10 : 20,
          },
        },
        legend: {
          display: chartType.value === 'bar',
          position: isMobile ? 'bottom' : 'top',
          labels: {
            font: {
              size: isMobile ? 11 : isTablet ? 12 : 14,
            },
            padding: isMobile ? 15 : 20,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: {
          mode: chartType.value === 'bar' ? 'index' : 'nearest',
          intersect: false,
          // タッチデバイス用の設定
          enabled: true,
          external: undefined,
          position: 'nearest',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: true,
          titleFont: {
            size: isMobile ? 12 : 14,
          },
          bodyFont: {
            size: isMobile ? 11 : 13,
          },
          padding: isMobile ? 8 : 12,
          callbacks: {
            label: (context) => {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} kcal`;
            },
            // For stacked bar chart, show total in footer
            footer: chartType.value === 'bar'
              ? (tooltipItems) => {
                  const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                  return `合計: ${total.toFixed(1)} kcal`;
                }
              : undefined,
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: !isMobile, // モバイルでは軸タイトルを非表示
            text: '日付',
            font: {
              size: isMobile ? 12 : isTablet ? 13 : 14,
            },
          },
          ticks: {
            font: {
              size: isMobile ? 9 : isTablet ? 10 : 12,
            },
            maxTicksLimit: isMobile ? 4 : isTablet ? 6 : 10,
            maxRotation: isMobile ? 45 : 0,
            minRotation: 0,
          },
          grid: {
            display: !isMobile, // モバイルでは縦線を非表示
          },
          // Enable stacking for bar chart
          ...(chartType.value === 'bar' && { stacked: true }),
        },
        y: {
          display: true,
          title: {
            display: !isMobile, // モバイルでは軸タイトルを非表示
            text: 'カロリー (kcal)',
            font: {
              size: isMobile ? 12 : isTablet ? 13 : 14,
            },
          },
          ticks: {
            font: {
              size: isMobile ? 9 : isTablet ? 10 : 12,
            },
            maxTicksLimit: isMobile ? 5 : 8,
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 1,
          },
          beginAtZero: true,
          // Enable stacking for bar chart
          ...(chartType.value === 'bar' && { stacked: true }),
        },
      },
      // アニメーション設定（パフォーマンス最適化）
      animation: {
        duration: isMobile ? 300 : 750,
        easing: 'easeInOutQuart',
      },
      // タッチデバイス用のイベント設定
      events: isTouchDevice
        ? ['touchstart', 'touchmove', 'touchend', 'mouseout']
        : ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'touchend'],
    },
  };
});

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

// 開発環境判定
const isDevelopment = computed(() => {
  return import.meta.dev;
});

// Methods
async function fetchAnalytics() {
  try {
    loading.value = true;
    error.value = undefined;

    // Analytics Storeを使用してデータを取得（エラーハンドリング強化済み）
    await analyticsStore.fetchAnalytics({
      catId: props.catId,
      startDate: new Date(Date.now() - selectedDays.value * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      foodType: selectedFoodType.value || undefined,
    });

    analytics.value = analyticsStore.analytics || undefined;

    // データ品質情報を更新
    updateDataQualityInfo();

    // 成功時はリトライカウントをリセット
    retryCount.value = 0;
  }
  catch (err) {
    // Analytics Storeのエラー情報を使用
    const storeError = analyticsStore.errorInfo;
    if (storeError) {
      error.value = storeError.userMessage;
      retryCount.value = analyticsStore.retryCount;
    }
    else {
      error.value = 'データの取得に失敗しました';
      retryCount.value++;
    }

    // エラーログを記録
  }
  finally {
    loading.value = false;
  }
}

// データ品質情報を更新
function updateDataQualityInfo() {
  if (!analyticsStore.hasData) {
    dataQualityInfo.value = null;
    showDataQualityWarning.value = false;
    return;
  }

  const hasIssues = analyticsStore.hasDataQualityIssues;
  const score = analyticsStore.dataQualityScore;
  const level = analyticsStore.dataQualityLevel || 'unknown';
  const anomalies = analyticsStore.anomaliesInfo;
  const recommendations = analyticsStore.qualityRecommendations;

  dataQualityInfo.value = {
    hasIssues,
    score,
    level,
    anomaliesCount: anomalies?.anomalies.length || 0,
    recommendations,
  };

  // 品質が低い場合は警告を表示
  showDataQualityWarning.value = hasIssues && (level === 'poor' || level === 'fair');
}

// リトライ機能
async function retryFetch() {
  if (analyticsStore.canRetry) {
    try {
      await analyticsStore.retryLastOperation();
      analytics.value = analyticsStore.analytics || undefined;
      updateDataQualityInfo();
      error.value = undefined;
    }
    catch (err) {
      error.value = analyticsStore.errorMessage || 'リトライに失敗しました';
    }
  }
  else {
    // 手動でのリトライ
    await fetchAnalytics();
  }
}

// フード種別フィルターの設定とリアルタイム更新
function setFoodTypeFilter(foodType: FoodType | '') {
  selectedFoodType.value = foodType;

  // フィルター設定をlocalStorageに永続化
  if (typeof window !== 'undefined' && window.localStorage) {
    if (foodType) {
      localStorage.setItem('analytics-food-type-filter', foodType);
    }
    else {
      localStorage.removeItem('analytics-food-type-filter');
    }
  }

  // チャートをリアルタイムで更新
  nextTick(() => {
    if (analytics.value) {
      updateChart();
    }
  });
}

function createChart() {
  if (!chartCanvas.value) return;

  // Destroy existing chart
  if (chart.value) {
    chart.value.destroy();
  }

  // Create new chart
  chart.value = new Chart(chartCanvas.value, chartConfig.value);
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

function updateChart() {
  if (!chart.value || typeof chart.value.update !== 'function') return;

  const newChartData = chartData.value;

  // 差分レンダリング：データが変更されていない場合はスキップ
  if (!hasDataChanged(newChartData, lastChartData.value)) {
    return;
  }

  // パフォーマンス測定開始
  const updateStartTime = performance.now();

  // 更新をキューに追加（バッチ処理）
  updateQueue.value.push(() => {
    if (!chart.value) return;

    chart.value.data = newChartData;
    if (chartConfig.value.options) {
      chart.value.options = chartConfig.value.options;
    }

    // データ量に応じてアニメーション設定を調整
    const dataPointCount = newChartData.labels?.length || 0;
    const animationMode = dataPointCount > 50 ? 'none' : 'active';

    chart.value.update(animationMode);

    // 最後のデータを保存
    lastChartData.value = JSON.parse(JSON.stringify(newChartData));

    // パフォーマンス測定終了
    const updateEndTime = performance.now();
    const updateTime = updateEndTime - updateStartTime;

    // パフォーマンスメトリクスを更新
    performanceMetrics.value.lastUpdateTime = updateTime;
    performanceMetrics.value.updateCount++;
    performanceMetrics.value.dataPointCount = dataPointCount;

    // 平均更新時間を計算
    const totalTime = performanceMetrics.value.averageUpdateTime * (performanceMetrics.value.updateCount - 1) + updateTime;
    performanceMetrics.value.averageUpdateTime = totalTime / performanceMetrics.value.updateCount;

    // サンプリング適用状況を記録
    const chartDataWithSampling = newChartData as { samplingInfo?: { applied: boolean } };
    performanceMetrics.value.samplingApplied = chartDataWithSampling.samplingInfo?.applied || false;

    // パフォーマンス警告（開発環境のみ）
    if (isDevelopment.value && updateTime > 100) {

    }
  });

  // キューを処理
  processUpdateQueue();
}

async function refreshData() {
  await fetchAnalytics();
}

// Watchers
watch(chartType, (newType) => {
  // Reset food type filter when switching to bar chart
  if (newType === 'bar') {
    selectedFoodType.value = '';
  }

  nextTick(() => {
    if (analytics.value) {
      updateChart();
    }
  });
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

watch(analytics, () => {
  nextTick(() => {
    createChart();
  });
});

// Lifecycle
onMounted(async () => {
  // localStorageから表示設定を復元
  analyticsStore.restoreDisplaySettings();

  // localStorageからフード種別フィルター設定を復元
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedFoodType = localStorage.getItem('analytics-food-type-filter') as FoodType | null;
    if (savedFoodType && (savedFoodType === FoodType.DRY || savedFoodType === FoodType.WET)) {
      selectedFoodType.value = savedFoodType;
    }
  }

  await fetchAnalytics();

  // パフォーマンス最適化：定期的なメモリクリーンアップ（要件6.1対応）
  const memoryOptimizationInterval = setInterval(() => {
    analyticsStore.optimizeMemoryUsage();
  }, 5 * 60 * 1000); // 5分ごと

  // コンポーネント破棄時にインターバルをクリア
  onUnmounted(() => {
    clearInterval(memoryOptimizationInterval);
  });

  // Handle window resize and orientation change for responsive behavior
  if (import.meta.client) {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      // デバウンス処理でパフォーマンス向上
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (chart.value) {
          // チャート設定を再計算してレスポンシブ対応
          const newConfig = chartConfig.value;
          if (newConfig.options) {
            chart.value.options = newConfig.options;
          }
          chart.value.resize();
          chart.value.update('none'); // アニメーションなしで更新
        }
      }, 150);
    };

    const handleOrientationChange = () => {
      // オリエンテーション変更時の処理
      setTimeout(() => {
        if (chart.value) {
          chart.value.resize();
          chart.value.update('none');
        }
      }, 100);
    };

    // タッチデバイスの検出
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // イベントリスナーの追加
    window.addEventListener('resize', handleResize);
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
              chart.value.update('none');
            }
          });
        },
        { threshold: 0.1 },
      );
      observer.observe(chartCanvas.value);
    }

    onUnmounted(() => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      if (isTouchDevice) {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
      if (observer) {
        observer.disconnect();
      }
      if (chart.value) {
        chart.value.destroy();
      }
    });
  }
});

onUnmounted(() => {
  if (chart.value) {
    chart.value.destroy();
  }
});
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

/* フォーカス表示の改善（アクセシビリティ） */
.chart-controls button:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

.date-range-filter select:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
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
