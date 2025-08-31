<template>
  <div class="loading-spinner">
    <div
      v-if="overlay"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-sm mx-4">
        <div class="flex items-center space-x-3">
          <div class="spinner" />
          <div>
            <p class="text-gray-900 font-medium">
              {{ title }}
            </p>
            <p
              v-if="message"
              class="text-gray-600 text-sm mt-1"
            >
              {{ message }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="inline"
      class="flex items-center justify-center py-8"
    >
      <div class="flex items-center space-x-3">
        <div class="spinner" />
        <div>
          <p class="text-gray-900 font-medium">
            {{ title }}
          </p>
          <p
            v-if="message"
            class="text-gray-600 text-sm mt-1"
          >
            {{ message }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex items-center space-x-2"
    >
      <div class="spinner-small" />
      <span class="text-gray-600 text-sm">{{ title }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  title?: string;
  message?: string;
  overlay?: boolean;
  inline?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '読み込み中...',
  message: '',
  overlay: false,
  inline: false,
});
</script>

<style scoped>
.spinner {
  @apply w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin;
}

.spinner-small {
  @apply w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin;
}

/* アニメーション */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
</template>
