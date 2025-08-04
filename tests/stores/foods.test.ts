import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFoodsStore } from '~/stores/foods';
import type { Food, FoodInput, FoodUpdate, FoodType } from '~/types/cat-meal';

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('useFoodsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockDryFood: Food = {
    id: '1',
    name: 'Dry Food',
    type: 'DRY' as FoodType,
    brand: 'Test Brand',
    caloriesPerGram: 3.5,
    pricePerUnit: 1000,
    unit: 'g',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockWetFood: Food = {
    id: '2',
    name: 'Wet Food',
    type: 'WET' as FoodType,
    brand: 'Test Brand',
    caloriesPerGram: 1.2,
    pricePerUnit: 200,
    unit: 'g',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockFoodInput: FoodInput = {
    name: 'New Food',
    type: 'DRY' as FoodType,
    brand: 'New Brand',
    caloriesPerGram: 4.0,
    pricePerUnit: 1200,
  };

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useFoodsStore();

      expect(store.foods).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.searchQuery).toBe('');
      expect(store.selectedType).toBe(null);
      expect(store.cache.ttl).toBe(10 * 60 * 1000);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      const store = useFoodsStore();
      store.foods = [mockDryFood, mockWetFood];
    });

    it('should get food by id', () => {
      const store = useFoodsStore();

      expect(store.getFoodById('1')).toEqual(mockDryFood);
      expect(store.getFoodById('nonexistent')).toBeUndefined();
    });

    it('should filter foods by search query', () => {
      const store = useFoodsStore();
      store.searchQuery = 'dry';

      expect(store.filteredFoods).toEqual([mockDryFood]);
    });

    it('should filter foods by type', () => {
      const store = useFoodsStore();
      store.selectedType = 'WET';

      expect(store.filteredFoods).toEqual([mockWetFood]);
    });

    it('should filter foods by both search and type', () => {
      const store = useFoodsStore();
      store.searchQuery = 'wet';
      store.selectedType = 'WET';

      expect(store.filteredFoods).toEqual([mockWetFood]);
    });

    it('should get foods by type', () => {
      const store = useFoodsStore();

      expect(store.foodsByType('DRY')).toEqual([mockDryFood]);
      expect(store.foodsByType('WET')).toEqual([mockWetFood]);
    });

    it('should get dry foods', () => {
      const store = useFoodsStore();

      expect(store.dryFoods).toEqual([mockDryFood]);
    });

    it('should get wet foods', () => {
      const store = useFoodsStore();

      expect(store.wetFoods).toEqual([mockWetFood]);
    });

    it('should get unique brands', () => {
      const store = useFoodsStore();
      const food3 = { ...mockDryFood, id: '3', brand: 'Another Brand' };
      store.foods = [mockDryFood, mockWetFood, food3];

      expect(store.uniqueBrands).toEqual(['Another Brand', 'Test Brand']);
    });
  });

  describe('fetchFoods', () => {
    it('should fetch foods successfully', async () => {
      const store = useFoodsStore();
      mockFetch.mockResolvedValueOnce([mockDryFood, mockWetFood]);

      const result = await store.fetchFoods();

      expect(mockFetch).toHaveBeenCalledWith('/api/foods');
      expect(store.foods).toHaveLength(2);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(result).toEqual(store.filteredFoods);
    });

    it('should use cache when valid', async () => {
      const store = useFoodsStore();
      store.foods = [mockDryFood];
      store.cache.lastFetch = new Date();

      const result = await store.fetchFoods();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual([mockDryFood]);
    });

    it('should apply filters in API call', async () => {
      const store = useFoodsStore();
      mockFetch.mockResolvedValueOnce([mockDryFood]);

      await store.fetchFoods({
        name: 'test',
        type: 'DRY',
        brand: 'Test Brand',
        limit: 10,
        offset: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/foods?name=test&type=DRY&brand=Test+Brand&limit=10&offset=5',
      );
    });

    it('should handle fetch error', async () => {
      const store = useFoodsStore();
      const error = new Error('Fetch failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.fetchFoods()).rejects.toThrow('Fetch failed');
      expect(store.error).toBe('Fetch failed');
    });
  });

  describe('createFood', () => {
    it('should create food successfully', async () => {
      const store = useFoodsStore();
      mockFetch.mockResolvedValueOnce({ data: mockDryFood });

      const result = await store.createFood(mockFoodInput);

      expect(mockFetch).toHaveBeenCalledWith('/api/foods', {
        method: 'POST',
        body: mockFoodInput,
      });
      expect(store.foods).toHaveLength(1);
      expect(store.foods[0]).toEqual(result);
    });

    it('should handle create error', async () => {
      const store = useFoodsStore();
      const error = new Error('Create failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.createFood(mockFoodInput)).rejects.toThrow(
        'Create failed',
      );
      expect(store.error).toBe('Create failed');
    });
  });

  describe('updateFood', () => {
    it('should update food successfully', async () => {
      const store = useFoodsStore();
      store.foods = [mockDryFood];
      const updatedFood = { ...mockDryFood, name: 'Updated Food' };
      mockFetch.mockResolvedValueOnce(updatedFood);

      const foodUpdate: FoodUpdate = { name: 'Updated Food' };
      const result = await store.updateFood('1', foodUpdate);

      expect(mockFetch).toHaveBeenCalledWith('/api/foods/1', {
        method: 'PUT',
        body: foodUpdate,
      });
      expect(store.foods[0].name).toBe('Updated Food');
      expect(result.name).toBe('Updated Food');
    });
  });

  describe('deleteFood', () => {
    it('should delete food successfully', async () => {
      const store = useFoodsStore();
      store.foods = [mockDryFood];
      mockFetch.mockResolvedValueOnce(undefined);

      await store.deleteFood('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/foods/1', {
        method: 'DELETE',
      });
      expect(store.foods).toHaveLength(0);
    });
  });

  describe('search and filter actions', () => {
    it('should set search query', () => {
      const store = useFoodsStore();

      store.setSearchQuery('test query');

      expect(store.searchQuery).toBe('test query');
    });

    it('should set selected type', () => {
      const store = useFoodsStore();

      store.setSelectedType('DRY');

      expect(store.selectedType).toBe('DRY');
    });

    it('should clear filters', () => {
      const store = useFoodsStore();
      store.searchQuery = 'test';
      store.selectedType = 'DRY';

      store.clearFilters();

      expect(store.searchQuery).toBe('');
      expect(store.selectedType).toBe(null);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      const store = useFoodsStore();
      store.foods = [mockDryFood, mockWetFood];
    });

    it('should search foods by name', () => {
      const store = useFoodsStore();

      const result = store.searchFoodsByName('dry');

      expect(result).toEqual([mockDryFood]);
    });

    it('should search foods by brand', () => {
      const store = useFoodsStore();

      const result = store.searchFoodsByName('Test Brand');

      expect(result).toEqual([mockDryFood, mockWetFood]);
    });

    it('should get foods by brand', () => {
      const store = useFoodsStore();

      const result = store.getFoodsByBrand('Test Brand');

      expect(result).toEqual([mockDryFood, mockWetFood]);
    });

    it('should add food to state', () => {
      const store = useFoodsStore();
      const newFood = { ...mockDryFood, id: '3', name: 'New Food' };

      store.addFoodToState(newFood);

      expect(store.foods).toHaveLength(3);
      expect(store.foods.find(f => f.id === '3')).toEqual(newFood);
    });

    it('should update existing food in state', () => {
      const store = useFoodsStore();
      const updatedFood = { ...mockDryFood, name: 'Updated' };

      store.addFoodToState(updatedFood);

      expect(store.foods.find(f => f.id === '1')?.name).toBe('Updated');
    });

    it('should remove food from state', () => {
      const store = useFoodsStore();

      store.removeFoodFromState('1');

      expect(store.foods.find(f => f.id === '1')).toBeUndefined();
    });
  });
});
