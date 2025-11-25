<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';
import type {
  VeterinaryVisitWithRelations,
  CreateVeterinaryVisitInput,
  GetVeterinaryVisitsParams,
} from '~/types/veterinary-visit';

// Page meta
useSeoMeta({
  title: '通院履歴 - 猫の健康管理',
  description: '飼い猫の通院履歴をカレンダー形式で管理します',
});

// Require authentication
definePageMeta({
  middleware: 'auth',
});

// State
const cats = ref<Cat[]>([]);
const visits = ref<VeterinaryVisitWithRelations[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// View mode state
const viewMode = ref<'calendar' | 'list'>('calendar');

// Filter state
const selectedCatId = ref<number | undefined>(undefined);

// Modal states
const showAddModal = ref(false);
const showEditModal = ref(false);
const showAddAppointmentModal = ref(false);
const editingVisit = ref<VeterinaryVisitWithRelations | null>(null);

// Delete confirmation state
const showDeleteConfirmation = ref(false);
const visitToDelete = ref<VeterinaryVisitWithRelations | null>(null);

// Calendar state
const selectedDate = ref<string | null>(null);

// Stats
const visitStats = ref({
  thisMonth: {
    total: 0,
    withBloodTest: 0,
    totalCost: 0,
  },
  thisYear: {
    total: 0,
    withBloodTest: 0,
    totalCost: 0,
  },
});

// Computed
const filteredVisits = computed(() => {
  if (!selectedCatId.value) return visits.value;
  return visits.value.filter(visit => visit.catId === selectedCatId.value);
});

// Fetch initial data
const fetchInitialData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [catsResponse, visitsResponse] = await Promise.all([
      $fetch<Cat[]>('/api/cats'),
      fetchVisits(),
    ]);

    cats.value = catsResponse;
    await fetchVisitStats();
  }
  catch (err) {
    error.value = 'データの取得に失敗しました';
    console.error('Failed to fetch initial data:', err);
  }
  finally {
    isLoading.value = false;
  }
};

// Fetch visits
const fetchVisits = async (params?: GetVeterinaryVisitsParams) => {
  try {
    const queryParams: GetVeterinaryVisitsParams = {
      catId: selectedCatId.value || undefined,
      limit: 100, // Get recent visits
      ...params,
    };

    const response = await $fetch<{ visits: VeterinaryVisitWithRelations[] }>('/api/veterinary-visits', {
      query: queryParams,
    });

    visits.value = response.visits;
    return response;
  }
  catch (err) {
    console.error('Failed to fetch visits:', err);
    throw err;
  }
};

// Fetch visit statistics
const fetchVisitStats = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    const [monthlyVisits, yearlyVisits] = await Promise.all([
      $fetch<{ visits: VeterinaryVisitWithRelations[] }>('/api/veterinary-visits', {
        query: {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString(),
          catId: selectedCatId.value || undefined,
        },
      }),
      $fetch<{ visits: VeterinaryVisitWithRelations[] }>('/api/veterinary-visits', {
        query: {
          startDate: startOfYear.toISOString(),
          endDate: endOfYear.toISOString(),
          catId: selectedCatId.value || undefined,
        },
      }),
    ]);

    visitStats.value = {
      thisMonth: {
        total: monthlyVisits.visits?.length || 0,
        withBloodTest: monthlyVisits.visits?.filter((v: VeterinaryVisitWithRelations) => v.hasBloodTest).length || 0,
        totalCost: monthlyVisits.visits?.reduce((sum: number, v: VeterinaryVisitWithRelations) => sum + v.cost, 0) || 0,
      },
      thisYear: {
        total: yearlyVisits.visits?.length || 0,
        withBloodTest: yearlyVisits.visits?.filter((v: VeterinaryVisitWithRelations) => v.hasBloodTest).length || 0,
        totalCost: yearlyVisits.visits?.reduce((sum: number, v: VeterinaryVisitWithRelations) => sum + v.cost, 0) || 0,
      },
    };
  }
  catch (err) {
    console.error('Failed to fetch visit stats:', err);
    // Silently fail for stats
  }
};

// Handle view mode toggle
const handleViewModeChange = (mode: 'calendar' | 'list') => {
  viewMode.value = mode;
};

// Handle cat filter change
const handleCatFilterChange = async (catId: number | undefined) => {
  selectedCatId.value = catId;
  await fetchVisits();
  await fetchVisitStats();
};

// Handle add visit
const handleAdd = (date?: string) => {
  selectedDate.value = date || null;
  showAddModal.value = true;
};

