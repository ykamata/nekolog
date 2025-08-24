<script setup lang="ts">
import { z } from 'zod';
import type { Cat } from '~/types/cat-meal';
import type {
  VeterinaryAppointmentWithRelations,
  CreateVeterinaryAppointmentInput,
  VeterinaryHospital,
  VeterinaryDoctor,
} from '~/types/veterinary-visit';
import { VeterinaryAppointmentFormSchema } from '~/lib/validations/veterinary-visit';
import { parseApiError, formatValidationErrors, createDebouncedValidator, isRetryableError, errorInfoToApiError, createUnifiedErrorHandler } from '~/utils/error-handling';
import { useToast } from '~/composables/useToast';
import { useResponsive } from '~/composables/useResponsive';

interface Props {
  appointment?: VeterinaryAppointmentWithRelations;
  isOpen: boolean;
  cats: Cat[];
  initialData?: Partial<CreateVeterinaryAppointmentInput>;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', appointment: CreateVeterinaryAppointmentInput): void;
  (e: 'convertToVisit', appointmentId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const formData = reactive<CreateVeterinaryAppointmentInput>({
  catId: '',
  appointmentDate: new Date(),
  hospitalName: '',
  doctorName: '',
  plannedTreatments: '',
  notes: '',
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const submitError = ref<string>('');
const retryCount = ref(0);

// Master data
const hospitals = ref<VeterinaryHospital[]>([]);
const doctors = ref<VeterinaryDoctor[]>([]);

// Loading states
const loadingHospitals = ref(false);
const loadingDoctors = ref(false);

// 統一エラーハンドラーの初期化
const errorHandler = createUnifiedErrorHandler('VeterinaryAppointmentForm', {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
});

// Generate unique IDs for accessibility
const generateId = (base: string) => `${base}-${Math.random().toString(36).substr(2, 9)}`;

// Validation
const debouncedValidator = createDebouncedValidator((data: CreateVeterinaryAppointmentInput) => {
  VeterinaryAppointmentFormSchema.parse(data);
}, 300);

// Toast
const toast = useToast();

// レスポンシブ対応
const { screenSize, getResponsiveClasses } = useResponsive();

// Computed
const isEditMode = computed(() => !!props.appointment);
const modalTitle = computed(() => isEditMode.value ? '予約を編集' : '新しい予約を作成');

const selectedCat = computed(() => {
  return props.cats.find(cat => cat.id === formData.catId);
});

const formClasses = computed(() => {
  const baseClasses = ['appointment-form'];
  const responsiveClasses = getResponsiveClasses('appointment-form');

  // レスポンシブクラスを追加
  if (screenSize.value === 'mobile') {
    baseClasses.push('mobile-layout');
  }
  else if (screenSize.value === 'tablet') {
    baseClasses.push('tablet-layout');
  }

  return [...baseClasses, ...responsiveClasses];
});

const canConvertToVisit = computed(() => {
  return isEditMode.value && props.appointment && props.appointment.status !== 'COMPLETED';
});

// Methods
const initializeForm = () => {
  // Clear errors first
  errors.value = {};
  submitError.value = '';
  retryCount.value = 0;

  if (props.appointment) {
    // Edit mode - populate with existing data
    formData.catId = props.appointment.catId;
    formData.appointmentDate = new Date(props.appointment.appointmentDate);
    formData.hospitalName = props.appointment.hospital.name;
    formData.doctorName = props.appointment.doctor?.name || '';
    formData.plannedTreatments = props.appointment.plannedTreatments || '';
    formData.notes = props.appointment.notes || '';
  }
  else if (props.initialData) {
    // New appointment with initial data
    formData.catId = props.initialData.catId || '';
    formData.appointmentDate = props.initialData.appointmentDate || new Date();
    formData.hospitalName = props.initialData.hospitalName || '';
    formData.doctorName = props.initialData.doctorName || '';
    formData.plannedTreatments = props.initialData.plannedTreatments || '';
    formData.notes = props.initialData.notes || '';
  }
  else {
    // New appointment - reset to defaults
    formData.catId = props.cats.length === 1 ? props.cats[0]?.id || '' : '';
    formData.appointmentDate = new Date();
    formData.hospitalName = '';
    formData.doctorName = '';
    formData.plannedTreatments = '';
    formData.notes = '';
  }
};

const fetchMasterData = async () => {
  const result = await errorHandler.handleDataFetch(
    async () => {
      const [hospitalsResponse, doctorsResponse] = await Promise.all([
        $fetch<VeterinaryHospital[]>('/api/veterinary-hospitals'),
        $fetch<VeterinaryDoctor[]>('/api/veterinary-doctors'),
      ]);
      return { hospitals: hospitalsResponse, doctors: doctorsResponse };
    },
    {
      retryable: true,
      fallbackMessage: 'マスタデータの取得に失敗しました',
      onSuccess: (data) => {
        hospitals.value = data.hospitals;
        doctors.value = data.doctors;
      },
      onError: (error, userMessage) => {
        toast.error({ message: userMessage });
      },
      onRetry: (attempt) => {
        toast.info({
          message: `マスタデータを再取得中... (${attempt}/3)`,
          duration: 2000,
        });
      },
    },
  );
};

const handleHospitalCreate = async (name: string) => {
  loadingHospitals.value = true;

  const result = await errorHandler.handleAsyncOperation(
    async () => {
      return await $fetch<VeterinaryHospital>('/api/veterinary-hospitals', {
        method: 'POST',
        body: { name },
      });
    },
    {
      retryable: true,
      fallbackMessage: '病院の追加に失敗しました',
      onSuccess: (newHospital) => {
        hospitals.value.push(newHospital);
        formData.hospitalName = name;
        toast.success({ message: '病院を追加しました' });
      },
      onFinalError: (error) => {
        toast.error({ message: '病院の追加に失敗しました' });
      },
      onRetry: (attempt) => {
        toast.info({
          message: `病院の追加を再試行中... (${attempt}/3)`,
          duration: 2000,
        });
      },
    },
  );

  loadingHospitals.value = false;
};

const handleDoctorCreate = async (name: string) => {
  loadingDoctors.value = true;

  const result = await errorHandler.handleAsyncOperation(
    async () => {
      return await $fetch<VeterinaryDoctor>('/api/veterinary-doctors', {
        method: 'POST',
        body: { name },
      });
    },
    {
      retryable: true,
      fallbackMessage: '先生の追加に失敗しました',
      onSuccess: (newDoctor) => {
        doctors.value.push(newDoctor);
        formData.doctorName = name;
        toast.success({ message: '先生を追加しました' });
      },
      onFinalError: (error) => {
        toast.error({ message: '先生の追加に失敗しました' });
      },
      onRetry: (attempt) => {
        toast.info({
          message: `先生の追加を再試行中... (${attempt}/3)`,
          duration: 2000,
        });
      },
    },
  );

  loadingDoctors.value = false;
};

const validateField = async (field: keyof CreateVeterinaryAppointmentInput) => {
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

const validateForm = () => {
  const newErrors: Record<string, string> = {};

  // 猫の選択チェック
  if (!formData.catId.trim()) {
    newErrors.catId = '猫を選択してください';
  }

  // 予約日時チェック
  if (!formData.appointmentDate) {
    newErrors.appointmentDate = '予約日時を入力してください';
  }
  else if (formData.appointmentDate <= new Date()) {
    newErrors.appointmentDate = '予約日時は未来の日時を選択してください';
  }

  // 病院名チェック
  if (!formData.hospitalName.trim()) {
    newErrors.hospitalName = '病院名を入力してください';
  }
  else if (formData.hospitalName.length > 100) {
    newErrors.hospitalName = '病院名は100文字以内で入力してください';
  }

  // 先生名チェック（任意項目だが、入力されている場合は文字数制限）
  if (formData.doctorName && formData.doctorName.length > 50) {
    newErrors.doctorName = '先生名は50文字以内で入力してください';
  }

  // 予定処方内容チェック（任意項目だが、入力されている場合は文字数制限）
  if (formData.plannedTreatments && formData.plannedTreatments.length > 500) {
    newErrors.plannedTreatments = '予定処方内容は500文字以内で入力してください';
  }

  // メモチェック（任意項目だが、入力されている場合は文字数制限）
  if (formData.notes && formData.notes.length > 1000) {
    newErrors.notes = 'メモは1000文字以内で入力してください';
  }

  errors.value = newErrors;
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async () => {
  if (isSubmitting.value) return;

  const result = await errorHandler.handleFormSubmission(
    // バリデーション関数
    async () => {
      // 基本バリデーション
      if (!validateForm()) {
        // 基本バリデーションエラーをZodエラー形式で投げる
        const validationErrors = Object.entries(errors.value).map(([field, message]) => ({
          field,
          message,
        }));
        const error = new Error('Validation failed') as any;
        error.validationErrors = validationErrors;
        throw error;
      }
      // Zodスキーマバリデーション
      VeterinaryAppointmentFormSchema.parse(formData);
    },
    // 送信関数
    async () => {
      const validatedData = VeterinaryAppointmentFormSchema.parse(formData);
      emit('save', validatedData);
      return validatedData;
    },
    {
      retryable: true,
      successMessage: isEditMode.value ? '予約を更新しました' : '予約を作成しました',
      onValidationError: (validationErrors) => {
        errors.value = validationErrors;
      },
      onSubmitStart: () => {
        isSubmitting.value = true;
        submitError.value = '';
      },
      onSubmitSuccess: () => {
        toast.success({
          message: isEditMode.value ? '予約を更新しました' : '予約を作成しました',
        });
        handleClose();
      },
      onSubmitError: (error, userMessage) => {
        submitError.value = userMessage;
        toast.error({ message: userMessage });
      },
      onRetry: (attempt) => {
        retryCount.value = attempt;
        toast.info({
          message: `再試行中... (${attempt}/3)`,
          duration: 2000,
        });
      },
    },
  );

  // 最終的な状態更新
  isSubmitting.value = false;
  retryCount.value = result.retryCount;

  if (!result.success && result.validationErrors) {
    errors.value = result.validationErrors;
  }
};

const handleRetry = () => {
  submitError.value = '';
  retryCount.value = 0;
  handleSubmit();
};

const showConvertDialog = ref(false);

const handleConvertToVisit = () => {
  showConvertDialog.value = true;
};

const confirmConvertToVisit = () => {
  if (props.appointment) {
    emit('convertToVisit', props.appointment.id);
    showConvertDialog.value = false;
    handleClose();
  }
};

const cancelConvertToVisit = () => {
  showConvertDialog.value = false;
};

const handleClose = () => {
  if (isSubmitting.value) return;
  emit('close');
};

// Watchers
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      initializeForm();
      fetchMasterData();
    });
  }
});

// Watch for prop changes to reinitialize form
watch(() => props.appointment, () => {
  if (props.isOpen) {
    nextTick(() => {
      initializeForm();
    });
  }
});

watch(() => props.initialData, () => {
  if (props.isOpen) {
    nextTick(() => {
      initializeForm();
    });
  }
});

// Field validation watchers
watch(() => formData.catId, () => {
  if (errors.value.catId && formData.catId.trim()) {
    delete errors.value.catId;
  }
});

watch(() => formData.appointmentDate, () => {
  if (errors.value.appointmentDate && formData.appointmentDate && formData.appointmentDate > new Date()) {
    delete errors.value.appointmentDate;
  }
});

watch(() => formData.hospitalName, () => {
  if (errors.value.hospitalName && formData.hospitalName.trim() && formData.hospitalName.length <= 100) {
    delete errors.value.hospitalName;
  }
});

watch(() => formData.doctorName, () => {
  if (errors.value.doctorName && (!formData.doctorName || formData.doctorName.length <= 50)) {
    delete errors.value.doctorName;
  }
});

watch(() => formData.plannedTreatments, () => {
  if (errors.value.plannedTreatments && (!formData.plannedTreatments || formData.plannedTreatments.length <= 500)) {
    delete errors.value.plannedTreatments;
  }
});

watch(() => formData.notes, () => {
  if (errors.value.notes && (!formData.notes || formData.notes.length <= 1000)) {
    delete errors.value.notes;
  }
});

// Initialize on mount
onMounted(() => {
  if (props.isOpen) {
    nextTick(() => {
      initializeForm();
      fetchMasterData();
    });
  }
});
</script>

<template>
  <div
    v-if="isOpen"
    class="appointment-form-overlay"
    @click.self="handleClose"
  >
    <div class="appointment-form-modal">
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

