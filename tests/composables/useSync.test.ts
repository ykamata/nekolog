import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSync } from '~/composables/useSync';
import { OfflineStorage } from '~/utils/offline-storage';
import type { Cat, Food, MealRecord } from '~/types/cat-meal';

// Mock dependencies
vi.mock('~/utils/offline-storage');
vi.mock('#app', () => ({
  $fetch: vi.fn(),
}));

// Mock Vue composables
const mockRef = vi.fn();
const mockOnMounted = vi.fn();
const mockOnUnmounted = vi.fn();
const mockReadonly = vi.fn(val => val);

vi.mock('vue', () => ({
  ref: mockRef,
  onMounted: mockOnMounted,
  onUnmounted: mockOnUnmounted,
  readonly: mockReadonly,
}));

// Mock global $fetch
global.$fetch = vi.fn();

describe('useSync', () => {
  let mockOfflineStorage: any;
  let mockSyncStatus: any;

  const mockCat: Cat = {
    id: 'cat-1',
    name: 'Test Cat',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFood: Food = {
    id: 'food-1',
    name: 'Test Food',
    type: 'DRY',
    caloriesPerGram: 3.5,
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

    // Mock sync status
    mockSyncStatus = {
      value: {
        isOnline: true,
        isSyncing: false,
        lastSync: null,
        pendingCount: 0,
        conflicts: [],
        error: null,
      },
    };

    mockRef.mockReturnValue(mockSyncStatus);

    // Mock offline storage
    mockOfflineStorage = {
      getInstance: vi.fn().mockReturnValue({
        getPendingSyncData: vi.fn().mockReturnValue({
          cats: [],
          foods: [],
          meals: [],
        }),
        getLastSyncTime: vi.fn().mockReturnValue(new Date()),
        updateFromServer: vi.fn(),
        clearPendingSync: vi.fn(),
        updateLocalToServerId: vi.fn(),
        addCatOffline: vi.fn().mockReturnValue('local-cat-1'),
        addFoodOffline: vi.fn().mockReturnValue('local-food-1'),
        addMealOffline: vi.fn().mockReturnValue('local-meal-1'),
        updateOffline: vi.fn(),
        deleteOffline: vi.fn(),
        getCats: vi.fn().mockReturnValue([mockCat]),
        getFoods: vi.fn().mockReturnValue([mockFood]),
        getMeals: vi.fn().mockReturnValue([mockMeal]),
      }),
    };

    vi.mocked(OfflineStorage).getInstance = mockOfflineStorage.getInstance;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock window event listeners
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize sync status correctly', () => {
      const { syncStatus } = useSync();

      expect(syncStatus.value.isOnline).toBe(true);
      expect(syncStatus.value.isSyncing).toBe(false);
      expect(syncStatus.value.pendingCount).toBe(0);
      expect(syncStatus.value.conflicts).toEqual([]);
      expect(syncStatus.value.error).toBe(null);
    });

    it('should set up event listeners on mount', () => {
      useSync();

      expect(mockOnMounted).toHaveBeenCalled();

      // Simulate onMounted callback
      const onMountedCallback = mockOnMounted.mock.calls[0][0];
      onMountedCallback();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function),
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function),
      );
    });
  });

  describe('fetchAndUpdateLocalData', () => {
    it('should fetch data from all endpoints and update local storage', async () => {
      const mockCats = [mockCat];
      const mockFoods = [mockFood];
      const mockMeals = [mockMeal];

      vi.mocked($fetch)
        .mockResolvedValueOnce(mockCats)
        .mockResolvedValueOnce(mockFoods)
        .mockResolvedValueOnce(mockMeals);

      const { fetchAndUpdateLocalData } = useSync();
      await fetchAndUpdateLocalData();

      expect($fetch).toHaveBeenCalledWith('/api/cats');
      expect($fetch).toHaveBeenCalledWith('/api/foods');
      expect($fetch).toHaveBeenCalledWith('/api/meals');

      const offlineStorageInstance = mockOfflineStorage.getInstance();
      expect(offlineStorageInstance.updateFromServer).toHaveBeenCalledWith(
        mockCats,
        mockFoods,
        mockMeals,
      );
    });

    it('should handle fetch errors', async () => {
      vi.mocked($fetch).mockRejectedValue(new Error('Network error'));

      const { fetchAndUpdateLocalData } = useSync();

      await expect(fetchAndUpdateLocalData()).rejects.toThrow('Network error');
    });
  });

  describe('syncData', () => {
    it('should not sync when offline', async () => {
      mockSyncStatus.value.isOnline = false;

      const { syncData } = useSync();
      const result = await syncData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Offline or already syncing');
      expect(result.syncedCount).toBe(0);
    });

    it('should not sync when already syncing', async () => {
      mockSyncStatus.value.isSyncing = true;

      const { syncData } = useSync();
      const result = await syncData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Offline or already syncing');
    });

    it('should sync pending cat data', async () => {
      const pendingCat = {
        action: 'create',
        data: mockCat,
        localId: 'local-cat-1',
      };

      const offlineStorageInstance = mockOfflineStorage.getInstance();
      offlineStorageInstance.getPendingSyncData.mockReturnValue({
        cats: [pendingCat],
        foods: [],
        meals: [],
      });

      vi.mocked($fetch)
        .mockResolvedValueOnce(mockCat) // Create cat response
        .mockResolvedValueOnce([mockCat]) // Fetch cats response
        .mockResolvedValueOnce([mockFood]) // Fetch foods response
        .mockResolvedValueOnce([mockMeal]); // Fetch meals response

      const { syncData } = useSync();
      const result = await syncData();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect($fetch).toHaveBeenCalledWith('/api/cats', {
        method: 'POST',
        body: {
          name: mockCat.name,
          birthdate: mockCat.birthdate,
          weight: mockCat.weight,
          photoUrl: mockCat.photoUrl,
        },
      });
    });

    it('should sync pending food data', async () => {
      const pendingFood = {
        action: 'update',
        data: mockFood,
      };

      const offlineStorageInstance = mockOfflineStorage.getInstance();
      offlineStorageInstance.getPendingSyncData.mockReturnValue({
        cats: [],
        foods: [pendingFood],
        meals: [],
      });

      vi.mocked($fetch)
        .mockResolvedValueOnce(undefined) // Update food response
        .mockResolvedValueOnce([mockCat]) // Fetch cats response
        .mockResolvedValueOnce([mockFood]) // Fetch foods response
        .mockResolvedValueOnce([mockMeal]); // Fetch meals response

      const { syncData } = useSync();
      const result = await syncData();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect($fetch).toHaveBeenCalledWith(`/api/foods/${mockFood.id}`, {
        method: 'PUT',
        body: {
          name: mockFood.name,
          type: mockFood.type,
          brand: mockFood.brand,
          caloriesPerGram: mockFood.caloriesPerGram,
          pricePerUnit: mockFood.pricePerUnit,
          unit: mockFood.unit,
        },
      });
    });

    it('should sync pending meal data', async () => {
      const pendingMeal = {
        action: 'delete',
        data: mockMeal,
      };

      const offlineStorageInstance = mockOfflineStorage.getInstance();
      offlineStorageInstance.getPendingSyncData.mockReturnValue({
        cats: [],
        foods: [],
        meals: [pendingMeal],
      });

      vi.mocked($fetch)
        .mockResolvedValueOnce(undefined) // Delete meal response
        .mockResolvedValueOnce([mockCat]) // Fetch cats response
        .mockResolvedValueOnce([mockFood]) // Fetch foods response
        .mockResolvedValueOnce([mockMeal]); // Fetch meals response

      const { syncData } = useSync();
      const result = await syncData();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect($fetch).toHaveBeenCalledWith(`/api/meals/${mockMeal.id}`, {
        method: 'DELETE',
      });
    });

    it('should handle sync errors gracefully', async () => {
      const pendingCat = {
        action: 'create',
        data: mockCat,
        localId: 'local-cat-1',
      };

      const offlineStorageInstance = mockOfflineStorage.getInstance();
      offlineStorageInstance.getPendingSyncData.mockReturnValue({
        cats: [pendingCat],
        foods: [],
        meals: [],
      });

      vi.mocked($fetch).mockRejectedValue(new Error('Sync failed'));

      const { syncData } = useSync();
      const result = await syncData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sync failed');
      expect(result.syncedCount).toBe(0);
    });

    it('should clear pending sync data after successful sync', async () => {
      const offlineStorageInstance = mockOfflineStorage.getInstance();
      offlineStorageInstance.getPendingSyncData.mockReturnValue({
        cats: [],
        foods: [],
        meals: [],
      });

      vi.mocked($fetch)
        .mockResolvedValueOnce([mockCat]) // Fetch cats response
        .mockResolvedValueOnce([mockFood]) // Fetch foods response
        .mockResolvedValueOnce([mockMeal]); // Fetch meals response

      const { syncData } = useSync();
      await syncData();

      expect(offlineStorageInstance.clearPendingSync).toHaveBeenCalled();
    });
  });

  describe('manualSync', () => {
    it('should trigger sync data', async () => {
      const offlineStorageInstance = mockOfflineStorage.getInstance();
      offlineStorageInstance.getPendingSyncData.mockReturnValue({
        cats: [],
        foods: [],
        meals: [],
      });

      vi.mocked($fetch)
        .mockResolvedValueOnce([mockCat])
        .mockResolvedValueOnce([mockFood])
        .mockResolvedValueOnce([mockMeal]);

      const { manualSync } = useSync();
      const result = await manualSync();

      expect(result.success).toBe(true);
    });
  });

  describe('offline operations', () => {
    it('should provide offline operations interface', () => {
      const { offlineOperations } = useSync();

      expect(offlineOperations).toHaveProperty('addCat');
      expect(offlineOperations).toHaveProperty('addFood');
      expect(offlineOperations).toHaveProperty('addMeal');
      expect(offlineOperations).toHaveProperty('updateCat');
      expect(offlineOperations).toHaveProperty('updateFood');
      expect(offlineOperations).toHaveProperty('updateMeal');
      expect(offlineOperations).toHaveProperty('deleteCat');
      expect(offlineOperations).toHaveProperty('deleteFood');
      expect(offlineOperations).toHaveProperty('deleteMeal');
    });

    it('should call offline storage methods', () => {
      const { offlineOperations } = useSync();
      const offlineStorageInstance = mockOfflineStorage.getInstance();

      const catData = { name: 'Test Cat' };
      offlineOperations.addCat(catData);
      expect(offlineStorageInstance.addCatOffline).toHaveBeenCalledWith(
        catData,
      );

      const foodData = { name: 'Test Food', type: 'DRY', caloriesPerGram: 3.0 };
      offlineOperations.addFood(foodData);
      expect(offlineStorageInstance.addFoodOffline).toHaveBeenCalledWith(
        foodData,
      );

      const mealData = {
        catId: 'cat-1',
        foodId: 'food-1',
        quantity: 50,
        calories: 175,
        mealTime: new Date(),
      };
      offlineOperations.addMeal(mealData);
      expect(offlineStorageInstance.addMealOffline).toHaveBeenCalledWith(
        mealData,
      );

      offlineOperations.updateCat('cat-1', { name: 'Updated Cat' });
      expect(offlineStorageInstance.updateOffline).toHaveBeenCalledWith(
        'cat',
        'cat-1',
        { name: 'Updated Cat' },
      );

      offlineOperations.deleteCat('cat-1');
      expect(offlineStorageInstance.deleteOffline).toHaveBeenCalledWith(
        'cat',
        'cat-1',
      );
    });
  });

  describe('getOfflineData', () => {
    it('should return offline data', () => {
      const { getOfflineData } = useSync();
      const data = getOfflineData();

      expect(data).toHaveProperty('cats');
      expect(data).toHaveProperty('foods');
      expect(data).toHaveProperty('meals');
      expect(data.cats).toEqual([mockCat]);
      expect(data.foods).toEqual([mockFood]);
      expect(data.meals).toEqual([mockMeal]);
    });
  });

  describe('conflict resolution', () => {
    it('should resolve conflict using local data', async () => {
      const conflict = {
        type: 'cat' as const,
        localData: { name: 'Local Cat' },
        serverData: { name: 'Server Cat' },
        field: 'name',
        localId: 'local-cat-1',
        serverId: 'server-cat-1',
      };

      mockSyncStatus.value.conflicts = [conflict];

      vi.mocked($fetch).mockResolvedValue(undefined);

      const { resolveConflict } = useSync();
      await resolveConflict(conflict, true);

      expect($fetch).toHaveBeenCalledWith('/api/cats/server-cat-1', {
        method: 'PUT',
        body: { name: 'Local Cat' },
      });

      expect(mockSyncStatus.value.conflicts).toHaveLength(0);
    });

    it('should resolve conflict using server data', async () => {
      const conflict = {
        type: 'food' as const,
        localData: { name: 'Local Food' },
        serverData: { name: 'Server Food' },
        field: 'name',
        localId: 'local-food-1',
        serverId: 'server-food-1',
      };

      mockSyncStatus.value.conflicts = [conflict];

      const offlineStorageInstance = mockOfflineStorage.getInstance();

      const { resolveConflict } = useSync();
      await resolveConflict(conflict, false);

      expect(offlineStorageInstance.updateOffline).toHaveBeenCalledWith(
        'food',
        'local-food-1',
        { name: 'Server Food' },
      );

      expect(mockSyncStatus.value.conflicts).toHaveLength(0);
    });

    it('should handle conflict resolution errors', async () => {
      const conflict = {
        type: 'meal' as const,
        localData: { quantity: 50 },
        serverData: { quantity: 60 },
        field: 'quantity',
        localId: 'local-meal-1',
        serverId: 'server-meal-1',
      };

      vi.mocked($fetch).mockRejectedValue(new Error('Resolution failed'));

      const { resolveConflict } = useSync();

      await expect(resolveConflict(conflict, true)).rejects.toThrow(
        'Resolution failed',
      );
    });
  });
});
