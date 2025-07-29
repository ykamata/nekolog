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
  id: string;
  name: string;
  birthdate?: Date;
  weight?: number;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Food {
  id: string;
  name: string;
  type: FoodType;
  brand?: string;
  caloriesPerGram: number;
  pricePerUnit?: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealRecord {
  id: string;
  catId: string;
  foodId: string;
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
  birthdate?: Date;
  weight?: number;
  photoUrl?: string;
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
  catId: string;
  foodId: string;
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

export interface MealAnalytics {
  dailyCalories: DailyCalorieData[];
  weeklyAverage: number;
  foodTypeBreakdown: {
    type: FoodType;
    percentage: number;
  }[];
}

// Filter interfaces
export interface MealRecordFilter {
  catId?: string;
  foodId?: string;
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
