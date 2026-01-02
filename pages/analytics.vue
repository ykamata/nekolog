<script setup lang="ts">
import type { Cat, MealAnalytics } from '~/types/cat-meal';

// Chart filters type definition
interface DateRange {
  start: Date;
  end: Date;
}

interface ChartFilters {
  catId?: number;
  dateRange: DateRange;
  chartType: 'line' | 'stacked-bar';
}

// Page meta
useSeoMeta({
  title: 'データ分析 - 猫の健康管理',
  description: '猫の食事データを分析・可視化します',
});

// Require authentication (temporarily disabled for testing)
// definePageMeta({
//   middleware: 'auth',
// });

// Client-side only rendering to avoid SSR issues
definePageMeta({
  ssr: false,
});

// State
const cats = ref<Cat[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const summaryAnalytics30Days = ref<MealAnalytics | null>(null);
const hasFetchedSummary = ref(false);

// Chart filters state
const chartFilters = ref<ChartFilters>({
  catId: undefined,
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
    end: new Date(),
  },
  chartType: 'line',
});

// Analytics Store
const analyticsStore = useAnalyticsStore();

// Chart container references
const chartContainerRef = ref<HTMLElement>();

// Computed
const selectedCat = computed(() =>
  cats.value.find(cat => cat.id === chartFilters.value.catId),
);

const selectedPeriodDays = computed(() => {
  const diffTime = chartFilters.value.dateRange.end.getTime() - chartFilters.value.dateRange.start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const fetchSummary30DaysOnce = async (catId?: number) => {
  if (hasFetchedSummary.value || !catId) return;

  const end = new Date();
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const response = await $fetch<{ analytics: MealAnalytics }>('/api/meals/analytics', {
      params: {
        catId,
        startDate: formatLocalDateTime(start),
        endDate: formatLocalDateTime(end),
      },
    });
    summaryAnalytics30Days.value = response.analytics;
    hasFetchedSummary.value = true;
  }
  catch (err) {
    console.error('Analytics page: 30日サマリー取得失敗', err);
  }
};

// Fetch cats data
const fetchCats = async () => {
  // Client-side only
  if (!import.meta.client) {
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<Cat[]>('/api/cats');
    cats.value = response;

    // Set first cat as default if available
    if (cats.value.length > 0 && !chartFilters.value.catId) {
      chartFilters.value.catId = cats.value[0]?.id;
      // Analytics storeにも設定
      if (chartFilters.value.catId) {
        analyticsStore.setSelectedCat(chartFilters.value.catId);
      }
      // データ取得はChartFiltersコンポーネントとMealChartSimpleコンポーネントが行うため、ここでは呼び出さない
      await fetchSummary30DaysOnce(chartFilters.value.catId);
    }
  }
  catch (err) {
    console.error('Analytics page: fetchCats失敗:', err);
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Handle chart filters change
const handleFiltersChange = async (filters: ChartFilters) => {
  chartFilters.value = { ...filters };

  // Analytics storeに設定を反映
  if (filters.catId) {
    analyticsStore.setSelectedCat(filters.catId);
  }
  analyticsStore.setDateRange(filters.dateRange.start, filters.dateRange.end);

  // チャートタイプの変換と設定
  const displayMode = filters.chartType === 'stacked-bar' ? 'bar' : 'line';
  analyticsStore.setChartDisplayMode(displayMode);

  // データを再取得
  // データ取得はチャート側に任せる（重複取得を避ける）
};

// イベントリスナーとオブザーバーの管理
let orientationChangeHandler: (() => void) | null = null;
let intersectionObserver: IntersectionObserver | null = null;

// Lifecycle
onMounted(async () => {
  try {
    await fetchCats();

    // 初期期間を設定
    analyticsStore.setDateRange(chartFilters.value.dateRange.start, chartFilters.value.dateRange.end);
    analyticsStore.setChartDisplayMode(chartFilters.value.chartType === 'stacked-bar' ? 'bar' : chartFilters.value.chartType);

  }
  catch (err) {
    // エラーは fetchCats 内で処理済み
  }

  // タッチデバイスの検出とレスポンシブ対応
  if (import.meta.client) {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // タッチデバイス用のクラスを追加
    if (isTouchDevice) {
      document.documentElement.classList.add('touch-device');
    }

    // オリエンテーション変更時の処理
    if (isTouchDevice) {
      orientationChangeHandler = () => {
        // オリエンテーション変更後の再描画を遅延実行
        setTimeout(() => {
          // チャートコンテナのサイズ調整をトリガー
          if (chartContainerRef.value) {
            const event = new Event('resize');
            window.dispatchEvent(event);
          }
        }, 100);
      };

      window.addEventListener('orientationchange', orientationChangeHandler);
    }

    // Intersection Observer for performance optimization
    nextTick(() => {
      if ('IntersectionObserver' in window && chartContainerRef.value) {
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                // チャートが表示されている時のみ処理を実行
                entry.target.classList.add('chart-visible');
              }
              else {
                entry.target.classList.remove('chart-visible');
              }
            });
          },
          { threshold: 0.1 },
        );
        intersectionObserver.observe(chartContainerRef.value);
      }
    });
  }
});

