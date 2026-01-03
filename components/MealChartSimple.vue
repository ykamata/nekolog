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
      <div class="error-message">
        エラー: {{ error }}
      </div>
      <button
        type="button"
        class="retry-button"
        @click="handleRetry"
      >
        再試行
      </button>
    </div>

    <!-- Chart -->
    <div
      class="chart-container"
      :style="{ display: error ? 'none' : 'block' }"
    >
      <canvas
        :id="`meal-chart-simple-${props.catId || 'default'}-${canvasKey}`"
        :key="`chart-canvas-${canvasKey}`"
        ref="chartCanvas"
        class="chart-canvas"
      />
    </div>

    <!-- Chart Summary -->
    <div
      v-if="analytics && analytics30Days && !loading && !error"
      class="chart-summary"
    >
      <div class="summary-card">
        <h4 class="summary-title">
          総カロリー（30日間）
        </h4>
        <p class="summary-value">
          {{ totalCalories.toFixed(1) }} kcal
        </p>
      </div>
      <div class="summary-card">
        <h4 class="summary-title">
          1日平均（30日間）
        </h4>
        <p class="summary-value">
          {{ averageCaloriesPerDay.toFixed(1) }} kcal
        </p>
      </div>
      <div class="summary-card">
        <h4 class="summary-title">
          週平均（30日間）
        </h4>
        <p class="summary-value">
          {{ (analytics30Days?.weeklyAverage || 0).toFixed(1) }} kcal
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Chart } from 'chart.js';
import type { MealAnalytics } from '~/types/cat-meal';

// Chart.jsはクライアント側でのみ動的にインポートされます
// プラグインでの登録はplugins/chartjs.client.tsで行われます
let ChartJS: typeof Chart | null = null;

interface Props {
  catId?: number;
  height?: number;
  periodDays?: number;
  summaryAnalytics?: MealAnalytics | null;
}

const props = withDefaults(defineProps<Props>(), {
  height: 400,
  periodDays: 90,
  summaryAnalytics: null,
});

// Reactive state
const chartCanvas = ref<HTMLCanvasElement>();
const chart = ref<Chart>();
const isChartInitialized = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const analytics = ref<MealAnalytics | null>(null);
const analytics30Days = ref<MealAnalytics | null>(props.summaryAnalytics || null); // 30日間のデータ（総カロリー計算用）

// チャート作成の競合を防ぐためのフラグ
const isCreatingChart = ref(false);
const chartCreationId = ref(0);

// キャンバス再作成用のキー
const canvasKey = ref(0);

// Analytics Store
const analyticsStore = useAnalyticsStore();

// チャート表示モードを監視
const chartDisplayMode = computed(() => analyticsStore.chartDisplayMode);

// Computed properties for summary
// 総カロリーは直近30日間のデータで計算
const totalCalories = computed(() => {
  if (!analytics30Days.value?.dailyCalories) return 0;
  return analytics30Days.value.dailyCalories.reduce(
    (sum: number, item: { calories: number }) => sum + Number(item.calories),
    0,
  );
});

const averageCaloriesPerDay = computed(() => {
  if (!analytics30Days.value?.dailyCalories || analytics30Days.value.dailyCalories.length === 0) {
    return 0;
  }
  return totalCalories.value / analytics30Days.value.dailyCalories.length;
});

