#!/bin/bash

set -e

# 色付きログ出力
log_info() {
  echo "🔵 [INFO] $1"
}

log_success() {
  echo "✅ [SUCCESS] $1"
}

log_error() {
  echo "❌ [ERROR] $1"
}

log_warn() {
  echo "⚠️  [WARN] $1"
}

# Web環境のみで実行
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  log_info "ローカル環境での実行をスキップしています"
  exit 0
fi

log_info "==============================================="
log_info "Nekolog Claude Code Web環境セットアップ"
log_info "==============================================="

# プロジェクトディレクトリに移動
cd "$CLAUDE_PROJECT_DIR" || exit 1

# 1. Node.jsバージョン確認
log_info "Step 1: Node.jsバージョンを確認しています..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  log_error "Node.js 20.0.0以上が必要です（現在: $(node --version)）"
  exit 1
fi
log_success "Node.js $(node --version) を確認"

# 2. 環境ファイルの設定
log_info "Step 2: 環境変数ファイルをセットアップしています..."
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET="dev-secret-key-for-testing-only-change-in-production"

# Application
NODE_ENV="development"
PORT=3000
EOF
  log_success ".env.localを作成しました"
else
  log_info ".env.localが既に存在します"
fi

# 3. npm依存関係をインストール
log_info "Step 3: npm依存関係をインストールしています（初回は時間がかかります）..."
if [ ! -d node_modules ]; then
  npm ci --prefer-offline --no-audit
  log_success "npm依存関係のインストールが完了しました"
else
  log_info "node_modulesが既に存在します（スキップ）"
fi

# 4. Prismaクライアントを生成
log_info "Step 4: Prismaクライアントを生成しています..."
npm run db:generate > /dev/null 2>&1
log_success "Prismaクライアントの生成が完了しました"

# 5. データベースマイグレーション
log_info "Step 5: データベースをセットアップしています..."
if [ ! -f dev.db ] || [ ! -s dev.db ]; then
  npm run db:push > /dev/null 2>&1
  log_success "データベースマイグレーションが完了しました"

  # オプション: シードデータを投入（必要に応じてコメント解除）
  # log_info "シードデータを投入しています..."
  # npm run db:seed
  # log_success "データベースのシード完了"
else
  log_info "データベースが既に存在します（スキップ）"
fi

# 6. コード品質ツールの確認
log_info "Step 6: コード品質ツールを確認しています..."
if command -v eslint > /dev/null 2>&1; then
  log_success "ESLintが利用可能です"
else
  log_warn "ESLintが見つかりません"
fi

# 7. 環境変数を永続化（以降のコマンド実行時に利用可能）
if [ -n "$CLAUDE_ENV_FILE" ]; then
  cat >> "$CLAUDE_ENV_FILE" << 'EOF'
export NODE_ENV="development"
export PORT=3000
export PATH="$CLAUDE_PROJECT_DIR/node_modules/.bin:$PATH"
EOF
  log_success "環境変数を永続化しました"
fi

log_info "==============================================="
log_success "🎉 セットアップが完了しました！"
log_info ""
log_info "次のステップ："
log_info "  • 開発サーバーの起動: npm run dev"
log_info "  • テスト実行: npm test"
log_info "  • 型チェック: npm run typecheck"
log_info "  • ビルド: npm run build"
log_info "==============================================="

exit 0
