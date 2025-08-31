/**
 * Zod validation schemas for cat meal management
 */

import { z } from 'zod';
import { FoodType } from '~/types/cat-meal';

// Enum schemas
export const FoodTypeSchema = z.nativeEnum(FoodType);

// Base validation schemas
export const CatSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
  name: z
    .string()
    .min(1, '猫の名前は必須です')
    .max(50, '猫の名前は50文字以内で入力してください'),
  birthdate: z.date().optional().nullable(),
  weight: z
    .number()
    .positive('体重は正の数値で入力してください')
    .max(20, '体重は20kg以下で入力してください')
    .optional()
    .nullable(),
  photoUrl: z.string().url('有効なURLを入力してください').optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FoodSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
  name: z
    .string()
    .min(1, 'フード名は必須です')
    .max(100, 'フード名は100文字以内で入力してください'),
  type: FoodTypeSchema,
  brand: z
    .string()
    .max(50, 'ブランド名は50文字以内で入力してください')
    .optional()
    .nullable(),
  caloriesPerGram: z
    .number()
    .positive('カロリーは正の数値で入力してください')
    .max(10, 'グラムあたりのカロリーは10以下で入力してください'),
  pricePerUnit: z
    .number()
    .positive('価格は正の数値で入力してください')
    .optional()
    .nullable(),
  unit: z
    .string()
    .min(1, '単位は必須です')
    .max(10, '単位は10文字以内で入力してください')
    .default('g'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MealRecordSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
  catId: z.string().min(1, '有効な猫IDを選択してください'),
  foodId: z.string().min(1, '有効なフードIDを選択してください'),
  quantity: z
    .number()
    .positive('量は正の数値で入力してください')
    .max(1000, '量は1000g以下で入力してください'),
  calories: z
    .number()
    .positive('カロリーは正の数値で入力してください')
    .max(5000, 'カロリーは5000以下で入力してください'),
  mealTime: z.date(),
  notes: z
    .string()
    .max(500, 'メモは500文字以内で入力してください')
    .optional()
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Input validation schemas
export const CatInputSchema = z.object({
  name: z
    .string()
    .min(1, '猫の名前は必須です')
    .max(50, '猫の名前は50文字以内で入力してください'),
  birthdate: z
    .union([
      z.string().transform((str) => {
        if (!str || str === '') return null;
        const date = new Date(str);
        return isNaN(date.getTime()) ? null : date;
      }),
      z.date(),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable(),
  weight: z
    .union([
      z.number(),
      z.string().transform((str) => {
        if (!str || str === '') return null;
        const num = parseFloat(str);
        return isNaN(num) ? null : num;
      }),
      z.null(),
      z.undefined(),
    ])
    .refine(val => val === null || val === undefined || (typeof val === 'number' && val > 0 && val <= 20), {
      message: '体重は正の数値で20kg以下で入力してください',
    })
    .optional()
    .nullable(),
  photoUrl: z
    .union([
      z.string().url('有効なURLを入力してください'),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      return val;
    }),
});

export const FoodInputSchema = z.object({
  name: z
    .string()
    .min(1, 'フード名は必須です')
    .max(100, 'フード名は100文字以内で入力してください'),
  type: FoodTypeSchema,
  brand: z
    .string()
    .max(50, 'ブランド名は50文字以内で入力してください')
    .optional()
    .nullable(),
  caloriesPerGram: z
    .number()
    .positive('カロリーは正の数値で入力してください')
    .max(10, 'グラムあたりのカロリーは10以下で入力してください'),
  pricePerUnit: z
    .number()
    .positive('価格は正の数値で入力してください')
    .optional()
    .nullable(),
  unit: z
    .string()
    .min(1, '単位は必須です')
    .max(10, '単位は10文字以内で入力してください')
    .default('g'),
});

export const MealRecordInputSchema = z.object({
  catId: z.string().min(1, '有効な猫IDを選択してください'),
  foodId: z.string().min(1, '有効なフードIDを選択してください'),
  quantity: z
    .number()
    .positive('量は正の数値で入力してください')
    .max(1000, '量は1000g以下で入力してください'),
  calories: z
    .number()
    .positive('カロリーは正の数値で入力してください')
    .max(5000, 'カロリーは5000以下で入力してください')
    .optional(),
  mealTime: z.date(),
  notes: z
    .string()
    .max(500, 'メモは500文字以内で入力してください')
    .optional()
    .nullable(),
});

// Update validation schemas
export const CatUpdateSchema = CatInputSchema.partial();
export const FoodUpdateSchema = FoodInputSchema.partial();
export const MealRecordUpdateSchema = MealRecordInputSchema.partial();

// Filter validation schemas
export const MealRecordFilterSchema = z.object({
  catId: z.string().min(1).optional(),
  foodId: z.string().min(1).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  foodType: FoodTypeSchema.optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export const CatFilterSchema = z.object({
  name: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export const FoodFilterSchema = z.object({
  name: z.string().optional(),
  type: FoodTypeSchema.optional(),
  brand: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// Special validation schemas for form handling
export const MealRecordFormSchema = z.object({
  catId: z.string().min(1, '猫を選択してください'),
  foodId: z.string().min(1, 'フードを選択してください'),
  quantity: z
    .number()
    .positive('量は正の数値で入力してください')
    .max(1000, '量は1000g以下で入力してください'),
  calories: z
    .number()
    .positive('カロリーは正の数値で入力してください')
    .max(5000, 'カロリーは5000以下で入力してください')
    .optional(),
  mealTime: z.date(),
  notes: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
});

// Date range validation
export const DateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine(data => data.startDate <= data.endDate, {
    message: '開始日は終了日より前の日付を選択してください',
    path: ['endDate'],
  });

// Quantity input validation (supports both grams and calories)
export const QuantityInputSchema = z.object({
  value: z.number().positive('量は正の数値で入力してください'),
  unit: z.enum(['g', 'cal'], { message: '単位はgまたはcalを選択してください' }),
});

export type CatInput = z.infer<typeof CatInputSchema>;
export type FoodInput = z.infer<typeof FoodInputSchema>;
export type MealRecordInput = z.infer<typeof MealRecordInputSchema>;
export type CatUpdate = z.infer<typeof CatUpdateSchema>;
export type FoodUpdate = z.infer<typeof FoodUpdateSchema>;
export type MealRecordUpdate = z.infer<typeof MealRecordUpdateSchema>;
export type MealRecordFilter = z.infer<typeof MealRecordFilterSchema>;
export type CatFilter = z.infer<typeof CatFilterSchema>;
export type FoodFilter = z.infer<typeof FoodFilterSchema>;
export type MealRecordForm = z.infer<typeof MealRecordFormSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type QuantityInput = z.infer<typeof QuantityInputSchema>;
