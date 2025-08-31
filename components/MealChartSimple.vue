<template>
  <div class="meal-chart-simple">
    <h3>食事カロリー推移（シンプル版）</h3>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading"
    >
      データを読み込み中...
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="error"
    >
      エラー: {{ error }}
    </div>

    <!-- Chart -->
    <div
      class="chart-container"
      :style="{ display: error ? 'none' : 'block' }"
    >
      <canvas
        ref="chartCanvas"
        class="chart-canvas"
      />
    </div>

    <!-- Debug Info -->
    <div
      class="debug-info"
    >
      <h4>デバッグ情報</h4>
      <p>データ件数: {{ analytics?.dailyCalories?.length || 0 }}</p>
      <p>チャート表示モード: {{ analyticsStore.chartDisplayMode }}</p>
      <p>ChartData存在: {{ !!analyticsStore.chartData }}</p>
      <p>ChartDataタイプ: {{ analyticsStore.chartData?.chartType || 'N/A' }}</p>
      <p>DailyCaloriesByFoodType件数: {{ analyticsStore.chartData?.dailyCaloriesByFoodType?.length || 0 }}</p>
      <p>チャート初期化済み: {{ isChartInitialized }}</p>
      <p>Canvas要素: {{ !!chartCanvas }}</p>
      <p>Canvas DOM存在: {{ chartCanvas ? 'あり' : 'なし' }}</p>
      <p>Canvas幅: {{ chartCanvas?.width || 'N/A' }}</p>
      <p>Canvas高さ: {{ chartCanvas?.height || 'N/A' }}</p>
      <p>Canvas表示幅: {{ chartCanvas?.clientWidth || 'N/A' }}</p>
      <p>Canvas表示高さ: {{ chartCanvas?.clientHeight || 'N/A' }}</p>
      <p>Canvas style display: {{ chartCanvas?.style?.display || 'N/A' }}</p>
      <p>Chart.jsインスタンス: {{ !!chart }}</p>
      <p>ローディング中: {{ loading }}</p>
      <p>エラー: {{ error || 'なし' }}</p>
      <p>Cat ID: {{ props.catId }}</p>
      <p>Period Days: {{ props.periodDays }}</p>
      <p>Client-side: {{ typeof window !== 'undefined' }}</p>
      <div v-if="analytics?.dailyCalories?.length">
        <p>最初のデータ: {{ JSON.stringify(analytics.dailyCalories[0]) }}</p>
        <p>最後のデータ: {{ JSON.stringify(analytics.dailyCalories[analytics.dailyCalories.length - 1]) }}</p>
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
  LineController,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Chart.js components registration - 棒グラフ用コンポーネントを追加
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface Props {
  catId?: string;
  height?: number;
  periodDays?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 400,
  periodDays: 90,
});

// Reactive state
const chartCanvas = ref<HTMLCanvasElement>();
const chart = ref<Chart>();
const isChartInitialized = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const analytics = ref<unknown>(null);

// Development mode check
const isDev = computed(() => {
  try {
    return process.env.NODE_ENV === 'development';
  }
  catch {
    return false;
  }
});

// Analytics Store
const analyticsStore = useAnalyticsStore();

// チャート表示モードを監視
const chartDisplayMode = computed(() => analyticsStore.chartDisplayMode);

