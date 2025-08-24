# タスク完了時の実行項目

## 必須チェック項目
1. **型チェック**: `npm run typecheck`
2. **リント**: `npm run lint`
3. **フォーマット**: `npm run format`
4. **テスト**: `npm run test`

## 推奨チェック項目
- **E2Eテスト**: `npm run test:e2e`
- **パフォーマンステスト**: `npm run test:performance`
- **ビルド確認**: `npm run build`

## データベース関連
- マイグレーション必要時: `npm run db:migrate`
- スキーマ変更時: `npm run db:generate`

## Git関連
- コミット前: `git status` で変更確認
- プッシュ前: 全テスト実行

## 品質保証
- TypeScript strict mode準拠
- ESLint警告ゼロ
- テストカバレッジ確認
- 型安全性確保