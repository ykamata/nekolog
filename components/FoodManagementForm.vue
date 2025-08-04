<script setup lang="ts">
import { z } from 'zod';
import type { Food, FoodInput } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';
import { FoodInputSchema } from '~/lib/validations/cat-meal';

interface Props {
  food?: Food;
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', food: FoodInput): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const formData = reactive<FoodInput>({
  name: '',
  type: FoodType.DRY,
  brand: undefined,
  caloriesPerGram: 0,
  pricePerUnit: undefined,
  unit: 'g',
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

// Dynamic suggestions from database
const brandSuggestions = ref<string[]>([]);
const productSuggestions = ref<string[]>([]);

// Fallback suggestions for initial display
const fallbackBrandSuggestions = [
  'ロイヤルカナン',
  'ヒルズ',
  'ピュリナ',
  'アイムス',
  'ニュートロ',
  'オリジン',
  'アカナ',
  'ウェルネス',
  'ブルーバッファロー',
  'サイエンスダイエット',
];

const fallbackProductSuggestions = [
  'キトン',
  'アダルト',
  'シニア',
  'インドア',
  'ヘアボール',
  'ウェイトケア',
  'センシティブ',
  'グレインフリー',
  'チキン',
  'サーモン',
  'ターキー',
  'ビーフ',
];

const showBrandSuggestions = ref(false);
const showProductSuggestions = ref(false);
const filteredBrandSuggestions = ref<string[]>([]);
const filteredProductSuggestions = ref<string[]>([]);

// Debounce timers for API calls
let brandDebounceTimer: NodeJS.Timeout | null = null;
let productDebounceTimer: NodeJS.Timeout | null = null;

// Initialize form data when food prop changes
watch(
  () => props.food,
  (food) => {
    if (food) {
      formData.name = food.name;
      formData.type = food.type;
      formData.brand = food.brand;
      formData.caloriesPerGram = food.caloriesPerGram;
      formData.pricePerUnit = food.pricePerUnit;
      formData.unit = food.unit;
    }
    else {
      // Reset form for new food
      formData.name = '';
      formData.type = FoodType.DRY;
      formData.brand = undefined;
      formData.caloriesPerGram = 0;
      formData.pricePerUnit = undefined;
      formData.unit = 'g';
    }
    errors.value = {};
  },
  { immediate: true },
);

// Computed properties
const isEditMode = computed(() => !!props.food);
const formTitle = computed(() =>
  isEditMode.value ? 'フード情報を編集' : '新しいフードを追加',
);

const foodTypeOptions = computed(() => [
  { value: FoodType.DRY, label: 'ドライフード' },
  { value: FoodType.WET, label: 'ウェットフード' },
]);

// Methods
const validateForm = (): boolean => {
  errors.value = {};

  try {
    FoodInputSchema.parse(formData);
    return true;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          errors.value[err.path[0] as string] = err.message;
        }
      });
    }
    return false;
  }
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    emit('save', { ...formData });
  }
  finally {
    isSubmitting.value = false;
  }
};

const handleClose = () => {
  emit('close');
};

const handleReset = () => {
  if (props.food) {
    formData.name = props.food.name;
    formData.type = props.food.type;
    formData.brand = props.food.brand;
    formData.caloriesPerGram = props.food.caloriesPerGram;
    formData.pricePerUnit = props.food.pricePerUnit;
    formData.unit = props.food.unit;
  }
  else {
    formData.name = '';
    formData.type = FoodType.DRY;
    formData.brand = undefined;
    formData.caloriesPerGram = 0;
    formData.pricePerUnit = undefined;
    formData.unit = 'g';
  }
  errors.value = {};
};