      <form
        :class="formClasses"
        data-testid="appointment-form"
        @submit.prevent="handleSubmit"
      >
        <!-- Cat Selection -->
        <div class="form-group">
          <label
            for="cat-select"
            class="form-label required"
          >
            猫
          </label>
          <select
            id="cat-select"
            v-model="formData.catId"
            class="form-select"
            :class="{ 'form-select--error': errors.catId }"
            :disabled="isSubmitting"
            data-testid="cat-select"
            aria-required="true"
            :aria-describedby="errors.catId ? 'cat-error' : undefined"
            required
          >
            <option value="">
              猫を選択してください
            </option>
            <option
              v-for="cat in cats"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
          <div
            v-if="errors.catId"
            id="cat-error"
            class="form-error"
            data-testid="cat-error"
          >
            {{ errors.catId }}
          </div>
        </div>

        <!-- Appointment Date -->
        <div class="form-group">
          <label
            for="appointment-date"
            class="form-label required"
          >
            予約日時
          </label>
          <DateTimePicker
            id="appointment-date"
            :value="formData.appointmentDate"
            :disabled="isSubmitting"
            :min-date="new Date()"
            data-testid="appointment-date"
            aria-required="true"
            :aria-describedby="errors.appointmentDate ? 'appointment-date-error' : undefined"
            @change="formData.appointmentDate = $event"
          />
          <div
            v-if="errors.appointmentDate"
            id="appointment-date-error"
            class="form-error"
            data-testid="appointment-date-error"
          >
            {{ errors.appointmentDate }}
          </div>
        </div>

