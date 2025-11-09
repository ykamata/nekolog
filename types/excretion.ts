/**
 * 排泄記録関連の型定義
 */

// 排泄タイプ（Prismaのenumと一致させる）
export const ExcretionType = {
  URINE: 'URINE',
  FECES: 'FECES',
} as const;

export type ExcretionType = typeof ExcretionType[keyof typeof ExcretionType];

// 基本的な排泄記録
export interface ExcretionRecord {
  id: number;
  catId: number;
  type: ExcretionType;
  recordedAt: Date;
  memo?: string;
  notes?: string; // コンポーネントで使用されているnotesプロパティ
  createdAt: Date;
  updatedAt: Date;
  cat?: {
    id: number;
    name: string;
  };
}

// 排泄記録作成用の入力データ
export interface ExcretionRecordInput {
  catId: number;
  type: ExcretionType;
  recordedAt: Date;
  memo?: string;
  notes?: string;
}

// 排泄記録更新用の入力データ
export interface ExcretionRecordUpdateInput {
  type?: ExcretionType;
  recordedAt?: Date;
  memo?: string;
  notes?: string;
}

// 排泄記録検索・フィルタ条件
export interface ExcretionRecordFilter {
  catId?: number;
  type?: ExcretionType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// API レスポンス型
export interface ExcretionRecordsResponse {
  records: ExcretionRecord[];
  total: number;
  hasMore: boolean;
}

export interface ExcretionRecordResponse {
  record: ExcretionRecord;
  message?: string;
}

// カレンダー用のデータ型
export interface ExcretionCalendarDay {
  date: string; // YYYY-MM-DD形式
  records: ExcretionRecord[];
  hasUrine: boolean;
  hasFeces: boolean;
  hasNotes: boolean;
  urineCount: number;
  fecesCount: number;
  totalCount: number;
}

// カレンダー統計情報の型
export interface ExcretionCalendarStats {
  totalRecords: number;
  urineRecords: number;
  fecesRecords: number;
  daysWithRecords: number;
}

export interface ExcretionCalendarResponse {
  days: ExcretionCalendarDay[];
  records: ExcretionCalendarDay[]; // コンポーネントで使用されているrecordsプロパティ
  startDate: string;
  endDate: string;
  stats?: ExcretionCalendarStats; // 統計情報
}

// 排泄タイプのラベル
export const ExcretionTypeLabels = {
  [ExcretionType.URINE]: 'おしっこ',
  [ExcretionType.FECES]: 'うんち',
} as const;

// 排泄タイプの選択肢
export const ExcretionTypeOptions = [
  { value: ExcretionType.URINE, label: ExcretionTypeLabels[ExcretionType.URINE] },
  { value: ExcretionType.FECES, label: ExcretionTypeLabels[ExcretionType.FECES] },
] as const;
