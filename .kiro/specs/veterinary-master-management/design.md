# Design Document

## Overview

病院・先生管理マスタ機能は、飼い猫の通院履歴管理や予約管理で使用する病院と先生の情報を効率的に管理するシステムです。既存の通院記録・予約機能との連携を重視し、ユーザーの入力効率を向上させることを目的としています。

## Architecture

### システム構成

```
Frontend (Nuxt 3 + TypeScript)
├── Pages
│   ├── /veterinary-hospitals (病院管理)
│   └── /veterinary-doctors (先生管理)
├── Components
│   ├── VeterinaryHospitalForm
│   ├── VeterinaryHospitalList
│   ├── VeterinaryDoctorForm
│   ├── VeterinaryDoctorList
│   └── VeterinaryMasterSelector (既存機能との連携)
├── Composables
│   ├── useVeterinaryHospitals
│   └── useVeterinaryDoctors
└── Stores
    ├── veterinaryHospitals
    └── veterinaryDoctors

Backend (Nuxt Server API)
├── /api/veterinary-hospitals
├── /api/veterinary-doctors
└── Database (Prisma + SQLite/MySQL)
```

### 技術スタック

- **Frontend**: Nuxt 3, TypeScript, Tailwind CSS, Pinia
- **Backend**: Nuxt Server API, Prisma ORM
- **Database**: SQLite (開発), MySQL (本番)
- **Validation**: Zod
- **Authentication**: JWT + HTTP-only cookies

## Components and Interfaces

### Core Components

#### 1. VeterinaryHospitalForm

病院の登録・編集フォームコンポーネント

```typescript
interface VeterinaryHospitalFormProps {
  hospital?: VeterinaryHospital
  mode: 'create' | 'edit'
}

interface VeterinaryHospitalFormEmits {
  save: (hospital: VeterinaryHospitalInput) => void
  cancel: () => void
}
```

#### 2. VeterinaryHospitalList

病院一覧表示コンポーネント

```typescript
interface VeterinaryHospitalListProps {
  searchQuery?: string
  showDoctorCount?: boolean
}

interface VeterinaryHospitalListEmits {
  edit: (hospital: VeterinaryHospital) => void
  delete: (hospitalId: string) => void
  view: (hospital: VeterinaryHospital) => void
}
```

#### 3. VeterinaryDoctorForm

先生の登録・編集フォームコンポーネント

```typescript
interface VeterinaryDoctorFormProps {
  doctor?: VeterinaryDoctor
  mode: 'create' | 'edit'
  preselectedHospitalId?: string
}

interface VeterinaryDoctorFormEmits {
  save: (doctor: VeterinaryDoctorInput) => void
  cancel: () => void
}
```

#### 4. VeterinaryDoctorList

先生一覧表示コンポーネント

```typescript
interface VeterinaryDoctorListProps {
  searchQuery?: string
  hospitalFilter?: string
  showHospitalName?: boolean
}

interface VeterinaryDoctorListEmits {
  edit: (doctor: VeterinaryDoctor) => void
  delete: (doctorId: string) => void
}
```

#### 5. VeterinaryMasterSelector (既存機能強化)

通院記録・予約フォームで使用する選択コンポーネント

```typescript
interface VeterinaryMasterSelectorProps {
  type: 'hospital' | 'doctor'
  selectedHospitalId?: string // 先生選択時の病院フィルタ用
  allowFreeInput: boolean
  placeholder?: string
}

interface VeterinaryMasterSelectorEmits {
  select: (item: VeterinaryHospital | VeterinaryDoctor) => void
  createNew: (name: string) => void
}
```

### Composables

#### useVeterinaryHospitals

病院管理のビジネスロジック

```typescript
export const useVeterinaryHospitals = () => {
  const hospitals = ref<VeterinaryHospital[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchHospitals = async (searchQuery?: string) => { /* ... */ }
  const createHospital = async (hospital: VeterinaryHospitalInput) => { /* ... */ }
  const updateHospital = async (id: string, hospital: VeterinaryHospitalInput) => { /* ... */ }
  const deleteHospital = async (id: string) => { /* ... */ }
  const searchHospitals = async (query: string) => { /* ... */ }

  return {
    hospitals: readonly(hospitals),
    loading: readonly(loading),
    error: readonly(error),
    fetchHospitals,
    createHospital,
    updateHospital,
    deleteHospital,
    searchHospitals
  }
}
```

#### useVeterinaryDoctors

先生管理のビジネスロジック

