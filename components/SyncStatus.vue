<template>
  <div class="sync-status">
    <!-- オンライン/オフライン状態表示 -->
    <div
      class="flex items-center gap-2 p-3 rounded-lg border"
      :class="statusClasses"
    >
      <div class="flex items-center gap-2">
        <!-- 接続状態アイコン -->
        <div
          class="w-3 h-3 rounded-full"
          :class="indicatorClasses"
        />

        <!-- 状態テキスト -->
        <span class="text-sm font-medium">
          {{ statusText }}
        </span>
      </div>
    </div>

    <!-- 詳細情報 -->
    <div
      v-if="showDetails"
      class="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-2"
    >
      <!-- 最後の同期時刻 -->
      <div
        v-if="syncStatus.lastSync"
        class="flex justify-between"
      >
        <span class="text-gray-600">最後のデータ更新:</span>
        <span>{{ formatDate(syncStatus.lastSync) }}</span>
      </div>

      <!-- エラー表示 -->
      <div
        v-if="syncStatus.error"
        class="text-red-600"
      >
        <span class="font-medium">エラー:</span>
        {{ syncStatus.error }}
      </div>

      <!-- オフライン時の注意メッセージ -->
      <div
        v-if="!syncStatus.isOnline"
        class="text-orange-600 text-xs"
      >
        オフライン時はデータの参照のみ可能です。登録・更新・削除はオンライン時に行ってください。
      </div>
    </div>

    <!-- 詳細表示切り替えボタン -->
    <button
      data-testid="toggle-details-button"
      class="mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      @click="showDetails = !showDetails"
    >
      {{ showDetails ? "詳細を隠す" : "詳細を表示" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useSync } from '~/composables/useSync';

interface Props {
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
});

const { syncStatus } = useSync();

const showDetails = ref(!props.compact);

// 状態に応じたスタイルクラス
const statusClasses = computed(() => {
  if (!syncStatus.value.isOnline) {
    return 'bg-orange-50 border-orange-200 text-orange-800';
  }
  return 'bg-green-50 border-green-200 text-green-800';
});

const indicatorClasses = computed(() => {
  if (!syncStatus.value.isOnline) {
    return 'bg-orange-500';
  }
  return 'bg-green-500';
});

const statusText = computed(() => {
  if (!syncStatus.value.isOnline) {
    return 'オフライン（参照のみ）';
  }
  return 'オンライン';
});

// 日付フォーマット
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
</script>

<style scoped>
.sync-status {
  @apply font-sans;
}
</style>
