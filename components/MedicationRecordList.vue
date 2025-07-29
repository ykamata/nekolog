<script setup lang="ts">
import ConfirmationDialog from './ConfirmationDialog.vue';
import MedicationStatusBadge from './MedicationStatusBadge.vue';
import type {
  MedicationRecord,
  MedicationRecordFilter,
  MedicationStatus,
  Medication,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

interface Props {
  cats: Cat[];
  medications: Medication[];
  initialFilter?: Partial<MedicationRecordFilter>;
  loading?: boolean;
  selectedCatId?: string; // Add support for pre-selected cat
}

interface Emits {
  (e: 'edit' | 'delete', record: MedicationRecord): void;
  (e: 'add'): void;
  (e: 'filter-change', filter: MedicationRecordFilter): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectedCatId: '',
});

const emit = defineEmits<Emits>();

// State
const medicationRecords = ref<MedicationRecord[]>([]);
const pagination = ref({
  total: 0,
  limit: 20,
  offset: 0,
  hasMore: false,
});
const isLoading = ref(false);
const isLoadingMore = ref(false);
const error = ref<string | null>(null);

// Confirmation dialog state
const showDeleteConfirmation = ref(false);
const recordToDelete = ref<MedicationRecord | null>(null);

// Filter state
const filter = ref<MedicationRecordFilter>({
  catId: props.selectedCatId || props.initialFilter?.catId || '',
  medicationId: props.initialFilter?.medicationId || '',
  startDate: props.initialFilter?.startDate || undefined,
  endDate: props.initialFilter?.endDate || undefined,
  status: props.initialFilter?.status || undefined,
  limit: 20,
  offset: 0,
});

// Date range shortcuts
const dateRangeShortcuts = [
  { label: '今日', days: 0 },
  { label: '昨日', days: 1 },
  { label: '過去3日', days: 3 },
  { label: '過去1週間', days: 7 },
  { label: '過去1ヶ月', days: 30 },
];

// Status options
const statusOptions = [
  { value: '', label: 'すべて' },
  { value: 'ADMINISTERED', label: '投与済み' },
  { value: 'PENDING', label: '投与予定' },
  { value: 'SKIPPED', label: 'スキップ' },
  { value: 'MISSED', label: '投与忘れ' },
];

// Computed
const hasFilters = computed(
  () =>
    filter.value.catId
    || filter.value.medicationId
    || filter.value.startDate
    || filter.value.endDate
    || filter.value.status,
);

const catOptions = computed(() => [
  { value: '', label: 'すべての猫' },
  ...props.cats.map(cat => ({ value: cat.id, label: cat.name })),
]);

const medicationOptions = computed(() => [
  { value: '', label: 'すべての薬' },
  ...props.medications.map(medication => ({
    value: medication.id,
    label: `${medication.name} (${formatMedicationType(medication.type)})`,
  })),
]);

// Get selected cat for display
const selectedCat = computed(() => {
  if (!filter.value.catId) return null;
  return props.cats.find(cat => cat.id === filter.value.catId);
});

// Dynamic title based on selected cat
const listTitle = computed(() => {
  if (selectedCat.value) {
    return `${selectedCat.value.name}の投与記録`;
  }
  return '投与記録';
});

