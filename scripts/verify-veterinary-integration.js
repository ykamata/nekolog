#!/usr/bin/env node

/**
 * 通院履歴管理機能の既存システム統合確認スクリプト
 *
 * このスクリプトは以下の統合ポイントを確認します：
 * 1. 認証システムとの連携確認
 * 2. 既存猫データとの連携確認
 * 3. ナビゲーション統合
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function logSection(title) {
  log(`\n${COLORS.BOLD}${COLORS.BLUE}=== ${title} ===${COLORS.RESET}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, COLORS.GREEN);
}

function logError(message) {
  log(`❌ ${message}`, COLORS.RED);
}

function logWarning(message) {
  log(`⚠️  ${message}`, COLORS.YELLOW);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, COLORS.BLUE);
}

/**
 * ファイルの存在確認
 */
function checkFileExists(filePath, description) {
  if (existsSync(filePath)) {
    logSuccess(`${description}: ${filePath}`);
    return true;
  }
  else {
    logError(`${description}が見つかりません: ${filePath}`);
    return false;
  }
}

/**
 * ファイル内容の確認
 */
function checkFileContent(filePath, searchPattern, description) {
  try {
    const content = readFileSync(filePath, 'utf8');
    if (content.includes(searchPattern) || (searchPattern instanceof RegExp && searchPattern.test(content))) {
      logSuccess(`${description}: 確認済み`);
      return true;
    }
    else {
      logError(`${description}: パターンが見つかりません`);
      return false;
    }
  }
  catch (error) {
    logError(`${description}: ファイル読み込みエラー - ${error.message}`);
    return false;
  }
}

/**
 * 1. 認証システムとの連携確認
 */
function verifyAuthIntegration() {
  logSection('認証システムとの連携確認');

  let authScore = 0;
  const authChecks = [
    // 認証ミドルウェアの確認
    {
      file: 'middleware/auth.ts',
      description: '認証ミドルウェア',
      check: () => checkFileExists('middleware/auth.ts', '認証ミドルウェア'),
    },

    // 通院履歴ページでの認証確認
    {
      file: 'pages/veterinary-visits.vue',
      description: '通院履歴ページの認証設定',
      check: () => checkFileContent('pages/veterinary-visits.vue', 'middleware: \'auth\'', '通院履歴ページの認証設定'),
    },

    // 予約管理ページでの認証確認
    {
      file: 'pages/veterinary-appointments.vue',
      description: '予約管理ページの認証設定',
      check: () => checkFileContent('pages/veterinary-appointments.vue', 'middleware: \'auth\'', '予約管理ページの認証設定'),
    },

    // APIエンドポイントでの認証確認
    {
      file: 'server/api/veterinary-visits/index.get.ts',
      description: '通院記録API認証',
      check: () => checkFileContent('server/api/veterinary-visits/index.get.ts', 'auth-middleware', '通院記録API認証'),
    },

    // 認証composableの使用確認
    {
      file: 'pages/veterinary-visits.vue',
      description: '通院履歴ページでのuseAuth使用',
      check: () => checkFileContent('pages/veterinary-visits.vue', 'useAuth', '通院履歴ページでのuseAuth使用'),
    },
  ];

  authChecks.forEach((check) => {
    if (check.check()) {
      authScore++;
    }
  });

  logInfo(`認証統合スコア: ${authScore}/${authChecks.length}`);

  if (authScore === authChecks.length) {
    logSuccess('認証システムとの統合: 完了');
  }
  else if (authScore >= authChecks.length * 0.8) {
    logWarning('認証システムとの統合: ほぼ完了（一部要確認）');
  }
  else {
    logError('認証システムとの統合: 不完全');
  }

  return authScore / authChecks.length;
}

/**
 * 2. 既存猫データとの連携確認
 */
