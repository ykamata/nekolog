<script setup lang="ts">
import { z } from 'zod';
import type { Cat } from '~/types/cat-meal';
import type {
  VeterinaryAppointmentWithRelations,
  ConvertAppointmentToVisitInput,
  VeterinaryTreatment,
} from '~/types/veterinary-visit';
import { ConvertAppointmentToVisitSchema } from '~/lib/validations/veterinary-visit';
import { parseApiError, formatValidationErrors, createDebouncedValidator, isRetryableError, errorInfoToApiError } from '~/utils/error-handling';
import { useToast } from '~/composables/useToast';

interface Props {
  appointment?: VeterinaryAppointmentWithRelations;
  isOpen: boolean;
  cats: Cat[];
}

interface Emits {
  (e: 'close'): void;
  (e: 'convert', data: ConvertAppointmentToVisitInput): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const formData = reactive<ConvertAppointmentToVisitInput>({
  appointmentId: 0,
  actualVisitDate: undefined,
  actualCost: undefined,
  actualTreatments: [],
  actualNotes: '',
  hasBloodTest: false,
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const submitError = ref<string>('');
const retryCount = ref(0);

// Master data
const treatments = ref<VeterinaryTreatment[]>([]);
const loadingTreatments = ref(false);

// Validation
const debouncedValidator = createDebouncedValidator((data: ConvertAppointmentToVisitInput) => {
  ConvertAppointmentToVisitSchema.parse(data);
}, 300);

// Toast
const toast = useToast();

// Computed
const modalTitle = computed(() => '予約を通院記録に変換');

const selectedCat = computed(() => {
  if (!props.appointment) return null;
  return props.cats.find(cat => cat.id === props.appointment!.catId);
});

const appointmentInfo = computed(() => {
  if (!props.appointment) return null;

  return {
    catName: selectedCat.value?.name || '不明',
    appointmentDate: new Date(props.appointment.appointmentDate),
    hospitalName: props.appointment.hospital.name,
    doctorName: props.appointment.doctor?.name || '',
    plannedTreatments: props.appointment.plannedTreatments || '',
    notes: props.appointment.notes || '',
  };
});

// Methods
const initializeForm = () => {
  if (props.appointment) {
    Object.assign(formData, {
      appointmentId: props.appointment.id,
      actualVisitDate: new Date(props.appointment.appointmentDate),
      actualCost: undefined,
      actualTreatments: [],
      actualNotes: props.appointment.notes || '',
      hasBloodTest: false,
    });
  }

  // Clear errors
  errors.value = {};
  submitError.value = '';
  retryCount.value = 0;
};

const fetchTreatments = async () => {
  loadingTreatments.value = true;
  try {
    const response = await $fetch<VeterinaryTreatment[]>('/api/veterinary-treatments');
    treatments.value = response;
  }
  catch (error) {
    console.error('Failed to fetch treatments:', error);
    toast.error({ message: '処方内容の取得に失敗しました' });
  }
  finally {
    loadingTreatments.value = false;
  }
};

const handleTreatmentCreate = async (name: string) => {
  loadingTreatments.value = true;
  try {
    const newTreatment = await $fetch<VeterinaryTreatment>('/api/veterinary-treatments', {
      method: 'POST',
      body: { name },
    });

    treatments.value.push(newTreatment);
    if (!formData.actualTreatments) {
      formData.actualTreatments = [];
    }
    formData.actualTreatments.push(name);
    toast.success({ message: '処方内容を追加しました' });
  }
  catch (error) {
    console.error('Failed to create treatment:', error);
    toast.error({ message: '処方内容の追加に失敗しました' });
  }
  finally {
    loadingTreatments.value = false;
  }
};

const validateField = async (field: keyof ConvertAppointmentToVisitInput) => {
  try {
    await debouncedValidator(formData);
    if (errors.value[field]) {
      delete errors.value[field];
    }
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      const errorInfo = parseApiError(error);
      const apiError = errorInfoToApiError(errorInfo);
      if (apiError.validationErrors) {
        const fieldErrors = formatValidationErrors(apiError.validationErrors);
        if (fieldErrors[field]) {
          errors.value[field] = fieldErrors[field];
        }
      }
    }
  }
};

const handleSubmit = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  submitError.value = '';

  try {
    // Validate form
    const validatedData = ConvertAppointmentToVisitSchema.parse(formData);

    // Emit convert event
    emit('convert', validatedData);

    toast.success({ message: '予約を通院記録に変換しました' });

    handleClose();
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      const errorInfo = parseApiError(error);
      const apiError = errorInfoToApiError(errorInfo);
      if (apiError.validationErrors) {
        errors.value = formatValidationErrors(apiError.validationErrors);
      }
      submitError.value = '入力内容に誤りがあります。確認してください。';
    }
    else {
      const errorInfo = parseApiError(error);
      const apiError = errorInfoToApiError(errorInfo);
      submitError.value = apiError.message;

      if (isRetryableError(apiError) && retryCount.value < 3) {
        retryCount.value++;
        setTimeout(() => {
          if (isSubmitting.value) {
            handleSubmit();
          }
        }, 1000 * retryCount.value);
        return;
      }
    }
  }
  finally {
    isSubmitting.value = false;
  }
};

