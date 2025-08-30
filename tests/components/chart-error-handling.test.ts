import { describe, it, expect } from 'vitest';
import { analyzeChartData, generateNoDataMessage, detectEdgeCases } from '~/utils/chart-data-validation';

describe('Chart Data Validation Utilities', () => {
  describe('analyzeChartData', () => {
    it('should detect empty data', () => {
      const result = analyzeChartData([]);

      expect(result.hasData).toBe(false);
      expect(result.isEmpty).toBe(true);
      expect(result.reason).toBe('no_data_at_all');
    });

    it('should detect data with cat filter', () => {
      const result = analyzeChartData([], { catId: 'test-cat' });

      expect(result.hasData).toBe(false);
      expect(result.reason).toBe('no_data_for_cat');
    });

    it('should detect data with date range filter', () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };
      const result = analyzeChartData([], { dateRange });

      expect(result.hasData).toBe(false);
      expect(result.reason).toBe('no_data_for_period');
    });

    it('should validate existing data', () => {
      const data = [
        { date: '2024-01-01', calories: 100 },
        { date: '2024-01-02', calories: 120 },
      ];
      const result = analyzeChartData(data);

      expect(result.hasData).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.dataCount).toBe(2);
    });

    it('should handle loading state', () => {
      const result = analyzeChartData([], { isLoading: true });

      expect(result.reason).toBe('data_loading');
    });

    it('should handle error state', () => {
      const result = analyzeChartData([], { hasError: true });

      expect(result.reason).toBe('data_error');
    });
  });

  describe('generateNoDataMessage', () => {
    it('should generate message for no data at all', () => {
      const message = generateNoDataMessage('no_data_at_all');
      expect(message).toContain('まだ食事データが記録されていません');
    });

    it('should generate message for no data in period', () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };
      const message = generateNoDataMessage('no_data_for_period', { dateRange });
      expect(message).toContain('選択した期間');
      expect(message).toContain('2024/1/1');
    });

    it('should generate message for no data for cat', () => {
      const message = generateNoDataMessage('no_data_for_cat', {
        catId: 'test-cat',
        catName: 'テスト猫',
      });
      expect(message).toContain('テスト猫');
    });
  });

  describe('detectEdgeCases', () => {
    it('should detect future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const data = [
        { date: futureDate.toISOString().split('T')[0], calories: 100 },
      ];

      const result = detectEdgeCases(data);
      expect(result.hasEdgeCases).toBe(true);
      expect(result.cases.some(c => c.type === 'future_dates')).toBe(true);
    });

    it('should detect old dates', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const data = [
        { date: oldDate.toISOString().split('T')[0], calories: 100 },
      ];

      const result = detectEdgeCases(data);
      expect(result.hasEdgeCases).toBe(true);
      expect(result.cases.some(c => c.type === 'old_dates')).toBe(true);
    });

    it('should detect sparse data', () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const data = [
        { date: '2024-01-01', calories: 100 },
      ];

      const result = detectEdgeCases(data, { dateRange });
      expect(result.hasEdgeCases).toBe(true);
      expect(result.cases.some(c => c.type === 'sparse_data')).toBe(true);
    });

    it('should return no edge cases for valid data', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const data = [
        { date: yesterday.toISOString().split('T')[0], calories: 100 },
        { date: today.toISOString().split('T')[0], calories: 120 },
      ];

      const result = detectEdgeCases(data);
      expect(result.hasEdgeCases).toBe(false);
      expect(result.cases).toHaveLength(0);
    });
  });
});
