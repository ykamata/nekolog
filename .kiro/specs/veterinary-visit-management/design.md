# 通院履歴管理機能 設計ドキュメント

## 概要

通院履歴管理機能は、飼い猫の通院記録と予約を管理するシステムです。既存の猫健康管理アプリに統合され、Nuxt 3 + Prisma + TypeScript の技術スタックを使用して実装されます。カレンダー形式での視覚的な管理と、詳細な記録管理を提供します。

## アーキテクチャ

### システム構成

```mermaid
graph TB
    subgraph "フロントエンド層"
        A[通院履歴ページ] --> B[カレンダーコンポーネント]
        A --> C[記録フォーム]
        A --> D[一覧表示]
        E[予約管理ページ] --> B
        E --> F[予約フォーム]
    end
    
    subgraph "API層"
        G[/api/veterinary-visits] --> H[CRUD操作]
        I[/api/veterinary-appointments] --> J[予約管理]
        K[/api/veterinary-hospitals] --> L[病院マスタ]
        M[/api/veterinary-doctors] --> N[先生マスタ]
        O[/api/veterinary-treatments] --> P[処方内容マスタ]
    end
    
    subgraph "データ層"
        Q[(Prisma ORM)]
        R[(SQLite/MySQL)]
    end
    
    A --> G
    E --> I
    C --> K
    C --> M
    C --> O
    H --> Q
    J --> Q
    L --> Q
    N --> Q
    P --> Q
    Q --> R
```

### データフロー

1. **記録作成**: フォーム入力 → バリデーション → API送信 → DB保存 → UI更新
2. **カレンダー表示**: 日付範囲指定 → API取得 → データ変換 → カレンダー描画
3. **マスタ管理**: 新規入力 → 既存チェック → マスタ追加 → 選択肢更新

## コンポーネントとインターフェース

### データモデル

#### VeterinaryVisit（通院記録）

```typescript
interface VeterinaryVisit {
  id: string
  catId: string
  visitDate: Date
  hospitalId: string
  doctorId: string
  treatmentIds: string[]
  cost: number
  notes?: string
  hasBloodTest: boolean
  createdAt: Date
  updatedAt: Date
  
  // Relations
  cat: Cat
  hospital: VeterinaryHospital
  doctor: VeterinaryDoctor
  treatments: VeterinaryTreatment[]
}
```

#### VeterinaryAppointment（予約）

```typescript
interface VeterinaryAppointment {
  id: string
  catId: string
  appointmentDate: Date
  hospitalId: string
  doctorId?: string
  plannedTreatments?: string
  notes?: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  createdAt: Date
  updatedAt: Date
  
  // Relations
  cat: Cat
  hospital: VeterinaryHospital
  doctor?: VeterinaryDoctor
}
```

#### マスタデータモデル

```typescript
interface VeterinaryHospital {
  id: string
  name: string
  address?: string
  phone?: string
  createdAt: Date
  updatedAt: Date
}

interface VeterinaryDoctor {
  id: string
  name: string
  hospitalId?: string
  specialization?: string
  createdAt: Date
  updatedAt: Date
}

interface VeterinaryTreatment {
  id: string
  name: string
  category?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}
```

### UIコンポーネント

#### VeterinaryVisitCalendar

- **目的**: カレンダー形式での通院記録表示
- **機能**:
  - 月次表示での通院日マーク
  - 猫別フィルタリング
  - 日付クリックでの詳細表示
  - 予約と実績の区別表示
- **Props**: `initialDate`, `catId`, `showAppointments`
- **Events**: `dateSelected`, `visitCreate`, `appointmentCreate`

#### VeterinaryVisitForm

- **目的**: 通院記録の作成・編集
- **機能**:
  - 基本情報入力（日時、病院、先生、費用）
  - 処方内容の複数選択
  - メモ入力
  - 血液検査フラグ
  - マスタデータの動的追加
- **Props**: `isOpen`, `visit?`, `cats`, `initialData?`
- **Events**: `save`, `close`

#### VeterinaryVisitList

- **目的**: 通院記録の一覧表示
- **機能**:
  - 時系列での記録表示
  - 猫別フィルタリング
  - 検索機能
  - 編集・削除アクション
- **Props**: `visits`, `loading`, `showActions`
- **Events**: `edit`, `delete`, `view`

#### VeterinaryAppointmentForm

- **目的**: 予約の作成・編集
- **機能**:
  - 予約日時設定
  - 病院・先生選択
  - 予定内容入力
  - 通院記録への変換
- **Props**: `isOpen`, `appointment?`, `cats`
- **Events**: `save`, `close`, `convertToVisit`

### API エンドポイント

