<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';

// Page meta
useSeoMeta({
  title: '詳細チャート - 猫の健康管理',
  description: '詳細な食事データのチャート分析',
});

definePageMeta({
  ssr: false,
});

// State
const cats = ref<Cat[]>([]);
const selectedCatId = ref<number | undefined>(undefined);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Fetch cats data
const fetchCats = async () => {
  if (!import.meta.client) {
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<Cat[]>('/api/cats');
    cats.value = response;

    // Set first cat as default if available
    if (cats.value.length > 0 && !selectedCatId.value) {
      selectedCatId.value = cats.value[0]?.id;
    }
  }
  catch (err) {
    console.error('Fetch cats error:', err);
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  await fetchCats();
});
</script>

<template>
  <div class="charts-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          詳細チャート
        </h1>
        <p class="page-description">
          猫の食事データを詳しく分析できるフル機能チャート
        </p>
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
          チャートを表示するには、まず猫を登録してください。
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
      <!-- Cat Selector -->
      <div class="cat-selector-section">
        <label
          for="cat-select"
          class="selector-label"
        >
          猫を選択
        </label>
        <select
          id="cat-select"
          v-model.number="selectedCatId"
          class="cat-select"
        >
          <option
            v-for="cat in cats"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Chart Component -->
      <div class="chart-section">
        <MealChart
          v-if="selectedCatId"
          :cat-id="selectedCatId"
          :height="500"
          :period-days="30"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.charts-page {
  max-width: 1400px;
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

/* Cat Selector */
.cat-selector-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selector-label {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.75rem;
}

.cat-select {
  width: 100%;
  max-width: 400px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cat-select:hover {
  border-color: #4caf50;
}

.cat-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

/* Chart Section */
.chart-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .page-title {
    font-size: 1.6rem;
  }

  .page-description {
    font-size: 1rem;
  }

  .cat-selector-section,
  .chart-section {
    padding: 1.5rem;
  }

  .cat-select {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.4rem;
  }

  .page-description {
    font-size: 0.9rem;
  }

  .cat-selector-section,
  .chart-section {
    padding: 1rem;
  }
}
</style>
