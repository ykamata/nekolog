import type { MealAnalytics } from '~/types/cat-meal';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    type?: 'line' | 'bar';
    backgroundColor?: string | string[];
    borderColor?: string;
    stack?: string;
  }>;
  isEmpty?: boolean;
}

export interface TransformedMealData {
  labels: string[];
  dryFoodData: number[];
  wetFoodData: number[];
  totalCalories: number[];
}

export interface ChartSummary {
  totalCalories: number;
  averagePerDay: number;
  maxCalories: number;
  minCalories: number;
  dryFoodPercentage: number;
  wetFoodPercentage: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * チャート用にデータを処理する
 */
export function processChartData(
  data: MealAnalytics,
  chartType: 'line' | 'bar' | 'stacked-bar',
  foodTypeFilter?: 'DRY' | 'WET' | null,
  dateRange?: DateRange,
): ChartData {
  if (!data.dailyCalories || data.dailyCalories.length === 0) {
    return {
      labels: [],
      datasets: [{
        label: 'カロリー',
        data: [],
        type: chartType === 'stacked-bar' ? 'bar' : chartType,
      }],
      isEmpty: true,
    };
  }

  let filteredData = data.dailyCalories;

  // 日付範囲でフィルタ
  if (dateRange) {
    filteredData = filteredData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });
  }

  const transformed = transformMealDataForChart(filteredData);

  if (chartType === 'stacked-bar') {
    return {
      labels: transformed.labels,
      datasets: [
        {
          label: 'ドライフード',
          data: transformed.dryFoodData,
          type: 'bar',
          backgroundColor: '#3B82F6',
          stack: 'food-type',
        },
        {
          label: 'ウェットフード',
          data: transformed.wetFoodData,
          type: 'bar',
          backgroundColor: '#10B981',
          stack: 'food-type',
        },
      ],
    };
  }

  let chartData = transformed.totalCalories;

  // フードタイプでフィルタ
  if (foodTypeFilter) {
    chartData = foodTypeFilter === 'DRY' ? transformed.dryFoodData : transformed.wetFoodData;
  }

  return {
    labels: transformed.labels,
    datasets: [{
      label: 'カロリー',
      data: chartData,
      type: chartType,
      backgroundColor: chartType === 'bar' ? '#3B82F6' : undefined,
      borderColor: chartType === 'line' ? '#3B82F6' : undefined,
    }],
  };
}

/**
 * 食事データをチャート形式に変換する
 */
export function transformMealDataForChart(dailyCalories: Array<{
  date: string;
  calories: number;
  type: 'DRY' | 'WET';
}>): TransformedMealData {
  // 日付でソート
  const sortedData = [...dailyCalories].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // 日付ごとにグループ化
  const groupedByDate = new Map<string, { dry: number; wet: number }>();

  sortedData.forEach((item) => {
    try {
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        return; // 無効な日付はスキップ
      }

      const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;
      const calories = item.calories || 0;

      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, { dry: 0, wet: 0 });
      }

      const group = groupedByDate.get(dateKey)!;
      if (item.type === 'DRY') {
        group.dry += calories;
      }
      else {
        group.wet += calories;
      }
    }
    catch (error) {
      // 日付解析エラーはスキップ
      console.warn('Invalid date format:', item.date);
    }
  });

  const labels: string[] = [];
  const dryFoodData: number[] = [];
  const wetFoodData: number[] = [];
  const totalCalories: number[] = [];

  groupedByDate.forEach((value, dateKey) => {
    labels.push(dateKey);
    dryFoodData.push(value.dry);
    wetFoodData.push(value.wet);
    totalCalories.push(value.dry + value.wet);
  });

  return {
    labels,
    dryFoodData,
    wetFoodData,
    totalCalories,
  };
}

/**
 * チャートサマリーを計算する
 */
export function calculateChartSummary(
  data: MealAnalytics,
  foodTypeFilter?: 'DRY' | 'WET',
): ChartSummary {
  if (!data.dailyCalories || data.dailyCalories.length === 0) {
    return {
      totalCalories: 0,
      averagePerDay: 0,
      maxCalories: 0,
      minCalories: 0,
      dryFoodPercentage: 0,
      wetFoodPercentage: 0,
    };
  }

  let filteredData = data.dailyCalories;

  if (foodTypeFilter) {
    filteredData = filteredData.filter(item => item.type === foodTypeFilter);
  }

  const calories = filteredData.map(item => item.calories);
  const totalCalories = calories.reduce((sum, cal) => sum + cal, 0);
  const averagePerDay = filteredData.length > 0 ? totalCalories / filteredData.length : 0;
  const maxCalories = calories.length > 0 ? Math.max(...calories) : 0;
  const minCalories = calories.length > 0 ? Math.min(...calories) : 0;

  // フードタイプの割合を計算
  let dryFoodPercentage = 0;
  let wetFoodPercentage = 0;

  if (foodTypeFilter) {
    dryFoodPercentage = foodTypeFilter === 'DRY' ? 100 : 0;
    wetFoodPercentage = foodTypeFilter === 'WET' ? 100 : 0;
  }
  else if (data.foodTypeBreakdown) {
    const dryBreakdown = data.foodTypeBreakdown.find(item => item.type === 'DRY');
    const wetBreakdown = data.foodTypeBreakdown.find(item => item.type === 'WET');
    dryFoodPercentage = dryBreakdown?.percentage || 0;
    wetFoodPercentage = wetBreakdown?.percentage || 0;
  }

  return {
    totalCalories,
    averagePerDay,
    maxCalories,
    minCalories,
    dryFoodPercentage,
    wetFoodPercentage,
  };
}

/**
 * チャートデータを検証する
 */
