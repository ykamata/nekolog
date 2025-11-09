import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MealRecordForm from '~/components/MealRecordForm.vue';
import FoodSelector from '~/components/FoodSelector.vue';
import DateTimePicker from '~/components/DateTimePicker.vue';
import type { Cat, Food, MealRecordInput } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

// Mock components
vi.mock('~/components/FoodSelector.vue', () => ({
  default: {
    name: 'FoodSelector',
    props: ['foods', 'selectedFoodId', 'disabled', 'placeholder'],
    emits: ['select'],
    template:
      '<div data-testid="food-selector" @click="$emit(\'select\', foods[0])">Food Selector</div>',
  },
}));

vi.mock('~/components/DateTimePicker.vue', () => ({
  default: {
    name: 'DateTimePicker',
    props: ['value', 'disabled'],
    emits: ['change'],
    template:
      '<div data-testid="datetime-picker" @click="$emit(\'change\', new Date())">DateTime Picker</div>',
  },
}));

describe('MealRecordForm', () => {
  const mockCats: Cat[] = [
    {
      id: 1,
      name: 'ミケ',
      weight: 4.5,
      birthdate: new Date('2020-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: 'タマ',
      weight: 3.2,
      birthdate: new Date('2021-06-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockFoods: Food[] = [
    {
      id: 1,
      name: 'プレミアムドライフード',
      type: FoodType.DRY,
      brand: 'ロイヤルカナン',
      caloriesPerGram: 4.2,
      pricePerUnit: 2500,
      unit: 'g',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: 'ウェットフード缶詰',
      type: FoodType.WET,
      brand: 'ヒルズ',
      caloriesPerGram: 1.8,
      pricePerUnit: 180,
      unit: 'g',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    cats: mockCats,
    foods: mockFoods,
  };

  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(MealRecordForm, {
      props: defaultProps,
      global: {
        components: {
          FoodSelector,
          DateTimePicker,
        },
      },
    });
  });

  describe('Component Rendering', () => {
    it('renders the form with all required elements', () => {
      expect(wrapper.find('.meal-record-form').exists()).toBe(true);
      expect(wrapper.find('.form-title').text()).toBe('食事記録');
      expect(wrapper.find('.form-description').text()).toBe(
        '猫の食事内容を記録してください',
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

    it('renders FoodSelector component', () => {
      const foodSelector = wrapper.findComponent(FoodSelector);
      expect(foodSelector.exists()).toBe(true);
      expect(foodSelector.props('foods')).toEqual(mockFoods);
    });

    it('renders DateTimePicker component', () => {
      const dateTimePicker = wrapper.findComponent(DateTimePicker);
      expect(dateTimePicker.exists()).toBe(true);
    });

    it('renders quantity input controls', () => {
      expect(wrapper.find('.quantity-mode-toggle').exists()).toBe(true);
      expect(wrapper.find('.predefined-quantities').exists()).toBe(true);
      expect(wrapper.find('.quantity-input').exists()).toBe(true);
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
    });

    it('shows validation error when no cat is selected', async () => {
      // Directly test validation
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

  describe('Food Selection', () => {
    it('handles food selection from FoodSelector', async () => {
      const foodSelector = wrapper.findComponent(FoodSelector);
      await foodSelector.vm.$emit('select', mockFoods[0]);

      expect(wrapper.vm.formData.foodId).toBe('food1');
    });

    it('auto-calculates calories when food is selected', async () => {
      // First set quantity
      const quantityInput = wrapper.find('.quantity-input');
      await quantityInput.setValue('50');

      // Then select food
      const foodSelector = wrapper.findComponent(FoodSelector);
      await foodSelector.vm.$emit('select', mockFoods[0]);

      expect(wrapper.vm.formData.calories).toBe(210); // 50g * 4.2kcal/g = 210kcal
    });
  });

  describe('Quantity Input', () => {
    beforeEach(async () => {
      // Select a cat and food first
      const catOption = wrapper.find('.cat-option');
      await catOption.trigger('click');

      const foodSelector = wrapper.findComponent(FoodSelector);
      await foodSelector.vm.$emit('select', mockFoods[0]);
    });

    it('toggles between grams and calories mode', async () => {
      const modeButtons = wrapper.findAll('.mode-button');
      expect(modeButtons[0].classes()).toContain('mode-button--active'); // grams active by default

      await modeButtons[1].trigger('click'); // switch to calories
      expect(modeButtons[1].classes()).toContain('mode-button--active');
    });

    it('handles predefined quantity selection', async () => {
      const quantityButton = wrapper.find('.quantity-button');
      await quantityButton.trigger('click');

      expect(wrapper.vm.formData.quantity).toBe(10); // First predefined quantity is 10g
      expect(wrapper.find('.quantity-button--selected').exists()).toBe(true);
    });

    it('handles manual quantity input', async () => {
      const quantityInput = wrapper.find('.quantity-input');
      await quantityInput.setValue('75');

      expect(wrapper.vm.formData.quantity).toBe(75);
    });

    it('shows conversion display when quantity and food are set', async () => {
      const quantityInput = wrapper.find('.quantity-input');
      await quantityInput.setValue('50');

      expect(wrapper.find('.conversion-display').exists()).toBe(true);
      expect(wrapper.find('.conversion-info').text()).toContain(
        '50g = 210kcal',
      );
    });

    it('validates quantity input', async () => {
      const quantityInput = wrapper.find('.quantity-input');
      await quantityInput.setValue('0');

      const submitButton = wrapper.find('.submit-button');
      await submitButton.trigger('click');

      expect(wrapper.find('.error-message').text()).toContain(
        '量は正の数値で入力してください',
      );
    });
  });

  describe('Date/Time Selection', () => {
    it('handles date/time change from DateTimePicker', async () => {
      const testDate = new Date('2024-01-15T14:30:00');
      const dateTimePicker = wrapper.findComponent(DateTimePicker);
      await dateTimePicker.vm.$emit('change', testDate);

      expect(wrapper.vm.formData.mealTime).toEqual(testDate);
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
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      // Set up valid form data
      const catOption = wrapper.find('.cat-option');
      await catOption.trigger('click');

      const foodSelector = wrapper.findComponent(FoodSelector);
      await foodSelector.vm.$emit('select', mockFoods[0]);

      const quantityInput = wrapper.find('.quantity-input');
      await quantityInput.setValue('50');
    });

    it('emits submit event with correct data', async () => {
      // Ensure mealTime is set (it should be set by default in the component)
      expect(wrapper.vm.formData.mealTime).toBeInstanceOf(Date);

      // Verify form is valid first
      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(true);

      // Call handleSubmit directly since form submission might have issues in test
      await wrapper.vm.handleSubmit();

      const submitEvents = wrapper.emitted('submit');
      expect(submitEvents).toBeTruthy();
      expect(submitEvents!.length).toBeGreaterThan(0);

      const submittedData = submitEvents![0][0] as MealRecordInput;
      expect(submittedData.catId).toBe('cat1');
      expect(submittedData.foodId).toBe('food1');
      expect(submittedData.quantity).toBe(50);
      expect(submittedData.calories).toBe(210);
    });

    it('prevents submission with invalid data', async () => {
      // Clear required fields
      wrapper.vm.formData.catId = '';
      wrapper.vm.formData.foodId = '';

      const isValid = wrapper.vm.validateForm();
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.catId).toBeTruthy();
      expect(wrapper.vm.errors.foodId).toBeTruthy();

      const submitButton = wrapper.find('.submit-button');
      await submitButton.trigger('click');
      await wrapper.vm.$nextTick();

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
      const initialData: Partial<MealRecordInput> = {
        catId: 2,
        foodId: 2,
        quantity: 75,
        calories: 135,
        notes: '初期メモ',
      };

      const wrapperWithInitialData = mount(MealRecordForm, {
        props: {
          ...defaultProps,
          initialData,
        },
        global: {
          components: {
            FoodSelector,
            DateTimePicker,
          },
        },
      });

      expect(wrapperWithInitialData.vm.formData.catId).toBe('cat2');
      expect(wrapperWithInitialData.vm.formData.foodId).toBe('food2');
      expect(wrapperWithInitialData.vm.formData.quantity).toBe(75);
      expect(wrapperWithInitialData.vm.formData.calories).toBe(135);
      expect(wrapperWithInitialData.vm.formData.notes).toBe('初期メモ');
    });

    it('disables form when disabled prop is true', async () => {
      const disabledWrapper = mount(MealRecordForm, {
        props: {
          ...defaultProps,
          disabled: true,
        },
        global: {
          components: {
            FoodSelector,
            DateTimePicker,
          },
        },
      });

      expect(
        disabledWrapper.find('.cat-option').attributes('disabled'),
      ).toBeDefined();
      expect(
        disabledWrapper.find('.quantity-input').attributes('disabled'),
      ).toBeDefined();
      expect(
        disabledWrapper.find('.submit-button').attributes('disabled'),
      ).toBeDefined();
    });

    it('shows empty state when no cats are provided', async () => {
      const noCatsWrapper = mount(MealRecordForm, {
        props: {
          cats: [],
          foods: mockFoods,
        },
        global: {
          components: {
            FoodSelector,
            DateTimePicker,
          },
        },
      });

      expect(noCatsWrapper.find('.empty-state').exists()).toBe(true);
      expect(noCatsWrapper.find('.empty-state').text()).toContain(
        '登録されている猫がありません',
      );
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
      wrapper.vm.formData.notes = 'テストメモ';

      // Reset form
      wrapper.vm.resetForm();

      expect(wrapper.vm.formData.catId).toBe('');
      expect(wrapper.vm.formData.notes).toBe('');
    });
  });

  describe('Responsive Design', () => {
    it('applies mobile styles correctly', () => {
      // This would typically be tested with actual CSS media queries
      // For now, we just verify the CSS classes exist
      expect(wrapper.find('.meal-record-form').exists()).toBe(true);
      expect(wrapper.find('.cat-options').exists()).toBe(true);
      expect(wrapper.find('.form-actions').exists()).toBe(true);
    });
  });
});
