import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import MealChart from '~/components/MealChart.vue';
import type { MealAnalytics } from '~/types/cat-meal';

// Mock Chart.js
vi.mock('chart.js', () => {
  const mockChart = {
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    data: {},
    options: {},
  };

  const mockChartConstructor = vi.fn().mockImplementation(() => mockChart);
  mockChartConstructor.register = vi.fn();

  return {
    Chart: mockChartConstructor,
    CategoryScale: {},
    LinearScale: {},
    PointElement: {},
    LineElement: {},
    BarElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
  };
});

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// Mock window for responsive behavior
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

const mockAnalyticsData: MealAnalytics = {
  dailyCalories: [
    { date: '2024-01-01', calories: 250.5, type: 'DRY' },
    { date: '2024-01-02', calories: 280.0, type: 'WET' },
    { date: '2024-01-03', calories: 265.5, type: 'DRY' },
    { date: '2024-01-04', calories: 290.0, type: 'WET' },
    { date: '2024-01-05', calories: 275.5, type: 'DRY' },
  ],
  weeklyAverage: 272.3,
  foodTypeBreakdown: [
    { type: 'DRY', percentage: 60 },
    { type: 'WET', percentage: 40 },
  ],
};

const mockApiResponse = {
  analytics: mockAnalyticsData,
  summary: {
    totalMeals: 15,
    totalCalories: 1361.5,
    averageCaloriesPerMeal: 90.8,
  },
};

