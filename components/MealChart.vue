<template>
  <div class="meal-chart-container">
    <!-- Chart Controls -->
    <div class="chart-controls mb-4 flex flex-wrap gap-4 items-center">
      <!-- Chart Type Toggle -->
      <div class="chart-type-toggle">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          表示タイプ
        </label>
        <div class="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors',
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50',
            ]"
            @click="chartType = 'line'"
          >
            線グラフ
          </button>
          <button
            type="button"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300',
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50',
            ]"
            @click="chartType = 'bar'"
          >
            棒グラフ
          </button>
        </div>
      </div>

      <!-- Food Type Filter -->
      <div class="food-type-filter">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          フードタイプ
        </label>
        <select
          v-model="selectedFoodType"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">
            すべて
          </option>
          <option value="DRY">
            ドライフード
          </option>
          <option value="WET">
            ウェットフード
          </option>
        </select>
      </div>

      <!-- Date Range -->
      <div class="date-range-filter">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          期間
        </label>
        <select
          v-model="selectedDays"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          @change="refreshData"
        >
          <option value="7">
            過去7日
          </option>
          <option value="14">
            過去14日
          </option>
          <option value="30">
            過去30日
          </option>
          <option value="60">
            過去60日
          </option>
          <option value="90">
            過去90日
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex justify-center items-center h-64"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
      />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="text-center text-red-600 p-4"
    >
      <p>データの読み込みに失敗しました</p>
      <button
        type="button"
        class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        @click="refreshData"
      >
        再試行
      </button>
    </div>

    <!-- Chart Container -->
    <div
      v-else
      class="chart-wrapper"
    >
      <div class="chart-canvas-container relative">
        <canvas
          ref="chartCanvas"
          class="max-w-full h-auto"
          :style="{ height: chartHeight + 'px' }"
        />
      </div>

      <!-- Chart Summary -->
      <div
        v-if="analytics"
        class="chart-summary mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div class="summary-card bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-700">
            総カロリー
          </h3>
          <p class="text-2xl font-bold text-gray-900">
            {{ totalCalories.toFixed(1) }} kcal
          </p>
        </div>
        <div class="summary-card bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-700">
            1日平均
          </h3>
          <p class="text-2xl font-bold text-gray-900">
            {{ averageCaloriesPerDay.toFixed(1) }} kcal
          </p>
        </div>
        <div class="summary-card bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-700">
            週平均
          </h3>
          <p class="text-2xl font-bold text-gray-900">
            {{ analytics.weeklyAverage.toFixed(1) }} kcal
          </p>
        </div>
      </div>

      <!-- Food Type Breakdown -->
      <div
        v-if="analytics && chartType === 'bar'"
        class="food-breakdown mt-4"
      >
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          フードタイプ別内訳
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="breakdown in analytics.foodTypeBreakdown"
            :key="breakdown.type"
            class="breakdown-item bg-gray-50 p-4 rounded-lg"
          >
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">
                {{
                  breakdown.type === "DRY" ? "ドライフード" : "ウェットフード"
                }}
              </span>
              <span class="text-lg font-bold text-gray-900">
                {{ breakdown.percentage }}%
              </span>
            </div>
            <div class="mt-2 bg-gray-200 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-300"
                :class="
                  breakdown.type === 'DRY' ? 'bg-blue-600' : 'bg-green-600'
                "
                :style="{ width: breakdown.percentage + '%' }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartConfiguration,
  type ChartData,
} from 'chart.js';
import type { MealAnalytics, FoodType } from '~/types/cat-meal';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface Props {
  catId?: string;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 400,
});

// Reactive data
const chartCanvas = ref<HTMLCanvasElement>();
const chart = ref<Chart>();
const loading = ref(false);
const error = ref<string>();
const analytics = ref<MealAnalytics>();

// Chart configuration
const chartType = ref<'line' | 'bar'>('line');
const selectedFoodType = ref<FoodType | ''>('');
const selectedDays = ref<number>(30);

// Computed properties
const chartHeight = computed(() => {
  // Responsive height based on screen size
  if (import.meta.client) {
    const isMobile = window.innerWidth < 768;
    return isMobile ? 300 : props.height;
  }
  return props.height;
});

const filteredDailyCalories = computed(() => {
  if (!analytics.value) return [];

  let data = analytics.value.dailyCalories;

  // Filter by food type if selected
  if (selectedFoodType.value) {
    data = data.filter(item => item.type === selectedFoodType.value);
  }

  return data;
});

const totalCalories = computed(() => {
  return filteredDailyCalories.value.reduce(
    (sum, item) => sum + item.calories,
    0,
  );
});

