import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmationDialog from '~/components/ConfirmationDialog.vue';

describe('ConfirmationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when isOpen is true', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: 'テストタイトル',
        message: 'テストメッセージ',
      },
    });

    expect(wrapper.find('.confirmation-overlay').exists()).toBe(true);
    expect(wrapper.find('.confirmation-title').text()).toBe('テストタイトル');
    expect(wrapper.find('.confirmation-message').text()).toBe(
      'テストメッセージ',
    );
  });

  it('does not render dialog when isOpen is false', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: false,
        title: 'テストタイトル',
        message: 'テストメッセージ',
      },
    });

    expect(wrapper.find('.confirmation-overlay').exists()).toBe(false);
  });

  it('uses default button texts when not provided', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: 'テストタイトル',
        message: 'テストメッセージ',
      },
    });

    const buttons = wrapper.findAll('.btn');
    expect(buttons[0].text()).toBe('キャンセル');
    expect(buttons[1].text()).toBe('確認');
  });

  it('uses custom button texts when provided', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: 'テストタイトル',
        message: 'テストメッセージ',
        confirmText: '削除',
        cancelText: 'やめる',
      },
    });

    const buttons = wrapper.findAll('.btn');
    expect(buttons[0].text()).toBe('やめる');
    expect(buttons[1].text()).toBe('削除');
  });

  it('applies correct button styles based on type', () => {
    const dangerWrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: '危険な操作',
        message: '本当に削除しますか？',
        type: 'danger',
      },
    });

    const warningWrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: '警告',
        message: '注意が必要です',
        type: 'warning',
      },
    });

    const infoWrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: '情報',
        message: '確認してください',
        type: 'info',
      },
    });

    const dangerConfirmBtn = dangerWrapper.findAll('.btn')[1];
    const warningConfirmBtn = warningWrapper.findAll('.btn')[1];
    const infoConfirmBtn = infoWrapper.findAll('.btn')[1];

    expect(dangerConfirmBtn.classes()).toContain('btn--danger');
    expect(warningConfirmBtn.classes()).toContain('btn--warning');
    expect(infoConfirmBtn.classes()).toContain('btn--primary');
  });

  it('emits confirm event when confirm button is clicked', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: 'テストタイトル',
        message: 'テストメッセージ',
      },
    });

    const confirmBtn = wrapper.findAll('.btn')[1];
    await confirmBtn.trigger('click');

    expect(wrapper.emitted('confirm')).toBeTruthy();
  });

  it('emits cancel event when cancel button is clicked', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: 'テストタイトル',
        message: 'テストメッセージ',
      },
    });

    const cancelBtn = wrapper.findAll('.btn')[0];
    await cancelBtn.trigger('click');

    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('emits cancel event when overlay is clicked', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: 'テストタイトル',
        message: 'テストメッセージ',
      },
    });

    const overlay = wrapper.find('.confirmation-overlay');
    await overlay.trigger('click');

    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('does not emit cancel when dialog content is clicked', async () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: 'テストタイトル',
        message: 'テストメッセージ',
      },
    });

    const dialog = wrapper.find('.confirmation-dialog');
    await dialog.trigger('click');

    expect(wrapper.emitted('cancel')).toBeFalsy();
  });

  it('uses info type as default', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: 'テストタイトル',
        message: 'テストメッセージ',
      },
    });

    const confirmBtn = wrapper.findAll('.btn')[1];
    expect(confirmBtn.classes()).toContain('btn--primary');
  });

  it('renders with proper accessibility attributes', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        isOpen: true,
        title: '重要な確認',
        message: 'この操作は取り消せません。続行しますか？',
      },
    });

    expect(wrapper.find('.confirmation-title').text()).toBe('重要な確認');
    expect(wrapper.find('.confirmation-message').text()).toBe(
      'この操作は取り消せません。続行しますか？',
    );
  });
});
