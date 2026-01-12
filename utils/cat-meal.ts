/**
 * Utility functions for cat meal management data transformation and validation
 */

import type {
  Cat,
  Food,
  MealRecord,
  FoodType,
  MealAnalytics,
  DailyCalorieData,
} from '~/types/cat-meal';
import {
  CatInputSchema,
  FoodInputSchema,
  MealRecordInputSchema,
  MealRecordFormSchema,
  QuantityInputSchema,
} from '~/lib/validations/cat-meal';
import type {
  CatInput,
  FoodInput,
  MealRecordInput,
  MealRecordForm,
  QuantityInput,
} from '~/lib/validations/cat-meal';

/**
 * Data transformation utilities
 */

/**
 * Convert Prisma Cat model to Cat interface
 */
export function transformPrismaCat(prismaCat: any): Cat {
  return {
    id: prismaCat.id,
    name: prismaCat.name,
    birthdate: prismaCat.birthdate ? new Date(prismaCat.birthdate) : undefined,
    weight: prismaCat.weight,
    photoUrl: prismaCat.photoUrl,
    createdAt: new Date(prismaCat.createdAt),
    updatedAt: new Date(prismaCat.updatedAt),
  };
}

/**
 * Convert Prisma Food model to Food interface
 */
export function transformPrismaFood(prismaFood: any): Food {
  return {
    id: prismaFood.id,
    name: prismaFood.name,
    type: prismaFood.type as FoodType,
    brand: prismaFood.brand,
    caloriesPerGram: prismaFood.caloriesPerGram,
    pricePerUnit: prismaFood.pricePerUnit,
    unit: prismaFood.unit,
    createdAt: new Date(prismaFood.createdAt),
    updatedAt: new Date(prismaFood.updatedAt),
  };
}

/**
 * Convert Prisma MealRecord model to MealRecord interface
 */
export function transformPrismaMealRecord(prismaMealRecord: any): MealRecord {
  return {
    id: prismaMealRecord.id,
    catId: prismaMealRecord.catId,
    foodId: prismaMealRecord.foodId,
    quantity: prismaMealRecord.quantity,
    calories: prismaMealRecord.calories,
    mealTime: parseJSTDateTime(prismaMealRecord.mealTime),
    notes: prismaMealRecord.notes,
    createdAt: parseJSTDateTime(prismaMealRecord.createdAt),
    updatedAt: parseJSTDateTime(prismaMealRecord.updatedAt),
    cat: prismaMealRecord.cat
      ? transformPrismaCat(prismaMealRecord.cat)
      : undefined,
    food: prismaMealRecord.food
      ? transformPrismaFood(prismaMealRecord.food)
      : undefined,
  };
}

/**
 * Validation utilities
 */

/**
 * Validate cat input data
 */
export function validateCatInput(
  data: unknown,
): { success: true; data: CatInput } | { success: false; errors: string[] } {
  const result = CatInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(err => err.message),
  };
}

/**
 * Validate food input data
 */
export function validateFoodInput(
  data: unknown,
): { success: true; data: FoodInput } | { success: false; errors: string[] } {
  const result = FoodInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(err => err.message),
  };
}

/**
 * Validate meal record input data
 */
export function validateMealRecordInput(
  data: unknown,
):
  | { success: true; data: MealRecordInput }
  | { success: false; errors: string[] } {
  const result = MealRecordInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(err => err.message),
  };
}

/**
 * Validate meal record form data
 */
export function validateMealRecordForm(
  data: unknown,
):
  | { success: true; data: MealRecordForm }
  | { success: false; errors: string[] } {
  const result = MealRecordFormSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(err => err.message),
  };
}

/**
 * Calculation utilities
 */

/**
 * Calculate calories from grams using food data
 */
export function calculateCaloriesFromGrams(
  grams: number,
  caloriesPerGram: number,
): number {
  return Math.round(grams * caloriesPerGram * 100) / 100;
}

/**
 * Calculate grams from calories using food data
 */
export function calculateGramsFromCalories(
  calories: number,
  caloriesPerGram: number,
): number {
  if (caloriesPerGram === 0) return 0;
  return Math.round((calories / caloriesPerGram) * 100) / 100;
}

