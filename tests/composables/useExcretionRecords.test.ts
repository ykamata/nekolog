import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useExcretionRecords } from '~/composables/useExcretionRecords';
import type { ExcretionRecord, ExcretionRecordInput, ExcretionRecordsResponse, ExcretionRecordResponse } from '~/types/excretion';
import { ExcretionType } from '~/types/excretion';

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// Mock performance monitor
vi.mock('~/utils/performance-monitor', () => ({
  performanceMonitor: {
    measureApiCall: vi.fn((name, fn, metadata) => fn()),
  },
}));

describe('useExcretionRecords', () => {
  const mockRecord: ExcretionRecord = {
    id: 'record1',
    catId: 'cat1',
    type: ExcretionType.URINE,
    recordedAt: new Date('2024-01-15T10:30:00'),
    notes: 'テストメモ',
    createdAt: new Date(),
    updatedAt: new Date(),
    cat: {
      id: 'cat1',
      name: 'ミケ',
      weight: 4.5,
      birthdate: new Date('2020-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockRecordsResponse: ExcretionRecordsResponse = {
    records: [mockRecord],
    total: 1,
    page: 1,
    limit: 20,
  };

  const mockRecordResponse: ExcretionRecordResponse = {
    record: mockRecord,
    message: '排泄記録が正常に作成されました',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { records, loading, error, total, hasMore, isEmpty } = useExcretionRecords();

      expect(records.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(total.value).toBe(0);
      expect(hasMore.value).toBe(false);
      expect(isEmpty.value).toBe(true);
    });

    it('should have correct computed properties', () => {
      const { isLoading, hasError, isEmpty, canLoadMore } = useExcretionRecords();

      expect(isLoading.value).toBe(false);
      expect(hasError.value).toBe(false);
      expect(isEmpty.value).toBe(true);
      expect(canLoadMore.value).toBe(false);
    });
  });

  describe('Basic CRUD Operations', () => {
    it('should fetch records successfully', async () => {
      mockFetch.mockResolvedValueOnce(mockRecordsResponse);

      const { fetchRecords, records, total } = useExcretionRecords();
      await fetchRecords();

      expect(mockFetch).toHaveBeenCalledWith('/api/excretion-records', {
        query: {},
      });
      expect(records.value).toEqual(mockRecordsResponse.records);
      expect(total.value).toBe(1);
    });

    it('should create record successfully', async () => {
      mockFetch.mockResolvedValueOnce(mockRecordResponse);

      const { createRecord, records, total } = useExcretionRecords();
      const newRecordInput = {
        catId: 'cat1',
        type: ExcretionType.URINE,
        recordedAt: new Date('2024-01-15T10:30:00'),
        notes: 'テストメモ',
      };

      const result = await createRecord(newRecordInput);

      expect(mockFetch).toHaveBeenCalledWith('/api/excretion-records', {
        method: 'POST',
        body: newRecordInput,
      });
      expect(records.value).toHaveLength(1);
      expect(total.value).toBe(1);
      expect(result).toEqual(mockRecord);
    });

    it('should handle errors correctly', async () => {
      const errorResponse = {
        data: { statusMessage: 'データの取得に失敗しました' },
      };
      mockFetch.mockRejectedValueOnce(errorResponse);

      const { fetchRecords, error } = useExcretionRecords();

      await expect(fetchRecords()).rejects.toThrow('データの取得に失敗しました');
      expect(error.value).toBe('データの取得に失敗しました');
    });
  });

  describe('State Management', () => {
    it('should manage loading state correctly', async () => {
      const { fetchRecords, loading } = useExcretionRecords();

      expect(loading.value).toBe(false);

      mockFetch.mockResolvedValueOnce(mockRecordsResponse);
      await fetchRecords();

      expect(loading.value).toBe(false);
    });

    it('should reset state correctly', () => {
      const { reset, records, loading, error, total, hasMore } = useExcretionRecords();

      reset();

      expect(records.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(total.value).toBe(0);
      expect(hasMore.value).toBe(false);
    });

    it('should clear error', () => {
      const { clearError } = useExcretionRecords();

      // clearError method should exist and be callable
      expect(typeof clearError).toBe('function');
      clearError(); // Should not throw
    });
  });

  describe('Specialized Methods', () => {
    it('should fetch records by cat', async () => {
      mockFetch.mockResolvedValueOnce(mockRecordsResponse);

      const { fetchRecordsByCat } = useExcretionRecords();
      await fetchRecordsByCat('cat1');

      expect(mockFetch).toHaveBeenCalledWith('/api/excretion-records', {
        query: { catId: 'cat1' },
      });
    });

    it('should fetch records by type', async () => {
      mockFetch.mockResolvedValueOnce(mockRecordsResponse);

      const { fetchRecordsByType } = useExcretionRecords();
      await fetchRecordsByType('URINE');

      expect(mockFetch).toHaveBeenCalledWith('/api/excretion-records', {
        query: { type: 'URINE' },
      });
    });

    it('should refresh data', async () => {
      const { fetchRecords, refresh } = useExcretionRecords();

      // Initial fetch
      mockFetch.mockResolvedValueOnce(mockRecordsResponse);
      await fetchRecords({ catId: 'cat1' });

      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce(mockRecordsResponse);

      // Refresh should use the same parameters
      await refresh();

      expect(mockFetch).toHaveBeenCalledWith('/api/excretion-records', {
        query: { catId: 'cat1' },
      });
    });
  });

  describe('Computed Properties', () => {
    it('should update computed properties based on state', () => {
      const { isLoading, hasError, isEmpty, canLoadMore } = useExcretionRecords();

      // Initial state
      expect(isLoading.value).toBe(false);
      expect(hasError.value).toBe(false);
      expect(isEmpty.value).toBe(true);
      expect(canLoadMore.value).toBe(false);
    });
  });
});