        <!-- Hospital Selection -->
        <div class="form-group">
          <label
            for="hospital-input"
            class="form-label required"
          >
            病院
          </label>
          <VeterinaryMasterSelector
            id="hospital-input"
            v-model="formData.hospitalName"
            :items="hospitals"
            :loading="loadingHospitals"
            :disabled="isSubmitting"
            :error="errors.hospitalName"
            placeholder="病院を選択または入力してください"
            data-testid="hospital-input"
            aria-required="true"
            :aria-describedby="errors.hospitalName ? 'hospital-error' : undefined"
            required
            @create="handleHospitalCreate"
          />
          <div
            v-if="errors.hospitalName"
            id="hospital-error"
            class="form-error"
            data-testid="hospital-error"
          >
            {{ errors.hospitalName }}
          </div>
        </div>

        <!-- Doctor Selection -->
        <div class="form-group">
          <label
            for="doctor-input"
            class="form-label"
          >
            先生
          </label>
          <VeterinaryMasterSelector
            id="doctor-input"
            :model-value="formData.doctorName || ''"
            :items="doctors"
            :loading="loadingDoctors"
            :disabled="isSubmitting"
            :error="errors.doctorName"
            placeholder="先生を選択または入力してください（任意）"
            data-testid="doctor-input"
            :aria-describedby="errors.doctorName ? 'doctor-error' : undefined"
            @update:model-value="(value: string) => formData.doctorName = value"
            @create="handleDoctorCreate"
          />
          <div
            v-if="errors.doctorName"
            id="doctor-error"
            class="form-error"
            data-testid="doctor-error"
          >
            {{ errors.doctorName }}
          </div>
        </div>

