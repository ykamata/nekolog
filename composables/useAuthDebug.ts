/**
 * 認証プロセスのデバッグ情報を記録するためのユーティリティ（開発環境のみ）
 */

interface AuthDebugLogEntry {
  timestamp: string;
  context: string;
  step: string;
  data: Record<string, unknown>;
  duration?: number;
}

interface AuthProcessStep {
  name: string;
  startTime: number;
  endTime?: number;
  success?: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

// 認証プロセスの追跡用グローバル状態
const authProcessTracker = {
  currentProcess: null as string | null,
  steps: new Map<string, AuthProcessStep[]>(),
  sessionLogs: [] as AuthDebugLogEntry[],
};

export const useAuthDebug = () => {
  /**
   * 認証プロセスの開始を記録
   */
  const startAuthProcess = (processName: string): string => {
    if (process.env.NODE_ENV !== 'development') return processName;

    const processId = `${processName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    authProcessTracker.currentProcess = processId;
    authProcessTracker.steps.set(processId, []);

    logAuthProcess(processId, 'PROCESS_START', processName, {
      processId,
      processName,
    });

    return processId;
  };

  /**
   * 認証プロセスのステップを記録
   */
  const logAuthStep = (
    processId: string,
    stepName: string,
    data?: Record<string, unknown>,
    success?: boolean,
    error?: string,
  ) => {
    if (process.env.NODE_ENV !== 'development') return;

    const steps = authProcessTracker.steps.get(processId) || [];
    const existingStep = steps.find(step => step.name === stepName && !step.endTime);

    if (existingStep) {
      // 既存のステップを完了
      existingStep.endTime = Date.now();
      existingStep.success = success;
      existingStep.error = error;
      existingStep.data = { ...existingStep.data, ...data };
    }
    else {
      // 新しいステップを開始
      steps.push({
        name: stepName,
        startTime: Date.now(),
        success,
        error,
        data,
      });
    }

    authProcessTracker.steps.set(processId, steps);

    logAuthProcess(processId, 'STEP', stepName, {
      stepName,
      success,
      error,
      ...data,
    });
  };

  /**
   * 認証プロセスの完了を記録
   */
  const endAuthProcess = (processId: string, success: boolean, finalData?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'development') return;

    const steps = authProcessTracker.steps.get(processId) || [];
    const totalDuration = steps.length > 0 && steps[0] && steps[steps.length - 1]
      ? (steps[steps.length - 1]!.endTime || Date.now()) - steps[0]!.startTime
      : 0;

    logAuthProcess(processId, 'PROCESS_END', success ? 'SUCCESS' : 'FAILURE', {
      processId,
      success,
      totalDuration,
      stepCount: steps.length,
      steps: steps.map(step => ({
        name: step.name,
        duration: step.endTime ? step.endTime - step.startTime : 'ongoing',
        success: step.success,
        error: step.error,
      })),
      ...finalData,
    });

    // プロセス完了後はクリーンアップ
    if (authProcessTracker.currentProcess === processId) {
      authProcessTracker.currentProcess = null;
    }
  };

  /**
   * 認証状態の変更を記録
   */
  const logAuthState = (context: string, additionalData?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'development') return;

    try {
      let logData: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        context,
        ...additionalData,
      };

      // Nuxtコンテキスト内でのみクッキーにアクセス
      if (import.meta.client && typeof window !== 'undefined') {
        try {
          const accessToken = useCookie('access-token');
          const refreshToken = useCookie('refresh-token');

          logData = {
            ...logData,
            hasAccessToken: !!accessToken.value,
            hasRefreshToken: !!refreshToken.value,
            accessTokenLength: accessToken.value?.length || 0,
            refreshTokenLength: refreshToken.value?.length || 0,
          };
        }
        catch (cookieError) {
          logData.cookieError = 'Failed to access cookies';
        }

        // 永続化状態も確認
        try {
          const { hasValidPersistedAuth } = useAuthPersistence();
          logData.hasPersistedAuth = hasValidPersistedAuth();
        }
        catch (persistenceError) {
          logData.persistenceError = 'Failed to check persisted auth';
        }
      }
      else {
        logData.context = 'server-side or outside nuxt context';
      }

      // セッションログに追加
      const logEntry: AuthDebugLogEntry = {
        timestamp: new Date().toISOString(),
        context,
        step: 'STATE_CHANGE',
        data: logData,
      };
      authProcessTracker.sessionLogs.push(logEntry);

      // ログ数制限（メモリリーク防止）
      if (authProcessTracker.sessionLogs.length > 100) {
        authProcessTracker.sessionLogs = authProcessTracker.sessionLogs.slice(-50);
      }

      console.log(`[AUTH DEBUG] ${context}:`, logData);
    }
    catch (error) {
      // エラーが発生した場合は基本情報のみログ
      console.log(`[AUTH DEBUG] ${context}:`, {
        timestamp: new Date().toISOString(),
        error: 'Failed to log auth state',
        errorMessage: error instanceof Error ? error.message : String(error),
        ...additionalData,
      });
    }
  };

  /**
   * 認証プロセスの詳細ログを出力
   */
  const logAuthProcess = (
    processId: string,
    logType: 'PROCESS_START' | 'STEP' | 'PROCESS_END',
    stepName: string,
    data: Record<string, unknown>,
  ) => {
    if (process.env.NODE_ENV !== 'development') return;

    const timestamp = new Date().toISOString();
    const logEntry: AuthDebugLogEntry = {
      timestamp,
      context: processId,
      step: stepName,
      data,
    };

    // セッションログに追加
    authProcessTracker.sessionLogs.push(logEntry);

    // コンソールに出力
    const logPrefix = `[AUTH PROCESS] ${logType}`;
    console.log(`${logPrefix} [${timestamp}] ${processId} - ${stepName}:`, data);
  };

  /**
   * 認証エラーの詳細ログを記録
   */
  const logAuthError = (
    error: unknown,
    context: string,
    additionalData?: Record<string, unknown>,
  ) => {
    if (process.env.NODE_ENV !== 'development') return;

    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      ...additionalData,
    };

    // セッションログに追加
    const logEntry: AuthDebugLogEntry = {
      timestamp,
      context,
      step: 'ERROR',
      data: errorInfo,
    };
    authProcessTracker.sessionLogs.push(logEntry);

    console.error(`[AUTH ERROR] ${context}:`, errorInfo);

    // 現在のプロセスがある場合はエラーを記録
    if (authProcessTracker.currentProcess) {
      logAuthStep(
        authProcessTracker.currentProcess,
        `ERROR_${context}`,
        errorInfo,
        false,
        errorInfo.errorMessage,
      );
    }
  };

  /**
   * 認証セッションの統計情報を取得
   */
  const getAuthSessionStats = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    const logs = authProcessTracker.sessionLogs;
    const processes = Array.from(authProcessTracker.steps.entries());

    return {
      totalLogs: logs.length,
      totalProcesses: processes.length,
      recentLogs: logs.slice(-10),
      processStats: processes.map(([processId, steps]) => ({
        processId,
        stepCount: steps.length,
        totalDuration: steps.length > 0 && steps[0] && steps[steps.length - 1] && steps[steps.length - 1]!.endTime
          ? steps[steps.length - 1]!.endTime! - steps[0]!.startTime
          : null,
        success: steps.every(step => step.success !== false),
        errors: steps.filter(step => step.error).map(step => step.error),
      })),
    };
  };

  /**
   * 認証デバッグログをクリア
   */
  const clearAuthDebugLogs = () => {
    if (process.env.NODE_ENV !== 'development') return;

    authProcessTracker.sessionLogs = [];
    authProcessTracker.steps.clear();
    authProcessTracker.currentProcess = null;

    console.log('[AUTH DEBUG] ログをクリアしました');
  };

  /**
   * 認証デバッグ情報をエクスポート（トラブルシューティング用）
   */
  const exportAuthDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    const debugInfo = {
      timestamp: new Date().toISOString(),
      sessionStats: getAuthSessionStats(),
      currentProcess: authProcessTracker.currentProcess,
      allLogs: authProcessTracker.sessionLogs,
      allProcesses: Object.fromEntries(authProcessTracker.steps),
    };

    return debugInfo;
  };

  return {
    // 既存の機能
    logAuthState,

    // 新しいプロセス追跡機能
    startAuthProcess,
    logAuthStep,
    endAuthProcess,
    logAuthError,

    // 統計・管理機能
    getAuthSessionStats,
    clearAuthDebugLogs,
    exportAuthDebugInfo,
  };
};
