// 共通型定義

export interface Cat {
  id: string;
  name: string;
  weight?: number;
  birthdate?: Date;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API共通レスポンス型
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// エラー型
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}
