<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';
import type { ExcretionRecordInput } from '~/types/excretion';
import { ExcretionType, ExcretionTypeOptions } from '~/types/excretion';
import { ExcretionRecordFormSchema } from '~/lib/validations/excretion';
import { createUnifiedErrorHandler } from '~/utils/error-handling';

interface Props {
  cats: Cat[];
  initialData?: Partial<ExcretionRecordInput>;
  loading?: boolean;
  disabled?: boolean;
}

interface Emits {
  (e: 'submit', data: ExcretionRecordInput): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
});

const emit = defineEmits<Emits>();

// Form state
const formData = ref({
  catId: props.initialData?.catId || 0,
  type: props.initialData?.type || ExcretionType.URINE,
  recordedAt: props.initialData?.recordedAt || new Date(),
  notes: props.initialData?.notes || '',
});

// Form validation state
const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

// 統一エラーハンドラーの初期化
const errorHandler = createUnifiedErrorHandler('ExcretionRecordForm', {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
});

// Computed properties (removed unused selectedCat)

// Validation
const validateForm = (): boolean => {
  try {
    ExcretionRecordFormSchema.parse({
      ...formData.value,
      recordedAt: formData.value.recordedAt.toISOString(),
    });
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

const handleTypeSelect = (type: ExcretionType) => {
  formData.value.type = type;
  validateField('type');
};

const handleDateTimeChange = (date: Date) => {
  formData.value.recordedAt = date;
  validateField('recordedAt');
};

const validateField = (field: string) => {
  try {
    const fieldSchema = ExcretionRecordFormSchema.shape[
      field as keyof typeof ExcretionRecordFormSchema.shape
    ];
    if (fieldSchema) {
      let value = formData.value[field as keyof typeof formData.value];
      if (field === 'recordedAt' && value instanceof Date) {
        value = value.toISOString();
      }
      fieldSchema.parse(value);
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
    const submitData: ExcretionRecordInput = {
      catId: formData.value.catId,
      type: formData.value.type,
      recordedAt: formData.value.recordedAt,
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
    catId: 0,
    type: ExcretionType.URINE,
    recordedAt: new Date(),
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
        catId: newData.catId || 0,
        type: newData.type || ExcretionType.URINE,
        recordedAt: newData.recordedAt || new Date(),
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
    data-testid="excretion-form"
    class="excretion-record-form"
    role="form"
    aria-labelledby="form-title"
    aria-describedby="form-description"
    @submit.prevent="handleSubmit"
  >
    <div class="form-header">
      <h2
        id="form-title"
        class="form-title"
      >
        排泄記録
      </h2>
      <p
        id="form-description"
        class="form-description"
      >
        猫の排泄記録を入力してください
      </p>
    </div>

    <div class="form-body">
      <!-- Cat Selection -->
      <div
        class="form-group"
        role="group"
        aria-labelledby="cat-selection-label"
      >
        <label
          id="cat-selection-label"
          class="form-label"
        >
          猫の選択 <span
            class="required"
            aria-label="必須項目"
          >*</span>
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
              data-testid="cat-select"
              type="button"
              class="cat-option"
              :class="{ 'cat-option--selected': cat.id === formData.catId }"
              :disabled="disabled"
              :aria-pressed="cat.id === formData.catId"
              :aria-describedby="cat.weight ? `cat-weight-${cat.id}` : undefined"
              @click="handleCatSelect(cat)"
            >
              <div class="cat-info">
                <div class="cat-name">
                  {{ cat.name }}
                </div>
                <div
                  v-if="cat.weight"
                  :id="`cat-weight-${cat.id}`"
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
          role="alert"
          aria-live="polite"
        >
          {{ errors.catId }}
        </div>
      </div>

      <!-- Excretion Type Selection -->
      <fieldset
        class="form-group"
        aria-labelledby="type-selection-legend"
      >
        <legend
          id="type-selection-legend"
          class="form-label"
        >
          排泄タイプ <span
            class="required"
            aria-label="必須項目"
          >*</span>
        </legend>
        <div
          class="type-selector"
          role="radiogroup"
          aria-labelledby="type-selection-legend"
        >
          <div
            v-for="option in ExcretionTypeOptions"
            :key="option.value"
            class="type-option"
          >
            <input
              :id="`type-${option.value}`"
              v-model="formData.type"
              :data-testid="`type-${option.value.toLowerCase()}`"
              type="radio"
              name="excretion-type"
              :value="option.value"
              class="type-radio"
              :disabled="disabled"
              :aria-describedby="errors.type ? 'type-error' : undefined"
              @change="handleTypeSelect(option.value)"
            >
            <label
              :for="`type-${option.value}`"
              class="type-label"
            >
              <span class="type-icon">
                {{ option.value === ExcretionType.URINE ? '💧' : '💩' }}
              </span>
              <span class="type-text">{{ option.label }}</span>
            </label>
          </div>
        </div>
        <div
          v-if="errors.type"
          id="type-error"
          class="error-message"
          role="alert"
          aria-live="polite"
        >
          {{ errors.type }}
        </div>
      </fieldset>
    </div>

    <!-- Date/Time Selection -->
    <div class="form-group">
      <label
        id="datetime-label"
        class="form-label"
      >
        記録日時 <span
          class="required"
          aria-label="必須項目"
        >*</span>
      </label>
      <DateTimePicker
        data-testid="recorded-at"
        :value="formData.recordedAt"
        :disabled="disabled"
        :max-date="new Date()"
        aria-labelledby="datetime-label"
        :aria-describedby="errors.recordedAt ? 'datetime-error' : undefined"
        @change="handleDateTimeChange"
      />
      <div
        v-if="errors.recordedAt"
        id="datetime-error"
        class="error-message"
        role="alert"
        aria-live="polite"
      >
        {{ errors.recordedAt }}
      </div>
    </div>

    <!-- Notes -->
    <div class="form-group">
      <label
        id="notes-label"
        class="form-label"
      >メモ（任意）</label>
      <textarea
        id="notes-input"
        v-model="formData.notes"
        data-testid="notes"
        class="notes-input"
        placeholder="排泄に関するメモがあれば入力してください（色、量、異常など）"
        :disabled="disabled"
        rows="3"
        maxlength="500"
        aria-labelledby="notes-label"
        :aria-describedby="errors.notes ? 'notes-error' : 'notes-count'"
      />
      <div
        id="notes-count"
        class="character-count"
        aria-live="polite"
      >
        {{ (formData.notes || "").length }}/500文字
      </div>
      <div
        v-if="errors.notes"
        id="notes-error"
        class="error-message"
        role="alert"
        aria-live="polite"
      >
        {{ errors.notes }}
      </div>
    </div>

    <!-- Form Actions -->
    <div class="form-actions">
      <button
        data-testid="cancel-button"
        type="button"
        class="cancel-button"
        :disabled="disabled || isSubmitting"
        :aria-describedby="isSubmitting ? 'submit-status' : undefined"
        @click="handleCancel"
      >
        キャンセル
      </button>
      <button
        data-testid="submit-button"
        type="submit"
        class="submit-button"
        :disabled="
          disabled || isSubmitting || cats.length === 0
        "
        :aria-describedby="isSubmitting ? 'submit-status' : undefined"
      >
        <span
          v-if="isSubmitting"
          id="submit-status"
          aria-live="polite"
        >保存中...</span>
        <span v-else>保存</span>
      </button>
    </div>
  </form>
</template>

<style scoped>
.excretion-record-form {
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

/* Type Selection */
.type-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.type-option {
  position: relative;
}

.type-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.type-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-radio:checked + .type-label {
  border-color: #4caf50;
  background: #e8f5e9;
}

.type-label:hover {
  border-color: #4caf50;
  background: #f8fff8;
}

.type-radio:disabled + .type-label {
  opacity: 0.6;
  cursor: not-allowed;
}

.type-icon {
  font-size: 1.5rem;
}

.type-text {
  font-weight: 500;
  color: #333;
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
  .excretion-record-form {
    padding: 1rem;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .cat-options {
    grid-template-columns: 1fr;
  }

  .type-selector {
    grid-template-columns: 1fr;
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
