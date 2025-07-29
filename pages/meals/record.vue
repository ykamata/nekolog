<script setup lang="ts">
import type { MealRecordInput } from '~/types/cat-meal';

// Page meta
useSeoMeta({
  title: '食事記録 - 猫の健康管理',
  description: '猫の食事内容を記録します',
});

// Require authentication
definePageMeta({
  middleware: 'auth',
});

// Stores
const catsStore = useCatsStore();
const foodsStore = useFoodsStore();
const mealsStore = useMealsStore();

// State
const isLoading = ref(false);
const isSubmitting = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Form reference
const mealFormRef = ref();

// Computed
const cats = computed(() => catsStore.cats);
const foods = computed(() => foodsStore.foods);

// Fetch data
const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    await Promise.all([catsStore.fetchCats(), foodsStore.fetchFoods()]);
  }
  catch {
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Handle form submission
const handleSubmit = async (data: MealRecordInput) => {
  isSubmitting.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    await mealsStore.createMeal(data);

    successMessage.value = '食事記録を保存しました';

    // Reset form after successful submission
    if (mealFormRef.value) {
      mealFormRef.value.resetForm();
    }

    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  }
  catch {
    error.value = '食事記録の保存に失敗しました';
  }
  finally {
    isSubmitting.value = false;
  }
};

// Handle form cancel
const handleCancel = () => {
  if (mealFormRef.value) {
    mealFormRef.value.resetForm();
  }
  error.value = null;
  successMessage.value = null;
};

// Lifecycle
onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="meal-record-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          食事記録
        </h1>
        <p class="page-description">
          猫の食事内容を記録してください
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
          @click="fetchData"
        >
          再試行
        </button>
      </div>
    </div>

    <!-- Success Message -->
    <div
      v-if="successMessage"
      class="success-banner"
    >
      <div class="success-content">
        <span class="success-icon">✅</span>
        <span class="success-text">{{ successMessage }}</span>
      </div>
    </div>

    <!-- Main Content -->
    <div
      v-else
      class="page-content"
    >
      <!-- Quick Stats (Mobile) -->
      <div class="quick-stats">
        <div class="stat-item">
          <span class="stat-label">登録猫数</span>
          <span class="stat-value">{{ cats.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">登録フード数</span>
          <span class="stat-value">{{ foods.length }}</span>
        </div>
      </div>

      <!-- Form Container -->
      <div class="form-container">
        <MealRecordForm
          ref="mealFormRef"
          :cats="cats"
          :foods="foods"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>

      <!-- Quick Actions (Mobile) -->
      <div class="quick-actions">
        <h3 class="quick-actions-title">
          クイックアクション
        </h3>
        <div class="action-buttons">
          <NuxtLink
            to="/cats"
            class="action-button"
          >
            <span class="action-icon">🐱</span>
            <span class="action-text">猫を追加</span>
          </NuxtLink>
          <NuxtLink
            to="/foods"
            class="action-button"
          >
            <span class="action-icon">🥫</span>
            <span class="action-text">フードを追加</span>
          </NuxtLink>
          <NuxtLink
            to="/meals/history"
            class="action-button"
          >
            <span class="action-icon">📋</span>
            <span class="action-text">履歴を見る</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meal-record-page {
  max-width: 800px;
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

/* Success Banner */
.success-banner {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
}

.success-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.success-icon {
  font-size: 1.2rem;
}

.success-text {
  color: #155724;
  font-weight: 500;
}

/* Page Content */
.page-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Quick Stats */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-item {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #4caf50;
}

/* Form Container */
.form-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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

  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .meal-record-page {
    padding: 0;
  }

  .page-header {
    border-radius: 0;
    margin-bottom: 1rem;
    padding: 1.5rem 1rem;
  }

  .page-title {
    font-size: 1.6rem;
  }

  .page-description {
    font-size: 1rem;
  }

  .quick-stats {
    margin: 0 1rem 1rem 1rem;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .stat-item {
    padding: 1rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .form-container {
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }

  .quick-actions {
    margin: 1rem;
    padding: 1.5rem;
  }

  .action-buttons {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .action-button {
    flex-direction: row;
    justify-content: flex-start;
    padding: 1rem;
  }

  .action-icon {
    font-size: 1.5rem;
  }

  .loading-container,
  .error-container {
    padding: 3rem 1rem;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .page-header {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.4rem;
  }

  .quick-stats {
    margin: 0 0.5rem 1rem 0.5rem;
  }

  .stat-item {
    padding: 0.75rem;
  }

  .stat-value {
    font-size: 1.3rem;
  }

  .quick-actions {
    margin: 0.5rem;
    padding: 1rem;
  }

  .quick-actions-title {
    font-size: 1.1rem;
  }

  .action-button {
    padding: 0.75rem;
  }

  .action-text {
    font-size: 0.8rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .page-header,
  .form-container,
  .quick-actions,
  .stat-item {
    border: 2px solid #333;
  }

  .action-button {
    border-width: 2px;
  }

  .action-button:hover {
    border-color: #000;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .retry-button:hover,
  .action-button:hover {
    transform: none;
  }

  * {
    transition: none !important;
  }
}
</style>
