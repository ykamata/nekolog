<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';
import type {
  VeterinaryAppointmentWithRelations,
  CreateVeterinaryAppointmentInput,
  GetVeterinaryAppointmentsParams,
  AppointmentStatus,
} from '~/types/veterinary-visit';
import { useToast } from '~/composables/useToast';

// Page meta
useSeoMeta({
  title: '予約管理 - 猫の健康管理',
  description: '飼い猫の通院予約を管理します',
});

// Require authentication
definePageMeta({
  middleware: 'auth',
});

// State
const cats = ref<Cat[]>([]);
const appointments = ref<VeterinaryAppointmentWithRelations[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Filter state
const selectedCatId = ref<number | ''>('');
const selectedStatus = ref<AppointmentStatus | ''>('');

// Modal states
const showAddModal = ref(false);
const showEditModal = ref(false);
const showConvertModal = ref(false);
const editingAppointment = ref<VeterinaryAppointmentWithRelations | null>(null);
const convertingAppointment = ref<VeterinaryAppointmentWithRelations | null>(null);

// Delete confirmation state
const showDeleteConfirmation = ref(false);
const appointmentToDelete = ref<VeterinaryAppointmentWithRelations | null>(null);

// Stats
const appointmentStats = ref({
  upcoming: {
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
  },
  status: {
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  },
});

// Computed
const filteredAppointments = computed(() => {
  let filtered = appointments.value;

  if (selectedCatId.value) {
    filtered = filtered.filter(appointment => appointment.catId === Number(selectedCatId.value));
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(appointment => appointment.status === selectedStatus.value);
  }

  return filtered.sort((a, b) =>
    new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime(),
  );
});

// Status options for filter
const statusOptions = [
  { value: '', label: 'すべてのステータス' },
  { value: 'SCHEDULED', label: '予約済み' },
  { value: 'COMPLETED', label: '完了' },
  { value: 'CANCELLED', label: 'キャンセル' },
];

// Fetch initial data
const fetchInitialData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [catsResponse, appointmentsResponse] = await Promise.all([
      $fetch<Cat[]>('/api/cats'),
      fetchAppointments(),
    ]);

    cats.value = catsResponse;
    await fetchAppointmentStats();
  }
  catch (err) {
    error.value = 'データの取得に失敗しました';
    console.error('Failed to fetch initial data:', err);
  }
  finally {
    isLoading.value = false;
  }
};

// Fetch appointments
const fetchAppointments = async (params?: GetVeterinaryAppointmentsParams) => {
  try {
    const queryParams: GetVeterinaryAppointmentsParams = {
      catId: selectedCatId.value ? Number(selectedCatId.value) : undefined,
      status: selectedStatus.value || undefined,
      limit: 100,
      ...params,
    };

    const response = await $fetch<{ appointments: VeterinaryAppointmentWithRelations[] }>('/api/veterinary-appointments', {
      query: queryParams,
    });

    appointments.value = response.appointments;
    return response;
  }
  catch (err) {
    console.error('Failed to fetch appointments:', err);
    throw err;
  }
};

// Fetch appointment statistics
const fetchAppointmentStats = async () => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [upcomingAppointments, allAppointments] = await Promise.all([
      $fetch<{ appointments: VeterinaryAppointmentWithRelations[] }>('/api/veterinary-appointments', {
        query: {
          startDate: now.toISOString(),
          catId: selectedCatId.value || undefined,
        },
      }),
      $fetch<{ appointments: VeterinaryAppointmentWithRelations[] }>('/api/veterinary-appointments', {
        query: {
          catId: selectedCatId.value || undefined,
        },
      }),
    ]);

    const upcoming = upcomingAppointments.appointments || [];
    const all = allAppointments.appointments || [];

    appointmentStats.value = {
      upcoming: {
        total: upcoming.length,
        thisWeek: upcoming.filter((a: VeterinaryAppointmentWithRelations) =>
          new Date(a.appointmentDate) >= startOfWeek
            && new Date(a.appointmentDate) <= endOfWeek,
        ).length,
        thisMonth: upcoming.filter((a: VeterinaryAppointmentWithRelations) =>
          new Date(a.appointmentDate) >= startOfMonth
            && new Date(a.appointmentDate) <= endOfMonth,
        ).length,
      },
      status: {
        scheduled: all.filter((a: VeterinaryAppointmentWithRelations) => a.status === 'SCHEDULED').length,
        completed: all.filter((a: VeterinaryAppointmentWithRelations) => a.status === 'COMPLETED').length,
        cancelled: all.filter((a: VeterinaryAppointmentWithRelations) => a.status === 'CANCELLED').length,
      },
    };
  }
  catch (err) {
    console.error('Failed to fetch appointment stats:', err);
    // Silently fail for stats
  }
};

