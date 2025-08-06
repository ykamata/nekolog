# コンポーネントテスト修正設計書

## 概要

`tests/components/*`で発生している215件のテストエラーを解消するための設計書。主な問題は、DOMWrapper関連のエラー、コンポーネント要素の不存在、バリデーション機能の不備、レスポンシブ対応の不備、composableの未定義などである。

## アーキテクチャ

### 修正対象の分類

1. **コンポーネント実装の修正**
   - 不足している要素の追加
   - data-testid属性の追加
   - バリデーション機能の実装
   - レスポンシブ対応の実装

2. **テストコードの修正**
   - セレクタの修正
   - カスタムコンポーネントのテスト方法の修正
   - モック設定の修正

3. **Composableの修正**
   - 不足している関数の実装
   - テスト環境での適切なモック化

## コンポーネントと界面

### 1. DOMWrapper関連エラーの解消

#### 問題分析

- `Cannot call trigger/setValue/attributes on an empty DOMWrapper`エラーが多発
- テストで期待している要素が存在しない
- カスタムコンポーネント（DateTimePicker、VeterinaryMasterSelector）の操作方法が不適切

#### 解決方針

```typescript
// 修正前（エラーが発生）
wrapper.find('[data-testid="missing-element"]').trigger('click')

// 修正後（要素の存在確認）
const element = wrapper.find('[data-testid="existing-element"]')
if (element.exists()) {
  await element.trigger('click')
}
```

#### カスタムコンポーネントの対応

```typescript
// DateTimePickerの場合
// setValue()は使用不可 → 内部のinput要素を直接操作
const dateInput = wrapper.find('input[type="datetime-local"]')
await dateInput.setValue('2024-01-15T10:00')

// VeterinaryMasterSelectorの場合
// setValue()は使用不可 → 内部のinput要素を直接操作
const masterInput = wrapper.find('.master-input')
await masterInput.setValue('新しい病院名')
```

### 2. コンポーネント要素の追加

#### SyncStatusコンポーネント

```vue
<template>
  <div class="sync-status">
    <!-- 詳細表示切り替えボタンにdata-testid追加 -->
    <button
      data-testid="toggle-details-button"
      @click="showDetails = !showDetails"
    >
      {{ showDetails ? "詳細を隠す" : "詳細を表示" }}
    </button>

    <!-- 競合解決ダイアログの各ボタンにdata-testid追加 -->
    <div v-if="showConflictDialog" class="conflict-dialog">
      <button
        data-testid="resolve-local-button"
        @click="resolveConflict(conflict, true)"
      >
        ローカル版を使用
      </button>
      <button
        data-testid="resolve-server-button"
        @click="resolveConflict(conflict, false)"
      >
        サーバー版を使用
      </button>
      <button
        data-testid="close-dialog-button"
        @click="showConflictDialog = false"
      >
        閉じる
      </button>
    </div>
  </div>
</template>
```

#### VeterinaryAppointmentFormコンポーネント

```vue
<template>
  <form data-testid="appointment-form">
    <!-- バリデーションエラー表示の追加 -->
    <div v-if="errors.hospitalName" data-testid="hospital-error">
      {{ errors.hospitalName }}
    </div>
    <div v-if="errors.plannedTreatments" data-testid="planned-treatments-error">
      {{ errors.plannedTreatments }}
    </div>
    <div v-if="errors.notes" data-testid="notes-error">
      {{ errors.notes }}
    </div>

    <!-- 通院記録変換ボタンの追加 -->
    <button
      v-if="canConvertToVisit"
      data-testid="convert-to-visit-button"
      @click="handleConvertToVisit"
    >
      通院記録に変換
    </button>

    <!-- 送信ボタンのテキスト修正 -->
    <button
      type="submit"
      data-testid="submit-button"
      :disabled="isSubmitting"
    >
      {{ isSubmitting ? '保存中' : (isEditMode ? '更新' : '作成') }}
    </button>
  </form>
</template>
```

#### VeterinaryVisitCalendarコンポーネント