// Auto-complete functionality with API integration
const handleBrandInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  formData.brand = value;

  // Clear existing timer
  if (brandDebounceTimer) {
    clearTimeout(brandDebounceTimer);
  }

  if (value.length > 0) {
    // Show immediate local filtering
    const localFiltered = brandSuggestions.value.filter(brand =>
      brand.toLowerCase().includes(value.toLowerCase()),
    );
    filteredBrandSuggestions.value = localFiltered;
    showBrandSuggestions.value = true;

    // Debounced API call
    brandDebounceTimer = setTimeout(async () => {
      try {
        const suggestions = await $fetch<string[]>('/api/foods/suggestions', {
          query: {
            type: 'brands',
            query: value,
            limit: 10,
          },
        });

        // Combine API suggestions with fallback suggestions
        const combinedSuggestions = [
          ...suggestions,
          ...fallbackBrandSuggestions.filter(brand =>
            brand.toLowerCase().includes(value.toLowerCase())
            && !suggestions.includes(brand),
          ),
        ];

        filteredBrandSuggestions.value = combinedSuggestions.slice(0, 10);
        showBrandSuggestions.value = filteredBrandSuggestions.value.length > 0;
      }
      catch {
        // Keep local filtering if API fails
        const localFiltered = [
          ...brandSuggestions.value,
          ...fallbackBrandSuggestions,
        ].filter(brand =>
          brand.toLowerCase().includes(value.toLowerCase()),
        );
        filteredBrandSuggestions.value = [...new Set(localFiltered)].slice(0, 10);
        showBrandSuggestions.value = filteredBrandSuggestions.value.length > 0;
      }
    }, 300);
  }
  else {
    showBrandSuggestions.value = false;
  }
};

const handleProductInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  formData.name = value;

  // Clear existing timer
  if (productDebounceTimer) {
    clearTimeout(productDebounceTimer);
  }

  if (value.length > 0) {
    // Show immediate local filtering
    const localFiltered = productSuggestions.value.filter(product =>
      product.toLowerCase().includes(value.toLowerCase()),
    );
    filteredProductSuggestions.value = localFiltered;
    showProductSuggestions.value = true;

    // Debounced API call
    productDebounceTimer = setTimeout(async () => {
      try {
        const suggestions = await $fetch<string[]>('/api/foods/suggestions', {
          query: {
            type: 'names',
            query: value,
            limit: 10,
          },
        });

        // Combine API suggestions with fallback suggestions
        const combinedSuggestions = [
          ...suggestions,
          ...fallbackProductSuggestions.filter(product =>
            product.toLowerCase().includes(value.toLowerCase())
            && !suggestions.includes(product),
          ),
        ];

        filteredProductSuggestions.value = combinedSuggestions.slice(0, 10);
        showProductSuggestions.value = filteredProductSuggestions.value.length > 0;
      }
      catch {
        // Keep local filtering if API fails
        const localFiltered = [
          ...productSuggestions.value,
          ...fallbackProductSuggestions,
        ].filter(product =>
          product.toLowerCase().includes(value.toLowerCase()),
        );
        filteredProductSuggestions.value = [...new Set(localFiltered)].slice(0, 10);
        showProductSuggestions.value = filteredProductSuggestions.value.length > 0;
      }
    }, 300);
  }
  else {
    showProductSuggestions.value = false;
  }
};

const selectBrandSuggestion = (brand: string) => {
  formData.brand = brand;
  showBrandSuggestions.value = false;

  // Add to local suggestions cache if not already present
  if (!brandSuggestions.value.includes(brand)) {
    brandSuggestions.value.push(brand);
  }
};

const selectProductSuggestion = (product: string) => {
  formData.name = product;
  showProductSuggestions.value = false;

  // Add to local suggestions cache if not already present
  if (!productSuggestions.value.includes(product)) {
    productSuggestions.value.push(product);
  }
};

// Close suggestions when clicking outside
const handleClickOutside = () => {
  showBrandSuggestions.value = false;
  showProductSuggestions.value = false;
};

// Load initial suggestions on mount
const loadInitialSuggestions = async () => {
  try {
    const response = await $fetch<{ brands: string[]; names: string[] }>('/api/foods/suggestions');
    brandSuggestions.value = response.brands;
    productSuggestions.value = response.names;
  }
  catch {
    // Use fallback suggestions if API fails
    brandSuggestions.value = [...fallbackBrandSuggestions];
    productSuggestions.value = [...fallbackProductSuggestions];
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  loadInitialSuggestions();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);

  // Clear debounce timers
  if (brandDebounceTimer) {
    clearTimeout(brandDebounceTimer);
  }
  if (productDebounceTimer) {
    clearTimeout(productDebounceTimer);
  }
});
</script>