// Handle filter changes
const handleCatFilterChange = async (catId: number | '' | null) => {
  const normalized = catId ? Number(catId) : '';
  selectedCatId.value = normalized as any;
  await fetchAppointments();
  await fetchAppointmentStats();
};

const handleStatusFilterChange = async (status: AppointmentStatus | '') => {
  selectedStatus.value = status;
  await fetchAppointments();
};

// Handle add appointment
const handleAdd = () => {
  showAddModal.value = true;
};

// Handle edit appointment
const handleEdit = (appointment: VeterinaryAppointmentWithRelations) => {
  editingAppointment.value = appointment;
  showEditModal.value = true;
};

// Handle delete appointment
const handleDelete = (appointmentId: number) => {
  const appointment = appointments.value.find(a => a.id === appointmentId);
  if (appointment) {
    appointmentToDelete.value = appointment;
    showDeleteConfirmation.value = true;
  }
};

// Handle convert to visit
const handleConvertToVisit = (appointmentId: number) => {
  const appointment = appointments.value.find(a => a.id === appointmentId);
  if (appointment) {
    convertingAppointment.value = appointment;
    showConvertModal.value = true;
  }
};

// Confirm delete
const confirmDelete = async () => {
  if (!appointmentToDelete.value) return;

  try {
    await $fetch(`/api/veterinary-appointments/${appointmentToDelete.value.id}`, {
      method: 'DELETE' as any,
    });

    // Remove from local state
    appointments.value = appointments.value.filter(a => a.id !== appointmentToDelete.value!.id);

    // Refresh stats
    await fetchAppointmentStats();
  }
  catch (err) {
    error.value = '予約の削除に失敗しました';
    console.error('Failed to delete appointment:', err);
  }
  finally {
    showDeleteConfirmation.value = false;
    appointmentToDelete.value = null;
  }
};

// Cancel delete
const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  appointmentToDelete.value = null;
};

// Handle form submission for add
const handleAddSubmit = async (data: CreateVeterinaryAppointmentInput) => {
  try {
    const response = await $fetch<{ appointment: VeterinaryAppointmentWithRelations; message: string }>('/api/veterinary-appointments', {
      method: 'POST',
      body: data,
    });

    // Add to local state
    appointments.value.unshift(response.appointment);

    // Refresh stats
    await fetchAppointmentStats();

    // If there are active filters, refresh the appointments list to ensure consistency
    if (selectedCatId.value || selectedStatus.value) {
      await fetchAppointments();
    }

    showAddModal.value = false;
  }
  catch (err) {
    error.value = '予約の作成に失敗しました';
    console.error('Failed to create appointment:', err);
  }
};

// Handle form submission for edit
const handleEditSubmit = async (data: CreateVeterinaryAppointmentInput) => {
  if (!editingAppointment.value) return;

  try {
    const response = await $fetch<{ appointment: VeterinaryAppointmentWithRelations; message: string }>(`/api/veterinary-appointments/${editingAppointment.value.id}`, {
      method: 'PUT' as any,
      body: data,
    });

    // Update local state
    const index = appointments.value.findIndex(a => a.id === editingAppointment.value!.id);
    if (index !== -1) {
      appointments.value[index] = response.appointment;
    }

    // Refresh stats
    await fetchAppointmentStats();

    // If there are active filters, refresh the appointments list to ensure consistency
    if (selectedCatId.value || selectedStatus.value) {
      await fetchAppointments();
    }

    showEditModal.value = false;
    editingAppointment.value = null;
  }
  catch (err) {
    error.value = '予約の更新に失敗しました';
    console.error('Failed to update appointment:', err);
  }
};

