<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';
import type {
  VeterinaryAppointmentWithRelations,
  UpdateVeterinaryAppointmentInput, AppointmentStatus,
} from '~/types/veterinary-visit';
import { useToast } from '~/composables/useToast';

interface Props {
  appointments: VeterinaryAppointmentWithRelations[];
  cats: Cat[];
  loading?: boolean;
  showActions?: boolean;
  selectedCatId?: number;
}

interface Emits {
  (e: 'edit', appointment: VeterinaryAppointmentWithRelations): void;
  (e: 'delete', appointmentId: number): void;
  (e: 'convertToVisit', appointmentId: number): void;
  (e: 'updateStatus', appointmentId: number, status: AppointmentStatus): void;
  (e: 'refresh'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
});

const emit = defineEmits<Emits>();

// State
const selectedAppointment = ref<VeterinaryAppointmentWithRelations | null>(null);
const showDeleteConfirm = ref(false);
const showStatusMenu = ref<number | null>(null);

// Toast
const toast = useToast();

// Computed
const filteredAppointments = computed(() => {
  if (!props.selectedCatId) return props.appointments;
  return props.appointments.filter(appointment => appointment.catId === props.selectedCatId);
});

const groupedAppointments = computed(() => {
  const groups: Record<string, VeterinaryAppointmentWithRelations[]> = {};

  filteredAppointments.value.forEach((appointment) => {
    const dateKey = new Date(appointment.appointmentDate).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(appointment);
  });

  // Sort groups by date (newest first)
  const sortedGroups = Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([date, appointments]) => ({
      date,
      appointments: appointments.sort((a, b) =>
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime(),
      ),
    }));

  return sortedGroups;
});

const statusOptions = computed(() => [
  { value: 'SCHEDULED' as AppointmentStatus, label: '予約済み', color: 'blue' },
  { value: 'COMPLETED' as AppointmentStatus, label: '完了', color: 'green' },
  { value: 'CANCELLED' as AppointmentStatus, label: 'キャンセル', color: 'red' },
]);

// Methods
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(d);
};

const formatTime = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const formatDateTime = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).format(d);
};

const getStatusColor = (status: AppointmentStatus) => {
  const option = statusOptions.value.find(opt => opt.value === status);
  return option?.color || 'gray';
};

const getStatusLabel = (status: AppointmentStatus) => {
  const option = statusOptions.value.find(opt => opt.value === status);
  return option?.label || status;
};

const getCatName = (catId: number) => {
  const cat = props.cats.find(c => c.id === catId);
  return cat?.name || '不明';
};

const isAppointmentPast = (appointmentDate: Date | string) => {
  return new Date(appointmentDate) < new Date();
};

const canConvertToVisit = (appointment: VeterinaryAppointmentWithRelations) => {
  return appointment.status === 'SCHEDULED'
    && isAppointmentPast(appointment.appointmentDate);
};

const handleEdit = (appointment: VeterinaryAppointmentWithRelations) => {
  emit('edit', appointment);
};

const handleDelete = (appointment: VeterinaryAppointmentWithRelations) => {
  selectedAppointment.value = appointment;
  showDeleteConfirm.value = true;
};

const confirmDelete = () => {
  if (selectedAppointment.value) {
    emit('delete', selectedAppointment.value.id);
    showDeleteConfirm.value = false;
    selectedAppointment.value = null;
  }
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  selectedAppointment.value = null;
};

const handleConvertToVisit = (appointment: VeterinaryAppointmentWithRelations) => {
  emit('convertToVisit', appointment.id);
};

const handleStatusChange = (appointmentId: number, status: AppointmentStatus) => {
  emit('updateStatus', appointmentId, status);
  showStatusMenu.value = null;
};

const toggleStatusMenu = (appointmentId: number) => {
  showStatusMenu.value = showStatusMenu.value === appointmentId ? null : appointmentId;
};

