<script setup lang="ts">
import ConfirmationDialog from './ConfirmationDialog.vue';
import type { Medication, MedicationType } from '~/types/medication';

interface Props {
  medications: Medication[];
  loading?: boolean;
  showActions?: boolean;
}

interface Emits {
  (e: 'select' | 'edit' | 'delete', medication: Medication): void;
  (e: 'add'): void;
}

const _props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
});

const emit = defineEmits<Emits>();

// State for confirmation dialog
const showDeleteConfirmation = ref(false);
const medicationToDelete = ref<Medication | null>(null);

// State for filtering and sorting
const searchQuery = ref('');
const selectedType = ref<MedicationType | ''>('');
const sortBy = ref<'name' | 'type' | 'createdAt'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

// Computed properties
const medicationTypeOptions = [
  { value: '', label: 'すべてのタイプ' },
  { value: 'MEDICINE', label: '薬' },
  { value: 'SUPPLEMENT', label: 'サプリメント' },
  { value: 'VITAMIN', label: 'ビタミン' },
];

const filteredAndSortedMedications = computed(() => {
  let filtered = _props.medications;

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      medication =>
        medication.name.toLowerCase().includes(query)
        || (medication.description
          && medication.description.toLowerCase().includes(query)),
    );
  }

  // Filter by type
  if (selectedType.value) {
    filtered = filtered.filter(
      medication => medication.type === selectedType.value,
    );
  }

  // Sort
  filtered.sort((a, b) => {
    let aValue: string | Date;
    let bValue: string | Date;

    switch (sortBy.value) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'createdAt':
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      default:
        aValue = a.name;
        bValue = b.name;
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
const handleSelectMedication = (medication: Medication) => {
  emit('select', medication);
};

const handleEditMedication = (medication: Medication) => {
  emit('edit', medication);
};

const handleDeleteMedication = (medication: Medication) => {
  medicationToDelete.value = medication;
  showDeleteConfirmation.value = true;
};

const confirmDelete = () => {
  if (medicationToDelete.value) {
    emit('delete', medicationToDelete.value);
  }
  showDeleteConfirmation.value = false;
  medicationToDelete.value = null;
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  medicationToDelete.value = null;
};

const handleAddMedication = () => {
  emit('add');
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedType.value = '';
  sortBy.value = 'name';
  sortOrder.value = 'asc';
};

// Format medication type display
const formatMedicationType = (type: MedicationType): string => {
  const typeMap = {
    MEDICINE: '薬',
    SUPPLEMENT: 'サプリメント',
    VITAMIN: 'ビタミン',
  };
  return typeMap[type] || type;
};

// Format date display
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};
</script>

<template>
  <div class="medication-list">
    <div class="medication-list__header">
      <h2 class="medication-list__title">
        薬の管理
      </h2>
      <button
        v-if="showActions"
        :disabled="loading"
        class="btn btn--primary"
        @click="handleAddMedication"
      >
        + 新しい薬を追加
      </button>
    </div>

    <!-- Filters and Search -->
    <div class="medication-list__filters">
      <div class="filter-group">
        <label
          for="search-input"
          class="filter-label"
        >検索</label>
        <input
          id="search-input"
          v-model="searchQuery"
          type="text"
          class="filter-input"
          placeholder="薬名や説明で検索..."
        >
      </div>

      <div class="filter-group">
        <label
          for="type-filter"
          class="filter-label"
        >タイプ</label>
        <select
          id="type-filter"
          v-model="selectedType"
          class="filter-select"
        >
          <option
            v-for="option in medicationTypeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label
          for="sort-by"
          class="filter-label"
        >並び順</label>
        <select
          id="sort-by"
          v-model="sortBy"
          class="filter-select"
        >
          <option value="name">
            名前
          </option>
          <option value="type">
            タイプ
          </option>
          <option value="createdAt">
            作成日
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label
          for="sort-order"
          class="filter-label"
        >順序</label>
        <select
          id="sort-order"
          v-model="sortOrder"
          class="filter-select"
        >
          <option value="asc">
            昇順
          </option>
          <option value="desc">
            降順
          </option>
        </select>
      </div>

      <button
        class="btn btn--secondary btn--small"
        @click="clearFilters"
      >
        フィルタをクリア
      </button>
    </div>

    <div
      v-if="loading"
      class="medication-list__loading"
    >
      <div class="loading-spinner" />
      <p>薬の情報を読み込み中...</p>
    </div>

    <div
      v-else-if="medications.length === 0"
      class="medication-list__empty"
    >
      <div class="empty-state">
        <div class="empty-state__icon">
          💊
        </div>
        <h3 class="empty-state__title">
          薬が登録されていません
        </h3>
        <p class="empty-state__message">
          最初の薬を追加して、薬の管理を始めましょう。
        </p>
        <button
          v-if="showActions"
          class="btn btn--primary"
          @click="handleAddMedication"
        >
          薬を追加する
        </button>
      </div>
    </div>

    <div
      v-else-if="filteredAndSortedMedications.length === 0"
      class="medication-list__empty"
    >
      <div class="empty-state">
        <div class="empty-state__icon">
          🔍
        </div>
        <h3 class="empty-state__title">
          検索結果が見つかりません
        </h3>
        <p class="empty-state__message">
          検索条件を変更してもう一度お試しください。
        </p>
        <button
          class="btn btn--secondary"
          @click="clearFilters"
        >
          フィルタをクリア
        </button>
      </div>
    </div>

    <div
      v-else
      class="medication-list__grid"
    >
      <div
        v-for="medication in filteredAndSortedMedications"
        :key="medication.id"
        class="medication-card"
        @click="handleSelectMedication(medication)"
      >
        <div class="medication-card__header">
          <h3 class="medication-card__name">
            {{ medication.name }}
          </h3>
          <span class="medication-card__type">
            {{ formatMedicationType(medication.type) }}
          </span>
        </div>

        <div class="medication-card__content">
          <div
            v-if="medication.dosage"
            class="medication-card__info-item"
          >
            <span class="medication-card__info-label">投与量:</span>
            <span class="medication-card__info-value">{{
              medication.dosage
            }}</span>
          </div>

          <div
            v-if="medication.description"
            class="medication-card__description"
          >
            {{ medication.description }}
          </div>

          <div class="medication-card__meta">
            <span class="medication-card__date">
              作成日: {{ formatDate(medication.createdAt) }}
            </span>
          </div>
        </div>

        <div
          v-if="showActions"
          class="medication-card__actions"
        >
          <button
            class="btn btn--small btn--secondary"
            @click.stop="handleEditMedication(medication)"
          >
            編集
          </button>
          <button
            class="btn btn--small btn--danger"
            @click.stop="handleDeleteMedication(medication)"
          >
            削除
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`${medicationToDelete?.name}を削除`"
      :message="`${medicationToDelete?.name}を削除しますか？この操作は取り消せません。関連する投与記録も削除される可能性があります。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.medication-list {
  width: 100%;
}

