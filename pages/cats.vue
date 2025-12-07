<script setup lang="ts">
import type { Cat, CatInput } from '~/types/cat-meal';

// Page meta
useSeoMeta({
  title: '猫の管理 - 猫の健康管理',
  description: '飼い猫の情報を管理します',
});

// Require authentication
definePageMeta({
  middleware: 'auth',
});

// Store
const catsStore = useCatsStore();

// State
const isLoading = computed(() => catsStore.isLoading);
const error = computed(() => catsStore.error);
const cats = computed(() => catsStore.cats);

// Modal states
const showAddModal = ref(false);
const showEditModal = ref(false);
const editingCat = ref<Cat | null>(null);

// Delete confirmation state
const showDeleteConfirmation = ref(false);
const catToDelete = ref<Cat | null>(null);

// View mode for responsive layout
const viewMode = ref<'grid' | 'list'>('grid');

// Fetch cats data
const fetchCats = async (forceRefresh = false) => {
  try {
    if (forceRefresh) {
      await catsStore.refreshCats();
    }
    else {
      await catsStore.fetchCats();
    }
  }
  catch (err) {
    console.error('Failed to fetch cats:', err);
  }
};

// Handle add cat
const handleAdd = () => {
  showAddModal.value = true;
};

// Handle edit cat
const handleEdit = (cat: Cat) => {
  editingCat.value = cat;
  showEditModal.value = true;
};

// Handle delete cat
const handleDelete = (cat: Cat) => {
  catToDelete.value = cat;
  showDeleteConfirmation.value = true;
};

// Confirm delete
const confirmDelete = async () => {
  if (!catToDelete.value) return;

  try {
    await catsStore.deleteCat(catToDelete.value.id);
  }
  catch (err) {
    console.error('Failed to delete cat:', err);
  }
  finally {
    showDeleteConfirmation.value = false;
    catToDelete.value = null;
  }
};

// Cancel delete
const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  catToDelete.value = null;
};

// Handle form submission for add
const handleAddSubmit = async (data: CatInput) => {
  try {
    await catsStore.createCat(data);
    showAddModal.value = false;
  }
  catch (err) {}
};

// Handle form submission for edit
const handleEditSubmit = async (data: CatInput) => {
  if (!editingCat.value) return;

  try {
    await catsStore.updateCat(editingCat.value.id, data);
    showEditModal.value = false;
    editingCat.value = null;
    // Refresh the cats list to ensure updated data is displayed
    await fetchCats();
  }
  catch (err) {
    console.error('Failed to update cat:', err);
  }
};

// Handle form cancel
const handleAddCancel = () => {
  showAddModal.value = false;
};

const handleEditCancel = () => {
  showEditModal.value = false;
  editingCat.value = null;
};

// Toggle view mode (currently unused but kept for future functionality)
const _toggleViewMode = () => {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid';
};

// Lifecycle
onMounted(() => {
  // 初回読み込み時は強制リフレッシュ
  fetchCats(true);
});
</script>

<template>
  <div class="cats-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="page-title">
            猫の管理
          </h1>
          <p class="page-description">
            飼い猫の情報を管理できます
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
          @click="() => fetchCats(true)"
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
            🐱
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ cats.length }}
            </div>
            <div class="stat-label">
              登録猫数
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            📊
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ cats.filter((cat) => cat.weight).length }}
            </div>
            <div class="stat-label">
              体重記録済み
            </div>
          </div>
        </div>
      </div>

      <!-- Cats List -->
      <div class="cats-container">
        <CatList
          :cats="cats"
          :loading="isLoading"
          :show-actions="true"
          :class="{
            'cat-list--grid': viewMode === 'grid',
            'cat-list--list': viewMode === 'list',
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
            to="/foods"
            class="action-button"
          >
            <span class="action-icon">🥫</span>
            <span class="action-text">フード管理</span>
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

    <!-- Add Cat Modal -->
    <CatManagementForm
      :is-open="showAddModal"
      @close="handleAddCancel"
      @save="handleAddSubmit"
    />

    <!-- Edit Cat Modal -->
    <CatManagementForm
      v-if="editingCat"
      :cat="editingCat"
      :is-open="showEditModal"
      @close="handleEditCancel"
      @save="handleEditSubmit"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`${catToDelete?.name}を削除`"
      :message="`${catToDelete?.name}を削除しますか？この操作は取り消せません。関連する食事記録も削除されます。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.cats-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

