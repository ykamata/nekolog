import { OfflineStorage, type SyncConflict } from '~/utils/offline-storage';
import type { Cat, Food, MealRecord } from '~/types/cat-meal';
import type {
  Medication,
  MedicationRecord,
  MedicationSchedule,
  MedicationReminder,
} from '~/types/medication';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingCount: number;
  conflicts: SyncConflict[];
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  error?: string;
  syncedCount: number;
}

/**
 * オフライン対応とデータ同期を管理するコンポーザブル
 */
export const useSync = () => {
  const offlineStorage = OfflineStorage.getInstance();

  // リアクティブな同期状態
  const syncStatus = ref<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    pendingCount: 0,
    conflicts: [],
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
      updateSyncStatus();

      // オンライン状態の変更を監視
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // 定期的な同期（5分間隔）
      const syncInterval = setInterval(() => {
        if (syncStatus.value.isOnline && !syncStatus.value.isSyncing) {
          syncData();
        }
      }, 5 * 60 * 1000);

      // クリーンアップ
      onUnmounted(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(syncInterval);
      });
    });
  }

  /**
   * オンライン復帰時の処理
   */
  const handleOnline = async () => {
    updateOnlineStatus();
    updateSyncStatus();

    // 自動同期を実行
    await syncData();
  };

  /**
   * オフライン時の処理
   */
  const handleOffline = () => {
    updateOnlineStatus();
    updateSyncStatus();
  };

  /**
   * 同期状態を更新
   */
  const updateSyncStatus = () => {
    const pendingData = offlineStorage.getPendingSyncData();
    const pendingCount
      = pendingData.cats.length
        + pendingData.foods.length
        + pendingData.meals.length
        + pendingData.medications.length
        + pendingData.medicationRecords.length
        + pendingData.medicationSchedules.length
        + pendingData.medicationReminders.length;

    syncStatus.value.pendingCount = pendingCount;
    syncStatus.value.lastSync = offlineStorage.getLastSyncTime();
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
        $fetch<MealRecord[]>('/api/meals'),
        $fetch<{ medications: Medication[] }>('/api/medications'),
        $fetch<{ records: MedicationRecord[] }>('/api/medication-records'),
        $fetch<{ schedules: MedicationSchedule[] }>('/api/medication-schedules'),
        $fetch<{ reminders: MedicationReminder[] }>('/api/medication-reminders'),
      ]);

      // ローカルストレージを更新
      offlineStorage.updateFromServer(
        catsResponse,
        foodsResponse,
        mealsResponse,
        medicationsResponse.medications,
        medicationRecordsResponse.records,
        medicationSchedulesResponse.schedules,
        medicationRemindersResponse.reminders,
      );
      updateSyncStatus();
    }
    catch (error) {
      console.error('Failed to fetch server data:', error);
      throw error;
    }
  };

  /**
   * データ同期を実行
   */
  const syncData = async (): Promise<SyncResult> => {
    if (!syncStatus.value.isOnline || syncStatus.value.isSyncing) {
      return {
        success: false,
        conflicts: [],
        error: 'Offline or already syncing',
        syncedCount: 0,
      };
    }

    syncStatus.value.isSyncing = true;
    syncStatus.value.error = null;

    try {
      const pendingData = offlineStorage.getPendingSyncData();
      const conflicts: SyncConflict[] = [];
      let syncedCount = 0;

      // 猫データの同期
      for (const item of pendingData.cats) {
        try {
          await syncCatItem(item);
          syncedCount++;
        }
        catch (error) {
          console.error('Failed to sync cat:', error);
          // 競合の場合は後で処理
          if (error instanceof Error && error.message.includes('conflict')) {
            // 競合処理は後で実装
          }
        }
      }

      // フードデータの同期
      for (const item of pendingData.foods) {
        try {
          await syncFoodItem(item);
          syncedCount++;
        }
        catch (error) {
          console.error('Failed to sync food:', error);
        }
      }

      // 食事記録の同期
      for (const item of pendingData.meals) {
        try {
          await syncMealItem(item);
          syncedCount++;
        }
        catch (error) {
          console.error('Failed to sync meal:', error);
        }
      }

      // 薬データの同期
      for (const item of pendingData.medications) {
        try {
          await syncMedicationItem(item);
          syncedCount++;
        }
        catch (error) {
          console.error('Failed to sync medication:', error);
        }
      }

      // 薬投与記録の同期
      for (const item of pendingData.medicationRecords) {
        try {
          await syncMedicationRecordItem(item);
          syncedCount++;
        }
        catch (error) {
          console.error('Failed to sync medication record:', error);
        }
      }

      // 薬スケジュールの同期
      for (const item of pendingData.medicationSchedules) {
        try {
          await syncMedicationScheduleItem(item);
          syncedCount++;
        }
        catch (error) {
          console.error('Failed to sync medication schedule:', error);
        }
      }

      // 薬リマインダーの同期
      for (const item of pendingData.medicationReminders) {
        try {
          await syncMedicationReminderItem(item);
          syncedCount++;
        }
        catch (error) {
          console.error('Failed to sync medication reminder:', error);
        }
      }

      // 同期完了後にサーバーデータで更新
      await fetchAndUpdateLocalData();

      // 同期待ちデータをクリア
      offlineStorage.clearPendingSync();
      updateSyncStatus();

      syncStatus.value.conflicts = conflicts;

      return {
        success: true,
        conflicts,
        syncedCount,
      };
    }
    catch (error) {
      const errorMessage
        = error instanceof Error ? error.message : 'Unknown sync error';
      syncStatus.value.error = errorMessage;

      return {
        success: false,
        conflicts: [],
        error: errorMessage,
        syncedCount: 0,
      };
    }
    finally {
      syncStatus.value.isSyncing = false;
    }
  };

  /**
   * 猫データの同期
   */
  const syncCatItem = async (item: {
    action: string;
    data: Cat;
    localId?: string;
  }) => {
    switch (item.action) {
      case 'create': {
        const createdCat = await $fetch<Cat>('/api/cats', {
          method: 'POST',
          body: {
            name: item.data.name,
            birthdate: item.data.birthdate,
            weight: item.data.weight,
            photoUrl: item.data.photoUrl,
          },
        });

        // ローカルIDをサーバーIDに更新
        if (item.localId) {
          offlineStorage.updateLocalToServerId(
            'cat',
            item.localId,
            createdCat.id,
          );
        }
        break;
      }

      case 'update': {
        await $fetch(`/api/cats/${item.data.id}`, {
          method: 'PUT' as any,
          body: {
            name: item.data.name,
            birthdate: item.data.birthdate,
            weight: item.data.weight,
            photoUrl: item.data.photoUrl,
          },
        });
        break;
      }

      case 'delete': {
        await $fetch(`/api/cats/${item.data.id}`, {
          method: 'DELETE' as any,
        });
        break;
      }
    }
  };

  /**
   * フードデータの同期
   */
  const syncFoodItem = async (item: {
    action: string;
    data: Food;
    localId?: string;
  }) => {
    switch (item.action) {
      case 'create': {
        const createdFood = await $fetch<Food>('/api/foods', {
          method: 'POST',
          body: {
            name: item.data.name,
            type: item.data.type,
            brand: item.data.brand,
            caloriesPerGram: item.data.caloriesPerGram,
            pricePerUnit: item.data.pricePerUnit,
            unit: item.data.unit,
          },
        });

        if (item.localId) {
          offlineStorage.updateLocalToServerId(
            'food',
            item.localId,
            createdFood.id,
          );
        }
        break;
      }

      case 'update': {
        await $fetch(`/api/foods/${item.data.id}`, {
          method: 'PUT' as any,
          body: {
            name: item.data.name,
            type: item.data.type,
            brand: item.data.brand,
            caloriesPerGram: item.data.caloriesPerGram,
            pricePerUnit: item.data.pricePerUnit,
            unit: item.data.unit,
          },
        });
        break;
      }

      case 'delete': {
        await $fetch(`/api/foods/${item.data.id}`, {
          method: 'DELETE' as any,
        });
        break;
      }
    }
  };

  /**
   * 食事記録の同期
   */
  const syncMealItem = async (item: {
    action: string;
    data: MealRecord;
    localId?: string;
  }) => {
    switch (item.action) {
      case 'create': {
        const createdMeal = await $fetch<MealRecord>('/api/meals', {
          method: 'POST',
          body: {
            catId: item.data.catId,
            foodId: item.data.foodId,
            quantity: item.data.quantity,
            calories: item.data.calories,
            mealTime: item.data.mealTime,
            notes: item.data.notes,
          },
        });

        if (item.localId) {
          offlineStorage.updateLocalToServerId(
            'meal',
            item.localId,
            createdMeal.id,
          );
        }
        break;
      }

      case 'update': {
        await $fetch(`/api/meals/${item.data.id}`, {
          method: 'PUT' as any,
          body: {
            catId: item.data.catId,
            foodId: item.data.foodId,
            quantity: item.data.quantity,
            calories: item.data.calories,
            mealTime: item.data.mealTime,
            notes: item.data.notes,
          },
        });
        break;
      }

      case 'delete': {
        await $fetch(`/api/meals/${item.data.id}`, {
          method: 'DELETE' as any,
        });
        break;
      }
    }
  };

  /**
   * 薬データの同期
   */
  const syncMedicationItem = async (item: {
    action: string;
    data: Medication;
    localId?: string;
  }) => {
    switch (item.action) {
      case 'create': {
        const response = await $fetch<{
          medication: Medication;
          message: string;
        }>('/api/medications', {
          method: 'POST',
          body: {
            name: item.data.name,
            type: item.data.type,
            description: item.data.description,
            dosage: item.data.dosage,
          },
        });

        if (item.localId) {
          offlineStorage.updateLocalToServerId(
            'medication',
            item.localId,
            response.medication.id,
          );
        }
        break;
      }

      case 'update': {
        await $fetch(`/api/medications/${item.data.id}`, {
          method: 'PUT' as any,
          body: {
            name: item.data.name,
            type: item.data.type,
            description: item.data.description,
            dosage: item.data.dosage,
          },
        });
        break;
      }

      case 'delete': {
        await $fetch(`/api/medications/${item.data.id}`, {
          method: 'DELETE' as any,
        });
        break;
      }
    }
  };

  /**
   * 薬投与記録の同期
   */
  const syncMedicationRecordItem = async (item: {
    action: string;
    data: MedicationRecord;
    localId?: string;
  }) => {
    switch (item.action) {
      case 'create': {
        const response = await $fetch<{
          record: MedicationRecord;
          message: string;
        }>('/api/medication-records', {
          method: 'POST',
          body: {
            catId: item.data.catId,
            medicationId: item.data.medicationId,
            quantity: item.data.quantity,
            administeredAt: item.data.administeredAt,
            status: item.data.status,
            notes: item.data.notes,
          },
        });

        if (item.localId) {
          offlineStorage.updateLocalToServerId(
            'medicationRecord',
            item.localId,
            response.record.id,
          );
        }
        break;
      }

      case 'update': {
        await $fetch(`/api/medication-records/${item.data.id}`, {
          method: 'PUT' as any,
          body: {
            catId: item.data.catId,
            medicationId: item.data.medicationId,
            quantity: item.data.quantity,
            administeredAt: item.data.administeredAt,
            status: item.data.status,
            notes: item.data.notes,
          },
        });
        break;
      }

      case 'delete': {
        await $fetch(`/api/medication-records/${item.data.id}`, {
          method: 'DELETE' as any,
        });
        break;
      }
    }
  };

  /**
   * 薬スケジュールの同期
   */
  const syncMedicationScheduleItem = async (item: {
    action: string;
    data: MedicationSchedule;
    localId?: string;
  }) => {
    switch (item.action) {
      case 'create': {
        const response = await $fetch<{
          schedule: MedicationSchedule;
          message: string;
        }>('/api/medication-schedules', {
          method: 'POST',
          body: {
            catId: item.data.catId,
            medicationId: item.data.medicationId,
            frequency: item.data.frequency,
            times: item.data.times,
            startDate: item.data.startDate,
            endDate: item.data.endDate,
            isActive: item.data.isActive,
          },
        });

        if (item.localId) {
          offlineStorage.updateLocalToServerId(
            'medicationSchedule',
            item.localId,
            response.schedule.id,
          );
        }
        break;
      }

      case 'update': {
        await $fetch(`/api/medication-schedules/${item.data.id}`, {
          method: 'PUT' as any,
          body: {
            catId: item.data.catId,
            medicationId: item.data.medicationId,
            frequency: item.data.frequency,
            times: item.data.times,
            startDate: item.data.startDate,
            endDate: item.data.endDate,
            isActive: item.data.isActive,
          },
        });
        break;
      }

      case 'delete': {
        await $fetch(`/api/medication-schedules/${item.data.id}`, {
          method: 'DELETE' as any,
        });
        break;
      }
    }
  };

  /**
   * 薬リマインダーの同期
   */
  const syncMedicationReminderItem = async (item: {
    action: string;
    data: MedicationReminder;
    localId?: string;
  }) => {
    switch (item.action) {
      case 'create': {
        const response = await $fetch<{
          reminder: MedicationReminder;
          message: string;
        }>('/api/medication-reminders', {
          method: 'POST',
          body: {
            scheduleId: item.data.scheduleId,
            catId: item.data.catId,
            medicationId: item.data.medicationId,
            scheduledAt: item.data.scheduledAt,
            status: item.data.status,
          },
        });

        if (item.localId) {
          offlineStorage.updateLocalToServerId(
            'medicationReminder',
            item.localId,
            response.reminder.id,
          );
        }
        break;
      }

      case 'update': {
        await $fetch(`/api/medication-reminders/${item.data.id}`, {
          method: 'PUT' as any,
          body: {
            scheduleId: item.data.scheduleId,
            catId: item.data.catId,
            medicationId: item.data.medicationId,
            scheduledAt: item.data.scheduledAt,
            status: item.data.status,
          },
        });
        break;
      }

      case 'delete': {
        await $fetch(`/api/medication-reminders/${item.data.id}`, {
          method: 'DELETE' as any,
        });
        break;
      }
    }
  };

  /**
   * 手動同期を実行
   */
  const manualSync = async (): Promise<SyncResult> => {
    return await syncData();
  };

  /**
   * 競合を解決
   */
  const resolveConflict = async (
    conflict: SyncConflict,
    useLocal: boolean,
  ): Promise<void> => {
    // 競合解決ロジックを実装
    // useLocal が true の場合はローカルデータを使用
    // false の場合はサーバーデータを使用

    try {
      if (useLocal) {
        // ローカルデータでサーバーを更新
        switch (conflict.type) {
          case 'cat': {
            await $fetch(`/api/cats/${conflict.serverId}`, {
              method: 'PUT' as any,
              body: conflict.localData as any,
            });
            break;
          }
          case 'food': {
            await $fetch(`/api/foods/${conflict.serverId}`, {
              method: 'PUT' as any,
              body: conflict.localData as any,
            });
            break;
          }
          case 'meal': {
            await $fetch(`/api/meals/${conflict.serverId}`, {
              method: 'PUT' as any,
              body: conflict.localData as any,
            });
            break;
          }
          case 'medication': {
            await $fetch(`/api/medications/${conflict.serverId}`, {
              method: 'PUT' as any,
              body: conflict.localData as any,
            });
            break;
          }
          case 'medicationRecord': {
            await $fetch(`/api/medication-records/${conflict.serverId}`, {
              method: 'PUT' as any,
              body: conflict.localData as any,
            });
            break;
          }
          case 'medicationSchedule': {
            await $fetch(`/api/medication-schedules/${conflict.serverId}`, {
              method: 'PUT' as any,
              body: conflict.localData as any,
            });
            break;
          }
          case 'medicationReminder': {
            await $fetch(`/api/medication-reminders/${conflict.serverId}`, {
              method: 'PUT' as any,
              body: conflict.localData as any,
            });
            break;
          }
        }
      }
      else {
        // サーバーデータでローカルを更新
        offlineStorage.updateOffline(
          conflict.type,
          conflict.localId,
          conflict.serverData as Record<string, unknown>,
        );
      }

      // 競合リストから削除
      const index = syncStatus.value.conflicts.findIndex(
        c =>
          c.localId === conflict.localId && c.serverId === conflict.serverId,
      );
      if (index !== -1) {
        syncStatus.value.conflicts.splice(index, 1);
      }
    }
    catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  };

  /**
   * オフライン時のデータ操作
   */
  const offlineOperations = {
    addCat: (cat: Omit<Cat, 'id' | 'createdAt' | 'updatedAt'>) => {
      return offlineStorage.addCatOffline(cat);
    },

    addFood: (food: Omit<Food, 'id' | 'createdAt' | 'updatedAt'>) => {
      return offlineStorage.addFoodOffline(food);
    },

    addMeal: (meal: Omit<MealRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
      return offlineStorage.addMealOffline(meal);
    },

    updateCat: (id: string, updates: Partial<Cat>) => {
      offlineStorage.updateOffline('cat', id, updates);
    },

    updateFood: (id: string, updates: Partial<Food>) => {
      offlineStorage.updateOffline('food', id, updates);
    },

    updateMeal: (id: string, updates: Partial<MealRecord>) => {
      offlineStorage.updateOffline('meal', id, updates);
    },

    deleteCat: (id: string) => {
      offlineStorage.deleteOffline('cat', id);
    },

    deleteFood: (id: string) => {
      offlineStorage.deleteOffline('food', id);
    },

    deleteMeal: (id: string) => {
      offlineStorage.deleteOffline('meal', id);
    },

    // Medication operations
    addMedication: (
      medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      return offlineStorage.addMedicationOffline(medication);
    },

    updateMedication: (id: string, updates: Partial<Medication>) => {
      offlineStorage.updateOffline('medication', id, updates);
    },

    deleteMedication: (id: string) => {
      offlineStorage.deleteOffline('medication', id);
    },

    // Medication record operations
    addMedicationRecord: (
      record: Omit<MedicationRecord, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      return offlineStorage.addMedicationRecordOffline(record);
    },

    updateMedicationRecord: (id: string, updates: Partial<MedicationRecord>) => {
      offlineStorage.updateOffline('medicationRecord', id, updates);
    },

    deleteMedicationRecord: (id: string) => {
      offlineStorage.deleteOffline('medicationRecord', id);
    },

    // Medication schedule operations
    addMedicationSchedule: (
      schedule: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      return offlineStorage.addMedicationScheduleOffline(schedule);
    },

    updateMedicationSchedule: (id: string, updates: Partial<MedicationSchedule>) => {
      offlineStorage.updateOffline('medicationSchedule', id, updates);
    },

    deleteMedicationSchedule: (id: string) => {
      offlineStorage.deleteOffline('medicationSchedule', id);
    },

    // Medication reminder operations
    addMedicationReminder: (
      reminder: Omit<MedicationReminder, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      return offlineStorage.addMedicationReminderOffline(reminder);
    },

    updateMedicationReminder: (id: string, updates: Partial<MedicationReminder>) => {
      offlineStorage.updateOffline('medicationReminder', id, updates);
    },

    deleteMedicationReminder: (id: string) => {
      offlineStorage.deleteOffline('medicationReminder', id);
    },
  };

  /**
   * オフラインデータの取得
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
    syncData,
    manualSync,
    resolveConflict,
    fetchAndUpdateLocalData,
    offlineOperations,
    getOfflineData,
    updateSyncStatus,
  };
};