#### 通院記録 API

```typescript
// GET /api/veterinary-visits
// Query: catId?, startDate?, endDate?, limit?, offset?
interface GetVisitsResponse {
  visits: VeterinaryVisit[]
  total: number
  hasMore: boolean
}

// POST /api/veterinary-visits
interface CreateVisitRequest {
  catId: string
  visitDate: string
  hospitalName: string
  doctorName?: string
  treatments: string[]
  cost: number
  notes?: string
  hasBloodTest: boolean
}

// PUT /api/veterinary-visits/[id]
interface UpdateVisitRequest extends Partial<CreateVisitRequest> {}

// DELETE /api/veterinary-visits/[id]
```

#### 予約管理 API

```typescript
// GET /api/veterinary-appointments
interface GetAppointmentsResponse {
  appointments: VeterinaryAppointment[]
  total: number
}

// POST /api/veterinary-appointments
interface CreateAppointmentRequest {
  catId: string
  appointmentDate: string
  hospitalName: string
  doctorName?: string
  plannedTreatments?: string
  notes?: string
}

// POST /api/veterinary-appointments/[id]/convert
// 予約を通院記録に変換
interface ConvertAppointmentRequest {
  actualVisitDate?: string
  actualCost?: number
  actualTreatments?: string[]
  actualNotes?: string
  hasBloodTest?: boolean
}
```

#### マスタデータ API

```typescript
// GET /api/veterinary-hospitals
// GET /api/veterinary-doctors
// GET /api/veterinary-treatments
// 各マスタデータの取得・検索

// POST /api/veterinary-hospitals
// POST /api/veterinary-doctors  
// POST /api/veterinary-treatments
// 新規マスタデータの作成
```

## データモデル

### Prismaスキーマ拡張

```prisma
model VeterinaryVisit {
  id           String   @id @default(cuid())
  catId        String
  visitDate    DateTime
  hospitalId   String
  doctorId     String?
  cost         Float
  notes        String?
  hasBloodTest Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  cat          Cat                    @relation(fields: [catId], references: [id], onDelete: Cascade)
  hospital     VeterinaryHospital     @relation(fields: [hospitalId], references: [id])
  doctor       VeterinaryDoctor?      @relation(fields: [doctorId], references: [id])
  treatments   VeterinaryVisitTreatment[]

  @@map("veterinary_visits")
}

model VeterinaryAppointment {
  id                String            @id @default(cuid())
  catId             String
  appointmentDate   DateTime
  hospitalId        String
  doctorId          String?
  plannedTreatments String?
  notes             String?
  status            AppointmentStatus @default(SCHEDULED)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  cat      Cat                  @relation(fields: [catId], references: [id], onDelete: Cascade)
  hospital VeterinaryHospital   @relation(fields: [hospitalId], references: [id])
  doctor   VeterinaryDoctor?    @relation(fields: [doctorId], references: [id])

  @@map("veterinary_appointments")
}

model VeterinaryHospital {
  id        String   @id @default(cuid())
  name      String   @unique
  address   String?
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  visits       VeterinaryVisit[]
  appointments VeterinaryAppointment[]
  doctors      VeterinaryDoctor[]

  @@map("veterinary_hospitals")
}

model VeterinaryDoctor {
  id             String  @id @default(cuid())
  name           String
  hospitalId     String?
  specialization String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  hospital     VeterinaryHospital?     @relation(fields: [hospitalId], references: [id])
  visits       VeterinaryVisit[]
  appointments VeterinaryAppointment[]

  @@map("veterinary_doctors")
}

model VeterinaryTreatment {
  id          String   @id @default(cuid())
  name        String   @unique
  category    String?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  visitTreatments VeterinaryVisitTreatment[]

  @@map("veterinary_treatments")
}

model VeterinaryVisitTreatment {
  id          String @id @default(cuid())
  visitId     String
  treatmentId String

  visit     VeterinaryVisit     @relation(fields: [visitId], references: [id], onDelete: Cascade)
  treatment VeterinaryTreatment @relation(fields: [treatmentId], references: [id])

  @@unique([visitId, treatmentId])
  @@map("veterinary_visit_treatments")
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}

// Catモデルに追加
model Cat {
  // 既存フィールド...
  veterinaryVisits      VeterinaryVisit[]
  veterinaryAppointments VeterinaryAppointment[]
}
```

## エラーハンドリング

### バリデーション

#### フロントエンド（Zod）