// コンポーネント破棄時のクリーンアップ
onUnmounted(() => {
  // リアルタイム更新を停止
  analyticsStore.stopAutoRefresh();

  // イベントリスナーを削除
  if (orientationChangeHandler) {
    window.removeEventListener('orientationchange', orientationChangeHandler);
  }

  // Intersection Observerを切断
  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }
});
</script>

<template>
  <div class="analytics-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1
            id="main-title"
            class="page-title"
          >
            データ分析
          </h1>
          <p
            class="page-description"
            aria-describedby="main-title"
          >
            猫の食事データを分析・可視化します
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="loading-container"
    >
      <div class="loading-spinner" />
      <p class="loading-text">
        データを読み込み中...
      </p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="error-container"
    >
      <div class="error-content">
        <div class="error-icon">
          ⚠️
        </div>
        <h2 class="error-title">
          エラーが発生しました
        </h2>
        <p class="error-message">
          {{ error }}
        </p>
        <button
          type="button"
          class="retry-button"
          @click="fetchCats"
        >
          再試行
        </button>
      </div>
    </div>

    <!-- No Cats State -->
    <div
      v-else-if="cats.length === 0"
      class="empty-state"
    >
      <div class="empty-content">
        <div class="empty-icon">
          🐱
        </div>
        <h2 class="empty-title">
          猫が登録されていません
        </h2>
        <p class="empty-message">
          データ分析を行うには、まず猫を登録してください。
        </p>
        <NuxtLink
          to="/cats"
          class="empty-action"
        >
          猫を登録する
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <div
      v-else
      class="page-content"
    >
      <!-- Error Boundary Wrapper -->
      <ErrorBoundary
        context="データ分析"
        @retry="fetchCats"
      >
        <!-- Chart Filters Section -->
        <div
          class="filters-section"
          role="region"
          aria-label="フィルター設定"
        >
          <ChartFilters
            v-model="chartFilters"
            @change="handleFiltersChange"
          />
        </div>

        <!-- Chart Section -->
        <div
          class="chart-section"
          role="region"
          aria-labelledby="chart-section-title"
        >
          <div class="chart-header">
            <h2
              id="chart-section-title"
              class="chart-title"
            >
              {{ selectedCat?.name }}の食事データ
            </h2>
            <p
              class="chart-subtitle"
              aria-describedby="chart-section-title"
            >
              {{ selectedPeriodDays }}日間の推移
            </p>
          </div>

          <!-- Enhanced Chart Container -->
          <div
            ref="chartContainerRef"
            class="chart-container"
            role="img"
            :aria-label="`${selectedCat?.name}の${selectedPeriodDays}日間の食事データチャート`"
          >
            <ClientOnly>
              <MealChartSimple
                v-if="chartFilters.catId"
                :cat-id="chartFilters.catId"
                :height="400"
                :period-days="selectedPeriodDays"
                :summary-analytics="summaryAnalytics30Days"
              />
              <template #fallback>
                <div class="loading-container">
                  <div class="loading-spinner" />
                  <p class="loading-text">
                    チャートを読み込み中...
                  </p>
                </div>
              </template>
            </ClientOnly>
            <div
              v-if="!chartFilters.catId"
              class="no-cat-selected"
            >
              <div class="text-center py-12">
                <div class="text-gray-400 text-6xl mb-4">
                  🐱
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                  猫を選択してください
                </h3>
                <p class="text-gray-500">
                  上のフィルターから分析したい猫を選択してください
                </p>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  </div>
