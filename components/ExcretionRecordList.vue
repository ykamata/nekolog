<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';
import type { ExcretionRecord, ExcretionRecordFilter, ExcretionType } from '~/types/excretion';
import { ExcretionTypeOptions } from '~/types/excretion';

interface Props {
  records: ExcretionRecord[];
  cats: Cat[];
  loading?: boolean;
  total?: number;
  hasMore?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
}

interface Emits {
  (e: 'filter', filter: ExcretionRecordFilter): void;
  (e: 'load-more'): void;
  (e: 'edit', record: ExcretionRecord): void;
  (e: 'delete', record: ExcretionRecord): void;
  (e: 'add'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  total: 0,
  hasMore: false,
  showFilters: true,
  showPagination: true,
});

const emit = defineEmits<Emits>();

// Filter state
const filters = ref<ExcretionRecordFilter>({
  catId: undefined,
  type: undefined,
  startDate: undefined,
  endDate: undefined,
});

// UI state
const showFiltersPanel = ref(false);
const isLoadingMore = ref(false);

// Computed properties
const filteredRecordsCount = computed(() => props.records.length);

const hasActiveFilters = computed(() => {
  return !!(
    filters.value.catId
    || filters.value.type
    || filters.value.startDate
    || filters.value.endDate
  );
});

const selectedCat = computed(() => {
  if (!filters.value.catId) return null;
  return props.cats.find(cat => cat.id === filters.value.catId);
});

const selectedType = computed(() => {
  if (!filters.value.type) return null;
  return ExcretionTypeOptions.find(option => option.value === filters.value.type);
});

// Methods
const applyFilters = () => {
  emit('filter', { ...filters.value });
  showFiltersPanel.value = false;
};

const clearFilters = () => {
  filters.value = {
    catId: undefined,
    type: undefined,
    startDate: undefined,
    endDate: undefined,
  };
  emit('filter', {});
};

const handleCatFilter = (catId: number | undefined) => {
  filters.value.catId = catId;
  applyFilters();
};

const handleTypeFilter = (type: ExcretionType | undefined) => {
  filters.value.type = type;
  applyFilters();
};

const handleDateRangeFilter = (startDate?: Date, endDate?: Date) => {
  filters.value.startDate = startDate;
  filters.value.endDate = endDate;
  applyFilters();
};

const handleLoadMore = async () => {
  if (isLoadingMore.value || !props.hasMore) return;

  isLoadingMore.value = true;
  try {
    emit('load-more');
  }
  finally {
    isLoadingMore.value = false;
  }
};

const handleEdit = (record: ExcretionRecord) => {
  emit('edit', record);
};

const handleDelete = (record: ExcretionRecord) => {
  emit('delete', record);
};

const handleAdd = () => {
  emit('add');
};

const toggleFiltersPanel = () => {
  showFiltersPanel.value = !showFiltersPanel.value;
};

// Format date for input
const formatDateForInput = (date?: Date): string => {
  if (!date) return '';
  const dateString = date.toISOString().split('T')[0];
  return dateString || '';
};

// Parse date from input
const parseDateFromInput = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  return new Date(dateStr);
};

// Quick filter presets
const quickFilters = computed(() => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  return [
    {
      label: '今日',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      endDate: today,
    },
    {
      label: '昨日',
      startDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
      endDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59),
    },
    {
      label: '過去7日',
      startDate: weekAgo,
      endDate: today,
    },
    {
      label: '過去30日',
      startDate: monthAgo,
      endDate: today,
    },
  ];
});

const applyQuickFilter = (quickFilter: { startDate: Date; endDate: Date }) => {
  filters.value.startDate = quickFilter.startDate;
  filters.value.endDate = quickFilter.endDate;
  applyFilters();
};
</script>

