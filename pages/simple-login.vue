<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          簡単ログインテスト
        </h2>
      </div>
      <form
        class="mt-8 space-y-6"
        @submit.prevent="handleSubmit"
      >
        <div>
          <label
            for="email"
            class="sr-only"
          >メールアドレス</label>
          <input
            id="email"
            v-model="email"
            name="email"
            type="email"
            required
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="メールアドレス"
          >
        </div>
        <div>
          <label
            for="password"
            class="sr-only"
          >パスワード</label>
          <input
            id="password"
            v-model="password"
            name="password"
            type="password"
            required
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="パスワード"
          >
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ loading ? 'ログイン中...' : 'ログイン' }}
          </button>
        </div>
      </form>

      <div
        v-if="message"
        class="mt-4 p-4 rounded"
        :class="messageClass"
      >
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

const email = ref('test@example.com');
const password = ref('password123');
const loading = ref(false);
const message = ref('');
const messageClass = ref('');

// useAuthを使用して認証状態を管理
const { login } = useAuth();
const { handleLoginRedirect } = useRedirect();

// 初期化完了を待つ
onMounted(() => {
  console.log('simple-loginページがマウントされました');
});

const handleSubmit = async () => {
  console.log('フォーム送信開始');
  loading.value = true;
  message.value = '';

  try {
    console.log('ログイン試行:', { email: email.value });

    // useAuthを使用してログイン（認証状態も更新される）
    const response = await login({
      email: email.value,
      password: password.value,
    });

    console.log('ログイン成功:', response);
    message.value = `ログイン成功: ${response.user.email}`;
    messageClass.value = 'bg-green-100 text-green-800';

    // 認証状態が更新されたので、適切なリダイレクト処理を実行
    await handleLoginRedirect();
  }
  catch (error) {
    message.value = `ログインエラー: ${error instanceof Error ? error.message : 'Unknown error'}`;
    messageClass.value = 'bg-red-100 text-red-800';
  }
  finally {
    loading.value = false;
  }
};
</script>
