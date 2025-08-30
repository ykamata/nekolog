<template>
  <div class="chart-no-data-display">
    <!-- No Data State -->
    <div
      class="no-data-container bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
      role="status"
      aria-live="polite"
    >
      <!-- No Data Icon -->
      <div class="no-data-icon text-gray-400 text-6xl mb-4">
        <svg
          class="w-16 h-16 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>

      <!-- No Data Title -->
      <h3 class="no-data-title text-xl font-semibold text-gray-700 mb-3">
        データがありません
      </h3>

      <!-- No Data Message -->
      <p class="no-data-message text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
        {{ noDataMessage }}
      </p>

      <!-- Helpful Guidance -->
      <div class="guidance-section">
        <!-- Date Range Suggestion -->
        <div
          v-if="showDateRangeSuggestion"
          class="date-range-suggestion bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left"
        >
          <h4 class="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            期間を変更してみてください
          </h4>
          <p class="text-sm text-blue-700 mb-3">
            選択した期間にデータが見つかりません。以下の期間を試してみてください：
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="suggestion in dateRangeSuggestions"
              :key="suggestion.days"
              type="button"
              class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
              @click="handleDateRangeChange(suggestion.days)"
            >
              {{ suggestion.label }}
            </button>
          </div>
        </div>

        <!-- Cat Selection Suggestion -->
        <div
          v-if="showCatSelectionSuggestion"
          class="cat-selection-suggestion bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-left"
        >
          <h4 class="font-medium text-green-800 mb-2 flex items-center gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            他の猫のデータを確認
          </h4>
          <p class="text-sm text-green-700 mb-3">
            選択した猫のデータがありません。他の猫のデータを確認してみてください。
          </p>
          <button
            type="button"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            @click="handleShowAllCats"
          >
            すべての猫のデータを表示
          </button>
        </div>

        <!-- Data Entry Suggestion -->
        <div class="data-entry-suggestion bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 text-left">
          <h4 class="font-medium text-purple-800 mb-2 flex items-center gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            データを記録してみましょう
          </h4>
          <p class="text-sm text-purple-700 mb-3">
            食事データを記録すると、ここにグラフが表示されます。
          </p>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              to="/meals/record"
              class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm inline-flex items-center gap-2"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              食事を記録
            </NuxtLink>
            <NuxtLink
              to="/foods"
              class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm inline-flex items-center gap-2"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              フード管理
            </NuxtLink>
          </div>
        </div>

        <!-- Tips Section -->
        <div class="tips-section bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
          <h4 class="font-medium text-yellow-800 mb-2 flex items-center gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            ヒント
          </h4>
          <ul class="text-sm text-yellow-700 space-y-1">
            <li class="flex items-start gap-2">
              <span class="text-yellow-600">•</span>
              <span>定期的に食事を記録することで、猫の健康状態を把握できます</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-yellow-600">•</span>
              <span>グラフは食事データが蓄積されると自動的に表示されます</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-yellow-600">•</span>
              <span>複数の猫を飼っている場合は、それぞれ個別に記録してください</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Refresh Button -->
      <div class="refresh-section mt-6">
        <button
          type="button"
          class="refresh-button px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          :disabled="isRefreshing"
          @click="handleRefresh"
        >
          <svg
            :class="['w-4 h-4', { 'animate-spin': isRefreshing }]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span v-if="isRefreshing">更新中...</span>
          <span v-else>データを更新</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  catId?: string | null;
  dateRange?: {
    start: Date;
    end: Date;
  };
  selectedDays?: number;
  context?: string;
  showDateRangeSuggestion?: boolean;
  showCatSelectionSuggestion?: boolean;
  isRefreshing?: boolean;
}

interface Emits {
  (e: 'refresh'): void;
  (e: 'dateRangeChange', days: number): void;
  (e: 'showAllCats'): void;
}

const props = withDefaults(defineProps<Props>(), {
  context: 'グラフ',
  showDateRangeSuggestion: true,
  showCatSelectionSuggestion: true,
  isRefreshing: false,
});

const emit = defineEmits<Emits>();

// Computed properties
const noDataMessage = computed(() => {
  if (props.catId) {
    if (props.dateRange) {
      const startDate = props.dateRange.start.toLocaleDateString('ja-JP');
      const endDate = props.dateRange.end.toLocaleDateString('ja-JP');
      return `選択した期間（${startDate} 〜 ${endDate}）に食事データが見つかりませんでした。`;
    }
    return '選択した期間に食事データが見つかりませんでした。';
  }
  return '表示する食事データがありません。まずは食事を記録してみましょう。';
});

const dateRangeSuggestions = computed(() => {
  const suggestions = [
    { days: 7, label: '過去7日' },
    { days: 14, label: '過去14日' },
    { days: 30, label: '過去30日' },
    { days: 60, label: '過去60日' },
    { days: 90, label: '過去90日' },
  ];

  // 現在選択されている期間は除外
  return suggestions.filter(s => s.days !== props.selectedDays);
});

// Event handlers
const handleRefresh = () => {
  emit('refresh');
};

const handleDateRangeChange = (days: number) => {
  emit('dateRangeChange', days);
};

const handleShowAllCats = () => {
  emit('showAllCats');
};
</script>

<style scoped>
.chart-no-data-display {
  width: 100%;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-data-container {
  max-width: 600px;
  width: 100%;
}

.guidance-section > div {
  margin-bottom: 1rem;
}

.guidance-section > div:last-child {
  margin-bottom: 0;
}

/* Animation for refresh button */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .no-data-container {
    padding: 1.5rem;
  }

  .no-data-icon {
    font-size: 3rem;
  }

  .no-data-title {
    font-size: 1.25rem;
  }

  .guidance-section .flex {
    flex-direction: column;
  }

  .guidance-section .flex > * {
    width: 100%;
  }
}

/* Hover effects */
.date-range-suggestion button:hover,
.cat-selection-suggestion button:hover,
.data-entry-suggestion a:hover,
.refresh-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Focus styles for accessibility */
.date-range-suggestion button:focus,
.cat-selection-suggestion button:focus,
.data-entry-suggestion a:focus,
.refresh-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>
