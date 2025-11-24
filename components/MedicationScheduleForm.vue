<script setup lang="ts">
import { z } from 'zod';
import type {
  MedicationSchedule,
  MedicationScheduleInput,
  Medication,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';
import { MedicationScheduleInputSchema } from '~/lib/validations/medication';

interface Props {
  schedule?: MedicationSchedule;
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', schedule: MedicationScheduleInput): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Stores
const catsStore = useCatsStore();
const medicationsStore = useMedicationsStore();

// Form state
const formData = reactive<MedicationScheduleInput>({
  catId: 0,
  medicationId: 0,
  frequency: 'daily',
  times: ['08:00'],
  startDate: new Date(),
  endDate: undefined,
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

// Frequency options
const frequencyOptions = [
  { value: 'daily', label: '毎日', defaultTimes: ['08:00'] },
  { value: 'twice_daily', label: '1日2回', defaultTimes: ['08:00', '20:00'] },
  { value: 'weekly', label: '週1回', defaultTimes: ['08:00'] },
  { value: 'monthly', label: '月1回', defaultTimes: ['08:00'] },
  { value: 'custom', label: 'カスタム', defaultTimes: ['08:00'] },
];

// Computed properties
const isEditMode = computed(() => !!props.schedule);
const formTitle = computed(() =>
  isEditMode.value ? 'スケジュールを編集' : '新しいスケジュールを追加',
);

const cats = computed(() => catsStore.sortedCats);
const medications = computed(() => medicationsStore.sortedMedications);

const selectedFrequency = computed(() =>
  frequencyOptions.find(option => option.value === formData.frequency),
);

// Initialize form data when schedule prop changes
watch(
  () => props.schedule,
  (schedule) => {
    if (schedule) {
      formData.catId = schedule.catId;
      formData.medicationId = schedule.medicationId;
      formData.frequency = schedule.frequency;
      // Ensure times is always an array of strings
      formData.times = Array.isArray(schedule.times)
        ? [...schedule.times]
        : typeof schedule.times === 'string'
          ? JSON.parse(schedule.times)
          : ['08:00'];
      formData.startDate = new Date(schedule.startDate);
      formData.endDate = schedule.endDate ? new Date(schedule.endDate) : undefined;
    }
    else {
      // Reset form for new schedule
      formData.catId = 0;
      formData.medicationId = 0;
      formData.frequency = 'daily';
      formData.times = ['08:00'];
      formData.startDate = new Date();
      formData.endDate = undefined;
    }
    errors.value = {};
  },
  { immediate: true },
);

// Watch frequency changes to update default times
watch(
  () => formData.frequency,
  (newFrequency) => {
    const option = frequencyOptions.find(opt => opt.value === newFrequency);
    if (option && !isEditMode.value) {
      formData.times = [...option.defaultTimes];
    }
  },
);

// Methods
const validateForm = (): boolean => {
  errors.value = {};

  try {
    MedicationScheduleInputSchema.parse(formData);
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
    const cleanedData: MedicationScheduleInput = {
      catId: formData.catId,
      medicationId: formData.medicationId,
      frequency: formData.frequency,
      times: [...formData.times],
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
    };
    emit('save', cleanedData);
  }
  finally {
    isSubmitting.value = false;
  }
};

const handleClose = () => {
  emit('close');
};

const handleReset = () => {
  if (props.schedule) {
    formData.catId = props.schedule.catId;
    formData.medicationId = props.schedule.medicationId;
    formData.frequency = props.schedule.frequency;
    formData.times = [...props.schedule.times];
    formData.startDate = new Date(props.schedule.startDate);
    formData.endDate = props.schedule.endDate ? new Date(props.schedule.endDate) : undefined;
  }
  else {
    formData.catId = 0;
    formData.medicationId = 0;
    formData.frequency = 'daily';
    formData.times = ['08:00'];
    formData.startDate = new Date();
    formData.endDate = undefined;
  }
  errors.value = {};
};

const addTimeSlot = () => {
  if (formData.times.length < 10) {
    formData.times.push('08:00');
  }
};

const removeTimeSlot = (index: number) => {
  if (formData.times.length > 1) {
    formData.times.splice(index, 1);
  }
};

const updateTimeSlot = (index: number, time: string) => {
  formData.times[index] = time;
};

const handleStartDateChange = (date: Date) => {
  formData.startDate = date;
  // If end date is before start date, clear it
  if (formData.endDate && formData.endDate <= date) {
    formData.endDate = undefined;
  }
};

const handleEndDateChange = (date: Date | undefined) => {
  formData.endDate = date;
};

// Load data on mount
onMounted(async () => {
  try {
    await Promise.all([
      catsStore.fetchCats(),
      medicationsStore.fetchMedications(),
    ]);
  }
  catch (error) {
    console.error('Failed to load data:', error);
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
        class="schedule-form"
        @submit.prevent="handleSubmit"
      >
        <!-- Cat Selection -->
        <div class="form-group">
          <label
            for="schedule-cat"
            class="form-label"
          >
            猫 <span class="required">*</span>
          </label>
          <select
            id="schedule-cat"
            v-model="formData.catId"
            class="form-input"
            :class="{ 'form-input--error': errors.catId }"
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
          <span
            v-if="errors.catId"
            class="form-error"
          >{{ errors.catId }}</span>
        </div>

        <!-- Medication Selection -->
        <div class="form-group">
          <label
            for="schedule-medication"
            class="form-label"
          >
            薬 <span class="required">*</span>
          </label>
          <select
            id="schedule-medication"
            v-model="formData.medicationId"
            class="form-input"
            :class="{ 'form-input--error': errors.medicationId }"
          >
            <option value="">
              薬を選択してください
            </option>
            <option
              v-for="medication in medications"
              :key="medication.id"
              :value="medication.id"
            >
              {{ medication.name }} ({{ medication.type }})
            </option>
          </select>
          <span
            v-if="errors.medicationId"
            class="form-error"
          >{{ errors.medicationId }}</span>
        </div>

        <!-- Frequency Selection -->
        <div class="form-group">
          <label
            for="schedule-frequency"
            class="form-label"
          >
            投与頻度 <span class="required">*</span>
          </label>
          <select
            id="schedule-frequency"
            v-model="formData.frequency"
            class="form-input"
            :class="{ 'form-input--error': errors.frequency }"
          >
            <option
              v-for="option in frequencyOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <span
            v-if="errors.frequency"
            class="form-error"
          >{{ errors.frequency }}</span>
        </div>

        <!-- Time Configuration -->
        <div class="form-group">
          <label class="form-label">
            投与時間 <span class="required">*</span>
          </label>
          <div class="time-slots">
            <div
              v-for="(time, index) in formData.times"
              :key="index"
              class="time-slot"
            >
              <input
                :value="time"
                type="time"
                class="form-input time-input"
                :class="{ 'form-input--error': errors.times }"
                @input="updateTimeSlot(index, ($event.target as HTMLInputElement).value)"
              >
              <button
                v-if="formData.times.length > 1"
                type="button"
                class="btn btn--small btn--danger"
                @click="removeTimeSlot(index)"
              >
                削除
              </button>
            </div>
            <button
              v-if="formData.times.length < 10"
              type="button"
              class="btn btn--small btn--secondary"
              @click="addTimeSlot"
            >
              + 時間を追加
            </button>
          </div>
          <span
            v-if="errors.times"
            class="form-error"
          >{{ errors.times }}</span>
        </div>

        <!-- Start Date -->
        <div class="form-group">
          <label class="form-label">
            開始日 <span class="required">*</span>
          </label>
          <DateTimePicker
            :value="formData.startDate"
            :show-time="false"
            @change="handleStartDateChange"
          />
          <span
            v-if="errors.startDate"
            class="form-error"
          >{{ errors.startDate }}</span>
        </div>

        <!-- End Date -->
        <div class="form-group">
          <label class="form-label">終了日</label>
          <div class="end-date-container">
            <label class="checkbox-label">
              <input
                :checked="!formData.endDate"
                type="checkbox"
                @change="formData.endDate = ($event.target as HTMLInputElement)?.checked ? undefined : new Date(formData.startDate.getTime() + 24 * 60 * 60 * 1000)"
              >
              無期限
            </label>
            <DateTimePicker
              v-if="formData.endDate"
              :value="formData.endDate"
              :show-time="false"
              :min-date="new Date(formData.startDate.getTime() + 24 * 60 * 60 * 1000)"
              @change="handleEndDateChange"
            />
          </div>
          <span
            v-if="errors.endDate"
            class="form-error"
          >{{ errors.endDate }}</span>
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
  max-width: 600px;
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

.schedule-form {
  padding: 1.5rem;
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

.time-slots {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.time-slot {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.time-input {
  flex: 1;
  max-width: 150px;
}

.end-date-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
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

.btn--danger {
  background-color: #f44336;
  color: white;
}

.btn--danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

.btn--small {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
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
  .schedule-form {
    padding: 1rem;
  }

  .time-slot {
    flex-direction: column;
    align-items: stretch;
  }

  .time-input {
    max-width: none;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
