# 開発コマンド

## 基本コマンド
- `npm run dev` - 開発サーバー起動
- `npm run build` - 本番用ビルド
- `npm run preview` - ビルド後のプレビュー

## テストコマンド
- `npm run test` - 単体テスト実行
- `npm run test:components` - コンポーネントテスト実行
- `npm run test:e2e` - E2Eテスト実行
- `npm run test:e2e:ui` - E2EテストUI表示
- `npm run test:performance` - パフォーマンステスト実行

## コード品質
- `npm run lint` - ESLint実行
- `npm run lint:fix` - ESLint自動修正
- `npm run format` - コードフォーマット
- `npm run typecheck` - TypeScript型チェック

## データベース
- `npm run db:generate` - Prismaクライアント生成
- `npm run db:migrate` - マイグレーション実行
- `npm run db:push` - スキーマプッシュ
- `npm run db:studio` - Prisma Studio起動
- `npm run db:seed` - シードデータ投入
- `npm run db:reset` - データベースリセット

## システムコマンド (macOS)
- `ls -la` - ファイル一覧表示
- `grep -r "pattern" .` - パターン検索
- `find . -name "*.ts"` - ファイル検索
- `git status` - Git状態確認
- `git log --oneline` - Git履歴確認