<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    @click.self="handleClose"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">
          {{ formTitle }}
        </h2>
        <button
          class="modal-close-btn"
          @click="handleClose"
        >
          ×
        </button>
      </div>

      <form
        class="food-form"
        @submit.prevent="handleSubmit"
      >
        <div class="form-group">
          <label
            for="food-name"
            class="form-label"
          >
            フード名 <span class="required">*</span>
          </label>
          <div
            class="autocomplete-container"
            @click.stop
          >
            <input
              id="food-name"
              :value="formData.name"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': errors.name }"
              placeholder="フード名を入力してください"
              maxlength="100"
              @input="handleProductInput"
            >
            <div
              v-if="showProductSuggestions"
              class="suggestions-dropdown"
            >
              <button
                v-for="suggestion in filteredProductSuggestions"
                :key="suggestion"
                type="button"
                class="suggestion-item"
                @click="selectProductSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
          <span
            v-if="errors.name"
            class="form-error"
          >{{ errors.name }}</span>
        </div>

        <div class="form-group">
          <label
            for="food-type"
            class="form-label"
          >
            フードタイプ <span class="required">*</span>
          </label>
          <select
            id="food-type"
            v-model="formData.type"
            class="form-input"
            :class="{ 'form-input--error': errors.type }"
          >
            <option
              v-for="option in foodTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <span
            v-if="errors.type"
            class="form-error"
          >{{ errors.type }}</span>
        </div>

        <div class="form-group">
          <label
            for="food-brand"
            class="form-label"
          >ブランド</label>
          <div
            class="autocomplete-container"
            @click.stop
          >
            <input
              id="food-brand"
              :value="formData.brand || ''"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': errors.brand }"
              placeholder="ブランド名を入力してください"
              maxlength="50"
              @input="handleBrandInput"
            >
            <div
              v-if="showBrandSuggestions"
              class="suggestions-dropdown"
            >
              <button
                v-for="suggestion in filteredBrandSuggestions"
                :key="suggestion"
                type="button"
                class="suggestion-item"
                @click="selectBrandSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
          <span
            v-if="errors.brand"
            class="form-error"
          >{{ errors.brand }}</span>
        </div>

        <div class="form-group">
          <label
            for="food-calories"
            class="form-label"
          >
            カロリー (kcal/g) <span class="required">*</span>
          </label>
          <input
            id="food-calories"
            v-model.number="formData.caloriesPerGram"
            type="number"
            step="0.01"
            min="0"
            max="10"
            class="form-input"
            :class="{ 'form-input--error': errors.caloriesPerGram }"
            placeholder="例: 3.5"
          >
          <span
            v-if="errors.caloriesPerGram"
            class="form-error"
          >{{
            errors.caloriesPerGram
          }}</span>
        </div>

        <div class="form-group">
          <label
            for="food-price"
            class="form-label"
          >価格 (円)</label>
          <input
            id="food-price"
            v-model.number="formData.pricePerUnit"
            type="number"
            step="1"
            min="0"
            class="form-input"
            :class="{ 'form-input--error': errors.pricePerUnit }"
            placeholder="例: 1500"
          >
          <span
            v-if="errors.pricePerUnit"
            class="form-error"
          >{{
            errors.pricePerUnit
          }}</span>
        </div>

        <div class="form-group">
          <label
            for="food-unit"
            class="form-label"
          >
            単位 <span class="required">*</span>
          </label>
          <input
            id="food-unit"
            v-model="formData.unit"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': errors.unit }"
            placeholder="例: g, kg"
            maxlength="10"
          >
          <span
            v-if="errors.unit"
            class="form-error"
          >{{ errors.unit }}</span>
        </div>

        <div class="form-actions">
          <button
            type="button"
            :disabled="isSubmitting"
            class="btn btn--secondary"
            @click="handleReset"
          >
            リセット
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="btn btn--secondary"
            @click="handleClose"
          >
            キャンセル
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="btn btn--primary"
          >
            {{ isSubmitting ? "保存中..." : isEditMode ? "更新" : "追加" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  line-height: 1;
}

.modal-close-btn:hover {
  color: #333;
}

.food-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  position: relative;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.required {
  color: #e74c3c;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.form-input--error {
  border-color: #e74c3c;
}

.form-input--error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

.form-error {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #e74c3c;
}

.autocomplete-container {
  position: relative;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1001;
}

.suggestion-item {
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f5f5f5;
}

.suggestion-item:focus {
  outline: none;
  background-color: #e8f5e9;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn--primary {
  background-color: #4caf50;
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: #388e3c;
}

.btn--secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn--secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-header,
  .food-form {
    padding: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
