<template>
  <div class="chart-filters">
    <!-- モバイル用：折りたたみ可能なフィルターパネル -->
    <div class="sm:hidden">
      <button
        type="button"
        class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-left"
        @click="toggleMobileFilters"
      >
        <span class="text-sm font-medium text-gray-700">フィルター設定</span>
        <svg
          :class="[
            'w-5 h-5 text-gray-500 transition-transform duration-200',
            showMobileFilters ? 'rotate-180' : '',
          ]"
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

      <div
        v-show="showMobileFilters"
        class="mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div class="space-y-4">
          <CatSelectionFilter
            v-model="selectedCatId"
            @change="handleCatChange"
          />

          <DateRangePicker
            v-model="dateRange"
            @change="handleDateRangeChange"
          />

          <ChartTypeToggle
            v-model="chartType"
            @change="handleChartTypeChange"
          />
        </div>
      </div>
    </div>

    <!-- デスクトップ用：横並びレイアウト -->
    <div class="hidden sm:block">
      <div class="filters-grid">
        <div class="filter-item">
          <CatSelectionFilter
            v-model="selectedCatId"
            @change="handleCatChange"
          />
        </div>

        <div class="filter-item">
          <DateRangePicker
            v-model="dateRange"
            @change="handleDateRangeChange"
          />
        </div>

        <div class="filter-item">
          <ChartTypeToggle
            v-model="chartType"
            @change="handleChartTypeChange"
          />
        </div>
      </div>
    </div>

    <!-- フィルター適用状況の表示 -->
    <div class="filter-tags">
      <span
        v-if="selectedCatId"
        class="filter-tag filter-tag--cat"
      >
        猫: {{ selectedCatName }}
      </span>

      <span class="filter-tag filter-tag--period">
        期間: {{ formatDateRange }}
      </span>

      <span class="filter-tag filter-tag--chart">
        {{ chartTypeLabel }}
      </span>

      <!-- リセットボタン -->
      <button
        type="button"
        class="reset-button"
        @click="resetFilters"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>リセット</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChartType } from './ChartTypeToggle.vue';

interface DateRange {
  start: Date;
  end: Date;
}

interface ChartFilters {
  catId?: number;
  dateRange: DateRange;
  chartType: ChartType;
}

interface Props {
  modelValue?: ChartFilters;
}

interface Emits {
  (e: 'update:modelValue', value: ChartFilters): void;
  (e: 'change', value: ChartFilters): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 猫ストアを使用
const catsStore = useCatsStore();
const { sortedCats } = storeToRefs(catsStore);

// モバイルフィルターの表示状態
const showMobileFilters = ref(false);

// フィルター状態
const selectedCatId = ref<number | undefined>(undefined);
const dateRange = ref<DateRange>({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
  end: new Date(),
});
const chartType = ref<ChartType>('line');

// 初期化
onMounted(async () => {
  if (props.modelValue) {
    selectedCatId.value = props.modelValue.catId || undefined;
    dateRange.value = props.modelValue.dateRange;
    chartType.value = props.modelValue.chartType;
  }

  // 猫データがロードされるまで待つ
  await catsStore.fetchCats();

  // 猫が選択されていない場合、最初の猫を選択
  if (!selectedCatId.value && sortedCats.value.length > 0) {
    selectedCatId.value = sortedCats.value[0]!.id;
    emitChange();
  }
});

// propsの変更を監視
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    selectedCatId.value = newValue.catId || undefined;
    dateRange.value = newValue.dateRange;
    chartType.value = newValue.chartType;
  }
});

// 計算プロパティ
const selectedCatName = computed(() => {
  if (!selectedCatId.value) return '';
  const cat = sortedCats.value.find(c => c.id === selectedCatId.value);
  return cat?.name || '';
});

const formatDateRange = computed(() => {
  const start = dateRange.value.start.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
  const end = dateRange.value.end.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
  return `${start} - ${end}`;
});

const chartTypeLabel = computed(() => {
  const labels = {
    'line': '線グラフ',
    'bar': '棒グラフ',
    'stacked-bar': '積み上げ棒グラフ',
  };
  return labels[chartType.value] || '線グラフ';
});

// イベントハンドラー
const toggleMobileFilters = () => {
  showMobileFilters.value = !showMobileFilters.value;
};

const handleCatChange = (catId: number | undefined) => {
  selectedCatId.value = catId;
  emitChange();
};

const handleDateRangeChange = (range: DateRange) => {
  dateRange.value = range;
  emitChange();
};

const handleChartTypeChange = (type: ChartType) => {
  chartType.value = type;
  emitChange();
};

const resetFilters = () => {
  // 最初の猫を選択（猫の選択はリセットしない）
  dateRange.value = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  };
  chartType.value = 'line';
  showMobileFilters.value = false;
  emitChange();
};

// 変更イベントを発行
const emitChange = () => {
  const filters: ChartFilters = {
    catId: selectedCatId.value || undefined,
    dateRange: dateRange.value,
    chartType: chartType.value,
  };

  emit('update:modelValue', filters);
  emit('change', filters);
};
</script>

<style scoped>
.chart-filters {
  @apply w-full;
}

/* フィルターグリッドレイアウト */
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  align-items: start;
}

.filter-item {
  display: flex;
  flex-direction: column;
  min-width: 0; /* 子要素の overflow を防ぐ */
}

/* 大画面での最適化 */
@media (min-width: 1024px) {
  .filters-grid {
    grid-template-columns: minmax(200px, 1fr) minmax(400px, 2fr) minmax(300px, 1.5fr);
    gap: 2rem;
  }
}

/* 中画面での最適化 */
@media (min-width: 768px) and (max-width: 1023px) {
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

/* フィルタータグ */
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.filter-tag--cat {
  background: #d1fae5;
  color: #065f46;
}

.filter-tag--period {
  background: #dbeafe;
  color: #1e40af;
}

.filter-tag--chart {
  background: #e9d5ff;
  color: #6b21a8;
}

/* リセットボタン */
.reset-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;
}

.reset-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  color: #374151;
}

.reset-button:active {
  transform: scale(0.98);
}

/* アニメーション */
.chart-filters button {
  transition: all 0.2s ease;
}

/* モバイルフィルターパネルのアニメーション */
.chart-filters > div:first-child > div:last-child {
  transition: all 0.3s ease-in-out;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .filter-tags {
    gap: 0.375rem;
    margin-top: 1rem;
    padding-top: 1rem;
  }

  .filter-tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.625rem;
  }

  .reset-button {
    width: 100%;
    justify-content: center;
    margin-left: 0;
    margin-top: 0.25rem;
  }
}
</style>
