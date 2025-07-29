<template>
  <span
    :class="statusClasses"
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
  >
    <span
      v-if="showIcon"
      :class="iconClasses"
      class="w-2 h-2 rounded-full mr-1.5"
    />
    {{ statusText }}
  </span>
</template>

<script setup lang="ts">
import { MedicationStatus } from '~/types/medication';

interface Props {
  status: MedicationStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true,
  size: 'md',
});

const statusConfig = computed(() => {
  switch (props.status) {
    case MedicationStatus.PENDING:
      return {
        text: '予定',
        bgClass: 'bg-yellow-100 text-yellow-800',
        iconClass: 'bg-yellow-400',
      };
    case MedicationStatus.ADMINISTERED:
      return {
        text: '投与済み',
        bgClass: 'bg-green-100 text-green-800',
        iconClass: 'bg-green-400',
      };
    case MedicationStatus.SKIPPED:
      return {
        text: 'スキップ',
        bgClass: 'bg-gray-100 text-gray-800',
        iconClass: 'bg-gray-400',
      };
    case MedicationStatus.MISSED:
      return {
        text: '未投与',
        bgClass: 'bg-red-100 text-red-800',
        iconClass: 'bg-red-400',
      };
    default:
      return {
        text: '不明',
        bgClass: 'bg-gray-100 text-gray-800',
        iconClass: 'bg-gray-400',
      };
  }
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-2 py-0.5 text-xs';
    case 'lg':
      return 'px-3 py-1 text-sm';
    default:
      return 'px-2.5 py-0.5 text-xs';
  }
});

const statusClasses = computed(() => {
  return `${statusConfig.value.bgClass} ${sizeClasses.value}`;
});

const iconClasses = computed(() => {
  return statusConfig.value.iconClass;
});

const statusText = computed(() => {
  return statusConfig.value.text;
});
</script>