function verifyCatDataIntegration() {
  logSection('既存猫データとの連携確認');

  let catScore = 0;
  const catChecks = [
    // 猫データ型定義の確認
    {
      description: '猫データ型定義',
      check: () => checkFileExists('types/cat-meal.ts', '猫データ型定義') || checkFileExists('types/index.d.ts', '猫データ型定義'),
    },

    // 猫ストアの確認
    {
      description: '猫データストア',
      check: () => checkFileExists('stores/cats.ts', '猫データストア'),
    },

    // 通院記録での猫データ使用確認
    {
      description: '通院記録での猫データ使用',
      check: () => checkFileContent('pages/veterinary-visits.vue', 'Cat[]', '通院記録での猫データ使用'),
    },

    // 予約管理での猫データ使用確認
    {
      description: '予約管理での猫データ使用',
      check: () => checkFileContent('pages/veterinary-appointments.vue', 'Cat[]', '予約管理での猫データ使用'),
    },

    // 通院記録フォームでの猫選択確認
    {
      description: '通院記録フォームでの猫選択',
      check: () => checkFileContent('components/VeterinaryVisitForm.vue', 'catId', '通院記録フォームでの猫選択'),
    },

    // データベーススキーマでの猫との関連確認
    {
      description: 'データベーススキーマでの猫との関連',
      check: () => checkFileContent('prisma/schema.prisma', 'VeterinaryVisit', 'データベーススキーマでの猫との関連'),
    },

    // APIでの猫データ取得確認
    {
      description: 'APIでの猫データ取得',
      check: () => checkFileContent('pages/veterinary-visits.vue', '/api/cats', 'APIでの猫データ取得'),
    },
  ];

  catChecks.forEach((check) => {
    if (check.check()) {
      catScore++;
    }
  });

  logInfo(`猫データ統合スコア: ${catScore}/${catChecks.length}`);

  if (catScore === catChecks.length) {
    logSuccess('既存猫データとの統合: 完了');
  }
  else if (catScore >= catChecks.length * 0.8) {
    logWarning('既存猫データとの統合: ほぼ完了（一部要確認）');
  }
  else {
    logError('既存猫データとの統合: 不完全');
  }

  return catScore / catChecks.length;
}

/**
 * 3. ナビゲーション統合確認
 */
function verifyNavigationIntegration() {
  logSection('ナビゲーション統合確認');

  let navScore = 0;
  const navChecks = [
    // デフォルトレイアウトの確認
    {
      description: 'デフォルトレイアウト',
      check: () => checkFileExists('layouts/default.vue', 'デフォルトレイアウト'),
    },

    // 通院履歴ページへのナビゲーション確認
    {
      description: '通院履歴ページへのナビゲーション',
      check: () => checkFileContent('layouts/default.vue', '/veterinary-visits', '通院履歴ページへのナビゲーション')
        || checkFileContent('pages/veterinary-visits.vue', 'NuxtLink', '通院履歴ページへのナビゲーション'),
    },

    // 予約管理ページへのナビゲーション確認
    {
      description: '予約管理ページへのナビゲーション',
      check: () => checkFileContent('layouts/default.vue', '/veterinary-appointments', '予約管理ページへのナビゲーション')
        || checkFileContent('pages/veterinary-appointments.vue', 'NuxtLink', '予約管理ページへのナビゲーション'),
    },

    // 相互リンクの確認
    {
      description: '通院履歴と予約管理の相互リンク',
      check: () => checkFileContent('pages/veterinary-visits.vue', '/veterinary-appointments', '通院履歴から予約管理へのリンク')
        && checkFileContent('pages/veterinary-appointments.vue', '/veterinary-visits', '予約管理から通院履歴へのリンク'),
    },

    // 関連機能へのリンク確認
    {
      description: '関連機能へのリンク',
      check: () => checkFileContent('pages/veterinary-visits.vue', '/cats', '猫管理へのリンク')
        && checkFileContent('pages/veterinary-visits.vue', '/medications', '薬管理へのリンク'),
    },

    // レスポンシブナビゲーション確認
    {
      description: 'レスポンシブナビゲーション',
      check: () => checkFileContent('layouts/default.vue', 'bottom-nav', 'モバイル用ボトムナビゲーション'),
    },

    // ページタイトルとメタ情報確認
    {
      description: 'ページタイトルとメタ情報',
      check: () => checkFileContent('pages/veterinary-visits.vue', 'useSeoMeta', '通院履歴ページのメタ情報')
        && checkFileContent('pages/veterinary-appointments.vue', 'useSeoMeta', '予約管理ページのメタ情報'),
    },
  ];

  navChecks.forEach((check) => {
    if (check.check()) {
      navScore++;
    }
  });

  logInfo(`ナビゲーション統合スコア: ${navScore}/${navChecks.length}`);

  if (navScore === navChecks.length) {
    logSuccess('ナビゲーション統合: 完了');
  }
  else if (navScore >= navChecks.length * 0.8) {
    logWarning('ナビゲーション統合: ほぼ完了（一部要確認）');
  }
  else {
    logError('ナビゲーション統合: 不完全');
  }

  return navScore / navChecks.length;
}

