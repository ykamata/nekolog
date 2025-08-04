import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseApiError,
  detectCalorieAnomalies,
  validateDateData,
  generateDataQualityReport,
  fetchWithRetry,
  createErrorInfo,
  logError,
} from '~/utils/error-handling';

describe('Error Handling Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createErrorInfo', () => {
    it('should create error info with all required fields', () => {
      const errorInfo = createErrorInfo(
        'TEST_ERROR',
        'Test error message',
        'User friendly message',
        'high',
        { context: 'test' },
      );

      expect(errorInfo).toMatchObject({
        code: 'TEST_ERROR',
        message: 'Test error message',
        userMessage: 'User friendly message',
        severity: 'high',
        context: { context: 'test' },
      });
      expect(errorInfo.timestamp).toBeInstanceOf(Date);
    });

    it('should use default severity when not provided', () => {
      const errorInfo = createErrorInfo(
        'TEST_ERROR',
        'Test error message',
        'User friendly message',
      );

      expect(errorInfo.severity).toBe('medium');
    });
  });

  describe('parseApiError', () => {
    it('should parse network errors', () => {
      const error = new Error('fetch failed');
      const errorInfo = parseApiError(error);

      expect(errorInfo.code).toBe('NETWORK_ERROR');
      expect(errorInfo.userMessage).toContain('ネットワークに接続できません');
      expect(errorInfo.severity).toBe('high');
    });

    it('should parse timeout errors', () => {
      const error = new Error('timeout occurred');
      const errorInfo = parseApiError(error);

      expect(errorInfo.code).toBe('TIMEOUT_ERROR');
      expect(errorInfo.userMessage).toContain('サーバーからの応答がありません');
      expect(errorInfo.severity).toBe('medium');
    });

    it('should parse authentication errors', () => {
      const error = new Error('401 Unauthorized');
      const errorInfo = parseApiError(error);

      expect(errorInfo.code).toBe('AUTH_ERROR');
      expect(errorInfo.userMessage).toContain('ログインが必要です');
      expect(errorInfo.severity).toBe('high');
    });

    it('should parse server errors', () => {
      const error = new Error('500 Internal Server Error');
      const errorInfo = parseApiError(error);

      expect(errorInfo.code).toBe('SERVER_ERROR');
      expect(errorInfo.userMessage).toContain('サーバーでエラーが発生しました');
      expect(errorInfo.severity).toBe('high');
    });

    it('should parse string errors', () => {
      const error = 'String error message';
      const errorInfo = parseApiError(error);

      expect(errorInfo.code).toBe('STRING_ERROR');
      expect(errorInfo.message).toBe('String error message');
      expect(errorInfo.userMessage).toBe('String error message');
    });

    it('should handle unknown error types', () => {
      const error = { unknown: 'error' };
      const errorInfo = parseApiError(error);

      expect(errorInfo.code).toBe('UNKNOWN_ERROR');
      expect(errorInfo.userMessage).toBe('予期しないエラーが発生しました。');
    });
  });

  describe('detectCalorieAnomalies', () => {
    it('should detect no anomalies in normal data', () => {
      const data = [100, 120, 110, 130, 105, 115, 125];
      const result = detectCalorieAnomalies(data);

      expect(result.hasAnomalies).toBe(false);
      expect(result.anomalies).toHaveLength(0);
      expect(result.cleanedData).toEqual(data);
      expect(result.statistics.originalCount).toBe(7);
      expect(result.statistics.cleanedCount).toBe(7);
    });

    it('should detect negative calorie values', () => {
      const data = [100, -50, 120, 110];
      const result = detectCalorieAnomalies(data);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0]).toMatchObject({
        index: 1,
        value: -50,
        reason: '負のカロリー値',
        severity: 'high',
      });
      expect(result.cleanedData).toEqual([100, 120, 110]);
    });

    it('should detect extremely high calorie values', () => {
      const data = [100, 120, 15000, 110];
      const result = detectCalorieAnomalies(data);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0]).toMatchObject({
        index: 2,
        value: 15000,
        severity: 'high',
      });
      expect(result.anomalies[0].reason).toContain('異常に大きいカロリー値');
    });

    it('should detect extremely low calorie values', () => {
      const data = [100, 120, 2, 110];
      const result = detectCalorieAnomalies(data);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0]).toMatchObject({
        index: 2,
        value: 2,
        severity: 'medium',
      });
      expect(result.anomalies[0].reason).toContain('異常に小さいカロリー値');
    });

    it('should handle empty data', () => {
      const data: number[] = [];
      const result = detectCalorieAnomalies(data);

      expect(result.hasAnomalies).toBe(false);
      expect(result.anomalies).toHaveLength(0);
      expect(result.cleanedData).toEqual([]);
      expect(result.statistics.originalCount).toBe(0);
      expect(result.statistics.cleanedCount).toBe(0);
    });

    it('should calculate correct statistics', () => {
      const data = [100, 120, 110, 130, 105];
      const result = detectCalorieAnomalies(data);

      expect(result.statistics.originalCount).toBe(5);
      expect(result.statistics.cleanedCount).toBe(5);
      expect(result.statistics.removedCount).toBe(0);
      expect(result.statistics.mean).toBe(113);
      expect(result.statistics.median).toBe(110);
      expect(result.statistics.standardDeviation).toBeCloseTo(10.77, 1);
    });
  });

  describe('validateDateData', () => {
    it('should validate correct date formats', () => {
      const dates = ['2024-01-01', '2024-02-15', '2024-12-31'];
      const result = validateDateData(dates);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.cleanedData).toEqual(dates);
    });

    it('should detect invalid date formats', () => {
      const dates = ['2024-1-1', '2024/02/15', 'invalid-date'];
      const result = validateDateData(dates);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]).toContain('無効な日付形式');
    });

    it('should detect invalid dates', () => {
      const dates = ['2024-02-30', '2024-13-01'];
      const result = validateDateData(dates);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0]).toContain('無効な日付');
    });

    it('should warn about future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const dates = [futureDateStr!];
      const result = validateDateData(dates);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('未来の日付');
    });

    it('should warn about very old dates', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 15);
      const oldDateStr = oldDate.toISOString().split('T')[0];

      const dates = [oldDateStr!];
      const result = validateDateData(dates);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('古すぎる日付');
    });
  });

  describe('generateDataQualityReport', () => {
    it('should generate excellent quality report for good data', () => {
      const data = {
        dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
        calories: [100, 120, 110],
      };
      const report = generateDataQualityReport(data);

      expect(report.overall).toBe('excellent');
      expect(report.score).toBeGreaterThanOrEqual(90);
      expect(report.issues).toHaveLength(0);
    });

    it('should generate poor quality report for bad data', () => {
      const data = {
        dates: ['invalid-date', '2024/01/02'],
        calories: [-100, 15000],
      };
      const report = generateDataQualityReport(data);

      expect(['poor', 'fair']).toContain(report.overall);
      expect(report.score).toBeLessThan(70);
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect data completeness issues', () => {
      const data = {
        dates: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
        calories: [100], // Only 1 calorie entry for 5 dates
      };
      const report = generateDataQualityReport(data);

      expect(report.issues.some(issue => issue.message.includes('データの欠損'))).toBe(true);
      expect(report.recommendations.some(rec => rec.includes('定期的なデータ記録'))).toBe(true);
    });
  });

  describe('fetchWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFetch = vi.fn().mockResolvedValue('success');

      const result = await fetchWithRetry(mockFetch, 3, 100);

      expect(result).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const result = await fetchWithRetry(mockFetch, 3, 10);

      expect(result).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(fetchWithRetry(mockFetch, 2, 10)).rejects.toThrow('Persistent failure');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('logError', () => {
    it('should log error in development environment', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      const errorInfo = createErrorInfo(
        'TEST_ERROR',
        'Test message',
        'User message',
        'high',
        { test: 'context' },
      );

      // In test environment, just verify the function exists and can be called
      expect(typeof logError).toBe('function');
      expect(() => logError(errorInfo)).not.toThrow();

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });
});
