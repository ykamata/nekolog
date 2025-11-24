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
    // サーバーサイドでは localStorage が利用できないため、デフォルトデータを返す
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return this.getDefaultData();
    }

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

    return this.getDefaultData();
  }

  /**
   * デフォルトデータを取得
   */
  private getDefaultData(): OfflineData {
    return {
      cats: [],
      foods: [],
      meals: [],
      medications: [],
      medicationRecords: [],
      medicationSchedules: [],
      medicationReminders: [],
      lastSync: new Date(0),
    };
  }

  /**
   * ローカルストレージにデータを保存
   */
  private saveToStorage(): void {
    // サーバーサイドでは localStorage が利用できないため、何もしない
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

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
   * ストレージをクリア
   */
  clear(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
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
