<script setup lang="ts">
import type {
  MedicationRecord,
  MedicationRecordInput,
  Medication,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Page meta
useSeoMeta({
  title: '薬カレンダー - 猫の健康管理',
  description: 'カレンダー形式で猫の薬の投与記録を管理します',
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
const selectedDate = ref<string | null>(null);
const selectedCatId = ref<string>('');

// Calendar stats
const calendarStats = ref({
  thisMonth: {
    administered: 0,
    pending: 0,
    missed: 0,
  },
  today: {
    administered: 0,
    pending: 0,
    missed: 0,
  },
});

// Fetch initial data
const fetchInitialData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [catsResponse, medicationsResponse] = await Promise.all([
      $fetch<Cat[]>('/api/cats'),
      $fetch<Medication[]>('/api/medications'),
    ]);

    cats.value = catsResponse;
    medications.value = medicationsResponse;

    // Fetch calendar stats
    await fetchCalendarStats();
  }
  catch {
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
  }
};

// Fetch calendar stats
const fetchCalendarStats = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [monthlyStats, dailyStats] = await Promise.all([
      $fetch<typeof calendarStats.value.thisMonth>('/api/medication-records/stats', {
        query: {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString(),
          catId: selectedCatId.value || undefined,
        },
      }),
      $fetch<typeof calendarStats.value.today>('/api/medication-records/stats', {
        query: {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          catId: selectedCatId.value || undefined,
        },
      }),
    ]);

    calendarStats.value = {
      thisMonth: monthlyStats,
      today: dailyStats,
    };
  }
  catch {
    // Silently fail for stats
  }
};

// Handle date selection
const handleDateSelected = (date: string) => {
  selectedDate.value = date;
};

// Handle record creation
const handleRecordCreate = (date: string) => {
  selectedDate.value = date;
  showAddModal.value = true;
};

// Handle cat filter change
const handleCatFilterChange = (catId: string) => {
  selectedCatId.value = catId;
  fetchCalendarStats();
};

// Handle form submission for add
const handleAddSubmit = async (data: MedicationRecordInput) => {
  try {
    await $fetch<MedicationRecord>('/api/medication-records', {
      method: 'POST',
      body: data,
    });

    showAddModal.value = false;
    selectedDate.value = null;

    // Refresh calendar stats
    await fetchCalendarStats();
  }
  catch {
    error.value = '投与記録の追加に失敗しました';
  }
};

// Handle form cancel
const handleAddCancel = () => {
  showAddModal.value = false;
  selectedDate.value = null;
};

// Get initial date for calendar (today)
const getInitialDate = () => {
  return new Date();
};

// Get pre-filled form data for selected date
const getPrefilledFormData = (): Partial<MedicationRecordInput> => {
  if (!selectedDate.value) return {};

  return {
    administeredAt: new Date(selectedDate.value),
    catId: selectedCatId.value || undefined,
  };
};

// Lifecycle
onMounted(() => {
  fetchInitialData();
});
</script>

