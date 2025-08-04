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
import { parseApiError, formatValidationErrors, createDebouncedValidator, isRetryableError, errorInfoToApiError } from '~/utils/error-handling';
import { useToast } from '~/composables/useToast';

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
  doctorName: undefined,
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

// Validation
const debouncedValidator = createDebouncedValidator((data: CreateVeterinaryAppointmentInput) => {
  VeterinaryAppointmentFormSchema.parse(data);
}, 300);

// Toast
const toast = useToast();

// Computed
const isEditMode = computed(() => !!props.appointment);
const modalTitle = computed(() => isEditMode.value ? '予約を編集' : '新しい予約を作成');

const selectedCat = computed(() => {
  return props.cats.find(cat => cat.id === formData.catId);
});

const canConvertToVisit = computed(() => {
  return isEditMode.value && props.appointment && new Date(props.appointment.appointmentDate) < new Date();
});

// Methods
const initializeForm = () => {
  if (props.appointment) {
    // Edit mode - populate with existing data
    Object.assign(formData, {
      catId: props.appointment.catId,
      appointmentDate: new Date(props.appointment.appointmentDate),
      hospitalName: props.appointment.hospital.name,
      doctorName: props.appointment.doctor?.name || '',
      plannedTreatments: props.appointment.plannedTreatments || '',
      notes: props.appointment.notes || '',
    });
  }
  else if (props.initialData) {
    // New appointment with initial data
    Object.assign(formData, {
      catId: props.initialData.catId || '',
      appointmentDate: props.initialData.appointmentDate || new Date(),
      hospitalName: props.initialData.hospitalName || '',
      doctorName: props.initialData.doctorName || undefined,
      plannedTreatments: props.initialData.plannedTreatments || '',
      notes: props.initialData.notes || '',
    });
  }
  else {
    // New appointment - reset to defaults
    Object.assign(formData, {
      catId: props.cats.length === 1 ? props.cats[0]?.id || '' : '',
      appointmentDate: new Date(),
      hospitalName: '',
      doctorName: undefined,
      plannedTreatments: '',
      notes: '',
    });
  }

  // Clear errors
  errors.value = {};
  submitError.value = '';
  retryCount.value = 0;
};

const fetchMasterData = async () => {
  try {
    const [hospitalsResponse, doctorsResponse] = await Promise.all([
      $fetch<VeterinaryHospital[]>('/api/veterinary-hospitals'),
      $fetch<VeterinaryDoctor[]>('/api/veterinary-doctors'),
    ]);

    hospitals.value = hospitalsResponse;
    doctors.value = doctorsResponse;
  }
  catch (error) {
    console.error('Failed to fetch master data:', error);
    toast.error({ message: 'マスタデータの取得に失敗しました' });
  }
};

const handleHospitalCreate = async (name: string) => {
  loadingHospitals.value = true;
  try {
    const newHospital = await $fetch<VeterinaryHospital>('/api/veterinary-hospitals', {
      method: 'POST',
      body: { name },
    });

    hospitals.value.push(newHospital);
    formData.hospitalName = name;
    toast.success({ message: '病院を追加しました' });
  }
  catch (error) {
    console.error('Failed to create hospital:', error);
    toast.error({ message: '病院の追加に失敗しました' });
  }
  finally {
    loadingHospitals.value = false;
  }
};

const handleDoctorCreate = async (name: string) => {
  loadingDoctors.value = true;
  try {
    const newDoctor = await $fetch<VeterinaryDoctor>('/api/veterinary-doctors', {
      method: 'POST',
      body: { name },
    });

    doctors.value.push(newDoctor);
    formData.doctorName = name;
    toast.success({ message: '先生を追加しました' });
  }
  catch (error) {
    console.error('Failed to create doctor:', error);
    toast.error({ message: '先生の追加に失敗しました' });
  }
  finally {
    loadingDoctors.value = false;
  }
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

const handleSubmit = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  submitError.value = '';

  try {
    // Validate form
    const validatedData = VeterinaryAppointmentFormSchema.parse(formData);

    // Emit save event
    emit('save', validatedData);

    toast.success({
      message: isEditMode.value ? '予約を更新しました' : '予約を作成しました',
    });

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

const handleConvertToVisit = () => {
  if (props.appointment) {
    emit('convertToVisit', props.appointment.id);
  }
};

const handleClose = () => {
  if (isSubmitting.value) return;
  emit('close');
};

// Watchers
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    initializeForm();
    fetchMasterData();
  }
});

// Field validation watchers
watch(() => formData.catId, () => validateField('catId'));
watch(() => formData.appointmentDate, () => validateField('appointmentDate'));
watch(() => formData.hospitalName, () => validateField('hospitalName'));

// Initialize on mount
onMounted(() => {
  if (props.isOpen) {
    initializeForm();
    fetchMasterData();
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
        class="appointment-form"
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
            @change="formData.appointmentDate = $event"
          />
          <div
            v-if="errors.appointmentDate"
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
            required
            @create="handleHospitalCreate"
          />
          <div
            v-if="errors.hospitalName"
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
            @update:model-value="formData.doctorName = $event"
            @create="handleDoctorCreate"
          />
          <div
            v-if="errors.doctorName"
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
            rows="3"
          />
          <div
            v-if="errors.plannedTreatments"
            class="form-error"
            data-testid="planned-treatments-error"
          >
            {{ errors.plannedTreatments }}
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label
            for="notes"
            class="form-label"
          >
            メモ
          </label>
          <textarea
            id="notes"
            v-model="formData.notes"
            class="form-textarea"
            :class="{ 'form-textarea--error': errors.notes }"
            :disabled="isSubmitting"
            placeholder="その他のメモがあれば入力してください"
            data-testid="notes"
            rows="3"
          />
          <div
            v-if="errors.notes"
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
              {{ isEditMode ? '更新' : '作成' }}
            </button>
          </div>
        </div>
      </form>
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
