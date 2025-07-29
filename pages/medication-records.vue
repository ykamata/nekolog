<script setup lang="ts">
import type {
  MedicationRecord,
  MedicationRecordInput,
  MedicationRecordFilter,
  Medication,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Page meta
useSeoMeta({
  title: '投与記録 - 猫の健康管理',
  description: '猫の薬の投与記録を管理します',
});

// Require authentication
definePageMeta({
  middleware: 'auth',
});

// State
const cats = ref<Cat[]>([]);
const medications = ref<Medication[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Modal states
const showAddModal = ref(false);
const showEditModal = ref(false);
const editingRecord = ref<MedicationRecord | null>(null);

// Filter state
const currentFilter = ref<MedicationRecordFilter>({
  limit: 20,
  offset: 0,
});

// Stats state
const stats = ref({
  total: 0,
  administered: 0,
  pending: 0,
  missed: 0,
  todayRecords: 0,
});

// Fetch initial data
const fetchInitialData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [catsResponse, medicationsResponse, statsResponse] = await Promise.all([
      $fetch<Cat[]>('/api/cats'),
      $fetch<Medication[]>('/api/medications'),
      $fetch<typeof stats.value>('/api/medication-records/stats'),
    ]);

    cats.value = catsResponse;
    medications.value = medicationsResponse;
    stats.value = statsResponse;
  }
  catch {
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Handle add record
const handleAdd = () => {
  showAddModal.value = true;
};

// Handle edit record
const handleEdit = (record: MedicationRecord) => {
  editingRecord.value = record;
  showEditModal.value = true;
};

// Handle delete record
const handleDelete = async (record: MedicationRecord) => {
  try {
    await $fetch(`/api/medication-records/${record.id}`, {
      method: 'DELETE',
    });

    // Refresh stats after deletion
    await fetchStats();
  }
  catch {
    error.value = '投与記録の削除に失敗しました';
  }
};

// Handle form submission for add
const handleAddSubmit = async (data: MedicationRecordInput) => {
  try {
    await $fetch<MedicationRecord>('/api/medication-records', {
      method: 'POST',
      body: data,
    });

    showAddModal.value = false;
    // Refresh stats after adding
    await fetchStats();
  }
  catch {
    error.value = '投与記録の追加に失敗しました';
  }
};

// Handle form submission for edit
const handleEditSubmit = async (data: MedicationRecordInput) => {
  if (!editingRecord.value) return;

  try {
    await $fetch<MedicationRecord>(
      `/api/medication-records/${editingRecord.value.id}`,
      {
        method: 'PUT',
        body: data,
      },
    );

    showEditModal.value = false;
    editingRecord.value = null;
    // Refresh stats after editing
    await fetchStats();
  }
  catch {
    error.value = '投与記録の更新に失敗しました';
  }
};

// Handle form cancel
const handleAddCancel = () => {
  showAddModal.value = false;
};

const handleEditCancel = () => {
  showEditModal.value = false;
  editingRecord.value = null;
};

// Handle filter change
const handleFilterChange = (filter: MedicationRecordFilter) => {
  currentFilter.value = filter;
};

// Fetch stats
const fetchStats = async () => {
  try {
    const response = await $fetch<typeof stats.value>('/api/medication-records/stats');
    stats.value = response;
  }
  catch {
    // Silently fail for stats
  }
};

// Lifecycle
onMounted(() => {
  fetchInitialData();
});
</script>

<template>
  <div class="medication-records-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="page-title">
            投与記録
          </h1>
          <p class="page-description">
            猫の薬の投与記録を管理できます
          </p>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <button
            type="button"
            class="add-button"
            @click="handleAdd"
          >
            <span class="add-icon">+</span>
            <span class="add-text">記録を追加</span>
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
      <!-- Stats Summary -->
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon">
            📊
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ stats.total }}
            </div>
            <div class="stat-label">
              総記録数
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            ✅
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ stats.administered }}
            </div>
            <div class="stat-label">
              投与済み
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            ⏰
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ stats.pending }}
            </div>
            <div class="stat-label">
              投与予定
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            ❌
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ stats.missed }}
            </div>
            <div class="stat-label">
              投与忘れ
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            📅
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ stats.todayRecords }}
            </div>
            <div class="stat-label">
              今日の記録
            </div>
          </div>
        </div>
      </div>

      <!-- Medication Records List -->
      <div class="records-container">
        <MedicationRecordList
          :cats="cats"
          :medications="medications"
          :initial-filter="currentFilter"
          @add="handleAdd"
          @edit="handleEdit"
          @delete="handleDelete"
          @filter-change="handleFilterChange"
        />
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3 class="quick-actions-title">
          関連機能
        </h3>
        <div class="action-buttons">
          <NuxtLink
            to="/medications"
            class="action-button"
          >
            <span class="action-icon">💊</span>
            <span class="action-text">薬の管理</span>
          </NuxtLink>
          <NuxtLink
            to="/medication-calendar"
            class="action-button"
          >
            <span class="action-icon">📅</span>
            <span class="action-text">カレンダー</span>
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

    <!-- Add Record Modal -->
    <MedicationRecordForm
      :is-open="showAddModal"
      :cats="cats"
      :medications="medications"
      @close="handleAddCancel"
      @save="handleAddSubmit"
    />

    <!-- Edit Record Modal -->
    <MedicationRecordForm
      :is-open="showEditModal"
      :record="editingRecord"
      :cats="cats"
      :medications="medications"
      @close="handleEditCancel"
      @save="handleEditSubmit"
    />
  </div>
</template>

<style scoped>
.medication-records-page {
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

/* Records Container */
.records-container {
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
    justify-content: flex-start;
  }

  .stats-summary {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .medication-records-page {
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
    grid-template-columns: repeat(2, 1fr);
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

  .records-container {
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
    grid-template-columns: repeat(2, 1fr);
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
    grid-template-columns: 1fr;
  }

  .stat-card {
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

  .action-buttons {
    grid-template-columns: 1fr;
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
  .records-container,
  .quick-actions,
  .stat-card,
  .action-button {
    border: 2px solid #333;
  }

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