// Fetch analytics data with retry
const fetchData = async (retryCount = 0) => {
  if (!props.catId) {
    error.value = 'Cat ID is required';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    console.log('MealChartSimple: データ取得開始', {
      catId: props.catId,
      periodDays: props.periodDays,
      retryCount,
    });

    // フィルターで指定された期間を優先し、なければperiodDaysから算出
    const filterRange = analyticsStore.dateRange;
    const startDate = filterRange.startDate
      ? new Date(filterRange.startDate)
      : new Date(Date.now() - props.periodDays * 24 * 60 * 60 * 1000);
    const endDate = filterRange.endDate ? new Date(filterRange.endDate) : new Date();

    console.log('MealChartSimple: 日付範囲', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // ストアのキャッシュは fetchAnalytics 側で管理する
    console.log('MealChartSimple: データ取得（ストアに委譲）');
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

    // データがない場合でも空のanalyticsオブジェクトを作成
    if (!analytics.value) {
      analytics.value = {
        dailyCalories: [],
        dailyCaloriesByFoodType: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
      };
    }

    // データ取得後にチャートを作成（データがなくても0のグラフを描画）
    await nextTick();
    console.log('MealChartSimple: createChart呼び出し判定', {
      hasData: (analytics.value?.dailyCalories?.length || 0) > 0,
      dataLength: analytics.value?.dailyCalories?.length,
      chartDisplayMode: chartDisplayMode.value,
    });

    console.log('MealChartSimple: createChart呼び出し開始（データがない場合も0のグラフを描画）');
    await createChart();
    console.log('MealChartSimple: createChart呼び出し完了');
  }
  catch (err) {
    console.error('MealChartSimple: データ取得エラー:', err);

    // リトライ処理（最大2回）
    if (retryCount < 2) {
      console.log(`MealChartSimple: リトライします (${retryCount + 1}/2)`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return fetchData(retryCount + 1);
    }

    error.value = err instanceof Error ? err.message : 'データの取得に失敗しました';
  }
  finally {
    loading.value = false;
  }
};

// Create chart with dynamic type support
const createChart = async () => {
  // 既に作成中の場合は処理をスキップ
  if (isCreatingChart.value) {
    console.log('MealChartSimple: チャート作成中のため処理をスキップ');
    return;
  }

  // 作成IDを更新して、古い処理をキャンセル
  const currentCreationId = ++chartCreationId.value;
  isCreatingChart.value = true;

  try {
    // Client-side only: Dynamically import Chart.js
    if (!ChartJS && import.meta.client) {
      console.log('MealChartSimple: Chart.jsを動的にインポート中...');
      const chartModule = await import('chart.js');
      ChartJS = chartModule.Chart;
      console.log('MealChartSimple: Chart.jsのインポート完了');
    }

    if (!ChartJS) {
      console.error('MealChartSimple: Chart.jsがロードされていません');
      error.value = 'Chart.jsのロードに失敗しました';
      return;
    }

    // Canvas要素が利用可能になるまで待つ
    let retryCount = 0;
    const maxRetries = 20;

    while (!chartCanvas.value && retryCount < maxRetries) {
      // 作成IDが変更された場合は処理を中断
      if (chartCreationId.value !== currentCreationId) {
        console.log('MealChartSimple: チャート作成がキャンセルされました');
        return;
      }

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

    // 作成IDが変更された場合は処理を中断
    if (chartCreationId.value !== currentCreationId) {
      console.log('MealChartSimple: チャート作成がキャンセルされました（Canvas取得後）');
      return;
    }

    console.log('MealChartSimple: Canvas要素が利用可能になりました');

    // データがない場合でもチャートを作成（0の値で描画）
    console.log('MealChartSimple: データ確認', {
      analytics: analytics.value,
      dailyCaloriesLength: analytics.value?.dailyCalories?.length,
      hasAnalytics: !!analytics.value,
      chartDisplayMode: chartDisplayMode.value,
    });

    // 既存のチャートを安全に破棄
    await destroyChartSafely();

    // 作成IDが変更された場合は処理を中断
    if (chartCreationId.value !== currentCreationId) {
      console.log('MealChartSimple: チャート作成がキャンセルされました（破棄後）');
      return;
    }

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
      hasOptions: !!chartConfig.options,
      optionsKeys: chartConfig.options ? Object.keys(chartConfig.options) : [],
    });

    // オプションの検証
    if (!chartConfig.options) {
      console.error('MealChartSimple: チャートオプションが未定義');
      error.value = 'チャートオプションが設定されていません';
      return;
    }

    // 作成IDが変更された場合は処理を中断
    if (chartCreationId.value !== currentCreationId) {
      console.log('MealChartSimple: チャート作成がキャンセルされました（設定後）');
      return;
    }

    // Chart.jsインスタンスを作成
    try {
      // デフォルトのchartConfigをそのまま使用
      if (!ChartJS) {
        error.value = 'Chart.jsが初期化されていません';
        return;
      }
      chart.value = new ChartJS(ctx, chartConfig as any);
    } catch (chartError) {
      console.error('MealChartSimple: Chart.js作成エラー:', chartError);
      console.error('MealChartSimple: chartConfig:', JSON.stringify(chartConfig, null, 2));
      error.value = 'チャートの作成に失敗しました';
      return;
    }

    isChartInitialized.value = true;
    console.log('MealChartSimple: チャート作成成功', {
      chartInstance: !!chart.value,
      type: chartConfig.type,
    });

    // チャート作成後にリサイズを強制実行
    await nextTick();
    if (chart.value && chartCreationId.value === currentCreationId) {
      chart.value.resize();
      console.log('MealChartSimple: チャートリサイズ実行');
    }
  }
  catch (err) {
    console.error('MealChartSimple: チャート作成エラー:', err);
    error.value = 'チャートの作成に失敗しました: ' + (err instanceof Error ? err.message : String(err));
    isChartInitialized.value = false;
  }
  finally {
    // 作成中フラグをリセット（現在の作成IDの場合のみ）
    if (chartCreationId.value === currentCreationId) {
      isCreatingChart.value = false;
    }
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
  // analyticsがない場合は空のオブジェクトを作成
  if (!analytics.value) {
    analytics.value = {
      dailyCalories: [],
      dailyCaloriesByFoodType: [],
      weeklyAverage: 0,
      foodTypeBreakdown: [],
    };
  }

  // 期間の開始日と終了日を取得（フィルターがあれば優先）
  const { startDate: filterStartDate, endDate: filterEndDate } = analyticsStore.dateRange;
  const startDate = filterStartDate
    ? new Date(filterStartDate)
    : new Date(Date.now() - props.periodDays * 24 * 60 * 60 * 1000);
  const endDate = filterEndDate ? new Date(filterEndDate) : new Date();

  // 日付を YYYY/MM/DD 形式にフォーマット（ローカルタイムゾーン）
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  // 日付文字列をローカルタイムゾーンのDateオブジェクトに変換してからキーを生成
  const normalizeDateKey = (dateStr: string): string => {
    // "YYYY/MM/DD" 形式の場合はそのまま返す
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // ISO形式やその他の形式の場合は、Dateオブジェクトに変換してからローカル日付キーを生成
    const date = new Date(dateStr);
    return formatDateKey(date);
  };

  // 線グラフでは棒グラフ用データ（dailyCaloriesByFoodType）は使わない。
  // ただし、APIがchartType=lineのときに返すchartData.dailyCaloriesがあればそれを優先する。
  const lineChartData = (() => {
    const chartData = analyticsStore.chartData as any;
    if (chartData?.chartType !== 'line' || !Array.isArray(chartData?.dailyCalories)) {
      return null;
    }

    // フィルター一致を確認（異なる期間の残りデータを使わない）
    const applied = chartData.appliedFilters;
    if (
      applied?.dateRange?.startDate &&
      applied?.dateRange?.endDate &&
      new Date(applied.dateRange.startDate).getTime() === startDate.getTime() &&
      new Date(applied.dateRange.endDate).getTime() === endDate.getTime()
    ) {
      return chartData.dailyCalories;
    }

    return null;
  })();

  // データをMapに格納（日付をキーとして）
  const caloriesMap = new Map<string, number>();

  const sourceDailyCalories = lineChartData || analytics.value.dailyCalories;

  // dailyCaloriesから日付ごとに合算（線グラフ用）
  sourceDailyCalories.forEach((item) => {
    const normalizedKey = normalizeDateKey(item.date);
    const currentTotal = caloriesMap.get(normalizedKey) || 0;
    caloriesMap.set(normalizedKey, currentTotal + Number(item.calories));
  });

  // 期間内のすべての日付を生成（データがない日も0として含める）
  const labels: string[] = [];
  const data: number[] = [];

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = formatDateKey(currentDate);
    const displayLabel = currentDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

    labels.push(displayLabel);
    data.push(caloriesMap.get(dateKey) || 0);

    // 次の日へ
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // データが空の場合は最低1つのデータポイントを追加
  if (labels.length === 0) {
    labels.push(new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }));
    data.push(0);
  }

  console.log('MealChartSimple: 線グラフデータ生成', {
    labelsCount: labels.length,
    dataCount: data.length,
    sampleLabels: labels.slice(0, 3),
    sampleData: data.slice(0, 3),
  });

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
        spanGaps: false,
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

  // 日付文字列を適切にパースしてローカルタイムゾーンで表示
  const labels = (barChartData.labels || []).map((dateStr: string) => {
    // YYYY/MM/DD 形式の場合は分解してローカル日付を作成
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('/').map(Number);
      const date = new Date(year!, month! - 1, day!);
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    }

    // ISO形式やその他の形式の場合
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  });

  // データが空の場合は最低1つのデータポイントを追加
  const finalLabels = labels.length > 0 ? labels : [new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })];
  const dryData = barChartData.datasets?.[0]?.data || [];
  const wetData = barChartData.datasets?.[1]?.data || [];
  const finalDryData = dryData.length > 0 ? dryData : [0];
  const finalWetData = wetData.length > 0 ? wetData : [0];

  console.log('MealChartSimple: 積み上げ棒グラフデータ生成', {
    labelsCount: finalLabels.length,
    dryDataCount: finalDryData.length,
    wetDataCount: finalWetData.length,
  });

  return {
    type: 'bar' as const,
    data: {
      labels: finalLabels,
      datasets: [
        {
          label: 'ドライフード',
          data: finalDryData,
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        },
        {
          label: 'ウェットフード',
          data: finalWetData,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: (() => {
      const baseOptions = getCommonChartOptions('積み上げ棒グラフ');
      return {
        ...baseOptions,
        scales: {
          x: {
            ...baseOptions.scales?.x,
            stacked: true,
          },
          y: {
            ...baseOptions.scales?.y,
            stacked: true,
          },
        },
      };
    })(),
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
  layout: {
    padding: 0,
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
    line: {
      borderWidth: 2,
    },
  },
});

// Destroy chart safely
const destroyChartSafely = async () => {
  if (chart.value) {
    try {
      // Chart.jsのすべてのプラグインとイベントを停止
      chart.value.stop();
      // Chart.jsのインスタンスを破棄
      chart.value.destroy();
      console.log('MealChartSimple: チャートを破棄しました');
    }
    catch (err) {
      console.error('MealChartSimple: チャート破棄エラー:', err);
    }
    finally {
      chart.value = undefined;
      isChartInitialized.value = false;
    }
  }

  // Canvas要素をクリア
  if (chartCanvas.value) {
    const ctx = chartCanvas.value.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, chartCanvas.value.width, chartCanvas.value.height);
      // コンテキストの状態をリセット
      ctx.resetTransform();
    }
  }

  // キャンバスキーを更新して要素を再作成
  canvasKey.value++;

  // 少し待機してDOM操作を完了させる
  await nextTick();
};

