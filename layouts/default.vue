<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': isCollapsed }">
    <!-- Desktop Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="app-logo">
          <span class="logo-icon">🐱</span>
          <span class="logo-text">猫の健康管理</span>
        </div>
        <button
          type="button"
          class="sidebar-toggle"
          :title="isCollapsed ? 'メニューを開く' : 'メニューを閉じる'"
          @click="toggleSidebar"
        >
          {{ isCollapsed ? '›' : '‹' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink
          to="/"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/' }"
          :title="isCollapsed ? 'ホーム' : undefined"
        >
          <span class="nav-icon">🏠</span>
          <span class="nav-text">ホーム</span>
        </NuxtLink>

        <NuxtLink
          to="/meals/record"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/meals/record' }"
          :title="isCollapsed ? '食事記録' : undefined"
        >
          <span class="nav-icon">📝</span>
          <span class="nav-text">食事記録</span>
        </NuxtLink>

        <NuxtLink
          to="/meals/history"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/meals/history' }"
          :title="isCollapsed ? '食事履歴' : undefined"
        >
          <span class="nav-icon">📋</span>
          <span class="nav-text">食事履歴</span>
        </NuxtLink>

        <NuxtLink
          to="/cats"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/cats' }"
          :title="isCollapsed ? '猫の管理' : undefined"
        >
          <span class="nav-icon">🐱</span>
          <span class="nav-text">猫の管理</span>
        </NuxtLink>

        <NuxtLink
          to="/foods"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/foods' }"
          :title="isCollapsed ? 'フード管理' : undefined"
        >
          <span class="nav-icon">🥫</span>
          <span class="nav-text">フード管理</span>
        </NuxtLink>

        <NuxtLink
          to="/veterinary-hospitals"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/veterinary-hospitals' }"
          :title="isCollapsed ? '病院管理' : undefined"
        >
          <span class="nav-icon">🏥</span>
          <span class="nav-text">病院管理</span>
        </NuxtLink>

        <NuxtLink
          to="/veterinary-doctors"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/veterinary-doctors' }"
          :title="isCollapsed ? '先生管理' : undefined"
        >
          <span class="nav-icon">👨‍⚕️</span>
          <span class="nav-text">先生管理</span>
        </NuxtLink>

        <NuxtLink
          to="/veterinary-visits"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/veterinary-visits' }"
          :title="isCollapsed ? '通院履歴' : undefined"
        >
          <span class="nav-icon">📋</span>
          <span class="nav-text">通院履歴</span>
        </NuxtLink>

        <NuxtLink
          to="/veterinary-appointments"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/veterinary-appointments' }"
          :title="isCollapsed ? '予約管理' : undefined"
        >
          <span class="nav-icon">📅</span>
          <span class="nav-text">予約管理</span>
        </NuxtLink>

        <NuxtLink
          to="/medications"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/medications' }"
          :title="isCollapsed ? '薬の管理' : undefined"
        >
          <span class="nav-icon">💊</span>
          <span class="nav-text">薬の管理</span>
        </NuxtLink>

        <NuxtLink
          to="/analytics"
          class="nav-item"
          :class="{ 'nav-item--active': $route.path === '/analytics' }"
          :title="isCollapsed ? 'データ分析' : undefined"
        >
          <span class="nav-icon">📊</span>
          <span class="nav-text">データ分析</span>
        </NuxtLink>
      </nav>

      <!-- User Info & Logout (Desktop) -->
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-details">
            <div class="user-name">
              {{ user?.name || user?.email }}
            </div>
            <button
              type="button"
              class="logout-button"
              :title="isCollapsed ? 'ログアウト' : undefined"
              @click="handleLogout"
            >
              <span class="logout-icon">🚪</span>
              <span class="logout-text">ログアウト</span>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Mobile Header -->
      <header class="mobile-header">
        <div class="mobile-header-content">
          <div class="app-logo">
            <span class="logo-icon">🐱</span>
            <span class="logo-text">猫の健康管理</span>
          </div>
          <div class="mobile-actions">
            <button
              type="button"
              class="mobile-logout"
              title="ログアウト"
              @click="handleLogout"
            >
              👤
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="page-content">
        <slot />
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="bottom-nav">
      <NuxtLink
        to="/"
        class="bottom-nav-item"
        :class="{ 'bottom-nav-item--active': $route.path === '/' }"
      >
        <span class="nav-icon">🏠</span>
        <span class="nav-text">ホーム</span>
      </NuxtLink>

      <NuxtLink
        to="/meals/record"
        class="bottom-nav-item"
        :class="{ 'bottom-nav-item--active': $route.path === '/meals/record' }"
      >
        <span class="nav-icon">📝</span>
        <span class="nav-text">記録</span>
      </NuxtLink>

      <NuxtLink
        to="/meals/history"
        class="bottom-nav-item"
        :class="{ 'bottom-nav-item--active': $route.path === '/meals/history' }"
      >
        <span class="nav-icon">📋</span>
        <span class="nav-text">履歴</span>
      </NuxtLink>

      <NuxtLink
        to="/cats"
        class="bottom-nav-item"
        :class="{ 'bottom-nav-item--active': $route.path === '/cats' }"
      >
        <span class="nav-icon">🐱</span>
        <span class="nav-text">猫</span>
      </NuxtLink>

      <NuxtLink
        to="/analytics"
        class="bottom-nav-item"
        :class="{ 'bottom-nav-item--active': $route.path === '/analytics' }"
      >
        <span class="nav-icon">📊</span>
        <span class="nav-text">分析</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
// Layout component for the cat meal management app
// Provides responsive navigation with sidebar for desktop and bottom tabs for mobile

// Authentication
const { user, logout } = useAuth();

// Sidebar collapse state (persisted in localStorage)
const STORAGE_KEY = 'nekolog:sidebar-collapsed';
const isCollapsed = ref(false);

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    isCollapsed.value = stored === 'true';
  }
});

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem(STORAGE_KEY, String(isCollapsed.value));
};

