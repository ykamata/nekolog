<script setup lang="ts">
import type { Cat, Food, MealRecord, MealRecordInput } from '~/types/cat-meal';
import { toLocalISOString } from '~/utils/cat-meal';

// Page meta
useSeoMeta({
  title: '食事履歴 - 猫の健康管理',
  description: '猫の食事履歴を確認・管理します',
});

// Require authentication
definePageMeta({
  middleware: 'auth',
});

// State
const cats = ref<Cat[]>([]);
const foods = ref<Food[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// View mode
const viewMode = ref<'list' | 'grid'>('list');

// Edit modal state
const showEditModal = ref(false);
const editingRecord = ref<MealRecord | null>(null);

// Delete confirmation state
const showDeleteConfirmation = ref(false);
const recordToDelete = ref<MealRecord | null>(null);

// Meal record list reference
const mealListRef = ref();

// Fetch initial data
const fetchInitialData = async () => {
  console.log('fetchInitialData called');
  isLoading.value = true;
  error.value = null;

  try {
    const [catsResponse, foodsResponse] = await Promise.all([
      $fetch<Cat[]>('/api/cats'),
      $fetch<Food[]>('/api/foods'),
    ]);

    cats.value = catsResponse;
    foods.value = foodsResponse;
  }
  catch {
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Handle edit record
const handleEdit = (record: MealRecord) => {
  editingRecord.value = record;
  showEditModal.value = true;
};

// Handle delete record
const handleDelete = (record: MealRecord) => {
  recordToDelete.value = record;
  showDeleteConfirmation.value = true;
};

// Confirm delete
const confirmDelete = async () => {
  if (!recordToDelete.value) return;

  try {
    await $fetch(`/api/meals/${recordToDelete.value.id}`, {
      method: 'DELETE' as any,
    });

    // Refresh the meal list
    if (mealListRef.value) {
      mealListRef.value.fetchMealRecords(true);
    }
  }
  catch {
    error.value = '食事記録の削除に失敗しました';
  }
  finally {
    showDeleteConfirmation.value = false;
    recordToDelete.value = null;
  }
};

// Cancel delete
const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  recordToDelete.value = null;
};

// Handle edit form submission
const handleEditSubmit = async (data: MealRecordInput) => {
  if (!editingRecord.value) return;

  try {
    // mealTimeをローカルISO文字列に変換してタイムゾーン(JST)を保持
    const submitData = {
      ...data,
      mealTime: data.mealTime instanceof Date
        ? toLocalISOString(data.mealTime)
        : data.mealTime,
    };

    await $fetch(`/api/meals/${editingRecord.value.id}`, {
      method: 'PUT' as any,
      body: submitData,
    });

    // Refresh the meal list
    if (mealListRef.value) {
      mealListRef.value.fetchMealRecords(true);
    }

    showEditModal.value = false;
    editingRecord.value = null;
  }
  catch {
    error.value = '食事記録の更新に失敗しました';
  }
};

// Handle edit form cancel
const handleEditCancel = () => {
  showEditModal.value = false;
  editingRecord.value = null;
};

// Toggle view mode (currently unused but kept for future functionality)
const _toggleViewMode = () => {
  viewMode.value = viewMode.value === 'list' ? 'grid' : 'list';
};

// Lifecycle
onMounted(() => {
  fetchInitialData();
});
</script>

<template>
  <div class="meal-history-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="page-title">
            食事履歴
          </h1>
          <p class="page-description">
            猫の食事記録を確認・管理できます
          </p>
        </div>

        <!-- View Mode Toggle -->
        <div class="view-controls">
          <div class="view-toggle">
            <button
              type="button"
              class="view-button"
              :class="{ 'view-button--active': viewMode === 'list' }"
              title="リスト表示"
              @click="viewMode = 'list'"
            >
              <span class="view-icon">📋</span>
              <span class="view-text">リスト</span>
            </button>
            <button
              type="button"
              class="view-button"
              :class="{ 'view-button--active': viewMode === 'grid' }"
              title="グリッド表示"
              @click="viewMode = 'grid'"
            >
              <span class="view-icon">⊞</span>
              <span class="view-text">グリッド</span>
            </button>
          </div>
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
          @click="fetchInitialData"
        >
          再試行
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div
      v-else
      class="page-content"
    >
      <!-- Quick Actions -->
      <div class="quick-actions">
        <NuxtLink
          to="/meals/record"
          class="action-button action-button--primary"
        >
          <span class="action-icon">📝</span>
          <span class="action-text">新しい記録を追加</span>
        </NuxtLink>
        <NuxtLink
          to="/analytics"
          class="action-button"
        >
          <span class="action-icon">📊</span>
          <span class="action-text">データ分析を見る</span>
        </NuxtLink>
      </div>

      <!-- Meal Records List -->
      <div class="meal-list-container">
        <MealRecordList
          ref="mealListRef"
          :cats="cats"
          :foods="foods"
          :class="{
            'meal-list--grid': viewMode === 'grid',
            'meal-list--list': viewMode === 'list',
          }"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal"
      class="modal-overlay"
      @click="handleEditCancel"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h2 class="modal-title">
            食事記録を編集
          </h2>
          <button
            type="button"
            class="modal-close"
            @click="handleEditCancel"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <MealRecordForm
            v-if="editingRecord"
            :cats="cats"
            :foods="foods"
            :initial-data="{
              catId: editingRecord.catId,
              foodId: editingRecord.foodId,
              quantity: editingRecord.quantity,
              calories: editingRecord.calories,
              mealTime: new Date(editingRecord.mealTime),
              notes: editingRecord.notes,
            }"
            @submit="handleEditSubmit"
            @cancel="handleEditCancel"
          />
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`食事記録を削除`"
      :message="`この食事記録を削除しますか？この操作は取り消せません。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.meal-history-page {
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}