/* Page Header */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 1rem 2rem 2rem 2rem;
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

.view-button--active:hover {
  background: #45a049;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

/* Cats Container */
.cats-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* List view modifications */
.cat-list--list :deep(.cat-list__grid) {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #e2e8f0;
}

.cat-list--list :deep(.cat-card) {
  display: flex;
  align-items: center;
  border-radius: 0;
  padding: 1.5rem;
}

.cat-list--list :deep(.cat-card__image-container) {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  margin-right: 1.5rem;
}

.cat-list--list :deep(.cat-card__content) {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
}

.cat-list--list :deep(.cat-card__info) {
  display: flex;
  gap: 2rem;
  margin: 0;
}

.cat-list--list :deep(.cat-card__actions) {
  margin-left: 1rem;
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
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .cats-page {
    padding: 0;
  }

  /* ヘッダーの最適化 */
  .page-header {
    border-radius: 0;
    margin-bottom: 0.75rem;
    padding: 1rem;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }

  .header-content {
    gap: 1rem;
  }

  .page-title {
    font-size: 1.4rem;
    margin-bottom: 0.25rem;
  }

  .page-description {
    font-size: 0.9rem;
  }

  .header-actions {
    width: 100%;
  }

  .view-toggle {
    display: none; /* スマホでは表示切り替え不要 */
  }

  /* 統計サマリーの最適化 */
  .stats-summary {
    margin: 0 1rem 0.75rem;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .stat-card {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .stat-icon {
    font-size: 1.75rem;
    width: 44px;
    height: 44px;
  }

  .stat-value {
    font-size: 1.6rem;
  }

  .stat-label {
    font-size: 0.85rem;
  }

  /* 猫リストコンテナの最適化 */
  .cats-container {
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    background: #f8f9fa;
  }

  /* 猫カードを横長レイアウトに */
  .cat-list--grid :deep(.cat-list__grid),
  .cat-list--list :deep(.cat-list__grid) {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: #f8f9fa;
  }

  .cat-list--grid :deep(.cat-card),
  .cat-list--list :deep(.cat-card) {
    display: flex;
    flex-direction: row;
    align-items: center;
    border-radius: 8px;
    padding: 1rem;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  /* 画像を左側に配置 */
  .cat-list--grid :deep(.cat-card__image-container),
  .cat-list--list :deep(.cat-card__image-container) {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    margin-right: 1rem;
    margin-bottom: 0;
  }

  /* コンテンツエリアを右側に */
  .cat-list--grid :deep(.cat-card__content),
  .cat-list--list :deep(.cat-card__content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0;
  }

  /* 猫の名前 */
  .cat-list--grid :deep(.cat-card__name),
  .cat-list--list :deep(.cat-card__name) {
    font-size: 1.2rem;
    margin: 0;
  }

  /* 情報行 */
  .cat-list--grid :deep(.cat-card__info),
  .cat-list--list :deep(.cat-card__info) {
    display: flex;
    gap: 1rem;
    margin: 0;
    font-size: 0.9rem;
  }

  /* アクションボタン */
  .cat-list--grid :deep(.cat-card__actions),
  .cat-list--list :deep(.cat-card__actions) {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .cat-list--grid :deep(.action-button),
  .cat-list--list :deep(.action-button) {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
    min-width: auto;
  }

  .cat-list--grid :deep(.edit-button),
  .cat-list--list :deep(.edit-button) {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }

  .cat-list--grid :deep(.delete-button),
  .cat-list--list :deep(.delete-button) {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }

  /* クイックアクション */
  .quick-actions {
    display: none; /* スマホでは非表示 */
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
  .cats-container,
  .quick-actions,
  .stat-card,
  .action-button {
    border: 2px solid #333;
  }

  .view-button {
    border-color: #333;
  }

  .view-button--active,
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
