<script setup lang="ts">
interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface Emits {
  (e: 'confirm' | 'cancel'): void;
}

const _props = withDefaults(defineProps<Props>(), {
  confirmText: '確認',
  cancelText: 'キャンセル',
  type: 'info',
});

const emit = defineEmits<Emits>();

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};

const handleOverlayClick = (event: Event) => {
  if (event.target === event.currentTarget) {
    handleCancel();
  }
};
</script>

<template>
  <div
    v-if="isOpen"
    class="confirmation-overlay"
    @click="handleOverlayClick"
  >
    <div class="confirmation-dialog">
      <div class="confirmation-header">
        <h3 class="confirmation-title">
          {{ title }}
        </h3>
      </div>

      <div class="confirmation-content">
        <p class="confirmation-message">
          {{ message }}
        </p>
      </div>

      <div class="confirmation-actions">
        <button
          type="button"
          class="btn btn--secondary"
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          class="btn"
          :class="{
            'btn--danger': type === 'danger',
            'btn--warning': type === 'warning',
            'btn--primary': type === 'info',
          }"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
}

.confirmation-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

.confirmation-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.confirmation-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
}

.confirmation-content {
  padding: 1rem 1.5rem;
}

.confirmation-message {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.confirmation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem 1.5rem 1.5rem;
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

.btn--warning {
  background-color: #ff9800;
  color: white;
}

.btn--warning:hover:not(:disabled) {
  background-color: #f57c00;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .confirmation-overlay {
    padding: 0.5rem;
  }

  .confirmation-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