</template>

<style scoped>
.analytics-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

/* Page Header */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  text-align: center;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.page-description {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

/* Error State */
.error-container {
  display: flex;
  justify-content: center;
  padding: 4rem 2rem;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
}

.error-message {
  font-size: 1rem;
  color: #666;
  margin: 0 0 2rem 0;
  line-height: 1.5;
}

.retry-button {
  padding: 0.75rem 2rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: #45a049;
  transform: translateY(-1px);
}

/* Empty State */
.empty-state {
  display: flex;
  justify-content: center;
  padding: 4rem 2rem;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
}

.empty-message {
  font-size: 1rem;
  color: #666;
  margin: 0 0 2rem 0;
  line-height: 1.5;
}

.empty-action {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: #4caf50;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.empty-action:hover {
  background: #45a049;
  transform: translateY(-1px);
}

/* Page Content */
.page-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Enhanced Responsive Grid Layout */
.filters-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  /* Sticky positioning for better UX */
  position: sticky;
  top: 1rem;
  z-index: 10;
}

.chart-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 500px;
}

/* No cat selected state */
.no-cat-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px dashed #d1d5db;
}

/* Chart Header */
.chart-header {
  text-align: center;
  margin-bottom: 2rem;
}

.chart-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.chart-subtitle {
  font-size: 1rem;
  color: #666;
  margin: 0;
}

.chart-container {
  width: 100%;
  min-height: 400px;
  position: relative;
}