// Fetch analytics data
const fetchData = async () => {
  if (!props.catId) {
    error.value = 'Cat ID is required';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    console.log('MealChartSimple: データ取得開始', { catId: props.catId, periodDays: props.periodDays });

    const startDate = new Date(Date.now() - props.periodDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    console.log('MealChartSimple: 日付範囲', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    await analyticsStore.fetchAnalytics({
      catId: props.catId,
      startDate,
      endDate,
    });

    analytics.value = analyticsStore.analytics;
    console.log('MealChartSimple: データ取得成功', {
      hasData: !!analytics.value,
      dataCount: analytics.value?.dailyCalories?.length || 0,
      analytics: analytics.value,
    });

    // データ取得後にチャートを作成
    await nextTick();
    console.log('MealChartSimple: createChart呼び出し判定', {
      hasData: analytics.value?.dailyCalories?.length > 0,
      dataLength: analytics.value?.dailyCalories?.length,
      chartDisplayMode: chartDisplayMode.value,
    });

    if (analytics.value?.dailyCalories?.length > 0) {
      console.log('MealChartSimple: createChart呼び出し開始');
      await createChart();
      console.log('MealChartSimple: createChart呼び出し完了');
    }
    else {
      console.log('MealChartSimple: データが空のためチャートを作成しません');
      error.value = 'データがありません';
    }
  }
  catch (err) {
    console.error('MealChartSimple: データ取得エラー:', err);
    error.value = err instanceof Error ? err.message : 'データの取得に失敗しました';
  }
  finally {
    loading.value = false;
  }
};

// Create chart with dynamic type support
const createChart = async () => {
  // Canvas要素が利用可能になるまで待つ
  let retryCount = 0;
  const maxRetries = 20;

  while (!chartCanvas.value && retryCount < maxRetries) {
    console.log(`MealChartSimple: Canvas要素待機中... (${retryCount + 1}/${maxRetries})`);
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    retryCount++;
  }

  if (!chartCanvas.value) {
    console.log('MealChartSimple: Canvas要素が見つかりません');
    error.value = 'Canvas要素が見つかりません';
    return;
  }

  console.log('MealChartSimple: Canvas要素が利用可能になりました');

  if (!analytics.value?.dailyCalories?.length) {
    console.log('MealChartSimple: データがありません', {
      analytics: analytics.value,
      dailyCaloriesLength: analytics.value?.dailyCalories?.length,
      hasAnalytics: !!analytics.value,
    });
    error.value = 'データがありません';
    return;
  }

  console.log('MealChartSimple: データ存在確認OK', {
    dailyCaloriesLength: analytics.value.dailyCalories.length,
    chartDisplayMode: chartDisplayMode.value,
  });

  // 既存のチャートがあれば破棄
  if (chart.value) {
    chart.value.destroy();
    chart.value = undefined;
    isChartInitialized.value = false;
  }

  try {
    console.log('MealChartSimple: チャート作成開始', { mode: chartDisplayMode.value });

    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) {
      console.error('MealChartSimple: Canvas context取得失敗');
      error.value = 'Canvas contextが取得できません';
      return;
    }

    // チャートタイプに応じてデータとオプションを準備
    const chartConfig = getChartConfig();

    console.log('MealChartSimple: チャート設定', {
      type: chartConfig.type,
      datasetsCount: chartConfig.data.datasets.length,
      labelsCount: chartConfig.data.labels.length,
    });

    chart.value = new Chart(ctx, chartConfig);

    isChartInitialized.value = true;
    console.log('MealChartSimple: チャート作成成功', {
      chartInstance: !!chart.value,
      type: chartConfig.type,
    });

    // チャート作成後にリサイズを強制実行
    await nextTick();
    if (chart.value) {
      chart.value.resize();
      console.log('MealChartSimple: チャートリサイズ実行');
    }
  }
  catch (err) {
    console.error('MealChartSimple: チャート作成エラー:', err);
    error.value = 'チャートの作成に失敗しました: ' + (err instanceof Error ? err.message : String(err));
    isChartInitialized.value = false;
  }
};

// チャートタイプに応じた設定を生成
const getChartConfig = () => {
  const mode = chartDisplayMode.value;

  if (mode === 'line') {
    return getLineChartConfig();
  }
  else if (mode === 'bar') {
    return getStackedBarChartConfig();
  }
  else {
    // デフォルトは線グラフ
    return getLineChartConfig();
  }
};

// 線グラフの設定
const getLineChartConfig = () => {
  const dailyCalories = analytics.value.dailyCalories;
  const labels = dailyCalories.map((item: unknown) => {
    const date = new Date(item.date);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  });
  const data = dailyCalories.map((item: unknown) => Number(item.calories) || 0);

  return {
    type: 'line' as const,
    data: {
      labels,
      datasets: [{
        label: 'カロリー (kcal)',
        data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'rgb(59, 130, 246)',
      }],
    },
    options: getCommonChartOptions('線グラフ'),
  };
};

// 積み上げ棒グラフの設定
const getStackedBarChartConfig = () => {
  // analyticsStoreから積み上げ棒グラフ用のデータを取得
  const barChartData = analyticsStore.chartDataForBarChart;

  console.log('MealChartSimple: 積み上げ棒グラフデータ', {
    barChartData,
    labels: barChartData.labels?.slice(0, 5),
    datasets: barChartData.datasets?.map(d => ({
      label: d.label,
      dataLength: d.data?.length,
      sampleData: d.data?.slice(0, 3),
    })),
    chartDataFromStore: analyticsStore.chartData,
  });

  const labels = barChartData.labels.map((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  });

  return {
    type: 'bar' as const,
    data: {
      labels,
      datasets: [
        {
          label: 'ドライフード',
          data: barChartData.datasets[0]?.data || [],
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        },
        {
          label: 'ウェットフード',
          data: barChartData.datasets[1]?.data || [],
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      ...getCommonChartOptions('積み上げ棒グラフ'),
      scales: {
        ...getCommonChartOptions('積み上げ棒グラフ').scales,
        x: {
          ...getCommonChartOptions('積み上げ棒グラフ').scales?.x,
          stacked: true,
        },
        y: {
          ...getCommonChartOptions('積み上げ棒グラフ').scales?.y,
          stacked: true,
        },
      },
    },
  };
};

// 共通のチャートオプション
const getCommonChartOptions = (title: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  devicePixelRatio: (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1,
  animation: {
    duration: 1000,
  },
  plugins: {
    title: {
      display: true,
      text: `食事カロリー推移 (${title})`,
      font: {
        size: 16,
      },
    },
    legend: {
      display: true,
      position: 'top' as const,
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: 'white',
      bodyColor: 'white',
    },
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: '日付',
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
    y: {
      display: true,
      title: {
        display: true,
        text: 'カロリー (kcal)',
      },
      beginAtZero: true,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false,
  },
  elements: {
    point: {
      hoverRadius: 8,
    },
  },
});

// Destroy chart
const destroyChart = () => {
  if (chart.value) {
    chart.value.destroy();
    chart.value = undefined;
    isChartInitialized.value = false;
    console.log('MealChartSimple: チャートを破棄しました');
  }
};

// Watch for catId changes
watch(() => props.catId, (newCatId) => {
  if (newCatId) {
    destroyChart();
    fetchData();
  }
});

// Watch for chart display mode changes
watch(chartDisplayMode, async (newMode) => {
  console.log('MealChartSimple: チャート表示モード変更', { newMode });
  if (analytics.value?.dailyCalories?.length > 0) {
    await createChart();
  }
});

// Lifecycle
onMounted(async () => {
  console.log('MealChartSimple: マウント開始', { catId: props.catId });

  if (!props.catId) {
    error.value = 'Cat ID is required';
    return;
  }

  // まずデータを取得
  await fetchData();
});

onUnmounted(() => {
  console.log('MealChartSimple: アンマウント');
  destroyChart();
});
</script>

<style scoped>
.meal-chart-simple {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
}

.chart-container {
  width: 100%;
  height: 400px;
  position: relative;
  background: #fafafa;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.loading, .error {
  padding: 2rem;
  text-align: center;
}

.error {
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
}

.debug-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 0.875rem;
}

.debug-info h4 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.debug-info p {
  margin: 0.25rem 0;
}
</style>