const handleClose = () => {
  if (isSubmitting.value) return;
  emit('close');
};

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).format(date);
};

// Watchers
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    initializeForm();
    fetchTreatments();
  }
});

// Field validation watchers
watch(() => formData.actualCost, () => validateField('actualCost'));
watch(() => formData.actualTreatments, () => validateField('actualTreatments'));

// Initialize on mount
onMounted(() => {
  if (props.isOpen) {
    initializeForm();
    fetchTreatments();
  }
});

// Add reactive data for new treatment name
const newTreatmentName = ref('');
</script>

<template>
  <div
    v-if="isOpen && appointment"
    class="convert-dialog-overlay"
    @click.self="handleClose"
  >
    <div class="convert-dialog-modal">
      <div class="modal-header">
        <h2 class="modal-title">
          {{ modalTitle }}
        </h2>
        <button
          type="button"
          class="close-button"
          :disabled="isSubmitting"
          @click="handleClose"
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div class="modal-content">
        <!-- Appointment Info -->
        <div class="appointment-info-section">
          <h3 class="section-title">
            予約情報
          </h3>
          <div class="appointment-info-card">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">猫:</span>
                <span class="info-value">{{ appointmentInfo?.catName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">予約日時:</span>
                <span class="info-value">{{ appointmentInfo ? formatDateTime(appointmentInfo.appointmentDate) : '' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">病院:</span>
                <span class="info-value">{{ appointmentInfo?.hospitalName }}</span>
              </div>
              <div
                v-if="appointmentInfo?.doctorName"
                class="info-item"
              >
                <span class="info-label">先生:</span>
                <span class="info-value">{{ appointmentInfo.doctorName }}</span>
              </div>
              <div
                v-if="appointmentInfo?.plannedTreatments"
                class="info-item"
              >
                <span class="info-label">予定内容:</span>
                <span class="info-value">{{ appointmentInfo.plannedTreatments }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Conversion Form -->
        <form
          class="convert-form"
          @submit.prevent="handleSubmit"
        >
          <h3 class="section-title">
            実際の通院情報
          </h3>

          <!-- Actual Visit Date -->
          <div class="form-group">
            <label class="form-label">
              実際の診察日時
            </label>
            <DateTimePicker
              :value="formData.actualVisitDate || new Date()"
              :disabled="isSubmitting"
              @change="formData.actualVisitDate = $event"
            />
            <div
              v-if="errors.actualVisitDate"
              class="form-error"
            >
              {{ errors.actualVisitDate }}
            </div>
          </div>

          <!-- Actual Cost -->
          <div class="form-group">
            <label class="form-label">
              実際の費用（円）
            </label>
            <input
              v-model.number="formData.actualCost"
              type="number"
              class="form-input"
              :class="{ 'form-input--error': errors.actualCost }"
              :disabled="isSubmitting"
              placeholder="費用を入力してください"
              min="0"
              step="1"
            >
            <div
              v-if="errors.actualCost"
              class="form-error"
            >
              {{ errors.actualCost }}
            </div>
          </div>

          <!-- Actual Treatments -->
          <div class="form-group">
            <label class="form-label">
              実際の処方内容
            </label>
            <div class="treatment-selector">
              <div class="selected-treatments">
                <div
                  v-for="(treatment, index) in formData.actualTreatments"
                  :key="index"
                  class="treatment-tag"
                >
                  {{ treatment }}
                  <button
                    type="button"
                    class="remove-treatment"
                    :disabled="isSubmitting"
                    @click="formData.actualTreatments?.splice(index, 1)"
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <VeterinaryMasterSelector
                v-model="newTreatmentName"
                type="doctor"
                :items="treatments"
                :loading="loadingTreatments"
                :disabled="isSubmitting"
                placeholder="処方内容を選択または入力してください"
                @select="(treatment: any) => {
                  if (!formData.actualTreatments) formData.actualTreatments = [];
                  if (!formData.actualTreatments.includes(treatment.name)) {
                    formData.actualTreatments.push(treatment.name);
                  }
                  newTreatmentName = '';
                }"
                @create="handleTreatmentCreate"
              />
            </div>
            <div
              v-if="errors.actualTreatments"
              class="form-error"
            >
              {{ errors.actualTreatments }}
            </div>
          </div>

          <!-- Blood Test -->
          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="formData.hasBloodTest"
                type="checkbox"
                class="checkbox-input"
                :disabled="isSubmitting"
              >
              <span class="checkbox-text">血液検査を実施した</span>
            </label>
          </div>

          <!-- Actual Notes -->
          <div class="form-group">
            <label class="form-label">
              実際のメモ
            </label>
            <textarea
              v-model="formData.actualNotes"
              class="form-textarea"
              :class="{ 'form-textarea--error': errors.actualNotes }"
              :disabled="isSubmitting"
              placeholder="実際の診察内容や気づいたことを入力してください"
              rows="4"
            />
            <div
              v-if="errors.actualNotes"
              class="form-error"
            >
              {{ errors.actualNotes }}
            </div>
          </div>

          <!-- Submit Error -->
          <div
            v-if="submitError"
            class="submit-error"
          >
            {{ submitError }}
            <span
              v-if="retryCount > 0"
              class="retry-info"
            >
              (再試行中... {{ retryCount }}/3)
            </span>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button
              type="button"
              class="cancel-button"
              :disabled="isSubmitting"
              @click="handleClose"
            >
              キャンセル
            </button>
            <button
              type="submit"
              class="submit-button"
              :disabled="isSubmitting"
            >
              <span
                v-if="isSubmitting"
                class="loading-spinner"
              />
              通院記録に変換
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.convert-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.convert-dialog-modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover:not(:disabled) {
  background: #f5f5f5;
  color: #333;
}

.close-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-button svg {
  width: 1.25rem;
  height: 1.25rem;
}

.modal-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
}

.appointment-info-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.appointment-info-card {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-label {
  font-weight: 500;
  color: #666;
  min-width: 5rem;
  flex-shrink: 0;
}

.info-value {
  color: #333;
  flex: 1;
}

.convert-form {
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

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.form-input--error,
.form-textarea--error {
  border-color: #e74c3c;
}

.form-input--error:focus,
.form-textarea--error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

.form-input:disabled,
.form-textarea:disabled {
  background: #f8f8f8;
  opacity: 0.6;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.treatment-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selected-treatments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 2rem;
}

.treatment-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #e0f2fe;
  border: 1px solid #0284c7;
  border-radius: 16px;
  font-size: 0.8rem;
  color: #0c4a6e;
}

.remove-treatment {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border: none;
  background: none;
  color: #0c4a6e;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.remove-treatment:hover:not(:disabled) {
  background: rgba(12, 74, 110, 0.1);
}

.remove-treatment:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-treatment svg {
  width: 0.75rem;
  height: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-input {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.checkbox-input:disabled {
  cursor: not-allowed;
}

.checkbox-text {
  font-size: 0.9rem;
  color: #333;
}

.form-error {
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.submit-error {
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  color: #dc2626;
  font-size: 0.9rem;
}

.retry-info {
  font-size: 0.8rem;
  opacity: 0.8;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.cancel-button,
.submit-button {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  border: 1px solid #f59e0b;
  background: #f59e0b;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background: #d97706;
  border-color: #d97706;
}

.cancel-button:disabled,
.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .convert-dialog-overlay {
    padding: 0.5rem;
  }

  .convert-dialog-modal {
    max-height: 95vh;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-content {
    padding: 1rem;
    gap: 1.5rem;
  }

  .appointment-info-section {
    padding: 1rem;
  }

  .info-grid {
    gap: 0.5rem;
  }

  .info-item {
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-label {
    min-width: auto;
    font-size: 0.8rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .cancel-button,
  .submit-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
