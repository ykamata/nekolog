<script setup lang="ts">
import type { Food, FoodInput } from '~/types/cat-meal';

// Page meta
useSeoMeta({
  title: 'フード管理 - 猫の健康管理',
  description: '猫のフード情報を管理します',
});

// Require authentication
definePageMeta({
  middleware: 'auth',
});

// State
const foods = ref<Food[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Modal states
const showAddModal = ref(false);
const showEditModal = ref(false);
const editingFood = ref<Food | null>(null);

// Delete confirmation state
const showDeleteConfirmation = ref(false);
const foodToDelete = ref<Food | null>(null);

// Filter state
const filterType = ref<'ALL' | 'DRY' | 'WET'>('ALL');
const searchQuery = ref('');

// View mode for responsive layout
const viewMode = ref<'grid' | 'list'>('grid');

// Computed
const filteredFoods = computed(() => {
  let filtered = foods.value;

  // Filter by type
  if (filterType.value !== 'ALL') {
    filtered = filtered.filter(food => food.type === filterType.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      food =>
        food.name.toLowerCase().includes(query)
        || (food.brand && food.brand.toLowerCase().includes(query)),
    );
  }

  return filtered;
});

const foodStats = computed(() => ({
  total: foods.value.length,
  dry: foods.value.filter(food => food.type === 'DRY').length,
  wet: foods.value.filter(food => food.type === 'WET').length,
}));

// Fetch foods data
const fetchFoods = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<Food[]>('/api/foods');
    foods.value = response;
  }
  catch {
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Handle add food
const handleAdd = () => {
  showAddModal.value = true;
};

// Handle edit food
const handleEdit = (food: Food) => {
  editingFood.value = food;
  showEditModal.value = true;
};

// Handle delete food
const handleDelete = (food: Food) => {
  foodToDelete.value = food;
  showDeleteConfirmation.value = true;
};

// Confirm delete
const confirmDelete = async () => {
  if (!foodToDelete.value) return;

  try {
    await $fetch(`/api/foods/${foodToDelete.value.id}`, {
      method: 'DELETE' as any,
    });

    // Remove from local state
    foods.value = foods.value.filter(
      food => food.id !== foodToDelete.value!.id,
    );
  }
  catch {
    error.value = 'フードの削除に失敗しました';
  }
  finally {
    showDeleteConfirmation.value = false;
    foodToDelete.value = null;
  }
};

// Cancel delete
const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  foodToDelete.value = null;
};

// Handle form submission for add
const handleAddSubmit = async (data: FoodInput) => {
  try {
    const newFood = await $fetch<Food>('/api/foods', {
      method: 'POST',
      body: data,
    });

    foods.value.push(newFood);
    showAddModal.value = false;
  }
  catch {
    error.value = 'フードの追加に失敗しました';
  }
};

// Handle form submission for edit
const handleEditSubmit = async (data: FoodInput) => {
  if (!editingFood.value) return;

  try {
    const updatedFood = await $fetch<Food>(
      `/api/foods/${editingFood.value.id}`,
      {
        method: 'PUT' as any,
        body: data,
      },
    );

    // Update local state
    const index = foods.value.findIndex(
      food => food.id === editingFood.value!.id,
    );
    if (index !== -1) {
      foods.value[index] = updatedFood;
    }

    showEditModal.value = false;
    editingFood.value = null;
  }
  catch {
    error.value = 'フードの更新に失敗しました';
  }
};

// Handle form cancel
const handleAddCancel = () => {
  showAddModal.value = false;
};

const handleEditCancel = () => {
  showEditModal.value = false;
  editingFood.value = null;
};

// Clear search
const clearSearch = () => {
  searchQuery.value = '';
};

// Lifecycle
onMounted(() => {
  fetchFoods();
});
</script>

