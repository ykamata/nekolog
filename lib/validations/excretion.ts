import { z } from 'zod';
import { ExcretionType } from '~/types/excretion';

// 排泄記録作成用のスキーマ
export const ExcretionRecordInputSchema = z.object({
  catId: z.coerce.number().int().positive('猫を選択してください'),
  type: z.nativeEnum(ExcretionType, {
    errorMap: () => ({ message: '排泄タイプを選択してください' }),
  }),
  recordedAt: z.coerce.date().refine(
    date => date <= new Date(),
    '記録日時は現在時刻以前である必要があります',
  ),
  notes: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
});

// 排泄記録更新用のスキーマ
export const ExcretionRecordUpdateSchema = z.object({
  catId: z.coerce.number().int().positive('猫を選択してください').optional(),
  type: z.nativeEnum(ExcretionType, {
    errorMap: () => ({ message: '排泄タイプを選択してください' }),
  }).optional(),
  recordedAt: z.coerce.date().refine(
    date => date <= new Date(),
    '記録日時は現在時刻以前である必要があります',
  ).optional(),
  notes: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
});

// フィルタリング用のスキーマ
export const ExcretionRecordFilterSchema = z.object({
  catId: z.coerce.number().int().positive().optional(),
  type: z.nativeEnum(ExcretionType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: '開始日は終了日以前である必要があります',
    path: ['startDate'],
  },
);

// カレンダークエリ用のスキーマ
export const ExcretionCalendarQuerySchema = z.object({
  catId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// フォーム用のスキーマ（ISO文字列を受け取る）
export const ExcretionRecordFormSchema = z.object({
  catId: z.coerce.number().int().positive('猫を選択してください'),
  type: z.nativeEnum(ExcretionType, {
    errorMap: () => ({ message: '排泄タイプを選択してください' }),
  }),
  recordedAt: z.string().refine(
    (dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && date <= new Date();
    },
    '記録日時を入力してください',
  ),
  notes: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
});

// 型エクスポート
export type ExcretionRecordInput = z.infer<typeof ExcretionRecordInputSchema>;
export type ExcretionRecordUpdate = z.infer<typeof ExcretionRecordUpdateSchema>;
export type ExcretionRecordFilter = z.infer<typeof ExcretionRecordFilterSchema>;
export type ExcretionCalendarQuery = z.infer<typeof ExcretionCalendarQuerySchema>;
export type ExcretionRecordFormData = z.infer<typeof ExcretionRecordFormSchema>;
