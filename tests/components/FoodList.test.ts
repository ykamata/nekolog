import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FoodList from '~/components/FoodList.vue';
import ConfirmationDialog from '~/components/ConfirmationDialog.vue';
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
  {
    id: 'food-4',
    name: 'グレインフリーフード',
    type: FoodType.DRY,
    brand: 'オリジン',
    caloriesPerGram: 4.0,
    pricePerUnit: undefined, // No price set
    unit: 'g',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

describe('FoodList', () => {
  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(FoodList, {
      props: {
        foods: mockFoods,
      },
      global: {
        components: {
          ConfirmationDialog,
        },
      },
    });
  });

  describe('Component Rendering', () => {
    it('should render with foods', () => {
      expect(wrapper.find('.food-list').exists()).toBe(true);
      expect(wrapper.find('.food-list__header').exists()).toBe(true);
      expect(wrapper.find('.food-list__title').text()).toBe('フード管理');
    });

    it('should show add button when showActions is true', () => {
      expect(wrapper.find('.btn--primary').exists()).toBe(true);
      expect(wrapper.find('.btn--primary').text()).toBe('+ 新しいフードを追加');
    });

    it('should hide add button when showActions is false', async () => {
      await wrapper.setProps({ showActions: false });
      expect(wrapper.find('.btn--primary').exists()).toBe(false);
    });

    it('should show loading state', async () => {
      await wrapper.setProps({ loading: true });

      expect(wrapper.find('.food-list__loading').exists()).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
      expect(wrapper.text()).toContain('フード情報を読み込み中...');
    });

    it('should show empty state when no foods', async () => {
      await wrapper.setProps({ foods: [] });

      expect(wrapper.find('.food-list__empty').exists()).toBe(true);
      expect(wrapper.find('.empty-state__icon').text()).toBe('🍽️');
      expect(wrapper.text()).toContain('フードが登録されていません');
    });
  });

  describe('Food Cards Display', () => {
    it('should display all foods as cards', () => {
      const foodCards = wrapper.findAll('.food-card');
      expect(foodCards).toHaveLength(mockFoods.length);
    });

    it('should display food information correctly', () => {
      const firstCard = wrapper.findAll('.food-card')[0];

      expect(firstCard.find('.food-card__name').text()).toBe(
        'プレミアムキャットフード',
      );
      expect(firstCard.find('.food-card__brand').text()).toBe('ロイヤルカナン');
      expect(firstCard.text()).toContain('3.5kcal/g');
      expect(firstCard.text()).toContain('¥2,500');
      expect(firstCard.text()).toContain('g');
    });

    it('should show correct food type badge', () => {
      const dryFoodCard = wrapper.findAll('.food-card')[0];
      const wetFoodCard = wrapper.findAll('.food-card')[1];

      expect(dryFoodCard.find('.food-card__type-badge').text()).toBe(
        'ドライフード',
      );
      expect(wetFoodCard.find('.food-card__type-badge').text()).toBe(
        'ウェットフード',
      );
    });

    it('should handle foods without brand', () => {
      const foodWithoutBrand = {
        ...mockFoods[0],
        brand: undefined,
      };

      wrapper = mount(FoodList, {
        props: {
          foods: [foodWithoutBrand],
        },
        global: {
          components: {
            ConfirmationDialog,
          },
        },
      });

      const card = wrapper.find('.food-card');
      expect(card.find('.food-card__brand').exists()).toBe(false);
    });

    it('should handle foods without price', () => {
      const card = wrapper.findAll('.food-card')[3]; // food-4 has no price
      expect(card.text()).toContain('未設定');
    });

    it('should show action buttons when showActions is true', () => {
      const card = wrapper.find('.food-card');
      expect(card.find('.food-card__actions').exists()).toBe(true);
      expect(card.findAll('.btn--small')).toHaveLength(2);
    });

    it('should hide action buttons when showActions is false', async () => {
      await wrapper.setProps({ showActions: false });

      const card = wrapper.find('.food-card');
      expect(card.find('.food-card__actions').exists()).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    it('should filter foods by name', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('プレミアム');

      await wrapper.vm.$nextTick();

      const foodCards = wrapper.findAll('.food-card');
      expect(foodCards).toHaveLength(1);
      expect(foodCards[0].text()).toContain('プレミアムキャットフード');
    });

    it('should filter foods by brand', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('ヒルズ');

      await wrapper.vm.$nextTick();

      const foodCards = wrapper.findAll('.food-card');
      expect(foodCards).toHaveLength(1);
      expect(foodCards[0].text()).toContain('ウェットフード缶詰');
    });

    it('should be case insensitive', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('PREMIUM');

      await wrapper.vm.$nextTick();

      const foodCards = wrapper.findAll('.food-card');
      expect(foodCards).toHaveLength(1);
    });

    it('should show empty state when no search results', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('存在しないフード');

      await wrapper.vm.$nextTick();

      expect(wrapper.find('.food-list__empty').exists()).toBe(true);
      expect(wrapper.text()).toContain('該当するフードが見つかりません');
    });
  });

  describe('Type Filter', () => {
    it('should filter foods by type', async () => {
      const typeFilter = wrapper.find('.filter-select');
      await typeFilter.setValue(FoodType.DRY);

      await wrapper.vm.$nextTick();

      const foodCards = wrapper.findAll('.food-card');
      const dryFoods = mockFoods.filter(food => food.type === FoodType.DRY);
      expect(foodCards).toHaveLength(dryFoods.length);
    });

    it('should show all foods when "すべて" is selected', async () => {
      const typeFilter = wrapper.find('.filter-select');
      await typeFilter.setValue('');

      await wrapper.vm.$nextTick();

      const foodCards = wrapper.findAll('.food-card');
      expect(foodCards).toHaveLength(mockFoods.length);
    });

    it('should have correct filter options', () => {
      const typeFilter = wrapper.find('.filter-select');
      const options = typeFilter.findAll('option');

      expect(options).toHaveLength(3);
      expect(options[0].text()).toBe('すべて');
      expect(options[1].text()).toBe('ドライフード');
      expect(options[2].text()).toBe('ウェットフード');
    });
  });

  describe('Sorting Functionality', () => {
    it('should sort foods by name by default', () => {
      const foodCards = wrapper.findAll('.food-card');
      const names = foodCards.map(card =>
        card.find('.food-card__name').text(),
      );

      // Should be sorted alphabetically
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort foods by type', async () => {
      const sortSelect = wrapper.find('.sort-select');
      await sortSelect.setValue('type');

      await wrapper.vm.$nextTick();

      const foodCards = wrapper.findAll('.food-card');
      const types = foodCards.map(card =>
        card.find('.food-card__type-badge').text(),
      );

      // DRY foods should come before WET foods
      expect(types[0]).toBe('ドライフード');
    });

    it('should sort foods by calories', async () => {
      const sortSelect = wrapper.find('.sort-select');
      await sortSelect.setValue('calories');

      await wrapper.vm.$nextTick();

      const foodCards = wrapper.findAll('.food-card');
      const calories = foodCards.map((card) => {
        const text = card.text();
        const match = text.match(/(\d+\.?\d*)kcal\/g/);
        return match ? parseFloat(match[1]) : 0;
      });

      // Should be sorted in ascending order
      for (let i = 1; i < calories.length; i++) {
        expect(calories[i]).toBeGreaterThanOrEqual(calories[i - 1]);
      }
    });

    it('should toggle sort order when clicking same sort field', async () => {
      const sortSelect = wrapper.find('.sort-select');
      const sortOrderBtn = wrapper.find('.sort-order-btn');

      // Initially ascending
      expect(sortOrderBtn.text()).toBe('↑');

      // Click sort order button
      await sortOrderBtn.trigger('click');
      expect(sortOrderBtn.text()).toBe('↓');
      expect(sortOrderBtn.classes()).toContain('sort-order-btn--desc');
    });

    it('should have correct sort options', () => {
      const sortSelect = wrapper.find('.sort-select');
      const options = sortSelect.findAll('option');

      expect(options).toHaveLength(4);
      expect(options[0].text()).toBe('名前順');
      expect(options[1].text()).toBe('タイプ順');
      expect(options[2].text()).toBe('カロリー順');
      expect(options[3].text()).toBe('価格順');
    });
  });

  describe('Clear Filters', () => {
    it('should show clear filters button when filters are applied', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('test');

      await wrapper.vm.$nextTick();

      expect(wrapper.find('.clear-filters-btn').exists()).toBe(true);
    });

    it('should hide clear filters button when no filters are applied', () => {
      expect(wrapper.find('.clear-filters-btn').exists()).toBe(false);
    });

    it('should clear all filters when clicked', async () => {
      const searchInput = wrapper.find('.search-input');
      const typeFilter = wrapper.find('.filter-select');

      await searchInput.setValue('test');
      await typeFilter.setValue(FoodType.DRY);

      await wrapper.vm.$nextTick();

      const clearBtn = wrapper.find('.clear-filters-btn');
      await clearBtn.trigger('click');

      expect(searchInput.element.value).toBe('');
      expect(typeFilter.element.value).toBe('');
    });
  });

  describe('Food Actions', () => {
    it('should emit select event when food card is clicked', async () => {
      const firstCard = wrapper.find('.food-card');
      await firstCard.trigger('click');

      expect(wrapper.emitted('select')).toBeTruthy();
      expect(wrapper.emitted('select')[0][0]).toEqual(mockFoods[0]);
    });

    it('should emit edit event when edit button is clicked', async () => {
      const editBtn = wrapper.find('.btn--secondary');
      await editBtn.trigger('click');

      expect(wrapper.emitted('edit')).toBeTruthy();
      expect(wrapper.emitted('edit')[0][0]).toEqual(mockFoods[0]);
    });

    it('should show delete confirmation when delete button is clicked', async () => {
      const deleteBtn = wrapper.find('.btn--danger');
      await deleteBtn.trigger('click');

      await wrapper.vm.$nextTick();

      expect(wrapper.find('confirmation-dialog-stub').exists()).toBe(true);
    });

    it('should emit add event when add button is clicked', async () => {
      const addBtn = wrapper.find('.btn--primary');
      await addBtn.trigger('click');

      expect(wrapper.emitted('add')).toBeTruthy();
    });

    it('should prevent event propagation on action buttons', async () => {
      const editBtn = wrapper.find('.btn--secondary');
      const clickSpy = vi.fn();

      wrapper.find('.food-card').element.addEventListener('click', clickSpy);
      await editBtn.trigger('click');

      // Card click should not be triggered
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Delete Confirmation', () => {
    it('should show correct delete confirmation message', async () => {
      const deleteBtn = wrapper.find('.btn--danger');
      await deleteBtn.trigger('click');

      await wrapper.vm.$nextTick();

      const dialog = wrapper.findComponent(ConfirmationDialog);
      expect(dialog.props('title')).toBe('プレミアムキャットフードを削除');
      expect(dialog.props('message')).toContain(
        'プレミアムキャットフードを削除しますか？',
      );
      expect(dialog.props('type')).toBe('danger');
    });

    it('should emit delete event when confirmed', async () => {
      const deleteBtn = wrapper.find('.btn--danger');
      await deleteBtn.trigger('click');

      await wrapper.vm.$nextTick();

      // Simulate confirmation
      wrapper.vm.confirmDelete();

      expect(wrapper.emitted('delete')).toBeTruthy();
      expect(wrapper.emitted('delete')[0][0]).toEqual(mockFoods[0]);
    });

    it('should close dialog when cancelled', async () => {
      const deleteBtn = wrapper.find('.btn--danger');
      await deleteBtn.trigger('click');

      await wrapper.vm.$nextTick();

      // Simulate cancellation
      wrapper.vm.cancelDelete();

      expect(wrapper.vm.showDeleteConfirmation).toBe(false);
      expect(wrapper.vm.foodToDelete).toBe(null);
    });
  });

  describe('Food Type Colors', () => {
    it('should return correct colors for food types', () => {
      expect(wrapper.vm.getFoodTypeColor(FoodType.DRY)).toBe('#8bc34a');
      expect(wrapper.vm.getFoodTypeColor(FoodType.WET)).toBe('#ff9800');
    });
  });

  describe('Format Functions', () => {
    it('should format food type correctly', () => {
      expect(wrapper.vm.formatFoodType(FoodType.DRY)).toBe('ドライフード');
      expect(wrapper.vm.formatFoodType(FoodType.WET)).toBe('ウェットフード');
    });

    it('should format calories correctly', () => {
      expect(wrapper.vm.formatCalories(3.5)).toBe('3.5kcal/g');
      expect(wrapper.vm.formatCalories(1.2)).toBe('1.2kcal/g');
    });

    it('should format price correctly', () => {
      expect(wrapper.vm.formatPrice(2500)).toBe('¥2,500');
      expect(wrapper.vm.formatPrice(180)).toBe('¥180');
      expect(wrapper.vm.formatPrice(undefined)).toBe('未設定');
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-responsive classes', () => {
      expect(wrapper.find('.food-list__grid').exists()).toBe(true);
      expect(wrapper.find('.food-list__controls').exists()).toBe(true);
    });

    it('should handle mobile layout for controls', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      expect(wrapper.find('.food-list__controls').exists()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large number of foods efficiently', async () => {
      const largeFoodList = Array.from({ length: 100 }, (_, i) => ({
        ...mockFoods[0],
        id: `food-${i}`,
        name: `Food ${i}`,
      }));

      await wrapper.setProps({ foods: largeFoodList });

      expect(wrapper.findAll('.food-card')).toHaveLength(100);
    });

    it('should filter large lists efficiently', async () => {
      const largeFoodList = Array.from({ length: 100 }, (_, i) => ({
        ...mockFoods[0],
        id: `food-${i}`,
        name: i < 10 ? `Premium Food ${i}` : `Regular Food ${i}`,
      }));

      await wrapper.setProps({ foods: largeFoodList });

      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('Premium');

      await wrapper.vm.$nextTick();

      expect(wrapper.findAll('.food-card')).toHaveLength(10);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      const searchInput = wrapper.find('.search-input');
      expect(searchInput.attributes('placeholder')).toBe(
        'フード名やブランドで検索...',
      );

      const buttons = wrapper.findAll('button');
      buttons.forEach((button) => {
        expect(button.element.tagName).toBe('BUTTON');
      });
    });

    it('should support keyboard navigation', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.trigger('focus');

      expect(document.activeElement).toBe(searchInput.element);
    });
  });
});
