<script setup lang="ts">
import { z } from 'zod';
import type {
  Medication,
  MedicationInput,
  MedicationType,
} from '~/types/medication';
import { MedicationInputSchema } from '~/lib/validations/medication';
import { parseApiError, formatValidationErrors, createDebouncedValidator, errorInfoToApiError } from '~/utils/error-handling';
import { useToast } from '~/composables/useToast';

interface Props {
  medication?: Medication;
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', medication: MedicationInput): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const formData = reactive<MedicationInput>({
  name: '',
  type: 'MEDICINE' as MedicationType,
  description: '',
  dosage: '',
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const submitError = ref<string>('');
const retryCount = ref(0);

const { error: showErrorToast } = useToast();

// Initialize form data when medication prop changes
watch(
  () => props.medication,
  (medication) => {
    if (medication) {
      formData.name = medication.name;
      formData.type = medication.type;
      formData.description = medication.description || '';
      formData.dosage = medication.dosage || '';
    }
    else {
      // Reset form for new medication
      formData.name = '';
      formData.type = 'MEDICINE' as MedicationType;
      formData.description = '';
      formData.dosage = '';
    }
    clearErrors();
  },
  { immediate: true },
);

// Debounced validation for real-time feedback
const debouncedValidate = createDebouncedValidator((data: MedicationInput) => {
  try {
    MedicationInputSchema.parse(data);
    // Clear field-specific errors if validation passes
    Object.keys(errors.value).forEach((key) => {
      if (key !== 'submit') {
        delete errors.value[key];
      }
    });
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = formatValidationErrors(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      );

      // Only update field errors, preserve submit errors
      Object.keys(validationErrors).forEach((key) => {
        const errorMessage = validationErrors[key];
        if (errorMessage) {
          errors.value[key] = errorMessage;
        }
      });
    }
  }
}, 500);

// Watch form data for real-time validation
watch(
  () => ({ ...formData }),
  (newData) => {
    if (newData.name.trim()) {
      debouncedValidate(newData).catch(() => {
        // Validation errors are handled in the debounced validator
      });
    }
  },
  { deep: true },
);

// Computed properties
const isEditMode = computed(() => !!props.medication);
const formTitle = computed(() =>
  isEditMode.value ? '薬の情報を編集' : '新しい薬を追加',
);

// Medication type options
const medicationTypeOptions = [
  { value: 'MEDICINE', label: '薬' },
  { value: 'SUPPLEMENT', label: 'サプリメント' },
  { value: 'VITAMIN', label: 'ビタミン' },
];

// Methods
const clearErrors = () => {
  errors.value = {};
  submitError.value = '';
};

const validateForm = (): boolean => {
  // Clear previous field errors but keep submit errors
  Object.keys(errors.value).forEach((key) => {
    if (key !== 'submit') {
      delete errors.value[key];
    }
  });

  try {
    MedicationInputSchema.parse(formData);
    return true;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = formatValidationErrors(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      );

      Object.assign(errors.value, validationErrors);
    }
    return false;
  }
};

const handleSubmit = async () => {
  if (!validateForm()) {
    showErrorToast({
      title: 'バリデーションエラー',
      message: '入力内容を確認してください',
    });
    return;
  }

  isSubmitting.value = true;
  submitError.value = '';

  try {
    // Clean up empty strings to undefined for optional fields
    const cleanedData: MedicationInput = {
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description?.trim() || undefined,
      dosage: formData.dosage?.trim() || undefined,
    };

    emit('save', cleanedData);
    retryCount.value = 0;
  }
  catch (error) {
    const errorInfo = parseApiError(error);
    const apiError = errorInfoToApiError(errorInfo);

    // Handle validation errors from server
    if (apiError.validationErrors) {
      const validationErrors = formatValidationErrors(apiError.validationErrors);
      Object.assign(errors.value, validationErrors);
    }

    // Set submit error
    submitError.value = apiError.message;
    errors.value.submit = apiError.message;

    // Show toast notification
    showErrorToast({
      title: '薬の保存に失敗しました',
      message: apiError.message,
      action: apiError.statusCode >= 500
        ? {
            label: '再試行',
            handler: () => handleRetry(),
          }
        : undefined,
    });
  }
  finally {
    isSubmitting.value = false;
  }
};

const handleRetry = async () => {
  if (retryCount.value >= 3) {
    showErrorToast({
      title: '再試行回数の上限に達しました',
      message: 'しばらく待ってから再度お試しください',
    });
    return;
  }

  retryCount.value++;
  await handleSubmit();
};

const handleClose = () => {
  emit('close');
};

const handleReset = () => {
  if (props.medication) {
    formData.name = props.medication.name;
    formData.type = props.medication.type;
    formData.description = props.medication.description || '';
    formData.dosage = props.medication.dosage || '';
  }
  else {
    formData.name = '';
    formData.type = 'MEDICINE' as MedicationType;
    formData.description = '';
    formData.dosage = '';
  }
  clearErrors();
  retryCount.value = 0;
};
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
        class="medication-form"
        @submit.prevent="handleSubmit"
      >
        <!-- Submit Error Display -->
        <div
          v-if="submitError"
          class="form-error-banner"
        >
          <div class="error-icon">
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div class="error-content">
            <div class="error-title">
              エラーが発生しました
            </div>
            <div class="error-message">
              {{ submitError }}
            </div>
          </div>
          <button
            v-if="retryCount < 3"
            type="button"
            class="error-retry-btn"
            :disabled="isSubmitting"
            @click="handleRetry"
          >
            再試行
          </button>
        </div>
        <div class="form-group">
          <label
            for="medication-name"
            class="form-label"
          >
            薬名 <span class="required">*</span>
          </label>
          <input
            id="medication-name"
            v-model="formData.name"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': errors.name }"
            placeholder="薬名を入力してください"
            maxlength="100"
          >
          <span
            v-if="errors.name"
            class="form-error"
          >{{ errors.name }}</span>
        </div>

        <div class="form-group">
          <label
            for="medication-type"
            class="form-label"
          >
            薬のタイプ <span class="required">*</span>
          </label>
          <select
            id="medication-type"
            v-model="formData.type"
            class="form-input"
            :class="{ 'form-input--error': errors.type }"
          >
            <option
              v-for="option in medicationTypeOptions"
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
            for="medication-dosage"
            class="form-label"
          >投与量</label>
          <input
            id="medication-dosage"
            v-model="formData.dosage"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': errors.dosage }"
            placeholder="例: 1日1回、1錠"
            maxlength="100"
          >
          <span
            v-if="errors.dosage"
            class="form-error"
          >{{
            errors.dosage
          }}</span>
        </div>

        <div class="form-group">
          <label
            for="medication-description"
            class="form-label"
          >説明</label>
          <textarea
            id="medication-description"
            v-model="formData.description"
            class="form-input"
            :class="{ 'form-input--error': errors.description }"
            placeholder="薬の説明や注意事項を入力してください"
            rows="3"
            maxlength="500"
          />
          <span
            v-if="errors.description"
            class="form-error"
          >{{
            errors.description
          }}</span>
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

.medication-form {
  padding: 1.5rem;
}

.form-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
}

.error-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.error-message {
  font-size: 0.875rem;
  line-height: 1.4;
}

.error-retry-btn {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  background-color: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.error-retry-btn:hover:not(:disabled) {
  background-color: #b91c1c;
}

.error-retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 1.5rem;
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
  font-family: inherit;
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
  .medication-form {
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