// Handle add appointment (右クリック用)
const handleAddAppointment = (date: Date) => {
  selectedDate.value = date.toISOString().split('T')[0];
  showAddAppointmentModal.value = true;
};

// Handle edit visit
const handleEdit = (visit: VeterinaryVisitWithRelations) => {
  editingVisit.value = visit;
  showEditModal.value = true;
};

// Handle delete visit
const handleDelete = (visit: VeterinaryVisitWithRelations) => {
  visitToDelete.value = visit;
  showDeleteConfirmation.value = true;
};

// Confirm delete
const confirmDelete = async () => {
  if (!visitToDelete.value) return;

  try {
    await $fetch(`/api/veterinary-visits/${visitToDelete.value.id}`, {
      method: 'DELETE' as any,
    });

    // Remove from local state
    visits.value = visits.value.filter(v => v.id !== visitToDelete.value!.id);

    // Refresh stats
    await fetchVisitStats();
  }
  catch (err) {
    error.value = '通院記録の削除に失敗しました';
    console.error('Failed to delete visit:', err);
  }
  finally {
    showDeleteConfirmation.value = false;
    visitToDelete.value = null;
  }
};

// Cancel delete
const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  visitToDelete.value = null;
};

// Handle form submission for add
const handleAddSubmit = async (data: CreateVeterinaryVisitInput) => {
  try {
    const newVisit = await $fetch<VeterinaryVisitWithRelations>('/api/veterinary-visits', {
      method: 'POST',
      body: data,
    });

    // Add to local state
    visits.value.unshift(newVisit);

    // Refresh stats
    await fetchVisitStats();

    showAddModal.value = false;
    selectedDate.value = null;
  }
  catch (err) {
    error.value = '通院記録の作成に失敗しました';
    console.error('Failed to create visit:', err);
  }
};

// Handle form submission for edit
const handleEditSubmit = async (data: CreateVeterinaryVisitInput) => {
  if (!editingVisit.value) return;

  try {
    const updatedVisit = await $fetch<VeterinaryVisitWithRelations>(`/api/veterinary-visits/${editingVisit.value.id}`, {
      method: 'PUT' as any,
      body: data,
    });

    // Update local state
    const index = visits.value.findIndex(v => v.id === editingVisit.value!.id);
    if (index !== -1) {
      visits.value[index] = updatedVisit;
    }

    // Refresh stats
    await fetchVisitStats();

    showEditModal.value = false;
    editingVisit.value = null;
  }
  catch (err) {
    error.value = '通院記録の更新に失敗しました';
    console.error('Failed to update visit:', err);
  }
};

// Handle form submission for add appointment
const handleAddAppointmentSubmit = async (data: any) => {
  try {
    await $fetch('/api/veterinary-appointments', {
      method: 'POST',
      body: data,
    });

    // Close modal
    showAddAppointmentModal.value = false;
    selectedDate.value = null;

    // Refresh data (予約データも表示する場合)
    await fetchInitialData();
  }
  catch (err) {
    error.value = '予約の作成に失敗しました';
    console.error('Failed to create appointment:', err);
  }
};

// Handle form cancel
const handleAddCancel = () => {
  showAddModal.value = false;
  selectedDate.value = null;
};

const handleEditCancel = () => {
  showEditModal.value = false;
  editingVisit.value = null;
};

const handleAddAppointmentCancel = () => {
  showAddAppointmentModal.value = false;
  selectedDate.value = null;
};

// Handle calendar date selection
const handleDateSelected = (date: string) => {
  selectedDate.value = date;
};

// Handle calendar record creation
const handleRecordCreate = (date: string) => {
  handleAdd(date);
};

// Get pre-filled form data
const getPrefilledFormData = (): Partial<CreateVeterinaryVisitInput> => {
  const baseData: Partial<CreateVeterinaryVisitInput> = {};

  if (selectedDate.value) {
    baseData.visitDate = new Date(selectedDate.value);
  }

  if (selectedCatId.value) {
    baseData.catId = selectedCatId.value;
  }

  return baseData;
};

// Get edit form data
const getEditFormData = (): Partial<CreateVeterinaryVisitInput> => {
  if (!editingVisit.value) return {};

  return {
    catId: editingVisit.value.catId,
    visitDate: editingVisit.value.visitDate,
    hospitalName: editingVisit.value.hospital.name,
    doctorName: editingVisit.value.doctor?.name,
    treatments: editingVisit.value.treatments.map(t => t.treatment.name),
    cost: editingVisit.value.cost,
    notes: editingVisit.value.notes || undefined,
    hasBloodTest: editingVisit.value.hasBloodTest,
  };
};

