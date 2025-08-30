import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  MealRecord,
  MealRecordInput,
  MealRecordUpdate,
  MealRecordFilter,
} from '~/types/cat-meal';
import { OfflineStorage } from '~/utils/offline-storage';
import { useSync } from '~/composables/useSync';
import {
  apiCache,
  createCacheKey,
  invalidateRelatedCache,
} from '~/utils/cache';

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const useMealsStore = defineStore('meals', () => {
  // State
  const meals = ref<MealRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<PaginationState>({
    currentPage: 1,
    pageSize: 20,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const filters = ref<MealRecordFilter>({});
  const cache = ref({
    lastFetch: null as Date | null,
    ttl: 2 * 60 * 1000, // 2 minutes (meals change frequently)
  });
  const realTimeEnabled = ref(true);
  const lastUpdate = ref<Date | null>(null);

  // Getters
  const getMealById = computed(() =>
    (id: string): MealRecord | undefined => {
      return meals.value.find(meal => meal.id === id);
    },
  );

  const getMealsByCat = computed(() =>
    (catId: string): MealRecord[] => {
      return meals.value.filter(meal => meal.catId === catId);
    },
  );

  const getMealsByFood = computed(() =>
    (foodId: string): MealRecord[] => {
      return meals.value.filter(meal => meal.foodId === foodId);
    },
  );

  const getMealsByDateRange = computed(() =>
    (startDate: Date, endDate: Date): MealRecord[] => {
      return meals.value.filter((meal) => {
        const mealDate = new Date(meal.mealTime);
        return mealDate >= startDate && mealDate <= endDate;
      });
    },
  );

  const todaysMeals = computed((): MealRecord[] => {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
    );

    return meals.value.filter((meal) => {
      const mealDate = new Date(meal.mealTime);
      return mealDate >= startOfDay && mealDate <= endOfDay;
    });
  });

  const recentMeals = computed((): MealRecord[] => {
    return [...meals.value]
      .sort(
        (a, b) =>
          new Date(b.mealTime).getTime() - new Date(a.mealTime).getTime(),
      )
      .slice(0, 10);
  });

  const totalPages = computed((): number => {
    return Math.ceil(pagination.value.totalCount / pagination.value.pageSize);
  });

  const isLoading = computed((): boolean => loading.value);

  const hasError = computed((): boolean => !!error.value);

  const isCacheValid = computed((): boolean => {
    if (!cache.value.lastFetch) return false;
    const now = new Date();
    const timeDiff = now.getTime() - cache.value.lastFetch.getTime();
    return timeDiff < cache.value.ttl;
  });

  const currentFilters = computed((): MealRecordFilter => filters.value);

  // Actions
  const fetchMeals = async (filter?: MealRecordFilter, forceRefresh = false) => {
    console.log('📝 食事記録ストア: fetchMeals開始', { filter, forceRefresh });

    // Check API cache first
    const filtersChanged
      = JSON.stringify(filter || {}) !== JSON.stringify(filters.value);
    const cacheKey = createCacheKey('meals', JSON.stringify(filter || {}));
    const cachedData = apiCache.get(cacheKey);

    if (!forceRefresh && cachedData && !filtersChanged) {
      console.log('📝 食事記録ストア: キャッシュを使用');
      meals.value = cachedData.meals;
      pagination.value = cachedData.pagination;
      return meals.value;
    }

    loading.value = true;
    error.value = null;

    // Update filters if provided
    if (filter) {
      filters.value = { ...filter };
    }

    try {
      const query = new URLSearchParams();

      // Add pagination
      query.append(
        'limit',
        (filters.value.limit || pagination.value.pageSize).toString(),
      );
      query.append(
        'offset',
        (
          filters.value.offset
          || (pagination.value.currentPage - 1) * pagination.value.pageSize
        ).toString(),
      );

      // Add filters
      if (filters.value.catId) query.append('catId', filters.value.catId);
      if (filters.value.foodId) query.append('foodId', filters.value.foodId);
      if (filters.value.startDate)
        query.append('startDate', filters.value.startDate.toISOString());
      if (filters.value.endDate)
        query.append('endDate', filters.value.endDate.toISOString());
      if (filters.value.foodType)
        query.append('foodType', filters.value.foodType);

      const url = `/api/meals?${query.toString()}`;

      console.log('📝 食事記録ストア: API呼び出し', url);
      const response = await $fetch<{
        data: MealRecord[];
        pagination: {
          total: number;
          page: number;
          pageSize: number;
          hasNext: boolean;
          hasPrevious: boolean;
        };
      }>(url);
      console.log('📝 食事記録ストア: API レスポンス', response);

      meals.value = response.data.map(meal => ({
        ...meal,
        mealTime: new Date(meal.mealTime),
        createdAt: new Date(meal.createdAt),
        updatedAt: new Date(meal.updatedAt),
      }));

      // Update pagination
      pagination.value = {
        currentPage: response.pagination.page,
        pageSize: response.pagination.pageSize,
        totalCount: response.pagination.total,
        hasNextPage: response.pagination.hasNext,
        hasPreviousPage: response.pagination.hasPrevious,
      };

      // Cache the results
      apiCache.set(cacheKey, {
        meals: meals.value,
        pagination: pagination.value,
      });

      cache.value.lastFetch = new Date();
      lastUpdate.value = new Date();

      console.log('📝 食事記録ストア: データ設定完了', meals.value.length);
      return meals.value;
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch meals';
      error.value = errorMessage;
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  const createMeal = async (mealInput: MealRecordInput): Promise<MealRecord> => {
    const { syncStatus, offlineOperations } = useSync();
    loading.value = true;
    error.value = null;

    try {
      if (syncStatus.value.isOnline) {
        // Online: Create on server
        const data = await $fetch<MealRecord>('/api/meals', {
          method: 'POST',
          body: mealInput,
        });

        const newMeal = {
          ...data,
          mealTime: new Date(data.mealTime),
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        };

        // Add to beginning of meals array (most recent first)
        meals.value.unshift(newMeal);
        pagination.value.totalCount += 1;
        lastUpdate.value = new Date();

        // Invalidate related cache
        invalidateRelatedCache('meals');

        // Trigger real-time update if enabled
        if (realTimeEnabled.value) {
          invalidateCache();
        }

        return newMeal;
      }
      else {
        // Offline: Create locally with temporary ID
        const localId = offlineOperations.addMeal({
          catId: mealInput.catId,
          foodId: mealInput.foodId,
          quantity: mealInput.quantity,
          calories: mealInput.calories || 0,
          mealTime: new Date(mealInput.mealTime),
          notes: mealInput.notes,
        });

        const newMeal: MealRecord = {
          id: localId,
          catId: mealInput.catId,
          foodId: mealInput.foodId,
          quantity: mealInput.quantity,
          calories: mealInput.calories || 0,
          mealTime: new Date(mealInput.mealTime),
          notes: mealInput.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        meals.value.unshift(newMeal);
        pagination.value.totalCount += 1;
        lastUpdate.value = new Date();

        return newMeal;
      }
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create meal';
      error.value = errorMessage;
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  const updateMeal = async (
    id: string,
    mealUpdate: MealRecordUpdate,
  ): Promise<MealRecord> => {
    const { syncStatus, offlineOperations } = useSync();
    loading.value = true;
    error.value = null;

    try {
      if (syncStatus.value.isOnline) {
        // Online: Update on server
        const data = await $fetch<MealRecord>(`/api/meals/${id}`, {
          method: 'PUT',
          body: mealUpdate,
        });

        const updatedMeal = {
          ...data,
          mealTime: new Date(data.mealTime),
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        };

        const index = meals.value.findIndex(meal => meal.id === id);
        if (index !== -1) {
          meals.value[index] = updatedMeal;
        }

        lastUpdate.value = new Date();

        // Trigger real-time update if enabled
        if (realTimeEnabled.value) {
          invalidateCache();
        }

        return updatedMeal;
      }
      else {
        // Offline: Update locally
        offlineOperations.updateMeal(id, mealUpdate);

        const index = meals.value.findIndex(meal => meal.id === id);
        if (index !== -1) {
          const updatedMeal = {
            ...meals.value[index],
            ...mealUpdate,
            mealTime: mealUpdate.mealTime
              ? new Date(mealUpdate.mealTime)
              : meals.value[index]?.mealTime,
            updatedAt: new Date(),
          };
          const validatedMeal = {
            ...updatedMeal,
            id: updatedMeal.id || meals.value[index]?.id || '',
          };
          meals.value[index] = validatedMeal as MealRecord;
          lastUpdate.value = new Date();
          return validatedMeal as MealRecord;
        }

        throw new Error('Meal not found');
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update meal';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const deleteMeal = async (id: string): Promise<void> => {
    const { syncStatus, offlineOperations } = useSync();
    loading.value = true;
    error.value = null;

    try {
      if (syncStatus.value.isOnline) {
        // Online: Delete on server
        await $fetch(`/api/meals/${id}`, {
          method: 'DELETE',
        } as any);
      }
      else {
        // Offline: Mark for deletion
        offlineOperations.deleteMeal(id);
      }

      meals.value = meals.value.filter(meal => meal.id !== id);
      pagination.value.totalCount = Math.max(
        0,
        pagination.value.totalCount - 1,
      );
      lastUpdate.value = new Date();

      // Trigger real-time update if enabled
      if (realTimeEnabled.value) {
        invalidateCache();
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete meal';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  // Pagination actions
  const nextPage = async () => {
    if (pagination.value.hasNextPage) {
      pagination.value.currentPage += 1;
      filters.value.offset
        = (pagination.value.currentPage - 1) * pagination.value.pageSize;
      await fetchMeals(filters.value, true);
    }
  };

  const previousPage = async () => {
    if (pagination.value.hasPreviousPage) {
      pagination.value.currentPage -= 1;
      filters.value.offset
        = (pagination.value.currentPage - 1) * pagination.value.pageSize;
      await fetchMeals(filters.value, true);
    }
  };

  const goToPage = async (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      pagination.value.currentPage = page;
      filters.value.offset = (page - 1) * pagination.value.pageSize;
      await fetchMeals(filters.value, true);
    }
  };

  const setPageSize = (size: number) => {
    pagination.value.pageSize = size;
    pagination.value.currentPage = 1;
    filters.value.limit = size;
    filters.value.offset = 0;
  };

  // Filter actions
  const setFilters = (newFilters: MealRecordFilter) => {
    filters.value = { ...newFilters };
    pagination.value.currentPage = 1;
    filters.value.offset = 0;
  };

  const clearFilters = () => {
    filters.value = {};
    pagination.value.currentPage = 1;
  };

  // Real-time update actions
  const enableRealTimeUpdates = () => {
    realTimeEnabled.value = true;
  };

  const disableRealTimeUpdates = () => {
    realTimeEnabled.value = false;
  };

  const refreshData = async () => {
    await fetchMeals(filters.value, true);
  };

  // Utility actions
  const clearError = () => {
    error.value = null;
  };

  const invalidateCache = () => {
    cache.value.lastFetch = null;
  };

  // Local state management methods
  const addMealToState = (meal: MealRecord) => {
    const existingIndex = meals.value.findIndex(m => m.id === meal.id);
    if (existingIndex !== -1) {
      meals.value[existingIndex] = meal;
    }
    else {
      meals.value.unshift(meal); // Add to beginning for chronological order
    }
    lastUpdate.value = new Date();
  };

  const removeMealFromState = (id: string) => {
    meals.value = meals.value.filter(meal => meal.id !== id);
    pagination.value.totalCount = Math.max(0, pagination.value.totalCount - 1);
    lastUpdate.value = new Date();
  };

  // Load offline data into state
  const loadOfflineData = () => {
    const offlineStorage = OfflineStorage.getInstance();
    meals.value = offlineStorage.getMeals();
  };

  // Bulk operations
  const bulkDeleteMeals = async (ids: string[]): Promise<void> => {
    const { syncStatus, offlineOperations } = useSync();
    loading.value = true;
    error.value = null;

    try {
      if (syncStatus.value.isOnline) {
        await $fetch('/api/meals/bulk-delete', {
          method: 'POST',
          body: { ids },
        } as any);
      }
      else {
        // Offline: Mark all for deletion
        ids.forEach(id => offlineOperations.deleteMeal(id));
      }

      meals.value = meals.value.filter(meal => !ids.includes(meal.id));
      pagination.value.totalCount = Math.max(
        0,
        pagination.value.totalCount - ids.length,
      );
      lastUpdate.value = new Date();

      if (realTimeEnabled.value) {
        invalidateCache();
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete meals';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  return {
    // State
    meals,
    loading,
    error,
    pagination,
    filters,
    cache,
    realTimeEnabled,
    lastUpdate,
    // Getters
    getMealById,
    getMealsByCat,
    getMealsByFood,
    getMealsByDateRange,
    todaysMeals,
    recentMeals,
    totalPages,
    isLoading,
    hasError,
    isCacheValid,
    currentFilters,
    // Actions
    fetchMeals,
    createMeal,
    updateMeal,
    deleteMeal,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    setFilters,
    clearFilters,
    enableRealTimeUpdates,
    disableRealTimeUpdates,
    refreshData,
    clearError,
    invalidateCache,
    addMealToState,
    removeMealFromState,
    loadOfflineData,
    bulkDeleteMeals,
  };
});