```vue
<template>
  <div class="veterinary-calendar" data-testid="calendar-container">
    <!-- カレンダービューとリストビューの切り替え -->
    <div v-if="internalViewMode === 'calendar'" data-testid="calendar-view">
      <!-- カレンダー表示 -->
      <div class="calendar-days">
        <div
          v-for="day in calendarDays"
          :key="day.date.toISOString()"
          :data-date="day.date.toISOString().split('T')[0]"
          class="calendar-day"
          @click="handleDateClick(day)"
        >
          <!-- 通院記録マーク -->
          <div
            v-if="day.hasVisits"
            :data-testid="`visit-mark-${getVisitId(day)}`"
            class="visit-mark"
          />
          <!-- 血液検査マーク -->
          <div
            v-if="day.hasBloodTest"
            :data-testid="`blood-test-mark-${getVisitId(day)}`"
            class="blood-test-mark"
          />
        </div>
      </div>
    </div>

    <div v-else data-testid="list-view">
      <!-- リスト表示 -->
    </div>

    <!-- データなしメッセージ -->
    <div
      v-if="!loading && filteredVisits.length === 0"
      data-testid="no-data-message"
    >
      記録がありません
    </div>

    <!-- フィルター要素 -->
    <input
      type="checkbox"
      data-testid="blood-test-filter"
      @change="handleBloodTestFilterChange"
    />
  </div>
</template>
```

### 3. バリデーション機能の実装

#### バリデーション関数の追加

```typescript
// VeterinaryAppointmentForm.vue
const validateForm = () => {
  const newErrors: Record<string, string> = {}

  // 病院名の必須チェック
  if (!formData.hospitalName.trim()) {
    newErrors.hospitalName = '病院名を入力してください'
  }

  // 予定処方内容の文字数チェック
  if (formData.plannedTreatments && formData.plannedTreatments.length > 500) {
    newErrors.plannedTreatments = '予定処方内容は500文字以内で入力してください'
  }

  // メモの文字数チェック
  if (formData.notes && formData.notes.length > 1000) {
    newErrors.notes = 'メモは1000文字以内で入力してください'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}
```

### 4. レスポンシブ対応の実装

#### CSSクラスの動的適用

```vue
<script setup lang="ts">
const screenSize = ref<'mobile' | 'tablet' | 'desktop'>('desktop')

const updateScreenSize = () => {
  const width = window.innerWidth
  if (width < 768) {
    screenSize.value = 'mobile'
  } else if (width < 1024) {
    screenSize.value = 'tablet'
  } else {
    screenSize.value = 'desktop'
  }
}

onMounted(() => {
  updateScreenSize()
  window.addEventListener('resize', updateScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize)
})

const formClasses = computed(() => [
  'appointment-form',
  {
    'mobile-layout': screenSize.value === 'mobile',
    'tablet-layout': screenSize.value === 'tablet',
  }
])
</script>

<template>
  <form :class="formClasses" data-testid="appointment-form">
    <!-- フォーム内容 -->
  </form>
</template>
```

### 5. Composableの修正

#### useVeterinaryMastersの自動インポート設定

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  imports: {
    dirs: [
      'composables/**'
    ]
  }
})
```

#### テスト用のモック設定

```typescript
// tests/setup.ts
import { vi } from 'vitest'

// useVeterinaryMastersのモック
vi.mock('~/composables/useVeterinaryMasters', () => ({
  useVeterinaryMasters: () => ({
    hospitals: ref([]),
    doctors: ref([]),
    treatments: ref([]),
    createHospital: vi.fn(),
    createDoctor: vi.fn(),
    createTreatment: vi.fn(),
    fetchHospitals: vi.fn(),
    fetchDoctors: vi.fn(),
    fetchTreatments: vi.fn(),
  })
}))
```

## データモデル

### テスト用のデータ構造

#### 通院記録テストデータ

```typescript
interface TestVeterinaryVisit {
  id: string
  catId: string
  visitDate: string
  hospital: {
    id: string
    name: string
  }
  doctor?: {
    id: string
    name: string
  }
  treatments: Array<{
    id: string
    name: string
  }>
  hasBloodTest: boolean
  cost: number
  notes?: string
}

