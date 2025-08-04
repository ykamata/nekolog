<script setup lang="ts">
interface Props {
  value: Date;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
  ariaRequired?: string;
}

interface Emits {
  (e: 'change', value: Date): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<Emits>();

const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const newDate = new Date(target.value);
  emit('change', newDate);
};
</script>

<template>
  <input
    :id="id"
    type="datetime-local"
    :value="formatDateTimeLocal(value)"
    :disabled="disabled"
    :min="minDate ? formatDateTimeLocal(minDate) : undefined"
    :max="maxDate ? formatDateTimeLocal(maxDate) : undefined"
    :aria-required="ariaRequired"
    class="datetime-picker"
    @change="handleChange"
  >
</template>

<style scoped>
.datetime-picker {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.datetime-picker:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.datetime-picker:disabled {
  background: #f8f8f8;
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