// Get pre-filled appointment form data
const getPrefilledAppointmentFormData = (): any => {
  const baseData: any = {};

  if (selectedDate.value) {
    baseData.appointmentDate = new Date(selectedDate.value);
  }

  if (selectedCatId.value) {
    baseData.catId = selectedCatId.value;
  }

  return baseData;
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
};

// Lifecycle
onMounted(() => {
  fetchInitialData();
});
</script>

<template>
  <div class="veterinary-visits-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="page-title">
            通院履歴
          </h1>
          <p class="page-description">
            飼い猫の通院履歴をカレンダー形式で管理できます
          </p>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <!-- Cat Filter -->
          <div class="cat-filter">
            <select
              v-model="selectedCatId"
              class="cat-select"
              @change="handleCatFilterChange(selectedCatId)"
            >
              <option value="">
                すべての猫
              </option>
              <option
                v-for="cat in cats"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- View Mode Toggle -->
          <div class="view-toggle">
            <button
              type="button"
              class="view-button"
              :class="{ 'view-button--active': viewMode === 'calendar' }"
              title="カレンダー表示"
              @click="handleViewModeChange('calendar')"
            >
              <span class="view-icon">📅</span>
            </button>
            <button
              type="button"
              class="view-button"
              :class="{ 'view-button--active': viewMode === 'list' }"
              title="リスト表示"
              @click="handleViewModeChange('list')"
            >
              <span class="view-icon">📋</span>
            </button>
          </div>

          <!-- Add Button -->
          <button
            type="button"
            class="add-button"
            @click="handleAdd()"
          >
            <span class="add-icon">+</span>
            <span class="add-text">通院記録を追加</span>
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
      <!-- Visit Stats -->
      <div class="visit-stats">
        <div class="stats-section">
          <h3 class="stats-title">
            今月の統計
          </h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon visits">
                🏥
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ visitStats.thisMonth.total }}
                </div>
                <div class="stat-label">
                  通院回数
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon blood-test">
                🩸
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ visitStats.thisMonth.withBloodTest }}
                </div>
                <div class="stat-label">
                  血液検査
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon cost">
                💰
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ formatCurrency(visitStats.thisMonth.totalCost) }}
                </div>
                <div class="stat-label">
                  医療費
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <h3 class="stats-title">
            今年の統計
          </h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon visits">
                🏥
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ visitStats.thisYear.total }}
                </div>
                <div class="stat-label">
                  通院回数
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon blood-test">
                🩸
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ visitStats.thisYear.withBloodTest }}
                </div>
                <div class="stat-label">
                  血液検査
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon cost">
                💰
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ formatCurrency(visitStats.thisYear.totalCost) }}
                </div>
                <div class="stat-label">
                  医療費
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calendar View -->
      <div
        v-if="viewMode === 'calendar'"
        class="calendar-container"
      >
        <VeterinaryVisitCalendar
          :visits="filteredVisits"
          :cats="cats"
          :selected-cat-id="selectedCatId"
          @date-selected="handleDateSelected"
          @visit-create="handleRecordCreate"
          @appointment-create="handleAddAppointment"
          @visit-edit="handleEdit"
          @visit-delete="handleDelete"
        />
      </div>

      <!-- List View -->
      <div
        v-else
        class="list-container"
      >
        <VeterinaryVisitList
          :visits="filteredVisits"
          :loading="isLoading"
          :show-actions="true"
          @select="handleEdit"
          @edit="handleEdit"
          @delete="handleDelete"
          @add="handleAdd"
        />
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3 class="quick-actions-title">
          関連機能
        </h3>
        <div class="action-buttons">
          <NuxtLink
            to="/veterinary-appointments"
            class="action-button"
          >
            <span class="action-icon">📅</span>
            <span class="action-text">予約管理</span>
          </NuxtLink>
          <NuxtLink
            to="/cats"
            class="action-button"
          >
            <span class="action-icon">🐱</span>
            <span class="action-text">猫の管理</span>
          </NuxtLink>
          <NuxtLink
            to="/medications"
            class="action-button"
          >
            <span class="action-icon">💊</span>
            <span class="action-text">薬の管理</span>
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

    <!-- Add Visit Modal -->
    <VeterinaryVisitForm
      :is-open="showAddModal"
      :cats="cats"
      :initial-data="getPrefilledFormData()"
      @close="handleAddCancel"
      @save="handleAddSubmit"
    />

    <!-- Edit Visit Modal -->
    <VeterinaryVisitForm
      v-if="editingVisit"
      :is-open="showEditModal"
      :visit="editingVisit"
      :cats="cats"
      :initial-data="getEditFormData()"
      @close="handleEditCancel"
      @save="handleEditSubmit"
    />

    <!-- Add Appointment Modal -->
    <VeterinaryAppointmentForm
      :is-open="showAddAppointmentModal"
      :cats="cats"
      :initial-data="getPrefilledAppointmentFormData()"
      @close="handleAddAppointmentCancel"
      @save="handleAddAppointmentSubmit"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`通院記録を削除`"
      :message="`${visitToDelete?.hospital.name}での通院記録を削除しますか？この操作は取り消せません。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.veterinary-visits-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .veterinary-visits-page {
    max-width: 1400px;
    padding: 2rem;
  }

  .page-header {
    padding: 2.5rem;
    margin-bottom: 2.5rem;
  }

  .page-title {
    font-size: 2.5rem;
  }

  .page-description {
    font-size: 1.2rem;
  }

  .header-actions {
    gap: 1.5rem;
  }

  .cat-select {
    min-width: 180px;
    padding: 0.875rem 1.25rem;
    font-size: 1rem;
  }

  .view-button {
    width: 48px;
    height: 48px;
  }

  .add-button {
    padding: 0.875rem 2rem;
    font-size: 1rem;
  }

  .visit-stats {
    gap: 2.5rem;
    margin-bottom: 2.5rem;
  }

  .stats-section {
    padding: 2rem;
  }

  .stats-title {
    font-size: 1.3rem;
    margin-bottom: 1.5rem;
  }

  .stats-grid {
    gap: 1.5rem;
  }

  .stat-card {
    padding: 1.5rem;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 1.75rem;
  }

  .stat-value {
    font-size: 1.75rem;
  }

  .stat-label {
    font-size: 0.9rem;
  }

  .calendar-container,
  .list-container {
    margin-bottom: 2.5rem;
  }

  .quick-actions {
    padding: 2.5rem;
  }

  .quick-actions-title {
    font-size: 1.5rem;
    margin-bottom: 2rem;
  }

  .action-buttons {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  .action-button {
    padding: 2rem;
    min-height: 120px;
  }

  .action-icon {
    font-size: 2.5rem;
  }

  .action-text {
    font-size: 1rem;
  }
}

