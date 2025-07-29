import { defineStore } from 'pinia';
import type {
  MealAnalytics,
  DailyCalorieData,
  FoodType,
} from '~/types/cat-meal';

interface AnalyticsState {
  analytics: MealAnalytics | null;
  loading: boolean;
  error: string | null;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  selectedCatId: string | null;
  selectedFoodType: FoodType | null;
  cache: {
    [key: string]: {
      data: MealAnalytics;
      timestamp: Date;
      ttl: number;
    };
  };
}

interface AnalyticsFilter {
  catId?: string;
  startDate?: Date;
  endDate?: Date;
  foodType?: FoodType;
}

export const useAnalyticsStore = defineStore('analytics', {
  state: (): AnalyticsState => ({
    analytics: null,
    loading: false,
    error: null,
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(),
    },
    selectedCatId: null,
    selectedFoodType: null,
    cache: {},
  }),

  getters: {
    dailyCaloriesData: (state): DailyCalorieData[] => {
      return state.analytics?.dailyCalories || [];
    },

    weeklyAverage: (state): number => {
      return state.analytics?.weeklyAverage || 0;
    },

    foodTypeBreakdown: (state) => {
      return state.analytics?.foodTypeBreakdown || [];
    },

    dryFoodPercentage: (state): number => {
      const breakdown = state.analytics?.foodTypeBreakdown || [];
      const dryFood = breakdown.find(item => item.type === 'DRY');
      return dryFood?.percentage || 0;
    },

    wetFoodPercentage: (state): number => {
      const breakdown = state.analytics?.foodTypeBreakdown || [];
      const wetFood = breakdown.find(item => item.type === 'WET');
      return wetFood?.percentage || 0;
    },

    totalCaloriesToday: (state): number => {
      const today = new Date().toISOString().split('T')[0];
      const todayData = state.analytics?.dailyCalories.find(
        data => data.date === today,
      );
      return todayData?.calories || 0;
    },

    averageDailyCalories: (state): number => {
      const dailyData = state.analytics?.dailyCalories || [];
      if (dailyData.length === 0) return 0;

      const total = dailyData.reduce((sum, data) => sum + data.calories, 0);
      return total / dailyData.length;
    },

    chartDataForLineChart: (state) => {
      const dailyData = state.analytics?.dailyCalories || [];

      return {
        labels: dailyData.map((data) => {
          const date = new Date(data.date);
          return date.toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
          });
        }),
        datasets: [
          {
            label: 'カロリー',
            data: dailyData.map(data => data.calories),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1,
          },
        ],
      };
    },

    chartDataForBarChart: (state) => {
      const dailyData = state.analytics?.dailyCalories || [];

      // Group by food type
      const dryData: number[] = [];
      const wetData: number[] = [];
      const labels: string[] = [];

      // Create a map to aggregate data by date
      const dateMap = new Map<string, { dry: number; wet: number }>();

      dailyData.forEach((data) => {
        if (!dateMap.has(data.date)) {
          dateMap.set(data.date, { dry: 0, wet: 0 });
        }

        const entry = dateMap.get(data.date)!;
        if (data.type === 'DRY') {
          entry.dry += data.calories;
        }
        else {
          entry.wet += data.calories;
        }
      });

      // Convert map to arrays
      Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, calories]) => {
          const dateObj = new Date(date);
          labels.push(
            dateObj.toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
            }),
          );
          dryData.push(calories.dry);
          wetData.push(calories.wet);
        });

      return {
        labels,
        datasets: [
          {
            label: 'ドライフード',
            data: dryData,
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderColor: 'rgb(245, 158, 11)',
            borderWidth: 1,
          },
          {
            label: 'ウェットフード',
            data: wetData,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          },
        ],
      };
    },

    isLoading: (state): boolean => state.loading,

    hasError: (state): boolean => !!state.error,

    hasData: (state): boolean => !!state.analytics,

    currentDateRange: state => state.dateRange,

    currentFilters: (state): AnalyticsFilter => ({
      catId: state.selectedCatId || undefined,
      startDate: state.dateRange.startDate,
      endDate: state.dateRange.endDate,
      foodType: state.selectedFoodType || undefined,
    }),
  },

  actions: {
    async fetchAnalytics(filter?: AnalyticsFilter, forceRefresh = false) {
      // Create cache key
      const cacheKey = JSON.stringify({
        catId: filter?.catId || this.selectedCatId,
        startDate: (
          filter?.startDate || this.dateRange.startDate
        ).toISOString(),
        endDate: (filter?.endDate || this.dateRange.endDate).toISOString(),
        foodType: filter?.foodType || this.selectedFoodType,
      });

      // Check cache
      if (!forceRefresh && this.cache[cacheKey]) {
        const cached = this.cache[cacheKey];
        const now = new Date();
        const isValid = now.getTime() - cached.timestamp.getTime() < cached.ttl;

        if (isValid) {
          this.analytics = cached.data;
          return this.analytics;
        }
      }

      this.loading = true;
      this.error = null;

      try {
        const query = new URLSearchParams();

        const catId = filter?.catId || this.selectedCatId;
        const startDate = filter?.startDate || this.dateRange.startDate;
        const endDate = filter?.endDate || this.dateRange.endDate;
        const foodType = filter?.foodType || this.selectedFoodType;

        if (catId) query.append('catId', catId);
        if (startDate) query.append('startDate', startDate.toISOString());
        if (endDate) query.append('endDate', endDate.toISOString());
        if (foodType) query.append('foodType', foodType);

        const url = `/api/meals/analytics?${query.toString()}`;

        const { data } = await $fetch<{ data: MealAnalytics }>(url);

        this.analytics = {
          ...data,
          dailyCalories: data.dailyCalories.map(item => ({
            ...item,
            date: item.date, // Keep as string for consistency
          })),
        };

        // Update cache
        this.cache[cacheKey] = {
          data: this.analytics,
          timestamp: new Date(),
          ttl: 5 * 60 * 1000, // 5 minutes
        };

        return this.analytics;
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to fetch analytics';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    // Date range actions
    setDateRange(startDate: Date, endDate: Date) {
      this.dateRange = { startDate, endDate };
    },

    setStartDate(date: Date) {
      this.dateRange.startDate = date;
    },

    setEndDate(date: Date) {
      this.dateRange.endDate = date;
    },

    setLast7Days() {
      const endDate = new Date();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      this.setDateRange(startDate, endDate);
    },

    setLast30Days() {
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.setDateRange(startDate, endDate);
    },

    setLast90Days() {
      const endDate = new Date();
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      this.setDateRange(startDate, endDate);
    },

    // Filter actions
    setSelectedCat(catId: string | null) {
      this.selectedCatId = catId;
    },

    setSelectedFoodType(foodType: FoodType | null) {
      this.selectedFoodType = foodType;
    },

    clearFilters() {
      this.selectedCatId = null;
      this.selectedFoodType = null;
      this.setLast30Days(); // Reset to default date range
    },

    // Utility actions
    async refreshData() {
      await this.fetchAnalytics(this.currentFilters, true);
    },

    clearError() {
      this.error = null;
    },

    clearCache() {
      this.cache = {};
    },

    // Data export actions
    exportToCsv(): string {
      if (!this.analytics) return '';

      const headers = ['Date', 'Calories', 'Food Type'];
      const rows = this.analytics.dailyCalories.map(data => [
        data.date,
        data.calories.toString(),
        data.type,
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    },

    getAnalyticsSummary() {
      if (!this.analytics) return null;

      const totalDays = this.analytics.dailyCalories.length;
      const totalCalories = this.analytics.dailyCalories.reduce(
        (sum, data) => sum + data.calories,
        0,
      );
      const avgCalories = totalDays > 0 ? totalCalories / totalDays : 0;

      const dryFoodDays = this.analytics.dailyCalories.filter(
        data => data.type === 'DRY',
      ).length;
      const wetFoodDays = this.analytics.dailyCalories.filter(
        data => data.type === 'WET',
      ).length;

      return {
        totalDays,
        totalCalories,
        averageCalories: Math.round(avgCalories * 100) / 100,
        weeklyAverage: this.analytics.weeklyAverage,
        dryFoodDays,
        wetFoodDays,
        foodTypeBreakdown: this.analytics.foodTypeBreakdown,
      };
    },
  },
});