.medication-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.medication-list__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.medication-list__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.filter-input,
.filter-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.medication-list__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.medication-list__empty {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

.empty-state {
  text-align: center;
  max-width: 400px;
}

.empty-state__icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state__title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #333;
}

.empty-state__message {
  margin: 0 0 2rem 0;
  color: #666;
  line-height: 1.5;
}

.medication-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.medication-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.medication-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #4caf50;
}

.medication-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.25rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.medication-card__name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.medication-card__type {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 1rem;
}

.medication-card__content {
  padding: 1rem 1.25rem;
}

.medication-card__info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.medication-card__info-label {
  font-weight: 500;
  color: #666;
}

.medication-card__info-value {
  color: #333;
}

.medication-card__description {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.medication-card__meta {
  font-size: 0.8rem;
  color: #999;
  margin-bottom: 1rem;
}

.medication-card__date {
  display: block;
}

.medication-card__actions {
  display: flex;
  gap: 0.5rem;
  padding: 0 1.25rem 1.25rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.btn--danger {
  background-color: #f44336;
  color: white;
}

.btn--danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

.btn--small {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  flex: 1;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .medication-list__header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .medication-list__filters {
    flex-direction: column;
    gap: 1rem;
  }

  .filter-group {
    min-width: auto;
  }

  .medication-list__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .medication-card__header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .medication-card__type {
    margin-left: 0;
  }

  .medication-card__actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .medication-list__header {
    margin-bottom: 1rem;
  }

  .medication-list__title {
    font-size: 1.25rem;
  }

  .medication-list__filters {
    padding: 1rem;
  }

  .empty-state__icon {
    font-size: 3rem;
  }
}
</style>
