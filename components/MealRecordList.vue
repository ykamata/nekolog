<script setup lang="ts">
import type { Cat, Food, MealRecord, MealRecordFilter } from '~/types/cat-meal';
import { toLocalDateString } from '~/utils/cat-meal';

interface Props {
  cats: Cat[];
  foods: Food[];
  initialFilter?: Partial<MealRecordFilter>;
  loading?: boolean;
}

interface Emits {
  (e: 'edit' | 'delete', record: MealRecord): void;
  (e: 'filter-change', filter: MealRecordFilter): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

// State
const mealRecords = ref<MealRecord[]>([]);
const pagination = ref({
  total: 0,
  limit: 20,
  offset: 0,
  hasMore: false,
});
const isLoading = ref(false);
const isLoadingMore = ref(false);
const error = ref<string | null>(null);

// Filter state
const filter = ref<MealRecordFilter>({
  catId: props.initialFilter?.catId || undefined,
  startDate: props.initialFilter?.startDate || undefined,
  endDate: props.initialFilter?.endDate || undefined,
  foodType: props.initialFilter?.foodType || undefined,
  limit: 20,
  offset: 0,
});

// Selected date range shortcut (for styling active state)
const selectedDateRange = ref<number>(-1); // -1 = all, 0 = today, 1 = yesterday, etc.

// Date range shortcuts
const dateRangeShortcuts = [
  { label: 'すべて', days: -1 },
  { label: '今日', days: 0 },
  { label: '昨日', days: 1 },
  { label: '過去3日', days: 3 },
  { label: '過去1週間', days: 7 },
  { label: '過去1ヶ月', days: 30 },
];

// Computed
const hasFilters = computed(
  () =>
    filter.value.catId
    || filter.value.startDate
    || filter.value.endDate
    || filter.value.foodType,
);

// Methods
const fetchMealRecords = async (reset = false) => {
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

    if (filter.value.catId) queryParams.append('catId', String(filter.value.catId));
    if (filter.value.startDate)
      queryParams.append('startDate', toLocalDateString(filter.value.startDate));
    if (filter.value.endDate)
      queryParams.append('endDate', toLocalDateString(filter.value.endDate));
    if (filter.value.foodType)
      queryParams.append('foodType', filter.value.foodType);

    queryParams.append('limit', filter.value.limit?.toString() || '20');
    queryParams.append('offset', filter.value.offset?.toString() || '0');

    const response = await $fetch<{
      mealRecords: MealRecord[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/api/meals?${queryParams.toString()}`);

    if (reset) {
      mealRecords.value = response.mealRecords;
    }
    else {
      mealRecords.value.push(...response.mealRecords);
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
  await fetchMealRecords(false);
};

const applyFilter = async () => {
  filter.value.offset = 0;
  await fetchMealRecords(true);
  emit('filter-change', filter.value);
};

const clearFilters = async () => {
  filter.value = {
    catId: undefined,
    startDate: undefined,
    endDate: undefined,
    foodType: undefined,
    limit: 20,
    offset: 0,
  };
  selectedDateRange.value = -1; // Reset to "all"
  await fetchMealRecords(true);
  emit('filter-change', filter.value);
};

const handleCatFilter = async (catId: number | undefined) => {
  filter.value.catId = catId;
  await applyFilter();
};

const handleDateRangeShortcut = async (days: number) => {
  selectedDateRange.value = days;

  if (days === -1) {
    // All - clear date filters
    filter.value.startDate = undefined;
    filter.value.endDate = undefined;
  }
  else {
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
  }
  await applyFilter();
};

const handleFoodTypeFilter = async (foodType: 'DRY' | 'WET' | undefined) => {
  filter.value.foodType = foodType as any;
  await applyFilter();
};

const handleEdit = (record: MealRecord) => {
  emit('edit', record);
};

const handleDelete = (record: MealRecord) => {
  emit('delete', record);
};

const formatMealTime = (date: Date) => {
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

const formatQuantity = (quantity: number) => {
  return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
};

// Expose methods to parent component
defineExpose({
  fetchMealRecords,
});

// Lifecycle
onMounted(() => {
  fetchMealRecords(true);
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
      fetchMealRecords(true);
    }
  },
  { deep: true },
);
</script>

<template>
  <div class="meal-record-list">
    <!-- Header -->
    <div class="list-header">
      <div class="header-content">
        <h2 class="list-title">
          食事履歴
        </h2>
        <div class="record-count">
          {{ pagination.total }}件の記録
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <!-- Mobile Filters (Dropdowns) -->
      <div class="filters-mobile">
        <!-- Cat Filter Dropdown -->
        <div class="filter-dropdown">
          <label class="filter-dropdown-label">猫</label>
          <select
            class="filter-select"
            :value="filter.catId || ''"
            @change="handleCatFilter($event.target.value ? Number($event.target.value) : undefined)"
          >
            <option value="">
              すべて
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

        <!-- Date Range Dropdown -->
        <div class="filter-dropdown">
          <label class="filter-dropdown-label">期間</label>
          <select
            class="filter-select"
            :value="selectedDateRange"
            @change="handleDateRangeShortcut(Number($event.target.value))"
          >
            <option
              v-for="shortcut in dateRangeShortcuts"
              :key="shortcut.label"
              :value="shortcut.days"
            >
              {{ shortcut.label }}
            </option>
          </select>
        </div>

        <!-- Food Type Dropdown -->
        <div class="filter-dropdown">
          <label class="filter-dropdown-label">種類</label>
          <select
            class="filter-select"
            :value="filter.foodType || ''"
            @change="handleFoodTypeFilter($event.target.value || undefined)"
          >
            <option value="">
              すべて
            </option>
            <option value="DRY">
              ドライ
            </option>
            <option value="WET">
              ウェット
            </option>
          </select>
        </div>
      </div>

      <!-- Desktop Filters (Buttons) -->
      <div class="filters-desktop">
        <!-- Cat Filter -->
        <div class="filter-group">
          <label class="filter-label">猫で絞り込み</label>
          <div class="cat-filter">
            <button
              type="button"
              class="filter-button"
              :class="{ 'filter-button--active': !filter.catId }"
              @click="handleCatFilter(undefined)"
            >
              すべて
            </button>
            <button
              v-for="cat in cats"
              :key="cat.id"
              type="button"
              class="filter-button"
              :class="{ 'filter-button--active': filter.catId === cat.id }"
              @click="handleCatFilter(cat.id)"
            >
              {{ cat.name }}
            </button>
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
              :class="{ 'filter-button--active': selectedDateRange === shortcut.days }"
              @click="handleDateRangeShortcut(shortcut.days)"
            >
              {{ shortcut.label }}
            </button>
          </div>
        </div>

        <!-- Food Type Filter -->
        <div class="filter-group">
          <label class="filter-label">フードタイプ</label>
          <div class="food-type-filter">
            <button
              type="button"
              class="filter-button"
              :class="{ 'filter-button--active': !filter.foodType }"
              @click="handleFoodTypeFilter(undefined)"
            >
              すべて
            </button>
            <button
              type="button"
              class="filter-button"
              :class="{ 'filter-button--active': filter.foodType === 'DRY' }"
              @click="handleFoodTypeFilter('DRY')"
            >
              ドライ
            </button>
            <button
              type="button"
              class="filter-button"
              :class="{ 'filter-button--active': filter.foodType === 'WET' }"
              @click="handleFoodTypeFilter('WET')"
            >
              ウェット
            </button>
          </div>
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
        @click="fetchMealRecords(true)"
      >
        再試行
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="mealRecords.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">
        🍽️
      </div>
      <h3 class="empty-title">
        食事記録がありません
      </h3>
      <p class="empty-description">
        <span v-if="hasFilters">
          指定した条件に一致する食事記録が見つかりませんでした。
        </span>
        <span v-else> まだ食事記録が登録されていません。 </span>
      </p>
    </div>

    <!-- Meal Records List -->
    <div
      v-else
      class="meal-records"
    >
      <!-- Use virtual scrolling for large datasets -->
      <VirtualScroll
        v-if="mealRecords.length > 50"
        :items="mealRecords"
        :item-height="120"
        :container-height="600"
        :has-more="pagination.hasMore"
        :is-loading-more="isLoadingMore"
        key-field="id"
        @load-more="loadMore"
      >
        <template #default="{ item: record }">
          <div class="meal-record-card virtual-item">
            <!-- Card Header -->
            <div class="card-header">
              <div class="meal-info">
                <div class="cat-name">
                  {{ (record as MealRecord).cat?.name }}
                </div>
                <div class="meal-time">
                  {{ formatMealTime((record as MealRecord).mealTime) }}
                </div>
              </div>
              <div class="card-actions">
                <button
                  type="button"
                  class="action-button edit-button"
                  title="編集"
                  @click="handleEdit(record as MealRecord)"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  class="action-button delete-button"
                  title="削除"
                  @click="handleDelete(record as MealRecord)"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <div class="food-info">
                <div class="food-name">
                  {{ (record as MealRecord).food?.name }}
                  <span
                    v-if="(record as MealRecord).food?.brand"
                    class="food-brand"
                  >
                    ({{ (record as MealRecord).food?.brand }})
                  </span>
                </div>
                <div class="food-type">
                  <span
                    class="food-type-badge"
                    :class="{
                      'food-type-badge--dry': (record as MealRecord).food?.type === 'DRY',
                      'food-type-badge--wet': (record as MealRecord).food?.type === 'WET',
                    }"
                  >
                    {{ (record as MealRecord).food?.type === "DRY" ? "ドライ" : "ウェット" }}
                  </span>
                </div>
              </div>

              <div class="quantity-info">
                <div class="quantity">
                  <span class="quantity-value">{{
                    formatQuantity((record as MealRecord).quantity)
                  }}</span>
                  <span class="quantity-unit">g</span>
                </div>
                <div class="calories">
                  <span class="calories-value">{{
                    formatQuantity((record as MealRecord).calories)
                  }}</span>
                  <span class="calories-unit">kcal</span>
                </div>
              </div>

              <div
                v-if="(record as MealRecord).notes"
                class="notes"
              >
                <div class="notes-label">
                  メモ:
                </div>
                <div class="notes-content">
                  {{ (record as MealRecord).notes }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </VirtualScroll>

      <!-- Regular grid for smaller datasets -->
      <div
        v-else
        class="records-grid"
      >
        <div
          v-for="record in mealRecords"
          :key="record.id"
          class="meal-record-card"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="meal-info">
              <div class="cat-name">
                {{ record.cat?.name }}
              </div>
              <div class="meal-time">
                {{ formatMealTime(record.mealTime) }}
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
            <div class="food-info">
              <div class="food-name">
                {{ record.food?.name }}
                <span
                  v-if="record.food?.brand"
                  class="food-brand"
                >
                  ({{ record.food.brand }})
                </span>
              </div>
              <div class="food-type">
                <span
                  class="food-type-badge"
                  :class="{
                    'food-type-badge--dry': record.food?.type === 'DRY',
                    'food-type-badge--wet': record.food?.type === 'WET',
                  }"
                >
                  {{ record.food?.type === "DRY" ? "ドライ" : "ウェット" }}
                </span>
              </div>
            </div>

            <div class="quantity-info">
              <div class="quantity">
                <span class="quantity-value">{{
                  formatQuantity(record.quantity)
                }}</span>
                <span class="quantity-unit">g</span>
              </div>
              <div class="calories">
                <span class="calories-value">{{
                  formatQuantity(record.calories)
                }}</span>
                <span class="calories-unit">kcal</span>
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
  </div>
</template>

<style scoped>
.meal-record-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

/* Header */
.list-header {
  margin-bottom: 1.5rem;
  position: relative;
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

.record-count {
  color: #666;
  font-size: 0.9rem;
}

/* Filters */
.filters-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Mobile Filters (Dropdowns) - Hidden by default */
.filters-mobile {
  display: none;
}

/* Desktop Filters (Buttons) - Visible by default */
.filters-desktop {
  display: block;
}

.filter-group {
  margin-bottom: 1rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.cat-filter,
.date-shortcuts,
.food-type-filter {
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

.filter-button--active {
  border-color: #4caf50;
  background: #4caf50;
  color: white;
}

.filter-button--active:hover {
  background: #45a049;
  border-color: #45a049;
  color: white;
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
}

/* Meal Records */
.meal-records {
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

.meal-record-card {
  background: white;
  padding: 1.5rem;
  transition: background-color 0.2s ease;
}

.meal-record-card:hover {
  background: #f8f9fa;
}

/* Card Header */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.meal-info {
  flex: 1;
}

.cat-name {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.meal-time {
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

.food-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.food-name {
  font-weight: 500;
  color: #333;
}

.food-brand {
  color: #666;
  font-weight: normal;
  font-size: 0.9rem;
}

.food-type-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.food-type-badge--dry {
  background: #fff3cd;
  color: #856404;
}

.food-type-badge--wet {
  background: #d1ecf1;
  color: #0c5460;
}

.quantity-info {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.quantity,
.calories {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.quantity-value,
.calories-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.quantity-unit,
.calories-unit {
  font-size: 0.9rem;
  color: #666;
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

/* Virtual scroll items */
.virtual-item {
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0;
}

.virtual-item:last-child {
  border-bottom: none;
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
  .meal-record-list {
    padding: 0.5rem;
  }

  /* ヘッダーの件数を右上に配置 */
  .list-header {
    margin-bottom: 1rem;
  }

  .header-content {
    position: relative;
  }

  .record-count {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 0.85rem;
  }

  /* スマホではドロップダウンを表示、ボタンを非表示 */
  .filters-mobile {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .filters-desktop {
    display: none;
  }

  .filters-section {
    padding: 0.75rem;
    background: #f8f9fa;
    border: 1px solid #e2e8f0;
  }

  /* ドロップダウンスタイル */
  .filter-dropdown {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-dropdown-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
  }

  .filter-select {
    width: 100%;
    padding: 0.5rem 0.375rem;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    background: white;
    color: #333;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-select:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
  }

  .filter-actions {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }

  .clear-filters-button {
    font-size: 0.8rem;
    padding: 0.375rem 0.75rem;
    width: 100%;
  }

  .records-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: transparent;
    padding: 0.5rem;
  }

  .meal-record-card {
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .meal-record-card:hover {
    background: white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }

  /* カードヘッダーをコンパクトに */
  .card-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .meal-info {
    flex: 1;
  }

  .cat-name {
    font-size: 1rem;
    margin-bottom: 0.125rem;
  }

  .meal-time {
    font-size: 0.8rem;
  }

  .card-actions {
    flex-shrink: 0;
  }

  .action-button {
    width: 28px;
    height: 28px;
    font-size: 0.85rem;
  }

  /* カードボディをコンパクトに */
  .card-body {
    gap: 0.5rem;
  }

  .food-info {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .food-name {
    font-size: 0.9rem;
  }

  .food-brand {
    font-size: 0.8rem;
  }

  .food-type-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }

  .quantity-info {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .quantity-value,
  .calories-value {
    font-size: 1.1rem;
  }

  .quantity-unit,
  .calories-unit {
    font-size: 0.85rem;
  }

  .notes {
    padding: 0.5rem;
    font-size: 0.85rem;
  }

  .notes-label {
    font-size: 0.75rem;
    margin-bottom: 0.125rem;
  }

  .notes-content {
    font-size: 0.85rem;
    line-height: 1.3;
  }
}

@media (max-width: 480px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .cat-filter,
  .date-shortcuts,
  .food-type-filter {
    flex-direction: column;
  }

  .filter-button {
    flex: none;
  }
}
</style>
