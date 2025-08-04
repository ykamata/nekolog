import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  MealAnalytics,
  DailyCalorieData,
} from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';
import type { ErrorInfo } from '~/utils/error-handling';

interface AnalyticsFilter {
  catId?: string;
  startDate?: Date;
  endDate?: Date;
  foodType?: FoodType;
}

export const useAnalyticsStore = defineStore('analytics', () => {
  // State
  const analytics = ref<MealAnalytics | null>(null);
  const loading = ref(false);
  const error = ref<ErrorInfo | null>(null);
  const dateRange = ref({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const selectedCatId = ref<string | null>(null);
  const selectedFoodType = ref<FoodType | null>(null);
  const chartDisplayMode = ref<'line' | 'bar'>('line');
  const cache = ref<Record<string, any>>({});
  const retryCount = ref(0);
  const lastErrorTime = ref<Date | null>(null);
  const dataQuality = ref<any>(null);

  // Getters
  const currentFilters = computed((): AnalyticsFilter => ({
    catId: selectedCatId.value || undefined,
    startDate: dateRange.value.startDate,
    endDate: dateRange.value.endDate,
    foodType: selectedFoodType.value || undefined,
  }));

  const hasData = computed((): boolean => {
    return !!analytics.value && analytics.value.dailyCalories.length > 0;
  });

  const isLoading = computed((): boolean => loading.value);

  const hasError = computed((): boolean => !!error.value);

  const chartDataForLineChart = computed(() => {
    if (!analytics.value) return [];
    return analytics.value.dailyCalories.map(data => ({
      date: data.date,
      calories: data.calories,
      type: data.type,
    }));
  });

  const chartDataForBarChart = computed(() => {
    if (!analytics.value) return [];
    return analytics.value.dailyCalories.map(data => ({
      date: data.date,
      dryCalories: data.type === 'DRY' ? data.calories : 0,
      wetCalories: data.type === 'WET' ? data.calories : 0,
    }));
  });

  const errorInfo = computed(() => error.value);
  const canRetry = computed(() => retryCount.value < 3);
  const currentChartMode = computed(() => chartDisplayMode.value);
  const hasDataQualityIssues = computed(() => false);
  const dataQualityScore = computed(() => 100);
  const dataQualityLevel = computed(() => 'good');
  const anomaliesInfo = computed(() => ({ anomalies: [] }));
  const qualityRecommendations = computed(() => []);
  const errorMessage = computed(() => error.value?.message || null);

  // Actions
  const fetchAnalytics = async (filters?: AnalyticsFilter, forceRefresh = false) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (filters?.catId) params.append('catId', filters.catId);
      if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters?.foodType) params.append('foodType', filters.foodType);

      const response = await $fetch<MealAnalytics>(`/api/analytics/meals?${params.toString()}`);
      analytics.value = response;
    }
    catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : 'Failed to fetch analytics',
        code: 'FETCH_ERROR',
        timestamp: new Date(),
      } as ErrorInfo;
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const setDateRange = (startDate: Date, endDate: Date) => {
    dateRange.value = { startDate, endDate };
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

  const setSelectedCat = (catId: string | null) => {
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

  const refreshData = async () => {
    await fetchAnalytics(currentFilters.value, true);
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
      const savedMode = localStorage.getItem('analytics-chart-mode') as 'line' | 'bar';
      if (savedMode && (savedMode === 'line' || savedMode === 'bar')) {
        chartDisplayMode.value = savedMode;
      }

      const savedFoodType = localStorage.getItem('analytics-food-type-filter') as FoodType | null;
      if (savedFoodType && (savedFoodType === FoodType.DRY || savedFoodType === FoodType.WET)) {
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
      foodTypeBreakdown: analytics.value.foodTypeBreakdown || { DRY: 0, WET: 0 },
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

  return {
    // State
    analytics,
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

    // Getters
    currentFilters,
    hasData,
    isLoading,
    hasError,
    chartDataForLineChart,
    chartDataForBarChart,
    errorInfo,
    canRetry,
    currentChartMode,
    hasDataQualityIssues,
    dataQualityScore,
    dataQualityLevel,
    anomaliesInfo,
    qualityRecommendations,
    errorMessage,

    // Actions
    fetchAnalytics,
    setDateRange,
    setLast7Days,
    setLast30Days,
    setLast90Days,
    setSelectedCat,
    setSelectedFoodType,
    clearFilters,
    refreshData,
    clearError,
    setChartDisplayMode,
    toggleChartDisplayMode,
    restoreDisplaySettings,
    exportToCsv,
    getAnalyticsSummary,
    retryLastOperation,
    optimizeMemoryUsage,
  };
});