// Handle convert to visit
const handleConvertSubmit = async () => {
  if (!convertingAppointment.value) return;

  try {
    // Convert appointment to visit
    await $fetch(`/api/veterinary-appointments/${convertingAppointment.value.id}/convert`, {
      method: 'POST',
    });

    // Remove from appointments list
    appointments.value = appointments.value.filter(a => a.id !== convertingAppointment.value!.id);

    // Refresh stats
    await fetchAppointmentStats();

    showConvertModal.value = false;
    convertingAppointment.value = null;

    // Show success message and redirect to visits page
    const { addToast } = useToast();
    addToast('success', {
      title: '変換完了',
      message: '予約が通院記録に変換されました',
    });

    // Navigate to visits page after a short delay
    setTimeout(() => {
      navigateTo('/veterinary-visits');
    }, 1500);
  }
  catch (err) {
    error.value = '予約の変換に失敗しました';
  }
};

// Handle status update
const handleStatusUpdate = async (appointmentId: number, status: AppointmentStatus) => {
  try {
    const response = await $fetch<{ appointment: VeterinaryAppointmentWithRelations; message: string }>(`/api/veterinary-appointments/${appointmentId}`, {
      method: 'PUT' as any,
      body: { status },
    });

    // Update local state
    const index = appointments.value.findIndex(a => a.id === appointmentId);
    if (index !== -1) {
      appointments.value[index] = response.appointment;
    }

    // Refresh stats
    await fetchAppointmentStats();

    // Show success message
    const { addToast } = useToast();
    addToast('success', {
      title: 'ステータス更新',
      message: `予約のステータスを「${getStatusLabel(status)}」に変更しました`,
    });
  }
  catch (err) {
    error.value = 'ステータスの更新に失敗しました';
  }
};

// Handle form cancel
const handleAddCancel = () => {
  showAddModal.value = false;
};

const handleEditCancel = () => {
  showEditModal.value = false;
  editingAppointment.value = null;
};

const handleConvertCancel = () => {
  showConvertModal.value = false;
  convertingAppointment.value = null;
};

// Get pre-filled form data
const getPrefilledFormData = (): Partial<CreateVeterinaryAppointmentInput> => {
  const baseData: Partial<CreateVeterinaryAppointmentInput> = {};

  if (selectedCatId.value) {
    baseData.catId = selectedCatId.value;
  }

  return baseData;
};

// Get edit form data
const getEditFormData = (): Partial<CreateVeterinaryAppointmentInput> => {
  if (!editingAppointment.value) return {};

  return {
    catId: editingAppointment.value.catId,
    appointmentDate: editingAppointment.value.appointmentDate,
    hospitalName: editingAppointment.value.hospital.name,
    doctorName: editingAppointment.value.doctor?.name,
    plannedTreatments: editingAppointment.value.plannedTreatments || undefined,
    notes: editingAppointment.value.notes || undefined,
  };
};

// Format date
const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Get status label
const getStatusLabel = (status: AppointmentStatus) => {
  const statusLabels = {
    SCHEDULED: '予約済み',
    COMPLETED: '完了',
    CANCELLED: 'キャンセル',
  };
  return statusLabels[status] || status;
};

// Lifecycle
onMounted(() => {
  fetchInitialData();
});
</script>

