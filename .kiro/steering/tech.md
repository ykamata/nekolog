---
inclusion: always
---

# 技術アーキテクチャ・開発ガイドライン

## 必須技術スタック

### フロントエンド

- **Nuxt 3** (v3.11+) - Composition API必須、Options API禁止
- **TypeScript** - strict mode、全コード完全型付け必須
- **Tailwind CSS** - カスタムCSS最小限
- **Pinia** - setup構文のみ: `defineStore('name', () => {})`
- **Zod** - 全入力値検証必須 (`lib/validations/`)

### バックエンド・DB

- **API**: `server/api/` - RESTful構造 `/api/resource/[id]`
- **DB**: Prisma ORM (開発: SQLite、本番: MySQL)
- **認証**: JWT + HTTP-only cookies + `middleware/auth.ts`
- **エラー**: 統一レスポンス形式 + 適切なHTTPステータス

## コード規約

### インポート・ファイル構造

```typescript
// ~エイリアス必須
import { useAuth } from '~/composables/useAuth'
import type { CatMeal } from '~/types/cat-meal'

// ファイル配置ルール:
// components/ (自動インポート) | composables/ (自動インポート)
// types/ (型定義) | stores/ (Pinia) | lib/validations/ (Zod)
// server/api/ (APIルート)
```

### Vue コンポーネント

```vue
<script setup lang="ts">
// <script setup> + Composition API必須
interface Props {
  catId: string // 全props型定義必須
}
const props = defineProps<Props>() // 型安全性
</script>
```

### Pinia ストア

```typescript
// setup構文必須
export const useExampleStore = defineStore('example', () => {
  const state = ref<StateType>({})
  const getters = computed(() => {/* ... */})
  const actions = {/* ... */}
  return { state, getters, ...actions }
})
```

### API ルート

```typescript
// server/api/cats/[id].get.ts
export default defineEventHandler(async (event) => {
  // Zod検証必須
  const schema = z.object({ id: z.string() })
  const { id } = await getValidatedRouterParams(event, schema)
  
  try {
    const result = await prisma.cat.findUnique({ 
      where: { id },
      include: { meals: true } // リレーション取得
    })
    return result
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Database error' })
  }
})
```

## テスト要件

### ファイル規約

- 単体テスト: `tests/*.test.ts`
- E2Eテスト: `tests/e2e/*.spec.ts`
- 実行: `npm run test` (watch禁止)
- Playwright: `npx playwright test --reporter=list`

### 必須カバレッジ

- 全APIエンドポイント: `tests/api/`
- 全composables: `tests/composables/`
- 全stores: `tests/stores/`
- 重要ユーザーフロー: E2Eテスト

## データベース・バリデーション

### Prisma使用法

```typescript
// 型安全操作必須
const cats = await prisma.cat.findMany({
  include: { meals: true }, // リレーション
  where: { userId: user.id } // ユーザーフィルタ必須
})
```

### Zod検証

```typescript
// lib/validations/cat-meal.ts
export const catMealSchema = z.object({
  catId: z.string().uuid(),
  foodId: z.string().uuid(),
  amount: z.number().positive(),
  timestamp: z.date()
})

// APIルートで使用
const validatedData = await readValidatedBody(event, catMealSchema)
```

## 環境・デプロイ制約

### 開発環境

- Node.js 22.x (.nvmrc準拠)
- SQLite (ローカル開発)
- `.env` 環境変数
- `npm ci` クリーンインストール

### 本番環境

- MySQL (プライベートネットワーク)
- Docker必須
- 外部CDN禁止
- セルフホスト限定

### ブラウザサポート

- Safari/Chrome 最新3バージョン (iOS/macOS)
- レスポンシブ必須 (モバイル/デスクトップ)
- IE・レガシーブラウザ非対応

## パフォーマンス・セキュリティ

### パフォーマンス

- 自動インポート活用
- ローディング状態実装
- ストアでデータキャッシュ
- プライベートネットワーク最適化

### セキュリティ

- 全入力値Zod検証必須
- JWT HTTP-only cookies限定
- サードパーティ認証禁止
- CSRF保護実装

## 言語・コミュニケーション

- **コメント**: 日本語
- **変数・関数名**: 英語
- **UI文言**: 日本語
- **エラーメッセージ**: 日本語

## AI開発支援ルール

- MCP server `serena` を使用してソースコード取得・編集
- 最小限のコード実装を心がける
- 段階的な機能実装 (スケルトン → 機能追加)
- 既存パターンに従った実装