        <!-- Planned Treatments -->
        <div class="form-group">
          <label
            for="planned-treatments-textarea"
            class="form-label"
          >
            予定内容
          </label>
          <textarea
            id="planned-treatments-textarea"
            v-model="formData.plannedTreatments"
            class="form-textarea"
            :class="{ 'form-textarea--error': errors.plannedTreatments }"
            :disabled="isSubmitting"
            placeholder="予定している診察や処置内容を入力してください"
            data-testid="planned-treatments-textarea"
            :aria-describedby="errors.plannedTreatments ? 'planned-treatments-error' : undefined"
            rows="3"
          />
          <div
            v-if="errors.plannedTreatments"
            id="planned-treatments-error"
            class="form-error"
            data-testid="planned-treatments-error"
          >
            {{ errors.plannedTreatments }}
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label
            for="notes-textarea"
            class="form-label"
          >
            メモ
          </label>
          <textarea
            id="notes-textarea"
            v-model="formData.notes"
            class="form-textarea"
            :class="{ 'form-textarea--error': errors.notes }"
            :disabled="isSubmitting"
            placeholder="その他のメモがあれば入力してください"
            data-testid="notes-textarea"
            :aria-describedby="errors.notes ? 'notes-error' : undefined"
            rows="3"
          />
          <div
            v-if="errors.notes"
            id="notes-error"
            class="form-error"
            data-testid="notes-error"
          >
            {{ errors.notes }}
          </div>
        </div>

