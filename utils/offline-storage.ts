import type { Cat, Food, MealRecord } from '~/types/cat-meal';
import type {
  Medication,
  MedicationRecord,
  MedicationSchedule,
  MedicationReminder,
} from '~/types/medication';

export interface OfflineData {
  cats: Cat[];
  foods: Food[];
  meals: MealRecord[];
  medications: Medication[];
  medicationRecords: MedicationRecord[];
  medicationSchedules: MedicationSchedule[];
  medicationReminders: MedicationReminder[];
  lastSync: Date;
  pendingSync: {
    cats: {
      action: 'create' | 'update' | 'delete';
      data: Cat;
      localId?: string;
    }[];
    foods: {
      action: 'create' | 'update' | 'delete';
      data: Food;
      localId?: string;
    }[];
    meals: {
      action: 'create' | 'update' | 'delete';
      data: MealRecord;
      localId?: string;
    }[];
    medications: {
      action: 'create' | 'update' | 'delete';
      data: Medication;
      localId?: string;
    }[];
    medicationRecords: {
      action: 'create' | 'update' | 'delete';
      data: MedicationRecord;
      localId?: string;
    }[];
    medicationSchedules: {
      action: 'create' | 'update' | 'delete';
      data: MedicationSchedule;
      localId?: string;
    }[];
    medicationReminders: {
      action: 'create' | 'update' | 'delete';
      data: MedicationReminder;
      localId?: string;
    }[];
  };
}

export interface SyncConflict {
  type: 'cat' | 'food' | 'meal' | 'medication' | 'medicationRecord' | 'medicationSchedule' | 'medicationReminder';
  localData: unknown;
  serverData: unknown;
  field: string;
  localId: string;
  serverId: string;
}

const STORAGE_KEY = 'cat-meal-offline-data';
const STORAGE_VERSION = '1.0';

/**
 * ローカルストレージユーティリティクラス
 * オフライン時のデータ永続化を管理
 */
export class OfflineStorage {
  private static instance: OfflineStorage;
  private data: OfflineData;

