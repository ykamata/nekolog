<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';

// Page meta
useSeoMeta({
  title: 'データ分析 - 猫の健康管理',
  description: '猫の食事データを分析・可視化します',
});

// Require authentication
definePageMeta({
  middleware: 'auth',
});

// State
const cats = ref<Cat[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Filter state
const selectedCatId = ref<string>('');
const selectedPeriod = ref<number>(30);

// Chart container references
const chartContainerRef = ref<HTMLElement>();

// Computed
const selectedCat = computed(() =>
  cats.value.find(cat => cat.id === selectedCatId.value),
);

const periodOptions = [
  { value: 7, label: '過去7日' },
  { value: 14, label: '過去14日' },
  { value: 30, label: '過去30日' },
  { value: 60, label: '過去60日' },
  { value: 90, label: '過去90日' },
];

// Fetch cats data
const fetchCats = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<Cat[]>('/api/cats');
    cats.value = response;

    // Set first cat as default if available
    if (cats.value.length > 0 && !selectedCatId.value) {
      selectedCatId.value = cats.value[0]?.id || '';
    }
  }
  catch {
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Handle cat selection
const handleCatSelect = (catId: string) => {
  selectedCatId.value = catId;
};

// Handle period change
const handlePeriodChange = (period: number) => {
  selectedPeriod.value = period;
};

// Lifecycle
onMounted(() => {
  fetchCats();

  // タッチデバイスの検出とレスポンシブ対応
  if (import.meta.client) {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // タッチデバイス用のクラスを追加
    if (isTouchDevice) {
      document.documentElement.classList.add('touch-device');
    }

    // オリエンテーション変更時の処理
    const handleOrientationChange = () => {
      // オリエンテーション変更後の再描画を遅延実行
      setTimeout(() => {
        // チャートコンテナのサイズ調整をトリガー
        if (chartContainerRef.value) {
          const event = new Event('resize');
          window.dispatchEvent(event);
        }
      }, 100);
    };

    if (isTouchDevice) {
      window.addEventListener('orientationchange', handleOrientationChange);

      onUnmounted(() => {
        window.removeEventListener('orientationchange', handleOrientationChange);
      });
    }

    // Intersection Observer for performance optimization
    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window && chartContainerRef.value) {
      observer = new IntersectionObserver(
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
      observer.observe(chartContainerRef.value);

      onUnmounted(() => {
        if (observer) {
          observer.disconnect();
        }
      });
    }
  }
});
</script>

<template>
  <div class="analytics-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="page-title">
            データ分析
          </h1>
          <p class="page-description">
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
      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filter-group">
          <label class="filter-label">猫を選択</label>
          <div class="cat-selector">
            <button
              v-for="cat in cats"
              :key="cat.id"
              type="button"
              class="cat-button"
              :class="{ 'cat-button--active': cat.id === selectedCatId }"
              @click="handleCatSelect(cat.id)"
            >
              <div class="cat-info">
                <div class="cat-name">
                  {{ cat.name }}
                </div>
                <div
                  v-if="cat.weight"
                  class="cat-weight"
                >
                  {{ cat.weight }}kg
                </div>
              </div>
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">期間を選択</label>
          <div class="period-selector">
            <button
              v-for="option in periodOptions"
              :key="option.value"
              type="button"
              class="period-button"
              :class="{
                'period-button--active': option.value === selectedPeriod,
              }"
              @click="handlePeriodChange(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Chart Section -->
      <div class="chart-section">
        <div class="chart-header">
          <h2 class="chart-title">
            {{ selectedCat?.name }}の食事データ
          </h2>
          <p class="chart-subtitle">
            {{
              periodOptions.find((p) => p.value === selectedPeriod)?.label
            }}の推移
          </p>
        </div>

        <!-- Chart Container -->
        <div
          ref="chartContainerRef"
          class="chart-container"
        >
          <AsyncComponent
            component-name="MealChart"
            :component-props="{
              catId: selectedCatId,
              height: 400,
            }"
            loading-type="chart"
          />
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-section">
        <h3 class="summary-title">
          データサマリー
        </h3>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon">
              📊
            </div>
            <div class="summary-content">
              <div class="summary-label">
                分析対象
              </div>
              <div class="summary-value">
                {{ selectedCat?.name }}
              </div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon">
              📅
            </div>
            <div class="summary-content">
              <div class="summary-label">
                期間
              </div>
              <div class="summary-value">
                {{
                  periodOptions.find((p) => p.value === selectedPeriod)?.label
                }}
              </div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon">
              ⚖️
            </div>
            <div class="summary-content">
              <div class="summary-label">
                体重
              </div>
              <div class="summary-value">
                {{ selectedCat?.weight ? `${selectedCat.weight}kg` : "未記録" }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3 class="quick-actions-title">
          関連機能
        </h3>
        <div class="action-buttons">
          <NuxtLink
            to="/meals/record"
            class="action-button action-button--primary"
          >
            <span class="action-icon">📝</span>
            <span class="action-text">食事を記録</span>
          </NuxtLink>
          <NuxtLink
            to="/meals/history"
            class="action-button"
          >
            <span class="action-icon">📋</span>
            <span class="action-text">食事履歴</span>
          </NuxtLink>
          <NuxtLink
            to="/cats"
            class="action-button"
          >
            <span class="action-icon">🐱</span>
            <span class="action-text">猫の管理</span>
          </NuxtLink>
          <NuxtLink
            to="/foods"
            class="action-button"
          >
            <span class="action-icon">🥫</span>
            <span class="action-text">フード管理</span>
          </NuxtLink>
        </div>
      </div>
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

/* Filters Section */
.filters-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.cat-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.cat-button {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cat-button:hover {
  border-color: #4caf50;
  background: #f8fff8;
}

.cat-button--active {
  border-color: #4caf50;
  background: #e8f5e9;
}

.cat-info {
  flex: 1;
  text-align: left;
}

.cat-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.cat-weight {
  font-size: 0.9rem;
  color: #666;
}

.period-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.period-button {
  padding: 0.75rem 1.5rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  color: #666;
}

.period-button:hover {
  border-color: #4caf50;
  background: #f8fff8;
  color: #333;
}

.period-button--active {
  border-color: #4caf50;
  background: #4caf50;
  color: white;
}

/* Chart Section */
.chart-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

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

/* Summary Section */
.summary-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

/* Tablet Responsive */
@media (max-width: 1024px) {
  .page-header {
    padding: 1.5rem;
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

  .cat-selector {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .period-selector {
    justify-content: center;
  }

  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .analytics-page {
    padding: 0;
    /* スクロール性能の向上 */
    -webkit-overflow-scrolling: touch;
  }

  .page-header {
    border-radius: 0;
    margin-bottom: 0.5rem;
    padding: 1.5rem 1rem;
    /* モバイルでのタッチ操作改善 */
    position: sticky;
    top: 0;
    z-index: 10;
    background: white;
    border-bottom: 1px solid #e2e8f0;
  }

  .page-title {
    font-size: 1.6rem;
    line-height: 1.2;
  }

  .page-description {
    font-size: 1rem;
    line-height: 1.4;
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
    /* フィルターセクションを固定化（オプション） */
    position: sticky;
    top: 120px; /* ヘッダーの高さに応じて調整 */
    z-index: 9;
    background: white;
    border-top: 1px solid #e2e8f0;
  }

  .cat-selector {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .cat-button {
    /* タッチターゲットサイズの確保 */
    min-height: 60px;
    padding: 1rem;
  }

  .period-selector {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .period-button {
    text-align: center;
    /* タッチターゲットサイズの確保 */
    min-height: 48px;
    padding: 0.75rem 0.5rem;
    font-size: 0.9rem;
  }

  .chart-container {
    min-height: 300px;
    /* タッチ操作の改善 */
    touch-action: pan-x pan-y;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .summary-card {
    padding: 1rem;
    /* タッチフィードバックの改善 */
    transition: background-color 0.2s ease;
  }

  .summary-card:active {
    background-color: #f1f5f9;
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

/* タッチデバイス最適化 */
@media (hover: none) and (pointer: coarse) {
  /* タッチデバイス専用のスタイル */
  .cat-button:hover,
  .period-button:hover,
  .action-button:hover {
    /* ホバー効果を無効化 */
    background: inherit;
    border-color: inherit;
    color: inherit;
    transform: none;
  }

  .cat-button:active,
  .period-button:active,
  .action-button:active {
    /* タッチフィードバック */
    transform: scale(0.98);
    opacity: 0.8;
  }

  .retry-button:active,
  .empty-action:active {
    transform: scale(0.98);
  }
}

/* フォーカス表示の改善（アクセシビリティ） */
.cat-button:focus,
.period-button:focus,
.action-button:focus,
.retry-button:focus,
.empty-action:focus {
  outline: 2px solid #4caf50;
  outline-offset: 2px;
}

/* タッチターゲットサイズの確保 */
@media (max-width: 768px) {
  .cat-button,
  .period-button,
  .action-button,
  .retry-button,
  .empty-action {
    min-height: 44px;
    min-width: 44px;
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

/* パフォーマンス最適化のためのCSS */
.chart-container {
  contain: layout style paint;
}

.summary-grid,
.action-buttons {
  contain: layout;
}

/* スクロール性能の向上 */
.analytics-page {
  will-change: scroll-position;
}

/* GPU加速の有効化 */
.cat-button,
.period-button,
.action-button,
.summary-card {
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
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
