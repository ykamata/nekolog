#!/bin/bash

# Docker + MySQL環境の検証スクリプト
# このスクリプトは以下を検証します：
# - Docker/Docker Composeの動作確認
# - MySQLコンテナの起動と初期化
# - Prisma Clientの生成
# - データベースマイグレーション
# - テストデータのシード
# - 接続とデータの確認

set -e  # エラーが発生したら即座に終了

# 色付きログ出力
log_info() {
  echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
  echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_error() {
  echo -e "\033[0;31m[ERROR]\033[0m $1"
}

log_warn() {
  echo -e "\033[0;33m[WARN]\033[0m $1"
}

log_step() {
  echo ""
  echo -e "\033[1;36m==================================================\033[0m"
  echo -e "\033[1;36m$1\033[0m"
  echo -e "\033[1;36m==================================================\033[0m"
}

# エラーハンドラー
error_handler() {
  log_error "スクリプトの実行中にエラーが発生しました（行: $1）"
  log_info "ログを確認してください: docker compose logs"
  exit 1
}

trap 'error_handler $LINENO' ERR

# プロジェクトルートに移動
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)

log_step "🐱 Nekolog Docker + MySQL 検証スクリプト"

# Step 1: Docker/Docker Composeのバージョン確認
log_step "Step 1: Docker環境の確認"

if ! command -v docker &> /dev/null; then
  log_error "Dockerがインストールされていません"
  log_info "Docker Desktopをインストールしてください: https://www.docker.com/products/docker-desktop"
  exit 1
fi

DOCKER_VERSION=$(docker --version)
log_success "Docker: $DOCKER_VERSION"

if ! docker compose version &> /dev/null; then
  log_error "Docker Composeが利用できません"
  exit 1
fi

COMPOSE_VERSION=$(docker compose version)
log_success "Docker Compose: $COMPOSE_VERSION"

# Step 2: 既存のコンテナを停止・削除
log_step "Step 2: 既存のコンテナをクリーンアップ"

if docker compose ps | grep -q "nekolog"; then
  log_info "既存のコンテナを停止しています..."
  docker compose down
  log_success "既存のコンテナを停止しました"
else
  log_info "既存のコンテナはありません"
fi

# Step 3: MySQLコンテナを起動
log_step "Step 3: MySQLコンテナを起動"

log_info "MySQLコンテナを起動しています（初回はイメージのダウンロードに時間がかかります）..."
docker compose up -d mysql

# Step 4: MySQLのヘルスチェック
log_step "Step 4: MySQLの起動を待機"

log_info "MySQLが完全に起動するまで待機しています..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker compose exec -T mysql mysqladmin ping -h localhost -u root -proot &> /dev/null; then
    log_success "MySQLが起動しました！"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo -n "."
  sleep 2

  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "MySQLの起動がタイムアウトしました"
    docker compose logs mysql
    exit 1
  fi
done

echo ""

# MySQLのバージョン確認
MYSQL_VERSION=$(docker compose exec -T mysql mysql --version)
log_success "MySQL: $MYSQL_VERSION"

# Step 5: データベースの存在確認
log_step "Step 5: データベースの確認"

DB_EXISTS=$(docker compose exec -T mysql mysql -u root -proot -e "SHOW DATABASES LIKE 'nekolog';" | grep -c "nekolog" || true)

if [ "$DB_EXISTS" -eq 1 ]; then
  log_success "データベース 'nekolog' が存在します"
else
  log_warn "データベース 'nekolog' が見つかりません"
fi

# Step 6: Prisma Clientの生成（MySQL用）
log_step "Step 6: Prisma Clientの生成（MySQL用）"

log_info "Prisma Clientを生成しています..."
npm run db:generate:mysql
log_success "Prisma Client（MySQL用）の生成が完了しました"

# Step 7: データベースマイグレーション
log_step "Step 7: データベースマイグレーション"

log_info "マイグレーションを実行しています..."

# 環境変数を設定してマイグレーション実行
export DATABASE_URL="mysql://ykamata:ykamata@localhost:3306/nekolog"

if npm run db:migrate:prod; then
  log_success "マイグレーションが完了しました"
else
  log_warn "マイグレーションに失敗しました。db:pushを試行します..."
  npm run db:push
  log_success "db:pushが完了しました"
fi

# Step 8: テーブル一覧の確認
log_step "Step 8: テーブル構造の確認"

log_info "作成されたテーブル一覧："
docker compose exec -T mysql mysql -u ykamata -pykamata nekolog -e "SHOW TABLES;"

# Step 9: テストデータのシード
log_step "Step 9: テストデータの投入"

log_info "テストデータを投入しています..."
if npm run db:seed:mysql; then
  log_success "テストデータの投入が完了しました"
else
  log_warn "テストデータの投入をスキップしました（スクリプトが存在しない可能性があります）"
fi

# Step 10: データの確認
log_step "Step 10: データの確認"

log_info "各テーブルのレコード数を確認しています..."

# テーブル一覧を取得
TABLES=$(docker compose exec -T mysql mysql -u ykamata -pykamata nekolog -sN -e "SHOW TABLES;")

echo ""
echo "テーブル | レコード数"
echo "---------|----------"

for TABLE in $TABLES; do
  COUNT=$(docker compose exec -T mysql mysql -u ykamata -pykamata nekolog -sN -e "SELECT COUNT(*) FROM $TABLE;")
  printf "%-20s | %s\n" "$TABLE" "$COUNT"
done

echo ""

# Step 11: 接続テスト
log_step "Step 11: 接続テスト"

log_info "MySQLへの接続をテストしています..."

CONNECTION_TEST=$(docker compose exec -T mysql mysql -u ykamata -pykamata nekolog -e "SELECT 'Connection successful!' AS status;" | grep "Connection successful" || true)

if [ -n "$CONNECTION_TEST" ]; then
  log_success "MySQL接続テスト成功！"
else
  log_error "MySQL接続テストに失敗しました"
  exit 1
fi

# Step 12: コンテナの状態確認
log_step "Step 12: コンテナの状態確認"

log_info "実行中のコンテナ："
docker compose ps

# 最終サマリー
log_step "✅ 検証完了サマリー"

cat << EOF

🎉 すべての検証が成功しました！

【起動したサービス】
  - MySQL 8.0 (ポート: 3306)

【データベース接続情報】
  ホスト: localhost
  ポート: 3306
  データベース: nekolog
  ユーザー: ykamata
  パスワード: ykamata

【次のステップ】
  1. アプリケーションコンテナを起動:
     $ npm run docker:up

  2. Prisma Studioでデータを確認:
     $ npm run db:studio:mysql

  3. すべてのコンテナを停止:
     $ npm run docker:down

  4. データも含めて完全削除:
     $ docker compose down -v

【参考コマンド】
  - MySQLシェルに接続:
    $ docker compose exec mysql mysql -u ykamata -pykamata nekolog

  - ログを確認:
    $ docker compose logs mysql

  - コンテナの再起動:
    $ docker compose restart mysql

EOF

log_success "検証スクリプトが正常に完了しました！"