  private constructor() {
    this.data = this.loadFromStorage();
  }

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  /**
   * ローカルストレージからデータを読み込み
   */
  private loadFromStorage(): OfflineData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION) {
          return {
            ...parsed.data,
            lastSync: new Date(parsed.data.lastSync),
          };
        }
      }
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load offline data:', error);
    }

    // デフォルトデータ
    return {
      cats: [],
      foods: [],
      meals: [],
      medications: [],
      medicationRecords: [],
      medicationSchedules: [],
      medicationReminders: [],
      lastSync: new Date(0),
      pendingSync: {
        cats: [],
        foods: [],
        meals: [],
        medications: [],
        medicationRecords: [],
        medicationSchedules: [],
        medicationReminders: [],
      },
    };
  }

  /**
   * ローカルストレージにデータを保存
   */
  private saveToStorage(): void {
    try {
      const toStore = {
        version: STORAGE_VERSION,
        data: this.data,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save offline data:', error);
    }
  }

  /**
   * オンライン時にサーバーデータでローカルデータを更新
   */
  updateFromServer(
    cats: Cat[],
    foods: Food[],
    meals: MealRecord[],
    medications: Medication[],
    medicationRecords?: MedicationRecord[],
    medicationSchedules?: MedicationSchedule[],
    medicationReminders?: MedicationReminder[],
  ): void {
    // 1ヶ月以内のデータのみ保存
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    this.data.cats = cats;
    this.data.foods = foods;
    this.data.meals = meals.filter(
      meal => new Date(meal.mealTime) >= oneMonthAgo,
    );
    this.data.medications = medications;

    // 薬関連データも1ヶ月以内のもののみ保存
    this.data.medicationRecords = medicationRecords?.filter(
      record => new Date(record.administeredAt) >= oneMonthAgo,
    ) || [];

    this.data.medicationSchedules = medicationSchedules?.filter(
      schedule => new Date(schedule.startDate) >= oneMonthAgo
        || (schedule.endDate && new Date(schedule.endDate) >= oneMonthAgo)
        || schedule.isActive,
    ) || [];

    this.data.medicationReminders = medicationReminders?.filter(
      reminder => new Date(reminder.scheduledAt) >= oneMonthAgo,
    ) || [];

    this.data.lastSync = new Date();
    this.saveToStorage();
  }

  /**
   * ローカルデータを取得
   */
  getData(): OfflineData {
    return { ...this.data };
  }

  /**
   * 猫データを取得
   */
  getCats(): Cat[] {
    return [...this.data.cats];
  }

  /**
   * フードデータを取得
   */
  getFoods(): Food[] {
    return [...this.data.foods];
  }

  /**
   * 薬データを取得
   */
  getMedications(): Medication[] {
    return [...this.data.medications];
  }

  /**
   * 薬投与記録を取得（フィルタリング可能）
   */
  getMedicationRecords(catId?: string, medicationId?: string, startDate?: Date, endDate?: Date): MedicationRecord[] {
    let records = [...this.data.medicationRecords];

    if (catId) {
      records = records.filter(record => record.catId === catId);
    }

    if (medicationId) {
      records = records.filter(record => record.medicationId === medicationId);
    }

    if (startDate) {
      records = records.filter(record => new Date(record.administeredAt) >= startDate);
    }

    if (endDate) {
      records = records.filter(record => new Date(record.administeredAt) <= endDate);
    }

    return records.sort(
      (a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime(),
    );
  }

  /**
   * 薬スケジュールを取得（フィルタリング可能）
   */
  getMedicationSchedules(catId?: string, medicationId?: string, isActive?: boolean): MedicationSchedule[] {
    let schedules = [...this.data.medicationSchedules];

    if (catId) {
      schedules = schedules.filter(schedule => schedule.catId === catId);
    }

    if (medicationId) {
      schedules = schedules.filter(schedule => schedule.medicationId === medicationId);
    }

    if (isActive !== undefined) {
      schedules = schedules.filter(schedule => schedule.isActive === isActive);
    }

    return schedules.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * 薬リマインダーを取得（フィルタリング可能）
   */
  getMedicationReminders(catId?: string, medicationId?: string, scheduleId?: string, startDate?: Date, endDate?: Date): MedicationReminder[] {
    let reminders = [...this.data.medicationReminders];

    if (catId) {
      reminders = reminders.filter(reminder => reminder.catId === catId);
    }

    if (medicationId) {
      reminders = reminders.filter(reminder => reminder.medicationId === medicationId);
    }

    if (scheduleId) {
      reminders = reminders.filter(reminder => reminder.scheduleId === scheduleId);
    }

    if (startDate) {
      reminders = reminders.filter(reminder => new Date(reminder.scheduledAt) >= startDate);
    }

    if (endDate) {
      reminders = reminders.filter(reminder => new Date(reminder.scheduledAt) <= endDate);
    }

    return reminders.sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }

  /**
   * 食事記録を取得（フィルタリング可能）
   */
  getMeals(catId?: string, startDate?: Date, endDate?: Date): MealRecord[] {
    let meals = [...this.data.meals];

    if (catId) {
      meals = meals.filter(meal => meal.catId === catId);
    }

    if (startDate) {
      meals = meals.filter(meal => new Date(meal.mealTime) >= startDate);
    }

    if (endDate) {
      meals = meals.filter(meal => new Date(meal.mealTime) <= endDate);
    }

    return meals.sort(
      (a, b) => new Date(b.mealTime).getTime() - new Date(a.mealTime).getTime(),
    );
  }

  /**
   * オフライン時に猫を追加
   */
  addCatOffline(cat: Omit<Cat, 'id' | 'createdAt' | 'updatedAt'>): string {
    const localId = `local-cat-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newCat: Cat = {
      ...cat,
      id: localId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.data.cats.push(newCat);
    this.data.pendingSync.cats.push({
      action: 'create',
      data: newCat,
      localId,
    });
    this.saveToStorage();
    return localId;
  }

  /**
   * オフライン時にフードを追加
   */
  addFoodOffline(food: Omit<Food, 'id' | 'createdAt' | 'updatedAt'>): string {
    const localId = `local-food-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newFood: Food = {
      ...food,
      id: localId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.data.foods.push(newFood);
    this.data.pendingSync.foods.push({
      action: 'create',
      data: newFood,
      localId,
    });
    this.saveToStorage();
    return localId;
  }

  /**
   * オフライン時に食事記録を追加
   */
  addMealOffline(
    meal: Omit<MealRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): string {
    const localId = `local-meal-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newMeal: MealRecord = {
      ...meal,
      id: localId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.data.meals.push(newMeal);
    this.data.pendingSync.meals.push({
      action: 'create',
      data: newMeal,
      localId,
    });
    this.saveToStorage();
    return localId;
  }

  /**
   * オフライン時に薬を追加
   */
  addMedicationOffline(
    medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>,
  ): string {
    const localId = `local-medication-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newMedication: Medication = {
      ...medication,
      id: localId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.data.medications.push(newMedication);
    this.data.pendingSync.medications.push({
      action: 'create',
      data: newMedication,
      localId,
    });
    this.saveToStorage();
    return localId;
  }

  /**
   * オフライン時に薬投与記録を追加
   */
  addMedicationRecordOffline(
    record: Omit<MedicationRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): string {
    const localId = `local-medication-record-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newRecord: MedicationRecord = {
      ...record,
      id: localId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.data.medicationRecords.push(newRecord);
    this.data.pendingSync.medicationRecords.push({
      action: 'create',
      data: newRecord,
      localId,
    });
    this.saveToStorage();
    return localId;
  }

  /**
   * オフライン時に薬スケジュールを追加
   */
  addMedicationScheduleOffline(
    schedule: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt'>,
  ): string {
    const localId = `local-medication-schedule-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newSchedule: MedicationSchedule = {
      ...schedule,
      id: localId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.data.medicationSchedules.push(newSchedule);
    this.data.pendingSync.medicationSchedules.push({
      action: 'create',
      data: newSchedule,
      localId,
    });
    this.saveToStorage();
    return localId;
  }

  /**
   * オフライン時に薬リマインダーを追加
   */
  addMedicationReminderOffline(
    reminder: Omit<MedicationReminder, 'id' | 'createdAt' | 'updatedAt'>,
  ): string {
    const localId = `local-medication-reminder-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newReminder: MedicationReminder = {
      ...reminder,
      id: localId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.data.medicationReminders.push(newReminder);
    this.data.pendingSync.medicationReminders.push({
      action: 'create',
      data: newReminder,
      localId,
    });
    this.saveToStorage();
    return localId;
  }

  /**
   * オフライン時にデータを更新
   */
  updateOffline(
    type: 'cat' | 'food' | 'meal' | 'medication' | 'medicationRecord' | 'medicationSchedule' | 'medicationReminder',
    id: string,
    updates: Record<string, unknown>,
  ): void {
    const now = new Date();

    switch (type) {
      case 'cat': {
        const catIndex = this.data.cats.findIndex(c => c.id === id);
        if (catIndex !== -1) {
          const updatedCat = {
            ...this.data.cats[catIndex],
            ...updates,
            updatedAt: now,
          } as Cat;
          this.data.cats[catIndex] = updatedCat;
          this.data.pendingSync.cats.push({
            action: 'update',
            data: updatedCat,
          });
        }
        break;
      }

      case 'food': {
        const foodIndex = this.data.foods.findIndex(f => f.id === id);
        if (foodIndex !== -1) {
          const updatedFood = {
            ...this.data.foods[foodIndex],
            ...updates,
            updatedAt: now,
          } as Food;
          this.data.foods[foodIndex] = updatedFood;
          this.data.pendingSync.foods.push({
            action: 'update',
            data: updatedFood,
          });
        }
        break;
      }

      case 'meal': {
        const mealIndex = this.data.meals.findIndex(m => m.id === id);
        if (mealIndex !== -1) {
          const updatedMeal = {
            ...this.data.meals[mealIndex],
            ...updates,
            updatedAt: now,
          } as MealRecord;
          this.data.meals[mealIndex] = updatedMeal;
          this.data.pendingSync.meals.push({
            action: 'update',
            data: updatedMeal,
          });
        }
        break;
      }

      case 'medication': {
        const medicationIndex = this.data.medications.findIndex(
          m => m.id === id,
        );
        if (medicationIndex !== -1) {
          const updatedMedication = {
            ...this.data.medications[medicationIndex],
            ...updates,
            updatedAt: now,
          } as Medication;
          this.data.medications[medicationIndex] = updatedMedication;
          this.data.pendingSync.medications.push({
            action: 'update',
            data: updatedMedication,
          });
        }
        break;
      }

      case 'medicationRecord': {
        const recordIndex = this.data.medicationRecords.findIndex(
          r => r.id === id,
        );
        if (recordIndex !== -1) {
          const updatedRecord = {
            ...this.data.medicationRecords[recordIndex],
            ...updates,
            updatedAt: now,
          } as MedicationRecord;
          this.data.medicationRecords[recordIndex] = updatedRecord;
          this.data.pendingSync.medicationRecords.push({
            action: 'update',
            data: updatedRecord,
          });
        }
        break;
      }

      case 'medicationSchedule': {
        const scheduleIndex = this.data.medicationSchedules.findIndex(
          s => s.id === id,
        );
        if (scheduleIndex !== -1) {
          const updatedSchedule = {
            ...this.data.medicationSchedules[scheduleIndex],
            ...updates,
            updatedAt: now,
          } as MedicationSchedule;
          this.data.medicationSchedules[scheduleIndex] = updatedSchedule;
          this.data.pendingSync.medicationSchedules.push({
            action: 'update',
            data: updatedSchedule,
          });
        }
        break;
      }

      case 'medicationReminder': {
        const reminderIndex = this.data.medicationReminders.findIndex(
          r => r.id === id,
        );
        if (reminderIndex !== -1) {
          const updatedReminder = {
            ...this.data.medicationReminders[reminderIndex],
            ...updates,
            updatedAt: now,
          } as MedicationReminder;
          this.data.medicationReminders[reminderIndex] = updatedReminder;
          this.data.pendingSync.medicationReminders.push({
            action: 'update',
            data: updatedReminder,
          });
        }
        break;
      }
    }

    this.saveToStorage();
  }

  /**
   * オフライン時にデータを削除
   */
  deleteOffline(
    type: 'cat' | 'food' | 'meal' | 'medication' | 'medicationRecord' | 'medicationSchedule' | 'medicationReminder',
    id: string,
  ): void {
    switch (type) {
      case 'cat': {
        const catIndex = this.data.cats.findIndex(c => c.id === id);
        if (catIndex !== -1) {
          const cat = this.data.cats[catIndex];
          if (cat) {
            this.data.cats.splice(catIndex, 1);
            this.data.pendingSync.cats.push({
              action: 'delete',
              data: cat,
            });
          }
        }
        break;
      }

      case 'food': {
        const foodIndex = this.data.foods.findIndex(f => f.id === id);
        if (foodIndex !== -1) {
          const food = this.data.foods[foodIndex];
          if (food) {
            this.data.foods.splice(foodIndex, 1);
            this.data.pendingSync.foods.push({
              action: 'delete',
              data: food,
            });
          }
        }
        break;
      }

      case 'meal': {
        const mealIndex = this.data.meals.findIndex(m => m.id === id);
        if (mealIndex !== -1) {
          const meal = this.data.meals[mealIndex];
          if (meal) {
            this.data.meals.splice(mealIndex, 1);
            this.data.pendingSync.meals.push({
              action: 'delete',
              data: meal,
            });
          }
        }
        break;
      }

      case 'medication': {
        const medicationIndex = this.data.medications.findIndex(
          m => m.id === id,
        );
        if (medicationIndex !== -1) {
          const medication = this.data.medications[medicationIndex];
          if (medication) {
            this.data.medications.splice(medicationIndex, 1);
            this.data.pendingSync.medications.push({
              action: 'delete',
              data: medication,
            });
          }
        }
        break;
      }

      case 'medicationRecord': {
        const recordIndex = this.data.medicationRecords.findIndex(
          r => r.id === id,
        );
        if (recordIndex !== -1) {
          const record = this.data.medicationRecords[recordIndex];
          if (record) {
            this.data.medicationRecords.splice(recordIndex, 1);
            this.data.pendingSync.medicationRecords.push({
              action: 'delete',
              data: record,
            });
          }
        }
        break;
      }

      case 'medicationSchedule': {
        const scheduleIndex = this.data.medicationSchedules.findIndex(
          s => s.id === id,
        );
        if (scheduleIndex !== -1) {
          const schedule = this.data.medicationSchedules[scheduleIndex];
          if (schedule) {
            this.data.medicationSchedules.splice(scheduleIndex, 1);
            this.data.pendingSync.medicationSchedules.push({
              action: 'delete',
              data: schedule,
            });
          }
        }
        break;
      }

      case 'medicationReminder': {
        const reminderIndex = this.data.medicationReminders.findIndex(
          r => r.id === id,
        );
        if (reminderIndex !== -1) {
          const reminder = this.data.medicationReminders[reminderIndex];
          if (reminder) {
            this.data.medicationReminders.splice(reminderIndex, 1);
            this.data.pendingSync.medicationReminders.push({
              action: 'delete',
              data: reminder,
            });
          }
        }
        break;
      }
    }

    this.saveToStorage();
  }

  /**
   * 同期待ちデータを取得
   */
  getPendingSyncData() {
    return { ...this.data.pendingSync };
  }

  /**
   * 同期完了後に同期待ちデータをクリア
   */
  clearPendingSync(): void {
    this.data.pendingSync = {
      cats: [],
      foods: [],
      meals: [],
      medications: [],
      medicationRecords: [],
      medicationSchedules: [],
      medicationReminders: [],
    };
    this.saveToStorage();
  }

  /**
   * 特定の同期待ちアイテムを削除
   */
  removePendingSyncItem(
    type: 'cat' | 'food' | 'meal' | 'medication' | 'medicationRecord' | 'medicationSchedule' | 'medicationReminder',
    localId: string,
  ): void {
    let pendingKey: keyof typeof this.data.pendingSync;

    switch (type) {
      case 'cat':
        pendingKey = 'cats';
        break;
      case 'food':
        pendingKey = 'foods';
        break;
      case 'meal':
        pendingKey = 'meals';
        break;
      case 'medication':
        pendingKey = 'medications';
        break;
      case 'medicationRecord':
        pendingKey = 'medicationRecords';
        break;
      case 'medicationSchedule':
        pendingKey = 'medicationSchedules';
        break;
      case 'medicationReminder':
        pendingKey = 'medicationReminders';
        break;
      default:
        return;
    }

    const pending = this.data.pendingSync[pendingKey] as Array<{ localId?: string; data: { id: string } }>;
    const index = pending.findIndex(
      item => item.localId === localId || item.data.id === localId,
    );
    if (index !== -1) {
      pending.splice(index, 1);
      this.saveToStorage();
    }
  }

  /**
   * ローカルIDをサーバーIDにマッピング更新
   */
  updateLocalToServerId(
    type: 'cat' | 'food' | 'meal' | 'medication' | 'medicationRecord' | 'medicationSchedule' | 'medicationReminder',
    localId: string,
    serverId: string,
  ): void {
    switch (type) {
      case 'cat': {
        const catIndex = this.data.cats.findIndex(c => c.id === localId);
        if (catIndex !== -1 && this.data.cats[catIndex]) {
          this.data.cats[catIndex].id = serverId;
        }
        break;
      }

      case 'food': {
        const foodIndex = this.data.foods.findIndex(f => f.id === localId);
        if (foodIndex !== -1 && this.data.foods[foodIndex]) {
          this.data.foods[foodIndex].id = serverId;
        }
        break;
      }

      case 'meal': {
        const mealIndex = this.data.meals.findIndex(m => m.id === localId);
        if (mealIndex !== -1 && this.data.meals[mealIndex]) {
          this.data.meals[mealIndex].id = serverId;
          // 関連するcatIdやfoodIdもローカルIDの場合は更新が必要
        }
        break;
      }

      case 'medication': {
        const medicationIndex = this.data.medications.findIndex(
          m => m.id === localId,
        );
        if (medicationIndex !== -1 && this.data.medications[medicationIndex]) {
          this.data.medications[medicationIndex].id = serverId;
        }
        break;
      }

      case 'medicationRecord': {
        const recordIndex = this.data.medicationRecords.findIndex(
          r => r.id === localId,
        );
        if (recordIndex !== -1 && this.data.medicationRecords[recordIndex]) {
          this.data.medicationRecords[recordIndex].id = serverId;
          // 関連するcatIdやmedicationIdもローカルIDの場合は更新が必要
        }
        break;
      }

      case 'medicationSchedule': {
        const scheduleIndex = this.data.medicationSchedules.findIndex(
          s => s.id === localId,
        );
        if (scheduleIndex !== -1 && this.data.medicationSchedules[scheduleIndex]) {
          this.data.medicationSchedules[scheduleIndex].id = serverId;
          // 関連するcatIdやmedicationIdもローカルIDの場合は更新が必要
        }
        break;
      }

      case 'medicationReminder': {
        const reminderIndex = this.data.medicationReminders.findIndex(
          r => r.id === localId,
        );
        if (reminderIndex !== -1 && this.data.medicationReminders[reminderIndex]) {
          this.data.medicationReminders[reminderIndex].id = serverId;
          // 関連するscheduleId、catId、medicationIdもローカルIDの場合は更新が必要
        }
        break;
      }
    }

    this.saveToStorage();
  }

  /**
   * ストレージをクリア
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.data = this.loadFromStorage();
  }

  /**
   * 最後の同期時刻を取得
   */
  getLastSyncTime(): Date {
    return this.data.lastSync;
  }

  /**
   * データが古いかチェック（1週間以上古い場合）
   */
  isDataStale(): boolean {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return this.data.lastSync < oneWeekAgo;
  }
}