```typescript
import { z } from 'zod'

export const veterinaryVisitSchema = z.object({
  catId: z.string().min(1, '猫を選択してください'),
  visitDate: z.date({
    required_error: '診察日時を入力してください',
  }),
  hospitalName: z.string().min(1, '病院名を入力してください'),
  doctorName: z.string().optional(),
  treatments: z.array(z.string()).min(1, '処方内容を選択してください'),
  cost: z.number().min(0, '費用は0以上で入力してください'),
  notes: z.string().optional(),
  hasBloodTest: z.boolean().default(false),
})

export const veterinaryAppointmentSchema = z.object({
  catId: z.string().min(1, '猫を選択してください'),
  appointmentDate: z.date({
    required_error: '予約日時を入力してください',
  }).refine(date => date > new Date(), {
    message: '予約日時は未来の日時を選択してください',
  }),
  hospitalName: z.string().min(1, '病院名を入力してください'),
  doctorName: z.string().optional(),
  plannedTreatments: z.string().optional(),
  notes: z.string().optional(),
})
```

#### バックエンド（サーバーサイド）

```typescript
// server/api/veterinary-visits/index.post.ts
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // バリデーション
    const validatedData = veterinaryVisitSchema.parse(body)
    
    // マスタデータの取得または作成
    const hospital = await findOrCreateHospital(validatedData.hospitalName)
    const doctor = validatedData.doctorName 
      ? await findOrCreateDoctor(validatedData.doctorName, hospital.id)
      : null
    const treatments = await findOrCreateTreatments(validatedData.treatments)
    
    // 通院記録作成
    const visit = await prisma.veterinaryVisit.create({
      data: {
        catId: validatedData.catId,
        visitDate: validatedData.visitDate,
        hospitalId: hospital.id,
        doctorId: doctor?.id,
        cost: validatedData.cost,
        notes: validatedData.notes,
        hasBloodTest: validatedData.hasBloodTest,
        treatments: {
          create: treatments.map(treatment => ({
            treatmentId: treatment.id,
          })),
        },
      },
      include: {
        cat: true,
        hospital: true,
        doctor: true,
        treatments: {
          include: {
            treatment: true,
          },
        },
      },
    })
    
    return visit
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'バリデーションエラー',
        data: error.errors,
      })
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '通院記録の作成に失敗しました',
    })
  }
})
```

### エラー状態の管理

```typescript
// composables/useVeterinaryVisits.ts
export const useVeterinaryVisits = () => {
  const visits = ref<VeterinaryVisit[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const fetchVisits = async (params?: GetVisitsParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch<GetVisitsResponse>('/api/veterinary-visits', {
        query: params,
      })
      visits.value = response.visits
    } catch (err) {
      error.value = 'データの取得に失敗しました'
      console.error('Failed to fetch veterinary visits:', err)
    } finally {
      loading.value = false
    }
  }
  
  const createVisit = async (data: CreateVisitRequest) => {
    try {
      const newVisit = await $fetch<VeterinaryVisit>('/api/veterinary-visits', {
        method: 'POST',
        body: data,
      })
      visits.value.unshift(newVisit)
      return newVisit
    } catch (err) {
      throw new Error('通院記録の作成に失敗しました')
    }
  }
  
  return {
    visits: readonly(visits),
    loading: readonly(loading),
    error: readonly(error),
    fetchVisits,
    createVisit,
  }
}
```

## テスト戦略

### 単体テスト

#### コンポーネントテスト

```typescript
// tests/components/VeterinaryVisitForm.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VeterinaryVisitForm from '~/components/VeterinaryVisitForm.vue'

describe('VeterinaryVisitForm', () => {
  it('必須項目が未入力の場合、バリデーションエラーを表示する', async () => {
    const wrapper = mount(VeterinaryVisitForm, {
      props: {
        isOpen: true,
        cats: mockCats,
      },
    })
    
    await wrapper.find('[data-testid="submit-button"]').trigger('click')
    
    expect(wrapper.find('[data-testid="cat-error"]').text()).toBe('猫を選択してください')
    expect(wrapper.find('[data-testid="date-error"]').text()).toBe('診察日時を入力してください')
  })
  
  it('新しい病院名を入力した場合、マスタに追加される', async () => {
    const onSave = vi.fn()
    const wrapper = mount(VeterinaryVisitForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        onSave,
      },
    })
    
    await wrapper.find('[data-testid="hospital-input"]').setValue('新しい病院')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')
    
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        hospitalName: '新しい病院',
      })
    )
  })
})
```

#### APIテスト

