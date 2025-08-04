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
  required?: boolean;
  id?: string;
  ariaRequired?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'create', name: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  required: false,
  placeholder: '選択または入力してください',
});

const emit = defineEmits<Emits>();

const inputValue = ref(props.modelValue);
const showDropdown = ref(false);
const isCreating = ref(false);

const filteredItems = computed(() => {
  if (!inputValue.value) return props.items;
  return props.items.filter(item =>
    item.name.toLowerCase().includes(inputValue.value.toLowerCase()),
  );
});

const exactMatch = computed(() => {
  return props.items.find(item => item.name === inputValue.value);
});

const canCreate = computed(() => {
  return inputValue.value && !exactMatch.value && !props.loading;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
  emit('update:modelValue', target.value);
  showDropdown.value = true;
};

const selectItem = (item: MasterItem) => {
  inputValue.value = item.name;
  emit('update:modelValue', item.name);
  showDropdown.value = false;
};

const createNew = async () => {
  if (!canCreate.value) return;

  isCreating.value = true;
  try {
    emit('create', inputValue.value);
    showDropdown.value = false;
  }
  finally {
    isCreating.value = false;
  }
};

const handleFocus = () => {
  showDropdown.value = true;
};

const handleBlur = () => {
  // Delay hiding dropdown to allow for clicks
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};

watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue;
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
        :aria-required="ariaRequired"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      >

      <div
        v-if="loading"
        class="loading-indicator"
      >
        <div class="spinner" />
      </div>
    </div>

    <div
      v-if="showDropdown && (filteredItems.length > 0 || canCreate)"
      class="dropdown"
    >
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="dropdown-item"
        @click="selectItem(item)"
      >
        {{ item.name }}
      </div>

      <div
        v-if="canCreate"
        class="dropdown-item create-item"
        :class="{ creating: isCreating }"
        @click="createNew"
      >
        <span v-if="!isCreating">
          「{{ inputValue }}」を新規作成
        </span>
        <span v-else>
          作成中...
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.master-selector {
  position: relative;
  width: 100%;
}

.input-container {
  position: relative;
}

.master-input {
  width: 100%;
  padding: 0.75rem;
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
  top: 50%;
  transform: translateY(-50%);
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
  background: white;
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-item {
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background-color: #f8f8f8;
}

.create-item {
  border-top: 1px solid #e2e8f0;
  color: #4caf50;
  font-weight: 500;
}

.create-item:hover {
  background-color: #f0f9ff;
}

.create-item.creating {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
