<template>
  <div class="pending-medication-list">
    <div class="header">
      <h3 class="title">
        {{ title }}
      </h3>
      <div class="filters">
        <select
          v-model="selectedCatId"
          class="filter-select"
        >
          <option value="">
            全ての猫
          </option>
          <option
            v-for="cat in cats"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
        <select
          v-model="statusFilter"
          class="filter-select"
        >
          <option value="pending">
            投与予定
          </option>
          <option value="overdue">
            期限切れ
          </option>
          <option value="all">
            全て
          </option>
        </select>
      </div>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      読み込み中...
    </div>

    <div
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </div>

    <div
      v-else-if="filteredRecords.length === 0"
      class="empty-state"
    >
      <p>{{ emptyMessage }}</p>
    </div>

    <div
      v-else
      class="records-list"
    >
      <div
        v-for="record in sortedRecords"
        :key="record.id"
        class="record-item"
        :class="getRecordItemClass(record)"
      >
        <div class="record-header">
          <div class="cat-info">
            <span class="cat-name">{{ getCatName(record.catId) }}</span>
          </div>
          <div class="status-info">
            <MedicationStatusBadge
              :status="record.status"
              size="sm"
            />
            <span
              v-if="isOverdue(record)"
              class="overdue-badge"
            >
              期限切れ
            </span>
          </div>
        </div>

        <div class="record-content">
          <div class="medication-info">
            <h4 class="medication-name">
              {{ getMedicationName(record.medicationId) }}
            </h4>
            <p class="medication-details">
              {{ record.quantity }}個 - {{ formatDateTime(record.administeredAt) }}
            </p>
            <p
              v-if="record.notes"
              class="medication-notes"
            >
              {{ record.notes }}
            </p>
          </div>

          <div class="time-info">
            <span class="scheduled-time">
              予定: {{ formatTime(record.administeredAt) }}
            </span>
            <span
              v-if="isOverdue(record)"
              class="overdue-time"
            >
              {{ getOverdueText(record) }}
            </span>
          </div>
        </div>

        <div class="record-actions">
          <button
            class="action-btn action-btn--primary"
            @click="markAsAdministered(record)"
          >
            投与済みにする
          </button>
          <button
            class="action-btn action-btn--secondary"
            @click="markAsSkipped(record)"
          >
            スキップ
          </button>
          <button
            class="action-btn action-btn--danger"
            @click="markAsMissed(record)"
          >
            投与忘れ
          </button>
          <button
            class="action-btn action-btn--ghost"
            @click="editRecord(record)"
          >
            編集
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MedicationStatusBadge from './MedicationStatusBadge.vue';
import type { MedicationRecord, MedicationStatus } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

