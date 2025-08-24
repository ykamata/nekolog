# Nekolog - 飼い猫健康管理アプリ

## プロジェクト概要
Nekolog は Nuxt 3 と TypeScript で構築された包括的な猫のケア管理アプリケーションです。

## 主要機能
- **猫管理**: 複数の猫の詳細プロファイル追跡
- **食事記録**: 給餌時間、フードタイプ、分量のログ
- **薬物管理**: 薬物投与のスケジュールと追跡
- **分析**: 給餌パターンと薬物遵守の可視化
- **オフラインサポート**: インターネット接続なしでもアプリ使用可能

## 技術スタック
- **フロントエンド**: Nuxt 3, Vue 3, TypeScript
- **スタイリング**: Tailwind CSS, UnoCSS
- **データベース**: Prisma ORM (開発: SQLite / 本番: MySQL)
- **状態管理**: Pinia
- **テスト**: Vitest, Playwright
- **認証**: JWT ベース認証システム

## 開発環境要件
- Node.js >= 20.0.0
- npm または yarn

## プロジェクト構造
- `components/` - Vue コンポーネント
- `composables/` - Vue Composition API 関数
- `stores/` - Pinia ストア
- `server/` - API ルート
- `prisma/` - データベーススキーマとマイグレーション
- `tests/` - テストファイル
- `types/` - TypeScript 型定義
- `utils/` - ユーティリティ関数