<template>
  <div class="medication-calendar-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="page-title">
            薬カレンダー
          </h1>
          <p class="page-description">
            カレンダー形式で猫の薬の投与記録を管理できます
          </p>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <button
            type="button"
            class="add-button"
            @click="handleRecordCreate(new Date().toISOString().split('T')[0])"
          >
            <span class="add-icon">+</span>
            <span class="add-text">今日の記録を追加</span>
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
      <!-- Calendar Stats -->
      <div class="calendar-stats">
        <div class="stats-section">
          <h3 class="stats-title">
            今月の統計
          </h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon administered">
                ✅
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ calendarStats.thisMonth.administered }}
                </div>
                <div class="stat-label">
                  投与済み
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon pending">
                ⏰
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ calendarStats.thisMonth.pending }}
                </div>
                <div class="stat-label">
                  投与予定
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon missed">
                ❌
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ calendarStats.thisMonth.missed }}
                </div>
                <div class="stat-label">
                  投与忘れ
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <h3 class="stats-title">
            今日の統計
          </h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon administered">
                ✅
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ calendarStats.today.administered }}
                </div>
                <div class="stat-label">
                  投与済み
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon pending">
                ⏰
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ calendarStats.today.pending }}
                </div>
                <div class="stat-label">
                  投与予定
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon missed">
                ❌
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ calendarStats.today.missed }}
                </div>
                <div class="stat-label">
                  投与忘れ
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calendar Component -->
      <div class="calendar-container">
        <MedicationCalendar
          :initial-date="getInitialDate()"
          :cat-id="selectedCatId"
          @date-selected="handleDateSelected"
          @record-create="handleRecordCreate"
        />
      </div>

      <!-- Legend -->
      <div class="calendar-legend">
        <h3 class="legend-title">
          カレンダーの見方
        </h3>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-indicator administered" />
            <span class="legend-text">投与済みの記録がある日</span>
          </div>
          <div class="legend-item">
            <div class="legend-indicator pending" />
            <span class="legend-text">投与予定がある日</span>
          </div>
          <div class="legend-item">
            <div class="legend-indicator missed" />
            <span class="legend-text">投与忘れがある日</span>
          </div>
          <div class="legend-item">
            <div class="legend-indicator today" />
            <span class="legend-text">今日</span>
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
            to="/medications"
            class="action-button"
          >
            <span class="action-icon">💊</span>
            <span class="action-text">薬の管理</span>
          </NuxtLink>
          <NuxtLink
            to="/medication-records"
            class="action-button"
          >
            <span class="action-icon">📝</span>
            <span class="action-text">投与記録</span>
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
      :initial-data="getPrefilledFormData()"
      @close="handleAddCancel"
      @save="handleAddSubmit"
    />
  </div>
</template>

<style scoped>
.medication-calendar-page {
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

/* Calendar Stats */
.calendar-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.stats-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.stat-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.stat-icon.administered {
  background: #d4edda;
}

.stat-icon.pending {
  background: #fff3cd;
}

.stat-icon.missed {
  background: #f8d7da;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
}

/* Calendar Container */
.calendar-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Calendar Legend */
.calendar-legend {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.legend-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
  text-align: center;
}

.legend-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.legend-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-indicator.administered {
  background: #28a745;
}

.legend-indicator.pending {
  background: #ffc107;
}

.legend-indicator.missed {
  background: #dc3545;
}

.legend-indicator.today {
  background: #007bff;
}

.legend-text {
  font-size: 0.9rem;
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

  .calendar-stats {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .legend-items {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .medication-calendar-page {
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

  .calendar-stats {
    margin: 0 1rem;
    gap: 1rem;
  }

  .stats-section {
    padding: 1rem;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.75rem;
  }

  .stat-icon {
    font-size: 1.2rem;
    width: 32px;
    height: 32px;
  }

  .stat-value {
    font-size: 1.2rem;
  }

  .stat-label {
    font-size: 0.7rem;
  }

  .calendar-container {
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }

  .calendar-legend {
    margin: 1rem;
    padding: 1rem;
  }

  .legend-items {
    grid-template-columns: 1fr;
    gap: 0.75rem;
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

  .calendar-stats {
    margin: 0 0.5rem;
  }

  .stats-section {
    padding: 0.75rem;
  }

  .stats-title {
    font-size: 1rem;
  }

  .stat-card {
    padding: 0.5rem;
  }

  .stat-value {
    font-size: 1rem;
  }

  .calendar-legend {
    margin: 0.5rem;
    padding: 0.75rem;
  }

  .legend-title {
    font-size: 1rem;
  }

  .legend-text {
    font-size: 0.8rem;
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
  .calendar-container,
  .calendar-legend,
  .quick-actions,
  .stats-section,
  .action-button {
    border: 2px solid #333;
  }

  .add-button {
    background: #000;
    color: #fff;
  }

  .legend-indicator.administered {
    background: #000;
  }

  .legend-indicator.pending {
    background: #666;
  }

  .legend-indicator.missed {
    background: #333;
  }

  .legend-indicator.today {
    background: #000;
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