```typescript
export const useVeterinaryDoctors = () => {
  const doctors = ref<VeterinaryDoctor[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchDoctors = async (hospitalId?: string, searchQuery?: string) => { /* ... */ }
  const createDoctor = async (doctor: VeterinaryDoctorInput) => { /* ... */ }
  const updateDoctor = async (id: string, doctor: VeterinaryDoctorInput) => { /* ... */ }
  const deleteDoctor = async (id: string) => { /* ... */ }
  const searchDoctors = async (query: string, hospitalId?: string) => { /* ... */ }

  return {
    doctors: readonly(doctors),
    loading: readonly(loading),
    error: readonly(error),
    fetchDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    searchDoctors
  }
}
```

## Data Models

### Database Schema (Prisma)

```prisma
model VeterinaryHospital {
  id        String   @id @default(cuid())
  name      String   @unique
  address   String?
  phone     String?
  memo      String?
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user    User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  doctors VeterinaryDoctor[]
  visits  VeterinaryVisit[]

  @@map("veterinary_hospitals")
}

model VeterinaryDoctor {
  id           String  @id @default(cuid())
  name         String  @unique
  hospitalId   String?
  specialty    String?
  memo         String?
  userId       String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  user     User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  hospital VeterinaryHospital? @relation(fields: [hospitalId], references: [id], onDelete: SetNull)
  visits   VeterinaryVisit[]

  @@map("veterinary_doctors")
}
```

### TypeScript Types

```typescript
// Base types
export interface VeterinaryHospital {
  id: string
  name: string
  address?: string
  phone?: string
  memo?: string
  userId: string
  createdAt: Date
  updatedAt: Date
  doctors?: VeterinaryDoctor[]
  _count?: {
    doctors: number
  }
}

export interface VeterinaryDoctor {
  id: string
  name: string
  hospitalId?: string
  specialty?: string
  memo?: string
  userId: string
  createdAt: Date
  updatedAt: Date
  hospital?: VeterinaryHospital
}

// Input types
export interface VeterinaryHospitalInput {
  name: string
  address?: string
  phone?: string
  memo?: string
}

export interface VeterinaryDoctorInput {
  name: string
  hospitalId?: string
  specialty?: string
  memo?: string
}

// Search and filter types
export interface VeterinarySearchParams {
  query?: string
  hospitalId?: string
  limit?: number
  offset?: number
}

export interface VeterinarySearchResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}
```

## Error Handling

### Validation Errors

Zodスキーマを使用した入力値検証

```typescript
// lib/validations/veterinary-master.ts
export const veterinaryHospitalSchema = z.object({
  name: z.string().min(1, '病院名は必須です').max(100, '病院名は100文字以内で入力してください'),
  address: z.string().max(200, '住所は200文字以内で入力してください').optional(),
  phone: z.string().regex(/^[0-9\-\(\)\s]*$/, '電話番号は数字、ハイフン、括弧のみ使用できます').optional(),
  memo: z.string().max(500, 'メモは500文字以内で入力してください').optional()
})

export const veterinaryDoctorSchema = z.object({
  name: z.string().min(1, '先生名は必須です').max(50, '先生名は50文字以内で入力してください'),
  hospitalId: z.string().min(1, "IDは必須です").optional(),
  specialty: z.string().max(100, '専門分野は100文字以内で入力してください').optional(),
  memo: z.string().max(500, 'メモは500文字以内で入力してください').optional()
})
```

### Business Logic Errors

```typescript
export class VeterinaryMasterError extends Error {
  constructor(
    message: string,
    public code: 'DUPLICATE_NAME' | 'HOSPITAL_HAS_DOCTORS' | 'DOCTOR_HAS_VISITS' | 'NOT_FOUND',
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'VeterinaryMasterError'
  }
}

// Usage in API routes
if (existingHospital) {
  throw new VeterinaryMasterError(
    '同じ名前の病院が既に登録されています',
    'DUPLICATE_NAME',
    409
  )
}
```

### API Error Responses

```typescript
// Standardized error response format
export interface ApiErrorResponse {
  error: {
    message: string
    code: string
    details?: Record<string, any>
  }
}
```

## Testing Strategy

### Unit Tests

- **Composables**: `tests/composables/useVeterinaryHospitals.test.ts`, `tests/composables/useVeterinaryDoctors.test.ts`
- **API Routes**: `tests/api/veterinary-hospitals-unit.test.ts`, `tests/api/veterinary-doctors-unit.test.ts`
- **Validation**: `tests/validations/veterinary-master-schemas.test.ts`
- **Components**: `tests/components/VeterinaryHospitalForm.test.ts`, `tests/components/VeterinaryDoctorForm.test.ts`

