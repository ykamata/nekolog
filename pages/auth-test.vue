<template>
  <div class="auth-test-page">
    <div class="container">
      <h1>認証状態テスト</h1>

      <div class="auth-status">
        <h2>現在の認証状態</h2>
        <div class="status-item">
          <strong>認証済み:</strong>
          <span :class="{ 'status-true': isAuthenticated, 'status-false': !isAuthenticated }">
            {{ isAuthenticated ? 'はい' : 'いいえ' }}
          </span>
        </div>
        <div class="status-item">
          <strong>ローディング中:</strong>
          <span :class="{ 'status-true': isLoading, 'status-false': !isLoading }">
            {{ isLoading ? 'はい' : 'いいえ' }}
          </span>
        </div>
        <div
          v-if="user"
          class="status-item"
        >
          <strong>ユーザー:</strong> {{ user.email }}
        </div>
        <div
          v-if="error"
          class="status-item error"
        >
          <strong>エラー:</strong> {{ error }}
        </div>
      </div>

      <div class="token-status">
        <h2>トークン状態</h2>
        <div class="status-item">
          <strong>アクセストークン:</strong>
          <span :class="{ 'status-true': hasAccessToken, 'status-false': !hasAccessToken }">
            {{ hasAccessToken ? '存在' : '無し' }}
          </span>
        </div>
        <div class="status-item">
          <strong>リフレッシュトークン:</strong>
          <span :class="{ 'status-true': hasRefreshToken, 'status-false': !hasRefreshToken }">
            {{ hasRefreshToken ? '存在' : '無し' }}
          </span>
        </div>
      </div>

      <div class="actions">
        <h2>アクション</h2>
        <button
          :disabled="isLoading"
          class="btn btn-primary"
          @click="handleInitialize"
        >
          認証状態を初期化
        </button>
        <button
          class="btn btn-secondary"
          @click="handleClearTokens"
        >
          トークンをクリア
        </button>
        <button
          class="btn btn-success"
          @click="goToLogin"
        >
          ログインページへ
        </button>
      </div>

      <div class="persistence-status">
        <h2>永続化状態</h2>
        <div class="status-item">
          <strong>永続化された認証状態:</strong>
          <span :class="{ 'status-true': hasPersistedAuth, 'status-false': !hasPersistedAuth }">
            {{ hasPersistedAuth ? '存在' : '無し' }}
          </span>
        </div>
        <button
          class="btn btn-info"
          @click="checkPersistence"
        >
          永続化状態を確認
        </button>
        <button
          class="btn btn-warning"
          @click="testProtectedPage"
        >
          保護されたページをテスト
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 認証状態テストページ
definePageMeta({
  middleware: [], // 認証ミドルウェアをスキップ
});

const {
  user,
  isAuthenticated,
  isLoading,
  error,
  initializeAuth,
  clearTokens,
} = useAuth();

const { hasValidPersistedAuth } = useAuthPersistence();

// トークンの存在確認
const accessToken = useCookie('access-token');
const refreshToken = useCookie('refresh-token');

const hasAccessToken = computed(() => !!accessToken.value);
const hasRefreshToken = computed(() => !!refreshToken.value);
const hasPersistedAuth = ref(false);

// 認証状態を初期化
const handleInitialize = async () => {
  try {
    await initializeAuth();
  }
  catch (err) {

  }
};

// トークンをクリア
const handleClearTokens = () => {
  clearTokens();
};

// ログインページへ移動
const goToLogin = () => {
  navigateTo('/login');
};

// 永続化状態を確認
const checkPersistence = () => {
  hasPersistedAuth.value = hasValidPersistedAuth();
};

// 保護されたページをテスト
const testProtectedPage = () => {
  navigateTo('/cats');
};

// ページロード時に永続化状態を確認
onMounted(() => {
  checkPersistence();
});
</script>

<style scoped>
.auth-test-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #333;
  margin-bottom: 2rem;
  text-align: center;
}

h2 {
  color: #555;
  margin: 2rem 0 1rem 0;
  border-bottom: 2px solid #4caf50;
  padding-bottom: 0.5rem;
}

.auth-status,
.token-status,
.actions,
.persistence-status {
  margin-bottom: 2rem;
}

.status-item {
  margin: 1rem 0;
  padding: 0.5rem;
  background: #f9f9f9;
  border-radius: 4px;
}

.status-item.error {
  background: #ffebee;
  color: #c62828;
}

.status-true {
  color: #2e7d32;
  font-weight: bold;
}

.status-false {
  color: #d32f2f;
  font-weight: bold;
}

.actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #4caf50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
}

.btn-secondary {
  background: #757575;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #616161;
}

.btn-success {
  background: #2e7d32;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #1b5e20;
}

.btn-info {
  background: #1976d2;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #1565c0;
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #f57c00;
}

@media (max-width: 600px) {
  .auth-test-page {
    padding: 1rem;
  }

  .container {
    padding: 1rem;
  }

  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
