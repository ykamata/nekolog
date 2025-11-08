/**
 * Core data models for cat meal management
 */

// Enums
export enum FoodType {
  DRY = 'DRY',
  WET = 'WET',
}

// Core entity interfaces
export interface Cat {
  id: number;
  name: string;
  birthdate?: Date | null;
  weight?: number | null;
  photoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Food {
  id: number;
  name: string;
  type: FoodType;
  brand?: string;
  caloriesPerGram: number;
  pricePerUnit?: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    meals: number;
  };
}

export interface MealRecord {
  id: number;
  catId: number;
  foodId: number;
  quantity: number;
  calories: number;
  mealTime: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  cat?: Cat;
  food?: Food;
}

// Input/Form interfaces
export interface CatInput {
  name: string;
  birthdate?: Date | null;
  weight?: number | null;
  photoUrl?: string | null;
}

export interface FoodInput {
  name: string;
  type: FoodType;
  brand?: string;
  caloriesPerGram: number;
  pricePerUnit?: number;
  unit?: string;
}

export interface MealRecordInput {
  catId: number;
  foodId: number;
  quantity: number;
  calories?: number;
  mealTime: Date;
  notes?: string;
}

// Update types
export type CatUpdate = Partial<CatInput>;
export type FoodUpdate = Partial<FoodInput>;
export type MealRecordUpdate = Partial<MealRecordInput>;

// Analytics interfaces
export interface DailyCalorieData {
  date: string;
  calories: number;
  type: FoodType;
}

export interface DailyCalorieByFoodType {
  date: string;
  dryCalories: number;
  wetCalories: number;
  totalCalories: number;
}

export interface FoodTypeBreakdown {
  type: FoodType;
  percentage: number;
  totalCalories: number;
  totalWeight: number;
}

export interface MealAnalytics {
  dailyCalories: DailyCalorieData[];
  dailyCaloriesByFoodType: DailyCalorieByFoodType[];
  weeklyAverage: number;
  foodTypeBreakdown: FoodTypeBreakdown[];
}

// Filter interfaces
export interface MealRecordFilter {
  catId?: number;
  foodId?: number;
  startDate?: Date;
  endDate?: Date;
  foodType?: FoodType;
  limit?: number;
  offset?: number;
}

export interface CatFilter {
  name?: string;
  limit?: number;
  offset?: number;
}

export interface FoodFilter {
  name?: string;
  type?: FoodType;
  brand?: string;
  limit?: number;
  offset?: number;
}