// Destroy chart (backward compatibility)
const destroyChart = () => {
  destroyChartSafely();
};

// Retry handler
const handleRetry = async () => {
  error.value = null;
  chartCreationId.value++;
  await destroyChartSafely();
  await fetchData();
};

// ページから渡された30日サマリーの変更を監視
watch(
  () => props.summaryAnalytics,
  (newSummary) => {
    if (newSummary) {
      analytics30Days.value = newSummary;
    }
  },
);

// Watch for catId changes
watch(() => props.catId, async (newCatId) => {
  if (newCatId) {
    chartCreationId.value++;
    await destroyChartSafely();
    await fetchData();
  }
});

// Watch for periodDays changes
// 日付範囲の変更を監視（同じ日数でも開始/終了が変わった場合に再取得）
watch(
  () => {
    const range = analyticsStore.dateRange;
    return [
      range.startDate ? range.startDate.getTime() : null,
      range.endDate ? range.endDate.getTime() : null,
    ];
  },
  async ([newStart, newEnd], [oldStart, oldEnd]) => {
    console.log('MealChartSimple: 日付範囲変更検出', {
      newStart,
      newEnd,
      oldStart,
      oldEnd,
      catId: props.catId,
    });

    if (!props.catId) return;
    if (newStart === oldStart && newEnd === oldEnd) return;

    chartCreationId.value++;
    await destroyChartSafely();
    await fetchData();
  },
);

