<script setup lang="ts">
// import type { Cat, Food } from '~/types/cat-meal'

// Page meta
useSeoMeta({
  title: 'ホーム - 猫の健康管理',
  description: '飼い猫の健康管理アプリのホームページ',
});

// Require authentication
definePageMeta({
  middleware: 'auth-client',
});

// State
const stats = ref({
  cats: 0,
  foods: 0,
  recentMeals: 0,
});
const isLoading = ref(false);
const error = ref<string | null>(null);

// Stores
const catsStore = useCatsStore();
const foodsStore = useFoodsStore();
const mealsStore = useMealsStore();

// Fetch dashboard stats
const fetchStats = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    console.log('📊 ホーム画面: データ取得開始');

    // Use the new dashboard stats API for simpler data fetching
    const dashboardStats = await $fetch('/api/dashboard/stats');
    console.log('📊 ダッシュボード統計:', dashboardStats);

    stats.value = {
      cats: dashboardStats.cats,
      foods: dashboardStats.foods,
      recentMeals: dashboardStats.todaysMeals,
    };

    console.log('📊 統計データ設定完了:', stats.value);
  }
  catch (err) {
    console.error('❌ ホーム画面: データ取得エラー:', err);
    error.value = `データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`;
  }
  finally {
    isLoading.value = false;
  }
};

// Quick actions data
const quickActions = [
  {
    title: '食事を記録',
    description: '猫の食事内容を記録します',
    icon: '📝',
    link: '/meals/record',
    color: 'primary',
  },
  {
    title: '食事履歴',
    description: '過去の食事記録を確認します',
    icon: '📋',
    link: '/meals/history',
    color: 'secondary',
  },
  {
    title: '猫の管理',
    description: '飼い猫の情報を管理します',
    icon: '🐱',
    link: '/cats',
    color: 'secondary',
  },
  {
    title: 'フード管理',
    description: 'フード情報を管理します',
    icon: '🥫',
    link: '/foods',
    color: 'secondary',
  },
  {
    title: 'データ分析',
    description: '食事データを分析・可視化します',
    icon: '📊',
    link: '/analytics',
    color: 'secondary',
  },
];

// Debug function for action clicks
const handleActionClick = (action: any) => {
  console.log('Action clicked:', action.title, 'Link:', action.link);
};

// Handle calendar date selection
const handleDateSelect = (data: any) => {
  console.log('📅 日付選択:', data);
  // ダイアログがカレンダーコンポーネント内で表示されるため、
  // ここでは特別な処理は不要
};

// Server-side data fetching
const { data: initialStats } = await useFetch('/api/dashboard/stats', {
  default: () => ({ cats: 0, foods: 0, todaysMeals: 0 }),
  server: true,
});

// Initialize stats with server data
if (initialStats.value) {
  stats.value = {
    cats: initialStats.value.cats,
    foods: initialStats.value.foods,
    recentMeals: initialStats.value.todaysMeals,
  };
}

// Lifecycle
onMounted(async () => {
  console.log('🏠 ホーム画面: onMounted開始');
  console.log('📊 初期統計データ:', stats.value);

  // Only fetch if we don't have data or if it's stale
  if (stats.value.cats === 0 && stats.value.foods === 0 && stats.value.recentMeals === 0) {
    console.log('📊 データが空のため再取得');
    try {
      await fetchStats();
      console.log('🏠 ホーム画面: データ取得完了');
    }
    catch (error) {
      console.error('🏠 ホーム画面: onMountedでエラー:', error);
    }
  }
  else {

  }
});
</script>