.header-main {
  flex: 1;
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

/* View Controls */
.view-controls {
  flex-shrink: 0;
}

.view-toggle {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.view-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.view-button:hover {
  background: #f8f9fa;
  color: #333;
}

.view-button--active {
  background: #4caf50;
  color: white;
}

.view-button--active:hover {
  background: #45a049;
  color: white;
}

.view-button:not(:last-child) {
  border-right: 1px solid #e2e8f0;
}

.view-icon {
  font-size: 1rem;
}

.view-text {
  font-weight: 500;
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

/* Page Content */
.page-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 200px;
}

.action-button:hover {
  background: #f8f9fa;
  border-color: #4caf50;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  font-size: 1.2rem;
}

.action-text {
  font-size: 1rem;
}

/* Meal List Container */
.meal-list-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Grid view modifications */
.meal-list--grid :deep(.records-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
}

.meal-list--grid :deep(.meal-record-card) {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.meal-list--grid :deep(.meal-record-card:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f8f9fa;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.2rem;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #e2e8f0;
  color: #333;
}

.modal-body {
  padding: 0;
}

/* Tablet Responsive */
@media (max-width: 1024px) {
  .page-header {
    padding: 1.5rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1.5rem;
  }

  .view-controls {
    align-self: flex-start;
  }

  .meal-list--grid :deep(.records-grid) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    padding: 1rem;
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .meal-history-page {
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

  /* スマホでは表示切り替えトグルを非表示 */
  .view-toggle {
    display: none;
  }

  /* スマホでは quick-actions を非表示 */
  .quick-actions {
    display: none;
  }

  .meal-list-container {
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }

  .meal-list--grid :deep(.records-grid) {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.2rem;
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

  .quick-actions {
    margin: 0 0.5rem;
  }

  .action-button {
    padding: 0.75rem 1rem;
  }

  .action-text {
    font-size: 0.9rem;
  }

  .view-button {
    padding: 0.5rem 0.75rem;
  }

  .view-text {
    display: none;
  }

  .modal-overlay {
    padding: 0;
  }

  .modal-content {
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .page-header,
  .meal-list-container,
  .action-button,
  .modal-content {
    border: 2px solid #333;
  }

  .view-button {
    border-color: #333;
  }

  .view-button--active {
    background: #000;
    color: #fff;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .retry-button:hover,
  .action-button:hover,
  .meal-list--grid :deep(.meal-record-card:hover) {
    transform: none;
  }

  * {
    transition: none !important;
  }
}
</style>
