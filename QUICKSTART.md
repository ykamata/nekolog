# Nekolog 本番環境デプロイ - クイックスタートガイド

このガイドでは、最短でNekologを本番環境にデプロイする手順を説明します。

## ⚡ 最短デプロイ手順 (5ステップ)

### 1. 前提条件の確認

```bash
# Docker & Docker Composeがインストールされていることを確認
docker --version
docker-compose --version
git --version
```

まだインストールされていない場合は、[DEPLOYMENT.md](./DEPLOYMENT.md#初回セットアップ)を参照してください。

---

### 2. リポジトリのクローン

```bash
# サーバー上で実行 (推奨ディレクトリ: /opt)
cd /opt
git clone <your-repository-url> nekolog
cd nekolog
```

---

### 3. 環境変数の設定

```bash
# .env.productionファイルを作成
cp .env.production.example .env.production

# セキュアなJWT_SECRETを生成
openssl rand -base64 64

# エディタで.env.productionを編集
nano .env.production
```

**最低限必要な設定:**

```env
# データベースパスワード (強力なものに変更!)
MYSQL_ROOT_PASSWORD=your-secure-root-password-here
MYSQL_USER=nekolog
MYSQL_PASSWORD=your-secure-database-password-here

# JWT署名キー (上記で生成した値を貼り付け)
JWT_SECRET=生成したランダムな文字列をここに貼り付け

# アプリケーションポート
APP_PORT=3000
```

**セキュリティ設定:**

```bash
# .env.productionのパーミッション制限
chmod 600 .env.production

# デプロイスクリプトに実行権限を付与
chmod +x scripts/deploy.sh
```

---

### 4. 初回デプロイ実行

```bash
# デプロイスクリプトを実行
./scripts/deploy.sh
```

デプロイスクリプトが以下を自動で実行します:

- ✅ 環境変数の検証
- ✅ Dockerイメージのビルド
- ✅ コンテナの起動
- ✅ データベースのマイグレーション
- ✅ ヘルスチェック

完了すると、アプリケーションが `http://localhost:3000` で起動します。

---

### 5. 動作確認

```bash
# ヘルスチェック
curl http://localhost:3000/api/health

# コンテナの状態確認
docker-compose -f docker-compose.prod.yml ps

# ログの確認
docker-compose -f docker-compose.prod.yml logs -f
```

**成功レスポンス例:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-08T12:00:00.000Z",
  "service": "nekolog",
  "database": "connected"
}
```

---

## 🔄 更新時のデプロイ

コードを更新した後のデプロイ手順:

```bash
# プロジェクトディレクトリに移動
cd /opt/nekolog

# デプロイスクリプトを実行
./scripts/deploy.sh
```

デプロイスクリプトは自動的にバックアップを作成してから更新を実行します。

---

## 📊 基本的な運用コマンド

### ログ確認

```bash
# リアルタイムでログを表示
docker-compose -f docker-compose.prod.yml logs -f

# アプリケーションのログのみ
docker-compose -f docker-compose.prod.yml logs -f app

# 最新100行を表示
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### コンテナ操作

```bash
# 再起動
docker-compose -f docker-compose.prod.yml restart

# 停止
docker-compose -f docker-compose.prod.yml down

# 起動
docker-compose -f docker-compose.prod.yml up -d

# 状態確認
docker-compose -f docker-compose.prod.yml ps
```

### データベース操作

```bash
# MySQLシェルにアクセス
docker exec -it nekolog-mysql-prod mysql -u nekolog -p nekolog

# データベースバックアップ
docker exec nekolog-mysql-prod mysqldump \
  -u nekolog -p \
  --single-transaction \
  nekolog > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🚨 トラブルシューティング

### アプリケーションが起動しない

```bash
# ログを確認
docker-compose -f docker-compose.prod.yml logs app

# コンテナを再起動
docker-compose -f docker-compose.prod.yml restart app
```

### データベース接続エラー

```bash
# MySQLの状態確認
docker exec nekolog-mysql-prod mysqladmin ping -h localhost -u root -p

# MySQLを再起動
docker-compose -f docker-compose.prod.yml restart mysql
```

### ポートが既に使用されている

```bash
# ポート使用状況を確認
sudo lsof -i :3000

# プロセスを停止
sudo kill -9 <PID>
```

### 完全リセット (データも削除されます!)

```bash
# 全コンテナとボリュームを削除
docker-compose -f docker-compose.prod.yml down -v

# イメージも削除
docker rmi nekolog-app-prod nekolog-mysql-prod

# 再デプロイ
./scripts/deploy.sh
```

---

## 🔒 セキュリティチェックリスト

- [ ] `.env.production`に強力なパスワードを設定した
- [ ] `JWT_SECRET`をランダムな値に変更した
- [ ] `.env.production`のパーミッションを600に設定した
- [ ] ファイアウォールを設定した (必要なポートのみ開放)
- [ ] 定期的なバックアップを設定した
- [ ] `.env.production`をGitにコミットしていない

---

## 📚 詳細情報

より詳細な情報は以下のドキュメントを参照してください:

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 完全なデプロイメントガイド
  - 初回セットアップの詳細
  - バックアップとリストア
  - 監視とアラート設定
  - システムサービス化

- **[CLAUDE.md](./CLAUDE.md)** - プロジェクト概要と開発情報
  - アーキテクチャ
  - 開発コマンド
  - テスト戦略

- **[README.docker.md](./README.docker.md)** - Docker開発環境

---

## 🆘 サポート

問題が発生した場合:

1. このガイドのトラブルシューティングセクションを確認
2. ログを確認: `docker-compose -f docker-compose.prod.yml logs`
3. [DEPLOYMENT.md](./DEPLOYMENT.md)の詳細なトラブルシューティングを参照
4. GitHubのIssueで質問

---

**最終更新日**: 2025-12-08

**次のステップ**: デプロイ後は[DEPLOYMENT.md](./DEPLOYMENT.md)を読んで、監視設定やバックアップの自動化を検討してください。
