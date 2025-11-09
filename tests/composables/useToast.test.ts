import { describe, it, expect, beforeEach } from 'vitest';
import { useToast } from '~/composables/useToast';

describe('useToast', () => {
  beforeEach(() => {
    // Clear toasts before each test
    const { clearAllToasts } = useToast();
    clearAllToasts();
  });

  it('should add toast with default values', () => {
    const { addToast, toasts } = useToast();

    const id = addToast('success', { message: 'Test message' });

    expect(toasts.value).toHaveLength(1);
    expect(toasts.value[0]).toMatchObject({
      id,
      type: 'success',
      title: '成功',
      message: 'Test message',
      duration: 3000,
    });
  });

  it('should add toast with custom options', () => {
    const { addToast, toasts } = useToast();

    const customAction = {
      label: 'Custom Action',
      handler: () => {},
    };

    const id = addToast('error', {
      title: 'Custom Title',
      message: 'Custom message',
      duration: 5000,
      action: customAction,
    });

    expect(toasts.value).toHaveLength(1);
    expect(toasts.value[0]).toMatchObject({
      id,
      type: 'error',
      title: 'Custom Title',
      message: 'Custom message',
      duration: 5000,
      action: customAction,
    });
  });

  it('should remove toast by id', () => {
    const { addToast, removeToast, toasts } = useToast();

    const id1 = addToast('success', { message: 'Message 1' });
    const id2 = addToast('error', { message: 'Message 2' });

    expect(toasts.value).toHaveLength(2);

    removeToast(id1);

    expect(toasts.value).toHaveLength(1);
    expect(toasts.value[0].id).toBe(id2);
  });

  it('should clear all toasts', () => {
    const { addToast, clearAllToasts, toasts } = useToast();

    addToast('success', { message: 'Message 1' });
    addToast('error', { message: 'Message 2' });
    addToast('warning', { message: 'Message 3' });

    expect(toasts.value).toHaveLength(3);

    clearAllToasts();

    expect(toasts.value).toHaveLength(0);
  });

  it('should provide convenience methods', () => {
    const { success, error, warning, info, toasts } = useToast();

    success({ message: 'Success message' });
    error({ message: 'Error message' });
    warning({ message: 'Warning message' });
    info({ message: 'Info message' });

    expect(toasts.value).toHaveLength(4);
    expect(toasts.value[0].type).toBe('success');
    expect(toasts.value[1].type).toBe('error');
    expect(toasts.value[2].type).toBe('warning');
    expect(toasts.value[3].type).toBe('info');
  });

  it('should generate unique ids', () => {
    const { addToast } = useToast();

    const id1 = addToast('success', { message: 'Message 1' });
    const id2 = addToast('success', { message: 'Message 2' });

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^toast-\d+-[a-z0-9]+$/);
    expect(id2).toMatch(/^toast-\d+-[a-z0-9]+$/);
  });

  it('should use default titles for different types', () => {
    const { success, error, warning, info, toasts } = useToast();

    success({ message: 'Success' });
    error({ message: 'Error' });
    warning({ message: 'Warning' });
    info({ message: 'Info' });

    expect(toasts.value[0].title).toBe('成功');
    expect(toasts.value[1].title).toBe('エラー');
    expect(toasts.value[2].title).toBe('警告');
    expect(toasts.value[3].title).toBe('情報');
  });

  it('should use default durations for different types', () => {
    const { success, error, warning, info, toasts } = useToast();

    success({ message: 'Success' });
    error({ message: 'Error' });
    warning({ message: 'Warning' });
    info({ message: 'Info' });

    expect(toasts.value[0].duration).toBe(3000);
    expect(toasts.value[1].duration).toBe(5000);
    expect(toasts.value[2].duration).toBe(4000);
    expect(toasts.value[3].duration).toBe(3000);
  });

  it('should handle empty message', () => {
    const { addToast, toasts } = useToast();

    const id = addToast('success', { title: 'Only title' });

    expect(toasts.value[0]).toMatchObject({
      id,
      title: 'Only title',
      message: '',
    });
  });

  it('should not remove non-existent toast', () => {
    const { addToast, removeToast, toasts } = useToast();

    addToast('success', { message: 'Message' });
    expect(toasts.value).toHaveLength(1);

    removeToast(999999);
    expect(toasts.value).toHaveLength(1);
  });
});
