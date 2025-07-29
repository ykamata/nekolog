import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MedicationRecordForm from '~/components/MedicationRecordForm.vue';
import type {
  MedicationRecord,
  MedicationStatus,
  Medication,
  MedicationType,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Mock the DateTimePicker component
vi.mock('~/components/DateTimePicker.vue', () => ({
  default: {
    name: 'DateTimePicker',
    template: '<div class="datetime-picker-mock" />',
    props: ['value'],
    emits: ['change'],
  },
}));

// Mock the validation module
vi.mock('~/lib/validations/medication', () => ({
  MedicationRecordInputSchema: {
    parse: vi.fn((data) => {
      // Simple validation mock that throws ZodError-like structure
      const errors: Array<{ path: string[]; message: string }> = [];

      if (!data.catId) {
        errors.push({ path: ['catId'], message: '猫を選択してください' });
      }
      if (!data.medicationId) {
        errors.push({
          path: ['medicationId'],
          message: '薬を選択してください',
        });
      }
      if (!data.quantity || data.quantity < 1) {
        errors.push({
          path: ['quantity'],
          message: '投与個数は1以上で入力してください',
        });
      }
      if (!data.administeredAt) {
        errors.push({
          path: ['administeredAt'],
          message: '有効な日時を入力してください',
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

describe('MedicationRecordForm', () => {
  const createTestCat = (overrides?: Partial<Cat>): Cat => ({
    id: 'cat-1',
    name: 'テスト猫',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
    photoUrl: 'https://example.com/cat.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createTestMedication = (
    overrides?: Partial<Medication>,
  ): Medication => ({
    id: 'med-1',
    name: 'テスト薬',
    type: 'MEDICINE' as MedicationType,
    description: 'テスト用の薬です',
    dosage: '1日1回',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createTestMedicationRecord = (
    overrides?: Partial<MedicationRecord>,
  ): MedicationRecord => ({
    id: 'record-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    quantity: 1,
    administeredAt: new Date(),
    status: 'ADMINISTERED' as MedicationStatus,
    notes: 'テストメモ',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const defaultProps = {
    isOpen: true,
    cats: [
      createTestCat({ id: 'cat-1', name: 'みけ' }),
      createTestCat({ id: 'cat-2', name: 'しろ' }),
    ],
    medications: [
      createTestMedication({ id: 'med-1', name: '血圧薬', type: 'MEDICINE' }),
      createTestMedication({ id: 'med-2', name: 'ビタミンC', type: 'VITAMIN' }),
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render form when isOpen is true', () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-title').text()).toBe('新しい投与記録を追加');
    });

    it('should not render form when isOpen is false', () => {
      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          isOpen: false,
        },
      });

      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });

    it('should show edit mode title when medicationRecord is provided', () => {
      const medicationRecord = createTestMedicationRecord();
      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          medicationRecord,
        },
      });

      expect(wrapper.find('.modal-title').text()).toBe('投与記録を編集');
    });
  });

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      expect(wrapper.find('#cat-select').exists()).toBe(true);
      expect(wrapper.find('#medication-select').exists()).toBe(true);
      expect(wrapper.find('#quantity-input').exists()).toBe(true);
      expect(wrapper.find('.datetime-picker-mock').exists()).toBe(true);
      expect(wrapper.find('#status-select').exists()).toBe(true);
      expect(wrapper.find('#notes-textarea').exists()).toBe(true);
    });

    it('should populate form fields when medicationRecord is provided', async () => {
      const medicationRecord = createTestMedicationRecord({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 2,
        status: 'PENDING',
        notes: 'テストメモ',
      });

      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          medicationRecord,
        },
      });

      await wrapper.vm.$nextTick();

      const catSelect = wrapper.find('#cat-select')
        .element as HTMLSelectElement;
      const medicationSelect = wrapper.find('#medication-select')
        .element as HTMLSelectElement;
      const quantityInput = wrapper.find('#quantity-input')
        .element as HTMLInputElement;
      const statusSelect = wrapper.find('#status-select')
        .element as HTMLSelectElement;
      const notesTextarea = wrapper.find('#notes-textarea')
        .element as HTMLTextAreaElement;

      expect(catSelect.value).toBe('cat-1');
      expect(medicationSelect.value).toBe('med-1');
      expect(quantityInput.value).toBe('2');
      expect(statusSelect.value).toBe('PENDING');
      expect(notesTextarea.value).toBe('テストメモ');
    });

    it('should have correct cat options', () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      const options = wrapper.findAll('#cat-select option');
      expect(options).toHaveLength(3); // Including placeholder
      expect(options[0].text()).toBe('猫を選択してください');
      expect(options[1].text()).toBe('みけ');
      expect(options[2].text()).toBe('しろ');
    });

    it('should have correct medication options', () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      const options = wrapper.findAll('#medication-select option');
      expect(options).toHaveLength(3); // Including placeholder
      expect(options[0].text()).toBe('薬を選択してください');
      expect(options[1].text()).toBe('血圧薬 (薬)');
      expect(options[2].text()).toBe('ビタミンC (ビタミン)');
    });

    it('should have correct status options', () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      const options = wrapper.findAll('#status-select option');
      expect(options).toHaveLength(4);
      expect(options[0].text()).toBe('投与済み');
      expect(options[1].text()).toBe('投与予定');
      expect(options[2].text()).toBe('スキップ');
      expect(options[3].text()).toBe('投与忘れ');
    });
  });

  describe('Form Actions', () => {
    it('should emit save event with form data on valid submission', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      // Fill in form data
      await wrapper.find('#cat-select').setValue('cat-1');
      await wrapper.find('#medication-select').setValue('med-1');
      await wrapper.find('#quantity-input').setValue('2');
      await wrapper.find('#status-select').setValue('ADMINISTERED');
      await wrapper.find('#notes-textarea').setValue('テストメモ');

      // Submit form
      await wrapper.find('form').trigger('submit.prevent');

      const saveEvents = wrapper.emitted('save');
      expect(saveEvents).toHaveLength(1);
      expect(saveEvents![0][0]).toMatchObject({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 2,
        status: 'ADMINISTERED',
        notes: 'テストメモ',
      });
    });

    it('should emit close event when close button is clicked', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      await wrapper.find('.modal-close-btn').trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should emit close event when cancel button is clicked', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
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
      const medicationRecord = createTestMedicationRecord({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 2,
      });

      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          medicationRecord,
        },
      });

      // Change form values
      await wrapper.find('#cat-select').setValue('cat-2');
      await wrapper.find('#quantity-input').setValue('5');

      // Click reset button
      const resetButtons = wrapper.findAll('.btn--secondary');
      const resetButton = resetButtons.find(btn => btn.text() === 'リセット');
      expect(resetButton).toBeDefined();

      await resetButton!.trigger('click');
      await wrapper.vm.$nextTick();

      // Should revert to original values
      const catSelect = wrapper.find('#cat-select')
        .element as HTMLSelectElement;
      const quantityInput = wrapper.find('#quantity-input')
        .element as HTMLInputElement;

      expect(catSelect.value).toBe('cat-1');
      expect(quantityInput.value).toBe('2');
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when clicking overlay', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      await wrapper.find('.modal-overlay').trigger('click.self');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should not close modal when clicking modal content', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      await wrapper.find('.modal-content').trigger('click');

      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  describe('Form Summary', () => {
    it('should show summary when cat and medication are selected', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      // Fill in required fields
      await wrapper.find('#cat-select').setValue('cat-1');
      await wrapper.find('#medication-select').setValue('med-1');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.form-summary').exists()).toBe(true);
      expect(wrapper.text()).toContain('投与記録の確認');
      expect(wrapper.text()).toContain('みけ');
      expect(wrapper.text()).toContain('血圧薬');
    });

    it('should not show summary when required fields are not selected', () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      expect(wrapper.find('.form-summary').exists()).toBe(false);
    });
  });

  describe('Form State Management', () => {
    it('should clear form when switching from edit to create mode', async () => {
      const medicationRecord = createTestMedicationRecord();
      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          medicationRecord,
        },
      });

      // Should have medication record data
      let catSelect = wrapper.find('#cat-select').element as HTMLSelectElement;
      expect(catSelect.value).toBe('cat-1');

      // Switch to create mode
      await wrapper.setProps({ medicationRecord: undefined });

      catSelect = wrapper.find('#cat-select').element as HTMLSelectElement;
      expect(catSelect.value).toBe('');
    });

    it('should handle optional fields correctly', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      // Fill only required fields
      await wrapper.find('#cat-select').setValue('cat-1');
      await wrapper.find('#medication-select').setValue('med-1');
      await wrapper.find('#quantity-input').setValue('1');

      // Submit form
      await wrapper.find('form').trigger('submit.prevent');

      const saveEvents = wrapper.emitted('save');
      expect(saveEvents).toHaveLength(1);
      expect(saveEvents![0][0]).toMatchObject({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        notes: undefined,
      });
    });
  });

  describe('Cat Pre-selection', () => {
    it('should pre-select cat when selectedCatId is provided', () => {
      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          selectedCatId: 'cat-1',
        },
      });

      const catSelect = wrapper.find('#cat-select').element as HTMLSelectElement;
      expect(catSelect.value).toBe('cat-1');
    });

    it('should update cat selection when selectedCatId prop changes', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: defaultProps,
      });

      // Initially no cat selected
      let catSelect = wrapper.find('#cat-select').element as HTMLSelectElement;
      expect(catSelect.value).toBe('');

      // Change selectedCatId prop
      await wrapper.setProps({ selectedCatId: 'cat-2' });

      catSelect = wrapper.find('#cat-select').element as HTMLSelectElement;
      expect(catSelect.value).toBe('cat-2');
    });

    it('should not change cat selection when in edit mode', async () => {
      const medicationRecord = createTestMedicationRecord({
        catId: 'cat-1',
      });

      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          medicationRecord,
          selectedCatId: 'cat-2',
        },
      });

      const catSelect = wrapper.find('#cat-select').element as HTMLSelectElement;
      expect(catSelect.value).toBe('cat-1'); // Should use record's catId, not selectedCatId
    });

    it('should reset to selectedCatId when reset button is clicked in create mode', async () => {
      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          selectedCatId: 'cat-1',
        },
      });

      // Change cat selection
      await wrapper.find('#cat-select').setValue('cat-2');

      // Click reset button
      const resetButtons = wrapper.findAll('.btn--secondary');
      const resetButton = resetButtons.find(btn => btn.text() === 'リセット');
      await resetButton!.trigger('click');
      await wrapper.vm.$nextTick();

      const catSelect = wrapper.find('#cat-select').element as HTMLSelectElement;
      expect(catSelect.value).toBe('cat-1'); // Should reset to selectedCatId
    });
  });

  describe('Medication Type Formatting', () => {
    it('should format medication types correctly in options', () => {
      const medications = [
        createTestMedication({ id: 'med-1', name: '薬A', type: 'MEDICINE' }),
        createTestMedication({ id: 'med-2', name: '薬B', type: 'SUPPLEMENT' }),
        createTestMedication({ id: 'med-3', name: '薬C', type: 'VITAMIN' }),
      ];

      const wrapper = mount(MedicationRecordForm, {
        props: {
          ...defaultProps,
          medications,
        },
      });

      const options = wrapper.findAll('#medication-select option');
      expect(options[1].text()).toBe('薬A (薬)');
      expect(options[2].text()).toBe('薬B (サプリメント)');
      expect(options[3].text()).toBe('薬C (ビタミン)');
    });
  });
});
