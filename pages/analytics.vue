<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';

// Chart filters type definition
interface DateRange {
  start: Date;
  end: Date;
}

interface ChartFilters {
  catId?: string;
  dateRange: DateRange;
  chartType: 'line' | 'bar' | 'stacked-bar';
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

// Chart filters state
const chartFilters = ref<ChartFilters>({
  catId: '',
  dateRange: {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90日前に変更
    end: new Date(),
  },
  chartType: 'line',
});

// Analytics Store
const analyticsStore = useAnalyticsStore();

// Development mode check
// const $dev = computed(() => import.meta.dev);
const $dev = undefined;

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

// Fetch cats data
const fetchCats = async () => {
  // Client-side only
  if (!import.meta.client) {
    console.log('Analytics page: サーバーサイドではスキップ');
    return;
  }

  console.log('Analytics page: fetchCats開始');
  isLoading.value = true;
  error.value = null;

  try {
    console.log('Analytics page: API呼び出し開始 - /api/cats');
    const response = await $fetch<Cat[]>('/api/cats');
    console.log('Analytics page: 猫データ取得成功', {
      count: response.length,
      cats: response,
      isArray: Array.isArray(response),
      firstCat: response[0],
    });
    cats.value = response;

    // Set first cat as default if available
    if (cats.value.length > 0 && !chartFilters.value.catId) {
      chartFilters.value.catId = cats.value[0]?.id || '';
      console.log('Analytics page: デフォルト猫を設定', { catId: chartFilters.value.catId });
      // Analytics storeにも設定
      analyticsStore.setSelectedCat(chartFilters.value.catId);

      // 初期データを取得
      try {
        console.log('Analytics page: 初期データ取得開始');
        await analyticsStore.fetchAnalytics({
          catId: chartFilters.value.catId,
          startDate: chartFilters.value.dateRange.start,
          endDate: chartFilters.value.dateRange.end,
        });
        console.log('Analytics page: 初期データ取得成功');
      }
      catch (err) {
        console.error('Analytics page: 初期データ取得失敗:', err);
      }
    }
    else {
      console.log('Analytics page: 猫データが空またはcatIdが既に設定済み', {
        catsLength: cats.value.length,
        catId: chartFilters.value.catId,
      });
    }
  }
  catch (err) {
    console.error('Analytics page: fetchCats失敗:', err);
    console.error('エラー詳細:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      type: typeof err,
      err,
    });
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Handle chart filters change
const handleFiltersChange = async (filters: ChartFilters) => {
  console.log('Analytics page: フィルター変更', filters);
  chartFilters.value = { ...filters };

  // Analytics storeに設定を反映
  if (filters.catId) {
    analyticsStore.setSelectedCat(filters.catId);
  }
  analyticsStore.setDateRange(filters.dateRange.start, filters.dateRange.end);
  analyticsStore.setChartDisplayMode(filters.chartType === 'stacked-bar' ? 'bar' : filters.chartType);

  // データを再取得
  if (filters.catId) {
    try {
      await analyticsStore.fetchAnalytics({
        catId: filters.catId,
        startDate: filters.dateRange.start,
        endDate: filters.dateRange.end,
      });
    }
    catch (err) {
      console.error('Analytics page: データ取得失敗:', err);
    }
  }
};

// イベントリスナーとオブザーバーの管理
let orientationChangeHandler: (() => void) | null = null;
let intersectionObserver: IntersectionObserver | null = null;

// Lifecycle
onMounted(async () => {
  console.log('Analytics page: onMounted開始');
  console.log('Analytics page: 初期状態', {
    catsLength: cats.value.length,
    isLoading: isLoading.value,
    error: error.value,
    selectedCatId: chartFilters.value.catId,
  });

  try {
    console.log('Analytics page: fetchCats呼び出し前');
    await fetchCats();
    console.log('Analytics page: fetchCats呼び出し後', {
      catsLength: cats.value.length,
      selectedCatId: chartFilters.value.catId,
    });

    // 初期期間を設定
    analyticsStore.setDateRange(chartFilters.value.dateRange.start, chartFilters.value.dateRange.end);
    analyticsStore.setChartDisplayMode(chartFilters.value.chartType === 'stacked-bar' ? 'bar' : chartFilters.value.chartType);

    console.log('Analytics page: 初期設定完了', {
      catId: chartFilters.value.catId,
      dateRange: chartFilters.value.dateRange,
      chartType: chartFilters.value.chartType,
    });

    // リアルタイム更新を開始（1分間隔）
    analyticsStore.startAutoRefresh(60000);
  }
  catch (err) {

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

    <!-- Debug Info (Development only) -->
    <div
      v-if="$dev"
      class="debug-info bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"
    >
      <h3 class="text-sm font-medium text-yellow-800 mb-2">
        デバッグ情報
      </h3>
      <div class="text-xs text-yellow-700 space-y-1">
        <div>isLoading: {{ isLoading }}</div>
        <div>error: {{ error }}</div>
        <div>cats.length: {{ cats.length }}</div>
        <div>chartFilters: {{ JSON.stringify(chartFilters, null, 2) }}</div>
        <div>selectedPeriodDays: {{ selectedPeriodDays }}</div>
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
            <MealChartSimple
              v-if="chartFilters.catId"
              :cat-id="chartFilters.catId"
              :height="400"
              :period-days="90"
            />
            <div
              v-else
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

        <!-- Summary Cards -->
        <div
          v-if="chartFilters.catId"
          class="summary-section"
          role="region"
          aria-labelledby="summary-title"
        >
          <h3
            id="summary-title"
            class="summary-title"
          >
            データサマリー
          </h3>
          <div class="summary-grid">
            <div
              class="summary-card"
              role="article"
              aria-labelledby="analysis-target-label"
            >
              <div
                class="summary-icon"
                aria-hidden="true"
              >
                📊
              </div>
              <div class="summary-content">
                <div
                  id="analysis-target-label"
                  class="summary-label"
                >
                  分析対象
                </div>
                <div
                  class="summary-value"
                  aria-label="分析対象: {{ selectedCat?.name }}"
                >
                  {{ selectedCat?.name }}
                </div>
              </div>
            </div>
            <div
              class="summary-card"
              role="article"
              aria-labelledby="period-label"
            >
              <div
                class="summary-icon"
                aria-hidden="true"
              >
                📅
              </div>
              <div class="summary-content">
                <div
                  id="period-label"
                  class="summary-label"
                >
                  期間
                </div>
                <div
                  class="summary-value"
                  aria-label="期間: {{ selectedPeriodDays }}日間"
                >
                  {{ selectedPeriodDays }}日間
                </div>
              </div>
            </div>
            <div
              class="summary-card"
              role="article"
              aria-labelledby="weight-label"
            >
              <div
                class="summary-icon"
                aria-hidden="true"
              >
                ⚖️
              </div>
              <div class="summary-content">
                <div
                  id="weight-label"
                  class="summary-label"
                >
                  体重
                </div>
                <div
                  class="summary-value"
                  :aria-label="`体重: ${selectedCat?.weight ? `${selectedCat.weight}キログラム` : '未記録'}`"
                >
                  {{ selectedCat?.weight ? `${selectedCat.weight}kg` : "未記録" }}
                </div>
              </div>
            </div>
            <div
              class="summary-card"
              role="article"
              aria-labelledby="chart-type-label"
            >
              <div
                class="summary-icon"
                aria-hidden="true"
              >
                📈
              </div>
              <div class="summary-content">
                <div
                  id="chart-type-label"
                  class="summary-label"
                >
                  表示形式
                </div>
                <div
                  class="summary-value"
                  :aria-label="`表示形式: ${chartFilters.chartType === 'line' ? '線グラフ' : '積み上げ棒グラフ'}`"
                >
                  {{ chartFilters.chartType === 'line' ? '線グラフ' : '積み上げ棒グラフ' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div
          class="quick-actions"
          role="region"
          aria-labelledby="quick-actions-title"
        >
          <h3
            id="quick-actions-title"
            class="quick-actions-title"
          >
            関連機能
          </h3>
          <div
            class="action-buttons"
            role="navigation"
            aria-label="関連機能へのナビゲーション"
          >
            <NuxtLink
              to="/meals/record"
              class="action-button action-button--primary"
              aria-label="食事を記録するページに移動"
            >
              <span
                class="action-icon"
                aria-hidden="true"
              >📝</span>
              <span class="action-text">食事を記録</span>
            </NuxtLink>
            <NuxtLink
              to="/meals/history"
              class="action-button"
              aria-label="食事履歴ページに移動"
            >
              <span
                class="action-icon"
                aria-hidden="true"
              >📋</span>
              <span class="action-text">食事履歴</span>
            </NuxtLink>
            <NuxtLink
              to="/cats"
              class="action-button"
              aria-label="猫の管理ページに移動"
            >
              <span
                class="action-icon"
                aria-hidden="true"
              >🐱</span>
              <span class="action-text">猫の管理</span>
            </NuxtLink>
            <NuxtLink
              to="/foods"
              class="action-button"
              aria-label="フード管理ページに移動"
            >
              <span
                class="action-icon"
                aria-hidden="true"
              >🥫</span>
              <span class="action-text">フード管理</span>
            </NuxtLink>
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

.summary-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quick-actions {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

.summary-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  border-radius: 50%;
}

.summary-content {
  flex: 1;
}

.summary-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

/* Quick Actions */
.quick-actions {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quick-actions-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #e8f5e9;
  border-color: #4caf50;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.action-button--primary {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.action-button--primary:hover {
  background: #45a049;
  border-color: #45a049;
}

.action-icon {
  font-size: 2rem;
}

.action-text {
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
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
  .chart-section,
  .summary-section,
  .quick-actions {
    padding: 1.5rem;
  }

  .filters-section {
    position: static; /* Remove sticky on tablet */
  }

  .chart-container {
    min-height: 350px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
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
  .chart-section,
  .summary-section,
  .quick-actions {
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

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .summary-card {
    padding: 1rem;
    /* タッチフィードバックの改善 */
    transition: all 0.2s ease;
  }

  .summary-card:active {
    background-color: #f1f5f9;
    transform: scale(0.98);
  }

  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .action-button {
    padding: 1rem;
    /* タッチターゲットサイズの確保 */
    min-height: 80px;
  }

  .action-icon {
    font-size: 1.5rem;
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
  .chart-section,
  .summary-section,
  .quick-actions {
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

  .summary-section {
    padding: 1rem;
  }

  .summary-title {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .summary-grid {
    gap: 0.5rem;
  }

  .summary-card {
    padding: 0.75rem;
    flex-direction: column;
    text-align: center;
    /* タッチフィードバックの改善 */
    transition: all 0.2s ease;
  }

  .summary-card:active {
    transform: scale(0.98);
    background-color: #f1f5f9;
  }

  .summary-icon {
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
    margin-bottom: 0.5rem;
  }

  .summary-label {
    font-size: 0.8rem;
  }

  .summary-value {
    font-size: 1rem;
  }

  .quick-actions-title {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .action-buttons {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .action-button {
    flex-direction: row;
    justify-content: flex-start;
    padding: 0.75rem;
    /* タッチターゲットサイズの確保 */
    min-height: 56px;
    gap: 0.75rem;
  }

  .action-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .action-text {
    font-size: 0.9rem;
    text-align: left;
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
  .chart-section,
  .summary-section,
  .quick-actions,
  .summary-card,
  .action-button {
    border: 2px solid #333;
  }

  .cat-button,
  .period-button {
    border-color: #333;
  }

  .cat-button--active,
  .period-button--active,
  .action-button--primary {
    background: #000;
    color: #fff;
  }
}

/* Enhanced Touch Device Optimization */
@media (hover: none) and (pointer: coarse) {
  /* タッチデバイス専用のスタイル */
  .summary-card:hover,
  .action-button:hover {
    /* ホバー効果を無効化 */
    background: inherit;
    border-color: inherit;
    color: inherit;
    transform: none;
    box-shadow: inherit;
  }

  .summary-card:active,
  .action-button:active {
    /* タッチフィードバック */
    transform: scale(0.98);
    opacity: 0.8;
  }

  .retry-button:active,
  .empty-action:active {
    transform: scale(0.98);
  }

  /* タッチターゲットサイズの確保 */
  .summary-card,
  .action-button {
    min-height: 44px;
    min-width: 44px;
  }

  /* タッチスクロールの改善 */
  .analytics-page {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  /* タッチ操作の遅延を削除 */
  .summary-card,
  .action-button {
    touch-action: manipulation;
  }
}

/* Enhanced Focus and Accessibility */
.summary-card:focus,
.action-button:focus,
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
  .chart-section,
  .summary-section,
  .quick-actions,
  .summary-card,
  .action-button {
    border: 2px solid currentColor;
  }

  .summary-card:hover,
  .action-button:hover {
    background: ButtonHighlight;
    color: ButtonText;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .retry-button:hover,
  .empty-action:hover,
  .action-button:hover,
  .cat-button,
  .period-button,
  .summary-card {
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
  .chart-section,
  .summary-section,
  .quick-actions {
    background: var(--analytics-bg-primary);
    color: var(--analytics-text-primary);
    border-color: var(--analytics-border);
  }

  .summary-card,
  .cat-button,
  .period-button,
  .action-button {
    background: var(--analytics-bg-secondary);
    color: var(--analytics-text-primary);
    border-color: var(--analytics-border);
  }

  .cat-button--active,
  .period-button--active {
    background: var(--analytics-accent);
    border-color: var(--analytics-accent);
  }

  .action-button--primary {
    background: var(--analytics-accent);
    border-color: var(--analytics-accent);
  }
}

/* Print styles */
@media print {
  .filters-section,
  .quick-actions {
    display: none;
  }

  .chart-section {
    break-inside: avoid;
  }

  .page-header,
  .chart-section,
  .summary-section {
    box-shadow: none;
    border: 1px solid #ccc;
  }
}

/* Enhanced Performance Optimization */
.chart-container {
  contain: layout style paint;
  transform: translateZ(0); /* GPU加速 */
}

.summary-grid,
.action-buttons {
  contain: layout;
}

/* スクロール性能の向上 */
.analytics-page {
  will-change: scroll-position;
  transform: translateZ(0);
}

/* GPU加速の有効化 */
.action-button,
.summary-card {
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
}

/* レイアウトシフトの防止 */
.chart-container,
.summary-grid,
.action-buttons {
  min-height: fit-content;
}

/* 画像とアイコンの最適化 */
.summary-icon,
.action-icon {
  font-display: swap;
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
.touch-device .period-button,
.touch-device .action-button {
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
