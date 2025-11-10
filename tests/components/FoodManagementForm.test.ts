import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FoodManagementForm from '~/components/FoodManagementForm.vue';
import { FoodType } from '~/types/cat-meal';
import type { Food } from '~/types/cat-meal';

// Mock food data
const mockFood: Food = {
  id: 1,
  name: 'プレミアムキャットフード',
  type: FoodType.DRY,
  brand: 'ロイヤルカナン',
  caloriesPerGram: 3.5,
  pricePerUnit: 2500,
  unit: 'g',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('FoodManagementForm', () => {
  let wrapper: any;

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock document methods
    Object.defineProperty(document, 'addEventListener', {
      value: vi.fn(),
      writable: true,
    });

    Object.defineProperty(document, 'removeEventListener', {
      value: vi.fn(),
      writable: true,
    });
  });

  describe('Form Display', () => {
    it('should render form when isOpen is true', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.food-form').exists()).toBe(true);
    });

    it('should not render form when isOpen is false', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: false,
        },
      });

      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });

    it('should show "新しいフードを追加" title for new food', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });

      expect(wrapper.find('.modal-title').text()).toBe('新しいフードを追加');
    });

    it('should show "フード情報を編集" title for editing food', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
          food: mockFood,
        },
      });

      expect(wrapper.find('.modal-title').text()).toBe('フード情報を編集');
    });
  });

  describe('Form Fields', () => {
    beforeEach(() => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });
    });

    it('should render all required form fields', () => {
      expect(wrapper.find('#food-name').exists()).toBe(true);
      expect(wrapper.find('#food-type').exists()).toBe(true);
      expect(wrapper.find('#food-brand').exists()).toBe(true);
      expect(wrapper.find('#food-calories').exists()).toBe(true);
      expect(wrapper.find('#food-price').exists()).toBe(true);
      expect(wrapper.find('#food-unit').exists()).toBe(true);
    });

    it('should show required indicators for mandatory fields', () => {
      const requiredFields = wrapper.findAll('.required');
      expect(requiredFields).toHaveLength(4); // name, type, calories, unit
    });

    it('should have correct food type options', () => {
      const typeSelect = wrapper.find('#food-type');
      const options = typeSelect.findAll('option');

      expect(options).toHaveLength(2);
      expect(options[0].text()).toBe('ドライフード');
      expect(options[0].attributes('value')).toBe(FoodType.DRY);
      expect(options[1].text()).toBe('ウェットフード');
      expect(options[1].attributes('value')).toBe(FoodType.WET);
    });
  });

  describe('Form Initialization', () => {
    it('should initialize with empty values for new food', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });

      expect(wrapper.find('#food-name').element.value).toBe('');
      expect(wrapper.find('#food-type').element.value).toBe(FoodType.DRY);
      expect(wrapper.find('#food-brand').element.value).toBe('');
      expect(wrapper.find('#food-calories').element.value).toBe('0');
      expect(wrapper.find('#food-price').element.value).toBe('');
      expect(wrapper.find('#food-unit').element.value).toBe('g');
    });

    it('should initialize with food data when editing', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
          food: mockFood,
        },
      });

      expect(wrapper.find('#food-name').element.value).toBe(mockFood.name);
      expect(wrapper.find('#food-type').element.value).toBe(mockFood.type);
      expect(wrapper.find('#food-brand').element.value).toBe(mockFood.brand);
      expect(wrapper.find('#food-calories').element.value).toBe(
        mockFood.caloriesPerGram.toString(),
      );
      expect(wrapper.find('#food-price').element.value).toBe(
        mockFood.pricePerUnit?.toString(),
      );
      expect(wrapper.find('#food-unit').element.value).toBe(mockFood.unit);
    });
  });

  describe('Auto-complete Functionality', () => {
    beforeEach(() => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });
    });

    it('should show brand suggestions when typing', async () => {
      const brandInput = wrapper.find('#food-brand');

      await brandInput.setValue('ロイヤル');
      await brandInput.trigger('input');

      expect(wrapper.find('.suggestions-dropdown').exists()).toBe(true);
      const suggestions = wrapper.findAll('.suggestion-item');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should show product suggestions when typing in name field', async () => {
      const nameInput = wrapper.find('#food-name');

      await nameInput.setValue('キトン');
      await nameInput.trigger('input');

      expect(wrapper.find('.suggestions-dropdown').exists()).toBe(true);
      const suggestions = wrapper.findAll('.suggestion-item');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should select suggestion when clicked', async () => {
      const brandInput = wrapper.find('#food-brand');

      await brandInput.setValue('ロイヤル');
      await brandInput.trigger('input');

      const firstSuggestion = wrapper.find('.suggestion-item');
      await firstSuggestion.trigger('click');

      expect(wrapper.find('.suggestions-dropdown').exists()).toBe(false);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });
    });

    it('should show validation errors for empty required fields', async () => {
      const form = wrapper.find('.food-form');
      await form.trigger('submit.prevent');

      await wrapper.vm.$nextTick();

      expect(wrapper.findAll('.form-error').length).toBeGreaterThan(0);
    });

    it('should validate food name is required', async () => {
      const nameInput = wrapper.find('#food-name');
      await nameInput.setValue('');

      const form = wrapper.find('.food-form');
      await form.trigger('submit.prevent');

      await wrapper.vm.$nextTick();

      const nameError = wrapper.find('[data-testid="name-error"]');
      expect(nameError.exists()).toBe(true);
    });

    it('should validate calories is positive number', async () => {
      const nameInput = wrapper.find('#food-name');
      const caloriesInput = wrapper.find('#food-calories');

      await nameInput.setValue('Test Food');
      await caloriesInput.setValue('-1');

      const form = wrapper.find('.food-form');
      await form.trigger('submit.prevent');

      await wrapper.vm.$nextTick();

      const caloriesError = wrapper.find('[data-testid="calories-error"]');
      expect(caloriesError.exists()).toBe(true);
    });

    it('should validate maximum field lengths', async () => {
      const nameInput = wrapper.find('#food-name');
      const longName = 'a'.repeat(101); // Exceeds 100 character limit

      await nameInput.setValue(longName);

      const form = wrapper.find('.food-form');
      await form.trigger('submit.prevent');

      await wrapper.vm.$nextTick();

      const nameError = wrapper.find('[data-testid="name-error"]');
      expect(nameError.exists()).toBe(true);
    });
  });

  describe('Form Actions', () => {
    beforeEach(() => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });
    });

    it('should emit close event when close button is clicked', async () => {
      const closeBtn = wrapper.find('.modal-close-btn');
      await closeBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close event when cancel button is clicked', async () => {
      const cancelBtn = wrapper
        .findAll('.btn--secondary')
        .find(btn => btn.text() === 'キャンセル');
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close event when clicking outside modal', async () => {
      const overlay = wrapper.find('.modal-overlay');
      await overlay.trigger('click.self');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should reset form when reset button is clicked', async () => {
      const nameInput = wrapper.find('#food-name');
      await nameInput.setValue('Test Food');

      const resetBtn = wrapper
        .findAll('.btn--secondary')
        .find(btn => btn.text() === 'リセット');
      await resetBtn.trigger('click');

      expect(wrapper.find('#food-name').element.value).toBe('');
    });

    it('should emit save event with form data when form is submitted', async () => {
      const nameInput = wrapper.find('#food-name');
      const typeSelect = wrapper.find('#food-type');
      const caloriesInput = wrapper.find('#food-calories');

      await nameInput.setValue('Test Food');
      await typeSelect.setValue(FoodType.DRY);
      await caloriesInput.setValue('3.5');

      const form = wrapper.find('.food-form');
      await form.trigger('submit.prevent');

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('save')).toBeTruthy();
      const saveEvent = wrapper.emitted('save')[0][0];
      expect(saveEvent.name).toBe('Test Food');
      expect(saveEvent.type).toBe(FoodType.DRY);
      expect(saveEvent.caloriesPerGram).toBe(3.5);
    });
  });

  describe('Edit Mode', () => {
    it('should show correct button text in edit mode', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
          food: mockFood,
        },
      });

      const submitBtn = wrapper.find('.btn--primary');
      expect(submitBtn.text()).toBe('更新');
    });

    it('should show correct button text in create mode', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });

      const submitBtn = wrapper.find('.btn--primary');
      expect(submitBtn.text()).toBe('追加');
    });

    it('should reset to food data when reset is clicked in edit mode', async () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
          food: mockFood,
        },
      });

      // Change a field
      const nameInput = wrapper.find('#food-name');
      await nameInput.setValue('Changed Name');

      // Click reset
      const resetBtn = wrapper
        .findAll('.btn--secondary')
        .find(btn => btn.text() === 'リセット');
      await resetBtn.trigger('click');

      // Should revert to original food data
      expect(wrapper.find('#food-name').element.value).toBe(mockFood.name);
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when submitting', async () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });

      // Set valid data
      await wrapper.find('#food-name').setValue('Test Food');
      await wrapper.find('#food-calories').setValue('3.5');

      // Set submitting state
      wrapper.vm.isSubmitting = true;
      await wrapper.vm.$nextTick();

      const buttons = wrapper.findAll('.btn');
      buttons.forEach((button) => {
        expect(button.attributes('disabled')).toBeDefined();
      });
    });

    it('should show loading text when submitting', async () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });

      wrapper.vm.isSubmitting = true;
      await wrapper.vm.$nextTick();

      const submitBtn = wrapper.find('.btn--primary');
      expect(submitBtn.text()).toBe('保存中...');
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-responsive classes', () => {
      wrapper = mount(FoodManagementForm, {
        props: {
          isOpen: true,
        },
      });

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-content').exists()).toBe(true);
      expect(wrapper.find('.food-form').exists()).toBe(true);
    });
  });
});
