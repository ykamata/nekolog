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
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <CatSelectionFilter
            v-model="selectedCatId"
            @change="handleCatChange"
          />
        </div>

        <div class="lg:col-span-1">
          <DateRangePicker
            v-model="dateRange"
            @change="handleDateRangeChange"
          />
        </div>

        <div class="lg:col-span-1">
          <ChartTypeToggle
            v-model="chartType"
            @change="handleChartTypeChange"
          />
        </div>
      </div>
    </div>

    <!-- フィルター適用状況の表示 -->
    <div class="mt-4 flex flex-wrap gap-2">
      <span
        v-if="selectedCatId"
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
      >
        猫: {{ selectedCatName }}
        <button
          type="button"
          class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:text-blue-600"
          @click="clearCatFilter"
        >
          <svg
            class="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </span>

      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        期間: {{ formatDateRange }}
      </span>

      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        {{ chartTypeLabel }}
      </span>
    </div>

    <!-- リセットボタン -->
    <div class="mt-4">
      <button
        type="button"
        class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        @click="resetFilters"
      >
        <svg
          class="w-4 h-4 mr-2"
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
        フィルターをリセット
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
  catId?: string;
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
const selectedCatId = ref<string>('');
const dateRange = ref<DateRange>({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
  end: new Date(),
});
const chartType = ref<ChartType>('line');

// 初期化
onMounted(() => {
  if (props.modelValue) {
    selectedCatId.value = props.modelValue.catId || '';
    dateRange.value = props.modelValue.dateRange;
    chartType.value = props.modelValue.chartType;
  }
});

// propsの変更を監視
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    selectedCatId.value = newValue.catId || '';
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

const handleCatChange = (catId: string) => {
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

const clearCatFilter = () => {
  selectedCatId.value = '';
  emitChange();
};

const resetFilters = () => {
  selectedCatId.value = '';
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

/* アニメーション */
.chart-filters button {
  @apply transition-all duration-200;
}

.chart-filters button:hover {
  @apply transform scale-105;
}

/* フィルタータグのアニメーション */
.chart-filters span {
  @apply transition-all duration-200;
}

/* モバイルフィルターパネルのアニメーション */
.chart-filters > div:first-child > div:last-child {
  @apply transition-all duration-300 ease-in-out;
}
</style>
