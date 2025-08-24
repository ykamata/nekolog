<script setup lang="ts">
import type { Cat, Food, MealRecordInput } from '~/types/cat-meal';
import { MealRecordFormSchema } from '~/lib/validations/cat-meal';
import type { MealRecordForm } from '~/lib/validations/cat-meal';
import { createUnifiedErrorHandler } from '~/utils/error-handling';

interface Props {
  cats: Cat[];
  foods: Food[];
  initialData?: Partial<MealRecordInput>;
  loading?: boolean;
  disabled?: boolean;
}

interface Emits {
  (e: 'submit', data: MealRecordInput): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
});

const emit = defineEmits<Emits>();

// Form state
const formData = ref<MealRecordForm>({
  catId: props.initialData?.catId || '',
  foodId: props.initialData?.foodId || '',
  quantity: props.initialData?.quantity || 0,
  calories: props.initialData?.calories,
  mealTime: props.initialData?.mealTime || new Date(),
  notes: props.initialData?.notes || '',
});

// Form validation state
const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

// 統一エラーハンドラーの初期化
const errorHandler = createUnifiedErrorHandler('MealRecordForm', {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
});

// Quantity input mode (grams or calories)
const quantityMode = ref<'grams' | 'calories'>('grams');

// Predefined quantity options
const predefinedQuantities = ref([
  { label: '10g', value: 10, unit: 'grams' },
  { label: '20g', value: 20, unit: 'grams' },
  { label: '30g', value: 30, unit: 'grams' },
  { label: '50g', value: 50, unit: 'grams' },
  { label: '100g', value: 100, unit: 'grams' },
  { label: '150g', value: 150, unit: 'grams' },
]);

// Computed properties
// Removed unused selectedCat computed property

const selectedFood = computed(() =>
  props.foods.find(food => food.id === formData.value.foodId),
);

const calculatedCalories = computed(() => {
  if (!selectedFood.value || !formData.value.quantity) return 0;
  return (
    Math.round(
      formData.value.quantity * selectedFood.value.caloriesPerGram * 10,
    ) / 10
  );
});

const calculatedGrams = computed(() => {
  if (!selectedFood.value || !formData.value.calories) return 0;
  return (
    Math.round(
      (formData.value.calories / selectedFood.value.caloriesPerGram) * 10,
    ) / 10
  );
});

// Validation
const validateForm = (): boolean => {
  try {
    MealRecordFormSchema.parse(formData.value);
    errors.value = {};
    return true;
  }
  catch (error: unknown) {
    const newErrors: Record<string, string> = {};
    if (error && typeof error === 'object' && 'errors' in error) {
      const zodError = error as {
        errors: Array<{ path: string[]; message: string }>;
      };
      for (const err of zodError.errors) {
        const pathKey = err.path[0];
        if (pathKey) {
          newErrors[pathKey] = err.message;
        }
      }
    }
    errors.value = newErrors;
    return false;
  }
};

// Methods
const handleCatSelect = (cat: Cat) => {
  formData.value.catId = cat.id;
  validateField('catId');
};

const handleFoodSelect = (food: Food) => {
  formData.value.foodId = food.id;

  // Auto-calculate calories when food is selected
  if (quantityMode.value === 'grams' && formData.value.quantity > 0) {
    formData.value.calories = calculatedCalories.value;
  }

  validateField('foodId');
};

const handleQuantityInput = (value: number) => {
  if (quantityMode.value === 'grams') {
    formData.value.quantity = value;
    if (selectedFood.value) {
      formData.value.calories = calculatedCalories.value;
    }
  }
  else {
    formData.value.calories = value;
    if (selectedFood.value) {
      formData.value.quantity = calculatedGrams.value;
    }
  }
  validateField('quantity');
};

const handlePredefinedQuantity = (quantity: number) => {
  formData.value.quantity = quantity;
  if (selectedFood.value) {
    formData.value.calories = calculatedCalories.value;
  }
  validateField('quantity');
};

const toggleQuantityMode = () => {
  quantityMode.value = quantityMode.value === 'grams' ? 'calories' : 'grams';
};

const handleDateTimeChange = (date: Date) => {
  formData.value.mealTime = date;
  validateField('mealTime');
};

const validateField = (field: string) => {
  try {
    const fieldSchema
      = MealRecordFormSchema.shape[
        field as keyof typeof MealRecordFormSchema.shape
      ];
    if (fieldSchema) {
      fieldSchema.parse(formData.value[field as keyof MealRecordForm]);
      delete errors.value[field];
    }
  }
  catch (error: unknown) {
    if (error && typeof error === 'object' && 'errors' in error) {
      const zodError = error as { errors: Array<{ message: string }> };
      if (zodError.errors && zodError.errors[0]) {
        errors.value[field] = zodError.errors[0].message;
      }
    }
  }
};

