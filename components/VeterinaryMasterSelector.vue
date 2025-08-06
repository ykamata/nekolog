<script setup lang="ts">
interface MasterItem {
  id: string;
  name: string;
}

interface Props {
  modelValue: string;
  items: MasterItem[];
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'create', name: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  placeholder: '選択または入力してください',
  required: false,
});

const emit = defineEmits<Emits>();

const inputValue = ref(props.modelValue || '');
const showDropdown = ref(false);
const isCreatingNew = ref(false);

// フィルタリングされたアイテム
const filteredItems = computed(() => {
  if (!inputValue.value) return props.items;
  return props.items.filter(item =>
    item.name.toLowerCase().includes(inputValue.value.toLowerCase()),
  );
});

// 新規作成が可能かどうか
const canCreateNew = computed(() => {
  return inputValue.value.trim()
    && !props.items.some(item => item.name === inputValue.value.trim());
});

// 入力値の変更処理
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
  emit('update:modelValue', target.value);
  showDropdown.value = true;
};

// アイテム選択処理
const selectItem = (item: MasterItem) => {
  inputValue.value = item.name;
  emit('update:modelValue', item.name);
  showDropdown.value = false;
};

// 新規作成処理
const createNew = () => {
  if (canCreateNew.value) {
    isCreatingNew.value = true;
    emit('create', inputValue.value.trim());
    showDropdown.value = false;
  }
};

// フォーカス処理
const handleFocus = () => {
  showDropdown.value = true;
};

// ブラー処理
const handleBlur = () => {
  // 少し遅延させてクリックイベントを処理できるようにする
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};

// プロップの変更を監視
watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue || '';
});

watch(() => props.loading, (newLoading) => {
  if (!newLoading) {
    isCreatingNew.value = false;
  }
});
</script>

<template>
  <div class="master-selector">
    <div class="input-container">
      <input
        :id="id"
        v-model="inputValue"
        type="text"
        class="master-input"
        :class="{ 'master-input--error': error }"
        :placeholder="placeholder"
        :disabled="disabled || loading"
        :required="required"
        autocomplete="off"
        data-testid="master-input"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      >

      <div
        v-if="loading || isCreatingNew"
        class="loading-indicator"
        data-testid="loading-indicator"
      >
        <div class="spinner" />
      </div>
    </div>

    <!-- ドロップダウンメニュー -->
    <div
      v-if="showDropdown && !disabled"
      class="dropdown"
      data-testid="dropdown"
    >
      <!-- 既存アイテム -->
      <div
        v-if="filteredItems.length > 0"
        class="dropdown-section"
      >
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="dropdown-item"
          data-testid="dropdown-item"
          @click="selectItem(item)"
        >
          {{ item.name }}
        </div>
      </div>

      <!-- 新規作成オプション -->
      <div
        v-if="canCreateNew"
        class="dropdown-section"
      >
        <div class="dropdown-divider" />
        <div
          class="dropdown-item dropdown-item--create"
          data-testid="create-option"
          @click="createNew"
        >
          <svg
            class="create-icon"
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
          「{{ inputValue }}」を新規作成
        </div>
      </div>

      <!-- データなしメッセージ -->
      <div
        v-if="filteredItems.length === 0 && !canCreateNew"
        class="dropdown-empty"
        data-testid="no-results"
      >
        該当するデータがありません
      </div>
    </div>
  </div>
</template>

<style scoped>
.master-selector {
  position: relative;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.master-input {
  width: 100%;
  padding: 0.75rem;
  padding-right: 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.master-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.master-input--error {
  border-color: #e74c3c;
}

.master-input--error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

.master-input:disabled {
  background: #f8f8f8;
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-indicator {
  position: absolute;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-section {
  padding: 0.25rem 0;
}

.dropdown-item {
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-item:hover {
  background: #f8f8f8;
}

.dropdown-item--create {
  color: #4caf50;
  font-weight: 500;
}

.dropdown-item--create:hover {
  background: #f0f9ff;
}

.create-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.25rem 0;
}

.dropdown-empty {
  padding: 0.75rem;
  color: #666;
  font-style: italic;
  text-align: center;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .dropdown {
    max-height: 150px;
  }

  .dropdown-item {
    padding: 1rem 0.75rem;
    font-size: 1rem;
  }
}
</style>
