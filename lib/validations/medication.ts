import { z } from 'zod';
import {
  MedicationType,
  MedicationStatus,
  ReminderStatus,
} from '~/types/medication';

/**
 * Zod validation schemas for medication management
 */

// Base medication validation schema
export const MedicationInputSchema = z.object({
  name: z
    .string()
    .min(1, '薬名は必須です')
    .max(100, '薬名は100文字以内で入力してください')
    .trim(),
  type: z.nativeEnum(MedicationType, {
    errorMap: () => ({ message: '有効な薬のタイプを選択してください' }),
  }),
  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
  dosage: z
    .string()
    .max(100, '投与量は100文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
});

// Medication update schema (all fields optional except validation rules)
export const MedicationUpdateSchema = MedicationInputSchema.partial();

// Medication record validation schema
export const MedicationRecordInputSchema = z.object({
  catId: z.coerce.number().int().positive('猫を選択してください'),
  medicationId: z.coerce.number().int().positive('薬を選択してください'),
  quantity: z
    .number()
    .int('投与個数は整数で入力してください')
    .min(1, '投与個数は1以上で入力してください')
    .max(100, '投与個数は100以下で入力してください'),
  administeredAt: z.date({
    errorMap: () => ({ message: '有効な日時を入力してください' }),
  }),
  status: z.nativeEnum(MedicationStatus).optional(),
  notes: z
    .string()
    .max(500, 'メモは500文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
});

// Medication record update schema
export const MedicationRecordUpdateSchema
  = MedicationRecordInputSchema.partial();

// Base medication schedule schema without refinement
const MedicationScheduleBaseSchema = z.object({
  catId: z.coerce.number().int().positive('猫を選択してください'),
  medicationId: z.coerce.number().int().positive('薬を選択してください'),
  frequency: z
    .string()
    .min(1, '投与頻度を選択してください')
    .regex(
      /^(daily|twice_daily|weekly|monthly|custom)$/,
      '有効な投与頻度を選択してください',
    ),
  times: z
    .array(
      z
        .string()
        .regex(
          /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
          '有効な時間形式で入力してください (HH:MM)',
        ),
    )
    .min(1, '投与時間を少なくとも1つ設定してください')
    .max(10, '投与時間は10個まで設定できます'),
  startDate: z.date({
    errorMap: () => ({ message: '有効な開始日を入力してください' }),
  }),
  endDate: z
    .date({
      errorMap: () => ({ message: '有効な終了日を入力してください' }),
    })
    .optional(),
});

// Medication schedule validation schema with refinement
export const MedicationScheduleInputSchema
  = MedicationScheduleBaseSchema.refine(
    data => !data.endDate || data.endDate > data.startDate,
    {
      message: '終了日は開始日より後の日付を設定してください',
      path: ['endDate'],
    },
  );

// Medication schedule update schema (partial of base schema, then add refinement)
export const MedicationScheduleUpdateSchema
  = MedicationScheduleBaseSchema.partial().refine(
    data => !data.startDate || !data.endDate || data.endDate > data.startDate,
    {
      message: '終了日は開始日より後の日付を設定してください',
      path: ['endDate'],
    },
  );

// Medication reminder validation schema
export const MedicationReminderInputSchema = z.object({
  scheduleId: z.coerce.number().int().positive('スケジュールIDは必須です'),
  catId: z.coerce.number().int().positive('猫を選択してください'),
  medicationId: z.coerce.number().int().positive('薬を選択してください'),
  scheduledAt: z.date({
    errorMap: () => ({ message: '有効な予定日時を入力してください' }),
  }),
});

// Filter validation schemas
export const MedicationFilterSchema = z.object({
  name: z.string().optional(),
  type: z.nativeEnum(MedicationType).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const MedicationRecordFilterSchema = z
  .object({
    catId: z.coerce.number().int().positive().optional(),
    medicationId: z.coerce.number().int().positive().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    status: z.nativeEnum(MedicationStatus).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .refine(
    data =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: '終了日は開始日以降の日付を設定してください',
      path: ['endDate'],
    },
  );

export const MedicationScheduleFilterSchema = z.object({
  catId: z.coerce.number().int().positive().optional(),
  medicationId: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const MedicationReminderFilterSchema = z
  .object({
    catId: z.coerce.number().int().positive().optional(),
    medicationId: z.coerce.number().int().positive().optional(),
    scheduleId: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(ReminderStatus).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .refine(
    data =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: '終了日は開始日以降の日付を設定してください',
      path: ['endDate'],
    },
  );

// ID validation schema for route parameters
export const MedicationIdSchema = z.object({
  id: z.coerce.number().int().positive('有効なIDを指定してください'),
});

// Utility function to parse and validate medication input
export function validateMedicationInput(data: unknown) {
  return MedicationInputSchema.parse(data);
}

// Utility function to parse and validate medication record input
export function validateMedicationRecordInput(data: unknown) {
  return MedicationRecordInputSchema.parse(data);
}

// Utility function to parse and validate medication schedule input
export function validateMedicationScheduleInput(data: unknown) {
  return MedicationScheduleInputSchema.parse(data);
}

// Utility function to parse and validate medication reminder input
export function validateMedicationReminderInput(data: unknown) {
  return MedicationReminderInputSchema.parse(data);
}

// Type exports for use in other files
export type MedicationInputType = z.infer<typeof MedicationInputSchema>;
export type MedicationUpdateType = z.infer<typeof MedicationUpdateSchema>;
export type MedicationRecordInputType = z.infer<
  typeof MedicationRecordInputSchema
>;
export type MedicationRecordUpdateType = z.infer<
  typeof MedicationRecordUpdateSchema
>;
export type MedicationScheduleInputType = z.infer<
  typeof MedicationScheduleInputSchema
>;
export type MedicationScheduleUpdateType = z.infer<
  typeof MedicationScheduleUpdateSchema
>;
export type MedicationReminderInputType = z.infer<
  typeof MedicationReminderInputSchema
>;
export type MedicationFilterType = z.infer<typeof MedicationFilterSchema>;
export type MedicationRecordFilterType = z.infer<
  typeof MedicationRecordFilterSchema
>;
export type MedicationScheduleFilterType = z.infer<
  typeof MedicationScheduleFilterSchema
>;
export type MedicationReminderFilterType = z.infer<
  typeof MedicationReminderFilterSchema
>;