const handleSubmit = async () => {
  if (!validateForm() || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    const submitData: MealRecordInput = {
      catId: formData.value.catId,
      foodId: formData.value.foodId,
      quantity: formData.value.quantity,
      calories: formData.value.calories || calculatedCalories.value,
      mealTime: formData.value.mealTime,
      notes: formData.value.notes || undefined,
    };

    emit('submit', submitData);
  }
  finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
};

const resetForm = () => {
  formData.value = {
    catId: '',
    foodId: '',
    quantity: 0,
    calories: undefined,
    mealTime: new Date(),
    notes: '',
  };
  errors.value = {};
};

// Watch for prop changes
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      formData.value = {
        catId: newData.catId || '',
        foodId: newData.foodId || '',
        quantity: newData.quantity || 0,
        calories: newData.calories,
        mealTime: newData.mealTime || new Date(),
        notes: newData.notes || '',
      };
    }
  },
  { deep: true },
);

// Expose methods for parent component
defineExpose({
  resetForm,
  validateForm,
});
</script>

<template>
  <form
    class="meal-record-form"
    @submit.prevent="handleSubmit"
  >
    <div class="form-header">
      <h2 class="form-title">
        食事記録
      </h2>
      <p class="form-description">
        猫の食事内容を記録してください
      </p>
    </div>

    <div class="form-body">
      <!-- Cat Selection -->
      <div class="form-group">
        <label class="form-label">
          猫の選択 <span class="required">*</span>
        </label>
        <div class="cat-selector">
          <div
            v-if="cats.length === 0"
            class="empty-state"
          >
            <p>登録されている猫がありません</p>
            <p class="empty-hint">
              先に猫を登録してください
            </p>
          </div>
          <div
            v-else
            class="cat-options"
          >
            <button
              v-for="cat in cats"
              :key="cat.id"
              type="button"
              class="cat-option"
              :class="{ 'cat-option--selected': cat.id === formData.catId }"
              :disabled="disabled"
              @click="handleCatSelect(cat)"
            >
              <div class="cat-info">
                <div class="cat-name">
                  {{ cat.name }}
                </div>
                <div
                  v-if="cat.weight"
                  class="cat-weight"
                >
                  {{ cat.weight }}kg
                </div>
              </div>
              <div
                v-if="cat.id === formData.catId"
                class="selected-indicator"
              >
                ✓
              </div>
            </button>
          </div>
        </div>
        <div
          v-if="errors.catId"
          class="error-message"
        >
          {{ errors.catId }}
        </div>
      </div>

      <!-- Food Selection -->
      <div class="form-group">
        <label class="form-label">
          フードの選択 <span class="required">*</span>
        </label>
        <FoodSelector
          :foods="foods"
          :selected-food-id="formData.foodId"
          :disabled="disabled"
          placeholder="フードを選択してください"
          @select="handleFoodSelect"
        />
        <div
          v-if="errors.foodId"
          class="error-message"
        >
          {{ errors.foodId }}
        </div>
      </div>

      <!-- Quantity Input -->
      <div class="form-group">
        <label class="form-label">
          量の入力 <span class="required">*</span>
        </label>

        <!-- Quantity Mode Toggle -->
        <div class="quantity-mode-toggle">
          <button
            type="button"
            class="mode-button"
            :class="{ 'mode-button--active': quantityMode === 'grams' }"
            :disabled="disabled"
            @click="toggleQuantityMode"
          >
            グラム (g)
          </button>
          <button
            type="button"
            class="mode-button"
            :class="{ 'mode-button--active': quantityMode === 'calories' }"
            :disabled="disabled"
            @click="toggleQuantityMode"
          >
            カロリー (kcal)
          </button>
        </div>

        <!-- Predefined Quantities -->
        <div
          v-if="quantityMode === 'grams'"
          class="predefined-quantities"
        >
          <button
            v-for="option in predefinedQuantities"
            :key="option.value"
            type="button"
            class="quantity-button"
            :class="{
              'quantity-button--selected': formData.quantity === option.value,
            }"
            :disabled="disabled"
            @click="handlePredefinedQuantity(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <!-- Manual Quantity Input -->
        <div class="quantity-input-container">
          <input
            :value="
              quantityMode === 'grams'
                ? formData.quantity
                : formData.calories || 0
            "
            type="number"
            class="quantity-input"
            :placeholder="
              quantityMode === 'grams' ? 'グラム数を入力' : 'カロリー数を入力'
            "
            :disabled="disabled"
            step="0.1"
            min="0"
            max="1000"
            @input="
              handleQuantityInput(
                parseFloat(($event.target as HTMLInputElement).value) || 0,
              )
            "
          >
          <span class="quantity-unit">
            {{ quantityMode === "grams" ? "g" : "kcal" }}
          </span>
        </div>

        <!-- Conversion Display -->
        <div
          v-if="
            selectedFood
              && (formData.quantity > 0
                || (formData.calories && formData.calories > 0))
          "
          class="conversion-display"
        >
          <div class="conversion-info">
            <span v-if="quantityMode === 'grams'">
              {{ formData.quantity }}g = {{ calculatedCalories }}kcal
            </span>
            <span v-else>
              {{ formData.calories }}kcal = {{ calculatedGrams }}g
            </span>
          </div>
          <div class="food-info">
            {{ selectedFood.name }} ({{ selectedFood.caloriesPerGram }}kcal/g)
          </div>
        </div>

        <div
          v-if="errors.quantity"
          class="error-message"
        >
          {{ errors.quantity }}
        </div>
      </div>

      <!-- Date/Time Selection -->
      <div class="form-group">
        <label class="form-label">
          食事時間 <span class="required">*</span>
        </label>
        <DateTimePicker
          :value="formData.mealTime"
          :disabled="disabled"
          @change="handleDateTimeChange"
        />
        <div
          v-if="errors.mealTime"
          class="error-message"
        >
          {{ errors.mealTime }}
        </div>
      </div>

      <!-- Notes -->
      <div class="form-group">
        <label class="form-label">メモ（任意）</label>
        <textarea
          v-model="formData.notes"
          class="notes-input"
          placeholder="食事に関するメモがあれば入力してください"
          :disabled="disabled"
          rows="3"
          maxlength="500"
        />
        <div class="character-count">
          {{ (formData.notes || "").length }}/500
        </div>
        <div
          v-if="errors.notes"
          class="error-message"
        >
          {{ errors.notes }}
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="form-actions">
      <button
        type="button"
        class="cancel-button"
        :disabled="disabled || isSubmitting"
        @click="handleCancel"
      >
        キャンセル
      </button>
      <button
        type="submit"
        class="submit-button"
        :disabled="
          disabled || isSubmitting || cats.length === 0 || foods.length === 0
        "
      >
        <span v-if="isSubmitting">保存中...</span>
        <span v-else>保存</span>
      </button>
    </div>
  </form>
