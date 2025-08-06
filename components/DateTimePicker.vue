<script setup lang="ts">
interface Props {
  value: Date;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
}

interface Emits {
  (e: 'change', value: Date): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<Emits>();

// 日付と時刻を分離して管理
const dateValue = computed({
  get: () => {
    const date = new Date(props.value);
    return date.toISOString().split('T')[0];
  },
  set: (value: string) => {
    const currentTime = props.value.toTimeString().split(' ')[0];
    const newDate = new Date(`${value}T${currentTime}`);
    emit('change', newDate);
  },
});

const timeValue = computed({
  get: () => {
    const date = new Date(props.value);
    return date.toTimeString().slice(0, 5);
  },
  set: (value: string) => {
    const currentDate = props.value.toISOString().split('T')[0];
    const newDate = new Date(`${currentDate}T${value}:00`);
    emit('change', newDate);
  },
});

const minDateString = computed(() => {
  return props.minDate ? props.minDate.toISOString().split('T')[0] : undefined;
});

const maxDateString = computed(() => {
  return props.maxDate ? props.maxDate.toISOString().split('T')[0] : undefined;
});
</script>

<template>
  <div class="datetime-picker">
    <div class="datetime-inputs">
      <input
        :id="id"
        v-model="dateValue"
        type="date"
        class="date-input"
        :disabled="disabled"
        :min="minDateString"
        :max="maxDateString"
        data-testid="date-input"
      >
      <input
        v-model="timeValue"
        type="time"
        class="time-input"
        :disabled="disabled"
        data-testid="time-input"
      >
    </div>
  </div>
</template>

<style scoped>
.datetime-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.datetime-inputs {
  display: flex;
  gap: 0.5rem;
}

.date-input,
.time-input {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.date-input:focus,
.time-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.date-input:disabled,
.time-input:disabled {
  background: #f8f8f8;
  opacity: 0.6;
  cursor: not-allowed;
}

.date-input {
  flex: 1;
}

.time-input {
  width: 120px;
}

@media (max-width: 768px) {
  .datetime-inputs {
    flex-direction: column;
  }

  .time-input {
    width: 100%;
  }
}
</style>
