<template>
  <div class="chart-type-toggle">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      グラフの種類
    </label>

    <div class="toggle-container">
      <!-- デスクトップ用：横並びボタン -->
      <div class="hidden sm:flex toggle-buttons">
        <button
          v-for="type in chartTypes"
          :key="type.value"
          type="button"
          :class="[
            'toggle-btn',
            selectedType === type.value ? 'toggle-btn--active' : '',
          ]"
          @click="selectType(type.value)"
        >
          <span
            class="toggle-btn__icon"
            v-html="type.icon"
          />
          <span class="toggle-btn__label">{{ type.label }}</span>
        </button>
      </div>

      <!-- モバイル用：ドロップダウン -->
      <div class="sm:hidden">
        <select
          v-model="selectedType"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
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
export type ChartType = 'line' | 'stacked-bar';

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
  width: 100%;
}

/* トグルボタンコンテナ */
.toggle-buttons {
  display: flex;
  gap: 0;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

/* トグルボタン */
.toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  background: white;
  color: #4b5563;
  border: none;
  border-right: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
}

.toggle-btn:last-child {
  border-right: none;
}

.toggle-btn:hover:not(.toggle-btn--active) {
  background: #f9fafb;
  color: #1f2937;
}

.toggle-btn--active {
  background: #10b981;
  color: white;
  font-weight: 600;
}

.toggle-btn__icon {
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toggle-btn__label {
  line-height: 1;
}

/* フォーカス状態 */
.toggle-btn:focus {
  outline: none;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

/* セレクトボックス（モバイル） */
.toggle-container select {
  transition: all 0.2s ease;
}

.toggle-container select:focus {
  outline: none;
  ring: 2px;
  ring-color: #10b981;
  ring-offset: 2px;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .toggle-container select {
    font-size: 1rem; /* iOSでのズーム防止 */
  }
}

/* タブレット対応 */
@media (max-width: 1024px) and (min-width: 641px) {
  .toggle-btn {
    padding: 0.5rem 0.875rem;
    font-size: 0.75rem;
    gap: 0.25rem;
  }

  .toggle-btn__icon {
    width: 0.875rem;
    height: 0.875rem;
  }
}
</style>