```typescript
// tests/api/veterinary-visits.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestContext } from '~/tests/utils/test-context'

describe('/api/veterinary-visits', () => {
  let ctx: TestContext
  
  beforeEach(async () => {
    ctx = await createTestContext()
  })
  
  it('POST: 通院記録を作成できる', async () => {
    const visitData = {
      catId: ctx.testCat.id,
      visitDate: new Date().toISOString(),
      hospitalName: 'テスト動物病院',
      doctorName: 'テスト先生',
      treatments: ['健康診断'],
      cost: 5000,
      hasBloodTest: true,
    }
    
    const response = await ctx.request
      .post('/api/veterinary-visits')
      .send(visitData)
      .expect(201)
    
    expect(response.body).toMatchObject({
      catId: visitData.catId,
      cost: visitData.cost,
      hasBloodTest: true,
      hospital: {
        name: 'テスト動物病院',
      },
      doctor: {
        name: 'テスト先生',
      },
    })
  })
  
  it('GET: 猫別に通院記録を取得できる', async () => {
    await ctx.createTestVisit({ catId: ctx.testCat.id })
    
    const response = await ctx.request
      .get('/api/veterinary-visits')
      .query({ catId: ctx.testCat.id })
      .expect(200)
    
    expect(response.body.visits).toHaveLength(1)
    expect(response.body.visits[0].catId).toBe(ctx.testCat.id)
  })
})
```

### 統合テスト

#### E2Eテスト

```typescript
// tests/e2e/veterinary-visit-management.test.ts
import { test, expect } from '@playwright/test'

test.describe('通院履歴管理', () => {
  test('通院記録の作成から表示まで', async ({ page }) => {
    await page.goto('/veterinary-visits')
    
    // 新規記録作成
    await page.click('[data-testid="add-visit-button"]')
    await page.selectOption('[data-testid="cat-select"]', 'test-cat-id')
    await page.fill('[data-testid="visit-date"]', '2024-01-15T10:00')
    await page.fill('[data-testid="hospital-input"]', 'テスト動物病院')
    await page.fill('[data-testid="cost-input"]', '5000')
    await page.check('[data-testid="blood-test-checkbox"]')
    await page.click('[data-testid="save-button"]')
    
    // カレンダーに表示されることを確認
    await page.click('[data-testid="calendar-tab"]')
    await expect(page.locator('[data-date="2024-01-15"]')).toHaveClass(/has-visit/)
    
    // 詳細表示
    await page.click('[data-date="2024-01-15"]')
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('テスト動物病院')
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('5,000円')
    await expect(page.locator('[data-testid="blood-test-badge"]')).toBeVisible()
  })
  
  test('予約から通院記録への変換', async ({ page }) => {
    await page.goto('/veterinary-appointments')
    
    // 予約作成
    await page.click('[data-testid="add-appointment-button"]')
    await page.selectOption('[data-testid="cat-select"]', 'test-cat-id')
    await page.fill('[data-testid="appointment-date"]', '2024-02-01T14:00')
    await page.fill('[data-testid="hospital-input"]', 'テスト動物病院')
    await page.click('[data-testid="save-button"]')
    
    // 通院記録に変換
    await page.click('[data-testid="convert-to-visit-button"]')
    await page.fill('[data-testid="actual-cost"]', '3000')
    await page.click('[data-testid="confirm-convert-button"]')
    
    // 通院記録として表示されることを確認
    await page.goto('/veterinary-visits')
    await expect(page.locator('[data-testid="visit-list"]')).toContainText('テスト動物病院')
  })
})
```

### パフォーマンステスト

```typescript
// tests/performance/veterinary-visits-performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'

describe('通院履歴パフォーマンス', () => {
  it('大量データでのカレンダー表示が1秒以内', async () => {
    // 1000件の通院記録を作成
    await createManyVisits(1000)
    
    const start = performance.now()
    const response = await $fetch('/api/veterinary-visits', {
      query: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    })
    const end = performance.now()
    
    expect(end - start).toBeLessThan(1000) // 1秒以内
    expect(response.visits).toBeDefined()
  })
})
```

## 実装の考慮事項

### レスポンシブデザイン

- **モバイルファースト**: タッチ操作に最適化されたUI
- **カレンダー表示**: 画面サイズに応じた表示調整
- **フォーム入力**: モバイルでの入力しやすさを重視

### アクセシビリティ

- **キーボードナビゲーション**: Tab順序の最適化
- **スクリーンリーダー対応**: 適切なARIAラベル
- **カラーコントラスト**: WCAG 2.1 AA準拠

### パフォーマンス最適化

- **データ取得**: 必要な範囲のみの取得
- **キャッシュ戦略**: よく使用されるマスタデータのキャッシュ
- **遅延読み込み**: 大量データの段階的読み込み

### セキュリティ

- **入力検証**: フロントエンド・バックエンド両方での検証
- **SQLインジェクション対策**: Prismaによる自動対策
- **認証・認可**: 既存の認証システムとの統合
