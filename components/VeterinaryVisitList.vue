<script setup lang="ts">
import ConfirmationDialog from './ConfirmationDialog.vue';
import type {
  VeterinaryVisitWithRelations,
  VeterinaryHospital,
  VeterinaryDoctor,
} from '~/types/veterinary-visit';
import type { Cat } from '~/types/cat-meal';

interface Props {
  visits: VeterinaryVisitWithRelations[];
  loading?: boolean;
  showActions?: boolean;
  cats?: Cat[];
}

interface Emits {
  (e: 'select' | 'edit' | 'delete', visit: VeterinaryVisitWithRelations): void;
  (e: 'add'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
  cats: () => [],
});

const emit = defineEmits<Emits>();

// State for confirmation dialog
const showDeleteConfirmation = ref(false);
const visitToDelete = ref<VeterinaryVisitWithRelations | null>(null);

// State for filtering and sorting
const searchQuery = ref('');
const selectedCatId = ref<string>('');
const selectedHospitalId = ref<string>('');
const hasBloodTestFilter = ref<boolean | ''>('');
const sortBy = ref<'visitDate' | 'hospitalName' | 'cost' | 'createdAt'>('visitDate');
const sortOrder = ref<'asc' | 'desc'>('desc');

// Computed properties
const catOptions = computed(() => [
  { value: '', label: 'すべての猫' },
  ...props.cats.map(cat => ({ value: cat.id, label: cat.name })),
]);

const hospitalOptions = computed(() => {
  const hospitals = new Map<string, VeterinaryHospital>();
  props.visits.forEach((visit) => {
    hospitals.set(visit.hospital.id, visit.hospital);
  });

  return [
    { value: '', label: 'すべての病院' },
    ...Array.from(hospitals.values()).map(hospital => ({
      value: hospital.id,
      label: hospital.name,
    })),
  ];
});

const bloodTestOptions = [
  { value: '', label: 'すべて' },
  { value: true, label: '血液検査あり' },
  { value: false, label: '血液検査なし' },
];

const filteredAndSortedVisits = computed(() => {
  let filtered = props.visits;

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(visit =>
      visit.hospital.name.toLowerCase().includes(query)
      || (visit.doctor?.name && visit.doctor.name.toLowerCase().includes(query))
      || (visit.notes && visit.notes.toLowerCase().includes(query))
      || visit.treatments.some(t => t.treatment.name.toLowerCase().includes(query)),
    );
  }

  // Filter by cat
  if (selectedCatId.value) {
    filtered = filtered.filter(visit => visit.catId === selectedCatId.value);
  }

  // Filter by hospital
  if (selectedHospitalId.value) {
    filtered = filtered.filter(visit => visit.hospitalId === selectedHospitalId.value);
  }

  // Filter by blood test
  if (hasBloodTestFilter.value !== '') {
    filtered = filtered.filter(visit => visit.hasBloodTest === hasBloodTestFilter.value);
  }

  // Sort
  filtered.sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    switch (sortBy.value) {
      case 'visitDate':
        aValue = new Date(a.visitDate);
        bValue = new Date(b.visitDate);
        break;
      case 'hospitalName':
        aValue = a.hospital.name;
        bValue = b.hospital.name;
        break;
      case 'cost':
        aValue = a.cost;
        bValue = b.cost;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      default:
        aValue = new Date(a.visitDate);
        bValue = new Date(b.visitDate);
    }

    if (aValue < bValue) {
      return sortOrder.value === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder.value === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return filtered;
});

// Methods
const handleSelectVisit = (visit: VeterinaryVisitWithRelations) => {
  emit('select', visit);
};

const handleEditVisit = (visit: VeterinaryVisitWithRelations) => {
  emit('edit', visit);
};

const handleDeleteVisit = (visit: VeterinaryVisitWithRelations) => {
  visitToDelete.value = visit;
  showDeleteConfirmation.value = true;
};

const confirmDelete = () => {
  if (visitToDelete.value) {
    emit('delete', visitToDelete.value);
  }
  showDeleteConfirmation.value = false;
  visitToDelete.value = null;
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  visitToDelete.value = null;
};

