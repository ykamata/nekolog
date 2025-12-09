# Nekolog 本番環境デプロイメントガイド

このドキュメントでは、Nekologアプリケーションを自宅サーバーの本番環境にデプロイする手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [初回セットアップ](#初回セットアップ)
3. [デプロイ手順](#デプロイ手順)
4. [メンテナンス](#メンテナンス)
5. [トラブルシューティング](#トラブルシューティング)
6. [バックアップとリストア](#バックアップとリストア)

---

## 前提条件

### サーバー要件

- **OS**: Linux (Ubuntu 20.04+ または Debian 11+ 推奨)
- **CPU**: 2コア以上
- **メモリ**: 4GB以上 (8GB推奨)
- **ストレージ**: 20GB以上の空き容量
- **ネットワーク**: 固定IPアドレスまたはDDNS設定

### 必要なソフトウェア

- Docker (20.10以降)
- Docker Compose (2.0以降)
- Git (2.30以降)
- curl, wget (healthチェック用)

### インストール確認

```bash
docker --version
docker-compose --version
git --version
```

---

## 初回セットアップ

### 1. Dockerのインストール

Ubuntu/Debianの場合:

```bash
# 古いバージョンの削除
sudo apt-get remove docker docker-engine docker.io containerd runc

# 依存パッケージのインストール
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Docker公式GPGキーの追加
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Dockerリポジトリの追加
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Dockerのインストール
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 現在のユーザーをdockerグループに追加
sudo usermod -aG docker $USER

# 再ログインまたは以下を実行
newgrp docker

# 動作確認
docker run hello-world
```

### 2. リポジトリのクローン

```bash
# サーバー上で実行
cd /opt  # または任意のディレクトリ
git clone <your-repository-url> nekolog
cd nekolog
```

### 3. 環境変数の設定

```bash
# .env.productionファイルの作成
cp .env.production.example .env.production

# エディタで編集
nano .env.production  # または vi, vim等
```

**必須設定項目:**

```env
# データベースパスワード (強力なものに変更)
MYSQL_ROOT_PASSWORD=your-secure-root-password-here
MYSQL_USER=nekolog
MYSQL_PASSWORD=your-secure-database-password-here

# JWT署名キー (以下のコマンドで生成)
# openssl rand -base64 64
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# アプリケーションポート (必要に応じて変更)
APP_PORT=3000
```

**JWT_SECRETの生成方法:**

```bash
openssl rand -base64 64
```

### 4. ファイルパーミッションの設定

```bash
# デプロイスクリプトに実行権限を付与
chmod +x scripts/deploy.sh

# .env.productionのパーミッション制限
chmod 600 .env.production
```

### 5. 初回デプロイ

```bash
# デプロイスクリプトを実行
./scripts/deploy.sh
```

デプロイが完了すると、アプリケーションが `http://localhost:3000` で起動します。

---

## デプロイ手順

### 通常のデプロイ (更新時)

```bash
cd /opt/nekolog  # プロジェクトディレクトリに移動

# デプロイスクリプトを実行
./scripts/deploy.sh
```

デプロイスクリプトは以下の処理を自動で行います:

1. ✅ 環境変数の検証
2. ✅ 既存コンテナのバックアップ
3. ✅ データベースのバックアップ
4. ✅ 最新コードの取得 (Gitプル)
5. ✅ コンテナの停止
6. ✅ Dockerイメージのビルド
7. ✅ コンテナの起動
8. ✅ データベースマイグレーション
9. ✅ ヘルスチェック

### 手動デプロイ

自動スクリプトを使用しない場合:

```bash
# 1. 最新コードの取得
git pull origin main  # または develop

# 2. 環境変数の読み込み
export $(cat .env.production | grep -v '^#' | xargs)

# 3. コンテナの停止
docker-compose -f docker-compose.prod.yml down

# 4. イメージのビルド
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. コンテナの起動
docker-compose -f docker-compose.prod.yml up -d

# 6. マイグレーションの実行
docker exec nekolog-app-prod npx prisma migrate deploy --schema=prisma/schema.mysql.prisma

# 7. ヘルスチェック
curl http://localhost:3000/api/health
```

---

## メンテナンス

### ログの確認

```bash
# 全コンテナのログ
docker-compose -f docker-compose.prod.yml logs -f

# アプリケーションのみ
docker-compose -f docker-compose.prod.yml logs -f app

# MySQLのみ
docker-compose -f docker-compose.prod.yml logs -f mysql

# 最新100行
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### コンテナの状態確認

```bash
# コンテナの稼働状態
docker-compose -f docker-compose.prod.yml ps

# リソース使用状況
docker stats
```

### コンテナの再起動

```bash
# 全コンテナ
docker-compose -f docker-compose.prod.yml restart

# 特定のコンテナのみ
docker-compose -f docker-compose.prod.yml restart app
docker-compose -f docker-compose.prod.yml restart mysql
```

### データベース操作

```bash
# MySQLシェルへのアクセス
docker exec -it nekolog-mysql-prod mysql -u nekolog -p nekolog

# Prisma Studioの起動 (ポート5555)
docker exec nekolog-app-prod npx prisma studio --schema=prisma/schema.mysql.prisma
```

### ディスク容量の管理

```bash
# 未使用のDockerリソースのクリーンアップ
docker system prune -a

# ボリュームも含めて削除 (注意: データが削除されます)
docker system prune -a --volumes
```

---

## トラブルシューティング

### アプリケーションが起動しない

1. **ログを確認**
   ```bash
   docker-compose -f docker-compose.prod.yml logs app
   ```

2. **コンテナの状態確認**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

3. **ヘルスチェック**
   ```bash
   docker inspect nekolog-app-prod | grep -A 10 Health
   ```

### データベース接続エラー

1. **MySQLの稼働確認**
   ```bash
   docker exec nekolog-mysql-prod mysqladmin ping -h localhost -u root -p
   ```

2. **接続テスト**
   ```bash
   docker exec nekolog-app-prod npx prisma db pull --schema=prisma/schema.mysql.prisma
   ```

3. **環境変数の確認**
   ```bash
   docker exec nekolog-app-prod printenv | grep DATABASE_URL
   ```

### ポートが使用中

```bash
# ポート使用状況の確認
sudo netstat -tulpn | grep 3000

# または
sudo lsof -i :3000

# 既存プロセスの停止
sudo kill -9 <PID>
```

### メモリ不足

```bash
# メモリ使用状況
free -h

# Dockerのメモリ制限を確認/調整
# docker-compose.prod.yml の resources.limits.memory を調整
```

### コンテナの完全リセット

```bash
# 全コンテナとボリュームの削除 (データも削除されます!)
docker-compose -f docker-compose.prod.yml down -v

# イメージの削除
docker rmi nekolog-app-prod nekolog-mysql-prod

# 再デプロイ
./scripts/deploy.sh
```

---

## バックアップとリストア

### 自動バックアップ

デプロイスクリプトは自動的にバックアップを作成します:

- バックアップ先: `backups/YYYYMMDD_HHMMSS/database_backup.sql`

### 手動バックアップ

```bash
# データベースのバックアップ
docker exec nekolog-mysql-prod mysqldump \
  -u nekolog -p \
  --single-transaction \
  --quick \
  --lock-tables=false \
  nekolog > backup_$(date +%Y%m%d_%H%M%S).sql

# ボリュームのバックアップ
docker run --rm \
  -v nekolog_mysql_prod_data:/data \
  -v $(pwd)/backups:/backup \
  ubuntu tar czf /backup/mysql_data_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### リストア

```bash
# データベースのリストア
cat backup_20250101_120000.sql | \
  docker exec -i nekolog-mysql-prod mysql -u nekolog -p nekolog

# または
docker exec -i nekolog-mysql-prod mysql -u nekolog -p nekolog < backup_20250101_120000.sql
```

### バックアップの定期実行 (Cron)

```bash
# crontabの編集
crontab -e

# 毎日午前3時にバックアップ
0 3 * * * cd /opt/nekolog && docker exec nekolog-mysql-prod mysqldump -u nekolog -p'your-password' --single-transaction nekolog > backups/daily_$(date +\%Y\%m\%d).sql

# 古いバックアップの削除 (30日以上前)
0 4 * * * find /opt/nekolog/backups -name "daily_*.sql" -mtime +30 -delete
```

---

## セキュリティ推奨事項

1. **ファイアウォールの設定**
   ```bash
   # UFWの有効化
   sudo ufw enable

   # 必要なポートのみ開放
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 3000/tcp # アプリケーション (必要に応じて)
   ```

2. **定期的なアップデート**
   ```bash
   # システムパッケージ
   sudo apt update && sudo apt upgrade -y

   # Dockerイメージ
   docker pull node:22-bookworm-slim
   docker pull mysql:8.0
   ```

3. **環境変数の保護**
   ```bash
   # .env.productionのパーミッション
   chmod 600 .env.production

   # Gitから除外されていることを確認
   cat .gitignore | grep .env.production
   ```

4. **ログのローテーション**
   - Docker Composeファイルで既に設定済み
   - 最大10MB、3ファイルまで保持

---

## 監視とアラート

### ヘルスチェック監視

```bash
# ヘルスチェックスクリプト
cat > /opt/nekolog/scripts/health-check.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3000/api/health; then
    echo "Health check failed at $(date)" | mail -s "Nekolog Health Alert" your-email@example.com
fi
EOF

chmod +x /opt/nekolog/scripts/health-check.sh

# Cronに追加 (5分ごと)
*/5 * * * * /opt/nekolog/scripts/health-check.sh
```

---

## 付録

### 便利なエイリアス

```bash
# ~/.bashrc または ~/.zshrc に追加
alias nekolog-logs='docker-compose -f /opt/nekolog/docker-compose.prod.yml logs -f'
alias nekolog-restart='docker-compose -f /opt/nekolog/docker-compose.prod.yml restart'
alias nekolog-status='docker-compose -f /opt/nekolog/docker-compose.prod.yml ps'
alias nekolog-shell='docker exec -it nekolog-app-prod sh'
alias nekolog-mysql='docker exec -it nekolog-mysql-prod mysql -u nekolog -p nekolog'
```

### システムサービス化 (Systemd)

```bash
# /etc/systemd/system/nekolog.service
sudo tee /etc/systemd/system/nekolog.service > /dev/null << 'EOF'
[Unit]
Description=Nekolog Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/nekolog
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# サービスの有効化
sudo systemctl daemon-reload
sudo systemctl enable nekolog
sudo systemctl start nekolog

# ステータス確認
sudo systemctl status nekolog
```

---

## サポート

問題が発生した場合は、以下を確認してください:

1. このドキュメントのトラブルシューティングセクション
2. ログファイル (`docker-compose -f docker-compose.prod.yml logs`)
3. GitHubのIssue (プロジェクトリポジトリ)

---

**最終更新日**: 2025-12-08
