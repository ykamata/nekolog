import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CatManagementForm from '~/components/CatManagementForm.vue';
import type { Cat, CatInput } from '~/types/cat-meal';

// Mock the validation schema
vi.mock('~/lib/validations/cat-meal', () => ({
  CatInputSchema: {
    parse: vi.fn(data => data),
  },
}));

describe('CatManagementForm', () => {
  const mockCat: Cat = {
    id: 'cat-1',
    name: 'テスト猫',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
    photoUrl: 'https://example.com/cat.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form for new cat when no cat prop is provided', () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        isOpen: true,
      },
    });

    expect(wrapper.find('.modal-title').text()).toBe('新しい猫を追加');
    expect(wrapper.find('#cat-name').element.value).toBe('');
  });

  it('renders form for editing when cat prop is provided', () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        cat: mockCat,
        isOpen: true,
      },
    });

    expect(wrapper.find('.modal-title').text()).toBe('猫の情報を編集');
    expect(wrapper.find('#cat-name').element.value).toBe('テスト猫');
  });

  it('populates form fields with cat data in edit mode', async () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        cat: mockCat,
        isOpen: true,
      },
    });

    await wrapper.vm.$nextTick();

    const nameInput = wrapper.find('#cat-name').element as HTMLInputElement;
    const weightInput = wrapper.find('#cat-weight').element as HTMLInputElement;
    const photoInput = wrapper.find('#cat-photo').element as HTMLInputElement;

    expect(nameInput.value).toBe('テスト猫');
    expect(parseFloat(weightInput.value)).toBe(4.5);
    expect(photoInput.value).toBe('https://example.com/cat.jpg');
  });

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        isOpen: true,
      },
    });

    await wrapper.find('.modal-close-btn').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits close event when cancel button is clicked', async () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        isOpen: true,
      },
    });

    const cancelButtons = wrapper.findAll('.btn--secondary');
    const cancelButton = cancelButtons.find(
      btn => btn.text() === 'キャンセル',
    );
    await cancelButton!.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits save event with form data when form is submitted', async () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        isOpen: true,
      },
    });

    // Fill form
    await wrapper.find('#cat-name').setValue('新しい猫');
    await wrapper.find('#cat-weight').setValue('3.5');

    // Submit form
    await wrapper.find('form').trigger('submit');

    const emitted = wrapper.emitted('save');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toEqual({
      name: '新しい猫',
      birthdate: undefined,
      weight: 3.5,
      photoUrl: undefined,
    });
  });

  it('resets form when reset button is clicked', async () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        cat: mockCat,
        isOpen: true,
      },
    });

    // Change form values
    await wrapper.find('#cat-name').setValue('変更された名前');
    await wrapper.find('#cat-weight').setValue('5.0');

    // Click reset
    const resetButtons = wrapper.findAll('.btn--secondary');
    const resetButton = resetButtons.find(btn => btn.text() === 'リセット');
    await resetButton!.trigger('click');

    await wrapper.vm.$nextTick();

    // Check if form is reset to original values
    const nameInput = wrapper.find('#cat-name').element as HTMLInputElement;
    const weightInput = wrapper.find('#cat-weight').element as HTMLInputElement;

    expect(nameInput.value).toBe('テスト猫');
    expect(parseFloat(weightInput.value)).toBe(4.5);
  });

  it('handles date input correctly', async () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        isOpen: true,
      },
    });

    await wrapper.find('#cat-birthdate').setValue('2021-06-15');
    await wrapper.find('#cat-name').setValue('テスト猫');

    await wrapper.find('form').trigger('submit');

    const emitted = wrapper.emitted('save');
    expect(emitted).toBeTruthy();
    const savedData = emitted![0][0] as CatInput;
    expect(savedData.birthdate).toEqual(new Date('2021-06-15'));
  });

  it('does not render when isOpen is false', () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        isOpen: false,
      },
    });

    expect(wrapper.find('.modal-overlay').exists()).toBe(false);
  });

  it('shows correct button text based on mode', () => {
    const newCatWrapper = mount(CatManagementForm, {
      props: {
        isOpen: true,
      },
    });

    const editCatWrapper = mount(CatManagementForm, {
      props: {
        cat: mockCat,
        isOpen: true,
      },
    });

    const newCatSubmitBtn = newCatWrapper.find('.btn--primary');
    const editCatSubmitBtn = editCatWrapper.find('.btn--primary');

    expect(newCatSubmitBtn.text()).toBe('追加');
    expect(editCatSubmitBtn.text()).toBe('更新');
  });

  it('handles photo URL validation', async () => {
    const wrapper = mount(CatManagementForm, {
      props: {
        isOpen: true,
      },
    });

    await wrapper.find('#cat-photo').setValue('invalid-url');
    await wrapper.find('#cat-name').setValue('テスト猫');

    // The validation should be handled by the Zod schema
    // This test ensures the input accepts URL values
    const photoInput = wrapper.find('#cat-photo').element as HTMLInputElement;
    expect(photoInput.value).toBe('invalid-url');
  });
});
