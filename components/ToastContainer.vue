<script setup lang="ts">
import ToastNotification from './ToastNotification.vue';
import { useToast } from '~/composables/useToast';

const { toasts, removeToast } = useToast();

const handleToastClose = (id: string) => {
  removeToast(id);
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="toasts.length > 0"
      class="toast-container"
    >
      <TransitionGroup
        name="toast"
        tag="div"
        class="toast-list"
      >
        <ToastNotification
          v-for="toast in toasts"
          :key="toast.id"
          :toast="toast"
          @close="handleToastClose"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.toast-list > * {
  pointer-events: auto;
}

/* Toast transition animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .toast-container {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
  }

  .toast-list {
    align-items: stretch;
  }
}
</style>