/* Enhanced Tablet Responsive */
@media (max-width: 1024px) {
  .analytics-page {
    padding: 0 1rem;
  }

  .page-header {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .page-title {
    font-size: 1.8rem;
  }

  .filters-section,
  .chart-section {
    padding: 1.5rem;
  }

  .filters-section {
    position: static; /* Remove sticky on tablet */
  }

  .chart-container {
    min-height: 350px;
  }
}

/* Enhanced Mobile Responsive */
@media (max-width: 768px) {
  .analytics-page {
    padding: 0;
    /* スクロール性能の向上 */
    -webkit-overflow-scrolling: touch;
  }

  .page-header {
    border-radius: 0;
    margin-bottom: 0;
    padding: 1.5rem 1rem;
    /* モバイルでのタッチ操作改善 */
    position: sticky;
    top: 0;
    z-index: 20;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .page-title {
    font-size: 1.6rem;
    line-height: 1.2;
  }

  .page-description {
    font-size: 1rem;
    line-height: 1.4;
  }

  .page-content {
    gap: 0;
  }

  .filters-section,
  .chart-section {
    border-radius: 0;
    margin: 0;
    padding: 1.5rem 1rem;
    box-shadow: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .filters-section {
    /* フィルターセクションを固定化 */
    position: sticky;
    top: 120px; /* ヘッダーの高さに応じて調整 */
    z-index: 15;
    background: white;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .chart-section {
    min-height: 400px;
  }

  .chart-container {
    min-height: 300px;
    /* タッチ操作の改善 */
    touch-action: pan-x pan-y;
  }

  .no-cat-selected {
    min-height: 250px;
    margin: 1rem 0;
  }

  .loading-container,
  .error-container,
  .empty-state {
    padding: 3rem 1rem;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .page-header {
    padding: 1rem;
    /* 小さな画面でのヘッダー最適化 */
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .page-title {
    font-size: 1.4rem;
    line-height: 1.1;
  }

  .page-description {
    font-size: 0.9rem;
    margin-top: 0.25rem;
  }

  .filters-section,
  .chart-section {
    padding: 1rem;
  }

  .filters-section {
    /* 小さな画面でのフィルター最適化 */
    top: 100px; /* ヘッダーの高さに応じて調整 */
    gap: 1rem;
  }

  .filter-group {
    gap: 0.5rem;
  }

  .filter-label {
    font-size: 0.9rem;
  }

  .cat-button {
    padding: 0.75rem;
    /* タッチターゲットサイズの確保 */
    min-height: 56px;
  }

  .cat-name {
    font-size: 0.9rem;
  }

  .cat-weight {
    font-size: 0.8rem;
  }

  .period-selector {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .period-button {
    padding: 0.75rem;
    font-size: 0.9rem;
    /* タッチターゲットサイズの確保 */
    min-height: 48px;
  }

  .chart-header {
    margin-bottom: 1rem;
  }

  .chart-title {
    font-size: 1.2rem;
  }

  .chart-subtitle {
    font-size: 0.9rem;
  }

  .chart-container {
    min-height: 250px;
    /* 小さな画面でのチャート最適化 */
    overflow: hidden;
  }

  .loading-container,
  .error-container,
  .empty-state {
    padding: 2rem 1rem;
  }

  .loading-text,
  .error-message,
  .empty-message {
    font-size: 0.9rem;
  }

  .retry-button,
  .empty-action {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    /* タッチターゲットサイズの確保 */
    min-height: 48px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .page-header,
  .filters-section,
  .chart-section {
    border: 2px solid #333;
  }

  .cat-button,
  .period-button {
    border-color: #333;
  }

  .cat-button--active,
  .period-button--active {
    background: #000;
    color: #fff;
  }
}

/* Enhanced Touch Device Optimization */
@media (hover: none) and (pointer: coarse) {
  /* タッチデバイス専用のスタイル */
  .retry-button:active,
  .empty-action:active {
    transform: scale(0.98);
  }

  /* タッチスクロールの改善 */
  .analytics-page {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }
}

/* Enhanced Focus and Accessibility */
.retry-button:focus,
.empty-action:focus {
  outline: 2px solid var(--analytics-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.1);
}

/* Skip to content link for screen readers */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--analytics-accent);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
}

.skip-to-content:focus {
  top: 6px;
}

/* High contrast mode improvements */
@media (prefers-contrast: high) {
  .page-header,
  .filters-section,
  .chart-section {
    border: 2px solid currentColor;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .retry-button:hover,
  .empty-action:hover,
  .cat-button,
  .period-button {
    transform: none !important;
    transition: none !important;
  }

  * {
    transition: none !important;
    animation: none !important;
  }
}

/* CSS変数の定義 */
:root {
  --analytics-bg-primary: #ffffff;
  --analytics-bg-secondary: #f8f9fa;
  --analytics-text-primary: #333333;
  --analytics-text-secondary: #666666;
  --analytics-border: #e2e8f0;
  --analytics-accent: #4caf50;
  --analytics-accent-hover: #45a049;
  --analytics-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  :root {
    --analytics-bg-primary: #1a1a1a;
    --analytics-bg-secondary: #2d2d2d;
    --analytics-text-primary: #ffffff;
    --analytics-text-secondary: #cccccc;
    --analytics-border: #404040;
    --analytics-accent: #66bb6a;
    --analytics-accent-hover: #5cb85c;
    --analytics-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .page-header,
  .filters-section,
  .chart-section {
    background: var(--analytics-bg-primary);
    color: var(--analytics-text-primary);
    border-color: var(--analytics-border);
  }

  .cat-button,
  .period-button {
    background: var(--analytics-bg-secondary);
    color: var(--analytics-text-primary);
    border-color: var(--analytics-border);
  }

  .cat-button--active,
  .period-button--active {
    background: var(--analytics-accent);
    border-color: var(--analytics-accent);
  }
}

/* Print styles */
@media print {
  .filters-section {
    display: none;
  }

  .chart-section {
    break-inside: avoid;
  }

  .page-header,
  .chart-section {
    box-shadow: none;
    border: 1px solid #ccc;
  }
}

/* Enhanced Performance Optimization */
.chart-container {
  contain: layout style paint;
  transform: translateZ(0); /* GPU加速 */
}

/* スクロール性能の向上 */
.analytics-page {
  will-change: scroll-position;
  transform: translateZ(0);
}

/* レイアウトシフトの防止 */
.chart-container {
  min-height: fit-content;
}

/* Critical rendering path optimization */
.page-header {
  contain: layout style;
}

.filters-section {
  contain: layout style paint;
}

/* Intersection Observer用のクラス */
.chart-visible {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.chart-container:not(.chart-visible) {
  opacity: 0.7;
  transform: translateY(10px);
}

/* タッチデバイス用のスタイル */
.touch-device .cat-button,
.touch-device .period-button {
  -webkit-tap-highlight-color: rgba(76, 175, 80, 0.2);
}

/* チャートの可視性最適化 */
.chart-visible {
  opacity: 1;
  transition: opacity 0.3s ease;
}

.chart-container:not(.chart-visible) {
  opacity: 0.8;
}
</style>
