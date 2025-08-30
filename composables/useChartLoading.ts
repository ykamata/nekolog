/**
 * チャートローディング状態管理用composable
 * Requirements: 4.1, 4.2 - スムーズなローディング遷移とプログレス表示
 */

export interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number;
  startTime?: number;
}

export interface LoadingState {
  isLoading: Ref<boolean>;
  loadingType: Ref<'skeleton' | 'progress' | 'spinner' | 'dots'>;
  progress: Ref<number>;
  currentStep: Ref<string | null>;
  steps: Ref<LoadingStep[]>;
  error: Ref<string | null>;
}

export interface LoadingActions {
  startLoading: (type?: 'skeleton' | 'progress' | 'spinner' | 'dots') => void;
  stopLoading: () => void;
  setProgress: (value: number) => void;
  addStep: (step: Omit<LoadingStep, 'status'>) => void;
  updateStep: (id: string, status: LoadingStep['status']) => void;
  completeStep: (id: string) => void;
  setError: (message: string) => void;
  clearError: () => void;
  reset: () => void;
  setupDefaultSteps: () => void;
  selectLoadingType: (dataSize: number) => 'skeleton' | 'progress' | 'spinner' | 'dots';
  getEstimatedTime: () => number | null;
}

export interface UseChartLoadingReturn extends LoadingState, LoadingActions {}

/**
 * チャートローディング状態管理
 */