interface Props {
  cats: Cat[];
  medications: any[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  showOverdueOnly?: boolean;
}

interface Emits {
  (e: 'status-change', record: MedicationRecord, newStatus: MedicationStatus): void;
  (e: 'edit', record: MedicationRecord): void;
  (e: 'refresh'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  title: '投与予定の薬',
  showOverdueOnly: false,
});

const emit = defineEmits<Emits>();

// State
const selectedCatId = ref('');
const statusFilter = ref<'pending' | 'overdue' | 'all'>('pending');

// Store
const medicationsStore = useMedicationsStore();

// Computed
const pendingRecords = computed(() => medicationsStore.getPendingMedicationRecords);
const overdueRecords = computed(() => medicationsStore.getOverdueMedicationRecords);

const filteredRecords = computed(() => {
  let records: MedicationRecord[] = [];

  // Filter by status
  switch (statusFilter.value) {
    case 'pending':
      records = pendingRecords.value.filter(record => !isOverdue(record));
      break;
    case 'overdue':
      records = overdueRecords.value;
      break;
    case 'all':
      records = [...pendingRecords.value, ...overdueRecords.value];
      break;
  }

  // Filter by cat if selected
  if (selectedCatId.value) {
    records = records.filter(record => record.catId === selectedCatId.value);
  }

  return records;
});

const sortedRecords = computed(() => {
  return [...filteredRecords.value].sort((a, b) => {
    const aDate = new Date(a.administeredAt);
    const bDate = new Date(b.administeredAt);
    return aDate.getTime() - bDate.getTime();
  });
});

const emptyMessage = computed(() => {
  if (statusFilter.value === 'overdue') {
    return '期限切れの薬はありません';
  }
  else if (statusFilter.value === 'pending') {
    return '投与予定の薬はありません';
  }
  return '該当する薬はありません';
});

// Methods
const isOverdue = (record: MedicationRecord): boolean => {
  const now = new Date();
  const recordDate = new Date(record.administeredAt);
  return recordDate < now && record.status === 'PENDING';
};

const getOverdueText = (record: MedicationRecord): string => {
  const now = new Date();
  const recordDate = new Date(record.administeredAt);
  const diffMs = now.getTime() - recordDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}日遅れ`;
  }
  else if (diffHours > 0) {
    return `${diffHours}時間遅れ`;
  }
  else {
    return '期限切れ';
  }
};

const getCatName = (catId: string): string => {
  const cat = props.cats.find(c => c.id === catId);
  return cat?.name || '不明な猫';
};

const getMedicationName = (medicationId: string): string => {
  const medication = props.medications.find(m => m.id === medicationId);
  return medication?.name || '不明な薬';
};

const getRecordItemClass = (record: MedicationRecord): string => {
  if (isOverdue(record)) {
    return 'record-item--overdue';
  }
  return '';
};

const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Actions
const markAsAdministered = async (record: MedicationRecord) => {
  emit('status-change', record, 'ADMINISTERED' as MedicationStatus);
};

const markAsSkipped = async (record: MedicationRecord) => {
  emit('status-change', record, 'SKIPPED' as MedicationStatus);
};

const markAsMissed = async (record: MedicationRecord) => {
  emit('status-change', record, 'MISSED' as MedicationStatus);
};

const editRecord = (record: MedicationRecord) => {
  emit('edit', record);
};

// Initialize
if (props.showOverdueOnly) {
  statusFilter.value = 'overdue';
}
</script>

<style scoped>
.pending-medication-list {
  @apply space-y-4;
}

.header {
  @apply flex items-center justify-between;
}

.title {
  @apply text-lg font-semibold text-gray-900;
}

.filters {
  @apply flex gap-2;
}

.filter-select {
  @apply px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.loading, .error {
  @apply text-center py-8 text-gray-500;
}

.error {
  @apply text-red-500;
}

.empty-state {
  @apply text-center py-8 text-gray-500;
}

.records-list {
  @apply space-y-3;
}

.record-item {
  @apply bg-white border border-gray-200 rounded-lg p-4 shadow-sm;
}

.record-item--overdue {
  @apply border-red-300 bg-red-50;
}

.record-header {
  @apply flex items-center justify-between mb-3;
}

.cat-info .cat-name {
  @apply font-medium text-gray-900;
}

.status-info {
  @apply flex items-center gap-2;
}

.overdue-badge {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800;
}

.record-content {
  @apply mb-4;
}

.medication-name {
  @apply font-medium text-gray-900 mb-1;
}

.medication-details {
  @apply text-sm text-gray-600 mb-1;
}

.medication-notes {
  @apply text-sm text-gray-500 italic;
}

.time-info {
  @apply flex flex-col gap-1 mt-2;
}

.scheduled-time {
  @apply text-sm text-gray-600;
}

.overdue-time {
  @apply text-sm text-red-600 font-medium;
}

.record-actions {
  @apply flex gap-2 flex-wrap;
}

.action-btn {
  @apply px-3 py-1 rounded-md text-sm font-medium transition-colors;
}

.action-btn--primary {
  @apply bg-green-600 text-white hover:bg-green-700;
}

.action-btn--secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.action-btn--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.action-btn--ghost {
  @apply bg-transparent text-gray-600 border border-gray-300 hover:bg-gray-50;
}
</style>
