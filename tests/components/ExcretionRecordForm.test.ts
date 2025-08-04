import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ExcretionRecordForm from '~/components/ExcretionRecordForm.vue';
import DateTimePicker from '~/components/DateTimePicker.vue';
import type { Cat } from '~/types/cat-meal';
import type { ExcretionRecordInput } from '~/types/excretion';
import { ExcretionType } from '~/types/excretion';

// Mock DateTimePicker component
vi.mock('~/components/DateTimePicker.vue', () => ({
  default: {
    name: 'DateTimePicker',
    props: ['value', 'disabled', 'maxDate'],
    emits: ['change'],
    template:
      '<div data-testid="datetime-picker" @click="$emit(\'change\', new Date())">DateTime Picker</div>',
  },
}));

describe('ExcretionRecordForm', () => {
  const mockCats: Cat[] = [
    {
      id: 'cat1',
      name: 'ミケ',
      weight: 4.5,
      birthdate: new Date('2020-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat2',
      name: 'タマ',
      weight: 3.2,
      birthdate: new Date('2021-06-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    cats: mockCats,
  };

  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(ExcretionRecordForm, {
      props: defaultProps,
      global: {
        components: {
          DateTimePicker,
        },
      },
    });
  });

  describe('Component Rendering', () => {
    it('renders the form with all required elements', () => {
      expect(wrapper.find('.excretion-record-form').exists()).toBe(true);
      expect(wrapper.find('.form-title').text()).toBe('排泄記録');
      expect(wrapper.find('.form-description').text()).toBe(
        '猫の排泄記録を入力してください',
      );
    });

    it('renders cat selection options', () => {
      const catOptions = wrapper.findAll('.cat-option');
      expect(catOptions).toHaveLength(2);
      expect(catOptions[0].text()).toContain('ミケ');
      expect(catOptions[0].text()).toContain('4.5kg');
      expect(catOptions[1].text()).toContain('タマ');
      expect(catOptions[1].text()).toContain('3.2kg');
    });

    it('renders excretion type selection', () => {
      const typeOptions = wrapper.findAll('.type-option');
      expect(typeOptions).toHaveLength(2);

      const urineOption = wrapper.find('input[value="URINE"]');
      const fecesOption = wrapper.find('input[value="FECES"]');

      expect(urineOption.exists()).toBe(true);
      expect(fecesOption.exists()).toBe(true);
    });

    it('renders DateTimePicker component', () => {
      const dateTimePicker = wrapper.findComponent(DateTimePicker);
      expect(dateTimePicker.exists()).toBe(true);
      expect(dateTimePicker.props('maxDate')).toBeInstanceOf(Date);
    });

    it('renders notes textarea', () => {
      const notesInput = wrapper.find('.notes-input');
      expect(notesInput.exists()).toBe(true);
      expect(notesInput.attributes('maxlength')).toBe('500');
    });

    it('renders form action buttons', () => {
      expect(wrapper.find('.cancel-button').exists()).toBe(true);
      expect(wrapper.find('.submit-button').exists()).toBe(true);
    });
  });

  describe('Cat Selection', () => {
    it('selects a cat when clicked', async () => {
      const catOption = wrapper.find('.cat-option');
      await catOption.trigger('click');

      expect(wrapper.find('.cat-option--selected').exists()).toBe(true);
      expect(wrapper.find('.selected-indicator').exists()).toBe(true);
      expect(wrapper.vm.formData.catId).toBe('cat1');
    });

    it('shows validation error when no cat is selected', async () => {
      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.catId).toBeTruthy();
    });

    it('clears cat selection error when cat is selected', async () => {
      // First trigger validation error
      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.catId).toBeTruthy();

      // Then select a cat
      const catOption = wrapper.find('.cat-option');
      await catOption.trigger('click');

      // Error should be cleared
      expect(wrapper.vm.errors.catId).toBeFalsy();
    });
  });

  describe('Excretion Type Selection', () => {
    it('defaults to URINE type', () => {
      expect(wrapper.vm.formData.type).toBe(ExcretionType.URINE);

      const urineRadio = wrapper.find('input[value="URINE"]');
      expect(urineRadio.element.checked).toBe(true);
    });

    it('handles type selection', async () => {
      const fecesRadio = wrapper.find('input[value="FECES"]');
      await fecesRadio.setChecked();

      expect(wrapper.vm.formData.type).toBe(ExcretionType.FECES);
    });

    it('shows type icons correctly', () => {
      const typeLabels = wrapper.findAll('.type-label');

      // Check for urine and feces icons
      const labelTexts = typeLabels.map(label => label.text());
      expect(labelTexts.some(text => text.includes('💧'))).toBe(true);
      expect(labelTexts.some(text => text.includes('💩'))).toBe(true);
    });
  });

  describe('Date/Time Selection', () => {
    it('initializes with current date', () => {
      expect(wrapper.vm.formData.recordedAt).toBeInstanceOf(Date);
    });

    it('handles date/time change from DateTimePicker', async () => {
      const testDate = new Date('2024-01-15T14:30:00');
      const dateTimePicker = wrapper.findComponent(DateTimePicker);
      await dateTimePicker.vm.$emit('change', testDate);

      expect(wrapper.vm.formData.recordedAt).toEqual(testDate);
    });

    it('validates that date is not in the future', async () => {
      // Test the validation logic directly
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow

      // Test with the validation schema directly
      const testData = {
        catId: 'cat1',
        type: ExcretionType.URINE,
        recordedAt: futureDate.toISOString(),
        notes: '',
      };

      const { ExcretionRecordFormSchema } = await import('~/lib/validations/excretion');

      // Expect the validation to throw an error for future dates
      expect(() => {
        ExcretionRecordFormSchema.parse(testData);
      }).toThrow('記録日時は現在時刻以前である必要があります');
    });
  });

  describe('Notes Input', () => {
    it('handles notes input', async () => {
      const notesInput = wrapper.find('.notes-input');
      await notesInput.setValue('特別なメモ');

      expect(wrapper.vm.formData.notes).toBe('特別なメモ');
    });

    it('shows character count', async () => {
      const notesInput = wrapper.find('.notes-input');
      await notesInput.setValue('テストメモ');

      expect(wrapper.find('.character-count').text()).toBe('5/500');
    });

    it('validates notes length', async () => {
      const longNotes = 'a'.repeat(501);
      wrapper.vm.formData.notes = longNotes;

      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.notes).toBeTruthy();
    });

    it('accepts empty notes', async () => {
      wrapper.vm.formData.notes = '';

      // Set other required fields
      wrapper.vm.formData.catId = 'cat1';
      wrapper.vm.formData.recordedAt = new Date();

      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(true);
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      // Set up valid form data
      const catOption = wrapper.find('.cat-option');
      await catOption.trigger('click');

      wrapper.vm.formData.recordedAt = new Date();
    });

    it('emits submit event with correct data', async () => {
      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(true);

      await wrapper.vm.handleSubmit();

      const submitEvents = wrapper.emitted('submit');
      expect(submitEvents).toBeTruthy();
      expect(submitEvents!.length).toBeGreaterThan(0);

      const submittedData = submitEvents![0][0] as ExcretionRecordInput;
      expect(submittedData.catId).toBe('cat1');
      expect(submittedData.type).toBe(ExcretionType.URINE);
      expect(submittedData.recordedAt).toBeInstanceOf(Date);
    });

    it('includes notes in submission when provided', async () => {
      const notesInput = wrapper.find('.notes-input');
      await notesInput.setValue('テストメモ');

      await wrapper.vm.handleSubmit();

      const submitEvents = wrapper.emitted('submit');
      const submittedData = submitEvents![0][0] as ExcretionRecordInput;
      expect(submittedData.notes).toBe('テストメモ');
    });

    it('excludes notes from submission when empty', async () => {
      await wrapper.vm.handleSubmit();

      const submitEvents = wrapper.emitted('submit');
      const submittedData = submitEvents![0][0] as ExcretionRecordInput;
      expect(submittedData.notes).toBeUndefined();
    });

    it('prevents submission with invalid data', async () => {
      // Clear required fields
      wrapper.vm.formData.catId = '';

      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(false);

      const submitButton = wrapper.find('.submit-button');
      await submitButton.trigger('click');

      expect(wrapper.emitted('submit')).toBeFalsy();
    });

    it('shows loading state during submission', async () => {
      wrapper.vm.isSubmitting = true;
      await wrapper.vm.$nextTick();

      const submitButton = wrapper.find('.submit-button');
      expect(submitButton.text()).toBe('保存中...');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });
  });

  describe('Form Cancellation', () => {
    it('emits cancel event when cancel button is clicked', async () => {
      const cancelButton = wrapper.find('.cancel-button');
      await cancelButton.trigger('click');

      expect(wrapper.emitted('cancel')).toHaveLength(1);
    });
  });

  describe('Props and Initial Data', () => {
    it('initializes form with provided initial data', async () => {
      const initialData: Partial<ExcretionRecordInput> = {
        catId: 'cat2',
        type: ExcretionType.FECES,
        recordedAt: new Date('2024-01-15T10:30:00'),
        notes: '初期メモ',
      };

      const wrapperWithInitialData = mount(ExcretionRecordForm, {
        props: {
          ...defaultProps,
          initialData,
        },
        global: {
          components: {
            DateTimePicker,
          },
        },
      });

      expect(wrapperWithInitialData.vm.formData.catId).toBe('cat2');
      expect(wrapperWithInitialData.vm.formData.type).toBe(ExcretionType.FECES);
      expect(wrapperWithInitialData.vm.formData.recordedAt).toEqual(initialData.recordedAt);
      expect(wrapperWithInitialData.vm.formData.notes).toBe('初期メモ');
    });

    it('disables form when disabled prop is true', async () => {
      const disabledWrapper = mount(ExcretionRecordForm, {
        props: {
          ...defaultProps,
          disabled: true,
        },
        global: {
          components: {
            DateTimePicker,
          },
        },
      });

      expect(
        disabledWrapper.find('.cat-option').attributes('disabled'),
      ).toBeDefined();
      expect(
        disabledWrapper.find('.notes-input').attributes('disabled'),
      ).toBeDefined();
      expect(
        disabledWrapper.find('.submit-button').attributes('disabled'),
      ).toBeDefined();
    });

    it('shows empty state when no cats are provided', async () => {
      const noCatsWrapper = mount(ExcretionRecordForm, {
        props: {
          cats: [],
        },
        global: {
          components: {
            DateTimePicker,
          },
        },
      });

      expect(noCatsWrapper.find('.empty-state').exists()).toBe(true);
      expect(noCatsWrapper.find('.empty-state').text()).toContain(
        '登録されている猫がありません',
      );
    });

    it('disables submit button when no cats are available', async () => {
      const noCatsWrapper = mount(ExcretionRecordForm, {
        props: {
          cats: [],
        },
        global: {
          components: {
            DateTimePicker,
          },
        },
      });

      const submitButton = noCatsWrapper.find('.submit-button');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });
  });

  describe('Exposed Methods', () => {
    it('exposes resetForm method', () => {
      expect(typeof wrapper.vm.resetForm).toBe('function');
    });

    it('exposes validateForm method', () => {
      expect(typeof wrapper.vm.validateForm).toBe('function');
    });

    it('resets form data when resetForm is called', async () => {
      // Set some data
      wrapper.vm.formData.catId = 'cat1';
      wrapper.vm.formData.type = ExcretionType.FECES;
      wrapper.vm.formData.notes = 'テストメモ';

      // Reset form
      wrapper.vm.resetForm();

      expect(wrapper.vm.formData.catId).toBe('');
      expect(wrapper.vm.formData.type).toBe(ExcretionType.URINE);
      expect(wrapper.vm.formData.notes).toBe('');
      expect(wrapper.vm.formData.recordedAt).toBeInstanceOf(Date);
      expect(wrapper.vm.errors).toEqual({});
    });
  });

  describe('Form Validation', () => {
    it('validates all required fields', async () => {
      // Empty form should be invalid
      wrapper.vm.formData.catId = '';

      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.catId).toBeTruthy();
    });

    it('validates individual fields', async () => {
      // Test cat ID validation
      wrapper.vm.formData.catId = '';
      wrapper.vm.validateField('catId');
      expect(wrapper.vm.errors.catId).toBeTruthy();

      wrapper.vm.formData.catId = 'cat1';
      wrapper.vm.validateField('catId');
      expect(wrapper.vm.errors.catId).toBeFalsy();
    });

    it('clears errors when validation passes', async () => {
      // First set invalid data
      wrapper.vm.formData.catId = '';
      wrapper.vm.validateForm();
      expect(wrapper.vm.errors.catId).toBeTruthy();

      // Then fix the data
      wrapper.vm.formData.catId = 'cat1';
      wrapper.vm.validateForm();
      expect(wrapper.vm.errors.catId).toBeFalsy();
    });
  });

  describe('Responsive Design', () => {
    it('applies mobile styles correctly', () => {
      expect(wrapper.find('.excretion-record-form').exists()).toBe(true);
      expect(wrapper.find('.cat-options').exists()).toBe(true);
      expect(wrapper.find('.form-actions').exists()).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      const labels = wrapper.findAll('.form-label');
      expect(labels.length).toBeGreaterThan(0);

      // Check for required field indicators
      const requiredIndicators = wrapper.findAll('.required');
      expect(requiredIndicators.length).toBeGreaterThan(0);
    });

    it('associates radio buttons with labels', () => {
      const urineRadio = wrapper.find('input[value="URINE"]');
      const urineLabel = wrapper.find('label[for="type-URINE"]');

      expect(urineRadio.exists()).toBe(true);
      expect(urineLabel.exists()).toBe(true);
      expect(urineRadio.attributes('id')).toBe('type-URINE');
    });

    it('shows error messages for invalid fields', async () => {
      wrapper.vm.formData.catId = '';
      wrapper.vm.validateForm();
      await wrapper.vm.$nextTick();

      const errorMessage = wrapper.find('.error-message');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toBeTruthy();
    });
  });
});