// Watch for chart display mode changes with debounce
const chartModeChangeTimeout = ref<NodeJS.Timeout>();

watch(chartDisplayMode, async (newMode, oldMode) => {
  console.log('MealChartSimple: チャート表示モード変更', { newMode, oldMode });

  // 既存のタイムアウトをクリア
  if (chartModeChangeTimeout.value) {
    clearTimeout(chartModeChangeTimeout.value);
  }

  // 作成IDを更新して既存の処理をキャンセル
  chartCreationId.value++;

  // デバウンス処理（300ms）
  chartModeChangeTimeout.value = setTimeout(async () => {
    if (analytics.value?.dailyCalories?.length && analytics.value.dailyCalories.length > 0) {
      await createChart();
    }
  }, 300);
});

// Lifecycle
onMounted(async () => {
  console.log('MealChartSimple: onMounted', { catId: props.catId });

  if (!props.catId) {
    error.value = 'Cat ID is required';
    return;
  }

  // ページ側から渡された30日サマリーを反映
  if (props.summaryAnalytics) {
    analytics30Days.value = props.summaryAnalytics;
  }

  // チャートをリセット
  canvasKey.value = 0;
  chartCreationId.value = 0;
  isCreatingChart.value = false;
  isChartInitialized.value = false;
  chart.value = undefined;

  // まずデータを取得
  await fetchData();
});


