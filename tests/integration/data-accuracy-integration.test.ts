import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAnalyticsStore } from '~/stores/analytics';

// DOM環境のセットアップ
Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true,
});

// リアルタイム更新とデータ欠損機能の統合テスト
describe('Data Accuracy Integration Tests', () => {
  let analyticsStore: ReturnType<typeof useAnalyticsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    analyticsStore = useAnalyticsStore();

    // モックデータの設定
    vi.clearAllMocks();

    // $fetchのモック
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      data: {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
        totalMeals: 0,
        averageCaloriesPerMeal: 0,
      },
    }));
  });

  afterEach(() => {
    // リアルタイム更新を停止（関数が存在する場合のみ）
    if (typeof analyticsStore.stopAutoRefresh === 'function') {
      analyticsStore.stopAutoRefresh();
    }
    vi.clearAllTimers();
    vi.unstubAllGlobals();
  });

  describe('リアルタイムデータ更新機能', () => {
    it('should have auto refresh functions available', () => {
      expect(typeof analyticsStore.startAutoRefresh).toBe('function');
      expect(typeof analyticsStore.stopAutoRefresh).toBe('function');
      expect(typeof analyticsStore.toggleAutoRefresh).toBe('function');
      expect(typeof analyticsStore.notifyDataUpdate).toBe('function');
    });

    it('should start auto refresh with correct interval', () => {
      vi.useFakeTimers();
      const fetchSpy = vi.spyOn(analyticsStore, 'fetchAnalytics').mockResolvedValue({} as any);

      analyticsStore.startAutoRefresh(5000); // 5秒間隔

      expect(analyticsStore.autoRefreshEnabled).toBe(true);

      // 5秒後にfetchAnalyticsが呼ばれることを確認
      vi.advanceTimersByTime(5000);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // さらに5秒後にもう一度呼ばれることを確認
      vi.advanceTimersByTime(5000);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should stop auto refresh correctly', () => {
      vi.useFakeTimers();
      const fetchSpy = vi.spyOn(analyticsStore, 'fetchAnalytics').mockResolvedValue({} as any);

      analyticsStore.startAutoRefresh(1000);
      expect(analyticsStore.autoRefreshEnabled).toBe(true);

      analyticsStore.stopAutoRefresh();
      expect(analyticsStore.autoRefreshEnabled).toBe(false);

      // 停止後は呼ばれないことを確認
      vi.advanceTimersByTime(5000);
      expect(fetchSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should toggle auto refresh state', () => {
      // 初期状態を確認（デフォルトはtrue）
      expect(analyticsStore.autoRefreshEnabled).toBe(true);

      analyticsStore.toggleAutoRefresh();
      expect(analyticsStore.autoRefreshEnabled).toBe(false);

      analyticsStore.toggleAutoRefresh();
      expect(analyticsStore.autoRefreshEnabled).toBe(true);
    });

    it('should notify data update with custom event', () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent');

      analyticsStore.notifyDataUpdate();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'analytics-data-updated',
          detail: expect.objectContaining({
            timestamp: expect.any(Date),
            filters: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('データ欠損期間の明示機能', () => {
    beforeEach(() => {
      // テスト用のモックデータを設定
      analyticsStore.analytics = {
        dailyCalories: [
          { date: '2023-01-01', calories: 200, type: 'DRY' },
          { date: '2023-01-03', calories: 150, type: 'WET' }, // 2023-01-02が欠損
          { date: '2023-01-06', calories: 180, type: 'DRY' }, // 2023-01-04, 05が欠損
        ],
        weeklyAverage: 150,
        foodTypeBreakdown: [],
        totalMeals: 3,
        averageCaloriesPerMeal: 176.7,
      };

      // 日付範囲を設定（2023-01-01から2023-01-07まで）
      analyticsStore.dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07'),
      };
    });

    it('should have data quality info available', () => {
      expect(analyticsStore.dataQualityInfo).toBeDefined();
    });

    it('should detect missing date ranges correctly', () => {
      const qualityInfo = analyticsStore.dataQualityInfo;

      expect(qualityInfo).toBeTruthy();
      if (qualityInfo) {
        expect(qualityInfo.totalDays).toBe(7);
        expect(qualityInfo.daysWithData).toBe(3);
        expect(qualityInfo.missingDays).toBe(4);
        expect(qualityInfo.dataCompleteness).toBe(43); // 3/7 * 100 = 42.86 -> 43
      }
    });

    it('should identify significant data gaps', () => {
      const qualityInfo = analyticsStore.dataQualityInfo;

      if (qualityInfo) {
        expect(qualityInfo.hasSignificantGaps).toBe(true);
        expect(qualityInfo.longestMissingPeriod).toBeGreaterThan(2);
      }
    });

    it('should provide detailed missing date ranges', () => {
      const qualityInfo = analyticsStore.dataQualityInfo;

      if (qualityInfo) {
        expect(qualityInfo.missingDateRanges).toBeDefined();
        expect(qualityInfo.missingDateRanges.length).toBeGreaterThan(0);

        // 最初の欠損期間（2023-01-02）
        const firstGap = qualityInfo.missingDateRanges.find(range =>
          range.start === '2023-01-02',
        );
        expect(firstGap).toBeDefined();
        if (firstGap) {
          expect(firstGap.days).toBe(1);
        }

        // 2番目の欠損期間（2023-01-04から2023-01-05）
        const secondGap = qualityInfo.missingDateRanges.find(range =>
          range.start === '2023-01-04',
        );
        expect(secondGap).toBeDefined();
        if (secondGap) {
          expect(secondGap.days).toBe(2);
        }
      }
    });

    it('should return null quality info when no analytics data', () => {
      analyticsStore.analytics = null;

      const qualityInfo = analyticsStore.dataQualityInfo;
      expect(qualityInfo).toBe(null);
    });

    it('should handle complete data without gaps', () => {
      // 完全なデータを設定
      analyticsStore.analytics = {
        dailyCalories: [
          { date: '2023-01-01', calories: 200, type: 'DRY' },
          { date: '2023-01-02', calories: 180, type: 'WET' },
          { date: '2023-01-03', calories: 150, type: 'DRY' },
        ],
        weeklyAverage: 150,
        foodTypeBreakdown: [],
        totalMeals: 3,
        averageCaloriesPerMeal: 176.7,
      };

      analyticsStore.dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-03'),
      };

      const qualityInfo = analyticsStore.dataQualityInfo;

      if (qualityInfo) {
        expect(qualityInfo.totalDays).toBe(3);
        expect(qualityInfo.daysWithData).toBe(3);
        expect(qualityInfo.missingDays).toBe(0);
        expect(qualityInfo.dataCompleteness).toBe(100);
        expect(qualityInfo.hasSignificantGaps).toBe(false);
        expect(qualityInfo.missingDateRanges).toHaveLength(0);
      }
    });
  });

  describe('データ更新通知の統合', () => {
    it('should update lastDataUpdate when fetchAnalytics succeeds', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        data: {
          dailyCalories: [],
          weeklyAverage: 0,
          foodTypeBreakdown: [],
          totalMeals: 0,
          averageCaloriesPerMeal: 0,
        },
      });

      // $fetchをモック
      vi.stubGlobal('$fetch', mockFetch);

      const initialUpdateTime = analyticsStore.lastDataUpdate;

      await analyticsStore.fetchAnalytics();

      expect(analyticsStore.lastDataUpdate).not.toBe(initialUpdateTime);
      expect(analyticsStore.lastDataUpdate).toBeInstanceOf(Date);
    });

    it('should maintain data accuracy during real-time updates', async () => {
      vi.useFakeTimers();

      const mockData1 = {
        dailyCalories: [{ date: '2023-01-01', calories: 200, type: 'DRY' }],
        weeklyAverage: 200,
        foodTypeBreakdown: [],
        totalMeals: 1,
        averageCaloriesPerMeal: 200,
      };

      const mockData2 = {
        dailyCalories: [
          { date: '2023-01-01', calories: 200, type: 'DRY' },
          { date: '2023-01-02', calories: 150, type: 'WET' },
        ],
        weeklyAverage: 175,
        foodTypeBreakdown: [],
        totalMeals: 2,
        averageCaloriesPerMeal: 175,
      };

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 });

      vi.stubGlobal('$fetch', mockFetch);

      // 最初のデータ取得
      await analyticsStore.fetchAnalytics();
      expect(analyticsStore.analytics?.totalMeals).toBe(1);

      // リアルタイム更新を開始
      analyticsStore.startAutoRefresh(1000);

      // 1秒後に自動更新が実行される
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(analyticsStore.analytics?.totalMeals).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