        <!-- Submit Error -->
        <div
          v-if="submitError"
          class="submit-error"
          data-testid="submit-error"
        >
          <span class="error-message">{{ submitError }}</span>
          <span
            v-if="retryCount > 0"
            class="retry-info"
          >
            (再試行中... {{ retryCount }}/3)
          </span>
          <button
            v-if="submitError && !isSubmitting"
            type="button"
            class="retry-button"
            data-testid="retry-button"
            @click="handleRetry"
          >
            再試行
          </button>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button
            v-if="canConvertToVisit"
            type="button"
            class="convert-button"
            :disabled="isSubmitting"
            data-testid="convert-to-visit-button"
            @click="handleConvertToVisit"
          >
            通院記録に変換
          </button>

          <div class="action-buttons">
            <button
              type="button"
              class="cancel-button"
              :disabled="isSubmitting"
              data-testid="cancel-button"
              @click="handleClose"
            >
              キャンセル
            </button>
            <button
              type="submit"
              class="submit-button"
              :disabled="isSubmitting"
              data-testid="submit-button"
            >
              <span
                v-if="isSubmitting"
                class="loading-spinner"
              />
              {{ isSubmitting ? '保存中' : (isEditMode ? '更新' : '作成') }}
            </button>
          </div>
        </div>
      </form>

      <!-- Convert Confirmation Dialog -->
      <div
        v-if="showConvertDialog"
        class="convert-confirmation-dialog"
        data-testid="convert-confirmation-dialog"
      >
        <div class="dialog-content">
          <h3 class="dialog-title">
            通院記録に変換
          </h3>
          <p class="dialog-message">
            この予約を通院記録に変換しますか？<br>
            変換後は予約として編集できなくなります。
          </p>
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-cancel-button"
              data-testid="convert-cancel-button"
              @click="cancelConvertToVisit"
            >
              キャンセル
            </button>
            <button
              type="button"
              class="dialog-confirm-button"
              data-testid="convert-confirm-button"
              @click="confirmConvertToVisit"
            >
              変換する
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.appointment-form-overlay {
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

.appointment-form-modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .appointment-form-modal {
    max-width: 700px;
  }

  .modal-header {
    padding: 2rem;
  }

  .modal-title {
    font-size: 1.5rem;
  }

  .close-button {
    width: 2.5rem;
    height: 2.5rem;
  }

  .close-button svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .appointment-form {
    padding: 2rem;
    gap: 2rem;
  }

  .form-label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .form-select,
  .form-textarea {
    padding: 1rem;
    font-size: 1rem;
  }

  .form-textarea {
    min-height: 120px;
  }

  .form-actions {
    gap: 2rem;
    margin-top: 2.5rem;
  }

  .convert-button,
  .cancel-button,
  .submit-button {
    padding: 1rem 2rem;
    font-size: 1rem;
  }

  .action-buttons {
    gap: 1.5rem;
  }
}

/* Large desktop optimizations */
@media (min-width: 1440px) {
  .appointment-form-modal {
    max-width: 800px;
  }

  .appointment-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 2.5rem;
  }

  .form-group:nth-child(1),
  .form-group:nth-child(2),
  .form-group:nth-child(3) {
    grid-column: 1;
  }

  .form-group:nth-child(4),
  .form-group:nth-child(5) {
    grid-column: 2;
  }

  .form-group:nth-child(6) {
    grid-column: 1 / -1;
  }

  .submit-error {
    grid-column: 1 / -1;
  }

  .form-actions {
    grid-column: 1 / -1;
  }

