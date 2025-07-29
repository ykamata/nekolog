<script setup lang="ts">
interface Props {
  value: Date;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
}

interface Emits {
  (e: 'change', date: Date): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showTime: true,
});

const emit = defineEmits<Emits>();

// Format date for input[type="datetime-local"]
const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (props.showTime) {
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  else {
    return `${year}-${month}-${day}`;
  }
};

// Format date for input[type="date"]
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format time for input[type="time"]
const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Computed values
const dateValue = computed(() => formatDate(props.value));
const timeValue = computed(() => formatTime(props.value));
const dateTimeValue = computed(() => formatDateTimeLocal(props.value));

const minDateString = computed(() =>
  props.minDate ? formatDate(props.minDate) : undefined,
);

const maxDateString = computed(() =>
  props.maxDate ? formatDate(props.maxDate) : undefined,
);

// Quick date options
const quickDateOptions = computed(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return [
    {
      label: '今',
      value: now,
      description: '現在の日時',
    },
    {
      label: '今日',
      value: new Date(
        today.getTime()
        + now.getHours() * 60 * 60 * 1000
        + now.getMinutes() * 60 * 1000,
      ),
      description: '今日の現在時刻',
    },
    {
      label: '朝食',
      value: new Date(today.getTime() + 7 * 60 * 60 * 1000), // 7:00 AM
      description: '今日の7:00',
    },
    {
      label: '昼食',
      value: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12:00 PM
      description: '今日の12:00',
    },
    {
      label: '夕食',
      value: new Date(today.getTime() + 18 * 60 * 60 * 1000), // 6:00 PM
      description: '今日の18:00',
    },
  ];
});

// State
const inputMode = ref<'combined' | 'separate'>('combined');

// Methods
const handleDateTimeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const dateTime = new Date(target.value);

  if (!Number.isNaN(dateTime.getTime())) {
    emit('change', dateTime);
  }
};

const handleDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const dateStr = target.value;

  if (dateStr) {
    const newDate = new Date(props.value);
    const [year, month, day] = dateStr.split('-').map(Number);
    if (year && month && day) {
      newDate.setFullYear(year, month - 1, day);
      emit('change', newDate);
    }
  }
};

const handleTimeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const timeStr = target.value;

  if (timeStr) {
    const newDate = new Date(props.value);
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (hours !== undefined && minutes !== undefined) {
      newDate.setHours(hours, minutes);
      emit('change', newDate);
    }
  }
};

const handleQuickSelect = (date: Date) => {
  emit('change', new Date(date));
};

const toggleInputMode = () => {
  inputMode.value = inputMode.value === 'combined' ? 'separate' : 'combined';
};

// Format display date
const formatDisplayDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).format(date);
};
</script>

<template>
  <div class="datetime-picker">
    <!-- Current Selection Display -->
    <div class="current-selection">
      <div class="selected-datetime">
        {{ formatDisplayDate(value) }}
      </div>
      <button
        type="button"
        class="mode-toggle"
        :disabled="disabled"
        @click="toggleInputMode"
      >
        {{ inputMode === "combined" ? "個別入力" : "統合入力" }}
      </button>
    </div>

    <!-- Quick Selection Buttons -->
    <div class="quick-options">
      <button
        v-for="option in quickDateOptions"
        :key="option.label"
        type="button"
        class="quick-button"
        :disabled="disabled"
        :title="option.description"
        @click="handleQuickSelect(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Input Controls -->
    <div class="input-controls">
      <!-- Combined DateTime Input -->
      <div
        v-if="inputMode === 'combined'"
        class="combined-input"
      >
        <label class="input-label">日時</label>
        <input
          :value="dateTimeValue"
          type="datetime-local"
          class="datetime-input"
          :disabled="disabled"
          :min="minDateString ? `${minDateString}T00:00` : undefined"
          :max="maxDateString ? `${maxDateString}T23:59` : undefined"
          @change="handleDateTimeChange"
        >
      </div>

      <!-- Separate Date and Time Inputs -->
      <div
        v-else
        class="separate-inputs"
      >
        <div class="date-input-group">
          <label class="input-label">日付</label>
          <input
            :value="dateValue"
            type="date"
            class="date-input"
            :disabled="disabled"
            :min="minDateString"
            :max="maxDateString"
            @change="handleDateChange"
          >
        </div>

        <div
          v-if="showTime"
          class="time-input-group"
        >
          <label class="input-label">時刻</label>
          <input
            :value="timeValue"
            type="time"
            class="time-input"
            :disabled="disabled"
            @change="handleTimeChange"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.datetime-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.current-selection {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.selected-datetime {
  font-weight: 500;
  color: #333;
}

.mode-toggle {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-toggle:hover:not(:disabled) {
  background: #f8f8f8;
  border-color: #cbd5e0;
}

.mode-toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.quick-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-button:hover:not(:disabled) {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.quick-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.combined-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.separate-inputs {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: end;
}

.date-input-group,
.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #666;
}

.datetime-input,
.date-input,
.time-input {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
}

.datetime-input:focus,
.date-input:focus,
.time-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.datetime-input:disabled,
.date-input:disabled,
.time-input:disabled {
  background: #f8f8f8;
  opacity: 0.6;
  cursor: not-allowed;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .current-selection {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .mode-toggle {
    align-self: flex-end;
  }

  .quick-options {
    justify-content: center;
  }

  .quick-button {
    flex: 1;
    min-width: 60px;
  }

  .separate-inputs {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}
</style>
