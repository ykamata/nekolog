import { z } from 'zod';

/**
 * Daily Calendar validation schemas
 */

// Daily note input schema
export const dailyNoteInputSchema = z.object({
  catId: z.number({
    required_error: '猫IDは必須です',
    invalid_type_error: '猫IDは数値である必要があります',
  }).int('猫IDは整数である必要があります').positive('猫IDは正の数である必要があります'),

  date: z.coerce.date({
    required_error: '日付は必須です',
    invalid_type_error: '日付の形式が無効です',
  }),

  medicationId: z.number({
    invalid_type_error: '薬IDは数値である必要があります',
  }).int('薬IDは整数である必要があります').positive('薬IDは正の数である必要があります').nullable().optional(),

  emergencyMedication: z.boolean({
    invalid_type_error: '頓服薬フラグは真偽値である必要があります',
  }).optional().default(false),

  memo: z.string().max(1000, 'メモは1000文字以内で入力してください').nullable().optional(),
});

// Daily note update schema
export const dailyNoteUpdateSchema = z.object({
  medicationId: z.number().int().positive().nullable().optional(),
  emergencyMedication: z.boolean().optional(),
  memo: z.string().max(1000, 'メモは1000文字以内で入力してください').nullable().optional(),
}).strict();

// Daily note filter schema
export const dailyNoteFilterSchema = z.object({
  catId: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  startDate: z.string().transform(val => new Date(val)).pipe(z.date()).optional(),
  endDate: z.string().transform(val => new Date(val)).pipe(z.date()).optional(),
  hasEmergencyMedication: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  hasMemo: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
});

// Calendar data query schema
export const calendarDataQuerySchema = z.object({
  year: z.string().transform(Number).pipe(z.number().int().min(2000).max(2100)),
  month: z.string().transform(Number).pipe(z.number().int().min(1).max(12)),
  catId: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
});

// Type exports
export type DailyNoteInputSchema = z.infer<typeof dailyNoteInputSchema>;
export type DailyNoteUpdateSchema = z.infer<typeof dailyNoteUpdateSchema>;
export type DailyNoteFilterSchema = z.infer<typeof dailyNoteFilterSchema>;
export type CalendarDataQuerySchema = z.infer<typeof calendarDataQuerySchema>;