/* Large desktop optimizations */
@media (min-width: 1440px) {
  .veterinary-visits-page {
    max-width: 1600px;
    padding: 3rem;
  }

  .page-header {
    padding: 3rem;
  }

  .page-title {
    font-size: 3rem;
  }

  .visit-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3rem;
  }

  .stats-section {
    padding: 2.5rem;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .stat-card {
    padding: 2rem;
  }

  .quick-actions {
    padding: 3rem;
  }

  .action-buttons {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }

  .action-button {
    padding: 2.5rem;
    min-height: 140px;
  }

  .action-icon {
    font-size: 3rem;
  }

  .action-text {
    font-size: 1.1rem;
  }
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

.cat-filter {
  position: relative;
}

.cat-select {
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #333;
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 140px;
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

/* Visit Stats */
.visit-stats {
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

.stat-icon.visits {
  background: #e3f2fd;
}

.stat-icon.blood-test {
  background: #fce4ec;
}

.stat-icon.cost {
  background: #e8f5e9;
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

/* List Container */
.list-container {
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
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .cat-select {
    min-width: 120px;
  }

  .visit-stats {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .veterinary-visits-page {
    padding: 0;
  }

  .page-header {
    border-radius: 0;
    margin-bottom: 1rem;
    padding: 1.5rem 1rem;
  }

  .header-content {
    gap: 1.5rem;
  }

  .page-title {
    font-size: 1.6rem;
  }

  .page-description {
    font-size: 1rem;
  }

  .header-actions {
    gap: 1rem;
    flex-direction: column;
    align-items: stretch;
  }

  .cat-filter {
    order: 1;
  }

  .cat-select {
    width: 100%;
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .view-toggle {
    order: 2;
    align-self: center;
    width: auto;
  }

  .view-button {
    width: 48px;
    height: 48px;
    border-radius: 8px;
  }

  .view-icon {
    font-size: 1.25rem;
  }

  .add-button {
    order: 3;
    width: 100%;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .add-text {
    display: inline;
  }

  .add-icon {
    font-size: 1.25rem;
  }

  /* Mobile stats */
  .visit-stats {
    margin: 0 1rem;
    gap: 1rem;
  }

  .stats-section {
    padding: 1rem;
  }

  .stats-title {
    font-size: 1rem;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.75rem 0.5rem;
  }

  .stat-icon {
    font-size: 1.2rem;
    width: 32px;
    height: 32px;
  }

  .stat-value {
    font-size: 1.1rem;
  }

  .stat-label {
    font-size: 0.7rem;
  }

  /* Mobile containers */
  .calendar-container,
  .list-container {
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    margin: 0;
  }

  /* Mobile quick actions */
  .quick-actions {
    margin: 1rem;
    padding: 1.5rem;
    border-radius: 12px;
  }

  .quick-actions-title {
    font-size: 1.2rem;
  }

  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .action-button {
    flex-direction: column;
    justify-content: center;
    padding: 1rem;
    min-height: 80px;
    border-radius: 8px;
  }

  .action-icon {
    font-size: 1.5rem;
  }

  .action-text {
    font-size: 0.85rem;
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

  .page-description {
    font-size: 0.9rem;
  }

  .header-actions {
    gap: 0.75rem;
  }

  .cat-select {
    padding: 0.75rem 0.875rem;
    font-size: 0.9rem;
  }

  .view-button {
    width: 44px;
    height: 44px;
  }

  .view-icon {
    font-size: 1.1rem;
  }

  .add-button {
    padding: 0.875rem 1.25rem;
    font-size: 0.9rem;
  }

  .add-icon {
    font-size: 1.1rem;
  }

  /* Small mobile stats */
  .visit-stats {
    margin: 0 0.5rem;
  }

  .stats-section {
    padding: 0.75rem;
  }

  .stats-title {
    font-size: 0.9rem;
  }

  .stat-card {
    padding: 0.5rem 0.25rem;
  }

  .stat-icon {
    font-size: 1rem;
    width: 28px;
    height: 28px;
  }

  .stat-value {
    font-size: 1rem;
  }

  .stat-label {
    font-size: 0.65rem;
  }

  /* Small mobile quick actions */
  .quick-actions {
    margin: 0.5rem;
    padding: 1rem;
  }

  .quick-actions-title {
    font-size: 1.1rem;
  }

  .action-buttons {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .action-button {
    flex-direction: row;
    justify-content: flex-start;
    padding: 0.75rem;
    min-height: 60px;
  }

  .action-icon {
    font-size: 1.25rem;
  }

  .action-text {
    font-size: 0.8rem;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .cat-select,
  .view-button,
  .add-button,
  .retry-button,
  .action-button {
    min-height: 44px;
  }

  .view-button:hover,
  .add-button:hover,
  .action-button:hover {
    transform: none;
  }

  .view-button:active,
  .add-button:active,
  .action-button:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }

  .retry-button:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }

  /* Improve touch targets for stats */
  .stat-card {
    min-height: 60px;
    cursor: default;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .page-header,
  .calendar-container,
  .list-container,
  .quick-actions,
  .stats-section,
  .action-button {
    border: 2px solid #333;
  }

  .view-button {
    border-color: #333;
  }

  .view-button--active,
  .add-button,
  .retry-button {
    background: #000;
    color: #fff;
  }

  .cat-select {
    border-color: #333;
  }

  .stat-card {
    border: 1px solid #333;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .retry-button:hover,
  .add-button:hover,
  .action-button:hover,
  .view-button:active,
  .add-button:active,
  .action-button:active,
  .retry-button:active {
    transform: none;
  }

  * {
    transition: none !important;
  }
}

/* Focus management for accessibility */
@media (prefers-reduced-motion: no-preference) {
  .cat-select:focus,
  .view-button:focus,
  .add-button:focus,
  .retry-button:focus,
  .action-button:focus {
    outline: 3px solid #4caf50;
    outline-offset: 2px;
  }
}

/* Dark mode support (if needed in future) */
@media (prefers-color-scheme: dark) {
  .page-header,
  .calendar-container,
  .list-container,
  .quick-actions,
  .stats-section {
    background: #1a1a1a;
    color: #fff;
  }

  .cat-select {
    background: #2a2a2a;
    color: #fff;
    border-color: #444;
  }

  .stat-card,
  .action-button {
    background: #2a2a2a;
    border-color: #444;
  }
}
</style>
