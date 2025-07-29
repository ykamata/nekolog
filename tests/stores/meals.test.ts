import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMealsStore } from '~/stores/meals';
import type {
  MealRecord,
  MealRecordInput,
  MealRecordUpdate,
} from '~/types/cat-meal';

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('useMealsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockMeal: MealRecord = {
    id: '1',
    catId: 'cat1',
    foodId: 'food1',
    quantity: 50,
    calories: 175,
    mealTime: new Date('2023-01-01T12:00:00Z'),
    notes: 'Test meal',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockMealInput: MealRecordInput = {
    catId: 'cat1',
    foodId: 'food1',
    quantity: 30,
    calories: 105,
    mealTime: new Date('2023-01-02T12:00:00Z'),
    notes: 'New meal',
  };

  const mockApiResponse = {
    data: [mockMeal],
    pagination: {
      total: 1,
      page: 1,
      pageSize: 20,
      hasNext: false,
      hasPrevious: false,
    },
  };

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useMealsStore();

      expect(store.meals).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.pagination.currentPage).toBe(1);
      expect(store.pagination.pageSize).toBe(20);
      expect(store.pagination.totalCount).toBe(0);
      expect(store.realTimeEnabled).toBe(true);
      expect(store.cache.ttl).toBe(2 * 60 * 1000);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      const store = useMealsStore();
      const meal2 = { ...mockMeal, id: '2', catId: 'cat2', foodId: 'food2' };
      store.meals = [mockMeal, meal2];
    });

    it('should get meal by id', () => {
      const store = useMealsStore();

      expect(store.getMealById('1')).toEqual(mockMeal);
      expect(store.getMealById('nonexistent')).toBeUndefined();
    });

    it('should get meals by cat', () => {
      const store = useMealsStore();

      expect(store.getMealsByCat('cat1')).toEqual([mockMeal]);
      expect(store.getMealsByCat('cat2')).toHaveLength(1);
    });

    it('should get meals by food', () => {
      const store = useMealsStore();

      expect(store.getMealsByFood('food1')).toEqual([mockMeal]);
    });

    it('should get meals by date range', () => {
      const store = useMealsStore();
      const startDate = new Date('2022-12-31');
      const endDate = new Date('2023-01-02');

      expect(store.getMealsByDateRange(startDate, endDate)).toHaveLength(2);
      expect(store.getMealsByDateRange(startDate, endDate)).toContainEqual(
        mockMeal,
      );
    });

    it('should get todays meals', () => {
      const store = useMealsStore();
      const todayMeal = {
        ...mockMeal,
        id: '3',
        mealTime: new Date(),
      };
      store.meals = [mockMeal, todayMeal];

      expect(store.todaysMeals).toEqual([todayMeal]);
    });

    it('should get recent meals', () => {
      const store = useMealsStore();
      const meals = Array.from({ length: 15 }, (_, i) => ({
        ...mockMeal,
        id: `meal${i}`,
        mealTime: new Date(Date.now() - i * 60000), // Each meal 1 minute apart
      }));
      store.meals = meals;

      expect(store.recentMeals).toHaveLength(10);
      expect(store.recentMeals[0].id).toBe('meal0'); // Most recent first
    });

    it('should calculate total pages', () => {
      const store = useMealsStore();
      store.pagination.totalCount = 45;
      store.pagination.pageSize = 20;

      expect(store.totalPages).toBe(3);
    });
  });

  describe('fetchMeals', () => {
    it('should fetch meals successfully', async () => {
      const store = useMealsStore();
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      const result = await store.fetchMeals();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/meals?'),
      );
      expect(store.meals).toHaveLength(1);
      expect(store.meals[0].id).toBe('1');
      expect(store.pagination.totalCount).toBe(1);
      expect(store.loading).toBe(false);
      expect(result).toEqual(store.meals);
    });

    it('should use cache when valid', async () => {
      const store = useMealsStore();
      store.meals = [mockMeal];
      store.cache.lastFetch = new Date();

      const result = await store.fetchMeals();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual([mockMeal]);
    });

    it('should apply filters', async () => {
      const store = useMealsStore();
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      const filter = {
        catId: 'cat1',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        foodType: 'DRY' as const,
      };

      await store.fetchMeals(filter);

      const expectedUrl = expect.stringContaining('catId=cat1');
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
    });

    it('should handle fetch error', async () => {
      const store = useMealsStore();
      const error = new Error('Fetch failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.fetchMeals()).rejects.toThrow('Fetch failed');
      expect(store.error).toBe('Fetch failed');
    });
  });

  describe('createMeal', () => {
    it('should create meal successfully', async () => {
      const store = useMealsStore();
      mockFetch.mockResolvedValueOnce({ data: mockMeal });

      const result = await store.createMeal(mockMealInput);

      expect(mockFetch).toHaveBeenCalledWith('/api/meals', {
        method: 'POST',
        body: mockMealInput,
      });
      expect(store.meals[0]).toEqual(result);
      expect(store.pagination.totalCount).toBe(1);
    });

    it('should handle create error', async () => {
      const store = useMealsStore();
      const error = new Error('Create failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.createMeal(mockMealInput)).rejects.toThrow(
        'Create failed',
      );
      expect(store.error).toBe('Create failed');
    });
  });

  describe('updateMeal', () => {
    it('should update meal successfully', async () => {
      const store = useMealsStore();
      store.meals = [mockMeal];
      const updatedMeal = { ...mockMeal, quantity: 60 };
      mockFetch.mockResolvedValueOnce({ data: updatedMeal });

      const mealUpdate: MealRecordUpdate = { quantity: 60 };
      const result = await store.updateMeal('1', mealUpdate);

      expect(mockFetch).toHaveBeenCalledWith('/api/meals/1', {
        method: 'PUT',
        body: mealUpdate,
      });
      expect(store.meals[0].quantity).toBe(60);
      expect(result.quantity).toBe(60);
    });
  });

  describe('deleteMeal', () => {
    it('should delete meal successfully', async () => {
      const store = useMealsStore();
      store.meals = [mockMeal];
      store.pagination.totalCount = 1;
      mockFetch.mockResolvedValueOnce(undefined);

      await store.deleteMeal('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/meals/1', {
        method: 'DELETE',
      });
      expect(store.meals).toHaveLength(0);
      expect(store.pagination.totalCount).toBe(0);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      const store = useMealsStore();
      store.pagination = {
        currentPage: 2,
        pageSize: 20,
        totalCount: 100,
        hasNextPage: true,
        hasPreviousPage: true,
      };
      mockFetch.mockResolvedValue(mockApiResponse);
    });

    it('should go to next page', async () => {
      const store = useMealsStore();

      await store.nextPage();

      expect(store.pagination.currentPage).toBe(1); // Updated from API response
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should go to previous page', async () => {
      const store = useMealsStore();

      await store.previousPage();

      expect(store.pagination.currentPage).toBe(1);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should go to specific page', async () => {
      const store = useMealsStore();

      await store.goToPage(4);

      expect(store.pagination.currentPage).toBe(1); // Updated from API response
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should not go to invalid page', async () => {
      const store = useMealsStore();
      const originalPage = store.pagination.currentPage;

      await store.goToPage(0);
      await store.goToPage(100);

      expect(store.pagination.currentPage).toBe(originalPage);
    });

    it('should set page size', () => {
      const store = useMealsStore();

      store.setPageSize(50);

      expect(store.pagination.pageSize).toBe(50);
      expect(store.pagination.currentPage).toBe(1);
      expect(store.filters.limit).toBe(50);
      expect(store.filters.offset).toBe(0);
    });
  });

  describe('filters', () => {
    it('should set filters', () => {
      const store = useMealsStore();
      const filters = { catId: 'cat1', startDate: new Date() };

      store.setFilters(filters);

      expect(store.filters).toEqual({ ...filters, offset: 0 });
      expect(store.pagination.currentPage).toBe(1);
    });

    it('should clear filters', () => {
      const store = useMealsStore();
      store.filters = { catId: 'cat1' };

      store.clearFilters();

      expect(store.filters).toEqual({});
    });
  });

  describe('real-time updates', () => {
    it('should enable real-time updates', () => {
      const store = useMealsStore();
      store.realTimeEnabled = false;

      store.enableRealTimeUpdates();

      expect(store.realTimeEnabled).toBe(true);
    });

    it('should disable real-time updates', () => {
      const store = useMealsStore();

      store.disableRealTimeUpdates();

      expect(store.realTimeEnabled).toBe(false);
    });

    it('should refresh data', async () => {
      const store = useMealsStore();
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      await store.refreshData();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('bulk operations', () => {
    it('should bulk delete meals', async () => {
      const store = useMealsStore();
      const meal2 = { ...mockMeal, id: '2' };
      store.meals = [mockMeal, meal2];
      store.pagination.totalCount = 2;
      mockFetch.mockResolvedValueOnce(undefined);

      await store.bulkDeleteMeals(['1', '2']);

      expect(mockFetch).toHaveBeenCalledWith('/api/meals/bulk-delete', {
        method: 'POST',
        body: { ids: ['1', '2'] },
      });
      expect(store.meals).toHaveLength(0);
      expect(store.pagination.totalCount).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should add meal to state', () => {
      const store = useMealsStore();

      store.addMealToState(mockMeal);

      expect(store.meals).toHaveLength(1);
      expect(store.meals[0]).toEqual(mockMeal);
      expect(store.lastUpdate).toBeTruthy();
    });

    it('should update existing meal in state', () => {
      const store = useMealsStore();
      store.meals = [mockMeal];
      const updatedMeal = { ...mockMeal, quantity: 100 };

      store.addMealToState(updatedMeal);

      expect(store.meals).toHaveLength(1);
      expect(store.meals[0].quantity).toBe(100);
    });

    it('should remove meal from state', () => {
      const store = useMealsStore();
      store.meals = [mockMeal];
      store.pagination.totalCount = 1;

      store.removeMealFromState('1');

      expect(store.meals).toHaveLength(0);
      expect(store.pagination.totalCount).toBe(0);
    });
  });
});
