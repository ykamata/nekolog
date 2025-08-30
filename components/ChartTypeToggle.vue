<template>
  <div class="chart-type-toggle">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      グラフの種類
    </label>

    <div class="toggle-container">
      <!-- デスクトップ用：横並びボタン -->
      <div class="hidden sm:flex rounded-lg border border-gray-300 bg-gray-50 p-1">
        <button
          v-for="type in chartTypes"
          :key="type.value"
          type="button"
          :class="[
            'flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200',
            selectedType === type.value
              ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
          ]"
          @click="selectType(type.value)"
        >
          <span
            class="w-4 h-4 mr-2"
            v-html="type.icon"
          />
          {{ type.label }}
        </button>
      </div>

      <!-- モバイル用：ドロップダウン -->
      <div class="sm:hidden">
        <select
          v-model="selectedType"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          @change="handleMobileChange"
        >
          <option
            v-for="type in chartTypes"
            :key="type.value"
            :value="type.value"
          >
            {{ type.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 選択されたチャートタイプの説明 -->
    <div class="mt-2 text-xs text-gray-500">
      {{ selectedTypeDescription }}
    </div>
  </div>
</template>

<script setup lang="ts">
export type ChartType = 'line' | 'bar' | 'stacked-bar';

interface Props {
  modelValue?: ChartType;
}

interface Emits {
  (e: 'update:modelValue', value: ChartType): void;
  (e: 'change', value: ChartType): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ルーターとルートを使用してURLパラメータを管理
const router = useRouter();
const route = useRoute();

// チャートタイプの定義（SVGアイコンを直接文字列として定義）
const chartTypes = [
  {
    value: 'line' as ChartType,
    label: '線グラフ',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22,6 13.5,15.5 8.5,10.5 2,17"></polyline><polyline points="16,6 22,6 22,12"></polyline></svg>',
    description: '時系列データの変化を線で表示します',
  },
  {
    value: 'bar' as ChartType,
    label: '棒グラフ',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>',
    description: '各日のデータを棒グラフで表示します',
  },
  {
    value: 'stacked-bar' as ChartType,
    label: '積み上げ棒グラフ',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="10"></rect><rect x="14" y="7" width="3" height="10"></rect></svg>',
    description: 'ドライフードとウェットフードを積み上げて表示します',
  },
];

// 選択されたチャートタイプ
const selectedType = ref<ChartType>(props.modelValue || 'line');

// 選択されたタイプの説明を取得
const selectedTypeDescription = computed(() => {
  const type = chartTypes.find(t => t.value === selectedType.value);
  return type?.description || '';
});

// 初期化
onMounted(() => {
  // URLパラメータからチャートタイプを取得
  const chartTypeFromUrl = route.query.chartType as ChartType;
  if (chartTypeFromUrl && chartTypes.some(t => t.value === chartTypeFromUrl)) {
    selectedType.value = chartTypeFromUrl;
  }
});

// propsの変更を監視
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    selectedType.value = newValue;
  }
});

// チャートタイプ選択（デスクトップ用）
const selectType = (type: ChartType) => {
  if (selectedType.value === type) return;

  selectedType.value = type;
  emitChange();
  updateUrlParams();
};

// モバイル用の変更処理
const handleMobileChange = () => {
  emitChange();
  updateUrlParams();
};

// 変更イベントを発行
const emitChange = () => {
  emit('update:modelValue', selectedType.value);
  emit('change', selectedType.value);
};

// URLパラメータを更新
const updateUrlParams = () => {
  const query = { ...route.query };
  query.chartType = selectedType.value;

  // ルートを更新（ページリロードなし）
  router.push({ query });
};
</script>

<style scoped>
.chart-type-toggle {
  @apply w-full;
}

.toggle-container button {
  @apply transition-all duration-200 ease-in-out;
}

.toggle-container button:hover {
  @apply transform scale-105;
}

/* アクティブボタンのアニメーション */
.toggle-container button.active {
  @apply animate-pulse;
}

/* フォーカス状態のスタイル */
.toggle-container button:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

.toggle-container select:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .toggle-container select {
    @apply text-base; /* iOSでのズーム防止 */
  }
}

/* ダークモード対応（将来的な拡張用） */
@media (prefers-color-scheme: dark) {
  .toggle-container {
    @apply border-gray-600 bg-gray-800;
  }

  .toggle-container button {
    @apply text-gray-300;
  }

  .toggle-container button:hover {
    @apply text-white bg-gray-700;
  }
}
</style>