export function useChartLoading(): UseChartLoadingReturn {
  // 状態管理
  const isLoading = ref(false);
  const loadingType = ref<'skeleton' | 'progress' | 'spinner' | 'dots'>('skeleton');
  const progress = ref(0);
  const currentStep = ref<string | null>(null);
  const steps = ref<LoadingStep[]>([]);
  const error = ref<string | null>(null);

  // 内部状態
  const startTime = ref<number | null>(null);
  const progressInterval = ref<NodeJS.Timeout | null>(null);

  /**
   * ローディングを開始
   */
  const startLoading = (type: 'skeleton' | 'progress' | 'spinner' | 'dots' = 'skeleton'): void => {
    console.log('チャートローディング開始:', type);

    isLoading.value = true;
    loadingType.value = type;
    progress.value = 0;
    currentStep.value = null;
    error.value = null;
    startTime.value = Date.now();

    // プログレスタイプの場合は自動進行を開始
    if (type === 'progress') {
      startAutoProgress();
    }
  };

  /**
   * ローディングを停止
   */
  const stopLoading = (): void => {
    console.log('チャートローディング停止');

    isLoading.value = false;
    progress.value = 100;
    currentStep.value = null;

    // 自動進行を停止
    if (progressInterval.value) {
      clearInterval(progressInterval.value);
      progressInterval.value = null;
    }

    // 完了していないステップを完了状態にする
    steps.value.forEach((step) => {
      if (step.status !== 'completed') {
        step.status = 'completed';
        if (step.startTime) {
          step.duration = Date.now() - step.startTime;
        }
      }
    });

    // 少し遅延してからリセット
    setTimeout(() => {
      if (!isLoading.value) {
        reset();
      }
    }, 1000);
  };

  /**
   * プログレス値を設定
   */
  const setProgress = (value: number): void => {
    progress.value = Math.max(0, Math.min(100, value));
  };

  /**
   * ステップを追加
   */
  const addStep = (step: Omit<LoadingStep, 'status'>): void => {
    const newStep: LoadingStep = {
      ...step,
      status: 'pending',
    };
    steps.value.push(newStep);
    console.log('ローディングステップ追加:', newStep);
  };

  /**
   * ステップの状態を更新
   */
  const updateStep = (id: string, status: LoadingStep['status']): void => {
    const step = steps.value.find(s => s.id === id);
    if (step) {
      const oldStatus = step.status;
      step.status = status;

      if (status === 'active') {
        currentStep.value = id;
        step.startTime = Date.now();
      }
      else if (status === 'completed' && step.startTime) {
        step.duration = Date.now() - step.startTime;

        // 次のステップをアクティブにする
        const currentIndex = steps.value.findIndex(s => s.id === id);
        const nextStep = steps.value[currentIndex + 1];
        if (nextStep && nextStep.status === 'pending') {
          nextStep.status = 'active';
          currentStep.value = nextStep.id;
          nextStep.startTime = Date.now();
        }
        else {
          currentStep.value = null;
        }
      }

      console.log('ローディングステップ更新:', { id, oldStatus, newStatus: status });

      // プログレス値を自動計算
      updateProgressFromSteps();
    }
  };

  /**
   * ステップを完了
   */
  const completeStep = (id: string): void => {
    updateStep(id, 'completed');
  };

  /**
   * エラーを設定
   */
  const setError = (message: string): void => {
    error.value = message;
    isLoading.value = false;

    // 自動進行を停止
    if (progressInterval.value) {
      clearInterval(progressInterval.value);
      progressInterval.value = null;
    }

    console.error('チャートローディングエラー:', message);
  };

  /**
   * エラーをクリア
   */
  const clearError = (): void => {
    error.value = null;
  };

  /**
   * 状態をリセット
   */
  const reset = (): void => {
    isLoading.value = false;
    loadingType.value = 'skeleton';
    progress.value = 0;
    currentStep.value = null;
    steps.value = [];
    error.value = null;
    startTime.value = null;

    if (progressInterval.value) {
      clearInterval(progressInterval.value);
      progressInterval.value = null;
    }

    console.log('チャートローディング状態リセット');
  };

  /**
   * ステップからプログレス値を自動計算
   */
  const updateProgressFromSteps = (): void => {
    if (steps.value.length === 0) return;

    const completedSteps = steps.value.filter(s => s.status === 'completed').length;
    const activeSteps = steps.value.filter(s => s.status === 'active').length;

    // 完了したステップ + アクティブなステップの半分
    const progressValue = ((completedSteps + activeSteps * 0.5) / steps.value.length) * 100;
    setProgress(progressValue);
  };

  /**
   * 自動プログレス進行を開始
   */
  const startAutoProgress = (): void => {
    if (progressInterval.value) {
      clearInterval(progressInterval.value);
    }

    // ステップが定義されていない場合は単純な自動進行
    if (steps.value.length === 0) {
      progressInterval.value = setInterval(() => {
        if (progress.value < 90) {
          // 90%まで徐々に進行（実際の処理完了を待つため）
          const increment = Math.random() * 5 + 1;
          setProgress(progress.value + increment);
        }
      }, 200);
    }
  };

  /**
   * 標準的なチャートローディングステップを設定
   */
  const setupDefaultSteps = (): void => {
    const defaultSteps = [
      { id: 'cache-check', label: 'キャッシュを確認中...' },
      { id: 'data-fetch', label: 'データを取得中...' },
      { id: 'data-process', label: 'データを処理中...' },
      { id: 'chart-init', label: 'チャートを初期化中...' },
      { id: 'chart-render', label: 'チャートを描画中...' },
    ];

    steps.value = defaultSteps.map(step => ({
      ...step,
      status: 'pending' as const,
    }));

    // 最初のステップをアクティブにする
    if (steps.value.length > 0 && steps.value[0]) {
      updateStep(steps.value[0].id, 'active');
    }
  };

  /**
   * データサイズに基づいてローディングタイプを自動選択
   */
  const selectLoadingType = (dataPoints: number): 'skeleton' | 'progress' | 'spinner' | 'dots' => {
    if (dataPoints > 1000) {
      return 'progress'; // 大量データの場合は詳細なプログレス表示
    }
    else if (dataPoints > 100) {
      return 'skeleton'; // 中程度のデータはスケルトン表示
    }
    else if (dataPoints > 10) {
      return 'spinner'; // 少量データはシンプルなスピナー
    }
    else {
      return 'dots'; // 最小データはドット表示
    }
  };

  /**
   * 推定完了時間を計算
   */
  const getEstimatedTime = (): number | null => {
    if (!startTime.value || steps.value.length === 0) return null;

    const completedSteps = steps.value.filter(s => s.status === 'completed');
    if (completedSteps.length === 0) return null;

    const averageStepTime = completedSteps.reduce((sum, step) => {
      return sum + (step.duration || 0);
    }, 0) / completedSteps.length;

    const remainingSteps = steps.value.filter(s => s.status !== 'completed').length;
    return remainingSteps * averageStepTime;
  };

  // コンポーネントがアンマウントされる際のクリーンアップ
  try {
    if (getCurrentInstance()) {
      onUnmounted(() => {
        if (progressInterval.value) {
          clearInterval(progressInterval.value);
        }
      });
    }
  }
  catch (err) {
    // テスト環境などでgetCurrentInstanceが利用できない場合は無視
  }

  return {
    // State
    isLoading: readonly(isLoading),
    loadingType,
    progress,
    currentStep,
    steps,
    error,

    // Actions
    startLoading,
    stopLoading,
    setProgress,
    addStep,
    updateStep,
    completeStep,
    setError,
    clearError,
    reset,

    // Utility methods
    setupDefaultSteps,
    selectLoadingType,
    getEstimatedTime,
  };
}
