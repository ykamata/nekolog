import { z } from 'zod';

/**
 * Health Signal validation schemas
 */

// Enum schema for HealthSignalColor
export const healthSignalColorSchema = z.enum(['GREEN', 'YELLOW', 'RED'], {
  errorMap: () => ({ message: 'シグナルカラーはGREEN、YELLOW、REDのいずれかである必要があります' }),
});

// Create health signal schema
export const createCatHealthSignalSchema = z.object({
  catId: z.number().int().positive({
    message: '猫IDは正の整数である必要があります',
  }),
  date: z.coerce.date({
    errorMap: () => ({ message: '有効な日付を入力してください' }),
  }),
  color: healthSignalColorSchema,
  note: z.string().max(500, {
    message: 'メモは500文字以内で入力してください',
  }).optional().nullable(),
});

// Update health signal schema
export const updateCatHealthSignalSchema = z.object({
  color: healthSignalColorSchema.optional(),
  note: z.string().max(500, {
    message: 'メモは500文字以内で入力してください',
  }).optional().nullable(),
});

// Query schema for fetching health signals
export const healthSignalQuerySchema = z.object({
  catId: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  color: healthSignalColorSchema.optional(),
});

// ID parameter schema
export const healthSignalIdSchema = z.object({
  id: z.string().transform(Number).pipe(z.number().int().positive({
    message: '有効なIDを指定してください',
  })),
});
