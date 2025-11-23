# Dev Container セットアップガイド

このディレクトリには、VS CodeやClaude CodeでNekoLogプロジェクトを開発するためのDev Container設定が含まれています。

## 必要な環境

- Docker Desktop または Docker Engine
- VS Code + Dev Containers拡張機能、またはClaude Code

## 使い方

### VS Codeの場合

1. VS Codeでプロジェクトを開く
2. コマンドパレット（Cmd/Ctrl+Shift+P）を開く
3. "Dev Containers: Reopen in Container" を選択
4. コンテナのビルドと起動を待つ

### Claude Codeの場合

Claude Codeは自動的にdevcontainer設定を検出し、使用します。

## 含まれる機能

### サービス

- **MySQL 8.0**: データベースサーバー（ポート3306）
- **Node.js 22**: アプリケーションサーバー（ポート3000）

### VS Code拡張機能

- ESLint: コード品質チェック
- Volar: Vue 3サポート
- Tailwind CSS IntelliSense: Tailwindクラス補完
- Prettier: コードフォーマッター
- Prisma: Prisma ORMサポート
- Docker: Dockerファイルサポート

### 自動セットアップ

コンテナ作成時に以下が自動実行されます：

1. `npm install`: 依存関係のインストール
2. `npm run db:generate:mysql`: Prisma Clientの生成（MySQL用）

## データベース接続情報

```
Host: mysql（コンテナ内）または localhost（ホストから）
Port: 3306
Database: nekolog
User: ykamata
Password: ykamata
```

## 環境変数

`.env`ファイルは自動的にマウントされます。以下の内容を設定してください：

```env
DATABASE_URL="mysql://ykamata:ykamata@mysql:3306/nekolog"
JWT_SECRET="your-super-secret-jwt-key"
NODE_ENV="development"
```

## トラブルシューティング

### ポートが既に使用されている

ホストマシンで既にポート3000または3306が使用されている場合：

1. `docker-compose.yml`のポートマッピングを変更
2. コンテナを再ビルド

### パーミッションエラー

node_modulesやその他のファイルでパーミッションエラーが発生する場合：

```bash
# コンテナ内で実行
sudo chown -R node:node /app
```

### データベース接続エラー

MySQLコンテナが完全に起動するまで待つ必要があります。以下のコマンドで確認：

```bash
docker-compose ps
```

## 開発コマンド

コンテナ内で以下のコマンドが使用できます：

```bash
npm run dev                 # 開発サーバー起動
npm run build              # プロダクションビルド
npm test                   # テスト実行
npm run lint               # Lintチェック
npm run db:studio:mysql    # Prisma Studio起動
```

## コンテナの停止と削除

### VS Codeで停止

1. コマンドパレットを開く
2. "Dev Containers: Reopen Folder Locally" を選択

### 手動で停止

```bash
docker-compose down
```

### データも含めて完全削除

```bash
docker-compose down -v
```
