技術スタック:
インフラ・デプロイ:
API: Nuxt 内の API ルート（Nitro）
ホスティング: Private Network 内の Ubuntu サーバー（Docker コンテナ運用）
画像/ファイル配信: ローカルファイル保存 + Nginx で静的配信
監視: - Sentry（エラー監視） - Uptime Kuma（死活監視）
データベース:
キャッシュ: 未導入（必要であれば Redis）
本番: MySQL（Private Network 上の本番用 DB サーバー）
開発: SQLite（軽量でローカル開発に最適）
バックエンド:
ORM / DB アクセス: Prisma（MySQL/SQLite 両対応）
フレームワーク: Nitro
ランタイム: Node.js 20.x（.nvmrc 管理、GitHub Actions でも使用）
認証: JWT + Cookie ベースの自前実装
フロントエンド:
スタイリング: - Tailwind CSS v4 - UnoCSS（オンデマンドユーティリティ）
バリデーション: Zod
フォーム: VueUseForm
フレームワーク: Nuxt 3（LTS、v3.11 以上、Nitro v3）
状態管理: Pinia v3（ストア自動インポート）
言語: 'TypeScript 5.x（strict: true、resolveJsonModule: true、~/\* パスエイリアス使用）'
注意事項:

- .nvmrc で Node.js バージョンを固定（20.x）
- husky や pre-commit フックは未導入
  開発ツール:
  CI: GitHub Actions（node@20, npm ci）
  テスト:
  - Vitest
  - '@nuxt/test-utils'
  - Playwright
    パッケージマネージャー: npm
    フォーマッター: ESLint による統合（Prettier 不使用）
    リンター: ESLint v9（Flat config、@nuxt/eslint、Stylistic 有効）
