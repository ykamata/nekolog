<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">
      Analytics API テスト
    </h1>

    <div class="mb-4">
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        :disabled="loading"
        @click="testAPI"
      >
        {{ loading ? 'テスト中...' : 'APIテスト実行' }}
      </button>
    </div>

    <div
      v-if="error"
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
    >
      <strong>エラー:</strong> {{ error }}
    </div>

    <div
      v-if="result"
      class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
    >
      <strong>成功:</strong> {{ result.dailyCalories?.length || 0 }}日分のデータを取得しました
    </div>

    <div
      v-if="result"
      class="bg-gray-100 p-4 rounded"
    >
      <h3 class="font-bold mb-2">
        取得データ:
      </h3>
      <pre class="text-sm overflow-auto">{{ JSON.stringify(result, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<any>(null);

const testAPI = async () => {
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    console.log('APIテスト開始...');

    // 直接$fetchを使用してAPIをテスト
    const response = await $fetch('/api/meals/analytics', {
      query: {
        catId: 'cat2',
        days: '7',
      },
    });

    console.log('APIレスポンス:', response);
    result.value = response.analytics;
  }
  catch (err) {
    console.error('APIエラー:', err);
    error.value = err instanceof Error ? err.message : 'Unknown error';
  }
  finally {
    loading.value = false;
  }
};
</script>
