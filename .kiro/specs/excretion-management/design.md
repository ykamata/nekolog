# Design Document

## Overview

排泄管理機能は、飼い猫の排泄（おしっこ・うんち）記録を管理し、健康状態を把握するためのシステムです。既存の食事管理機能と同様のアーキテクチャを採用し、個体別の記録管理、カレンダー表示、CRUD操作を提供します。

### 主要機能

- 排泄記録の登録・編集・削除
- 個体別記録管理
- カレンダー形式での視覚的表示
- 検索・フィルタリング機能
- レスポンシブデザイン対応

## Architecture

### システム構成

```
Frontend (Nuxt 3)
├── Pages (排泄記録管理画面)
├── Components (フォーム、カレンダー、リスト)
├── Composables (状態管理、API通信)
├── Types (TypeScript型定義)
└── Validations (Zodスキーマ)

Backend (Nitro API)
├── API Routes (REST endpoints)
├── Database (Prisma ORM)
└── Validations (サーバーサイド検証)

Database (SQLite/MySQL)
└── ExcretionRecord テーブル
```

### データフロー

1. ユーザーがフォームで排泄記録を入力
2. クライアントサイドでZodによる検証
3. API経由でサーバーに送信
4. サーバーサイドで再検証
5. Prismaを通じてデータベースに保存
6. レスポンスをクライアントに返却
7. UI状態を更新

## Components and Interfaces

### データベースモデル

#### ExcretionRecord テーブル

```prisma
model ExcretionRecord {
  id           String        @id @default(cuid())
  catId        String
  type         ExcretionType
  recordedAt   DateTime
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  cat          Cat           @relation(fields: [catId], references: [id], onDelete: Cascade)

  @@map("excretion_records")
}

enum ExcretionType {
  URINE    // おしっこ
  FECES    // うんち
}
```

### TypeScript型定義

#### 基本型

```typescript
export enum ExcretionType {
  URINE = 'URINE',
  FECES = 'FECES',
}

export interface ExcretionRecord {
  id: string;
  catId: string;
  type: ExcretionType;
  recordedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  cat?: Cat;
}

export interface ExcretionRecordInput {
  catId: string;
  type: ExcretionType;
  recordedAt: Date;
  notes?: string;
}

export interface ExcretionRecordFilter {
  catId?: string;
  type?: ExcretionType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
```

### Zodバリデーションスキーマ

```typescript
export const ExcretionRecordInputSchema = z.object({
  catId: z.string().min(1, '猫を選択してください'),
  type: z.nativeEnum(ExcretionType, {
    errorMap: () => ({ message: '排泄タイプを選択してください' }),
  }),
  recordedAt: z.date({
    errorMap: () => ({ message: '記録日時を入力してください' }),
  }),
  notes: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
});

export const ExcretionRecordFormSchema = ExcretionRecordInputSchema.extend({
  recordedAt: z.date(),
});
```

### コンポーネント設計

#### 1. ExcretionRecordForm.vue

- 排泄記録の入力フォーム
- 猫選択、排泄タイプ選択、日時入力、メモ入力
- リアルタイムバリデーション
- 既存のMealRecordFormと同様の構造

#### 2. ExcretionRecordList.vue

- 排泄記録の一覧表示
- フィルタリング機能（猫別、タイプ別、日付範囲）
- 編集・削除アクション
- ページネーション対応

#### 3. ExcretionCalendar.vue

- カレンダー形式での記録表示
- 日付別の記録マーク表示
- メモ付き記録の強調表示
- 日付クリックで詳細表示

#### 4. ExcretionRecordCard.vue

- 個別記録の表示カード
- 編集・削除ボタン
- 猫情報、時間、タイプ、メモの表示

### API エンドポイント

#### REST API設計

```
GET    /api/excretion-records          # 記録一覧取得
POST   /api/excretion-records          # 新規記録作成
GET    /api/excretion-records/[id]     # 特定記録取得
PUT    /api/excretion-records/[id]     # 記録更新
DELETE /api/excretion-records/[id]     # 記録削除
GET    /api/excretion-records/calendar # カレンダー用データ取得
```

#### APIレスポンス形式

```typescript
// 一覧取得レスポンス
interface ExcretionRecordsResponse {
  records: ExcretionRecord[];
  total: number;
  page: number;
  limit: number;
}

// 作成・更新レスポンス
interface ExcretionRecordResponse {
  record: ExcretionRecord;
  message: string;
}

// カレンダー用レスポンス
interface ExcretionCalendarResponse {
  records: Array<{
    date: string;
    records: Array<{
      id: string;
      type: ExcretionType;
      time: string;
      hasNotes: boolean;
    }>;
  }>;
}
```

