import { z } from 'zod';

// 病院バリデーションスキーマ
export const veterinaryHospitalSchema = z.object({
  name: z.string()
    .min(1, '病院名は必須です')
    .max(100, '病院名は100文字以内で入力してください'),
  address: z.string()
    .max(200, '住所は200文字以内で入力してください')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^[0-9\-\(\)\s]*$/, '電話番号は数字、ハイフン、括弧のみ使用できます')
    .optional()
    .or(z.literal('')),
  memo: z.string()
    .max(500, 'メモは500文字以内で入力してください')
    .optional()
    .or(z.literal('')),
});

// 病院更新用スキーマ（IDを含む）
export const veterinaryHospitalUpdateSchema = veterinaryHospitalSchema.extend({
  id: z.string().min(1, 'IDは必須です'),
});

// 先生バリデーションスキーマ
export const veterinaryDoctorSchema = z.object({
  name: z.string()
    .min(1, '先生名は必須です')
    .max(50, '先生名は50文字以内で入力してください'),
  hospitalId: z.string()
    .min(1, '病院IDは必須です')
    .optional()
    .or(z.literal('')),
  specialty: z.string()
    .max(100, '専門分野は100文字以内で入力してください')
    .optional()
    .or(z.literal('')),
  memo: z.string()
    .max(500, 'メモは500文字以内で入力してください')
    .optional()
    .or(z.literal('')),
});

// 先生更新用スキーマ（IDを含む）
export const veterinaryDoctorUpdateSchema = veterinaryDoctorSchema.extend({
  id: z.string().min(1, 'IDは必須です'),
});

// 検索パラメータ用スキーマ
export const veterinarySearchSchema = z.object({
  query: z.string().optional(),
  hospitalId: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});
// Veterinary Master specific error classes
export class VeterinaryMasterError extends Error {
  constructor(
    message: string,
    public code: 'DUPLICATE_NAME' | 'HOSPITAL_HAS_DOCTORS' | 'HOSPITAL_HAS_VISITS' | 'HOSPITAL_HAS_APPOINTMENTS' | 'DOCTOR_HAS_VISITS' | 'DOCTOR_HAS_APPOINTMENTS' | 'NOT_FOUND' | 'INVALID_RELATIONSHIP',
    public statusCode: number = 400,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'VeterinaryMasterError';
  }
}

// Error message constants for consistency
export const VETERINARY_ERROR_MESSAGES = {
  HOSPITAL: {
    NOT_FOUND: '指定された病院が見つかりません',
    DUPLICATE_NAME: '同じ名前の病院が既に登録されています',
    HAS_DOCTORS: 'この病院には所属している先生がいるため削除できません',
    HAS_VISITS: 'この病院には通院記録があるため削除できません',
    HAS_APPOINTMENTS: 'この病院には予約があるため削除できません',
    CREATE_FAILED: '病院の登録に失敗しました',
    UPDATE_FAILED: '病院情報の更新に失敗しました',
    DELETE_FAILED: '病院の削除に失敗しました',
    FETCH_FAILED: '病院一覧の取得に失敗しました',
    SEARCH_FAILED: '病院の検索に失敗しました',
  },
  DOCTOR: {
    NOT_FOUND: '指定された先生が見つかりません',
    DUPLICATE_NAME: '同じ名前の先生が既に登録されています',
    HAS_VISITS: 'この先生には通院記録があるため削除できません',
    HAS_APPOINTMENTS: 'この先生には予約があるため削除できません',
    INVALID_HOSPITAL: '指定された病院が存在しません',
    CREATE_FAILED: '先生の登録に失敗しました',
    UPDATE_FAILED: '先生情報の更新に失敗しました',
    DELETE_FAILED: '先生の削除に失敗しました',
    FETCH_FAILED: '先生一覧の取得に失敗しました',
    SEARCH_FAILED: '先生の検索に失敗しました',
  },
  VALIDATION: {
    REQUIRED_FIELD: '必須項目が入力されていません',
    INVALID_FORMAT: '入力形式が正しくありません',
    TOO_LONG: '入力文字数が上限を超えています',
    INVALID_PHONE: '有効な電話番号を入力してください',
  },
  NETWORK: {
    CONNECTION_ERROR: 'ネットワーク接続エラーが発生しました',
    TIMEOUT: 'リクエストがタイムアウトしました',
    SERVER_ERROR: 'サーバーエラーが発生しました',
  },
} as const;

// Loading state types
export interface LoadingState {
  isLoading: boolean;
  operation?: 'fetch' | 'create' | 'update' | 'delete' | 'search';
  message?: string;
}

// Error state types
export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

// User feedback types
export interface UserFeedback {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

// APIルートパラメータ用スキーマ
export const veterinaryIdSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
});

// TypeScript型定義
export type VeterinaryHospitalInput = z.infer<typeof veterinaryHospitalSchema>;
export type VeterinaryHospitalUpdate = z.infer<typeof veterinaryHospitalUpdateSchema>;
export type VeterinaryDoctorInput = z.infer<typeof veterinaryDoctorSchema>;
export type VeterinaryDoctorUpdate = z.infer<typeof veterinaryDoctorUpdateSchema>;
export type VeterinarySearchParams = z.infer<typeof veterinarySearchSchema>;
export type VeterinaryIdParams = z.infer<typeof veterinaryIdSchema>;
