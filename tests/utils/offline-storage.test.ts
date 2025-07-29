import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineStorage } from '~/utils/offline-storage';
import type { Cat, Food, MealRecord } from '~/types/cat-meal';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('OfflineStorage', () => {
  let offlineStorage: OfflineStorage;

  const mockCat: Cat = {
    id: 'cat-1',
    name: 'Test Cat',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFood: Food = {
    id: 'food-1',
    name: 'Test Food',
    type: 'DRY',
    brand: 'Test Brand',
    caloriesPerGram: 3.5,
    pricePerUnit: 1000,
    unit: 'g',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMeal: MealRecord = {
    id: 'meal-1',
    catId: 'cat-1',
    foodId: 'food-1',
    quantity: 50,
    calories: 175,
    mealTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Reset singleton instance
    // @ts-ignore - accessing private property for testing
    OfflineStorage.instance = undefined;

    offlineStorage = OfflineStorage.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = OfflineStorage.getInstance();
      const instance2 = OfflineStorage.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadFromStorage', () => {
    it('should load default data when localStorage is empty', () => {
      const data = offlineStorage.getData();

      expect(data.cats).toEqual([]);
      expect(data.foods).toEqual([]);
      expect(data.meals).toEqual([]);
      expect(data.pendingSync.cats).toEqual([]);
      expect(data.pendingSync.foods).toEqual([]);
      expect(data.pendingSync.meals).toEqual([]);
    });

    it('should load data from localStorage when available', () => {
      const storedData = {
        version: '1.0',
        data: {
          cats: [mockCat],
          foods: [mockFood],
          meals: [mockMeal],
          lastSync: new Date().toISOString(),
          pendingSync: {
            cats: [],
            foods: [],
            meals: [],
          },
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      // Create new instance to trigger loading
      // @ts-ignore
      OfflineStorage.instance = undefined;
      const newStorage = OfflineStorage.getInstance();
      const data = newStorage.getData();

      expect(data.cats).toHaveLength(1);
      expect(data.cats[0].name).toBe('Test Cat');
      expect(data.foods).toHaveLength(1);
      expect(data.meals).toHaveLength(1);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      // @ts-ignore
      OfflineStorage.instance = undefined;
      const newStorage = OfflineStorage.getInstance();
      const data = newStorage.getData();

      expect(data.cats).toEqual([]);
      expect(data.foods).toEqual([]);
      expect(data.meals).toEqual([]);
    });
  });

  describe('updateFromServer', () => {
    it('should update local data with server data', () => {
      const cats = [mockCat];
      const foods = [mockFood];
      const meals = [mockMeal];

      offlineStorage.updateFromServer(cats, foods, meals);

      const data = offlineStorage.getData();
      expect(data.cats).toEqual(cats);
      expect(data.foods).toEqual(foods);
      expect(data.meals).toEqual(meals);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should filter meals older than 1 month', () => {
      const oldMeal = {
        ...mockMeal,
        id: 'old-meal',
        mealTime: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      };
      const recentMeal = {
        ...mockMeal,
        id: 'recent-meal',
        mealTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      };

      offlineStorage.updateFromServer(
        [mockCat],
        [mockFood],
        [oldMeal, recentMeal],
      );

      const data = offlineStorage.getData();
      expect(data.meals).toHaveLength(1);
      expect(data.meals[0].id).toBe('recent-meal');
    });
  });

  describe('offline operations', () => {
    describe('addCatOffline', () => {
      it('should add cat with local ID and pending sync', () => {
        const catInput = {
          name: 'New Cat',
          birthdate: new Date('2021-01-01'),
          weight: 3.5,
        };

        const localId = offlineStorage.addCatOffline(catInput);

        expect(localId).toMatch(/^local-cat-/);

        const cats = offlineStorage.getCats();
        expect(cats).toHaveLength(1);
        expect(cats[0].name).toBe('New Cat');
        expect(cats[0].id).toBe(localId);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.cats).toHaveLength(1);
        expect(pendingData.cats[0].action).toBe('create');
        expect(pendingData.cats[0].localId).toBe(localId);
      });
    });

    describe('addFoodOffline', () => {
      it('should add food with local ID and pending sync', () => {
        const foodInput = {
          name: 'New Food',
          type: 'WET' as const,
          brand: 'New Brand',
          caloriesPerGram: 2.5,
          pricePerUnit: 800,
          unit: 'g',
        };

        const localId = offlineStorage.addFoodOffline(foodInput);

        expect(localId).toMatch(/^local-food-/);

        const foods = offlineStorage.getFoods();
        expect(foods).toHaveLength(1);
        expect(foods[0].name).toBe('New Food');
        expect(foods[0].id).toBe(localId);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.foods).toHaveLength(1);
        expect(pendingData.foods[0].action).toBe('create');
        expect(pendingData.foods[0].localId).toBe(localId);
      });
    });

    describe('addMealOffline', () => {
      it('should add meal with local ID and pending sync', () => {
        const mealInput = {
          catId: 'cat-1',
          foodId: 'food-1',
          quantity: 60,
          calories: 210,
          mealTime: new Date(),
        };

        const localId = offlineStorage.addMealOffline(mealInput);

        expect(localId).toMatch(/^local-meal-/);

        const meals = offlineStorage.getMeals();
        expect(meals).toHaveLength(1);
        expect(meals[0].quantity).toBe(60);
        expect(meals[0].id).toBe(localId);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.meals).toHaveLength(1);
        expect(pendingData.meals[0].action).toBe('create');
        expect(pendingData.meals[0].localId).toBe(localId);
      });
    });

    describe('updateOffline', () => {
      beforeEach(() => {
        offlineStorage.updateFromServer([mockCat], [mockFood], [mockMeal]);
      });

      it('should update cat and add to pending sync', () => {
        const updates = { name: 'Updated Cat', weight: 5.0 };

        offlineStorage.updateOffline('cat', 'cat-1', updates);

        const cats = offlineStorage.getCats();
        expect(cats[0].name).toBe('Updated Cat');
        expect(cats[0].weight).toBe(5.0);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.cats).toHaveLength(1);
        expect(pendingData.cats[0].action).toBe('update');
      });

      it('should update food and add to pending sync', () => {
        const updates = { name: 'Updated Food', caloriesPerGram: 4.0 };

        offlineStorage.updateOffline('food', 'food-1', updates);

        const foods = offlineStorage.getFoods();
        expect(foods[0].name).toBe('Updated Food');
        expect(foods[0].caloriesPerGram).toBe(4.0);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.foods).toHaveLength(1);
        expect(pendingData.foods[0].action).toBe('update');
      });

      it('should update meal and add to pending sync', () => {
        const updates = { quantity: 70, calories: 245 };

        offlineStorage.updateOffline('meal', 'meal-1', updates);

        const meals = offlineStorage.getMeals();
        expect(meals[0].quantity).toBe(70);
        expect(meals[0].calories).toBe(245);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.meals).toHaveLength(1);
        expect(pendingData.meals[0].action).toBe('update');
      });
    });

    describe('deleteOffline', () => {
      beforeEach(() => {
        offlineStorage.updateFromServer([mockCat], [mockFood], [mockMeal]);
      });

      it('should delete cat and add to pending sync', () => {
        offlineStorage.deleteOffline('cat', 'cat-1');

        const cats = offlineStorage.getCats();
        expect(cats).toHaveLength(0);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.cats).toHaveLength(1);
        expect(pendingData.cats[0].action).toBe('delete');
        expect(pendingData.cats[0].data.id).toBe('cat-1');
      });

      it('should delete food and add to pending sync', () => {
        offlineStorage.deleteOffline('food', 'food-1');

        const foods = offlineStorage.getFoods();
        expect(foods).toHaveLength(0);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.foods).toHaveLength(1);
        expect(pendingData.foods[0].action).toBe('delete');
      });

      it('should delete meal and add to pending sync', () => {
        offlineStorage.deleteOffline('meal', 'meal-1');

        const meals = offlineStorage.getMeals();
        expect(meals).toHaveLength(0);

        const pendingData = offlineStorage.getPendingSyncData();
        expect(pendingData.meals).toHaveLength(1);
        expect(pendingData.meals[0].action).toBe('delete');
      });
    });
  });

  describe('getMeals with filtering', () => {
    beforeEach(() => {
      // Reset the singleton instance to ensure clean state
      // @ts-ignore - accessing private property for testing
      OfflineStorage.instance = undefined;
      offlineStorage = OfflineStorage.getInstance();

      const now = new Date();
      const meals = [
        {
          ...mockMeal,
          id: 'meal-1',
          catId: 'cat-1',
          mealTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        },
        {
          ...mockMeal,
          id: 'meal-2',
          catId: 'cat-2',
          mealTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          ...mockMeal,
          id: 'meal-3',
          catId: 'cat-1',
          mealTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
      ];
      offlineStorage.updateFromServer([mockCat], [mockFood], meals);
    });

    it('should filter meals by catId', () => {
      const meals = offlineStorage.getMeals('cat-1');
      expect(meals).toHaveLength(2);
      expect(meals.every(meal => meal.catId === 'cat-1')).toBe(true);
    });

    it('should filter meals by date range', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const endDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const meals = offlineStorage.getMeals(undefined, startDate, endDate);
      expect(meals).toHaveLength(2);
    });

    it('should filter meals by catId and date range', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const endDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const meals = offlineStorage.getMeals('cat-1', startDate, endDate);
      expect(meals).toHaveLength(1);
      expect(meals[0].id).toBe('meal-3');
    });

    it('should sort meals by mealTime descending', () => {
      const meals = offlineStorage.getMeals();
      expect(meals).toHaveLength(3);
      expect(new Date(meals[0].mealTime).getTime()).toBeGreaterThan(
        new Date(meals[1].mealTime).getTime(),
      );
    });
  });

  describe('sync management', () => {
    it('should clear pending sync data', () => {
      offlineStorage.addCatOffline({ name: 'Test Cat' });
      offlineStorage.addFoodOffline({
        name: 'Test Food',
        type: 'DRY',
        caloriesPerGram: 3.0,
      });

      let pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.cats).toHaveLength(1);
      expect(pendingData.foods).toHaveLength(1);

      offlineStorage.clearPendingSync();

      pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.cats).toHaveLength(0);
      expect(pendingData.foods).toHaveLength(0);
      expect(pendingData.meals).toHaveLength(0);
    });

    it('should remove specific pending sync item', () => {
      const localId = offlineStorage.addCatOffline({ name: 'Test Cat' });

      let pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.cats).toHaveLength(1);

      offlineStorage.removePendingSyncItem('cat', localId);

      pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.cats).toHaveLength(0);
    });

    it('should update local ID to server ID', () => {
      const localId = offlineStorage.addCatOffline({ name: 'Test Cat' });

      let cats = offlineStorage.getCats();
      expect(cats[0].id).toBe(localId);

      offlineStorage.updateLocalToServerId('cat', localId, 'server-cat-1');

      cats = offlineStorage.getCats();
      expect(cats[0].id).toBe('server-cat-1');
    });
  });

  describe('utility methods', () => {
    it('should get last sync time', () => {
      const now = new Date();
      offlineStorage.updateFromServer([mockCat], [mockFood], [mockMeal]);

      const lastSync = offlineStorage.getLastSyncTime();
      expect(lastSync.getTime()).toBeCloseTo(now.getTime(), -2); // Within 100ms
    });

    it('should detect stale data', () => {
      // Fresh data
      offlineStorage.updateFromServer([mockCat], [mockFood], [mockMeal]);
      expect(offlineStorage.isDataStale()).toBe(false);

      // Mock old data
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      // @ts-expect-error - accessing private property for testing
      offlineStorage.data.lastSync = oldDate;
      expect(offlineStorage.isDataStale()).toBe(true);
    });

    it('should clear all data', () => {
      offlineStorage.updateFromServer([mockCat], [mockFood], [mockMeal]);
      offlineStorage.addCatOffline({ name: 'Test Cat' });

      offlineStorage.clear();

      const data = offlineStorage.getData();
      expect(data.cats).toHaveLength(0);
      expect(data.foods).toHaveLength(0);
      expect(data.meals).toHaveLength(0);
      expect(data.pendingSync.cats).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });
});
