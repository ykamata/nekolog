<script setup lang="ts" generic="T extends { id: string; name: string }">
interface Props {
  modelValue: string;
  items: T[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  allowNew?: boolean;
  displayField?: keyof T;
  searchFields?: (keyof T)[];
  maxDisplayItems?: number;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'select', item: T): void;
  (e: 'create', name: string): void;
  (e: 'search', query: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '選択してください',
  displayField: 'name' as keyof T,
  searchFields: () => ['name'] as (keyof T)[],
  maxDisplayItems: 10,
  allowNew: true,
});

const emit = defineEmits<Emits>();

// Local state
const isOpen = ref(false);
const searchQuery = ref('');
const selectedIndex = ref(-1);
const inputRef = ref<HTMLInputElement>();
const dropdownRef = ref<HTMLElement>();

// Computed properties
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.items.slice(0, props.maxDisplayItems);
  }

  const query = searchQuery.value.toLowerCase().trim();
  return props.items
    .filter((item) => {
      return props.searchFields.some((field) => {
        const value = item[field];
        return typeof value === 'string' && value.toLowerCase().includes(query);
      });
    })
    .slice(0, props.maxDisplayItems);
});

const showCreateOption = computed(() => {
  if (!props.allowNew || !searchQuery.value.trim()) return false;

  const exactMatch = props.items.some(item =>
    (item as any)[props.displayField] === searchQuery.value.trim(),
  );

  return !exactMatch;
});

const displayValue = computed(() => {
  if (searchQuery.value) return searchQuery.value;

  const selectedItem = props.items.find(item => item.id === props.modelValue);
  return selectedItem ? String((selectedItem as any)[props.displayField]) : '';
});

// Methods
const openDropdown = () => {
  if (props.disabled) return;

  isOpen.value = true;
  selectedIndex.value = -1;
  searchQuery.value = displayValue.value;

  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select();
  });
};

const closeDropdown = () => {
  isOpen.value = false;
  selectedIndex.value = -1;

  // Reset search query to display value
  searchQuery.value = displayValue.value;
};

const selectItem = (item: T) => {
  emit('update:modelValue', item.id);
  emit('select', item);
  searchQuery.value = String((item as any)[props.displayField]);
  closeDropdown();
};

const createNewItem = () => {
  if (!searchQuery.value.trim()) return;

  emit('create', searchQuery.value.trim());
  closeDropdown();
};

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  searchQuery.value = target.value;
  selectedIndex.value = -1;

  // Emit search event for external filtering
  emit('search', target.value);

  if (!isOpen.value) {
    isOpen.value = true;
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value) {
    if (event.key === 'ArrowDown' || event.key === 'Enter') {
      event.preventDefault();
      openDropdown();
    }
    return;
  }

  const totalItems = filteredItems.value.length + (showCreateOption.value ? 1 : 0);

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, totalItems - 1);
      scrollToSelected();
      break;

    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1);
      scrollToSelected();
      break;

    case 'Enter':
      event.preventDefault();
      if (selectedIndex.value >= 0) {
        if (selectedIndex.value < filteredItems.value.length) {
          const item = filteredItems.value[selectedIndex.value];
          if (item) selectItem(item);
        }
        else if (showCreateOption.value) {
          createNewItem();
        }
      }
      else if (filteredItems.value.length === 1) {
        const item = filteredItems.value[0];
        if (item) selectItem(item);
      }
      else if (showCreateOption.value) {
        createNewItem();
      }
      break;

    case 'Escape':
      event.preventDefault();
      closeDropdown();
      break;

    case 'Tab':
      closeDropdown();
      break;
  }
};

const scrollToSelected = () => {
  if (!dropdownRef.value || selectedIndex.value < 0) return;

  const selectedElement = dropdownRef.value.children[selectedIndex.value] as HTMLElement;
  if (selectedElement) {
    selectedElement.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }
};

const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  if (!inputRef.value?.contains(target) && !dropdownRef.value?.contains(target)) {
    closeDropdown();
  }
};

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (!isOpen.value) {
    const selectedItem = props.items.find(item => item.id === newValue);
    searchQuery.value = selectedItem ? String((selectedItem as any)[props.displayField]) : '';
  }
});
</script>