const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  if (!target.closest('.status-menu-container')) {
    showStatusMenu.value = null;
  }
};

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="appointment-list">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-container"
    >
      <div class="loading-spinner" />
      <p class="loading-text">
        予約を読み込み中...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredAppointments.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2"
          />
        </svg>
      </div>
      <h3 class="empty-title">
        予約がありません
      </h3>
      <p class="empty-description">
        {{ selectedCatId ? '選択した猫の予約がありません' : '予約がまだ登録されていません' }}
      </p>
    </div>

    <!-- Appointment Groups -->
    <div
      v-else
      class="appointment-groups"
    >
      <div
        v-for="group in groupedAppointments"
        :key="group.date"
        class="appointment-group"
      >
        <div class="group-header">
          <h3 class="group-date">
            {{ formatDate(group.date) }}
          </h3>
          <span class="group-count">
            {{ group.appointments.length }}件
          </span>
        </div>

        <div class="appointment-cards">
          <div
            v-for="appointment in group.appointments"
            :key="appointment.id"
            class="appointment-card"
            :class="{
              'appointment-card--past': isAppointmentPast(appointment.appointmentDate),
              'appointment-card--cancelled': appointment.status === 'CANCELLED',
            }"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="appointment-time">
                {{ formatTime(appointment.appointmentDate) }}
              </div>
              <div class="status-menu-container">
                <button
                  type="button"
                  class="status-badge"
                  :class="`status-badge--${getStatusColor(appointment.status)}`"
                  @click="toggleStatusMenu(appointment.id)"
                >
                  {{ getStatusLabel(appointment.status) }}
                  <svg
                    class="status-arrow"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <!-- Status Menu -->
                <div
                  v-if="showStatusMenu === appointment.id"
                  class="status-menu"
                >
                  <button
                    v-for="option in statusOptions"
                    :key="option.value"
                    type="button"
                    class="status-option"
                    :class="{ 'status-option--active': appointment.status === option.value }"
                    @click="handleStatusChange(appointment.id, option.value)"
                  >
                    <span
                      class="status-dot"
                      :class="`status-dot--${option.color}`"
                    />
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Card Content -->
            <div class="card-content">
              <div class="appointment-info">
                <div class="info-row">
                  <span class="info-label">猫:</span>
                  <span class="info-value">{{ getCatName(appointment.catId) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">病院:</span>
                  <span class="info-value">{{ appointment.hospital.name }}</span>
                </div>
                <div
                  v-if="appointment.doctor"
                  class="info-row"
                >
                  <span class="info-label">先生:</span>
                  <span class="info-value">{{ appointment.doctor.name }}</span>
                </div>
                <div
                  v-if="appointment.plannedTreatments"
                  class="info-row"
                >
                  <span class="info-label">予定:</span>
                  <span class="info-value">{{ appointment.plannedTreatments }}</span>
                </div>
                <div
                  v-if="appointment.notes"
                  class="info-row"
                >
                  <span class="info-label">メモ:</span>
                  <span class="info-value">{{ appointment.notes }}</span>
                </div>
              </div>
            </div>

            <!-- Card Actions -->
            <div
              v-if="showActions"
              class="card-actions"
            >
              <button
                v-if="canConvertToVisit(appointment)"
                type="button"
                class="action-button action-button--convert"
                @click="handleConvertToVisit(appointment)"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                通院記録に変換
              </button>

              <button
                type="button"
                class="action-button action-button--edit"
                @click="handleEdit(appointment)"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                編集
              </button>

              <button
                type="button"
                class="action-button action-button--delete"
                @click="handleDelete(appointment)"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirm"
      title="予約を削除"
      :message="`「${selectedAppointment?.hospital.name}」の予約を削除しますか？この操作は取り消せません。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .appointment-list {
    gap: 2rem;
    padding: 2rem;
  }

  .list-header {
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .list-title {
    font-size: 1.5rem;
  }

  .appointment-group {
    margin-bottom: 2rem;
  }

  .group-header {
    padding: 1rem 1.5rem;
    font-size: 1.2rem;
  }

  .appointment-card {
    padding: 2rem;
    margin-bottom: 1.5rem;
    border-radius: 12px;
  }

  .card-header {
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .appointment-time {
    font-size: 1.2rem;
  }

  .status-badge {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .card-content {
    margin-bottom: 1.5rem;
  }

  .info-row {
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .info-label {
    min-width: 120px;
    font-size: 1rem;
  }

  .info-value {
    font-size: 1rem;
  }

  .card-actions {
    gap: 1rem;
  }

  .action-button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .empty-state {
    padding: 4rem 2rem;
  }

  .empty-icon {
    width: 4rem;
    height: 4rem;
  }

  .empty-title {
    font-size: 1.5rem;
  }

  .empty-description {
    font-size: 1.1rem;
    max-width: 500px;
  }

  .loading-container {
    padding: 4rem 2rem;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
  }
}

/* Large desktop optimizations */
@media (min-width: 1440px) {
  .appointment-list {
    gap: 2.5rem;
    padding: 2.5rem;
  }

  .list-header {
    padding: 2.5rem;
  }

  .list-title {
    font-size: 1.75rem;
  }

  .appointment-group {
    margin-bottom: 2.5rem;
  }

  .group-header {
    padding: 1.25rem 2rem;
    font-size: 1.3rem;
  }

  .appointment-card {
    padding: 2.5rem;
    margin-bottom: 2rem;
  }

  .card-header {
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .appointment-time {
    font-size: 1.3rem;
  }

  .status-badge {
    padding: 0.75rem 1.25rem;
    font-size: 1.1rem;
  }

  .card-content {
    margin-bottom: 2rem;
  }

  .info-row {
    gap: 1.5rem;
    margin-bottom: 1.25rem;
  }

  .info-label {
    min-width: 140px;
    font-size: 1.1rem;
  }

  .info-value {
    font-size: 1.1rem;
  }

  .card-actions {
    gap: 1.5rem;
  }

  .action-button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #666;
  font-size: 0.9rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  gap: 1rem;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  color: #cbd5e0;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #4a5568;
  margin: 0;
}

.empty-description {
  color: #718096;
  margin: 0;
}

.appointment-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.appointment-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.group-date {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.group-count {
  font-size: 0.875rem;
  color: #666;
  background: #f7fafc;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.appointment-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.appointment-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  position: relative;
}

.appointment-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e0;
}

.appointment-card--past {
  background: #f8f9fa;
  border-color: #e9ecef;
}

.appointment-card--cancelled {
  background: #fef2f2;
  border-color: #fecaca;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.appointment-time {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.status-menu-container {
  position: relative;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-badge--blue {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge--green {
  background: #dcfce7;
  color: #166534;
}

.status-badge--red {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge--gray {
  background: #f3f4f6;
  color: #4b5563;
}

.status-arrow {
  width: 0.75rem;
  height: 0.75rem;
  transition: transform 0.2s ease;
}

.status-badge:hover .status-arrow {
  transform: rotate(180deg);
}

.status-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  min-width: 120px;
  overflow: hidden;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.875rem;
}

.status-option:hover {
  background: #f8f9fa;
}

.status-option--active {
  background: #f0f8f0;
  color: #166534;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.status-dot--blue {
  background: #3b82f6;
}

.status-dot--green {
  background: #10b981;
}

.status-dot--red {
  background: #ef4444;
}

.status-dot--gray {
  background: #6b7280;
}

.card-content {
  margin-bottom: 1rem;
}

.appointment-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  gap: 0.5rem;
}

.info-label {
  font-weight: 500;
  color: #666;
  min-width: 3rem;
  flex-shrink: 0;
}

.info-value {
  color: #333;
  flex: 1;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.action-button svg {
  width: 0.875rem;
  height: 0.875rem;
}

.action-button--convert {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.action-button--convert:hover {
  background: #fde68a;
  border-color: #d97706;
}

.action-button--edit {
  background: #e0f2fe;
  border-color: #0284c7;
  color: #0c4a6e;
}

.action-button--edit:hover {
  background: #bae6fd;
  border-color: #0369a1;
}

.action-button--delete {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.action-button--delete:hover {
  background: #fecaca;
  border-color: #dc2626;
}

/* Tablet responsive */
@media (max-width: 1024px) {
  .appointment-list {
    padding: 1rem;
  }

  .appointment-card {
    padding: 1.25rem;
  }

  .card-header {
    gap: 1rem;
  }

  .appointment-time {
    font-size: 1rem;
  }

  .info-row {
    gap: 0.75rem;
  }

  .info-label {
    min-width: 80px;
    font-size: 0.9rem;
  }

  .action-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .appointment-list {
    padding: 0.5rem;
    border-radius: 0;
    box-shadow: none;
  }

  .list-header {
    padding: 1rem;
    text-align: center;
  }

  .list-title {
    font-size: 1.1rem;
  }

  .appointment-card {
    padding: 1.25rem;
    margin-bottom: 1rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #e0e0e0;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .appointment-time {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
  }

  .appointment-time::before {
    content: '📅 ';
    margin-right: 0.5rem;
  }

  .status-badge {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    border-radius: 16px;
  }

  .card-content {
    margin-bottom: 1rem;
  }

  .info-row {
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .info-label {
    min-width: auto;
    font-size: 0.9rem;
    font-weight: 600;
    color: #666;
    display: flex;
    align-items: center;
  }

  .info-value {
    font-size: 1rem;
    color: #333;
    margin-left: 1.5rem;
  }

  .info-label[data-label="cat"]::before {
    content: '🐱 ';
    margin-right: 0.5rem;
  }

  .info-label[data-label="hospital"]::before {
    content: '🏥 ';
    margin-right: 0.5rem;
  }

  .info-label[data-label="doctor"]::before {
    content: '👨‍⚕️ ';
    margin-right: 0.5rem;
  }

  .info-label[data-label="treatments"]::before {
    content: '💊 ';
    margin-right: 0.5rem;
  }

  .info-label[data-label="notes"]::before {
    content: '📝 ';
    margin-right: 0.5rem;
  }

  .card-actions {
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }

  .action-button {
    width: 100%;
    justify-content: center;
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .action-button:active {
    transform: scale(0.98);
  }

  /* Empty state mobile */
  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
  }

  .empty-icon {
    width: 3rem;
    height: 3rem;
    margin-bottom: 1rem;
  }

  .empty-title {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .empty-description {
    font-size: 1rem;
    max-width: none;
  }

  /* Loading state mobile */
  .loading-container {
    padding: 3rem 1rem;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
  }
}

/* Small mobile responsive */
@media (max-width: 480px) {
  .appointment-list {
    padding: 0.25rem;
  }

  .list-header {
    padding: 0.75rem;
  }

  .list-title {
    font-size: 1rem;
  }

  .appointment-card {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .card-header {
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .appointment-time {
    font-size: 1rem;
  }

  .status-badge {
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
  }

  .info-row {
    margin-bottom: 0.5rem;
    padding: 0.625rem;
  }

  .info-label {
    font-size: 0.8rem;
  }

  .info-value {
    font-size: 0.9rem;
    margin-left: 1.25rem;
  }

  .card-actions {
    gap: 0.5rem;
    padding-top: 0.75rem;
  }

  .action-button {
    padding: 0.75rem 0.875rem;
    font-size: 0.9rem;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .action-button {
    min-height: 44px;
  }

  .appointment-card {
    cursor: default;
  }

  .action-button:hover {
    transform: none;
  }

  .action-button:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .appointment-list,
  .appointment-card {
    border: 2px solid #000;
  }

  .info-row {
    border: 1px solid #000;
  }

  .action-button {
    border: 2px solid #000;
  }

  .action-button--primary {
    background: #000;
    color: #fff;
  }

  .action-button--secondary {
    background: #fff;
    color: #000;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .action-button:active {
    transform: none;
  }

  * {
    transition: none !important;
  }
}
</style>
