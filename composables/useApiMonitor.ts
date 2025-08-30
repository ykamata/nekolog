interface ApiCall {
  id: string;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: string;
  cacheHit?: boolean;
  timestamp: Date;
}

interface ApiMonitorStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  cacheHitRate: number;
}

export const useApiMonitor = () => {
  const apiCalls = ref<ApiCall[]>([]);
  const isMonitoring = ref(false);
  const maxCallHistory = 100; // 最大保持するAPIコール履歴数

  const isDebugMode = computed(() => import.meta.dev);

  // 監視開始
  const startMonitoring = () => {
    if (!isDebugMode.value) return;
    isMonitoring.value = true;
  };

  // 監視停止
  const stopMonitoring = () => {
    isMonitoring.value = false;
  };

  // APIコール開始を記録
  const recordApiCallStart = (
    url: string,
    method: string = 'GET',
    requestHeaders?: Record<string, string>,
    requestBody?: any,
  ): string => {
    if (!isDebugMode.value || !isMonitoring.value) return '';

    const id = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiCall: ApiCall = {
      id,
      url,
      method: method.toUpperCase(),
      startTime: performance.now(),
      requestHeaders,
      requestBody,
      timestamp: new Date(),
    };

    apiCalls.value.unshift(apiCall);

    // 履歴数制限
    if (apiCalls.value.length > maxCallHistory) {
      apiCalls.value = apiCalls.value.slice(0, maxCallHistory);
    }

    return id;
  };

  // APIコール完了を記録
  const recordApiCallEnd = (
    id: string,
    status: number,
    statusText: string,
    responseHeaders?: Record<string, string>,
    responseBody?: any,
    cacheHit: boolean = false,
  ) => {
    if (!isDebugMode.value || !isMonitoring.value || !id) return;

    const callIndex = apiCalls.value.findIndex(call => call.id === id);
    if (callIndex === -1) return;

    const endTime = performance.now();
    const call = apiCalls.value[callIndex];
    if (!call) return;

    apiCalls.value[callIndex] = {
      ...call,
      endTime,
      duration: endTime - call.startTime,
      status,
      statusText,
      responseHeaders,
      responseBody,
      cacheHit,
    };
  };

  // APIコールエラーを記録
  const recordApiCallError = (id: string, error: string) => {
    if (!isDebugMode.value || !isMonitoring.value || !id) return;

    const callIndex = apiCalls.value.findIndex(call => call.id === id);
    if (callIndex === -1) return;

    const endTime = performance.now();
    const call = apiCalls.value[callIndex];
    if (!call) return;

    apiCalls.value[callIndex] = {
      ...call,
      endTime,
      duration: endTime - call.startTime,
      error,
      status: 0,
      statusText: 'Error',
    };
  };

  // 統計情報を計算
  const stats = computed((): ApiMonitorStats => {
    const calls = apiCalls.value.filter(call => call.endTime !== undefined);
    const totalCalls = calls.length;
    const successfulCalls = calls.filter(call =>
      call.status && call.status >= 200 && call.status < 400,
    ).length;
    const failedCalls = totalCalls - successfulCalls;

    const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const averageResponseTime = totalCalls > 0 ? totalDuration / totalCalls : 0;

    const cacheHits = calls.filter(call => call.cacheHit).length;
    const cacheHitRate = totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime,
      cacheHitRate,
    };
  });

  // 最近のAPIコール（完了したもののみ）
  const recentApiCalls = computed(() =>
    apiCalls.value
      .filter(call => call.endTime !== undefined)
      .slice(0, 20),
  );

  // 進行中のAPIコール
  const pendingApiCalls = computed(() =>
    apiCalls.value.filter(call => call.endTime === undefined),
  );

  // APIコール履歴をクリア
  const clearApiCallHistory = () => {
    apiCalls.value = [];
  };

  // APIコール履歴をエクスポート
  const exportApiCallHistory = () => {
    if (!isDebugMode.value) return;

    const exportData = {
      calls: apiCalls.value,
      stats: stats.value,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-monitor-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // $fetchラッパー（監視機能付き）
  const monitoredFetch = async <T>(
    url: string,
    options: any = {},
  ): Promise<T> => {
    const callId = recordApiCallStart(
      url,
      options.method || 'GET',
      options.headers,
      options.body,
    );

    try {
      const response = await $fetch<T>(url, options);

      recordApiCallEnd(
        callId,
        200, // $fetchは成功時のステータスコードを直接返さない
        'OK',
        {},
        response,
        false, // キャッシュヒットの判定は別途実装が必要
      );

      return response as T;
    }
    catch (error: any) {
      recordApiCallError(callId, error.message || 'Unknown error');
      throw error;
    }
  };

  // useFetchラッパー（監視機能付き）
  const monitoredUseFetch = <T>(
    url: string,
    options: any = {},
  ) => {
    const callId = recordApiCallStart(
      url,
      options.method || 'GET',
      options.headers,
      options.body,
    );

    const result = useFetch<T>(url, {
      ...options,
      onResponse({ response }) {
        recordApiCallEnd(
          callId,
          response.status,
          response.statusText,
          Object.fromEntries(response.headers.entries()),
          response._data,
          false, // キャッシュヒットの判定
        );
      },
      onResponseError({ error }) {
        recordApiCallError(callId, error?.message || 'Response error');
      },
      onRequestError({ error }) {
        recordApiCallError(callId, error.message || 'Request error');
      },
    });

    return result;
  };

  return {
    apiCalls: readonly(apiCalls),
    recentApiCalls,
    pendingApiCalls,
    stats,
    isMonitoring: readonly(isMonitoring),
    isDebugMode,
    startMonitoring,
    stopMonitoring,
    recordApiCallStart,
    recordApiCallEnd,
    recordApiCallError,
    clearApiCallHistory,
    exportApiCallHistory,
    monitoredFetch,
    monitoredUseFetch,
  };
};
