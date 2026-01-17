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
// JSTでの日時を正しく扱うため、ローカルタイムゾーンとして処理
const dateValue = computed({
  get: () => {
    const date = new Date(props.value);
    // ローカルタイムゾーン（JST）での日付を取得
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  set: (value: string) => {
    // 現在の時刻を維持しながら日付のみ変更
    const currentDate = new Date(props.value);
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(p => isNaN(p))) return;

    const [year, month, day] = parts as [number, number, number];
    const newDate = new Date(
      year,
      month - 1,
      day,
      currentDate.getHours(),
      currentDate.getMinutes(),
      currentDate.getSeconds(),
      currentDate.getMilliseconds(),
    );
    emit('change', newDate);
  },
});

const timeValue = computed({
  get: () => {
    const date = new Date(props.value);
    // ローカルタイムゾーン（JST）での時刻を取得
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },
  set: (value: string) => {
    // 現在の日付を維持しながら時刻のみ変更
    const currentDate = new Date(props.value);
    const parts = value.split(':').map(Number);
    if (parts.length !== 2 || parts.some(p => isNaN(p))) return;

    const [hours, minutes] = parts as [number, number];
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      hours,
      minutes,
      0,
      0,
    );
    emit('change', newDate);
  },
});

const minDateString = computed(() => {
  if (!props.minDate) return undefined;
  const date = new Date(props.minDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const maxDateString = computed(() => {
  if (!props.maxDate) return undefined;
  const date = new Date(props.maxDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