<template>
  <div class="foods-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="page-title">
            フード管理
          </h1>
          <p class="page-description">
            猫のフード情報を管理できます
          </p>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <!-- View Mode Toggle -->
          <div class="view-toggle">
            <button
              type="button"
              class="view-button"
              :class="{ 'view-button--active': viewMode === 'grid' }"
              title="グリッド表示"
              @click="viewMode = 'grid'"
            >
              <span class="view-icon">⊞</span>
            </button>
            <button
              type="button"
              class="view-button"
              :class="{ 'view-button--active': viewMode === 'list' }"
              title="リスト表示"
              @click="viewMode = 'list'"
            >
              <span class="view-icon">📋</span>
            </button>
          </div>

          <!-- Add Button -->
          <button
            type="button"
            class="add-button"
            @click="handleAdd"
          >
            <span class="add-icon">+</span>
            <span class="add-text">フードを追加</span>
          </button>
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
          @click="fetchFoods"
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
      <!-- Stats Summary -->
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon">
            🥫
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ foodStats.total }}
            </div>
            <div class="stat-label">
              総フード数
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            🌾
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ foodStats.dry }}
            </div>
            <div class="stat-label">
              ドライフード
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            🥄
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ foodStats.wet }}
            </div>
            <div class="stat-label">
              ウェットフード
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <!-- Search -->
        <div class="search-container">
          <div class="search-input-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="フード名やブランドで検索..."
            >
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear"
              @click="clearSearch"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Type Filter -->
        <div class="type-filter">
          <button
            type="button"
            class="filter-button"
            :class="{ 'filter-button--active': filterType === 'ALL' }"
            @click="filterType = 'ALL'"
          >
            すべて
          </button>
          <button
            type="button"
            class="filter-button"
            :class="{ 'filter-button--active': filterType === 'DRY' }"
            @click="filterType = 'DRY'"
          >
            ドライ
          </button>
          <button
            type="button"
            class="filter-button"
            :class="{ 'filter-button--active': filterType === 'WET' }"
            @click="filterType = 'WET'"
          >
            ウェット
          </button>
        </div>
      </div>

      <!-- Foods List -->
      <div class="foods-container">
        <FoodList
          :foods="filteredFoods"
          :loading="isLoading"
          :show-actions="true"
          :class="{
            'food-list--grid': viewMode === 'grid',
            'food-list--list': viewMode === 'list',
          }"
          @add="handleAdd"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3 class="quick-actions-title">
          関連機能
        </h3>
        <div class="action-buttons">
          <NuxtLink
            to="/meals/record"
            class="action-button"
          >
            <span class="action-icon">📝</span>
            <span class="action-text">食事を記録</span>
          </NuxtLink>
          <NuxtLink
            to="/cats"
            class="action-button"
          >
            <span class="action-icon">🐱</span>
            <span class="action-text">猫の管理</span>
          </NuxtLink>
          <NuxtLink
            to="/analytics"
            class="action-button"
          >
            <span class="action-icon">📊</span>
            <span class="action-text">データ分析</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Add Food Modal -->
    <div
      v-if="showAddModal"
      class="modal-overlay"
      @click="handleAddCancel"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h2 class="modal-title">
            新しいフードを追加
          </h2>
          <button
            type="button"
            class="modal-close"
            @click="handleAddCancel"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <FoodManagementForm
            :is-open="showAddModal"
            @close="handleAddCancel"
            @save="handleAddSubmit"
          />
        </div>
      </div>
    </div>

    <!-- Edit Food Modal -->
    <div
      v-if="showEditModal && editingFood"
      class="modal-overlay"
      @click="handleEditCancel"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h2 class="modal-title">
            {{ editingFood.name }}を編集
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
          <FoodManagementForm
            :food="editingFood"
            :is-open="showEditModal"
            @close="handleEditCancel"
            @save="handleEditSubmit"
            @cancel="handleEditCancel"
          />
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`${foodToDelete?.name}を削除`"
      :message="`${foodToDelete?.name}を削除しますか？この操作は取り消せません。関連する食事記録も影響を受ける可能性があります。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.foods-page {
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

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-button:hover {
  background: #f8f9fa;
  color: #333;
}

.view-button--active {
  background: #4caf50;
  color: white;
}

.view-button:not(:last-child) {
  border-right: 1px solid #e2e8f0;
}

.view-icon {
  font-size: 1.1rem;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-button:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.add-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

.add-text {
  font-size: 1rem;
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

/* Stats Summary */
.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  border-radius: 50%;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #4caf50;
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

/* Filters Section */
.filters-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  min-width: 250px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  padding-right: 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.search-clear {
  position: absolute;
  right: 0.75rem;
  width: 24px;
  height: 24px;
  border: none;
  background: #f8f9fa;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: #e2e8f0;
  color: #333;
}

.type-filter {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.filter-button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.filter-button:hover {
  border-color: #4caf50;
  background: #f8fff8;
  color: #333;
}

.filter-button--active {
  border-color: #4caf50;
  background: #4caf50;
  color: white;
}

/* Foods Container */
.foods-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

.action-icon {
  font-size: 2rem;
}

.action-text {
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
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

  .header-actions {
    align-self: flex-start;
    width: 100%;
    justify-content: space-between;
  }

  .stats-summary {
    grid-template-columns: repeat(3, 1fr);
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    min-width: auto;
  }

  .type-filter {
    justify-content: center;
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .foods-page {
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

  .add-text {
    display: none;
  }

  .stats-summary {
    margin: 0 1rem;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .stat-icon {
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .filters-section {
    margin: 0 1rem;
    padding: 1rem;
  }

  .type-filter {
    flex-wrap: wrap;
  }

  .filter-button {
    flex: 1;
    min-width: 0;
  }

  .foods-container {
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

  .stats-summary {
    margin: 0 0.5rem;
  }

  .stat-card {
    padding: 0.75rem;
  }

  .stat-value {
    font-size: 1.3rem;
  }

  .filters-section {
    margin: 0 0.5rem;
    padding: 0.75rem;
  }

  .filter-button {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
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
  .foods-container,
  .quick-actions,
  .stat-card,
  .filters-section,
  .action-button,
  .modal-content {
    border: 2px solid #333;
  }

  .view-button,
  .filter-button {
    border-color: #333;
  }

  .view-button--active,
  .filter-button--active,
  .add-button {
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
  .add-button:hover,
  .action-button:hover {
    transform: none;
  }

  * {
    transition: none !important;
  }
}
</style>