### Integration Tests

- **Database Operations**: `tests/integration/veterinary-master-database.test.ts`
- **API Integration**: `tests/integration/veterinary-master-api.test.ts`
- **Component Integration**: `tests/integration/veterinary-master-components.test.ts`

### E2E Tests

- **Hospital Management Workflow**: `tests/e2e/veterinary-hospital-management.test.ts`
- **Doctor Management Workflow**: `tests/e2e/veterinary-doctor-management.test.ts`
- **Integration with Visit Records**: `tests/e2e/veterinary-master-integration.test.ts`
- **Responsive Design**: `tests/e2e/veterinary-master-responsive.test.ts`

### Performance Tests

- **Large Dataset Handling**: `tests/performance/veterinary-master-performance.test.ts`
- **Search Performance**: `tests/performance/veterinary-search-performance.test.ts`

## Security Considerations

### Authentication & Authorization

- 全てのAPIエンドポイントで認証チェック
- ユーザーは自分が作成したデータのみアクセス可能
- JWT トークンの適切な検証

### Input Sanitization

- Zodスキーマによる入力値検証
- XSS攻撃防止のためのHTMLエスケープ
- SQLインジェクション防止（Prismaの型安全性を活用）

### Data Privacy

- 個人情報の適切な暗号化
- ログに機密情報を出力しない
- GDPR準拠のデータ削除機能

## Performance Optimization

### Database Optimization

- 適切なインデックス設定（name, userId）
- N+1問題の回避（include/selectの適切な使用）
- ページネーション実装

### Frontend Optimization

- コンポーネントの遅延読み込み
- 検索結果のデバウンス処理
- キャッシュ戦略（Pinia store）

### API Optimization

- レスポンス時間の最適化（1秒以内）
- 適切なHTTPステータスコード
- エラーレスポンスの標準化

## Integration with Existing Features

### VeterinaryMasterSelector Enhancement

既存の `VeterinaryMasterSelector` コンポーネントを拡張し、以下の機能を追加：

1. **自由入力 + 曖昧検索**
   - ユーザーが入力した内容に基づく部分一致検索
   - リアルタイム検索結果表示

2. **マスタ自動追加**
   - 新しい名前が入力された場合の確認ダイアログ
   - ワンクリックでマスタに追加

3. **病院-先生連携**
   - 病院選択時に所属先生のフィルタリング
   - 先生選択時の所属病院自動設定

### Database Migration

既存のテーブル構造との整合性を保つため、以下の移行戦略を採用：

1. **段階的移行**
   - 新しいマスタテーブル作成
   - 既存データの移行スクリプト
   - 旧システムとの並行運用期間

2. **データ整合性**
   - 外部キー制約の適切な設定
   - カスケード削除の制御
   - データ重複の解決

## Responsive Design Strategy

### Mobile-First Approach

- スマートフォンでの操作性を最優先
- タッチフレンドリーなUI要素
- 適切なフォントサイズとボタンサイズ

### Breakpoint Strategy

```css
/* Tailwind CSS breakpoints */
sm: 640px   /* スマートフォン横向き */
md: 768px   /* タブレット */
lg: 1024px  /* デスクトップ */
xl: 1280px  /* 大画面デスクトップ */
```

### Component Responsiveness

- フォームレイアウトの動的調整
- 一覧表示の列数調整
- ナビゲーションの最適化

## Deployment Considerations

### Environment Configuration

- 開発環境: SQLite + 自動マイグレーション
- 本番環境: MySQL + 手動マイグレーション確認

### Docker Configuration

```dockerfile
# 本番環境用の最適化設定
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### CI/CD Pipeline

- GitHub Actions による自動テスト
- Self-hosted runner でのデプロイ
- データベースマイグレーションの自動実行

## Monitoring and Logging

### Application Monitoring

- API レスポンス時間の監視
- エラー率の追跡
- ユーザー操作の分析

### Error Logging

```typescript
// lib/logger.ts を使用した構造化ログ
logger.error('Veterinary hospital creation failed', {
  userId,
  hospitalName,
  error: error.message,
  timestamp: new Date().toISOString()
})
```

### Performance Metrics

- データベースクエリ実行時間
- フロントエンド描画時間
- メモリ使用量の監視