<template>
  <div class="veterinary-appointments-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-main">
          <h1 class="page-title">
            予約管理
          </h1>
          <p class="page-description">
            飼い猫の通院予約を管理できます
          </p>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <!-- Cat Filter -->
          <div class="filter-group">
            <select
              v-model="selectedCatId"
              class="filter-select"
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

          <!-- Status Filter -->
          <div class="filter-group">
            <select
              v-model="selectedStatus"
              class="filter-select"
              @change="handleStatusFilterChange(selectedStatus as AppointmentStatus | '')"
            >
              <option
                v-for="option in statusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Add Button -->
          <button
            type="button"
            class="add-button"
            @click="handleAdd"
          >
            <span class="add-icon">+</span>
            <span class="add-text">予約を追加</span>
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
      <!-- Appointment Stats -->
      <div class="appointment-stats">
        <div class="stats-section">
          <h3 class="stats-title">
            今後の予約
          </h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon total">
                📅
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ appointmentStats.upcoming.total }}
                </div>
                <div class="stat-label">
                  総予約数
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon week">
                📆
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ appointmentStats.upcoming.thisWeek }}
                </div>
                <div class="stat-label">
                  今週
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon month">
                🗓️
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ appointmentStats.upcoming.thisMonth }}
                </div>
                <div class="stat-label">
                  今月
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <h3 class="stats-title">
            ステータス別
          </h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon scheduled">
                ⏰
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ appointmentStats.status.scheduled }}
                </div>
                <div class="stat-label">
                  予約済み
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon completed">
                ✅
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ appointmentStats.status.completed }}
                </div>
                <div class="stat-label">
                  完了
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon cancelled">
                ❌
              </div>
              <div class="stat-content">
                <div class="stat-value">
                  {{ appointmentStats.status.cancelled }}
                </div>
                <div class="stat-label">
                  キャンセル
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Appointments List -->
      <div class="appointments-container">
        <VeterinaryAppointmentList
          :appointments="filteredAppointments"
          :cats="cats"
          :loading="isLoading"
          @edit="handleEdit"
          @delete="handleDelete"
          @convert-to-visit="handleConvertToVisit"
          @update-status="handleStatusUpdate"
        />
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3 class="quick-actions-title">
          関連機能
        </h3>
        <div class="action-buttons">
          <NuxtLink
            to="/veterinary-visits"
            class="action-button"
          >
            <span class="action-icon">🏥</span>
            <span class="action-text">通院履歴</span>
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

    <!-- Add Appointment Modal -->
    <VeterinaryAppointmentForm
      :is-open="showAddModal"
      :cats="cats"
      :initial-data="getPrefilledFormData()"
      @close="handleAddCancel"
      @save="handleAddSubmit"
    />

    <!-- Edit Appointment Modal -->
    <VeterinaryAppointmentForm
      v-if="editingAppointment"
      :is-open="showEditModal"
      :appointment="editingAppointment"
      :cats="cats"
      :initial-data="getEditFormData()"
      @close="handleEditCancel"
      @save="handleEditSubmit"
    />

    <!-- Convert to Visit Modal -->
    <VeterinaryAppointmentConvertDialog
      v-if="convertingAppointment"
      :is-open="showConvertModal"
      :appointment="convertingAppointment"
      :cats="cats"
      @close="handleConvertCancel"
      @convert="handleConvertSubmit"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`予約を削除`"
      :message="`${appointmentToDelete?.hospital.name}での予約（${appointmentToDelete ? formatDate(appointmentToDelete.appointmentDate) : ''}）を削除しますか？この操作は取り消せません。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.veterinary-appointments-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .veterinary-appointments-page {
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

  .filter-select {
    min-width: 180px;
    padding: 0.875rem 1.25rem;
    font-size: 1rem;
  }

  .add-button {
    padding: 0.875rem 2rem;
    font-size: 1rem;
  }

  .appointment-stats {
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

  .appointments-container {
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
  .veterinary-appointments-page {
    max-width: 1600px;
    padding: 3rem;
  }

  .page-header {
    padding: 3rem;
  }

  .page-title {
    font-size: 3rem;
  }

  .appointment-stats {
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

.filter-group {
  position: relative;
}

.filter-select {
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

.filter-select:hover {
  border-color: #4caf50;
}

.filter-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
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

/* Appointment Stats */
.appointment-stats {
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

.stat-icon.total {
  background: #e3f2fd;
}

.stat-icon.week {
  background: #f3e5f5;
}

.stat-icon.month {
  background: #e8f5e9;
}

.stat-icon.scheduled {
  background: #fff3cd;
}

.stat-icon.completed {
  background: #d4edda;
}

.stat-icon.cancelled {
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

/* Appointments Container */
.appointments-container {
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

  .appointment-stats {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .veterinary-appointments-page {
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

  .filter-group {
    order: 1;
  }

  .filter-select {
    width: 100%;
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
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
  .appointment-stats {
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
  .appointments-container {
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

  .filter-select {
    padding: 0.75rem 0.875rem;
    font-size: 0.9rem;
  }

  .add-button {
    padding: 0.875rem 1.25rem;
    font-size: 0.9rem;
  }

  .add-icon {
    font-size: 1.1rem;
  }

  /* Small mobile stats */
  .appointment-stats {
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
  .filter-select,
  .add-button,
  .retry-button,
  .action-button {
    min-height: 44px;
  }

  .add-button:hover,
  .action-button:hover {
    transform: none;
  }

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
  .appointments-container,
  .quick-actions,
  .stats-section,
  .action-button {
    border: 2px solid #333;
  }

  .add-button,
  .retry-button {
    background: #000;
    color: #fff;
  }

  .filter-select {
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
  .filter-select:focus,
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
  .appointments-container,
  .quick-actions,
  .stats-section {
    background: #1a1a1a;
    color: #fff;
  }

  .filter-select {
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