const handleAddVisit = () => {
  emit('add');
};

const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
};

const getCatName = (catId: string): string => {
  const cat = props.cats.find(c => c.id === catId);
  return cat?.name || '不明';
};

const toggleSort = (field: typeof sortBy.value) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  }
  else {
    sortBy.value = field;
    sortOrder.value = field === 'visitDate' ? 'desc' : 'asc';
  }
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedCatId.value = '';
  selectedHospitalId.value = '';
  hasBloodTestFilter.value = '';
};
</script>

<template>
  <div class="veterinary-visit-list">
    <!-- Header -->
    <div class="list-header">
      <h2 class="list-title">
        通院記録一覧
      </h2>
      <button
        v-if="showActions"
        class="btn btn--primary"
        @click="handleAddVisit"
      >
        <svg
          class="btn-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        新規記録
      </button>
    </div>

    <!-- Filters -->
    <div class="list-filters">
      <div class="filter-row">
        <div class="filter-group">
          <input
            v-model="searchQuery"
            type="text"
            class="filter-input"
            placeholder="病院名、先生名、メモ、処方内容で検索..."
          >
        </div>

        <div class="filter-group">
          <select
            v-model="selectedCatId"
            class="filter-select"
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
          <select
            v-model="selectedHospitalId"
            class="filter-select"
          >
            <option
              v-for="option in hospitalOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <select
            v-model="hasBloodTestFilter"
            class="filter-select"
          >
            <option
              v-for="option in bloodTestOptions"
              :key="String(option.value)"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <button
          class="btn btn--secondary btn--small"
          @click="clearFilters"
        >
          クリア
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-container"
    >
      <div class="loading-spinner" />
      <p class="loading-text">
        読み込み中...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredAndSortedVisits.length === 0"
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 class="empty-title">
        通院記録がありません
      </h3>
      <p class="empty-description">
        {{ searchQuery || selectedCatId || selectedHospitalId || hasBloodTestFilter !== ''
          ? '検索条件に一致する記録が見つかりませんでした'
          : 'まだ通院記録が登録されていません' }}
      </p>
      <button
        v-if="showActions && !searchQuery && !selectedCatId && !selectedHospitalId && hasBloodTestFilter === ''"
        class="btn btn--primary"
        @click="handleAddVisit"
      >
        最初の記録を追加
      </button>
    </div>

    <!-- Visit List -->
    <div
      v-else
      class="visit-list"
    >
      <!-- Table Header -->
      <div class="table-header">
        <button
          class="header-cell header-cell--sortable"
          :class="{ 'header-cell--active': sortBy === 'visitDate' }"
          @click="toggleSort('visitDate')"
        >
          診察日時
          <svg
            v-if="sortBy === 'visitDate'"
            class="sort-icon"
            :class="{ 'sort-icon--desc': sortOrder === 'desc' }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        <div class="header-cell">
          猫
        </div>

        <button
          class="header-cell header-cell--sortable"
          :class="{ 'header-cell--active': sortBy === 'hospitalName' }"
          @click="toggleSort('hospitalName')"
        >
          病院・先生
          <svg
            v-if="sortBy === 'hospitalName'"
            class="sort-icon"
            :class="{ 'sort-icon--desc': sortOrder === 'desc' }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        <div class="header-cell">
          処方内容
        </div>

        <button
          class="header-cell header-cell--sortable"
          :class="{ 'header-cell--active': sortBy === 'cost' }"
          @click="toggleSort('cost')"
        >
          費用
          <svg
            v-if="sortBy === 'cost'"
            class="sort-icon"
            :class="{ 'sort-icon--desc': sortOrder === 'desc' }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        <div class="header-cell">
          詳細
        </div>

        <div
          v-if="showActions"
          class="header-cell header-cell--actions"
        >
          操作
        </div>
      </div>

      <!-- Table Body -->
      <div class="table-body">
        <div
          v-for="visit in filteredAndSortedVisits"
          :key="visit.id"
          class="table-row"
          @click="handleSelectVisit(visit)"
        >
          <div class="table-cell">
            <div class="visit-date">
              {{ formatDateTime(visit.visitDate) }}
            </div>
          </div>

          <div class="table-cell">
            <div class="cat-info">
              {{ getCatName(visit.catId) }}
            </div>
          </div>

          <div class="table-cell">
            <div class="hospital-info">
              <div class="hospital-name">
                {{ visit.hospital.name }}
              </div>
              <div
                v-if="visit.doctor"
                class="doctor-name"
              >
                {{ visit.doctor.name }}
              </div>
            </div>
          </div>

          <div class="table-cell">
            <div class="treatments">
              <span
                v-for="treatment in visit.treatments.slice(0, 2)"
                :key="treatment.id"
                class="treatment-tag"
              >
                {{ treatment.treatment.name }}
              </span>
              <span
                v-if="visit.treatments.length > 2"
                class="treatment-more"
              >
                +{{ visit.treatments.length - 2 }}
              </span>
            </div>
          </div>

          <div class="table-cell">
            <div class="cost">
              {{ formatCurrency(visit.cost) }}
            </div>
          </div>

          <div class="table-cell">
            <div class="visit-details">
              <span
                v-if="visit.hasBloodTest"
                class="blood-test-badge"
                data-testid="blood-test-badge"
              >
                血液検査
              </span>
              <span
                v-if="visit.notes"
                class="notes-indicator"
                :title="visit.notes"
              >
                📝
              </span>
            </div>
          </div>

          <div
            v-if="showActions"
            class="table-cell table-cell--actions"
            @click.stop
          >
            <button
              class="action-btn action-btn--edit"
              @click="handleEditVisit(visit)"
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
            </button>
            <button
              class="action-btn action-btn--delete"
              @click="handleDeleteVisit(visit)"
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
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      title="通院記録を削除"
      :message="`「${visitToDelete?.hospital.name}」での記録を削除しますか？この操作は取り消せません。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.veterinary-visit-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .list-header {
    padding: 2rem;
  }

  .list-title {
    font-size: 1.5rem;
  }

  .btn {
    padding: 1rem 2rem;
    font-size: 1rem;
  }

  .btn-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .list-filters {
    padding: 1.5rem 2rem;
  }

  .filter-row {
    gap: 1.5rem;
  }

  .filter-input,
  .filter-select {
    padding: 0.875rem 1rem;
    font-size: 1rem;
  }

  .btn--small {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .table-header {
    padding: 1.5rem 2rem;
    font-size: 1rem;
  }

  .table-row {
    padding: 1.5rem 2rem;
  }

  .table-cell {
    min-height: 3rem;
  }

  .visit-date {
    font-size: 1rem;
  }

  .cat-info {
    font-size: 1rem;
  }

  .hospital-name {
    font-size: 1rem;
  }

  .doctor-name {
    font-size: 0.9rem;
  }

  .treatment-tag {
    padding: 0.375rem 0.75rem;
    font-size: 0.85rem;
  }

  .cost {
    font-size: 1rem;
  }

  .blood-test-badge {
    padding: 0.375rem 0.75rem;
    font-size: 0.85rem;
  }

  .action-btn {
    width: 2.5rem;
    height: 2.5rem;
  }

  .action-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .loading-container,
  .empty-state {
    padding: 4rem 2rem;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
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
}

/* Large desktop optimizations */
@media (min-width: 1440px) {
  .list-header {
    padding: 2.5rem;
  }

  .list-title {
    font-size: 1.75rem;
  }

  .list-filters {
    padding: 2rem 2.5rem;
  }

  .filter-row {
    gap: 2rem;
  }

  .table-header {
    padding: 2rem 2.5rem;
    grid-template-columns: 1.5fr 1fr 1.5fr 1.5fr 1fr 1fr 120px;
    gap: 1.5rem;
  }

  .table-row {
    padding: 2rem 2.5rem;
    grid-template-columns: 1.5fr 1fr 1.5fr 1.5fr 1fr 1fr 120px;
    gap: 1.5rem;
  }

  .table-body {
    max-height: 700px;
  }

  .action-btn {
    width: 3rem;
    height: 3rem;
  }

  .action-btn svg {
    width: 1.5rem;
    height: 1.5rem;
  }
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.list-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.list-filters {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.filter-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-input,
.filter-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
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
  border: 3px solid #e0e0e0;
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
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  color: #ccc;
  margin-bottom: 1rem;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #666;
}

.empty-description {
  margin: 0 0 1.5rem 0;
  color: #888;
  max-width: 400px;
}

.visit-list {
  overflow-x: auto;
}

.table-header {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1.5fr 1.5fr 1fr 1fr 100px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
  color: #555;
  font-size: 0.875rem;
}

.header-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  font-weight: 600;
  color: #555;
  font-size: 0.875rem;
  text-align: left;
  cursor: default;
}

.header-cell--sortable {
  cursor: pointer;
  transition: color 0.2s;
}

.header-cell--sortable:hover {
  color: #4caf50;
}

.header-cell--active {
  color: #4caf50;
}

.header-cell--actions {
  justify-content: center;
}

.sort-icon {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s;
}

.sort-icon--desc {
  transform: rotate(180deg);
}

.table-body {
  max-height: 600px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1.5fr 1.5fr 1fr 1fr 100px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-row:hover {
  background-color: #f8f9fa;
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
}

.table-cell--actions {
  justify-content: center;
  gap: 0.5rem;
}

.visit-date {
  font-weight: 500;
  color: #333;
}

.cat-info {
  font-weight: 500;
  color: #4caf50;
}

.hospital-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hospital-name {
  font-weight: 500;
  color: #333;
}

.doctor-name {
  font-size: 0.875rem;
  color: #666;
}

.treatments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.treatment-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.treatment-more {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.cost {
  font-weight: 600;
  color: #333;
}

.visit-details {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.blood-test-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.notes-indicator {
  font-size: 1rem;
  cursor: help;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn svg {
  width: 1rem;
  height: 1rem;
}

.action-btn--edit {
  background-color: #e3f2fd;
  color: #1976d2;
}

.action-btn--edit:hover {
  background-color: #bbdefb;
}

.action-btn--delete {
  background-color: #ffebee;
  color: #c62828;
}

.action-btn--delete:hover {
  background-color: #ffcdd2;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn--primary {
  background-color: #4caf50;
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: #388e3c;
}

.btn--secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn--secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.btn--small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

/* Tablet responsive */
@media (max-width: 1024px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr 0.8fr 1.2fr 1.2fr 0.8fr 0.8fr 80px;
    gap: 0.5rem;
  }

  .list-header,
  .list-filters,
  .table-row {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .filter-input,
  .filter-select {
    font-size: 0.9rem;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .veterinary-visit-list {
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
  }

  .list-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .list-title {
    font-size: 1.1rem;
    text-align: center;
  }

  .btn {
    width: 100%;
    justify-content: center;
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
    min-height: 48px;
    border-radius: 8px;
  }

  .btn-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* Mobile filters */
  .list-filters {
    padding: 1rem;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filter-group {
    min-width: auto;
    width: 100%;
  }

  .filter-input,
  .filter-select {
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .filter-input:focus,
  .filter-select:focus {
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  }

  .btn--small {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
    min-height: 44px;
  }

  /* Mobile table - card layout */
  .table-header {
    display: none;
  }

  .table-body {
    max-height: none;
    padding: 0 1rem 1rem 1rem;
  }

  .table-row {
    display: block;
    padding: 1.25rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #e0e0e0;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .table-row:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .table-row:active {
    transform: scale(0.98);
  }

  .table-row:last-child {
    margin-bottom: 0;
  }

  .table-cell {
    display: block;
    min-height: auto;
    margin-bottom: 0.75rem;
    padding: 0;
  }

  .table-cell:last-child {
    margin-bottom: 0;
  }

  .table-cell--actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 2px solid #e0e0e0;
    gap: 0.75rem;
  }

  /* Mobile card content styling */
  .visit-date {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .visit-date::before {
    content: '📅 ';
    margin-right: 0.5rem;
  }

  .cat-info {
    font-size: 1rem;
    font-weight: 600;
    color: #4caf50;
    display: flex;
    align-items: center;
  }

  .cat-info::before {
    content: '🐱 ';
    margin-right: 0.5rem;
  }

  .hospital-info {
    gap: 0.5rem;
  }

  .hospital-name {
    font-size: 1rem;
    font-weight: 500;
    color: #333;
    display: flex;
    align-items: center;
  }

  .hospital-name::before {
    content: '🏥 ';
    margin-right: 0.5rem;
  }

  .doctor-name {
    font-size: 0.9rem;
    color: #666;
    margin-left: 1.5rem;
    display: flex;
    align-items: center;
  }

  .doctor-name::before {
    content: '👨‍⚕️ ';
    margin-right: 0.5rem;
  }

  .treatments {
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }

  .treatment-tag {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    border-radius: 16px;
  }

  .cost {
    font-size: 1.1rem;
    font-weight: 700;
    color: #333;
    display: flex;
    align-items: center;
  }

  .cost::before {
    content: '💰 ';
    margin-right: 0.5rem;
  }

  .visit-details {
    gap: 0.75rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .blood-test-badge {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    border-radius: 16px;
  }

  .notes-indicator {
    font-size: 1.25rem;
  }

  /* Mobile action buttons */
  .action-btn {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 8px;
  }

  .action-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .action-btn:active {
    transform: scale(0.9);
  }

  /* Mobile loading and empty states */
  .loading-container,
  .empty-state {
    padding: 3rem 1rem;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
  }

  .empty-icon {
    width: 3rem;
    height: 3rem;
  }

  .empty-title {
    font-size: 1.1rem;
  }

  .empty-description {
    font-size: 1rem;
    max-width: none;
  }
}

/* Small mobile responsive */
@media (max-width: 480px) {
  .list-header {
    padding: 0.75rem;
  }

  .list-title {
    font-size: 1rem;
  }

  .btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
  }

  .list-filters {
    padding: 0.75rem;
  }

  .filter-input,
  .filter-select {
    padding: 0.75rem 0.875rem;
    font-size: 0.9rem;
  }

  .table-body {
    padding: 0 0.75rem 0.75rem 0.75rem;
  }

  .table-row {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .table-cell {
    margin-bottom: 0.625rem;
  }

  .visit-date {
    font-size: 1rem;
  }

  .cat-info,
  .hospital-name,
  .cost {
    font-size: 0.9rem;
  }

  .doctor-name {
    font-size: 0.8rem;
  }

  .treatment-tag {
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
  }

  .blood-test-badge {
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
  }

  .action-btn {
    width: 2.25rem;
    height: 2.25rem;
  }

  .action-btn svg {
    width: 1rem;
    height: 1rem;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .btn,
  .filter-input,
  .filter-select,
  .action-btn {
    min-height: 44px;
  }

  .table-row {
    cursor: pointer;
  }

  .table-row:hover {
    transform: none;
  }

  .table-row:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  .action-btn:hover {
    transform: none;
  }

  .action-btn:active {
    transform: scale(0.9);
    transition: transform 0.1s ease;
  }

  .btn:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .veterinary-visit-list,
  .table-row {
    border: 2px solid #000;
  }

  .filter-input,
  .filter-select {
    border: 2px solid #000;
  }

  .btn--primary {
    background: #000;
    border-color: #000;
  }

  .btn--secondary {
    background: #fff;
    border-color: #000;
    color: #000;
  }

  .action-btn--edit {
    background: #fff;
    border: 2px solid #000;
    color: #000;
  }

  .action-btn--delete {
    background: #fff;
    border: 2px solid #000;
    color: #000;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .table-row:hover,
  .table-row:active,
  .action-btn:active,
  .btn:active {
    transform: none;
  }

  .loading-spinner {
    animation: none;
  }

  * {
    transition: none !important;
  }
}
</style>