// Methods
const fetchMedicationRecords = async (reset = false) => {
  if (reset) {
    isLoading.value = true;
    filter.value.offset = 0;
  }
  else {
    isLoadingMore.value = true;
  }

  error.value = null;

  try {
    const queryParams = new URLSearchParams();

    if (filter.value.catId) queryParams.append('catId', filter.value.catId);
    if (filter.value.medicationId)
      queryParams.append('medicationId', filter.value.medicationId);
    if (filter.value.startDate)
      queryParams.append('startDate', filter.value.startDate.toISOString());
    if (filter.value.endDate)
      queryParams.append('endDate', filter.value.endDate.toISOString());
    if (filter.value.status) queryParams.append('status', filter.value.status);

    queryParams.append('limit', filter.value.limit?.toString() || '20');
    queryParams.append('offset', filter.value.offset?.toString() || '0');

    const response = await $fetch<{
      medicationRecords: MedicationRecord[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/api/medication-records?${queryParams.toString()}`);

    const processedRecords = response.medicationRecords.map(record => ({
      ...record,
      administeredAt: new Date(record.administeredAt),
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    }));

    if (reset) {
      medicationRecords.value = processedRecords;
    }
    else {
      medicationRecords.value.push(...processedRecords);
    }

    pagination.value = response.pagination;
  }
  catch {
    error.value = 'データの取得に失敗しました';
  }
  finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};

const loadMore = async () => {
  if (!pagination.value.hasMore || isLoadingMore.value) return;

  filter.value.offset = (filter.value.offset || 0) + (filter.value.limit || 20);
  await fetchMedicationRecords(false);
};

const applyFilter = async () => {
  filter.value.offset = 0;
  await fetchMedicationRecords(true);
  emit('filter-change', filter.value);
};

const clearFilters = async () => {
  filter.value = {
    catId: '',
    medicationId: '',
    startDate: undefined,
    endDate: undefined,
    status: undefined,
    limit: 20,
    offset: 0,
  };
  await fetchMedicationRecords(true);
  emit('filter-change', filter.value);
};

const handleDateRangeShortcut = async (days: number) => {
  const now = new Date();
  if (days === 0) {
    // Today
    filter.value.startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    filter.value.endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );
  }
  else if (days === 1) {
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    filter.value.startDate = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
    );
    filter.value.endDate = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23,
      59,
      59,
    );
  }
  else {
    // Past N days
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    filter.value.startDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    filter.value.endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );
  }
  await applyFilter();
};

const handleEdit = (record: MedicationRecord) => {
  emit('edit', record);
};

const handleDelete = (record: MedicationRecord) => {
  recordToDelete.value = record;
  showDeleteConfirmation.value = true;
};

const confirmDelete = () => {
  if (recordToDelete.value) {
    emit('delete', recordToDelete.value);
  }
  showDeleteConfirmation.value = false;
  recordToDelete.value = null;
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  recordToDelete.value = null;
};

const handleAdd = () => {
  emit('add');
};

// Format functions
const formatDateTime = (date: Date) => {
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }
  catch {
    // Fallback for test environment
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
      2,
      '0',
    )}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
};

const formatMedicationType = (type: string): string => {
  const typeMap: Record<string, string> = {
    MEDICINE: '薬',
    SUPPLEMENT: 'サプリメント',
    VITAMIN: 'ビタミン',
  };
  return typeMap[type] || type;
};

// Lifecycle
onMounted(() => {
  fetchMedicationRecords(true);
});

// Watch for prop changes
watch(
  () => props.initialFilter,
  (newFilter) => {
    if (newFilter) {
      filter.value = {
        ...filter.value,
        ...newFilter,
        offset: 0,
      };
      fetchMedicationRecords(true);
    }
  },
  { deep: true },
);

// Watch for selectedCatId changes
watch(
  () => props.selectedCatId,
  (newCatId) => {
    if (newCatId !== filter.value.catId) {
      filter.value.catId = newCatId || '';
      filter.value.offset = 0;
      fetchMedicationRecords(true);
    }
  },
); ;
</script>

<template>
  <div class="medication-record-list">
    <!-- Header -->
    <div class="list-header">
      <div class="header-content">
        <h2 class="list-title">
          {{ listTitle }}
        </h2>
        <div class="header-actions">
          <div class="record-count">
            {{ pagination.total }}件の記録
          </div>
          <button
            type="button"
            class="add-button"
            @click="handleAdd"
          >
            + 新しい記録を追加
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <!-- Cat and Medication Filters -->
      <div class="filter-row">
        <div class="filter-group">
          <label
            for="cat-filter"
            class="filter-label"
          >猫で絞り込み</label>
          <select
            id="cat-filter"
            v-model="filter.catId"
            class="filter-select"
            @change="applyFilter"
          >
            <option
              v-for="option in catOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label
            for="medication-filter"
            class="filter-label"
          >薬で絞り込み</label>
          <select
            id="medication-filter"
            v-model="filter.medicationId"
            class="filter-select"
            @change="applyFilter"
          >
            <option
              v-for="option in medicationOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label
            for="status-filter"
            class="filter-label"
          >ステータス</label>
          <select
            id="status-filter"
            v-model="filter.status"
            class="filter-select"
            @change="applyFilter"
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
      </div>

      <!-- Date Range Shortcuts -->
      <div class="filter-group">
        <label class="filter-label">期間で絞り込み</label>
        <div class="date-shortcuts">
          <button
            v-for="shortcut in dateRangeShortcuts"
            :key="shortcut.label"
            type="button"
            class="filter-button"
            @click="handleDateRangeShortcut(shortcut.days)"
          >
            {{ shortcut.label }}
          </button>
        </div>
      </div>

      <!-- Clear Filters -->
      <div
        v-if="hasFilters"
        class="filter-actions"
      >
        <button
          type="button"
          class="clear-filters-button"
          @click="clearFilters"
        >
          フィルターをクリア
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="loading-state"
    >
      <div class="loading-spinner" />
      <p>データを読み込み中...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="error-state"
    >
      <p class="error-message">
        {{ error }}
      </p>
      <button
        type="button"
        class="retry-button"
        @click="fetchMedicationRecords(true)"
      >
        再試行
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="medicationRecords.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">
        💊
      </div>
      <h3 class="empty-title">
        投与記録がありません
      </h3>
      <p class="empty-description">
        <span v-if="hasFilters">
          指定した条件に一致する投与記録が見つかりませんでした。
        </span>
        <span v-else> まだ投与記録が登録されていません。 </span>
      </p>
      <button
        type="button"
        class="add-button"
        @click="handleAdd"
      >
        最初の記録を追加
      </button>
    </div>

    <!-- Medication Records List -->
    <div
      v-else
      class="medication-records"
    >
      <div class="records-grid">
        <div
          v-for="record in medicationRecords"
          :key="record.id"
          class="medication-record-card"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="record-info">
              <div class="cat-name">
                {{ record.cat?.name }}
              </div>
              <div class="administered-time">
                {{ formatDateTime(record.administeredAt) }}
              </div>
            </div>
            <div class="card-actions">
              <button
                type="button"
                class="action-button edit-button"
                title="編集"
                @click="handleEdit(record)"
              >
                ✏️
              </button>
              <button
                type="button"
                class="action-button delete-button"
                title="削除"
                @click="handleDelete(record)"
              >
                🗑️
              </button>
            </div>
          </div>

          <!-- Card Body -->
          <div class="card-body">
            <div class="medication-info">
              <div class="medication-name">
                {{ record.medication?.name }}
                <span
                  v-if="record.medication?.type"
                  class="medication-type"
                >
                  ({{ formatMedicationType(record.medication.type) }})
                </span>
              </div>
              <div class="medication-dosage">
                <span
                  v-if="record.medication?.dosage"
                  class="dosage-info"
                >
                  {{ record.medication.dosage }}
                </span>
              </div>
            </div>

            <div class="quantity-status-info">
              <div class="quantity">
                <span class="quantity-value">{{ record.quantity }}</span>
                <span class="quantity-unit">個</span>
              </div>
              <div class="status">
                <MedicationStatusBadge
                  :status="record.status"
                  size="sm"
                />
              </div>
            </div>

            <div
              v-if="record.notes"
              class="notes"
            >
              <div class="notes-label">
                メモ:
              </div>
              <div class="notes-content">
                {{ record.notes }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div
        v-if="pagination.hasMore"
        class="load-more-section"
      >
        <button
          type="button"
          class="load-more-button"
          :disabled="isLoadingMore"
          @click="loadMore"
        >
          <span v-if="isLoadingMore">読み込み中...</span>
          <span v-else>さらに読み込む</span>
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`投与記録を削除`"
      :message="`${recordToDelete?.cat?.name}の${recordToDelete?.medication?.name}の投与記録を削除しますか？この操作は取り消せません。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.medication-record-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

/* Header */
.list-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.list-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.record-count {
  color: #666;
  font-size: 0.9rem;
}

.add-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.add-button:hover {
  background: #388e3c;
  transform: translateY(-1px);
}

/* Filters */
.filters-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 0.9rem;
}

.filter-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.date-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-button {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.filter-button:hover {
  border-color: #4caf50;
  background: #f8fff8;
}

.filter-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.clear-filters-button {
  padding: 0.5rem 1rem;
  border: 1px solid #e53e3e;
  border-radius: 4px;
  background: white;
  color: #e53e3e;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.clear-filters-button:hover {
  background: #e53e3e;
  color: white;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Error State */
.error-state {
  text-align: center;
  padding: 3rem;
}

.error-message {
  color: #e53e3e;
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: #45a049;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.empty-description {
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 2rem;
}

/* Medication Records */
.medication-records {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.records-grid {
  display: grid;
  gap: 1px;
  background: #e2e8f0;
}

.medication-record-card {
  background: white;
  padding: 1.5rem;
  transition: background-color 0.2s ease;
}

.medication-record-card:hover {
  background: #f8f9fa;
}

/* Card Header */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.record-info {
  flex: 1;
}

.cat-name {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.administered-time {
  color: #666;
  font-size: 0.9rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.edit-button:hover {
  border-color: #4caf50;
  background: #f8fff8;
}

.delete-button:hover {
  border-color: #e53e3e;
  background: #fef8f8;
}

/* Card Body */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.medication-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.medication-name {
  font-weight: 500;
  color: #333;
}

.medication-type {
  color: #666;
  font-weight: normal;
  font-size: 0.9rem;
}

.dosage-info {
  color: #666;
  font-size: 0.9rem;
}

.quantity-status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quantity {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.quantity-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.quantity-unit {
  font-size: 0.9rem;
  color: #666;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge--administered {
  background: #d4edda;
  color: #155724;
}

.status-badge--pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge--skipped {
  background: #f8d7da;
  color: #721c24;
}

.status-badge--missed {
  background: #f5c6cb;
  color: #721c24;
}

.notes {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

.notes-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.notes-content {
  font-size: 0.9rem;
  color: #333;
  line-height: 1.4;
}

/* Load More */
.load-more-section {
  padding: 1.5rem;
  text-align: center;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.load-more-button {
  padding: 0.75rem 2rem;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: white;
  color: #4caf50;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.load-more-button:hover:not(:disabled) {
  background: #4caf50;
  color: white;
}

.load-more-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .medication-record-list {
    padding: 0.5rem;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }

  .filters-section {
    padding: 1rem;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }

  .date-shortcuts {
    justify-content: center;
  }

  .filter-button {
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  .records-grid {
    display: block;
  }

  .medication-record-card {
    padding: 1rem;
  }

  .card-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .card-actions {
    align-self: flex-end;
  }

  .quantity-status-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .date-shortcuts {
    flex-direction: column;
  }

  .filter-button {
    flex: none;
  }
}
</style>
