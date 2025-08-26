<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">
      ログインテスト
    </h1>

    <div class="mb-4">
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        @click="testDirectLogin"
      >
        直接ログインテスト
      </button>

      <button
        class="bg-green-500 text-white px-4 py-2 rounded"
        @click="testApiCall"
      >
        API直接呼び出し
      </button>
    </div>

    <div
      v-if="result"
      class="mt-4 p-4 bg-gray-100 rounded"
    >
      <h3 class="font-bold">
        結果:
      </h3>
      <pre>{{ result }}</pre>
    </div>

    <div
      v-if="error"
      class="mt-4 p-4 bg-red-100 rounded"
    >
      <h3 class="font-bold text-red-600">
        エラー:
      </h3>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const result = ref(null);
const error = ref(null);

const testDirectLogin = async () => {
  console.log('直接ログインテスト開始');
  result.value = null;
  error.value = null;

  try {
    const { login } = useAuth();
    const response = await login({
      email: 'test@example.com',
      password: 'password123',
    });
    result.value = response;
    console.log('ログイン成功:', response);
  }
  catch (err) {
    error.value = err;
    console.error('ログインエラー:', err);
  }
};

const testApiCall = async () => {
  console.log('API直接呼び出しテスト開始');
  result.value = null;
  error.value = null;

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    result.value = response;
    console.log('API呼び出し成功:', response);
  }
  catch (err) {
    error.value = err;
    console.error('API呼び出しエラー:', err);
  }
};
</script>
