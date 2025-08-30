<template>
  <div class="cat-selection-filter">
    <label
      for="cat-select"
      class="block text-sm font-medium text-gray-700 mb-2"
    >
      猫を選択
    </label>
    <select
      id="cat-select"
      v-model="selectedCatId"
      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      @change="handleCatChange"
    >
      <option value="">
        すべての猫
      </option>
      <option
        v-for="cat in sortedCats"
        :key="cat.id"
        :value="cat.id"
      >
        {{ cat.name }}
      </option>
    </select>

    <!-- ローディング状態 -->
    <div
      v-if="isLoading"
      class="mt-2 text-sm text-gray-500"
    >
      猫データを読み込み中...
    </div>

    <!-- エラー状態 -->
    <div
      v-if="hasError"
      class="mt-2 text-sm text-red-600"
    >
      猫データの読み込みに失敗しました
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 猫ストアを使用
const catsStore = useCatsStore();
const { sortedCats, isLoading, hasError } = storeToRefs(catsStore);

// ルーターとルートを使用してURLパラメータを管理
const router = useRouter();
const route = useRoute();

// 選択された猫ID
const selectedCatId = ref<string>(props.modelValue || '');

// URLパラメータから初期値を設定
onMounted(async () => {
  // URLパラメータから猫IDを取得
  const catIdFromUrl = route.query.catId as string;
  if (catIdFromUrl) {
    selectedCatId.value = catIdFromUrl;
  }

  // 猫データを取得
  try {
    await catsStore.fetchCats();
  }
  catch (error) {
    console.error('猫データの取得に失敗しました:', error);
  }
});

// propsの変更を監視
watch(() => props.modelValue, (newValue) => {
  if (newValue !== undefined) {
    selectedCatId.value = newValue;
  }
});

// 猫選択の変更処理
const handleCatChange = () => {
  // 親コンポーネントに変更を通知
  emit('update:modelValue', selectedCatId.value);
  emit('change', selectedCatId.value);

  // URLパラメータを更新
  updateUrlParams();
};

// URLパラメータを更新する関数
const updateUrlParams = () => {
  const query = { ...route.query };

  if (selectedCatId.value) {
    query.catId = selectedCatId.value;
  }
  else {
    delete query.catId;
  }

  // ルートを更新（ページリロードなし）
  router.push({ query });
};
</script>

<style scoped>
.cat-selection-filter {
  @apply w-full;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .cat-selection-filter select {
    @apply text-base; /* iOSでのズーム防止 */
  }
}
</style>