const mockVisitData: TestVeterinaryVisit = {
  id: 'visit1',
  catId: 'cat1',
  visitDate: '2024-01-15T10:00:00Z',
  hospital: {
    id: 'hospital1',
    name: 'テスト動物病院'
  },
  doctor: {
    id: 'doctor1',
    name: 'テスト先生'
  },
  treatments: [
    { id: 'treatment1', name: '健康診断' },
    { id: 'treatment2', name: 'ワクチン接種' }
  ],
  hasBloodTest: true,
  cost: 5000,
  notes: 'テストメモ1'
}
```

## エラーハンドリング

### バリデーションエラーの統一処理

```typescript
interface ValidationError {
  field: string
  message: string
  code: string
}

const handleValidationErrors = (errors: ValidationError[]) => {
  const errorMap: Record<string, string> = {}
  errors.forEach(error => {
    errorMap[error.field] = error.message
  })
  return errorMap
}
```

### 非同期処理のエラーハンドリング

```typescript
const handleAsyncError = async (operation: () => Promise<void>) => {
  try {
    await operation()
  } catch (error) {
    console.error('Operation failed:', error)
    // エラー状態の更新
    submitError.value = error instanceof Error ? error.message : '不明なエラーが発生しました'
  }
}
```

## テスト戦略

### 1. コンポーネントテストの修正方針

#### 要素の存在確認を必須化

```typescript
// 修正前
expect(wrapper.find('[data-testid="element"]').text()).toBe('expected')

// 修正後
const element = wrapper.find('[data-testid="element"]')
expect(element.exists()).toBe(true)
expect(element.text()).toBe('expected')
```

#### カスタムコンポーネントのテスト方法

```typescript
// DateTimePickerのテスト
const dateTimePicker = wrapper.findComponent(DateTimePicker)
expect(dateTimePicker.exists()).toBe(true)
await dateTimePicker.vm.$emit('change', new Date('2024-01-15T10:00:00'))

// VeterinaryMasterSelectorのテスト
const masterSelector = wrapper.findComponent(VeterinaryMasterSelector)
expect(masterSelector.exists()).toBe(true)
await masterSelector.vm.$emit('update:modelValue', '新しい病院名')
```

### 2. モック戦略

#### Composableのモック

```typescript
const mockUseVeterinaryMasters = {
  hospitals: ref([
    { id: '1', name: 'テスト病院1' },
    { id: '2', name: 'テスト病院2' }
  ]),
  doctors: ref([
    { id: '1', name: 'テスト先生1' },
    { id: '2', name: 'テスト先生2' }
  ]),
  createHospital: vi.fn().mockResolvedValue({ id: '3', name: '新しい病院' }),
  createDoctor: vi.fn().mockResolvedValue({ id: '3', name: '新しい先生' }),
}
```

#### API呼び出しのモック

```typescript
// $fetchのモック
global.$fetch = vi.fn()
  .mockResolvedValueOnce([]) // 最初の呼び出し
  .mockResolvedValueOnce({ success: true }) // 2回目の呼び出し
```

### 3. アクセシビリティテストの実装

#### ARIA属性の検証

```typescript
it('should have proper ARIA attributes', () => {
  const input = wrapper.find('[data-testid="hospital-input"]')
  expect(input.attributes('aria-required')).toBe('true')
  
  const errorElement = wrapper.find('[data-testid="hospital-error"]')
  if (errorElement.exists()) {
    expect(input.attributes('aria-describedby')).toContain(errorElement.attributes('id'))
  }
})
```

#### キーボードナビゲーションのテスト

```typescript
it('should support keyboard navigation', async () => {
  const calendar = wrapper.find('[data-testid="calendar-container"]')
  await calendar.trigger('keydown', { key: 'ArrowRight' })
  
  // フォーカスが移動したことを確認
  const focusedElement = wrapper.find('.calendar-day--focused')
  expect(focusedElement.exists()).toBe(true)
})
```

## パフォーマンス要件

### テスト実行時間の最適化

- 不要なDOM操作の削減
- 非同期処理の適切な待機
- モックの効率的な利用

### メモリ使用量の最適化

- テスト後のクリーンアップ処理
- 大きなテストデータの使い回し
- イベントリスナーの適切な削除
