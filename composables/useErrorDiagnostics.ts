interface ErrorLog {
  id: string;
  type: ErrorType;
  category: ErrorCategory;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
  resolved?: boolean;
  suggestions?: string[];
}

type ErrorType
  = | 'chart_init_failed'
    | 'chart_render_failed'
    | 'data_fetch_failed'
    | 'data_processing_failed'
    | 'canvas_not_found'
    | 'memory_leak'
    | 'performance_degradation'
    | 'network_error'
    | 'validation_error'
    | 'unknown_error';

type ErrorCategory
  = | 'critical'
    | 'warning'
    | 'info';

interface ErrorPattern {
  pattern: RegExp;
  type: ErrorType;
  category: ErrorCategory;
  suggestions: string[];
}

interface DiagnosticInfo {
  browserInfo: {
    userAgent: string;
    vendor: string;
    language: string;
    cookieEnabled: boolean;
    onLine: boolean;
  };
  screenInfo: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  memoryInfo?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  performanceInfo: {
    navigation: any;
    timing: any;
  };
}

export const useErrorDiagnostics = () => {
  const errorLogs = ref<ErrorLog[]>([]);
  const maxErrorLogs = 50;
  const isDebugMode = computed(() => import.meta.dev);

  // エラーパターンの定義
  const errorPatterns: ErrorPattern[] = [
    {
      pattern: /canvas/i,
      type: 'canvas_not_found',
      category: 'critical',
      suggestions: [
        'Canvas要素が正しく作成されているか確認してください',
        'DOM要素のマウント順序を確認してください',
        'Chart.jsの初期化タイミングを見直してください',
      ],
    },
    {
      pattern: /chart.*not.*defined|chart.*undefined/i,
      type: 'chart_init_failed',
      category: 'critical',
      suggestions: [
        'Chart.jsライブラリが正しく読み込まれているか確認してください',
        'Chart.jsのバージョン互換性を確認してください',
        'インポート文を確認してください',
      ],
    },
    {
      pattern: /network|fetch|xhr|ajax/i,
      type: 'network_error',
      category: 'warning',
      suggestions: [
        'ネットワーク接続を確認してください',
        'APIエンドポイントが正しいか確認してください',
        'CORS設定を確認してください',
        'サーバーの状態を確認してください',
      ],
    },
    {
      pattern: /memory|heap/i,
      type: 'memory_leak',
      category: 'warning',
      suggestions: [
        'Chart.jsインスタンスが適切に破棄されているか確認してください',
        'イベントリスナーが適切に削除されているか確認してください',
        'データの参照が適切に解放されているか確認してください',
      ],
    },
    {
      pattern: /validation|invalid|schema/i,
      type: 'validation_error',
      category: 'info',
      suggestions: [
        '入力データの形式を確認してください',
        'Zodスキーマの定義を確認してください',
        'APIレスポンスの構造を確認してください',
      ],
    },
  ];

  // エラーを分類
  const classifyError = (error: Error | string): { type: ErrorType; category: ErrorCategory; suggestions: string[] } => {
    const message = typeof error === 'string' ? error : error.message;

    for (const pattern of errorPatterns) {
      if (pattern.pattern.test(message)) {
        return {
          type: pattern.type,
          category: pattern.category,
          suggestions: pattern.suggestions,
        };
      }
    }

    return {
      type: 'unknown_error',
      category: 'warning',
      suggestions: [
        'エラーの詳細を確認してください',
        'ブラウザのコンソールでより詳しい情報を確認してください',
        'ページを再読み込みしてみてください',
      ],
    };
  };

  // システム診断情報を取得
  const getDiagnosticInfo = (): DiagnosticInfo => {
    const info: DiagnosticInfo = {
      browserInfo: {
        userAgent: '',
        vendor: '',
        language: '',
        cookieEnabled: false,
        onLine: false,
      },
      screenInfo: {
        width: 0,
        height: 0,
        colorDepth: 0,
        pixelRatio: 1,
      },
      performanceInfo: {
        navigation: null,
        timing: null,
      },
    };

    if (import.meta.client) {
      info.browserInfo = {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      };

      info.screenInfo = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
      };

      // @ts-ignore - performance.memory is not in all browsers
      if (performance.memory) {
        // @ts-ignore
        info.memoryInfo = {
          // @ts-ignore
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          // @ts-ignore
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          // @ts-ignore
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };
      }

      if (performance.navigation && performance.timing) {
        info.performanceInfo = {
          navigation: performance.navigation,
          timing: performance.timing,
        };
      }
    }

    return info;
  };

  // エラーをログに記録
  const logError = (
    error: Error | string,
    context?: Record<string, any>,
  ): string => {
    if (!isDebugMode.value) return '';

    const { type, category, suggestions } = classifyError(error);
    const diagnosticInfo = getDiagnosticInfo();

    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      category,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      timestamp: new Date(),
      context: {
        ...context,
        diagnostic: diagnosticInfo,
      },
      userAgent: diagnosticInfo.browserInfo.userAgent,
      url: import.meta.client ? window.location.href : '',
      resolved: false,
      suggestions,
    };

    errorLogs.value.unshift(errorLog);

    // ログ数制限
    if (errorLogs.value.length > maxErrorLogs) {
      errorLogs.value = errorLogs.value.slice(0, maxErrorLogs);
    }

    // コンソールにも出力
    console.error(`[ErrorDiagnostics] ${type}:`, error, context);

    return errorLog.id;
  };

  // エラーを解決済みにマーク
  const markErrorResolved = (errorId: string) => {
    const errorIndex = errorLogs.value.findIndex(log => log.id === errorId);
    if (errorIndex !== -1 && errorLogs.value[errorIndex]) {
      errorLogs.value[errorIndex].resolved = true;
    }
  };

  // エラー統計を計算
  const errorStats = computed(() => {
    const total = errorLogs.value.length;
    const critical = errorLogs.value.filter(log => log.category === 'critical').length;
    const warnings = errorLogs.value.filter(log => log.category === 'warning').length;
    const info = errorLogs.value.filter(log => log.category === 'info').length;
    const resolved = errorLogs.value.filter(log => log.resolved).length;
    const unresolved = total - resolved;

    return {
      total,
      critical,
      warnings,
      info,
      resolved,
      unresolved,
    };
  });

  // 最近のエラー（未解決のもの優先）
  const recentErrors = computed(() =>
    errorLogs.value
      .sort((a, b) => {
        if (a.resolved !== b.resolved) {
          return a.resolved ? 1 : -1; // 未解決を優先
        }
        return b.timestamp.getTime() - a.timestamp.getTime(); // 新しい順
      })
      .slice(0, 10),
  );

  // 重要なエラー（クリティカルな未解決エラー）
  const criticalErrors = computed(() =>
    errorLogs.value.filter(log =>
      log.category === 'critical' && !log.resolved,
    ),
  );

  // エラーログをクリア
  const clearErrorLogs = () => {
    errorLogs.value = [];
  };

  // エラーログをエクスポート
  const exportErrorLogs = () => {
    if (!isDebugMode.value) return;

    const exportData = {
      errors: errorLogs.value,
      stats: errorStats.value,
      diagnosticInfo: getDiagnosticInfo(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // グローバルエラーハンドラーを設定
  const setupGlobalErrorHandler = () => {
    if (!import.meta.client || !isDebugMode.value) return;

    // JavaScript エラー
    window.addEventListener('error', (event) => {
      logError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error',
      });
    });

    // Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      logError(event.reason, {
        type: 'unhandled_promise_rejection',
      });
    });
  };

  // トラブルシューティングガイドを取得
  const getTroubleshootingGuide = (errorType: ErrorType): string[] => {
    const guides: Record<ErrorType, string[]> = {
      chart_init_failed: [
        '1. Chart.jsライブラリが正しく読み込まれているか確認',
        '2. Canvas要素がDOMに存在するか確認',
        '3. Chart.jsのバージョン互換性を確認',
        '4. ブラウザのコンソールでエラー詳細を確認',
      ],
      chart_render_failed: [
        '1. データ形式がChart.jsの仕様に合っているか確認',
        '2. Canvas要素のサイズが適切か確認',
        '3. メモリ不足でないか確認',
        '4. 他のChart.jsインスタンスとの競合がないか確認',
      ],
      data_fetch_failed: [
        '1. ネットワーク接続を確認',
        '2. APIエンドポイントのURLを確認',
        '3. サーバーの応答状況を確認',
        '4. CORS設定を確認',
      ],
      data_processing_failed: [
        '1. APIレスポンスの形式を確認',
        '2. データ変換ロジックを確認',
        '3. 空データや異常値の処理を確認',
        '4. メモリ使用量を確認',
      ],
      canvas_not_found: [
        '1. Canvas要素のIDが正しいか確認',
        '2. DOM要素のマウント順序を確認',
        '3. Vue.jsのライフサイクルを確認',
        '4. 条件付きレンダリングの影響を確認',
      ],
      memory_leak: [
        '1. Chart.jsインスタンスの適切な破棄を確認',
        '2. イベントリスナーの削除を確認',
        '3. データ参照の解放を確認',
        '4. ブラウザのメモリ使用量を監視',
      ],
      performance_degradation: [
        '1. データ量を確認し、必要に応じて制限',
        '2. アニメーションの無効化を検討',
        '3. データの事前処理を最適化',
        '4. Chart.jsの設定を見直し',
      ],
      network_error: [
        '1. インターネット接続を確認',
        '2. プロキシ設定を確認',
        '3. ファイアウォール設定を確認',
        '4. サーバーの稼働状況を確認',
      ],
      validation_error: [
        '1. 入力データの形式を確認',
        '2. 必須フィールドの存在を確認',
        '3. データ型の一致を確認',
        '4. バリデーションルールを見直し',
      ],
      unknown_error: [
        '1. ブラウザのコンソールで詳細を確認',
        '2. ページを再読み込み',
        '3. ブラウザのキャッシュをクリア',
        '4. 別のブラウザで動作確認',
      ],
    };

    return guides[errorType] || guides.unknown_error;
  };

  return {
    errorLogs: readonly(errorLogs),
    errorStats,
    recentErrors,
    criticalErrors,
    isDebugMode,
    logError,
    markErrorResolved,
    clearErrorLogs,
    exportErrorLogs,
    setupGlobalErrorHandler,
    getTroubleshootingGuide,
    getDiagnosticInfo,
  };
};