/**
 * Convert quantity input to grams and calories
 */
export function convertQuantityInput(
  input: QuantityInput,
  caloriesPerGram: number,
): { grams: number; calories: number } {
  if (input.unit === 'g') {
    return {
      grams: input.value,
      calories: calculateCaloriesFromGrams(input.value, caloriesPerGram),
    };
  }
  else {
    return {
      grams: calculateGramsFromCalories(input.value, caloriesPerGram),
      calories: input.value,
    };
  }
}

/**
 * Date utilities
 */

/**
 * Convert Date to local ISO string (JST) without timezone conversion
 * @param date Date object
 * @returns ISO-formatted string in local timezone (YYYY-MM-DDTHH:mm:ss)
 */
export function toLocalISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Convert Date to MySQL DATETIME format (YYYY-MM-DD HH:mm:ss) in local timezone
 * This prevents Prisma from converting to UTC when storing in MySQL
 * @param date Date object
 * @returns MySQL DATETIME string in local timezone
 */
export function toMySQLDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Convert Date to local date string (JST) without timezone conversion
 * @param date Date object
 * @returns Date string in local timezone (YYYY-MM-DD)
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO datetime string as JST (local timezone) without timezone conversion
 * Handles both "YYYY-MM-DDTHH:mm:ss" and "YYYY-MM-DDTHH:mm:ss.sssZ" formats
 * IMPORTANT: This treats the datetime as JST, ignoring any Z or timezone suffix
 * @param dateTimeString ISO datetime string
 * @returns Date object in local timezone (JST)
 */
export function parseJSTDateTime(dateTimeString: string | Date): Date {
  if (dateTimeString instanceof Date) return dateTimeString;
  if (!dateTimeString) return new Date();

  // Remove 'Z' suffix or timezone info if present, as DB datetime is already in JST
  const cleanDateTimeString = String(dateTimeString).replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');

  // Parse as "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD HH:mm:ss"
  const isoMatch = cleanDateTimeString.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    const [, year, month, day, hours, minutes, seconds] = isoMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    );
  }

  // Fallback to Date constructor (may have timezone issues)
  return new Date(dateTimeString);
}

/**
 * Parse YYYY-MM-DD string as local date (JST) at 00:00:00
 * IMPORTANT: new Date("YYYY-MM-DD") parses as UTC, causing timezone issues
 * This function explicitly parses as local timezone
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Date object in local timezone at 00:00:00, or null if invalid
 */
export function parseLocalDateString(dateString: string): Date | null {
  if (!dateString) return null;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(p => isNaN(p))) return null;
  const [year, month, day] = parts as [number, number, number];
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Parse YYYY-MM-DD string as local date (JST) at 23:59:59.999
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Date object in local timezone at 23:59:59.999, or null if invalid
 */
export function parseLocalDateStringEndOfDay(dateString: string): Date | null {
  if (!dateString) return null;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(p => isNaN(p))) return null;
  const [year, month, day] = parts as [number, number, number];
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get date range for last N days
 */
export function getLastNDaysRange(days: number): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  return {
    startDate: getStartOfDay(startDate),
    endDate: getEndOfDay(endDate),
  };
}

/**
 * Generate all dates in a range
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Fill missing dates with zero values for daily calories by food type
 */
export function fillMissingDatesForFoodType(
  data: { date: string; dryCalories: number; wetCalories: number; totalCalories: number }[],
  startDate: Date,
  endDate: Date,
): { date: string; dryCalories: number; wetCalories: number; totalCalories: number }[] {
  const allDates = generateDateRange(startDate, endDate);
  const dataMap = new Map(data.map(item => [item.date, item]));

  return allDates.map((date) => {
    const existingData = dataMap.get(date);
    return existingData || {
      date,
      dryCalories: 0,
      wetCalories: 0,
      totalCalories: 0,
    };
  });
}

/**
 * Analytics utilities
 */

/**
 * Group meal records by date
 */
export function groupMealRecordsByDate(
  mealRecords: MealRecord[],
): Record<string, MealRecord[]> {
  return mealRecords.reduce((groups, record) => {
    const dateKey = formatDate(record.mealTime);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(record);
    return groups;
  }, {} as Record<string, MealRecord[]>);
}