<template>
  <div class="home-page">
    <!-- Welcome Section -->
    <section class="welcome-section">
      <div class="welcome-content">
        <h1 class="welcome-title">
          猫の健康管理アプリ
        </h1>
        <p class="welcome-description">
          飼い猫の食事記録と健康管理を簡単に行えるアプリケーションです
        </p>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats-section">
      <h2 class="section-title">
        現在の状況
      </h2>

      <div
        v-if="isLoading"
        class="stats-loading"
      >
        <LoadingStates
          type="grid"
          :count="3"
        />
      </div>

      <div
        v-else-if="error"
        class="stats-error"
      >
        <p class="error-message">
          {{ error }}
        </p>
        <button
          type="button"
          class="retry-button"
          @click="fetchStats"
        >
          再試行
        </button>
      </div>

      <div
        v-else
        class="stats-grid"
      >
        <div class="stat-card">
          <div class="stat-icon">
            🐱
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ stats.cats }}
            </div>
            <div class="stat-label">
              登録猫数
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            🥫
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ stats.foods }}
            </div>
            <div class="stat-label">
              登録フード数
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            📝
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ stats.recentMeals }}
            </div>
            <div class="stat-label">
              今日の記録
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Actions Section -->
    <section class="quick-actions-section">
      <h2 class="section-title">
        クイックアクション
      </h2>
      <div class="actions-grid">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.title"
          :to="action.link"
          class="action-card"
          :class="`action-card--${action.color}`"
          @click="handleActionClick(action)"
        >
          <div class="action-icon">
            {{ action.icon }}
          </div>
          <div class="action-content">
            <h3 class="action-title">
              {{ action.title }}
            </h3>
            <p class="action-description">
              {{ action.description }}
            </p>
          </div>
          <div class="action-arrow">
            →
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Daily Calendar Section -->
    <section class="calendar-section">
      <h2 class="section-title">
        ケアカレンダー
      </h2>
      <p class="calendar-description">
        日々の食事、排泄、介護の記録を一目で確認できます。<br>日付をクリックして詳細を記録しましょう。
      </p>
      <DailyCalendar @select-date="handleDateSelect" />
    </section>

    <!-- Getting Started Section -->
    <section class="getting-started-section">
      <div class="getting-started-content">
        <h2 class="section-title">
          はじめに
        </h2>
        <p class="getting-started-description">
          まずは猫とフードを登録して、食事記録を始めましょう
        </p>
        <div class="getting-started-steps">
          <div class="step">
            <div class="step-number">
              1
            </div>
            <div class="step-content">
              <h4 class="step-title">
                猫を登録
              </h4>
              <p class="step-description">
                飼い猫の基本情報を登録します
              </p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">
              2
            </div>
            <div class="step-content">
              <h4 class="step-title">
                フードを登録
              </h4>
              <p class="step-description">
                使用するフードの情報を登録します
              </p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">
              3
            </div>
            <div class="step-content">
              <h4 class="step-title">
                食事を記録
              </h4>
              <p class="step-description">
                日々の食事内容を記録します
              </p>
            </div>
          </div>
        </div>
        <div class="getting-started-actions">
          <NuxtLink
            to="/cats"
            class="start-button start-button--primary"
          >
            猫を登録する
          </NuxtLink>
          <NuxtLink
            to="/foods"
            class="start-button start-button--secondary"
          >
            フードを登録する
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  text-align: center;
  margin-bottom: 3rem;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: #7f8c8d;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.stats-card {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: #495057;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.refresh-btn:hover:not(:disabled) {
  background: #0056b3;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.navigation-test {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
}

.nav-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.nav-link {
  padding: 0.75rem 1.5rem;
  background: white;
  color: #007bff;
  text-decoration: none;
  border: 2px solid #007bff;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: #007bff;
  color: white;
}

.nav-link.active {
  background: #007bff;
  color: white;
}

