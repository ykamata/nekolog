<script setup lang="ts">
// Page meta
useSeoMeta({
  title: 'ログイン - 猫の健康管理',
  description: '猫の健康管理アプリにログインします',
});

// Disable layout for login page
definePageMeta({
  layout: false,
});

// Auth composable
const { login, isLoading, error, clearError, isAuthenticated } = useAuth();

// Form state
const form = reactive({
  email: '',
  password: '',
});

const formErrors = ref<Record<string, string>>({});

// Redirect if already authenticated
watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      navigateTo('/');
    }
  },
  { immediate: true },
);

// Handle form submission
const handleSubmit = async () => {
  // Clear previous errors
  clearError();
  formErrors.value = {};

  // Basic validation
  if (!form.email) {
    formErrors.value.email = 'メールアドレスを入力してください';
  }
  if (!form.password) {
    formErrors.value.password = 'パスワードを入力してください';
  }

  if (Object.keys(formErrors.value).length > 0) {
    return;
  }

  try {
    await login({
      email: form.email,
      password: form.password,
    });

    // Redirect to home page on success
    await navigateTo('/');
  }
  catch (err) {
    // Error is handled by the auth composable
    // Login error will be displayed via the error state
  }
};

// Handle register navigation
const goToRegister = () => {
  navigateTo('/register');
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Header -->
      <div class="login-header">
        <div class="app-logo">
          <span class="logo-icon">🐱</span>
          <h1 class="logo-text">
            猫の健康管理
          </h1>
        </div>
        <p class="login-subtitle">
          アカウントにログインしてください
        </p>
      </div>

      <!-- Login Form -->
      <form
        class="login-form"
        @submit.prevent="handleSubmit"
      >
        <!-- Email Field -->
        <div class="form-group">
          <label
            for="email"
            class="form-label"
          > メールアドレス </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="form-input"
            :class="{ 'form-input--error': formErrors.email || error }"
            placeholder="example@email.com"
            autocomplete="email"
            :disabled="isLoading"
          >
          <div
            v-if="formErrors.email"
            class="form-error"
          >
            {{ formErrors.email }}
          </div>
        </div>

        <!-- Password Field -->
        <div class="form-group">
          <label
            for="password"
            class="form-label"
          > パスワード </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            :class="{ 'form-input--error': formErrors.password || error }"
            placeholder="パスワードを入力"
            autocomplete="current-password"
            :disabled="isLoading"
          >
          <div
            v-if="formErrors.password"
            class="form-error"
          >
            {{ formErrors.password }}
          </div>
        </div>

        <!-- Global Error -->
        <div
          v-if="error"
          class="global-error"
        >
          {{ error }}
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="login-button"
          :disabled="isLoading"
        >
          <span
            v-if="isLoading"
            class="loading-spinner"
          />
          <span v-else>ログイン</span>
        </button>
      </form>

      <!-- Register Link -->
      <div class="register-link">
        <p class="register-text">
          アカウントをお持ちでない方は
        </p>
        <button
          type="button"
          class="register-button"
          @click="goToRegister"
        >
          新規登録
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
  padding: 1rem;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.login-header {
  text-align: center;
  padding: 2rem 2rem 1rem 2rem;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
}

.app-logo {
  margin-bottom: 1rem;
}

.logo-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.login-subtitle {
  font-size: 1rem;
  margin: 0;
  opacity: 0.9;
}

.login-form {
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-input--error {
  border-color: #e53e3e;
}

.form-input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.6;
}

.form-error {
  color: #e53e3e;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.global-error {
  background: #fed7d7;
  border: 1px solid #feb2b2;
  color: #c53030;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  text-align: center;
}

.login-button {
  width: 100%;
  padding: 0.875rem;
  background: #2e7d32; /* より濃い緑でコントラスト比を改善 */
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.login-button:hover:not(:disabled) {
  background: #1b5e20; /* ホバー時もコントラストを維持 */
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
}

.login-button:disabled {
  background: #a0a0a0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.register-link {
  padding: 1.5rem 2rem 2rem 2rem;
  text-align: center;
  border-top: 1px solid #e2e8f0;
}

.register-text {
  color: #666;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.register-button {
  color: #2e7d32; /* より濃い緑でコントラスト比を改善 */
  background: none;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  transition: all 0.2s ease;
}

.register-button:hover {
  color: #1b5e20; /* ホバー時もコントラストを維持 */
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .login-page {
    padding: 0;
  }

  .login-container {
    border-radius: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .login-header {
    padding: 2rem 1.5rem 1rem 1.5rem;
  }

  .logo-icon {
    font-size: 2.5rem;
  }

  .logo-text {
    font-size: 1.3rem;
  }

  .login-form {
    padding: 1.5rem;
  }

  .register-link {
    padding: 1rem 1.5rem 1.5rem 1.5rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .login-container {
    border: 2px solid #333;
  }

  .form-input {
    border-color: #333;
  }

  .login-button {
    background: #000;
  }

  .login-button:hover:not(:disabled) {
    background: #333;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .login-button:hover:not(:disabled) {
    transform: none;
  }

  * {
    transition: none !important;
  }
}
</style>
