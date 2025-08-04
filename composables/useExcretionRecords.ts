import type { ExcretionRecord, ExcretionRecordInput, ExcretionRecordFilter, ExcretionRecordsResponse, ExcretionCalendarResponse } from '~/types/excretion';
import { performanceMonitor } from '~/utils/performance-monitor';

export const useExcretionRecords = () => {
  // State
  const records = ref<ExcretionRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const hasMore = ref(false);
  const lastParams = ref<ExcretionRecordFilter>({});

  // Computed
  const isEmpty = computed(() => records.value.length === 0);
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => !!error.value);
  const canLoadMore = computed(() => hasMore.value && !loading.value);

  // Methods
  const clearError = () => {
    error.value = null;
  };

  const reset = () => {
    records.value = [];
    loading.value = false;
    error.value = null;
    total.value = 0;
    hasMore.value = false;
    lastParams.value = {};
  };

  const fetchRecords = async (params: ExcretionRecordFilter = {}) => {
    loading.value = true;
    error.value = null;
    lastParams.value = params;

    try {
      const response = await performanceMonitor.measureApiCall(
        'fetchExcretionRecords',
        async () => {
          return await $fetch<ExcretionRecordsResponse>('/api/excretion-records', {
            query: params,
          });
        },
        { params },
      );

      records.value = response.records;
      total.value = response.total;
      hasMore.value = response.hasMore;

      return response;
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'データの取得に失敗しました';
      error.value = message;
      throw new Error(message);
    }
    finally {
      loading.value = false;
    }
  };

  const loadMore = async () => {
    if (!hasMore.value || loading.value) return;

    loading.value = true;

    try {
      const params = {
        ...lastParams.value,
        offset: records.value.length,
      };

      const response = await performanceMonitor.measureApiCall(
        'loadMoreExcretionRecords',
        async () => {
          return await $fetch<ExcretionRecordsResponse>('/api/excretion-records', {
            query: params,
          });
        },
        { params },
      );

      records.value.push(...response.records);
      total.value = response.total;
      hasMore.value = response.hasMore;

      return response;
    }
    catch (err) {
      const message = err instanceof Error ? err.message : '追加データの取得に失敗しました';
      error.value = message;
      throw new Error(message);
    }
    finally {
      loading.value = false;
    }
  };

  const createRecord = async (data: ExcretionRecordInput): Promise<ExcretionRecord> => {
    try {
      const response = await performanceMonitor.measureApiCall(
        'createExcretionRecord',
        async () => {
          return await $fetch<{ record: ExcretionRecord }>('/api/excretion-records', {
            method: 'POST',
            body: data,
          });
        },
        { data },
      );

      // Add to the beginning of the list
      records.value.unshift(response.record);
      total.value += 1;

      return response.record;
    }
    catch (err) {
      const message = err instanceof Error ? err.message : '記録の作成に失敗しました';
      error.value = message;
      throw new Error(message);
    }
  };

  const updateRecord = async (id: string, data: Partial<ExcretionRecordInput>): Promise<ExcretionRecord> => {
    try {
      const response = await performanceMonitor.measureApiCall(
        'updateExcretionRecord',
        async () => {
          return await $fetch<{ record: ExcretionRecord }>(`/api/excretion-records/${id}`, {
            method: 'PUT',
            body: data,
          });
        },
        { id, data },
      );

      // Update the record in the list
      const index = records.value.findIndex(r => r.id === id);
      if (index !== -1) {
        records.value[index] = response.record;
      }

      return response.record;
    }
    catch (err) {
      const message = err instanceof Error ? err.message : '記録の更新に失敗しました';
      error.value = message;
      throw new Error(message);
    }
  };

  const deleteRecord = async (id: string): Promise<void> => {
    try {
      await performanceMonitor.measureApiCall(
        'deleteExcretionRecord',
        async () => {
          return await $fetch<void>(`/api/excretion-records/${id}`, {
            method: 'DELETE',
          });
        },
        { id },
      );

      // Remove from the list
      const index = records.value.findIndex(r => r.id === id);
      if (index !== -1) {
        records.value.splice(index, 1);
        total.value -= 1;
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : '記録の削除に失敗しました';
      error.value = message;
      throw new Error(message);
    }
  };

  const fetchRecordsByCat = async (catId: string) => {
    return await fetchRecords({ catId });
  };

  const fetchRecordsByType = async (type: string) => {
    return await fetchRecords({ type: type as any });
  };

  const fetchCalendarData = async (params: ExcretionRecordFilter = {}): Promise<ExcretionCalendarResponse> => {
    try {
      const response = await performanceMonitor.measureApiCall(
        'fetchExcretionCalendarData',
        async () => {
          return await $fetch<ExcretionCalendarResponse>('/api/excretion-records/calendar', {
            query: params,
          });
        },
        { params },
      );

      return response;
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'カレンダーデータの取得に失敗しました';
      error.value = message;
      throw new Error(message);
    }
  };

  const refresh = async () => {
    return await fetchRecords(lastParams.value);
  };

  return {
    // State
    records: readonly(records),
    loading: readonly(loading),
    error: readonly(error),
    total: readonly(total),
    hasMore: readonly(hasMore),

    // Computed
    isEmpty,
    isLoading,
    hasError,
    canLoadMore,

    // Methods
    fetchRecords,
    loadMore,
    createRecord,
    updateRecord,
    deleteRecord,
    fetchRecordsByCat,
    fetchRecordsByType,
    fetchCalendarData,
    refresh,
    clearError,
    reset,
  };
};