// Handle logout
const handleLogout = async () => {
  try {
    await logout();
  }
  catch (error) {
    // エラーログを出力（開発時のみ）
    if (import.meta.dev) {
      // eslint-disable-next-line no-console
      console.error('Logout failed:', error);
    }
  }
};
</script>

<style scoped>
/* CSS variables for sidebar width */
.app-layout {
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 64px;

  display: flex;
  min-height: 100vh;
  background-color: #f8f9fa;
}

/* Desktop Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: 100;
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 72px;
  flex-shrink: 0;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow: hidden;
  flex: 1;
}

.logo-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.logo-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s ease;
}

/* Toggle button */
.sidebar-toggle {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.sidebar-toggle:hover {
  background: #e8f5e9;
  border-color: #4caf50;
  color: #4caf50;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: #666;
  text-decoration: none;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  white-space: nowrap;
}

.nav-item:hover {
  background-color: #f8f9fa;
  color: #333;
}

.nav-item--active {
  background-color: #e8f5e9;
  color: #2e7d32;
  border-left-color: #4caf50;
}

.nav-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.nav-text {
  font-weight: 500;
  overflow: hidden;
  transition: opacity 0.2s ease;
}

.sidebar-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
  overflow: hidden;
}

.user-info {
  margin-bottom: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}

.logout-button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  align-self: flex-start;
  padding: 0.25rem 0.5rem;
  background: #f8f9fa;
  color: #666;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.logout-button:hover {
  background: #e2e8f0;
  color: #333;
}

.logout-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
}

.logout-text {
  overflow: hidden;
  transition: opacity 0.2s ease;
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.25s ease;
}

.mobile-header {
  display: none;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 50;
}

.mobile-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.mobile-logout {
  width: 32px;
  height: 32px;
  border: none;
  background: #f8f9fa;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.mobile-logout:hover {
  background: #e2e8f0;
}

.page-content {
  flex: 1;
  padding: 2rem;
  padding-bottom: 6rem; /* Space for mobile bottom nav */
}

/* Mobile Bottom Navigation */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 0.5rem;
  z-index: 100;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  color: #666;
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 8px;
  flex: 1;
  text-align: center;
}

.bottom-nav-item:hover {
  background-color: #f8f9fa;
  color: #333;
}

.bottom-nav-item--active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.bottom-nav-item .nav-icon {
  font-size: 1.1rem;
}

.bottom-nav-item .nav-text {
  font-size: 0.75rem;
  font-weight: 500;
}

/* ===== Collapsed state ===== */
.sidebar-collapsed .sidebar {
  width: var(--sidebar-collapsed-width);
}

.sidebar-collapsed .main-content {
  margin-left: var(--sidebar-collapsed-width);
}

/* 折り畳み時: テキスト類を非表示 */
.sidebar-collapsed .logo-text,
.sidebar-collapsed .nav-text,
.sidebar-collapsed .user-name,
.sidebar-collapsed .logout-text {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

/* 折り畳み時: nav-item のパディングをアイコン中央寄せに */
.sidebar-collapsed .nav-item {
  padding: 0.75rem;
  justify-content: center;
}

/* 折り畳み時: フッターをアイコン中央寄せに */
.sidebar-collapsed .sidebar-footer {
  padding: 1rem 0;
  display: flex;
  justify-content: center;
}

.sidebar-collapsed .user-details {
  align-items: center;
}

.sidebar-collapsed .logout-button {
  padding: 0.25rem;
  justify-content: center;
}

/* 折り畳み時: ヘッダーをアイコン中央寄せに */
.sidebar-collapsed .sidebar-header {
  justify-content: center;
  padding: 1.5rem 0.5rem;
}

.sidebar-collapsed .app-logo {
  flex: 0;
}

/* Tablet and Mobile Responsive */
@media (max-width: 1024px) {
  .app-layout {
    --sidebar-width: 240px;
  }

  .page-content {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .main-content {
    margin-left: 0 !important;
  }

  .mobile-header {
    display: block;
  }

  .page-content {
    padding: 0;
    padding-bottom: 6rem;
  }

  .bottom-nav {
    display: flex;
  }

  .logo-text {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .page-content {
    padding: 0;
    padding-bottom: 6rem;
  }

  .mobile-header {
    padding: 0.75rem;
  }

  .logo-text {
    font-size: 0.9rem;
  }

  .bottom-nav-item .nav-text {
    font-size: 0.7rem;
  }
}

/* Dark mode support (future enhancement) */
@media (prefers-color-scheme: dark) {
  .app-layout {
    background-color: #1a1a1a;
  }

  .sidebar,
  .mobile-header,
  .bottom-nav {
    background: #2d2d2d;
    border-color: #404040;
  }

  .logo-text,
  .nav-text {
    color: #e0e0e0;
  }

  .nav-item {
    color: #b0b0b0;
  }

  .nav-item:hover {
    background-color: #3a3a3a;
    color: #e0e0e0;
  }

  .nav-item--active {
    background-color: #1b4332;
    color: #4caf50;
  }

  .bottom-nav-item {
    color: #b0b0b0;
  }

  .bottom-nav-item:hover {
    background-color: #3a3a3a;
    color: #e0e0e0;
  }

  .bottom-nav-item--active {
    background-color: #1b4332;
    color: #4caf50;
  }
}
</style>
