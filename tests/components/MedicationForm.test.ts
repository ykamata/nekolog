import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MedicationForm from '~/components/MedicationForm.vue';
import type { Medication, MedicationType } from '~/types/medication';

// Mock the validation module
vi.mock('~/lib/validations/medication', () => ({
  MedicationInputSchema: {
    parse: vi.fn((data) => {
      // Simple validation mock that throws ZodError-like structure
      const errors: Array<{ path: string[]; message: string }> = [];

      if (!data.name || data.name.length === 0) {
        errors.push({ path: ['name'], message: '薬名は必須です' });
      }
      if (data.name && data.name.length > 100) {
        errors.push({
          path: ['name'],
          message: '薬名は100文字以内で入力してください',
        });
      }
      if (data.description && data.description.length > 500) {
        errors.push({
          path: ['description'],
          message: '説明は500文字以内で入力してください',
        });
      }
      if (data.dosage && data.dosage.length > 100) {
        errors.push({
          path: ['dosage'],
          message: '投与量は100文字以内で入力してください',
        });
      }

      if (errors.length > 0) {
        const error = new Error('Validation failed');
        error.name = 'ZodError';
        (
          error as unknown as {
            errors: Array<{ path: string[]; message: string }>;
          }
        ).errors = errors;
        throw error;
      }

      return data;
    }),
  },
}));

describe('MedicationForm', () => {
  const createTestMedication = (
    overrides?: Partial<Medication>,
  ): Medication => ({
    id: 1,
    name: 'テスト薬',
    type: 'MEDICINE' as MedicationType,
    description: 'テスト用の薬です',
    dosage: '1日1回',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render form when isOpen is true', () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-title').text()).toBe('新しい薬を追加');
    });

    it('should not render form when isOpen is false', () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: false,
        },
      });

      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });

    it('should show edit mode title when medication is provided', () => {
      const medication = createTestMedication();
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
          medication,
        },
      });

      expect(wrapper.find('.modal-title').text()).toBe('薬の情報を編集');
    });
  });

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      expect(wrapper.find('#medication-name').exists()).toBe(true);
      expect(wrapper.find('#medication-type').exists()).toBe(true);
      expect(wrapper.find('#medication-dosage').exists()).toBe(true);
      expect(wrapper.find('#medication-description').exists()).toBe(true);
    });

    it('should populate form fields when medication is provided', async () => {
      const medication = createTestMedication({
        name: '血圧薬',
        type: 'MEDICINE',
        description: '高血圧治療薬',
        dosage: '朝1錠',
      });

      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
          medication,
        },
      });

      await wrapper.vm.$nextTick();

      const nameInput = wrapper.find('#medication-name')
        .element as HTMLInputElement;
      const typeSelect = wrapper.find('#medication-type')
        .element as HTMLSelectElement;
      const dosageInput = wrapper.find('#medication-dosage')
        .element as HTMLInputElement;
      const descriptionTextarea = wrapper.find('#medication-description')
        .element as HTMLTextAreaElement;

      expect(nameInput.value).toBe('血圧薬');
      expect(typeSelect.value).toBe('MEDICINE');
      expect(dosageInput.value).toBe('朝1錠');
      expect(descriptionTextarea.value).toBe('高血圧治療薬');
    });

    it('should have correct medication type options', () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      const options = wrapper.findAll('#medication-type option');
      expect(options).toHaveLength(3);
      expect(options[0].text()).toBe('薬');
      expect(options[0].attributes('value')).toBe('MEDICINE');
      expect(options[1].text()).toBe('サプリメント');
      expect(options[1].attributes('value')).toBe('SUPPLEMENT');
      expect(options[2].text()).toBe('ビタミン');
      expect(options[2].attributes('value')).toBe('VITAMIN');
    });
  });

  describe('Form Actions', () => {
    it('should emit save event with form data on valid submission', async () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      // Fill in form data
      await wrapper.find('#medication-name').setValue('テスト薬');
      await wrapper.find('#medication-type').setValue('SUPPLEMENT');
      await wrapper.find('#medication-dosage').setValue('1日2回');
      await wrapper
        .find('#medication-description')
        .setValue('テスト用サプリメント');

      // Submit form
      await wrapper.find('form').trigger('submit.prevent');

      const saveEvents = wrapper.emitted('save');
      expect(saveEvents).toHaveLength(1);
      expect(saveEvents![0][0]).toEqual({
        name: 'テスト薬',
        type: 'SUPPLEMENT',
        dosage: '1日2回',
        description: 'テスト用サプリメント',
      });
    });

    it('should emit close event when close button is clicked', async () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      await wrapper.find('.modal-close-btn').trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should emit close event when cancel button is clicked', async () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      const cancelButtons = wrapper.findAll('.btn--secondary');
      const cancelButton = cancelButtons.find(
        btn => btn.text() === 'キャンセル',
      );
      expect(cancelButton).toBeDefined();

      await cancelButton!.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should reset form when reset button is clicked', async () => {
      const medication = createTestMedication({
        name: '元の薬名',
        type: 'MEDICINE',
      });

      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
          medication,
        },
      });

      // Change form values
      await wrapper.find('#medication-name').setValue('変更された薬名');
      await wrapper.find('#medication-type').setValue('SUPPLEMENT');

      // Click reset button
      const resetButtons = wrapper.findAll('.btn--secondary');
      const resetButton = resetButtons.find(btn => btn.text() === 'リセット');
      expect(resetButton).toBeDefined();

      await resetButton!.trigger('click');
      await wrapper.vm.$nextTick();

      // Should revert to original values
      const nameInput = wrapper.find('#medication-name')
        .element as HTMLInputElement;
      const typeSelect = wrapper.find('#medication-type')
        .element as HTMLSelectElement;

      expect(nameInput.value).toBe('元の薬名');
      expect(typeSelect.value).toBe('MEDICINE');
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when clicking overlay', async () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      await wrapper.find('.modal-overlay').trigger('click.self');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should not close modal when clicking modal content', async () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      await wrapper.find('.modal-content').trigger('click');

      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  describe('Form State Management', () => {
    it('should clear form when switching from edit to create mode', async () => {
      const medication = createTestMedication();
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
          medication,
        },
      });

      // Should have medication data
      let nameInput = wrapper.find('#medication-name')
        .element as HTMLInputElement;
      expect(nameInput.value).toBe('テスト薬');

      // Switch to create mode
      await wrapper.setProps({ medication: undefined });

      nameInput = wrapper.find('#medication-name').element as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });

    it('should handle optional fields correctly', async () => {
      const wrapper = mount(MedicationForm, {
        props: {
          isOpen: true,
        },
      });

      // Fill only required fields
      await wrapper.find('#medication-name').setValue('必須項目のみ');
      await wrapper.find('#medication-type').setValue('MEDICINE');

      // Submit form
      await wrapper.find('form').trigger('submit.prevent');

      const saveEvents = wrapper.emitted('save');
      expect(saveEvents).toHaveLength(1);
      expect(saveEvents![0][0]).toEqual({
        name: '必須項目のみ',
        type: 'MEDICINE',
        description: undefined,
        dosage: undefined,
      });
    });
  });
});
