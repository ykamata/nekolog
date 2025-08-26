<script setup lang="ts">
// デバッグ用のログインテストページ
definePageMeta({
  layout: false,
});

const email = ref('test@example.com');
const password = ref('password123');
const result = ref<any>(null);
const error = ref<any>(null);
const loading = ref(false);

// 直接APIを呼び出すテスト
const testDirectAPI = async () => {
  console.log('直接API呼び出しテスト開始');
  loading.value = true;
  result.value = null;
  error.value = null;

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    });

    result.value = response;
    console.log('直接API呼び出し成功:', response);
  }
  catch (err) {
    error.value = err;
    console.error('直接API呼び出しエラー:', err);
  }
  finally {
    loading.value = false;
  }
};

// useAuthを使ったテスト
const testUseAuth = async () => {
  console.log('useAuthテスト開始');
  loading.value = true;
  result.value = null;
  error.value = null;

  try {
    const { login } = useAuth();
    console.log('login関数の型:', typeof login);

    const response = await login({
      email: email.value,
      password: password.value,
    });

    result.value = response;
    console.log('useAuthテスト成功:', response);
  }
  catch (err) {
    error.value = err;
    console.error('useAuthテストエラー:', err);
  }
  finally {
    loading.value = false;
  }
};

// 認証状態を確認
const { isAuthenticated, user, isLoading, error: authError } = useAuth();

onMounted(() => {
  console.log('debug-loginページマウント');
  console.log('認証状態:', {
    isAuthenticated: isAuthenticated.value,
    user: user.value,
    isLoading: isLoading.value,
    authError: authError.value,
  });
});
</script>

<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">
      ログイン機能デバッグ
    </h1>

    <!-- 認証状態表示 -->
    <div class="mb-6 p-4 bg-gray-100 rounded">
      <h2 class="text-lg font-semibold mb-2">
        現在の認証状態
      </h2>
      <div class="space-y-1 text-sm">
        <div>認証済み: {{ isAuthenticated }}</div>
        <div>ユーザー: {{ user?.email || 'なし' }}</div>
        <div>ローディング: {{ isLoading }}</div>
        <div>エラー: {{ authError || 'なし' }}</div>
      </div>
    </div>

    <!-- 入力フォーム -->
    <div class="mb-6">
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">メールアドレス</label>
        <input
          v-model="email"
          type="email"
          class="w-full p-2 border rounded"
          placeholder="test@example.com"
        >
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">パスワード</label>
        <input
          v-model="password"
          type="password"
          class="w-full p-2 border rounded"
          placeholder="password123"
        >
      </div>
    </div>

    <!-- テストボタン -->
    <div class="space-y-4 mb-6">
      <button
        :disabled="loading"
        class="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        @click="testDirectAPI"
      >
        直接API呼び出しテスト
      </button>

      <button
        :disabled="loading"
        class="w-full p-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        @click="testUseAuth"
      >
        useAuthテスト
      </button>
    </div>

    <!-- ローディング表示 -->
    <div
      v-if="loading"
      class="text-center py-4"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      <div class="mt-2">
        処理中...
      </div>
    </div>

    <!-- 結果表示 -->
    <div
      v-if="result"
      class="mb-6 p-4 bg-green-100 rounded"
    >
      <h3 class="text-lg font-semibold mb-2 text-green-800">
        成功
      </h3>
      <pre class="text-sm overflow-auto">{{ JSON.stringify(result, null, 2) }}</pre>
    </div>

    <!-- エラー表示 -->
    <div
      v-if="error"
      class="mb-6 p-4 bg-red-100 rounded"
    >
      <h3 class="text-lg font-semibold mb-2 text-red-800">
        エラー
      </h3>
      <pre class="text-sm overflow-auto">{{ JSON.stringify(error, null, 2) }}</pre>
    </div>

    <!-- ナビゲーション -->
    <div class="space-x-4">
      <NuxtLink
        to="/login"
        class="text-blue-500 hover:underline"
      >
        通常のログインページ
      </NuxtLink>
      <NuxtLink
        to="/simple-login"
        class="text-blue-500 hover:underline"
      >
        シンプルログインページ
      </NuxtLink>
      <NuxtLink
        to="/test-login"
        class="text-blue-500 hover:underline"
      >
        テストログインページ
      </NuxtLink>
    </div>
  </div>
</template>
