import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAnalyticsStore } from '~/stores/analytics';

describe('Analytics Store Debug', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize analytics store correctly', () => {
    const store = useAnalyticsStore();

    console.log('Store properties:', Object.keys(store));
    console.log('autoRefreshEnabled:', store.autoRefreshEnabled);
    console.log('startAutoRefresh type:', typeof store.startAutoRefresh);
    console.log('dataQualityInfo:', store.dataQualityInfo);

    // 基本的なプロパティの存在確認
    expect(store).toBeDefined();
    expect(store.analytics).toBeDefined();
    expect(store.loading).toBeDefined();
    expect(store.error).toBeDefined();
  });

  it('should have all required functions', () => {
    const store = useAnalyticsStore();

    const requiredFunctions = [
      'fetchAnalytics',
      'setDateRange',
      'setSelectedCat',
      'setSelectedFoodType',
      'clearFilters',
      'refreshData',
      'clearError',
      'clearCache',
      'startAutoRefresh',
      'stopAutoRefresh',
      'toggleAutoRefresh',
      'notifyDataUpdate',
    ];

    requiredFunctions.forEach((funcName) => {
      console.log(`${funcName}:`, typeof store[funcName]);
      expect(typeof store[funcName]).toBe('function');
    });
  });

  it('should have all required computed properties', () => {
    const store = useAnalyticsStore();

    const requiredComputeds = [
      'currentFilters',
      'hasData',
      'isLoading',
      'hasError',
      'dataQualityInfo',
      'autoRefreshEnabled',
      'lastDataUpdate',
    ];

    requiredComputeds.forEach((propName) => {
      console.log(`${propName}:`, store[propName]);
      expect(store[propName]).toBeDefined();
    });
  });
});