/**
 * 4. データベース統合確認
 */
function verifyDatabaseIntegration() {
  logSection('データベース統合確認');

  let dbScore = 0;
  const dbChecks = [
    // Prismaスキーマの確認
    {
      description: 'Prismaスキーマファイル',
      check: () => checkFileExists('prisma/schema.prisma', 'Prismaスキーマファイル'),
    },

    // 通院記録モデルの確認
    {
      description: '通院記録モデル',
      check: () => checkFileContent('prisma/schema.prisma', 'model VeterinaryVisit', '通院記録モデル'),
    },

    // 予約モデルの確認
    {
      description: '予約モデル',
      check: () => checkFileContent('prisma/schema.prisma', 'model VeterinaryAppointment', '予約モデル'),
    },

    // マスタデータモデルの確認
    {
      description: 'マスタデータモデル',
      check: () => checkFileContent('prisma/schema.prisma', 'model VeterinaryHospital', '病院マスタモデル')
        && checkFileContent('prisma/schema.prisma', 'model VeterinaryDoctor', '先生マスタモデル')
        && checkFileContent('prisma/schema.prisma', 'model VeterinaryTreatment', '処方内容マスタモデル'),
    },

    // 猫モデルとの関連確認
    {
      description: '猫モデルとの関連',
      check: () => checkFileContent('prisma/schema.prisma', 'veterinaryVisits', '猫モデルでの通院記録関連')
        && checkFileContent('prisma/schema.prisma', 'veterinaryAppointments', '猫モデルでの予約関連'),
    },

    // マイグレーションファイルの確認
    {
      description: 'マイグレーションファイル',
      check: () => checkFileExists('prisma/migrations/20250729135209_add_veterinary_visit_management/migration.sql', 'マイグレーションファイル'),
    },
  ];

  dbChecks.forEach((check) => {
    if (check.check()) {
      dbScore++;
    }
  });

  logInfo(`データベース統合スコア: ${dbScore}/${dbChecks.length}`);

  if (dbScore === dbChecks.length) {
    logSuccess('データベース統合: 完了');
  }
  else if (dbScore >= dbChecks.length * 0.8) {
    logWarning('データベース統合: ほぼ完了（一部要確認）');
  }
  else {
    logError('データベース統合: 不完全');
  }

  return dbScore / dbChecks.length;
}

/**
 * 5. TypeScript型統合確認
 */
function verifyTypeIntegration() {
  logSection('TypeScript型統合確認');

  let typeScore = 0;
  const typeChecks = [
    // 通院記録型定義の確認
    {
      description: '通院記録型定義',
      check: () => checkFileExists('types/veterinary-visit.ts', '通院記録型定義'),
    },

    // バリデーションスキーマの確認
    {
      description: 'バリデーションスキーマ',
      check: () => checkFileExists('lib/validations/veterinary-visit.ts', 'バリデーションスキーマ'),
    },

    // 既存型との統合確認
    {
      description: '既存型との統合',
      check: () => checkFileContent('types/veterinary-visit.ts', 'Cat', '既存猫型との統合'),
    },

    // APIレスポンス型の確認
    {
      description: 'APIレスポンス型',
      check: () => checkFileContent('types/veterinary-visit.ts', 'VeterinaryVisitWithRelations', 'APIレスポンス型'),
    },

    // フォーム入力型の確認
    {
      description: 'フォーム入力型',
      check: () => checkFileContent('types/veterinary-visit.ts', 'CreateVeterinaryVisitInput', 'フォーム入力型'),
    },
  ];

  typeChecks.forEach((check) => {
    if (check.check()) {
      typeScore++;
    }
  });

  logInfo(`TypeScript型統合スコア: ${typeScore}/${typeChecks.length}`);

  if (typeScore === typeChecks.length) {
    logSuccess('TypeScript型統合: 完了');
  }
  else if (typeScore >= typeChecks.length * 0.8) {
    logWarning('TypeScript型統合: ほぼ完了（一部要確認）');
  }
  else {
    logError('TypeScript型統合: 不完全');
  }

  return typeScore / typeChecks.length;
}