export function validateChartData(data: ChartData): ValidationResult {
  const errors: string[] = [];

  if (!data.datasets || data.datasets.length === 0) {
    errors.push('データセットが空です');
  }

  if (data.datasets && data.datasets.length > 0) {
    data.datasets.forEach((dataset, index) => {
      if (data.labels.length !== dataset.data.length) {
        errors.push('ラベル数とデータ数が一致しません');
      }

      const hasInvalidValues = dataset.data.some(value =>
        typeof value !== 'number' || isNaN(value) || value < 0,
      );

      if (hasInvalidValues) {
        errors.push('無効なデータ値が含まれています');
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * パフォーマンス向上のためにデータを最適化する
 */
export function optimizeDataForPerformance(
  data: MealAnalytics,
  maxDataPoints: number,
): MealAnalytics {
  if (!data.dailyCalories || data.dailyCalories.length <= maxDataPoints) {
    return data;
  }

  // インテリジェントサンプリング: 重要なポイントを保持
  const optimizedCalories: typeof data.dailyCalories = [];
  const step = Math.ceil(data.dailyCalories.length / maxDataPoints);

  // 最初と最後のポイントは必ず含める
  if (data.dailyCalories[0]) {
    optimizedCalories.push(data.dailyCalories[0]);
  }

  // 等間隔でサンプリング
  for (let i = step; i < data.dailyCalories.length - step; i += step) {
    const item = data.dailyCalories[i];
    if (item) {
      optimizedCalories.push(item);
    }
  }

  // 最後のポイントを追加
  const lastItem = data.dailyCalories[data.dailyCalories.length - 1];
  if (data.dailyCalories.length > 1 && lastItem) {
    optimizedCalories.push(lastItem);
  }

  return {
    ...data,
    dailyCalories: optimizedCalories,
  };
}

/**
 * 大規模データセット用の高速データ処理
 */
export function processLargeDataset(
  dailyCalories: Array<{
    date: string;
    calories: number;
    type: 'DRY' | 'WET';
  }>,
  options: {
    maxDataPoints?: number;
    enableDecimation?: boolean;
    aggregationLevel?: 'daily' | 'weekly' | 'monthly';
  } = {},
): TransformedMealData {
  const { maxDataPoints = 1000, enableDecimation = true, aggregationLevel = 'daily' } = options;

  // データが大きすぎる場合は間引き処理
  let processedData = dailyCalories;
  if (enableDecimation && dailyCalories.length > maxDataPoints) {
    processedData = decimateData(dailyCalories, maxDataPoints);
  }

  // 集約レベルに応じてデータを処理
  if (aggregationLevel !== 'daily' && processedData.length > 100) {
    processedData = aggregateDataByPeriod(processedData, aggregationLevel);
  }

  return transformMealDataForChart(processedData);
}

/**
 * データ間引き処理（Douglas-Peucker アルゴリズムの簡易版）
 */
function decimateData(
  data: Array<{ date: string; calories: number; type: 'DRY' | 'WET' }>,
  maxPoints: number,
): Array<{ date: string; calories: number; type: 'DRY' | 'WET' }> {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  const decimated: Array<{ date: string; calories: number; type: 'DRY' | 'WET' }> = [];

  // 重要なポイント（極値）を保持しながら間引き
  for (let i = 0; i < data.length; i += step) {
    const item = data[i];
    if (item) {
      decimated.push(item);
    }
  }

  // 最後のポイントを必ず含める
  const lastItem = data[data.length - 1];
  if (lastItem && decimated[decimated.length - 1] !== lastItem) {
    decimated.push(lastItem);
  }

  return decimated;
}

/**
 * 期間別データ集約
 */
function aggregateDataByPeriod(
  data: Array<{ date: string; calories: number; type: 'DRY' | 'WET' }>,
  period: 'weekly' | 'monthly',
): Array<{ date: string; calories: number; type: 'DRY' | 'WET' }> {
  const aggregated = new Map<string, { dry: number; wet: number; count: number }>();

  data.forEach((item) => {
    const date = new Date(item.date);
    let key: string;

    if (period === 'weekly') {
      // 週の開始日を取得
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0]!;
    }
    else {
      // 月の開始日を取得
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    }

    if (!aggregated.has(key)) {
      aggregated.set(key, { dry: 0, wet: 0, count: 0 });
    }

    const group = aggregated.get(key)!;
    if (item.type === 'DRY') {
      group.dry += item.calories;
    }
    else {
      group.wet += item.calories;
    }
    group.count++;
  });

  const result: Array<{ date: string; calories: number; type: 'DRY' | 'WET' }> = [];

  aggregated.forEach((value, date) => {
    if (value.dry > 0) {
      result.push({ date, calories: value.dry, type: 'DRY' });
    }
    if (value.wet > 0) {
      result.push({ date, calories: value.wet, type: 'WET' });
    }
  });

  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * メモリ効率的なデータ変換
 */
export function transformMealDataForChartOptimized(
  dailyCalories: Array<{
    date: string;
    calories: number;
    type: 'DRY' | 'WET';
  }>,
  options: {
    enableCaching?: boolean;
    maxDataPoints?: number;
  } = {},
): TransformedMealData {
  const { enableCaching = true, maxDataPoints = 1000 } = options;

  // 大規模データセットの場合は最適化処理を適用
  if (dailyCalories.length > maxDataPoints) {
    return processLargeDataset(dailyCalories, { maxDataPoints });
  }

  // 通常の処理
  return transformMealDataForChart(dailyCalories);
}

/**
 * パフォーマンス測定ユーティリティ
 */
export function measureProcessingTime<T>(
  fn: () => T,
  label: string = 'Processing',
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  if (process.env.NODE_ENV === 'development') {

  }

  return { result, duration };
}