/* Responsive design */
@media (max-width: 768px) {
  .home-page {
    padding: 1rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .stats-card {
    flex-direction: column;
    gap: 1rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

/* Welcome Section */
.welcome-section {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  border-radius: 12px;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
}

.welcome-content {
  flex: 1;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.welcome-description {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
  line-height: 1.5;
}

.welcome-icon {
  font-size: 4rem;
  margin-left: 2rem;
  flex-shrink: 0;
}

/* Section Title */
.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 2rem 0;
  text-align: center;
}

/* Stats Section */
.stats-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stats-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: #666;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.stats-error {
  text-align: center;
  padding: 2rem;
}

.error-message {
  color: #e53e3e;
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: #45a049;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  border-radius: 50%;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: #4caf50;
  line-height: 1;
}

.stat-label {
  font-size: 0.92rem;
  color: #666;
  margin-top: 0.1rem;
  white-space: nowrap;
}

/* Quick Actions Section */
.quick-actions-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
  transition: all 0.2s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.action-card--primary {
  border-color: #4caf50;
  background: #f8fff8;
}

.action-card--primary:hover {
  border-color: #45a049;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
}

.action-card--secondary:hover {
  border-color: #4caf50;
}

.action-icon {
  font-size: 2rem;
  width: 48px;
  text-align: center;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.action-description {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.action-arrow {
  font-size: 1.2rem;
  color: #4caf50;
  font-weight: bold;
  flex-shrink: 0;
}

/* Calendar Section */
.calendar-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.calendar-description {
  text-align: center;
  font-size: 1rem;
  color: #666;
  margin: 0 0 2rem 0;
  line-height: 1.5;
}

/* Getting Started Section */
.getting-started-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.getting-started-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.getting-started-description {
  font-size: 1.1rem;
  color: #666;
  margin: 0 0 3rem 0;
  line-height: 1.6;
}

.getting-started-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.step-number {
  width: 48px;
  height: 48px;
  background: #4caf50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.step-description {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.getting-started-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.start-button {
  padding: 0.75rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.start-button--primary {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.start-button--primary:hover {
  background: #45a049;
  border-color: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.start-button--secondary {
  background: white;
  color: #4caf50;
  border-color: #4caf50;
}

.start-button--secondary:hover {
  background: #4caf50;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

/* Tablet Responsive */
@media (max-width: 1024px) {
  .welcome-section {
    padding: 2rem 1.5rem;
  }

  .welcome-title {
    font-size: 2rem;
  }

  .welcome-description {
    font-size: 1.1rem;
  }

  .welcome-icon {
    font-size: 3rem;
    margin-left: 1.5rem;
  }

  .stats-section,
  .quick-actions-section,
  .calendar-section,
  .getting-started-section {
    padding: 1.5rem;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .getting-started-steps {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .step {
    flex-direction: row;
    text-align: left;
  }

  .step-number {
    margin-right: 1rem;
    margin-bottom: 0;
    flex-shrink: 0;
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .home-page {
    padding: 0;
  }

  .welcome-section {
    border-radius: 0;
    margin-bottom: 1rem;
    padding: 2rem 1rem;
    flex-direction: column;
    text-align: center;
  }

  .welcome-icon {
    margin-left: 0;
    margin-top: 1rem;
    font-size: 3rem;
  }

  .welcome-title {
    font-size: 1.8rem;
  }

  .welcome-description {
    font-size: 1rem;
  }

  .stats-section,
  .quick-actions-section,
  .calendar-section,
  .getting-started-section {
    border-radius: 0;
    margin-bottom: 1rem;
    padding: 1.5rem 1rem;
    box-shadow: none;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-icon {
    font-size: 2rem;
    width: 48px;
    height: 48px;
  }

  .stat-value {
    font-size: 2rem;
  }

  .action-card {
    padding: 1rem;
  }

  .action-icon {
    font-size: 1.5rem;
  }

  .getting-started-steps {
    gap: 1rem;
  }

  .step {
    flex-direction: column;
    text-align: center;
  }

  .step-number {
    margin-right: 0;
    margin-bottom: 1rem;
  }

  .getting-started-actions {
    flex-direction: column;
    align-items: center;
  }

  .start-button {
    width: 100%;
    max-width: 300px;
    text-align: center;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .welcome-section {
    padding: 1.5rem 1rem;
  }

  .welcome-title {
    font-size: 1.6rem;
  }

  .welcome-description {
    font-size: 0.9rem;
  }

  .stats-section,
  .quick-actions-section,
  .calendar-section,
  .getting-started-section {
    padding: 1rem;
  }

  .section-title {
    font-size: 1.3rem;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .stat-value {
    font-size: 2.1rem;
  }

  .stat-label {
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .action-card {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .action-arrow {
    display: none;
  }

  .step-number {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .welcome-section,
  .stats-section,
  .quick-actions-section,
  .calendar-section,
  .getting-started-section,
  .stat-card,
  .action-card {
    border: 2px solid #333;
  }

  .start-button--primary,
  .step-number {
    background: #000;
    border-color: #000;
  }

  .start-button--secondary {
    border-color: #000;
    color: #000;
  }

  .start-button--secondary:hover {
    background: #000;
    color: #fff;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .action-card:hover,
  .start-button:hover {
    transform: none;
  }

  * {
    transition: none !important;
  }
}

/* Print styles */
@media print {
  .welcome-section {
    background: white !important;
    color: black !important;
    box-shadow: none !important;
  }

  .getting-started-actions {
    display: none;
  }
}
</style>

<!-- Compact/mobile overrides -->
<style scoped>
/* Base tightening */
.welcome-section {
  padding: 2.25rem 1.5rem;
  margin-bottom: 1.5rem;
}

.welcome-title {
  font-size: 2.1rem;
}

.welcome-description {
  font-size: 1rem;
}

.stats-section {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.stats-grid {
  gap: 0.75rem;
}

.stat-card {
  min-height: 90px;
}

.section-title {
  font-size: 1.3rem;
}

.quick-actions-section {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.actions-grid {
  gap: 0.75rem;
}

.calendar-section {
  padding: 2rem;
  margin-bottom: 1.5rem;
}

.calendar-description {
  font-size: 0.95rem;
}

.getting-started-section {
  padding: 2rem;
  margin-bottom: 1.5rem;
}

/* Mobile specific */
@media (max-width: 768px) {
  .home-page {
    padding: 1rem 0;
  }

  .welcome-section {
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    gap: 0.35rem;
  }

  .welcome-title {
    font-size: 1.1rem;
  }

  .welcome-description {
    font-size: 0.78rem;
  }

  .stats-section {
    padding: 0.75rem 0.85rem;
    margin-bottom: 0.5rem;
  }

  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.75rem;
    min-height: 60px;
  }

  .section-title {
    font-size: 0.95rem;
  }

  .calendar-section {
    padding: 1rem 0;
    margin-bottom: 1rem;
  }

  .calendar-description {
    font-size: 0.85rem;
  }

  /* Hide less important sections on mobile */
  .quick-actions-section,
  .getting-started-section {
    display: none;
  }
}
</style>