/**
 * 統合テストの実行
 */
function runIntegrationTests() {
  logSection('統合テストの実行');

  try {
    // TypeScriptコンパイルチェック
    logInfo('TypeScriptコンパイルチェック実行中...');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    logSuccess('TypeScriptコンパイル: 成功');
  }
  catch (error) {
    logError('TypeScriptコンパイル: エラーあり');
    logError(error.stdout?.toString() || error.message);
  }

  try {
    // ESLintチェック
    logInfo('ESLintチェック実行中...');
    execSync('npx eslint pages/veterinary-*.vue components/Veterinary*.vue server/api/veterinary-*', { stdio: 'pipe' });
    logSuccess('ESLint: 問題なし');
  }
  catch (error) {
    logWarning('ESLint: 警告またはエラーあり');
    // ESLintエラーは警告として扱う
  }

  try {
    // 単体テストの実行（通院関連のみ）
    logInfo('通院関連単体テスト実行中...');
    execSync('npx vitest run --reporter=basic tests/api/veterinary-*.test.ts tests/components/Veterinary*.test.ts', { stdio: 'pipe' });
    logSuccess('単体テスト: 成功');
  }
  catch (error) {
    logError('単体テスト: 失敗');
    logError(error.stdout?.toString() || error.message);
  }
}

/**
 * 統合レポートの生成
 */
function generateIntegrationReport(scores) {
  logSection('統合レポート');

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

  log('\n📊 統合スコア詳細:');
  log(`   認証システム統合: ${(scores.auth * 100).toFixed(1)}%`);
  log(`   猫データ統合: ${(scores.catData * 100).toFixed(1)}%`);
  log(`   ナビゲーション統合: ${(scores.navigation * 100).toFixed(1)}%`);
  log(`   データベース統合: ${(scores.database * 100).toFixed(1)}%`);
  log(`   TypeScript型統合: ${(scores.types * 100).toFixed(1)}%`);
  log(`\n🎯 総合統合スコア: ${(totalScore * 100).toFixed(1)}%`);

  if (totalScore >= 0.95) {
    logSuccess('\n✨ 統合状態: 優秀 - すべての統合が完了しています');
  }
  else if (totalScore >= 0.85) {
    logSuccess('\n✅ 統合状態: 良好 - ほぼすべての統合が完了しています');
  }
  else if (totalScore >= 0.70) {
    logWarning('\n⚠️  統合状態: 要改善 - いくつかの統合に問題があります');
  }
  else {
    logError('\n❌ 統合状態: 不完全 - 多くの統合に問題があります');
  }

  // 推奨アクション
  log('\n📋 推奨アクション:');
  if (scores.auth < 0.8) {
    log('   • 認証システムとの統合を完了してください');
  }
  if (scores.catData < 0.8) {
    log('   • 既存猫データとの連携を確認してください');
  }
  if (scores.navigation < 0.8) {
    log('   • ナビゲーション統合を完了してください');
  }
  if (scores.database < 0.8) {
    log('   • データベーススキーマとマイグレーションを確認してください');
  }
  if (scores.types < 0.8) {
    log('   • TypeScript型定義を完了してください');
  }

  if (totalScore >= 0.85) {
    log('   • 統合テストを実行して最終確認を行ってください');
    log('   • E2Eテストで実際の動作を確認してください');
  }
}

/**
 * メイン実行関数
 */
function main() {
  log(`${COLORS.BOLD}${COLORS.BLUE}通院履歴管理機能 - 既存システム統合確認${COLORS.RESET}`);
  log('このスクリプトは通院履歴管理機能と既存システムの統合状態を確認します。\n');

  const scores = {
    auth: verifyAuthIntegration(),
    catData: verifyCatDataIntegration(),
    navigation: verifyNavigationIntegration(),
    database: verifyDatabaseIntegration(),
    types: verifyTypeIntegration(),
  };

  runIntegrationTests();
  generateIntegrationReport(scores);

  log(`\n${COLORS.BOLD}統合確認完了${COLORS.RESET}`);
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as verifyVeterinaryIntegration };