<template>
  <div class="master-selector">
    <label
      v-if="label"
      class="selector-label"
      :class="{ 'selector-label--required': required }"
    >
      {{ label }}
      <span
        v-if="required"
        class="required-mark"
      >*</span>
    </label>

    <div
      class="selector-container"
      :class="{
        'selector-container--open': isOpen,
        'selector-container--error': error,
        'selector-container--disabled': disabled,
      }"
    >
      <input
        ref="inputRef"
        :value="searchQuery"
        type="text"
        class="selector-input"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="openDropdown"
      >

      <div class="selector-icons">
        <div
          v-if="loading"
          class="loading-spinner"
        />
        <svg
          v-else
          class="dropdown-arrow"
          :class="{ 'dropdown-arrow--open': isOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="selector-dropdown"
      >
        <div
          v-if="filteredItems.length === 0 && !showCreateOption"
          class="dropdown-empty"
        >
          該当する項目がありません
        </div>

        <button
          v-for="(item, index) in filteredItems"
          :key="item.id"
          type="button"
          class="dropdown-item"
          :class="{ 'dropdown-item--selected': index === selectedIndex }"
          @click="selectItem(item)"
        >
          <div class="item-content">
            <div class="item-name">
              {{ (item as any)[displayField] }}
            </div>
            <div
              v-if="'specialization' in item && item.specialization"
              class="item-meta"
            >
              {{ item.specialization }}
            </div>
            <div
              v-if="'category' in item && item.category"
              class="item-meta"
            >
              {{ item.category }}
            </div>
          </div>
        </button>

        <button
          v-if="showCreateOption"
          type="button"
          class="dropdown-item dropdown-item--create"
          :class="{ 'dropdown-item--selected': selectedIndex === filteredItems.length }"
          @click="createNewItem"
        >
          <div class="create-icon">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div class="item-content">
            <div class="item-name">
              「{{ searchQuery }}」を新規作成
            </div>
          </div>
        </button>
      </div>
    </div>

    <div
      v-if="error"
      class="selector-error"
    >
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.master-selector {
  position: relative;
}

.selector-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.selector-label--required {
  color: #333;
}

.required-mark {
  color: #e74c3c;
  margin-left: 0.25rem;
}

.selector-container {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.selector-container:focus-within {
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.selector-container--open {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.selector-container--error {
  border-color: #e74c3c;
}

.selector-container--error:focus-within {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

.selector-container--disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.selector-input {
  width: 100%;
  padding: 0.75rem;
  padding-right: 2.5rem;
  border: none;
  background: transparent;
  font-size: 1rem;
  outline: none;
  font-family: inherit;
}

.selector-input:disabled {
  cursor: not-allowed;
  color: #999;
}

.selector-icons {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  pointer-events: none;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.dropdown-arrow {
  width: 1rem;
  height: 1rem;
  color: #666;
  transition: transform 0.2s;
}

.dropdown-arrow--open {
  transform: rotate(180deg);
}

.selector-dropdown {
  position: absolute;
  top: 100%;
  left: -1px;
  right: -1px;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dropdown-empty {
  padding: 1rem;
  text-align: center;
  color: #666;
  font-style: italic;
}

.dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 0.75rem;
}

.dropdown-item:hover,
.dropdown-item--selected {
  background-color: #f5f5f5;
}

.dropdown-item--create {
  border-top: 1px solid #e0e0e0;
  color: #4caf50;
}

.dropdown-item--create:hover,
.dropdown-item--create.dropdown-item--selected {
  background-color: #f0f8f0;
}

.create-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.create-icon svg {
  width: 100%;
  height: 100%;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.125rem;
}

.item-meta {
  font-size: 0.875rem;
  color: #666;
}

.selector-error {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #e74c3c;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .selector-dropdown {
    max-height: 150px;
  }

  .dropdown-item {
    padding: 1rem 0.75rem;
  }
}
</style>