/**
 * Calculate daily calories from meal records with food type breakdown
 */
export function calculateDailyCaloriesWithFoodType(
  mealRecords: MealRecord[],
): { date: string; dryCalories: number; wetCalories: number; totalCalories: number }[] {
  const groupedByDate = groupMealRecordsByDate(mealRecords);

  return Object.entries(groupedByDate)
    .map(([date, records]) => {
      const dryCalories = records
        .filter(record => record.food?.type === 'DRY')
        .reduce((sum, record) => sum + record.calories, 0);

      const wetCalories = records
        .filter(record => record.food?.type === 'WET')
        .reduce((sum, record) => sum + record.calories, 0);

      const totalCalories = dryCalories + wetCalories;

      return {
        date,
        dryCalories: Math.round(dryCalories * 100) / 100,
        wetCalories: Math.round(wetCalories * 100) / 100,
        totalCalories: Math.round(totalCalories * 100) / 100,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Calculate daily calories from meal records
 */
export function calculateDailyCalories(
  mealRecords: MealRecord[],
): DailyCalorieData[] {
  const groupedByDate = groupMealRecordsByDate(mealRecords);

  const result: DailyCalorieData[] = [];

  Object.entries(groupedByDate).forEach(([date, records]) => {
    // ドライフードとウェットフードを分けて計算
    const dryRecords = records.filter(record => record.food?.type === 'DRY');
    const wetRecords = records.filter(record => record.food?.type === 'WET');

    const dryCalories = dryRecords.reduce((sum, record) => sum + record.calories, 0);
    const wetCalories = wetRecords.reduce((sum, record) => sum + record.calories, 0);

    // ドライフードのデータがある場合は追加
    if (dryCalories > 0) {
      result.push({
        date,
        calories: Math.round(dryCalories * 100) / 100,
        type: 'DRY' as FoodType,
      });
    }

    // ウェットフードのデータがある場合は追加
    if (wetCalories > 0) {
      result.push({
        date,
        calories: Math.round(wetCalories * 100) / 100,
        type: 'WET' as FoodType,
      });
    }

    // どちらもない場合は合計値で追加（フォールバック）
    if (dryCalories === 0 && wetCalories === 0 && records.length > 0) {
      const totalCalories = records.reduce((sum, record) => sum + record.calories, 0);
      result.push({
        date,
        calories: Math.round(totalCalories * 100) / 100,
        type: 'DRY' as FoodType, // デフォルト
      });
    }
  });

  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Calculate food type breakdown with calories and weight
 */
export function calculateFoodTypeBreakdown(
  mealRecords: MealRecord[],
): { type: FoodType; percentage: number; totalCalories: number; totalWeight: number }[] {
  const totalCalories = mealRecords.reduce(
    (sum, record) => sum + record.calories,
    0,
  );

  const dryRecords = mealRecords.filter(record => record.food?.type === 'DRY');
  const wetRecords = mealRecords.filter(record => record.food?.type === 'WET');

  const dryCalories = dryRecords.reduce((sum, record) => sum + record.calories, 0);
  const wetCalories = wetRecords.reduce((sum, record) => sum + record.calories, 0);

  const dryWeight = dryRecords.reduce((sum, record) => sum + record.quantity, 0);
  const wetWeight = wetRecords.reduce((sum, record) => sum + record.quantity, 0);

  if (totalCalories === 0) {
    return [
      {
        type: 'DRY' as FoodType,
        percentage: 0,
        totalCalories: 0,
        totalWeight: 0,
      },
      {
        type: 'WET' as FoodType,
        percentage: 0,
        totalCalories: 0,
        totalWeight: 0,
      },
    ];
  }

  return [
    {
      type: 'DRY' as FoodType,
      percentage: Math.round((dryCalories / totalCalories) * 100),
      totalCalories: Math.round(dryCalories * 100) / 100,
      totalWeight: Math.round(dryWeight * 100) / 100,
    },
    {
      type: 'WET' as FoodType,
      percentage: Math.round((wetCalories / totalCalories) * 100),
      totalCalories: Math.round(wetCalories * 100) / 100,
      totalWeight: Math.round(wetWeight * 100) / 100,
    },
  ];
}

/**
 * Calculate weekly average calories
 */
export function calculateWeeklyAverage(
  dailyCalories: DailyCalorieData[],
): number {
  if (dailyCalories.length === 0) return 0;

  const totalCalories = dailyCalories.reduce(
    (sum, day) => sum + day.calories,
    0,
  );
  const weeks = Math.max(1, dailyCalories.length / 7);

  return Math.round((totalCalories / weeks) * 100) / 100;
}

/**
 * パフォーマンス最適化：データサンプリング機能（要件6.3対応）
 */

/**
 * 大量データ時のサンプリング処理
 */
export function sampleMealRecords(
  mealRecords: MealRecord[],
  maxRecords: number = 2000,
): {
    sampledRecords: MealRecord[];
    samplingInfo: { applied: boolean; originalCount: number; sampledCount: number };
  } {
  if (mealRecords.length <= maxRecords) {
    return {
      sampledRecords: mealRecords,
      samplingInfo: {
        applied: false,
        originalCount: mealRecords.length,
        sampledCount: mealRecords.length,
      },
    };
  }

  // 時系列順にソート
  const sortedRecords = [...mealRecords].sort(
    (a, b) => a.mealTime.getTime() - b.mealTime.getTime(),
  );

  // 重要なレコードを保持するためのインデックス
  const importantIndices = new Set<number>();

  // 最初と最後のレコードを保持
  importantIndices.add(0);
  if (sortedRecords.length > 1) {
    importantIndices.add(sortedRecords.length - 1);
  }

  // 日付の境界（各日の最初と最後の記録）を保持
  const dateGroups = groupMealRecordsByDate(sortedRecords);
  for (const dayRecords of Object.values(dateGroups)) {
    if (dayRecords.length > 0) {
      const firstRecord = dayRecords[0];
      const lastRecord = dayRecords[dayRecords.length - 1];

      if (!firstRecord || !lastRecord) continue;

      const firstIndex = sortedRecords.findIndex(r => r.id === firstRecord.id);
      const lastIndex = sortedRecords.findIndex(r => r.id === lastRecord.id);
      if (firstIndex !== -1) importantIndices.add(firstIndex);
      if (lastIndex !== -1) importantIndices.add(lastIndex);
    }
  }

  // 均等間隔でサンプリング
  const step = Math.ceil(sortedRecords.length / maxRecords);
  for (let i = 0; i < sortedRecords.length; i += step) {
    importantIndices.add(i);
  }

  // インデックスをソートして対応するレコードを取得
  const sortedIndices = Array.from(importantIndices).sort((a, b) => a - b);
  const sampledRecords = sortedIndices.map(index => sortedRecords[index]).filter((record): record is MealRecord => record !== undefined);

  return {
    sampledRecords,
    samplingInfo: {
      applied: true,
      originalCount: mealRecords.length,
      sampledCount: sampledRecords.length,
    },
  };
}

/**
 * 日別カロリーデータのサンプリング
 */
export function sampleDailyCalories(
  dailyCalories: DailyCalorieData[],
  maxDataPoints: number = 200,
): {
    sampledData: DailyCalorieData[];
    samplingInfo: { applied: boolean; originalCount: number; sampledCount: number };
  } {
  if (dailyCalories.length <= maxDataPoints) {
    return {
      sampledData: dailyCalories,
      samplingInfo: {
        applied: false,
        originalCount: dailyCalories.length,
        sampledCount: dailyCalories.length,
      },
    };
  }

  // 時系列順にソート
  const sortedData = [...dailyCalories].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // 重要なデータポイントを保持
  const importantIndices = new Set<number>();

  // 最初と最後のデータポイントを保持
  importantIndices.add(0);
  if (sortedData.length > 1) {
    importantIndices.add(sortedData.length - 1);
  }

  // 極値（ピークと谷）を検出して保持
  for (let i = 1; i < sortedData.length - 1; i++) {
    const prevData = sortedData[i - 1];
    const currData = sortedData[i];
    const nextData = sortedData[i + 1];

    if (!prevData || !currData || !nextData) continue;

    const prev = prevData.calories;
    const curr = currData.calories;
    const next = nextData.calories;

    // ローカルピーク（極大値）またはローカル谷（極小値）
    if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
      importantIndices.add(i);
    }
  }

  // 月初や週末など重要な日付を保持（サンプリング対象が大量の場合は制限）
  if (sortedData.length > maxDataPoints * 2) {
    // 大量データの場合は月初のみ保持
    sortedData.forEach((data, index) => {
      const date = new Date(data.date);
      const dayOfMonth = date.getDate();

      if (dayOfMonth === 1) {
        importantIndices.add(index);
      }
    });
  }
  else {
    // 中程度のデータの場合は月初と週末を保持
    sortedData.forEach((data, index) => {
      const date = new Date(data.date);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();

      if (dayOfWeek === 0 || dayOfWeek === 6 || dayOfMonth === 1) {
        importantIndices.add(index);
      }
    });
  }

  // 均等間隔でサンプリング
  const step = Math.ceil(sortedData.length / maxDataPoints);
  for (let i = 0; i < sortedData.length; i += step) {
    importantIndices.add(i);
  }

  // インデックスをソートして対応するデータを取得
  let sortedIndices = Array.from(importantIndices).sort((a, b) => a - b);

  // 最大データポイント数を超えている場合は、さらに間引く
  if (sortedIndices.length > maxDataPoints) {
    const finalIndices = new Set<number>();

    // 最初と最後は必ず保持
    const firstIndex = sortedIndices[0];
    const lastIndex = sortedIndices[sortedIndices.length - 1];
    if (firstIndex !== undefined) finalIndices.add(firstIndex);
    if (lastIndex !== undefined) finalIndices.add(lastIndex);

    // 極値のインデックスを優先的に保持
    for (let i = 1; i < sortedData.length - 1; i++) {
      const prevData = sortedData[i - 1];
      const currData = sortedData[i];
      const nextData = sortedData[i + 1];

      if (!prevData || !currData || !nextData) continue;

      const prev = prevData.calories;
      const curr = currData.calories;
      const next = nextData.calories;

      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        finalIndices.add(i);
      }
    }

    // 残りの枠を均等間隔で埋める
    const remainingSlots = maxDataPoints - finalIndices.size;
    if (remainingSlots > 0) {
      const step = Math.ceil(sortedIndices.length / remainingSlots);
      for (let i = 0; i < sortedIndices.length; i += step) {
        const index = sortedIndices[i];
        if (index !== undefined) {
          finalIndices.add(index);
        }
        if (finalIndices.size >= maxDataPoints) break;
      }
    }

    sortedIndices = Array.from(finalIndices).sort((a, b) => a - b);
  }

  const sampledData = sortedIndices.map(index => sortedData[index]).filter((data): data is DailyCalorieData => data !== undefined);

  return {
    sampledData,
    samplingInfo: {
      applied: true,
      originalCount: dailyCalories.length,
      sampledCount: sampledData.length,
    },
  };
}

/**
 * Generate meal analytics
 */
export function generateMealAnalytics(
  mealRecords: MealRecord[],
): MealAnalytics {
  const dailyCalories = calculateDailyCalories(mealRecords);
  const dailyCaloriesByFoodType = calculateDailyCaloriesWithFoodType(mealRecords);
  const weeklyAverage = calculateWeeklyAverage(dailyCalories);
  const foodTypeBreakdown = calculateFoodTypeBreakdown(mealRecords);

  return {
    dailyCalories,
    dailyCaloriesByFoodType,
    weeklyAverage,
    foodTypeBreakdown,
  };
}

/**
 * Error handling utilities
 */

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  errors?: string[],
): { error: string; details?: string[] } {
  return {
    error: message,
    ...(errors && { details: errors }),
  };
}

/**
 * Check if error is validation error
 */
export function isValidationError(
  error: unknown,
): error is { success: false; errors: string[] } {
  return (
    typeof error === 'object'
    && error !== null
    && 'success' in error
    && 'errors' in error
  );
}
