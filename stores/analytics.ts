import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MealAnalytics } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';
import type { ErrorInfo } from '~/utils/error-handling';
import { toLocalDateString } from '~/utils/cat-meal';

interface AnalyticsFilter {
  catId?: number;
  startDate?: Date;
  endDate?: Date;
  foodType?: FoodType;
  days?: number;
}

export const useAnalyticsStore = defineStore('analytics', () => {
  // State
  const analytics = ref<MealAnalytics | null>(null);
  const chartData = ref<any>(null);
  const loading = ref(false);
  const error = ref<ErrorInfo | null>(null);
  // JST（UTC+9）のオフセット（ミリ秒）
  const JST_OFFSET = 9 * 60 * 60 * 1000;

  // 指定した日付のJSTでの年月日を取得
  const getJSTDateParts = (date: Date): { year: number; month: number; day: number } => {
    const jstTime = new Date(date.getTime() + JST_OFFSET);
    return {
      year: jstTime.getUTCFullYear(),
      month: jstTime.getUTCMonth(),
      day: jstTime.getUTCDate(),
    };
  };

  // JSTでの日付の開始時刻（0:00:00.000）を取得
  // 常にJST基準で日付境界を計算する
  const createStartDate = (date: Date): Date => {
    const { year, month, day } = getJSTDateParts(date);
    // JSTの0:00:00をUTCで表現
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - JST_OFFSET);
  };

  // JSTでの日付の終了時刻（23:59:59.999）を取得
  // 常にJST基準で日付境界を計算する
  const createEndDate = (date: Date): Date => {
    const { year, month, day } = getJSTDateParts(date);
    // JSTの23:59:59.999をUTCで表現
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - JST_OFFSET);
  };

  const dateRange = ref({
    startDate: createStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    endDate: createEndDate(new Date()),
  });
  const selectedCatId = ref<number | null>(null);
  const selectedFoodType = ref<FoodType | null>(null);
  const chartDisplayMode = ref<'line' | 'bar'>('line');
  const cache = ref<
    Record<string, { data: any; timestamp: Date; ttl: number }>
  >({});
  const retryCount = ref(0);
  const lastErrorTime = ref<Date | null>(null);
  const dataQuality = ref<unknown>(null);
  const lastDataUpdate = ref<Date | null>(null);
  const autoRefreshEnabled = ref(true);
  const refreshInterval = ref<NodeJS.Timeout | null>(null);

  // Getters
  const currentFilters = computed(
    (): AnalyticsFilter => ({
      catId: selectedCatId.value || undefined,
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate,
      foodType: selectedFoodType.value || undefined,
    }),
  );

  const hasData = computed((): boolean => {
    return !!analytics.value && analytics.value.dailyCalories.length > 0;
  });

  const isLoading = computed((): boolean => loading.value);

  const hasError = computed((): boolean => !!error.value);

  // Data getters
  const dailyCaloriesData = computed(() => {
    return analytics.value?.dailyCalories || [];
  });

  const weeklyAverage = computed(() => {
    return analytics.value?.weeklyAverage || 0;
  });

  const foodTypeBreakdown = computed(() => {
    return analytics.value?.foodTypeBreakdown || [];
  });

  const dryFoodPercentage = computed(() => {
    const breakdown = foodTypeBreakdown.value.find(
      item => item.type === 'DRY',
    );
    return breakdown?.percentage || 0;
  });

  const wetFoodPercentage = computed(() => {
    const breakdown = foodTypeBreakdown.value.find(
      item => item.type === 'WET',
    );
    return breakdown?.percentage || 0;
  });

  const totalCaloriesToday = computed(() => {
    if (!analytics.value) return 0;
    const today = toLocalDateString(new Date());
    const todayData = analytics.value.dailyCalories.filter(
      data => data.date === today,
    );
    return todayData.reduce((sum, data) => sum + data.calories, 0);
  });

  const averageDailyCalories = computed(() => {
    if (!analytics.value || analytics.value.dailyCalories.length === 0)
      return 0;
    const total = analytics.value.dailyCalories.reduce(
      (sum, data) => sum + data.calories,
      0,
    );
    return total / analytics.value.dailyCalories.length;
  });

  const chartDataForLineChart = computed(() => {
    if (!analytics.value) return { labels: [], datasets: [] };

    const data = analytics.value.dailyCalories;
    return {
      labels: data.map(item => item.date),
      datasets: [
        {
          label: 'カロリー',
          data: data.map(item => item.calories),
        },
      ],
    };
  });

  const chartDataForBarChart = computed(() => {
    // APIから返されるchartDataを優先的に使用
    if (chartData.value?.dailyCaloriesByFoodType) {
      const dailyData = chartData.value.dailyCaloriesByFoodType;

      return {
        labels: dailyData.map((item: any) => item.date),
        datasets: [
          {
            label: 'ドライフード',
            data: dailyData.map((item: any) => item.dryCalories || 0),
          },
          {
            label: 'ウェットフード',
            data: dailyData.map((item: any) => item.wetCalories || 0),
          },
        ],
        appliedFilters: {
          dateRange: {
            startDate: dateRange.value.startDate,
            endDate: dateRange.value.endDate,
          },
          catId: selectedCatId.value,
          foodType: selectedFoodType.value,
        },
      };
    }

    // フォールバック: 従来の方法（analyticsデータから生成）
    console.log('AnalyticsStore: chartDataForBarChart フォールバック処理開始', {
      hasAnalytics: !!analytics.value,
      dailyCaloriesCount: analytics.value?.dailyCalories?.length || 0,
      sampleData: analytics.value?.dailyCalories?.slice(0, 3),
    });

    if (!analytics.value) return { labels: [], datasets: [] };

    // Get unique dates within the date range (JSTで日付を扱う)
    const startDate = dateRange.value.startDate;
    const endDate = dateRange.value.endDate;
    const dates: string[] = [];
    const currentDate = new Date(startDate);

    // JSTでの日付をフォーマット
    const formatJSTDate = (date: Date) => {
      const { year, month, day } = getJSTDateParts(date);
      return `${year}/${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    };

    while (currentDate <= endDate) {
      dates.push(formatJSTDate(currentDate));
      // 1日進める（24時間を加算）
      currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const dryData = dates.map((date) => {
      if (!date) return 0;
      const dayData = analytics.value!.dailyCalories.filter(
        item => item.date === date && item.type === 'DRY',
      );
      return dayData.reduce((sum, item) => sum + item.calories, 0);
    });

    const wetData = dates.map((date) => {
      if (!date) return 0;
      const dayData = analytics.value!.dailyCalories.filter(
        item => item.date === date && item.type === 'WET',
      );
      return dayData.reduce((sum, item) => sum + item.calories, 0);
    });

    const missingDataDates = dates.filter((date) => {
      if (!date) return false;
      return !analytics.value!.dailyCalories.some(
        item => item.date === date,
      );
    });

    console.log('AnalyticsStore: chartDataForBarChart フォールバック処理結果', {
      datesCount: dates.length,
      dryDataSum: dryData.reduce((sum, val) => sum + val, 0),
      wetDataSum: wetData.reduce((sum, val) => sum + val, 0),
      sampleDryData: dryData.slice(0, 5),
      sampleWetData: wetData.slice(0, 5),
      sampleDates: dates.slice(0, 5),
    });

    return {
      labels: dates,
      datasets: [
        {
          label: 'ドライフード',
          data: dryData,
        },
        {
          label: 'ウェットフード',
          data: wetData,
        },
      ],
      missingDataDates,
      appliedFilters: {
        dateRange: {
          startDate: startDate,
          endDate: endDate,
        },
        catId: selectedCatId.value,
        foodType: selectedFoodType.value,
      },
    };
  });

  const dataQualityInfo = computed(() => {
    if (!analytics.value || !analytics.value.dailyCalories.length) return null;

    // 実際のデータから期間を計算
    const dailyCalories = analytics.value.dailyCalories;
    const dates = dailyCalories.map(item => item.date).sort();

    if (dates.length === 0) return null;

    const firstDate = new Date(dates[0]!);
    const lastDate = new Date(dates[dates.length - 1]!);
    const totalDays
      = Math.ceil(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    const uniqueDates = [...new Set(dates)];
    const daysWithData = uniqueDates.length;
    const missingDays = totalDays - daysWithData;
    const dataCompleteness
      = totalDays > 0 ? (daysWithData / totalDays) * 100 : 100;

    // 欠損期間の詳細分析（実際のデータ期間内のみ）
    const missingDateRanges = getMissingDateRanges(
      firstDate,
      lastDate,
      uniqueDates,
    );
    const longestMissingPeriod = getLongestMissingPeriod(missingDateRanges);

    // 欠損が重要かどうかの判定を緩和（連続する期間のデータがある場合は問題なし）
    const hasSignificantGaps
      = missingDays > Math.max(3, totalDays * 0.3) || longestMissingPeriod > 3;

    return {
      totalDays,
      daysWithData,
      missingDays,
      dataCompleteness: Math.round(dataCompleteness),
      missingDateRanges,
      longestMissingPeriod,
      hasSignificantGaps,
    };
  });

  const activeFiltersInfo = computed(() => {
    const filters = [];

    // Always include date range
    filters.push({
      type: 'dateRange',
      value: `${dateRange.value.startDate.toLocaleDateString()} - ${dateRange.value.endDate.toLocaleDateString()}`,
    });

    if (selectedCatId.value) {
      filters.push({
        type: 'cat',
        value: selectedCatId.value,
      });
    }

    if (selectedFoodType.value) {
      filters.push({
        type: 'foodType',
        value: selectedFoodType.value,
      });
    }

    return {
      count: filters.length,
      hasActiveFilters: filters.length > 1, // More than just date range
      filters,
    };
  });

  const errorInfo = computed(() => error.value);
  const canRetry = computed(() => retryCount.value < 3);
  const currentChartMode = computed(() => chartDisplayMode.value);
  const hasDataQualityIssues = computed(() => false);
  const dataQualityScore = computed(() => (analytics.value ? 100 : 0));
  const dataQualityLevel = computed(() => (analytics.value ? 'good' : null));
  const anomaliesInfo = computed(() =>
    analytics.value ? { anomalies: [] } : null,
  );
  const qualityRecommendations = computed(() => (analytics.value ? [] : []));
  const errorMessage = computed(() => error.value?.message || '');

  // Additional getters for display mode tests
  const isLineChartMode = computed(() => chartDisplayMode.value === 'line');
  const isBarChartMode = computed(() => chartDisplayMode.value === 'bar');

  // Additional getters for error handling tests
  const errorSeverity = computed(() => null); // Placeholder

  // Actions
  const fetchAnalytics = async (
    filters?: AnalyticsFilter,
    forceRefresh = false,
  ) => {
    console.log('AnalyticsStore: fetchAnalytics開始', {
      filters,
      forceRefresh,
    });

    // Check cache first
    const cacheKey = JSON.stringify(filters || currentFilters.value);
    const cachedData = cache.value[cacheKey];

    if (!forceRefresh && cachedData && cachedData.timestamp) {
      const now = new Date();
      const cacheAge = now.getTime() - cachedData.timestamp.getTime();
      if (cacheAge < cachedData.ttl) {
        console.log('AnalyticsStore: キャッシュからデータを返却');
        analytics.value = cachedData.data.analytics;
        chartData.value = cachedData.data.chartData;
        return cachedData.data.analytics;
      }
    }

    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      const activeFilters = filters || currentFilters.value;

      if (activeFilters.catId) params.append('catId', String(activeFilters.catId));
      if (activeFilters.startDate) {
        // ローカルタイムゾーンのまま送信（UTC変換しない）
        const year = activeFilters.startDate.getFullYear();
        const month = String(activeFilters.startDate.getMonth() + 1).padStart(2, '0');
        const day = String(activeFilters.startDate.getDate()).padStart(2, '0');
        const hours = String(activeFilters.startDate.getHours()).padStart(2, '0');
        const minutes = String(activeFilters.startDate.getMinutes()).padStart(2, '0');
        const seconds = String(activeFilters.startDate.getSeconds()).padStart(2, '0');
        params.append('startDate', `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
      }
      if (activeFilters.endDate) {
        // ローカルタイムゾーンのまま送信（UTC変換しない）
        const year = activeFilters.endDate.getFullYear();
        const month = String(activeFilters.endDate.getMonth() + 1).padStart(2, '0');
        const day = String(activeFilters.endDate.getDate()).padStart(2, '0');
        const hours = String(activeFilters.endDate.getHours()).padStart(2, '0');
        const minutes = String(activeFilters.endDate.getMinutes()).padStart(2, '0');
        const seconds = String(activeFilters.endDate.getSeconds()).padStart(2, '0');
        params.append('endDate', `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
      }
      if (activeFilters.foodType)
        params.append('foodTypeFilter', activeFilters.foodType);

      // チャートタイプをパラメータに追加
      const currentMode = chartDisplayMode.value;
      if (currentMode === 'bar') {
        params.append('chartType', 'bar');
      }

      const url = `/api/meals/analytics?${params.toString()}`;
      console.log('AnalyticsStore: APIリクエスト送信', {
        url,
        params: params.toString(),
        chartDisplayMode: currentMode,
      });

      const response = await $fetch<{
        analytics: MealAnalytics;
        chartData?: unknown;
      }>(url);
      console.log('AnalyticsStore: APIレスポンス受信', {
        hasAnalytics: !!response.analytics,
        hasChartData: !!response.chartData,
        dailyCaloriesCount: response.analytics?.dailyCalories?.length || 0,
        chartDataType: (response.chartData as any)?.chartType,
      });

      analytics.value = response.analytics;
      chartData.value = response.chartData;

      // Cache the result
      cache.value[cacheKey] = {
        data: { analytics: response.analytics, chartData: response.chartData },
        timestamp: new Date(),
        ttl: 5 * 60 * 1000, // 5 minutes
      };

      // データ更新を通知
      notifyDataUpdate();

      return response.analytics;
    }
    catch (err) {
      console.error('AnalyticsStore: fetchAnalytics失敗:', err);
      const errorMessage
        = err instanceof Error ? err.message : 'Failed to fetch analytics';
      error.value = {
        code: 'FETCH_ERROR',
        message: errorMessage,
        userMessage: 'データの取得に失敗しました',
        severity: 'medium',
        timestamp: new Date(),
      };
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const setDateRange = (startDate: Date, endDate: Date) => {
    dateRange.value = {
      startDate: createStartDate(startDate),
      endDate: createEndDate(endDate),
    };
  };

  const setLast7Days = () => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    setDateRange(startDate, endDate);
  };

  const setLast30Days = () => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    setDateRange(startDate, endDate);
  };

  const setLast90Days = () => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    setDateRange(startDate, endDate);
  };

  const setSelectedCat = (catId: number | null) => {
    selectedCatId.value = catId;
  };

  const setSelectedFoodType = (foodType: FoodType | null) => {
    selectedFoodType.value = foodType;

    // localStorageに永続化
    if (typeof window !== 'undefined' && window.localStorage) {
      if (foodType) {
        localStorage.setItem('analytics-food-type-filter', foodType);
      }
      else {
        localStorage.removeItem('analytics-food-type-filter');
      }
    }
  };

  const clearFilters = () => {
    selectedCatId.value = null;
    selectedFoodType.value = null;
    setLast30Days();
  };

  const setStartDate = (startDate: Date) => {
    dateRange.value.startDate = createStartDate(startDate);
  };

  const setEndDate = (endDate: Date) => {
    dateRange.value.endDate = createEndDate(endDate);
  };

  const refreshData = async () => {
    await fetchAnalytics(currentFilters.value, true);
  };

  const clearCache = () => {
    cache.value = {};
  };

  const clearError = () => {
    error.value = null;
    retryCount.value = 0;
    lastErrorTime.value = null;
  };

  const setChartDisplayMode = (mode: 'line' | 'bar') => {
    chartDisplayMode.value = mode;

    // localStorageに永続化
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('analytics-chart-mode', mode);
    }
  };

  const toggleChartDisplayMode = () => {
    const newMode = chartDisplayMode.value === 'line' ? 'bar' : 'line';
    setChartDisplayMode(newMode);
  };

  const restoreDisplaySettings = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedMode = localStorage.getItem('analytics-chart-mode') as
        | 'line'
        | 'bar';
      if (savedMode && (savedMode === 'line' || savedMode === 'bar')) {
        chartDisplayMode.value = savedMode;
      }

      const savedFoodType = localStorage.getItem(
        'analytics-food-type-filter',
      ) as FoodType | null;
      if (
        savedFoodType
        && (savedFoodType === FoodType.DRY || savedFoodType === FoodType.WET)
      ) {
        selectedFoodType.value = savedFoodType;
      }
    }
  };

  const exportToCsv = (): string => {
    if (!analytics.value) return '';

    const headers = ['Date', 'Calories', 'Food Type'];
    const rows = analytics.value.dailyCalories.map(data => [
      data.date,
      data.calories.toString(),
      data.type || 'UNKNOWN',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const getAnalyticsSummary = () => {
    if (!analytics.value) return null;

    const totalDays = analytics.value.dailyCalories.length;
    const totalCalories = analytics.value.dailyCalories.reduce(
      (sum, data) => sum + data.calories,
      0,
    );
    const avgCalories = totalDays > 0 ? totalCalories / totalDays : 0;

    return {
      totalDays,
      totalCalories,
      averageCalories: Math.round(avgCalories * 100) / 100,
      weeklyAverage: analytics.value.weeklyAverage || 0,
      foodTypeBreakdown: analytics.value.foodTypeBreakdown || [],
    };
  };

  const getEnhancedBarChartData = () => {
    if (!analytics.value) return null;

    const chartData = chartDataForBarChart.value;
    const qualityInfo = dataQualityInfo.value;

    const totalCalories = analytics.value.dailyCalories.reduce(
      (sum, data) => sum + data.calories,
      0,
    );
    const averageDaily = totalCalories / (qualityInfo?.daysWithData || 1);

    // Find peak day
    const dailyTotals = new Map<string, number>();
    analytics.value.dailyCalories.forEach((data) => {
      const current = dailyTotals.get(data.date) || 0;
      dailyTotals.set(data.date, current + data.calories);
    });

    let peakDay = { date: '', calories: 0 };
    dailyTotals.forEach((calories, date) => {
      if (calories > peakDay.calories) {
        peakDay = { date, calories };
      }
    });

    return {
      ...chartData,
      qualityInfo,
      statistics: {
        totalCalories,
        averageDaily: Math.round(averageDaily * 100) / 100,
        peakDay,
      },
      metadata: {
        generatedAt: new Date(),
        filters: currentFilters.value,
      },
    };
  };

  const retryLastOperation = async () => {
    if (retryCount.value >= 3) {
      throw new Error('Maximum retry attempts reached');
    }
    retryCount.value++;
    await fetchAnalytics(currentFilters.value, true);
  };

  const optimizeMemoryUsage = () => {
    // Placeholder for memory optimization
    cache.value = {};
  };

  // リアルタイムデータ更新機能
  const startAutoRefresh = (intervalMs: number = 60000) => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
    }

    autoRefreshEnabled.value = true;
    refreshInterval.value = setInterval(async () => {
      if (autoRefreshEnabled.value && !loading.value) {
        try {
          await fetchAnalytics(currentFilters.value, true);
          lastDataUpdate.value = new Date();
        }
        catch (err) {}
      }
    }, intervalMs);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
    autoRefreshEnabled.value = false;
  };

  const toggleAutoRefresh = () => {
    if (autoRefreshEnabled.value) {
      stopAutoRefresh();
    }
    else {
      startAutoRefresh();
    }
  };

  // データ更新通知機能
  const notifyDataUpdate = () => {
    lastDataUpdate.value = new Date();

    // カスタムイベントを発火してコンポーネントに通知
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('analytics-data-updated', {
          detail: {
            timestamp: lastDataUpdate.value,
            filters: currentFilters.value,
          },
        }),
      );
    }
  };

  // データ欠損期間の分析ヘルパー関数
  const getMissingDateRanges = (
    startDate: Date,
    endDate: Date,
    existingDates: string[],
  ) => {
    const ranges: Array<{ start: string; end: string; days: number }> = [];
    const existingDateSet = new Set(existingDates);

    let currentMissingStart: string | null = null;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = toLocalDateString(currentDate);

      if (!existingDateSet.has(dateStr)) {
        if (!currentMissingStart) {
          currentMissingStart = dateStr;
        }
      }
      else {
        if (currentMissingStart) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const endDateStr = toLocalDateString(prevDate);

          const startDateObj = new Date(currentMissingStart);
          const endDateObj = new Date(endDateStr);
          const days
            = Math.ceil(
              (endDateObj.getTime() - startDateObj.getTime())
              / (1000 * 60 * 60 * 24),
            ) + 1;

          ranges.push({
            start: currentMissingStart,
            end: endDateStr,
            days,
          });

          currentMissingStart = null;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 最後の期間が欠損している場合
    if (currentMissingStart) {
      const endDateStr = toLocalDateString(endDate);
      const startDateObj = new Date(currentMissingStart);
      const endDateObj = new Date(endDateStr);
      const days
        = Math.ceil(
          (endDateObj.getTime() - startDateObj.getTime())
          / (1000 * 60 * 60 * 24),
        ) + 1;

      ranges.push({
        start: currentMissingStart,
        end: endDateStr,
        days,
      });
    }

    return ranges;
  };

  const getLongestMissingPeriod = (
    missingRanges: Array<{ start: string; end: string; days: number }>,
  ) => {
    return missingRanges.reduce((max, range) => Math.max(max, range.days), 0);
  };

  return {
    // State
    analytics,
    chartData,
    loading,
    error,
    dateRange,
    selectedCatId,
    selectedFoodType,
    chartDisplayMode,
    cache,
    retryCount,
    lastErrorTime,
    dataQuality,
    lastDataUpdate,
    autoRefreshEnabled,

    // Getters
    currentFilters,
    hasData,
    isLoading,
    hasError,
    dailyCaloriesData,
    weeklyAverage,
    foodTypeBreakdown,
    dryFoodPercentage,
    wetFoodPercentage,
    totalCaloriesToday,
    averageDailyCalories,
    chartDataForLineChart,
    chartDataForBarChart,
    dataQualityInfo,
    activeFiltersInfo,
    errorInfo,
    canRetry,
    currentChartMode,
    hasDataQualityIssues,
    dataQualityScore,
    dataQualityLevel,
    anomaliesInfo,
    qualityRecommendations,
    errorMessage,
    isLineChartMode,
    isBarChartMode,
    errorSeverity,

    // Actions
    fetchAnalytics,
    setDateRange,
    setStartDate,
    setEndDate,
    setLast7Days,
    setLast30Days,
    setLast90Days,
    setSelectedCat,
    setSelectedFoodType,
    clearFilters,
    refreshData,
    clearError,
    clearCache,
    setChartDisplayMode,
    toggleChartDisplayMode,
    restoreDisplaySettings,
    exportToCsv,
    getAnalyticsSummary,
    getEnhancedBarChartData,
    retryLastOperation,
    optimizeMemoryUsage,
    startAutoRefresh,
    stopAutoRefresh,
    toggleAutoRefresh,
    notifyDataUpdate,
  };
});