</template>

<style scoped>
.meal-record-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-header {
  margin-bottom: 2rem;
  text-align: center;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.form-description {
  color: #666;
  font-size: 0.9rem;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.required {
  color: #e53e3e;
}

/* Cat Selection */
.cat-selector {
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
  background: #f8f8f8;
  border-radius: 4px;
}

.empty-hint {
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.cat-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.cat-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cat-option:hover:not(:disabled) {
  border-color: #4caf50;
  background: #f8fff8;
}

.cat-option--selected {
  border-color: #4caf50;
  background: #e8f5e9;
}

.cat-option:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cat-info {
  flex: 1;
  text-align: left;
}

.cat-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.cat-weight {
  font-size: 0.8rem;
  color: #666;
}

.selected-indicator {
  color: #4caf50;
  font-weight: bold;
  font-size: 1.2rem;
}

/* Quantity Input */
.quantity-mode-toggle {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  margin-bottom: 1rem;
}

.mode-button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.mode-button:hover:not(:disabled) {
  background: #f8f8f8;
}

.mode-button--active {
  background: #4caf50;
  color: white;
}

.mode-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.predefined-quantities {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.quantity-button {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.quantity-button:hover:not(:disabled) {
  border-color: #4caf50;
  background: #f8fff8;
}

.quantity-button--selected {
  border-color: #4caf50;
  background: #e8f5e9;
  color: #2e7d32;
  font-weight: 500;
}

.quantity-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quantity-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.quantity-input {
  flex: 1;
  padding: 0.75rem;
  padding-right: 3rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
}

.quantity-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.quantity-input:disabled {
  background: #f8f8f8;
  opacity: 0.6;
}

.quantity-unit {
  position: absolute;
  right: 0.75rem;
  color: #666;
  font-size: 0.9rem;
  pointer-events: none;
}

.conversion-display {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

.conversion-info {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.food-info {
  font-size: 0.8rem;
  color: #666;
}

/* Notes */
.notes-input {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
}

.notes-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.notes-input:disabled {
  background: #f8f8f8;
  opacity: 0.6;
}

.character-count {
  text-align: right;
  font-size: 0.8rem;
  color: #666;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.cancel-button,
.submit-button {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #666;
}

.cancel-button:hover:not(:disabled) {
  background: #f8f8f8;
  border-color: #cbd5e0;
}

.submit-button {
  border: 1px solid #4caf50;
  background: #4caf50;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background: #45a049;
  border-color: #45a049;
}

.cancel-button:disabled,
.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #e53e3e;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .meal-record-form {
    padding: 1rem;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .cat-options {
    grid-template-columns: 1fr;
  }

  .predefined-quantities {
    grid-template-columns: repeat(3, 1fr);
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .cancel-button,
  .submit-button {
    width: 100%;
    padding: 1rem;
  }
}
</style>