onBeforeUnmount(() => {
  // タイムアウトをクリア
  if (chartModeChangeTimeout.value) {
    clearTimeout(chartModeChangeTimeout.value);
  }

  // 作成IDを更新して進行中の処理をキャンセル
  chartCreationId.value++;
  isCreatingChart.value = false;

  // チャートを破棄
  destroyChart();
});

onUnmounted(() => {
  // 念のため再度クリーンアップ
  if (chart.value) {
    try {
      chart.value.destroy();
    }
    catch (err) {
      console.error('MealChartSimple: 最終クリーンアップエラー:', err);
    }
    chart.value = undefined;
  }
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

.error-message {
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #b91c1c;
}

.retry-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
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

.chart-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.summary-card {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.summary-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.summary-value {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

/* タブレット対応 */
@media (max-width: 1024px) and (min-width: 769px) {
  .chart-summary {
    gap: 0.75rem;
  }

  .summary-card {
    padding: 0.875rem;
  }

  .summary-title {
    font-size: 0.8125rem;
  }

  .summary-value {
    font-size: 1.375rem;
  }
}

/* モバイル対応 */
@media (max-width: 768px) {
  .chart-summary {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .summary-card {
    padding: 0.75rem;
  }

  .summary-title {
    font-size: 0.75rem;
  }

  .summary-value {
    font-size: 1.25rem;
  }
}

/* 小さなモバイル画面対応 */
@media (max-width: 480px) {
  .chart-summary {
    gap: 0.5rem;
  }

  .summary-card {
    padding: 0.625rem;
  }

  .summary-title {
    font-size: 0.75rem;
  }

  .summary-value {
    font-size: 1.125rem;
  }
}
</style>
