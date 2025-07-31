import { defineStore } from 'pinia';
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

interface MealsState {
  meals: MealRecord[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  filters: MealRecordFilter;
  cache: {
    lastFetch: Date | null;
    ttl: number; // Time to live in milliseconds
  };
  realTimeEnabled: boolean;
  lastUpdate: Date | null;
}

export const useMealsStore = defineStore('meals', {
  state: (): MealsState => ({
    meals: [],
    loading: false,
    error: null,
    pagination: {
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    filters: {},
    cache: {
      lastFetch: null,
      ttl: 2 * 60 * 1000, // 2 minutes (meals change frequently)
    },
    realTimeEnabled: true,
    lastUpdate: null,
  }),

  getters: {
    getMealById:
      state =>
        (id: string): MealRecord | undefined => {
          return state.meals.find(meal => meal.id === id);
        },

    getMealsByCat:
      state =>
        (catId: string): MealRecord[] => {
          return state.meals.filter(meal => meal.catId === catId);
        },

    getMealsByFood:
      state =>
        (foodId: string): MealRecord[] => {
          return state.meals.filter(meal => meal.foodId === foodId);
        },

    getMealsByDateRange:
      state =>
        (startDate: Date, endDate: Date): MealRecord[] => {
          return state.meals.filter((meal) => {
            const mealDate = new Date(meal.mealTime);
            return mealDate >= startDate && mealDate <= endDate;
          });
        },

    todaysMeals: (state): MealRecord[] => {
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

      return state.meals.filter((meal) => {
        const mealDate = new Date(meal.mealTime);
        return mealDate >= startOfDay && mealDate <= endOfDay;
      });
    },

    recentMeals: (state): MealRecord[] => {
      return [...state.meals]
        .sort(
          (a, b) =>
            new Date(b.mealTime).getTime() - new Date(a.mealTime).getTime(),
        )
        .slice(0, 10);
    },

    totalPages: (state): number => {
      return Math.ceil(state.pagination.totalCount / state.pagination.pageSize);
    },

    isLoading: (state): boolean => state.loading,

    hasError: (state): boolean => !!state.error,

    isCacheValid: (state): boolean => {
      if (!state.cache.lastFetch) return false;
      const now = new Date();
      const timeDiff = now.getTime() - state.cache.lastFetch.getTime();
      return timeDiff < state.cache.ttl;
    },

    currentFilters: (state): MealRecordFilter => state.filters,
  },

  actions: {
    async fetchMeals(filter?: MealRecordFilter, forceRefresh = false) {
      const { syncStatus } = useSync();
      const offlineStorage = OfflineStorage.getInstance();

      // If offline, load from local storage
      if (!syncStatus.value.isOnline) {
        this.loading = true;
        try {
          const localMeals = offlineStorage.getMeals(
            filter?.catId,
            filter?.startDate,
            filter?.endDate,
          );
          this.meals = localMeals;
          this.pagination.totalCount = localMeals.length;
          return this.meals;
        }
        catch (error) {
          this.error = 'Failed to load offline data';
          throw error;
        }
        finally {
          this.loading = false;
        }
      }

      // Check API cache first
      const filtersChanged
        = JSON.stringify(filter || {}) !== JSON.stringify(this.filters);
      const cacheKey = createCacheKey('meals', JSON.stringify(filter || {}));
      const cachedData = apiCache.get(cacheKey);

      if (!forceRefresh && cachedData && !filtersChanged) {
        this.meals = cachedData.meals;
        this.pagination = cachedData.pagination;
        return this.meals;
      }

      this.loading = true;
      this.error = null;

      // Update filters if provided
      if (filter) {
        this.filters = { ...filter };
      }

      try {
        const query = new URLSearchParams();

        // Add pagination
        query.append(
          'limit',
          (this.filters.limit || this.pagination.pageSize).toString(),
        );
        query.append(
          'offset',
          (
            this.filters.offset
            || (this.pagination.currentPage - 1) * this.pagination.pageSize
          ).toString(),
        );

        // Add filters
        if (this.filters.catId) query.append('catId', this.filters.catId);
        if (this.filters.foodId) query.append('foodId', this.filters.foodId);
        if (this.filters.startDate)
          query.append('startDate', this.filters.startDate.toISOString());
        if (this.filters.endDate)
          query.append('endDate', this.filters.endDate.toISOString());
        if (this.filters.foodType)
          query.append('foodType', this.filters.foodType);

        const url = `/api/meals?${query.toString()}`;

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

        this.meals = response.data.map(meal => ({
          ...meal,
          mealTime: new Date(meal.mealTime),
          createdAt: new Date(meal.createdAt),
          updatedAt: new Date(meal.updatedAt),
        }));

        // Update pagination
        this.pagination = {
          currentPage: response.pagination.page,
          pageSize: response.pagination.pageSize,
          totalCount: response.pagination.total,
          hasNextPage: response.pagination.hasNext,
          hasPreviousPage: response.pagination.hasPrevious,
        };

        // Cache the results
        apiCache.set(cacheKey, {
          meals: this.meals,
          pagination: this.pagination,
        });

        this.cache.lastFetch = new Date();
        this.lastUpdate = new Date();

        return this.meals;
      }
      catch (error) {
        // Fallback to offline data if available
        try {
          const localMeals = offlineStorage.getMeals(
            filter?.catId,
            filter?.startDate,
            filter?.endDate,
          );
          if (localMeals.length > 0) {
            this.meals = localMeals;
            this.pagination.totalCount = localMeals.length;
            this.error = 'Using offline data';
            return this.meals;
          }
        }
        catch {
          // Ignore offline error, use original error
        }

        this.error
          = error instanceof Error ? error.message : 'Failed to fetch meals';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async createMeal(mealInput: MealRecordInput): Promise<MealRecord> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

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
          this.meals.unshift(newMeal);
          this.pagination.totalCount += 1;
          this.lastUpdate = new Date();

          // Invalidate related cache
          invalidateRelatedCache('meals');

          // Trigger real-time update if enabled
          if (this.realTimeEnabled) {
            this.invalidateCache();
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

          this.meals.unshift(newMeal);
          this.pagination.totalCount += 1;
          this.lastUpdate = new Date();

          return newMeal;
        }
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to create meal';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async updateMeal(
      id: string,
      mealUpdate: MealRecordUpdate,
    ): Promise<MealRecord> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Update on server
          const data = await $fetch<MealRecord>(`/api/meals/${id}`, {
            method: 'PUT' as any,
            body: mealUpdate,
          });

          const updatedMeal = {
            ...data,
            mealTime: new Date(data.mealTime),
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          };

          const index = this.meals.findIndex(meal => meal.id === id);
          if (index !== -1) {
            this.meals[index] = updatedMeal;
          }

          this.lastUpdate = new Date();

          // Trigger real-time update if enabled
          if (this.realTimeEnabled) {
            this.invalidateCache();
          }

          return updatedMeal;
        }
        else {
          // Offline: Update locally
          offlineOperations.updateMeal(id, mealUpdate);

          const index = this.meals.findIndex(meal => meal.id === id);
          if (index !== -1) {
            const updatedMeal = {
              ...this.meals[index],
              ...mealUpdate,
              mealTime: mealUpdate.mealTime
                ? new Date(mealUpdate.mealTime)
                : this.meals[index]?.mealTime,
              updatedAt: new Date(),
            };
            const validatedMeal = {
              ...updatedMeal,
              id: updatedMeal.id || this.meals[index]?.id || '',
            };
            this.meals[index] = validatedMeal as MealRecord;
            this.lastUpdate = new Date();
            return validatedMeal as MealRecord;
          }

          throw new Error('Meal not found');
        }
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to update meal';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async deleteMeal(id: string): Promise<void> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Delete on server
          await $fetch(`/api/meals/${id}`, {
            method: 'DELETE' as any,
          });
        }
        else {
          // Offline: Mark for deletion
          offlineOperations.deleteMeal(id);
        }

        this.meals = this.meals.filter(meal => meal.id !== id);
        this.pagination.totalCount = Math.max(
          0,
          this.pagination.totalCount - 1,
        );
        this.lastUpdate = new Date();

        // Trigger real-time update if enabled
        if (this.realTimeEnabled) {
          this.invalidateCache();
        }
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to delete meal';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    // Pagination actions
    async nextPage() {
      if (this.pagination.hasNextPage) {
        this.pagination.currentPage += 1;
        this.filters.offset
          = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        await this.fetchMeals(this.filters, true);
      }
    },

    async previousPage() {
      if (this.pagination.hasPreviousPage) {
        this.pagination.currentPage -= 1;
        this.filters.offset
          = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        await this.fetchMeals(this.filters, true);
      }
    },

    async goToPage(page: number) {
      if (page >= 1 && page <= this.totalPages) {
        this.pagination.currentPage = page;
        this.filters.offset = (page - 1) * this.pagination.pageSize;
        await this.fetchMeals(this.filters, true);
      }
    },

    setPageSize(size: number) {
      this.pagination.pageSize = size;
      this.pagination.currentPage = 1;
      this.filters.limit = size;
      this.filters.offset = 0;
    },

    // Filter actions
    setFilters(filters: MealRecordFilter) {
      this.filters = { ...filters };
      this.pagination.currentPage = 1;
      this.filters.offset = 0;
    },

    clearFilters() {
      this.filters = {};
      this.pagination.currentPage = 1;
    },

    // Real-time update actions
    enableRealTimeUpdates() {
      this.realTimeEnabled = true;
    },

    disableRealTimeUpdates() {
      this.realTimeEnabled = false;
    },

    async refreshData() {
      await this.fetchMeals(this.filters, true);
    },

    // Utility actions
    clearError() {
      this.error = null;
    },

    invalidateCache() {
      this.cache.lastFetch = null;
    },

    // Local state management methods
    addMealToState(meal: MealRecord) {
      const existingIndex = this.meals.findIndex(m => m.id === meal.id);
      if (existingIndex !== -1) {
        this.meals[existingIndex] = meal;
      }
      else {
        this.meals.unshift(meal); // Add to beginning for chronological order
      }
      this.lastUpdate = new Date();
    },

    removeMealFromState(id: string) {
      this.meals = this.meals.filter(meal => meal.id !== id);
      this.pagination.totalCount = Math.max(0, this.pagination.totalCount - 1);
      this.lastUpdate = new Date();
    },

    // Load offline data into state
    loadOfflineData() {
      const offlineStorage = OfflineStorage.getInstance();
      this.meals = offlineStorage.getMeals();
    },

    // Bulk operations
    async bulkDeleteMeals(ids: string[]): Promise<void> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          await $fetch('/api/meals/bulk-delete', {
            method: 'POST' as any,
            body: { ids },
          });
        }
        else {
          // Offline: Mark all for deletion
          ids.forEach(id => offlineOperations.deleteMeal(id));
        }

        this.meals = this.meals.filter(meal => !ids.includes(meal.id));
        this.pagination.totalCount = Math.max(
          0,
          this.pagination.totalCount - ids.length,
        );
        this.lastUpdate = new Date();

        if (this.realTimeEnabled) {
          this.invalidateCache();
        }
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to delete meals';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },
  },
});
