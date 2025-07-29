/**
 * Toast notification composable
 */

import { ref, readonly } from 'vue';

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

interface ToastOptions {
  title?: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

const toasts = ref<Toast[]>([]);

export function useToast() {
  const addToast = (type: Toast['type'], options: ToastOptions): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const toast: Toast = {
      id,
      type,
      title: options.title || getDefaultTitle(type),
      message: options.message || '',
      duration: options.duration ?? getDefaultDuration(type),
      action: options.action,
    };

    toasts.value.push(toast);
    return id;
  };

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  const clearAllToasts = () => {
    toasts.value = [];
  };

  // Convenience methods
  const success = (options: ToastOptions) => addToast('success', options);
  const error = (options: ToastOptions) => addToast('error', options);
  const warning = (options: ToastOptions) => addToast('warning', options);
  const info = (options: ToastOptions) => addToast('info', options);

  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };
}

function getDefaultTitle(type: Toast['type']): string {
  switch (type) {
    case 'success':
      return '成功';
    case 'error':
      return 'エラー';
    case 'warning':
      return '警告';
    case 'info':
      return '情報';
    default:
      return '通知';
  }
}

function getDefaultDuration(type: Toast['type']): number {
  switch (type) {
    case 'success':
      return 3000;
    case 'error':
      return 5000;
    case 'warning':
      return 4000;
    case 'info':
      return 3000;
    default:
      return 3000;
  }
}
