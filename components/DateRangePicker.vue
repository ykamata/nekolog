<template>
  <div class="date-range-picker">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      期間を選択
    </label>

    <!-- プリセットボタン -->
    <div class="preset-buttons mb-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          v-for="preset in presets"
          :key="preset.key"
          type="button"
          :class="[
            'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
            selectedPreset === preset.key
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
          ]"
          @click="selectPreset(preset.key)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- カスタム日付範囲入力 -->
    <div class="custom-range">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            for="start-date"
            class="block text-xs font-medium text-gray-600 mb-1"
          >
            開始日
          </label>
          <input
            id="start-date"
            v-model="startDateInput"
            type="date"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            :max="endDateInput"
            @change="handleDateChange"
          >
        </div>
        <div>
          <label
            for="end-date"
            class="block text-xs font-medium text-gray-600 mb-1"
          >
            終了日
          </label>
          <input
            id="end-date"
            v-model="endDateInput"
            type="date"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            :min="startDateInput"
            :max="todayString"
            @change="handleDateChange"
          >
        </div>
      </div>

      <!-- バリデーションエラー -->
      <div
        v-if="validationError"
        class="mt-2 text-sm text-red-600"
      >
        {{ validationError }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DateRange {
  start: Date;
  end: Date;
}

interface Props {
  modelValue?: DateRange;
}

interface Emits {
  (e: 'update:modelValue', value: DateRange): void;
  (e: 'change', value: DateRange): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ルーターとルートを使用してURLパラメータを管理
const router = useRouter();
const route = useRoute();

// 今日の日付
const today = new Date();
const todayString = today.toISOString().split('T')[0];

// プリセット定義
const presets = [
  {
    key: 'today',
    label: '今日',
    getRange: () => ({
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
    }),
  },
  {
    key: 'week',
    label: '過去7日',
    getRange: () => {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return {
        start,
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
      };
    },
  },
  {
    key: 'month',
    label: '過去30日',
    getRange: () => {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return {
        start,
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
      };
    },
  },
  {
    key: 'custom',
    label: 'カスタム',
    getRange: () => null,
  },
];

// 状態管理
const selectedPreset = ref<string>('week');
const startDateInput = ref<string>('');
const endDateInput = ref<string>('');
const validationError = ref<string>('');

// 初期化
onMounted(() => {
  initializeDateRange();
});

// propsの変更を監視
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    updateInputsFromRange(newValue);
  }
});

// 初期化処理
const initializeDateRange = () => {
  // URLパラメータから日付範囲を取得
  const startParam = route.query.startDate as string;
  const endParam = route.query.endDate as string;
  const presetParam = route.query.preset as string;

  if (startParam && endParam) {
    // URLパラメータから復元
    const start = new Date(startParam);
    const end = new Date(endParam);

    if (isValidDate(start) && isValidDate(end)) {
      selectedPreset.value = presetParam || 'custom';
      updateInputsFromRange({ start, end });
      emitChange({ start, end });
      return;
    }
  }

  // デフォルト値（過去7日）を設定
  if (props.modelValue) {
    updateInputsFromRange(props.modelValue);
  }
  else {
    selectPreset('week');
  }
};

// 日付の妥当性チェック
const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

// 入力フィールドを日付範囲から更新
const updateInputsFromRange = (range: DateRange) => {
  startDateInput.value = formatDateForInput(range.start);
  endDateInput.value = formatDateForInput(range.end);
};

// 日付をinput[type="date"]用にフォーマット
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0]!;
};

// プリセット選択
const selectPreset = (presetKey: string) => {
  selectedPreset.value = presetKey;
  validationError.value = '';

  const preset = presets.find(p => p.key === presetKey);
  if (preset && preset.getRange) {
    const range = preset.getRange();
    if (range) {
      updateInputsFromRange(range);
      emitChange(range);
      updateUrlParams(range, presetKey);
    }
  }
};

// 日付入力の変更処理
const handleDateChange = () => {
  validationError.value = '';

  if (!startDateInput.value || !endDateInput.value) {
    return;
  }

  const start = new Date(startDateInput.value);
  const end = new Date(endDateInput.value);

  // バリデーション
  if (!isValidDate(start) || !isValidDate(end)) {
    validationError.value = '有効な日付を入力してください';
    return;
  }

  if (start > end) {
    validationError.value = '開始日は終了日より前の日付を選択してください';
    return;
  }

  if (end > today) {
    validationError.value = '終了日は今日以前の日付を選択してください';
    return;
  }

  // 日付範囲の差が1年を超える場合の警告
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    validationError.value = '期間は1年以内で選択してください';
    return;
  }

  // 時刻を設定（開始日は00:00:00、終了日は23:59:59）
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const range = { start, end };
  selectedPreset.value = 'custom';
  emitChange(range);
  updateUrlParams(range, 'custom');
};

// 変更イベントを発行
const emitChange = (range: DateRange) => {
  emit('update:modelValue', range);
  emit('change', range);
};

// URLパラメータを更新
const updateUrlParams = (range: DateRange, preset: string) => {
  const query = { ...route.query };

  query.startDate = formatDateForInput(range.start);
  query.endDate = formatDateForInput(range.end);
  query.preset = preset;

  // ルートを更新（ページリロードなし）
  router.push({ query });
};
</script>

<style scoped>
.date-range-picker {
  @apply w-full;
}

.preset-buttons button {
  @apply transition-all duration-200;
}

.preset-buttons button:hover {
  @apply transform scale-105;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .date-range-picker input[type="date"] {
    @apply text-base; /* iOSでのズーム防止 */
  }

  .preset-buttons {
    @apply mb-3;
  }

  .preset-buttons .grid {
    @apply grid-cols-2 gap-1;
  }

  .preset-buttons button {
    @apply px-2 py-1 text-xs;
  }
}
</style>