<template>
  <div
    data-testid="record-list"
    class="excretion-record-list"
    role="region"
    aria-labelledby="list-title"
  >
    <!-- Header -->
    <div class="list-header">
      <div class="header-info">
        <h2
          id="list-title"
          class="list-title"
        >
          排泄記録一覧
        </h2>
        <div
          class="record-count"
          aria-live="polite"
        >
          <span v-if="total > 0">
            {{ filteredRecordsCount }} / {{ total }} 件
          </span>
          <span v-else-if="!loading">
            記録なし
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button
          v-if="showFilters"
          data-testid="filter-toggle-button"
          class="filter-toggle-button"
          :class="{ 'filter-toggle-button--active': showFiltersPanel || hasActiveFilters }"
          :aria-expanded="showFiltersPanel"
          :aria-pressed="hasActiveFilters"
          aria-controls="filters-panel"
          @click="toggleFiltersPanel"
        >
          <span class="filter-icon">🔍</span>
          フィルター
          <span
            v-if="hasActiveFilters"
            class="active-filter-indicator"
          >
            ●
          </span>
        </button>
        <button
          data-testid="add-record-button"
          class="add-button"
          aria-label="新しい排泄記録を追加"
          @click="handleAdd"
        >
          <span class="add-icon">+</span>
          新規記録
        </button>
      </div>
    </div>

    <!-- Filters Panel -->
    <div
      v-if="showFilters && showFiltersPanel"
      id="filters-panel"
      data-testid="filter-section"
      class="filters-panel"
      role="region"
      aria-labelledby="filters-title"
    >
      <div class="filters-content">
        <!-- Cat Filter -->
        <div class="filter-group">
          <label class="filter-label">猫</label>
          <select
            v-model="filters.catId"
            class="filter-select"
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

        <!-- Type Filter -->
        <div class="filter-group">
          <label class="filter-label">排泄タイプ</label>
          <select
            v-model="filters.type"
            class="filter-select"
          >
            <option :value="undefined">
              すべてのタイプ
            </option>
            <option
              v-for="option in ExcretionTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Date Range Filter -->
        <div class="filter-group">
          <label class="filter-label">期間</label>
          <div class="date-range-inputs">
            <input
              :value="formatDateForInput(filters.startDate)"
              type="date"
              class="date-input"
              placeholder="開始日"
              @change="filters.startDate = parseDateFromInput(($event.target as HTMLInputElement).value)"
            >
            <span class="date-separator">〜</span>
            <input
              :value="formatDateForInput(filters.endDate)"
              type="date"
              class="date-input"
              placeholder="終了日"
              @change="filters.endDate = parseDateFromInput(($event.target as HTMLInputElement).value)"
            >
          </div>
        </div>

        <!-- Quick Filters -->
        <div class="filter-group">
          <label class="filter-label">クイックフィルター</label>
          <div class="quick-filters">
            <button
              v-for="quickFilter in quickFilters"
              :key="quickFilter.label"
              type="button"
              class="quick-filter-button"
              @click="applyQuickFilter(quickFilter)"
            >
              {{ quickFilter.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="filters-actions">
        <button
          class="filter-action-button clear-button"
          @click="clearFilters"
        >
          クリア
        </button>
        <button
          class="filter-action-button apply-button"
          @click="applyFilters"
        >
          適用
        </button>
      </div>
    </div>

    <!-- Active Filters Display -->
    <div
      v-if="hasActiveFilters"
      class="active-filters"
    >
      <div class="active-filters-label">
        適用中のフィルター:
      </div>
      <div class="active-filter-tags">
        <span
          v-if="selectedCat"
          class="filter-tag"
        >
          猫: {{ selectedCat.name }}
          <button
            class="filter-tag-remove"
            @click="handleCatFilter(undefined)"
          >
            ×
          </button>
        </span>
        <span
          v-if="selectedType"
          class="filter-tag"
        >
          タイプ: {{ selectedType.label }}
          <button
            class="filter-tag-remove"
            @click="handleTypeFilter(undefined)"
          >
            ×
          </button>
        </span>
        <span
          v-if="filters.startDate || filters.endDate"
          class="filter-tag"
        >
          期間: {{ filters.startDate ? formatDateForInput(filters.startDate) : '開始日なし' }} 〜 {{ filters.endDate ? formatDateForInput(filters.endDate) : '終了日なし' }}
          <button
            class="filter-tag-remove"
            @click="handleDateRangeFilter(undefined, undefined)"
          >
            ×
          </button>
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading && records.length === 0"
      class="loading-state"
    >
      <div class="loading-spinner" />
      <p>排泄記録を読み込み中...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="records.length === 0"
      data-testid="empty-state"
      class="empty-state"
      role="status"
      aria-live="polite"
    >
      <div class="empty-icon">
        📝
      </div>
      <h3 class="empty-title">
        {{ hasActiveFilters ? 'フィルター条件に一致する記録がありません' : '排泄記録がありません' }}
      </h3>
      <p class="empty-message">
        {{ hasActiveFilters ? 'フィルター条件を変更してみてください。' : '最初の排泄記録を追加しましょう。' }}
      </p>
      <button
        v-if="!hasActiveFilters"
        class="empty-action-button"
        @click="handleAdd"
      >
        記録を追加する
      </button>
      <button
        v-else
        class="empty-action-button"
        @click="clearFilters"
      >
        フィルターをクリア
      </button>
    </div>

    <!-- Records List -->
    <div
      v-else
      class="records-container"
    >
      <!-- 大量データの場合は仮想スクロールを使用 -->
      <div
        v-if="records.length > 100"
        class="virtual-scroll-wrapper"
      >
        <VirtualScroll
          :items="records"
          :item-height="120"
          :container-height="600"
          :has-more="hasMore"
          :is-loading-more="isLoadingMore"
          @load-more="handleLoadMore"
        >
          <template #default="{ item }">
            <div class="virtual-record-item">
              <ExcretionRecordCard
                :record="item as ExcretionRecord"
                :loading="loading"
                @edit="handleEdit"
                @delete="handleDelete"
              />
            </div>
          </template>
        </VirtualScroll>
      </div>

      <!-- 通常のグリッド表示（100件以下） -->
      <div
        v-else
        class="records-grid"
      >
        <ExcretionRecordCard
          v-for="record in records"
          :key="record.id"
          :record="record"
          :loading="loading"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>

      <!-- Load More Button (仮想スクロール未使用時) -->
      <div
        v-if="showPagination && hasMore && records.length <= 100"
        class="load-more-container"
      >
        <button
          class="load-more-button"
          :disabled="isLoadingMore"
          @click="handleLoadMore"
        >
          <span v-if="isLoadingMore">読み込み中...</span>
          <span v-else>さらに読み込む</span>
        </button>
      </div>

      <!-- Loading More Indicator -->
      <div
        v-if="loading && records.length > 0"
        class="loading-more"
      >
        <div class="loading-spinner small" />
        <span>追加データを読み込み中...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.excretion-record-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.record-count {
  font-size: 0.9rem;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.filter-toggle-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #666;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.filter-toggle-button:hover {
  background: #f8f8f8;
  border-color: #cbd5e0;
}

.filter-toggle-button--active {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.filter-icon {
  font-size: 0.9rem;
}

.active-filter-indicator {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  color: #f44336;
  font-size: 0.8rem;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-button:hover {
  background: #45a049;
  border-color: #45a049;
}

.add-icon {
  font-size: 1rem;
  font-weight: bold;
}

/* Filters Panel */
.filters-panel {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.filters-content {
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
  font-size: 0.8rem;
  font-weight: 500;
  color: #666;
}

.filter-select,
.date-input {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
}

.filter-select:focus,
.date-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.date-range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-separator {
  color: #666;
  font-size: 0.9rem;
}

.quick-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.quick-filter-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-filter-button:hover {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.filters-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.filter-action-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #666;
}

.clear-button:hover {
  background: #f8f8f8;
  border-color: #cbd5e0;
}

.apply-button {
  border: 1px solid #4caf50;
  background: #4caf50;
  color: white;
}

.apply-button:hover {
  background: #45a049;
  border-color: #45a049;
}

/* Active Filters */
.active-filters {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #e8f5e9;
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

.active-filters-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.active-filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: white;
  border: 1px solid #4caf50;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #333;
}

.filter-tag-remove {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  margin-left: 0.25rem;
}

.filter-tag-remove:hover {
  color: #f44336;
}

/* Loading State */
.loading-state {
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

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #333;
}

.empty-message {
  margin: 0 0 2rem 0;
  color: #666;
  line-height: 1.5;
}

.empty-action-button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.empty-action-button:hover {
  background: #45a049;
  border-color: #45a049;
}

/* Records Container */
.records-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

/* Virtual Scroll */
.virtual-scroll-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.virtual-record-item {
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.virtual-record-item:last-child {
  border-bottom: none;
}

.load-more-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.load-more-button {
  padding: 0.75rem 2rem;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: white;
  color: #4caf50;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-button:hover:not(:disabled) {
  background: #4caf50;
  color: white;
}

.load-more-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #666;
  font-size: 0.9rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .header-actions {
    justify-content: space-between;
  }

  .filters-content {
    grid-template-columns: 1fr;
  }

  .date-range-inputs {
    flex-direction: column;
    align-items: stretch;
  }

  .date-separator {
    text-align: center;
  }

  .active-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .records-grid {
    grid-template-columns: 1fr;
  }

  .filters-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .filter-toggle-button,
  .add-button {
    flex: 1;
    justify-content: center;
  }

  .empty-icon {
    font-size: 3rem;
  }

  .empty-title {
    font-size: 1.1rem;
  }
}
</style>