const averageCaloriesPerDay = computed(() => {
  const data = filteredDailyCalories.value;
  return data.length > 0 ? totalCalories.value / data.length : 0;
});

// Chart data preparation
const chartData = computed((): ChartData => {
  const data = filteredDailyCalories.value;

  if (chartType.value === 'line') {
    return {
      labels: data.map(item => item.date),
      datasets: [
        {
          label: 'カロリー (kcal)',
          data: data.map(item => item.calories),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }
  else {
    // Bar chart with food type breakdown
    const dryData = data.filter(item => item.type === 'DRY');
    const wetData = data.filter(item => item.type === 'WET');

    // Create combined dataset for all dates
    const allDates = [...new Set(data.map(item => item.date))].sort();

    return {
      labels: allDates,
      datasets: [
        {
          label: 'ドライフード (kcal)',
          data: allDates.map((date) => {
            const item = dryData.find(d => d.date === date);
            return item ? item.calories : 0;
          }),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
        {
          label: 'ウェットフード (kcal)',
          data: allDates.map((date) => {
            const item = wetData.find(d => d.date === date);
            return item ? item.calories : 0;
          }),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        },
      ],
    };
  }
});

// Chart configuration
const chartConfig = computed((): ChartConfiguration => {
  const isMobile = import.meta.client && window.innerWidth < 768;

  return {
    type: chartType.value,
    data: chartData.value,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '食事カロリー推移',
          font: {
            size: isMobile ? 14 : 16,
          },
        },
        legend: {
          display: chartType.value === 'bar',
          position: 'top',
          labels: {
            font: {
              size: isMobile ? 12 : 14,
            },
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(
                1,
              )} kcal`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '日付',
            font: {
              size: isMobile ? 12 : 14,
            },
          },
          ticks: {
            font: {
              size: isMobile ? 10 : 12,
            },
            maxTicksLimit: isMobile ? 5 : 10,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'カロリー (kcal)',
            font: {
              size: isMobile ? 12 : 14,
            },
          },
          ticks: {
            font: {
              size: isMobile ? 10 : 12,
            },
          },
          beginAtZero: true,
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    },
  };
});

// Methods
async function fetchAnalytics() {
  try {
    loading.value = true;
    error.value = undefined;

    const query = new URLSearchParams({
      days: selectedDays.value.toString(),
    });

    if (props.catId) {
      query.append('catId', props.catId);
    }

    const response = await $fetch<{
      analytics: MealAnalytics;
      summary: any;
    }>(`/api/meals/analytics?${query}`);

    analytics.value = response.analytics;
  }
  catch (err) {
    console.error('Failed to fetch analytics:', err);
    error.value = 'データの取得に失敗しました';
  }
  finally {
    loading.value = false;
  }
}

function createChart() {
  if (!chartCanvas.value) return;

  // Destroy existing chart
  if (chart.value) {
    chart.value.destroy();
  }

  // Create new chart
  chart.value = new Chart(chartCanvas.value, chartConfig.value);
}

function updateChart() {
  if (!chart.value) return;

  chart.value.data = chartData.value;
  if (chartConfig.value.options) {
    chart.value.options = chartConfig.value.options;
  }
  chart.value.update('active');
}

async function refreshData() {
  await fetchAnalytics();
}

// Watchers
watch([chartType, selectedFoodType], () => {
  nextTick(() => {
    if (analytics.value) {
      updateChart();
    }
  });
});

watch(analytics, () => {
  nextTick(() => {
    createChart();
  });
});

// Lifecycle
onMounted(async () => {
  await fetchAnalytics();

  // Handle window resize for responsive behavior
  if (import.meta.client) {
    const handleResize = () => {
      if (chart.value) {
        chart.value.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      if (chart.value) {
        chart.value.destroy();
      }
    });
  }
});

onUnmounted(() => {
  if (chart.value) {
    chart.value.destroy();
  }
});
</script>

<style scoped>
.meal-chart-container {
  @apply w-full;
}

.chart-controls {
  @apply flex-wrap gap-4;
}

@media (max-width: 768px) {
  .chart-controls {
    @apply flex-col gap-2;
  }

  .chart-controls > div {
    @apply w-full;
  }
}

.chart-canvas-container {
  @apply relative w-full;
}

.chart-summary {
  @apply grid gap-4;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

@media (max-width: 768px) {
  .chart-summary {
    @apply grid-cols-1;
  }
}

.summary-card {
  @apply bg-gray-50 p-4 rounded-lg;
}

.food-breakdown {
  @apply mt-4;
}

.breakdown-item {
  @apply bg-gray-50 p-4 rounded-lg;
}
</style>