describe('MealChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockApiResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with default props', async () => {
    const wrapper = mount(MealChart);

    expect(wrapper.find('.meal-chart-container').exists()).toBe(true);
    expect(wrapper.find('.chart-controls').exists()).toBe(true);
    expect(wrapper.find('.chart-type-toggle').exists()).toBe(true);
    expect(wrapper.find('.food-type-filter').exists()).toBe(true);
    expect(wrapper.find('.date-range-filter').exists()).toBe(true);
  });

  it('shows loading state initially', async () => {
    // Mock a slow fetch to ensure loading state is visible
    mockFetch.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockApiResponse), 100),
        ),
    );

    const wrapper = mount(MealChart);

    // Should show loading spinner initially
    expect(wrapper.find('.animate-spin').exists()).toBe(true);
    expect(wrapper.find('.chart-wrapper').exists()).toBe(false);

    // Wait for fetch to complete
    await new Promise(resolve => setTimeout(resolve, 150));
    await nextTick();
  });

  it('fetches analytics data on mount', async () => {
    mount(MealChart);

    await nextTick();

    expect(mockFetch).toHaveBeenCalledWith('/api/meals/analytics?days=30');
  });

  it('fetches analytics data with catId when provided', async () => {
    const catId = 'test-cat-id';
    mount(MealChart, {
      props: { catId },
    });

    await nextTick();

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/meals/analytics?days=30&catId=${catId}`,
    );
  });

  it('displays chart after data is loaded', async () => {
    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    expect(wrapper.find('.chart-wrapper').exists()).toBe(true);
    expect(wrapper.find('.chart-canvas-container').exists()).toBe(true);
    expect(wrapper.find('canvas').exists()).toBe(true);
  });

  it('displays chart summary with correct calculations', async () => {
    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    const summaryCards = wrapper.findAll('.summary-card');
    expect(summaryCards).toHaveLength(3);

    // Check total calories
    expect(summaryCards[0].text()).toContain('総カロリー');
    expect(summaryCards[0].text()).toContain('1361.5 kcal');

    // Check average per day
    expect(summaryCards[1].text()).toContain('1日平均');
    expect(summaryCards[1].text()).toContain('272.3 kcal');

    // Check weekly average
    expect(summaryCards[2].text()).toContain('週平均');
    expect(summaryCards[2].text()).toContain('272.3 kcal');
  });

  it('toggles between line and bar chart types', async () => {
    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Initially should be line chart
    const lineButton = wrapper.find('button:first-child');
    const barButton = wrapper.find('button:last-child');

    expect(lineButton.classes()).toContain('bg-blue-600');
    expect(barButton.classes()).toContain('bg-white');

    // Click bar chart button
    await barButton.trigger('click');

    expect(lineButton.classes()).toContain('bg-white');
    expect(barButton.classes()).toContain('bg-blue-600');
  });

  it('shows food type breakdown in bar chart mode', async () => {
    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Switch to bar chart
    const barButton = wrapper.findAll('.chart-type-toggle button')[1];
    await barButton.trigger('click');
    await nextTick();

    expect(wrapper.find('.food-breakdown').exists()).toBe(true);

    const breakdownItems = wrapper.findAll('.breakdown-item');
    expect(breakdownItems).toHaveLength(2);

    expect(breakdownItems[0].text()).toContain('ドライフード');
    expect(breakdownItems[0].text()).toContain('60%');

    expect(breakdownItems[1].text()).toContain('ウェットフード');
    expect(breakdownItems[1].text()).toContain('40%');
  });

  it('filters data by food type', async () => {
    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Select dry food filter
    const foodTypeSelect = wrapper.find('.food-type-filter select');
    await foodTypeSelect.setValue('DRY');

    // Should update the chart data (we can't easily test the chart data directly,
    // but we can verify the select value changed)
    expect(foodTypeSelect.element.value).toBe('DRY');
  });

  it('changes date range and refetches data', async () => {
    const wrapper = mount(MealChart);

    // Wait for initial data load
    await nextTick();
    await nextTick();

    // Clear previous calls
    mockFetch.mockClear();

    // Change date range
    const dateRangeSelect = wrapper.find('.date-range-filter select');
    await dateRangeSelect.setValue('7');

    expect(mockFetch).toHaveBeenCalledWith('/api/meals/analytics?days=7');
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    const wrapper = mount(MealChart);

    // Wait for error to be handled
    await nextTick();
    await nextTick();

    expect(wrapper.find('.text-red-600').exists()).toBe(true);
    expect(wrapper.text()).toContain('データの読み込みに失敗しました');

    // Should have retry button - find the specific retry button
    const retryButton = wrapper.find('.text-red-600').find('button');
    expect(retryButton.text()).toContain('再試行');
  });

  it('retries data fetch when retry button is clicked', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    const wrapper = mount(MealChart);

    // Wait for error
    await nextTick();
    await nextTick();

    // Clear mock and set up success response
    mockFetch.mockClear();
    mockFetch.mockResolvedValueOnce(mockApiResponse);

    // Click retry button - find the specific retry button
    const retryButton = wrapper.find('.text-red-600').find('button');
    await retryButton.trigger('click');

    expect(mockFetch).toHaveBeenCalledWith('/api/meals/analytics?days=30');
  });

  it('adapts height for mobile devices', async () => {
    // Mock mobile width
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
    });

    const wrapper = mount(MealChart, {
      props: { height: 400 },
    });

    // Wait for component to mount and data to load
    await nextTick();
    await nextTick();

    // Should use mobile height (300px) instead of prop height (400px)
    const canvas = wrapper.find('canvas');
    expect(canvas.attributes('style')).toContain('height: 300px');
  });

  it('uses custom height prop for desktop', () => {
    // Mock desktop width
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      writable: true,
    });

    const customHeight = 500;
    const wrapper = mount(MealChart, {
      props: { height: customHeight },
    });

    const canvas = wrapper.find('canvas');
    expect(canvas.attributes('style')).toContain(`height: ${customHeight}px`);
  });

  it('handles empty analytics data', async () => {
    const emptyAnalytics = {
      analytics: {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [
          { type: 'DRY' as const, percentage: 0 },
          { type: 'WET' as const, percentage: 0 },
        ],
      },
      summary: {
        totalMeals: 0,
        totalCalories: 0,
        averageCaloriesPerMeal: 0,
      },
    };

    mockFetch.mockResolvedValueOnce(emptyAnalytics);

    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Should still render without errors
    expect(wrapper.find('.chart-wrapper').exists()).toBe(true);

    // Summary should show zeros
    const summaryCards = wrapper.findAll('.summary-card');
    expect(summaryCards[0].text()).toContain('0.0 kcal');
    expect(summaryCards[1].text()).toContain('0.0 kcal');
    expect(summaryCards[2].text()).toContain('0.0 kcal');
  });

  it('calculates filtered totals correctly', async () => {
    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Filter by DRY food only
    const foodTypeSelect = wrapper.find('.food-type-filter select');
    await foodTypeSelect.setValue('DRY');
    await nextTick();

    // Should recalculate totals for DRY food only
    // DRY foods: 250.5 + 265.5 + 275.5 = 791.5
    const summaryCards = wrapper.findAll('.summary-card');
    expect(summaryCards[0].text()).toContain('791.5 kcal');
    expect(summaryCards[1].text()).toContain('263.8 kcal'); // 791.5 / 3 days
  });

  it('handles responsive layout changes', async () => {
    const wrapper = mount(MealChart);

    // Wait for data to load so chart-summary is rendered
    await nextTick();
    await nextTick();

    // Should have responsive classes
    expect(wrapper.find('.chart-controls').classes()).toContain('flex-wrap');

    const chartSummary = wrapper.find('.chart-summary');
    if (chartSummary.exists()) {
      expect(chartSummary.classes()).toContain('grid');
      expect(chartSummary.classes()).toContain('md:grid-cols-3');
    }
  });
});
