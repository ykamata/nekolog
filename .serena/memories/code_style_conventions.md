# コードスタイル・規約

## TypeScript規約
- **strict mode**: 有効
- **型定義**: 全コード完全型付け必須
- **インポート**: `~` エイリアス必須
- **変数・関数名**: 英語
- **コメント**: 日本語

## Vue.js規約
- **Composition API**: 必須 (Options API禁止)
- **`<script setup>`**: 必須
- **Props型定義**: 必須

## Pinia規約
- **setup構文**: `defineStore('name', () => {})` 形式必須
- **状態管理**: ref/reactive使用

## ファイル構造規約
```
components/ (自動インポート)
composables/ (自動インポート)
types/ (型定義)
stores/ (Pinia)
lib/validations/ (Zod)
server/api/ (APIルート)
```

## API規約
- **RESTful構造**: `/api/resource/[id]`
- **バリデーション**: Zod必須
- **エラーハンドリング**: 統一レスポンス形式

## スタイリング
- **Tailwind CSS**: メイン
- **カスタムCSS**: 最小限

## テスト規約
- **単体テスト**: `tests/*.test.ts`
- **E2Eテスト**: `tests/e2e/*.spec.ts`
- **実行**: `npm run test` (watch禁止)