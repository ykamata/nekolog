import { OfflineStorage } from '~/utils/offline-storage';
import type { Cat, Food, MealRecord } from '~/types/cat-meal';
import type {
  Medication,
  MedicationRecord,
  MedicationSchedule,
  MedicationReminder,
} from '~/types/medication';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  error: string | null;
}

/**
 * オフライン対応とデータ参照を管理するコンポーザブル
 * 注意: オフライン時は参照のみ可能で、登録・更新・削除はできません
 */
export const useSync = () => {
  const offlineStorage = OfflineStorage.getInstance();

  // リアクティブな同期状態
  const syncStatus = ref<SyncStatus>({
    isOnline: true,
    lastSync: null,
    error: null,
  });

  // オンライン状態の監視
  const updateOnlineStatus = () => {
    // サーバーサイドでは navigator が利用できないため、デフォルトでオンラインとする
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      syncStatus.value.isOnline = true;
      return;
    }
    syncStatus.value.isOnline = navigator.onLine;
  };

  // ページ読み込み時とオンライン状態変更時の処理（クライアントサイドのみ）
  if (import.meta.client) {
    onMounted(() => {
      updateOnlineStatus();
      syncStatus.value.lastSync = offlineStorage.getLastSyncTime();

      // オンライン状態の変更を監視
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // 定期的なデータ更新（5分間隔）
      const updateInterval = setInterval(() => {
        if (syncStatus.value.isOnline) {
          fetchAndUpdateLocalData();
        }
      }, 5 * 60 * 1000);

      // クリーンアップ
      onUnmounted(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(updateInterval);
      });
    });
  }

  /**
   * オンライン復帰時の処理
   */
  const handleOnline = async () => {
    updateOnlineStatus();
    // サーバーデータでローカルストレージを更新
    await fetchAndUpdateLocalData();
  };

  /**
   * オフライン時の処理
   */
  const handleOffline = () => {
    updateOnlineStatus();
  };

  /**
   * サーバーからデータを取得してローカルストレージを更新
   */
  const fetchAndUpdateLocalData = async (): Promise<void> => {
    try {
      // 並列でデータを取得
      const [
        catsResponse,
        foodsResponse,
        mealsResponse,
        medicationsResponse,
        medicationRecordsResponse,
        medicationSchedulesResponse,
        medicationRemindersResponse,
      ] = await Promise.all([
        $fetch<Cat[]>('/api/cats'),
        $fetch<Food[]>('/api/foods'),
        $fetch<{ mealRecords: MealRecord[] }>('/api/meals'),
        $fetch<{ medications: Medication[] }>('/api/medications'),
        $fetch<{ records: MedicationRecord[] }>('/api/medication-records'),
        $fetch<{ schedules: MedicationSchedule[] }>('/api/medication-schedules'),
        $fetch<{ reminders: MedicationReminder[] }>('/api/medication-reminders'),
      ]);

      // ローカルストレージを更新
      offlineStorage.updateFromServer(
        catsResponse,
        foodsResponse,
        mealsResponse.mealRecords,
        medicationsResponse.medications,
        medicationRecordsResponse.records,
        medicationSchedulesResponse.schedules,
        medicationRemindersResponse.reminders,
      );

      syncStatus.value.lastSync = offlineStorage.getLastSyncTime();
      syncStatus.value.error = null;
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch server data';
      syncStatus.value.error = errorMessage;
      console.error('Failed to fetch server data:', error);
      throw error;
    }
  };

  /**
   * オフラインデータの取得（参照のみ）
   */
  const getOfflineData = () => {
    return {
      cats: offlineStorage.getCats(),
      foods: offlineStorage.getFoods(),
      meals: offlineStorage.getMeals(),
      medications: offlineStorage.getMedications(),
      medicationRecords: offlineStorage.getMedicationRecords(),
      medicationSchedules: offlineStorage.getMedicationSchedules(),
      medicationReminders: offlineStorage.getMedicationReminders(),
    };
  };

  return {
    syncStatus: readonly(syncStatus),
    fetchAndUpdateLocalData,
    getOfflineData,
  };
};
