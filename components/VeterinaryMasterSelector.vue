<script setup lang="ts">
;

interface MasterItem {
  id: string;
  name: string;
  hospitalId?: string; // 先生の場合の所属病院ID
}

interface Props {
  modelValue: string;
  type: 'hospital' | 'doctor';
  items: MasterItem[];
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  selectedHospitalId?: string; // 先生選択時の病院フィルタ用
  allowFreeInput?: boolean;
  showCreateDialog?: boolean;
}

interface Emits {
  (e: 'update:modelValue' | 'create', value: string): void;
  (e: 'select', item: MasterItem): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  placeholder: '選択または入力してください',
  required: false,
  allowFreeInput: true,
  showCreateDialog: true,
});

const emit = defineEmits<Emits>();

const inputValue = ref(props.modelValue || '');
const showDropdown = ref(false);
const isCreatingNew = ref(false);
const showConfirmDialog = ref(false);
const pendingCreateName = ref('');

// フィルタリングされたアイテム（曖昧検索 + 病院フィルタリング）
const filteredItems = computed(() => {
  let items = props.items;

  // 先生選択時で病院が選択されている場合、その病院の先生のみ表示
  if (props.type === 'doctor' && props.selectedHospitalId) {
    items = items.filter(item => item.hospitalId === props.selectedHospitalId);
  }

  // 入力値による曖昧検索
  if (!inputValue.value) return items;

  const query = inputValue.value.toLowerCase().trim();
  return items.filter(item =>
    item.name.toLowerCase().includes(query),
  );
});

// 新規作成が可能かどうか
const canCreateNew = computed(() => {
  if (!props.allowFreeInput || !inputValue.value.trim()) return false;

  // 完全一致するアイテムが存在する場合は新規作成不可
  const exactMatch = props.items.some(item =>
    item.name.toLowerCase() === inputValue.value.trim().toLowerCase(),
  );

  return !exactMatch;
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
  emit('select', item);
  showDropdown.value = false;
};

// 新規作成処理
const createNew = () => {
  if (!canCreateNew.value) return;

  const name = inputValue.value.trim();

  if (props.showCreateDialog) {
    // 確認ダイアログを表示
    pendingCreateName.value = name;
    showConfirmDialog.value = true;
    showDropdown.value = false;
  }
  else {
    // 直接作成
    executeCreate(name);
  }
};

// 実際の作成処理
const executeCreate = (name: string) => {
  isCreatingNew.value = true;
  emit('create', name);
  showDropdown.value = false;
};

// 確認ダイアログでの作成確定
const confirmCreate = () => {
  executeCreate(pendingCreateName.value);
  showConfirmDialog.value = false;
  pendingCreateName.value = '';
};

// 確認ダイアログのキャンセル
const cancelCreate = () => {
  showConfirmDialog.value = false;
  pendingCreateName.value = '';
};

// フォーカス処理
const handleFocus = () => {
  if (!props.disabled) {
    showDropdown.value = true;
  }
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

// 病院選択が変更された時に先生の入力値をクリア
watch(() => props.selectedHospitalId, () => {
  if (props.type === 'doctor' && inputValue.value) {
    // 現在選択されている先生が新しい病院に所属していない場合はクリア
    const currentDoctor = props.items.find(item => item.name === inputValue.value);
    if (currentDoctor && currentDoctor.hospitalId !== props.selectedHospitalId) {
      inputValue.value = '';
      emit('update:modelValue', '');
    }
  }
});

// 表示用のプレースホルダーを動的に生成
const dynamicPlaceholder = computed(() => {
  if (props.type === 'doctor' && props.selectedHospitalId) {
    // 病院アイテムを探す（hospitalIdがないアイテムは病院）
    const hospital = props.items.find(item =>
      item.id === props.selectedHospitalId && !item.hospitalId,
    );
    if (hospital) {
      return `${hospital.name}の先生を選択または入力してください`;
    }
  }
  return props.placeholder;
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
        :placeholder="dynamicPlaceholder"
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
          <div class="item-content">
            <span class="item-name">{{ item.name }}</span>
            <span
              v-if="type === 'doctor' && item.hospitalId"
              class="item-hospital"
            >
              {{ items.find(h => h.id === item.hospitalId && !h.hospitalId)?.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- 新規作成オプション -->
      <div
        v-if="canCreateNew && allowFreeInput"
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
        <div v-if="type === 'doctor' && selectedHospitalId">
          選択された病院に所属する先生が見つかりません
        </div>
        <div v-else>
          該当するデータがありません
        </div>
      </div>
    </div>

    <!-- 新規作成確認ダイアログ -->
    <div
      v-if="showConfirmDialog"
      class="dialog-overlay"
      data-testid="confirm-dialog"
    >
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">
            {{ type === 'hospital' ? '病院' : '先生' }}の新規作成
          </h3>
        </div>

        <div class="dialog-content">
          <p>
            「<strong>{{ pendingCreateName }}</strong>」を新しい{{ type === 'hospital' ? '病院' : '先生' }}として登録しますか？
          </p>
        </div>

        <div class="dialog-actions">
          <button
            type="button"
            class="dialog-button dialog-button--secondary"
            data-testid="cancel-create"
            @click="cancelCreate"
          >
            キャンセル
          </button>
          <button
            type="button"
            class="dialog-button dialog-button--primary"
            data-testid="confirm-create"
            @click="confirmCreate"
          >
            作成する
          </button>
        </div>
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

.item-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.item-name {
  font-weight: 500;
}

.item-hospital {
  font-size: 0.875rem;
  color: #666;
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

/* 確認ダイアログ */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  padding: 1.5rem 1.5rem 0;
}

.dialog-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.dialog-content {
  padding: 1rem 1.5rem;
}

.dialog-content p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.dialog-actions {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.dialog-button {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dialog-button--secondary {
  background: white;
  color: #666;
}

.dialog-button--secondary:hover {
  background: #f8f8f8;
}

.dialog-button--primary {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.dialog-button--primary:hover {
  background: #45a049;
  border-color: #45a049;
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

  .dialog {
    margin: 1rem;
    width: calc(100% - 2rem);
  }

  .dialog-actions {
    flex-direction: column-reverse;
  }

  .dialog-button {
    width: 100%;
    padding: 0.75rem;
  }
}
</style>