  .form-textarea {
    min-height: 140px;
  }
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

.appointment-form {
  padding: 1.5rem;
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

.form-label.required::after {
  content: ' *';
  color: #e74c3c;
}

.form-select,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.form-select--error,
.form-textarea--error {
  border-color: #e74c3c;
}

.form-select--error:focus,
.form-textarea--error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

.form-select:disabled,
.form-textarea:disabled {
  background: #f8f8f8;
  opacity: 0.6;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
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
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.convert-button {
  padding: 0.75rem 1rem;
  border: 1px solid #f59e0b;
  border-radius: 4px;
  background: #fef3c7;
  color: #92400e;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.convert-button:hover:not(:disabled) {
  background: #fde68a;
  border-color: #d97706;
}

.convert-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
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

/* Tablet responsive */
@media (max-width: 1024px) {
  .appointment-form-overlay {
    padding: 1rem;
  }

  .appointment-form-modal {
    max-width: 90vw;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .appointment-form-overlay {
    padding: 0.5rem;
    align-items: flex-start;
    padding-top: 2rem;
  }

  .appointment-form-modal {
    max-height: calc(100vh - 4rem);
    width: 100%;
    max-width: none;
    border-radius: 12px 12px 0 0;
  }

  .modal-header {
    padding: 1.25rem 1rem;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    border-bottom: 2px solid #e2e8f0;
  }

  .modal-title {
    font-size: 1.1rem;
  }

  .close-button {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 8px;
  }

  .close-button svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .appointment-form {
    padding: 1rem;
    gap: 1.25rem;
    flex: 1;
    overflow-y: auto;
  }

  .form-group {
    gap: 0.75rem;
  }

  .form-label {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  .form-select,
  .form-textarea {
    padding: 1rem 0.75rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .form-select:focus,
  .form-textarea:focus {
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  }

  .form-textarea {
    min-height: 100px;
    resize: vertical;
  }

  .form-error {
    font-size: 1rem;
    margin-top: 0.5rem;
  }

  .submit-error {
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
    margin: 0 -1rem;
  }

  .form-actions {
    gap: 1.25rem;
    margin-top: 1.5rem;
    position: sticky;
    bottom: 0;
    background: white;
    padding-top: 1.5rem;
    border-top: 2px solid #e2e8f0;
  }

  .convert-button {
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 1rem;
  }

  .cancel-button,
  .submit-button {
    width: 100%;
    justify-content: center;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
    font-weight: 600;
  }

  .cancel-button:hover:not(:disabled),
  .submit-button:hover:not(:disabled) {
    transform: none;
  }

  .cancel-button:active,
  .submit-button:active {
    transform: scale(0.98);
  }

  .loading-spinner {
    width: 1.25rem;
    height: 1.25rem;
  }
}

/* Small mobile responsive */
@media (max-width: 480px) {
  .appointment-form-overlay {
    padding: 0;
    align-items: stretch;
  }

  .appointment-form-modal {
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1rem;
  }

  .close-button {
    width: 2.25rem;
    height: 2.25rem;
  }

  .close-button svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .appointment-form {
    padding: 0.75rem;
    gap: 1rem;
  }

  .form-label {
    font-size: 0.9rem;
  }

  .form-select,
  .form-textarea {
    padding: 0.875rem 0.75rem;
    font-size: 0.9rem;
  }

  .form-error {
    font-size: 0.9rem;
  }

  .submit-error {
    font-size: 0.9rem;
  }

  .convert-button,
  .cancel-button,
  .submit-button {
    padding: 0.875rem 1.25rem;
    font-size: 0.9rem;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .close-button,
  .form-select,
  .form-textarea,
  .convert-button,
  .cancel-button,
  .submit-button {
    min-height: 44px;
  }

  .close-button:hover:not(:disabled) {
    transform: none;
  }

  .close-button:active {
    transform: scale(0.9);
    transition: transform 0.1s ease;
  }

  .cancel-button:hover:not(:disabled),
  .submit-button:hover:not(:disabled),
  .convert-button:hover:not(:disabled) {
    transform: none;
  }

  .cancel-button:active,
  .submit-button:active,
  .convert-button:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .appointment-form-modal {
    border: 3px solid #000;
  }

  .form-select,
  .form-textarea {
    border: 2px solid #000;
  }

  .form-select:focus,
  .form-textarea:focus {
    border-color: #000;
    box-shadow: 0 0 0 3px #000;
  }

  .submit-button {
    background: #000;
    border-color: #000;
  }

  .cancel-button {
    background: #fff;
    border-color: #000;
    color: #000;
  }

  .convert-button {
    background: #fff;
    border-color: #000;
    color: #000;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .appointment-form-modal,
  .form-select,
  .form-textarea,
  .cancel-button,
  .submit-button,
  .convert-button,
  .close-button {
    transition: none;
  }

  .cancel-button:active,
  .submit-button:active,
  .convert-button:active,
  .close-button:active {
    transform: none;
  }

  .loading-spinner {
    animation: none;
  }
}
</style>
/* Screen reader only text */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
