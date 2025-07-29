import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FoodSelector from '~/components/FoodSelector.vue';
import { FoodType } from '~/types/cat-meal';
import type { Food } from '~/types/cat-meal';

// Mock food data
const mockFoods: Food[] = [
  {
    id: 'food-1',
    name: 'プレミアムキャットフード',
    type: FoodType.DRY,
    brand: 'ロイヤルカナン',
    caloriesPerGram: 3.5,
    pricePerUnit: 2500,
    unit: 'g',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'food-2',
    name: 'ウェットフード缶詰',
    type: FoodType.WET,
    brand: 'ヒルズ',
    caloriesPerGram: 1.2,
    pricePerUnit: 180,
    unit: 'g',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'food-3',
    name: 'シニア用ドライフード',
    type: FoodType.DRY,
    brand: 'ピュリナ',
    caloriesPerGram: 3.2,
    pricePerUnit: 1800,
    unit: 'g',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

describe('FoodSelector', () => {
  let wrapper: any;

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => JSON.stringify([])),
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

    Object.defineProperty(document, 'querySelector', {
      value: vi.fn(() => ({
        contains: vi.fn(() => false),
      })),
      writable: true,
    });
  });

  describe('Component Rendering', () => {
    it('should render with default props', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
        },
      });

      expect(wrapper.find('.food-selector').exists()).toBe(true);
      expect(wrapper.find('.selected-food').exists()).toBe(true);
    });

    it('should show search controls when showSearch is true', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          showSearch: true,
        },
      });

      expect(wrapper.find('.search-container').exists()).toBe(true);
      expect(wrapper.find('.search-input').exists()).toBe(true);
    });

    it('should hide search controls when showSearch is false', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          showSearch: false,
        },
      });

      expect(wrapper.find('.search-container').exists()).toBe(false);
    });

    it('should show type filter when showTypeFilter is true', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          showTypeFilter: true,
        },
      });

      expect(wrapper.find('.filter-container').exists()).toBe(true);
      expect(wrapper.find('.type-filter').exists()).toBe(true);
    });

    it('should hide type filter when showTypeFilter is false', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          showTypeFilter: false,
        },
      });

      expect(wrapper.find('.filter-container').exists()).toBe(false);
    });
  });

  describe('Selected Food Display', () => {
    it('should show placeholder when no food is selected', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          placeholder: 'カスタムプレースホルダー',
        },
      });

      expect(wrapper.find('.selected-food-placeholder').text()).toBe(
        'カスタムプレースホルダー',
      );
    });

    it('should show selected food information', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          selectedFoodId: 'food-1',
        },
      });

      expect(wrapper.find('.selected-food-content').exists()).toBe(true);
      expect(wrapper.find('.selected-food-name').text()).toContain(
        'プレミアムキャットフード',
      );
      expect(wrapper.find('.selected-food-calories').text()).toBe('3.5kcal/g');
    });

    it('should show price when available', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          selectedFoodId: 'food-1',
        },
      });

      expect(wrapper.find('.selected-food-price').text()).toBe('¥2,500');
    });

    it('should be disabled when disabled prop is true', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          disabled: true,
        },
      });

      expect(wrapper.find('.selected-food--disabled').exists()).toBe(true);
      expect(
        wrapper.find('.search-input').attributes('disabled'),
      ).toBeDefined();
      expect(wrapper.find('.type-filter').attributes('disabled')).toBeDefined();
    });
  });

  describe('Dropdown Functionality', () => {
    beforeEach(() => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
        },
      });
    });

    it('should toggle dropdown when selected food is clicked', async () => {
      expect(wrapper.find('.dropdown-list').exists()).toBe(false);

      await wrapper.find('.selected-food').trigger('click');
      expect(wrapper.find('.dropdown-list').exists()).toBe(true);

      await wrapper.find('.selected-food').trigger('click');
      expect(wrapper.find('.dropdown-list').exists()).toBe(false);
    });

    it('should show loading state', async () => {
      await wrapper.setProps({ loading: true });
      await wrapper.find('.selected-food').trigger('click');

      expect(wrapper.find('.dropdown-loading').exists()).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    });

    it('should show empty state when no foods match filter', async () => {
      await wrapper.setProps({ foods: [] });
      await wrapper.find('.selected-food').trigger('click');

      expect(wrapper.find('.dropdown-empty').exists()).toBe(true);
      expect(wrapper.find('.empty-icon').text()).toBe('🍽️');
    });

    it('should display all foods in dropdown', async () => {
      await wrapper.find('.selected-food').trigger('click');

      const foodItems = wrapper.findAll('.food-item');
      expect(foodItems).toHaveLength(mockFoods.length);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          showSearch: true,
        },
      });
    });

    it('should filter foods by name', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('プレミアム');
      await searchInput.trigger('input');

      await wrapper.find('.selected-food').trigger('click');

      const foodItems = wrapper.findAll('.food-item');
      expect(foodItems).toHaveLength(1);
      expect(foodItems[0].text()).toContain('プレミアムキャットフード');
    });

    it('should filter foods by brand', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('ヒルズ');
      await searchInput.trigger('input');

      await wrapper.find('.selected-food').trigger('click');

      const foodItems = wrapper.findAll('.food-item');
      expect(foodItems).toHaveLength(1);
      expect(foodItems[0].text()).toContain('ウェットフード缶詰');
    });

    it('should emit search event when typing', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('test');
      await searchInput.trigger('input');

      expect(wrapper.emitted('search')).toBeTruthy();
      expect(wrapper.emitted('search')[0][0]).toBe('test');
    });

    it('should be case insensitive', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('PREMIUM');
      await searchInput.trigger('input');

      await wrapper.find('.selected-food').trigger('click');

      const foodItems = wrapper.findAll('.food-item');
      expect(foodItems).toHaveLength(1);
    });
  });

  describe('Type Filter Functionality', () => {
    beforeEach(() => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
          showTypeFilter: true,
        },
      });
    });

    it('should filter foods by type', async () => {
      const typeFilter = wrapper.find('.type-filter');
      await typeFilter.setValue(FoodType.DRY);
      await typeFilter.trigger('change');

      await wrapper.find('.selected-food').trigger('click');

      const foodItems = wrapper.findAll('.food-item');
      const dryFoods = mockFoods.filter(food => food.type === FoodType.DRY);
      expect(foodItems).toHaveLength(dryFoods.length);
    });

    it('should emit filter event when type changes', async () => {
      const typeFilter = wrapper.find('.type-filter');
      await typeFilter.setValue(FoodType.WET);
      await typeFilter.trigger('change');

      expect(wrapper.emitted('filter')).toBeTruthy();
      expect(wrapper.emitted('filter')[0][0]).toBe(FoodType.WET);
    });

    it('should show all foods when "すべて" is selected', async () => {
      const typeFilter = wrapper.find('.type-filter');
      await typeFilter.setValue('');
      await typeFilter.trigger('change');

      await wrapper.find('.selected-food').trigger('click');

      const foodItems = wrapper.findAll('.food-item');
      expect(foodItems).toHaveLength(mockFoods.length);
    });
  });

  describe('Food Selection', () => {
    beforeEach(() => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
        },
      });
    });

    it('should emit select event when food is clicked', async () => {
      await wrapper.find('.selected-food').trigger('click');

      const firstFoodItem = wrapper.find('.food-item');
      await firstFoodItem.trigger('click');

      expect(wrapper.emitted('select')).toBeTruthy();
      expect(wrapper.emitted('select')[0][0]).toEqual(mockFoods[0]);
    });

    it('should close dropdown after selection', async () => {
      await wrapper.find('.selected-food').trigger('click');
      expect(wrapper.find('.dropdown-list').exists()).toBe(true);

      const firstFoodItem = wrapper.find('.food-item');
      await firstFoodItem.trigger('click');

      expect(wrapper.find('.dropdown-list').exists()).toBe(false);
    });

    it('should show selected badge for currently selected food', async () => {
      await wrapper.setProps({ selectedFoodId: 'food-1' });
      await wrapper.find('.selected-food').trigger('click');

      const selectedItem = wrapper
        .findAll('.food-item')
        .find(item => item.classes().includes('food-item--selected'));
      expect(selectedItem.exists()).toBe(true);
      expect(selectedItem.find('.selected-badge').exists()).toBe(true);
    });
  });

  describe('Recent Selections', () => {
    beforeEach(() => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
        },
      });
    });

    it('should add selected food to recent selections', async () => {
      await wrapper.find('.selected-food').trigger('click');

      const firstFoodItem = wrapper.find('.food-item');
      await firstFoodItem.trigger('click');

      // Check if localStorage.setItem was called
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should show recent section when there are recent selections', async () => {
      // Mock localStorage to return recent selections
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify(['food-1']),
      );

      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
        },
      });

      await wrapper.find('.selected-food').trigger('click');

      expect(wrapper.find('.recent-section').exists()).toBe(true);
      expect(wrapper.find('.recent-badge').exists()).toBe(true);
    });

    it('should limit recent selections to 5 items', async () => {
      // Simulate selecting multiple foods
      await wrapper.find('.selected-food').trigger('click');

      for (let i = 0; i < 6; i++) {
        const foodItem = wrapper.findAll('.food-item')[i % mockFoods.length];
        await foodItem.trigger('click');
        await wrapper.find('.selected-food').trigger('click');
      }

      // Check that recent selections are limited
      expect(wrapper.vm.recentSelections.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Food Display Formatting', () => {
    beforeEach(() => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
        },
      });
    });

    it('should format food display correctly', async () => {
      await wrapper.find('.selected-food').trigger('click');

      const foodItems = wrapper.findAll('.food-item');
      const firstItem = foodItems[0];

      expect(firstItem.text()).toContain(
        'ロイヤルカナン プレミアムキャットフード [ドライ]',
      );
      expect(firstItem.text()).toContain('3.5kcal/g');
      expect(firstItem.text()).toContain('¥2,500');
    });

    it('should handle foods without brand', async () => {
      const foodsWithoutBrand = [
        {
          ...mockFoods[0],
          brand: undefined,
        },
      ];

      await wrapper.setProps({ foods: foodsWithoutBrand });
      await wrapper.find('.selected-food').trigger('click');

      const foodItem = wrapper.find('.food-item');
      expect(foodItem.text()).toContain('プレミアムキャットフード [ドライ]');
      expect(foodItem.text()).not.toContain('undefined');
    });

    it('should handle foods without price', async () => {
      const foodsWithoutPrice = [
        {
          ...mockFoods[0],
          pricePerUnit: undefined,
        },
      ];

      await wrapper.setProps({ foods: foodsWithoutPrice });
      await wrapper.find('.selected-food').trigger('click');

      const foodItem = wrapper.find('.food-item');
      expect(foodItem.find('.food-item-price').exists()).toBe(false);
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
        },
      });
    });

    it('should handle focus events on search input', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.trigger('focus');

      expect(searchInput.element).toBe(document.activeElement);
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-responsive classes', () => {
      wrapper = mount(FoodSelector, {
        props: {
          foods: mockFoods,
        },
      });

      expect(wrapper.find('.food-selector').exists()).toBe(true);
      expect(wrapper.find('.selector-controls').exists()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => {
        wrapper = mount(FoodSelector, {
          props: {
            foods: mockFoods,
          },
        });
      }).not.toThrow();
    });

    it('should handle invalid JSON in localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json');

      expect(() => {
        wrapper = mount(FoodSelector, {
          props: {
            foods: mockFoods,
          },
        });
      }).not.toThrow();
    });
  });
});
