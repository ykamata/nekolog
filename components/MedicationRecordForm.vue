<script setup lang="ts">
import { z } from 'zod';
import DateTimePicker from './DateTimePicker.vue';
import MedicationStatusBadge from './MedicationStatusBadge.vue';
import type {
  MedicationRecord,
  MedicationRecordInput,
  Medication,
} from '~/types/medication';

import { MedicationStatus } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';
import { MedicationRecordInputSchema } from '~/lib/validations/medication';
import { createUnifiedErrorHandler } from '~/utils/error-handling';

interface Props {
  medicationRecord?: MedicationRecord;
  isOpen: boolean;
  cats: Cat[];
  medications: Medication[];
  selectedCatId?: number; // Add support for pre-selected cat
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', medicationRecord: MedicationRecordInput): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const formData = reactive<MedicationRecordInput>({
  catId: 0,
  medicationId: 0,
  quantity: 1,
  administeredAt: new Date(),
  status: 'ADMINISTERED' as MedicationStatus,
  notes: '',
});

// Multiple doses state
const isMultipleDoses = ref(false);
const multipleDosesData = reactive({
  morning: { enabled: false, time: '08:00', quantity: 1 },
  afternoon: { enabled: false, time: '14:00', quantity: 1 },
  evening: { enabled: false, time: '20:00', quantity: 1 },
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

// 統一エラーハンドラーの初期化
const errorHandler = createUnifiedErrorHandler('MedicationRecordForm', {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
});

// Initialize form data when medicationRecord prop changes
watch(
  () => props.medicationRecord,
  (medicationRecord) => {
    if (medicationRecord) {
      formData.catId = medicationRecord.catId;
      formData.medicationId = medicationRecord.medicationId;
      formData.quantity = medicationRecord.quantity;
      formData.administeredAt = new Date(medicationRecord.administeredAt);
      formData.status = medicationRecord.status;
      formData.notes = medicationRecord.notes || '';
    }
    else {
      // Reset form for new medication record
      formData.catId = props.selectedCatId || 0;
      formData.medicationId = 0;
      formData.quantity = 1;
      formData.administeredAt = new Date();
      formData.status = 'ADMINISTERED' as MedicationStatus;
      formData.notes = '';
    }
    errors.value = {};
  },
  { immediate: true },
);

// Watch for selectedCatId changes when not in edit mode
watch(
  () => props.selectedCatId,
  (newCatId) => {
    if (!props.medicationRecord && newCatId !== formData.catId) {
      formData.catId = newCatId || 0;
    }
  },
);

// Computed properties
const isEditMode = computed(() => !!props.medicationRecord);
const formTitle = computed(() =>
  isEditMode.value ? '投与記録を編集' : '新しい投与記録を追加',
);

// Medication status options
const medicationStatusOptions = [
  { value: 'ADMINISTERED', label: '投与済み' },
  { value: 'PENDING', label: '投与予定' },
  { value: 'SKIPPED', label: 'スキップ' },
  { value: 'MISSED', label: '投与忘れ' },
];

// Computed options for dropdowns
const catOptions = computed(() =>
  props.cats.map(cat => ({ value: cat.id, label: cat.name })),
);

const medicationOptions = computed(() =>
  props.medications.map(medication => ({
    value: medication.id,
    label: `${medication.name} (${formatMedicationType(medication.type)})`,
  })),
);

// Helper functions
const getTimePeriodLabel = (period: string): string => {
  const labels = {
    morning: '朝',
    afternoon: '昼',
    evening: '夜',
  };
  return labels[period as keyof typeof labels] || period;
};

// Methods
const validateForm = (): boolean => {
  errors.value = {};

  try {
    MedicationRecordInputSchema.parse(formData);
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
    if (isMultipleDoses.value) {
      // Create multiple records for different time periods
      const records: MedicationRecordInput[] = [];
      const baseDate = new Date(formData.administeredAt);

      Object.entries(multipleDosesData).forEach(([period, data]) => {
        if (data.enabled) {
          const [hours, minutes] = data.time.split(':').map(Number);
          const recordDate = new Date(baseDate);
          recordDate.setHours(hours || 0, minutes || 0, 0, 0);

          records.push({
            catId: formData.catId,
            medicationId: formData.medicationId,
            quantity: data.quantity,
            administeredAt: recordDate,
            status: formData.status,
            notes: formData.notes || undefined,
          });
        }
      });

      // Emit multiple records
      for (const record of records) {
        emit('save', record);
      }
    }
    else {
      // Single record mode
      const cleanedData: MedicationRecordInput = {
        catId: formData.catId,
        medicationId: formData.medicationId,
        quantity: formData.quantity,
        administeredAt: formData.administeredAt,
        status: formData.status,
        notes: formData.notes || undefined,
      };
      emit('save', cleanedData);
    }
  }
  finally {
    isSubmitting.value = false;
  }
};

const handleClose = () => {
  emit('close');
};

const handleReset = () => {
  if (props.medicationRecord) {
    formData.catId = props.medicationRecord.catId;
    formData.medicationId = props.medicationRecord.medicationId;
    formData.quantity = props.medicationRecord.quantity;
    formData.administeredAt = new Date(props.medicationRecord.administeredAt);
    formData.status = props.medicationRecord.status;
    formData.notes = props.medicationRecord.notes || '';
  }
  else {
    formData.catId = props.selectedCatId || 0;
    formData.medicationId = 0;
    formData.quantity = 1;
    formData.administeredAt = new Date();
    formData.status = 'ADMINISTERED' as MedicationStatus;
    formData.notes = '';
  }
  errors.value = {};
};

const handleDateTimeChange = (date: Date) => {
  formData.administeredAt = date;
};

// Format medication type display
const formatMedicationType = (type: string): string => {
  const typeMap: Record<string, string> = {
    MEDICINE: '薬',
    SUPPLEMENT: 'サプリメント',
    VITAMIN: 'ビタミン',
  };
  return typeMap[type] || type;
};

// Get selected cat name for display
const selectedCatName = computed(() => {
  const cat = props.cats.find(c => c.id === formData.catId);
  return cat?.name || '';
});

// Get selected medication name for display
const selectedMedicationName = computed(() => {
  const medication = props.medications.find(
    m => m.id === formData.medicationId,
  );
  return medication?.name || '';
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
        class="medication-record-form"
        @submit.prevent="handleSubmit"
      >
        <div class="form-group">
          <label
            for="cat-select"
            class="form-label"
          >
            猫 <span class="required">*</span>
          </label>
          <select
            id="cat-select"
            v-model="formData.catId"
            class="form-input"
            :class="{ 'form-input--error': errors.catId }"
          >
            <option value="">
              猫を選択してください
            </option>
            <option
              v-for="option in catOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <span
            v-if="errors.catId"
            class="form-error"
          >{{ errors.catId }}</span>
        </div>

        <div class="form-group">
          <label
            for="medication-select"
            class="form-label"
          >
            薬 <span class="required">*</span>
          </label>
          <select
            id="medication-select"
            v-model="formData.medicationId"
            class="form-input"
            :class="{ 'form-input--error': errors.medicationId }"
          >
            <option value="">
              薬を選択してください
            </option>
            <option
              v-for="option in medicationOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <span
            v-if="errors.medicationId"
            class="form-error"
          >{{
            errors.medicationId
          }}</span>
        </div>

        <div class="form-group">
          <label
            for="quantity-input"
            class="form-label"
          >
            投与個数 <span class="required">*</span>
          </label>
          <input
            v-if="!isMultipleDoses"
            id="quantity-input"
            v-model.number="formData.quantity"
            type="number"
            min="1"
            max="100"
            class="form-input"
            :class="{ 'form-input--error': errors.quantity }"
            placeholder="投与個数を入力してください"
          >
          <span
            v-if="errors.quantity"
            class="form-error"
          >{{
            errors.quantity
          }}</span>
        </div>

        <!-- Multiple Doses Toggle -->
        <div class="form-group">
          <label class="form-label">
            投与回数
          </label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input
                v-model="isMultipleDoses"
                type="checkbox"
                class="checkbox-input"
              >
              1日に複数回投与する
            </label>
          </div>
        </div>

        <!-- Multiple Doses Configuration -->
        <div
          v-if="isMultipleDoses"
          class="form-group multiple-doses-config"
        >
          <label class="form-label">
            投与時間設定
          </label>
          <div class="time-periods">
            <div
              v-for="(period, key) in multipleDosesData"
              :key="key"
              class="time-period-config"
            >
              <label class="checkbox-label">
                <input
                  v-model="period.enabled"
                  type="checkbox"
                  class="checkbox-input"
                >
                {{ getTimePeriodLabel(key) }}
              </label>
              <div
                v-if="period.enabled"
                class="time-config"
              >
                <input
                  v-model="period.time"
                  type="time"
                  class="form-input time-input"
                >
                <input
                  v-model.number="period.quantity"
                  type="number"
                  min="1"
                  max="100"
                  class="form-input quantity-input"
                  placeholder="個数"
                >
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            投与日時 <span class="required">*</span>
          </label>
          <DateTimePicker
            :value="formData.administeredAt"
            @change="handleDateTimeChange"
          />
          <span
            v-if="errors.administeredAt"
            class="form-error"
          >{{
            errors.administeredAt
          }}</span>
        </div>

        <div class="form-group">
          <label
            for="status-select"
            class="form-label"
          > ステータス </label>
          <div class="flex items-center gap-3">
            <select
              id="status-select"
              v-model="formData.status"
              class="form-input flex-1"
              :class="{ 'form-input--error': errors.status }"
            >
              <option
                v-for="option in medicationStatusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <MedicationStatusBadge
              :status="formData.status || MedicationStatus.PENDING"
              size="md"
            />
          </div>
          <span
            v-if="errors.status"
            class="form-error"
          >{{
            errors.status
          }}</span>
        </div>

        <div class="form-group">
          <label
            for="notes-textarea"
            class="form-label"
          >メモ</label>
          <textarea
            id="notes-textarea"
            v-model="formData.notes"
            class="form-input"
            :class="{ 'form-input--error': errors.notes }"
            placeholder="投与に関するメモがあれば入力してください"
            rows="3"
            maxlength="500"
          />
          <span
            v-if="errors.notes"
            class="form-error"
          >{{ errors.notes }}</span>
        </div>

        <!-- Summary Section -->
        <div
          v-if="selectedCatName && selectedMedicationName"
          class="form-summary"
        >
          <h3 class="summary-title">
            投与記録の確認
          </h3>
          <div class="summary-content">
            <div class="summary-item">
              <span class="summary-label">猫:</span>
              <span class="summary-value">{{ selectedCatName }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">薬:</span>
              <span class="summary-value">{{ selectedMedicationName }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">個数:</span>
              <span class="summary-value">{{ formData.quantity }}個</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">日時:</span>
              <span class="summary-value">
                {{
                  new Intl.DateTimeFormat("ja-JP", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    weekday: "short",
                  }).format(formData.administeredAt)
                }}
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">ステータス:</span>
              <span class="summary-value">
                {{
                  medicationStatusOptions.find(
                    (opt) => opt.value === formData.status,
                  )?.label
                }}
              </span>
            </div>
          </div>
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

.medication-record-form {
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

.form-summary {
  margin: 2rem 0;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.summary-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-weight: 500;
  color: #666;
}

.summary-value {
  color: #333;
  font-weight: 500;
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
  .medication-record-form {
    padding: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}

.checkbox-group {
  @apply mt-2;
}

.checkbox-label {
  @apply flex items-center space-x-2 text-sm;
}

.checkbox-input {
  @apply w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500;
}

.multiple-doses-config {
  @apply border border-gray-200 rounded-lg p-4 bg-gray-50;
}

.time-periods {
  @apply space-y-3;
}

.time-period-config {
  @apply space-y-2;
}

.time-config {
  @apply flex items-center space-x-3 ml-6;
}

.time-input {
  @apply w-32;
}

.quantity-input {
  @apply w-20;
}
</style>
