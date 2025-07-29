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
    mealTime: new Date(prismaMealRecord.mealTime),
    notes: prismaMealRecord.notes,
    createdAt: new Date(prismaMealRecord.createdAt),
    updatedAt: new Date(prismaMealRecord.updatedAt),
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
 * Calculate daily calories from meal records
 */
export function calculateDailyCalories(
  mealRecords: MealRecord[],
): DailyCalorieData[] {
  const groupedByDate = groupMealRecordsByDate(mealRecords);

  return Object.entries(groupedByDate)
    .map(([date, records]) => {
      const totalCalories = records.reduce(
        (sum, record) => sum + record.calories,
        0,
      );
      const foodTypes = records
        .map(record => record.food?.type)
        .filter(Boolean);
      const primaryType
        = foodTypes.length > 0 ? (foodTypes[0] as FoodType) : ('DRY' as FoodType);

      return {
        date,
        calories: Math.round(totalCalories * 100) / 100,
        type: primaryType,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Calculate food type breakdown
 */
export function calculateFoodTypeBreakdown(
  mealRecords: MealRecord[],
): { type: FoodType; percentage: number }[] {
  const totalCalories = mealRecords.reduce(
    (sum, record) => sum + record.calories,
    0,
  );

  if (totalCalories === 0) {
    return [
      { type: 'DRY' as FoodType, percentage: 0 },
      { type: 'WET' as FoodType, percentage: 0 },
    ];
  }

  const dryCalories = mealRecords
    .filter(record => record.food?.type === 'DRY')
    .reduce((sum, record) => sum + record.calories, 0);

  const wetCalories = mealRecords
    .filter(record => record.food?.type === 'WET')
    .reduce((sum, record) => sum + record.calories, 0);

  return [
    {
      type: 'DRY' as FoodType,
      percentage: Math.round((dryCalories / totalCalories) * 100),
    },
    {
      type: 'WET' as FoodType,
      percentage: Math.round((wetCalories / totalCalories) * 100),
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
 * Generate meal analytics
 */
export function generateMealAnalytics(
  mealRecords: MealRecord[],
): MealAnalytics {
  const dailyCalories = calculateDailyCalories(mealRecords);
  const weeklyAverage = calculateWeeklyAverage(dailyCalories);
  const foodTypeBreakdown = calculateFoodTypeBreakdown(mealRecords);

  return {
    dailyCalories,
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