### Composables設計

#### useExcretionRecords.ts

```typescript
export const useExcretionRecords = () => {
  const records = ref<ExcretionRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchRecords = async (filter?: ExcretionRecordFilter) => {
    // 記録一覧取得
  };

  const createRecord = async (input: ExcretionRecordInput) => {
    // 新規記録作成
  };

  const updateRecord = async (id: string, input: Partial<ExcretionRecordInput>) => {
    // 記録更新
  };

  const deleteRecord = async (id: string) => {
    // 記録削除
  };

  return {
    records: readonly(records),
    loading: readonly(loading),
    error: readonly(error),
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};
```

## Data Models

### データベース関係

```
Cat (1) ←→ (N) ExcretionRecord
```

### インデックス設計

```sql
-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_excretion_records_cat_id ON excretion_records(cat_id);
CREATE INDEX idx_excretion_records_recorded_at ON excretion_records(recorded_at);
CREATE INDEX idx_excretion_records_type ON excretion_records(type);
CREATE INDEX idx_excretion_records_cat_recorded ON excretion_records(cat_id, recorded_at);
```

### データ制約

- catId: 必須、外部キー制約
- type: 必須、URINE または FECES
- recordedAt: 必須、未来日時は不可
- notes: 任意、最大500文字

## Error Handling

### クライアントサイドエラー処理

#### バリデーションエラー

```typescript
// フォームバリデーション
const validateForm = (): boolean => {
  try {
    ExcretionRecordFormSchema.parse(formData.value);
    errors.value = {};
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.value = formatZodErrors(error);
    }
    return false;
  }
};
```

#### API通信エラー

```typescript
// API呼び出しエラー処理
const handleApiError = (error: any) => {
  if (error.statusCode === 404) {
    showToast('記録が見つかりません', 'error');
  } else if (error.statusCode === 400) {
    showToast('入力データに問題があります', 'error');
  } else {
    showToast('予期しないエラーが発生しました', 'error');
  }
};
```

### サーバーサイドエラー処理

#### 共通エラーハンドラー

```typescript
export const handleExcretionRecordError = (error: unknown) => {
  if (error instanceof z.ZodError) {
    throw createError({
      statusCode: 400,
      statusMessage: '入力データが無効です',
      data: error.errors,
    });
  }

  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: '重複する記録が存在します',
      });
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Internal server error',
  });
};
```

## Testing Strategy

### 単体テスト (Vitest)

#### コンポーネントテスト

```typescript
// ExcretionRecordForm.test.ts
describe('ExcretionRecordForm', () => {
  it('should validate required fields', () => {
    // 必須項目のバリデーションテスト
  });

  it('should emit submit event with correct data', () => {
    // 送信イベントのテスト
  });

  it('should handle cat selection', () => {
    // 猫選択のテスト
  });
});
```

#### Composableテスト

```typescript
// useExcretionRecords.test.ts
describe('useExcretionRecords', () => {
  it('should fetch records successfully', () => {
    // 記録取得のテスト
  });

  it('should create record with validation', () => {
    // 記録作成のテスト
  });

  it('should handle API errors', () => {
    // エラーハンドリングのテスト
  });
});
```

### APIテスト

#### エンドポイントテスト

```typescript
// excretion-records-api.test.ts
describe('/api/excretion-records', () => {
  it('should create excretion record', async () => {
    // POST APIのテスト
  });

  it('should validate input data', async () => {
    // バリデーションのテスト
  });

  it('should filter records by cat', async () => {
    // フィルタリングのテスト
  });
});
```

### E2Eテスト (Playwright)

#### ワークフローテスト

```typescript
// excretion-management.e2e.test.ts
test('excretion record management workflow', async ({ page }) => {
  // 記録作成から削除までの一連の流れをテスト
  await page.goto('/excretion-records');
  
  // 新規記録作成
  await page.click('[data-testid="add-record-button"]');
  await page.selectOption('[data-testid="cat-select"]', 'cat-1');
  await page.selectOption('[data-testid="type-select"]', 'URINE');
  await page.click('[data-testid="submit-button"]');
  
  // 記録が表示されることを確認
  await expect(page.locator('[data-testid="record-list"]')).toContainText('おしっこ');
});
```

### パフォーマンステスト

#### データベースクエリ最適化

- 大量データでの一覧取得性能
- カレンダー表示時のクエリ効率
- インデックス効果の検証

#### フロントエンド性能

- コンポーネントレンダリング時間
- 大量記録表示時のメモリ使用量
- カレンダーナビゲーション応答性
