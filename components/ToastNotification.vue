<script setup lang="ts">
interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface Props {
  toast: Toast;
}

interface Emits {
  (e: 'close', id: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isVisible = ref(true);
const timeoutId = ref<NodeJS.Timeout | null>(null);

// Auto-close timer
const startAutoClose = () => {
  if (props.toast.duration && props.toast.duration > 0) {
    timeoutId.value = setTimeout(() => {
      handleClose();
    }, props.toast.duration);
  }
};

// Handle close
const handleClose = () => {
  if (timeoutId.value) {
    clearTimeout(timeoutId.value);
    timeoutId.value = null;
  }
  isVisible.value = false;

  // Wait for animation to complete before emitting close
  setTimeout(() => {
    emit('close', props.toast.id);
  }, 300);
};

// Handle action click
const handleAction = () => {
  if (props.toast.action) {
    props.toast.action.handler();
  }
  handleClose();
};

// Pause auto-close on hover
const pauseAutoClose = () => {
  if (timeoutId.value) {
    clearTimeout(timeoutId.value);
    timeoutId.value = null;
  }
};

// Resume auto-close on mouse leave
const resumeAutoClose = () => {
  startAutoClose();
};

// Computed properties
const toastClasses = computed(() => [
  'toast',
  `toast--${props.toast.type}`,
  { 'toast--visible': isVisible.value },
]);

const iconPath = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return 'M5 13l4 4L19 7';
    case 'error':
      return 'M6 18L18 6M6 6l12 12';
    case 'warning':
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
    case 'info':
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    default:
      return '';
  }
});

// Lifecycle
onMounted(() => {
  startAutoClose();
});

onUnmounted(() => {
  if (timeoutId.value) {
    clearTimeout(timeoutId.value);
  }
});
</script>

<template>
  <div
    :class="toastClasses"
    @mouseenter="pauseAutoClose"
    @mouseleave="resumeAutoClose"
  >
    <div class="toast-content">
      <div class="toast-icon">
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            :d="iconPath"
          />
        </svg>
      </div>

      <div class="toast-body">
        <div class="toast-title">
          {{ toast.title }}
        </div>
        <div
          v-if="toast.message"
          class="toast-message"
        >
          {{ toast.message }}
        </div>
      </div>

      <div class="toast-actions">
        <button
          v-if="toast.action"
          class="toast-action-btn"
          @click="handleAction"
        >
          {{ toast.action.label }}
        </button>

        <button
          class="toast-close-btn"
          @click="handleClose"
        >
          <svg
            class="w-4 h-4"
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
  </div>
</template>

<style scoped>
.toast {
  position: relative;
  min-width: 300px;
  max-width: 500px;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 4px solid;
  opacity: 0;
  transform: translateX(100%);
  transition: all 0.3s ease-in-out;
}

.toast--visible {
  opacity: 1;
  transform: translateX(0);
}

.toast--success {
  border-left-color: #4caf50;
}

.toast--error {
  border-left-color: #f44336;
}

.toast--warning {
  border-left-color: #ff9800;
}

.toast--info {
  border-left-color: #2196f3;
}

.toast-content {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  gap: 0.75rem;
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.toast--success .toast-icon {
  color: #4caf50;
}

.toast--error .toast-icon {
  color: #f44336;
}

.toast--warning .toast-icon {
  color: #ff9800;
}

.toast--info .toast-icon {
  color: #2196f3;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.toast-message {
  font-size: 0.875rem;
  color: #666;
  line-height: 1.4;
  word-wrap: break-word;
}

.toast-actions {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-shrink: 0;
}

.toast-action-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toast--success .toast-action-btn {
  background-color: #4caf50;
  color: white;
}

.toast--success .toast-action-btn:hover {
  background-color: #388e3c;
}

.toast--error .toast-action-btn {
  background-color: #f44336;
  color: white;
}

.toast--error .toast-action-btn:hover {
  background-color: #d32f2f;
}

.toast--warning .toast-action-btn {
  background-color: #ff9800;
  color: white;
}

.toast--warning .toast-action-btn:hover {
  background-color: #f57c00;
}

.toast--info .toast-action-btn {
  background-color: #2196f3;
  color: white;
}

.toast--info .toast-action-btn:hover {
  background-color: #1976d2;
}

.toast-close-btn {
  padding: 0.25rem;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
}

.toast-close-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .toast {
    min-width: 280px;
    max-width: calc(100vw - 2rem);
  }

  .toast-content {
    padding: 0.75rem;
  }

  .toast-title {
    font-size: 0.9rem;
  }

  .toast-message {
    font-size: 0.8rem;
  }
}
</style>
