import { defineStore } from 'pinia';
import type {
  Food,
  FoodInput,
  FoodUpdate,
  FoodFilter,
  FoodType,
} from '~/types/cat-meal';
import { OfflineStorage } from '~/utils/offline-storage';
import { useSync } from '~/composables/useSync';

interface FoodsState {
  foods: Food[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedType: FoodType | null;
  cache: {
    lastFetch: Date | null;
    ttl: number; // Time to live in milliseconds
  };
}

export const useFoodsStore = defineStore('foods', {
  state: (): FoodsState => ({
    foods: [],
    loading: false,
    error: null,
    searchQuery: '',
    selectedType: null,
    cache: {
      lastFetch: null,
      ttl: 10 * 60 * 1000, // 10 minutes (foods change less frequently)
    },
  }),

  getters: {
    getFoodById:
      state =>
        (id: string): Food | undefined => {
          return state.foods.find(food => food.id === id);
        },

    filteredFoods: (state): Food[] => {
      let filtered = [...state.foods];

      // Filter by search query
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(
          food =>
            food.name.toLowerCase().includes(query)
            || (food.brand && food.brand.toLowerCase().includes(query)),
        );
      }

      // Filter by type
      if (state.selectedType) {
        filtered = filtered.filter(food => food.type === state.selectedType);
      }

      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    },

    foodsByType:
      state =>
        (type: FoodType): Food[] => {
          return state.foods.filter(food => food.type === type);
        },

    dryFoods: (state): Food[] => {
      return state.foods.filter(food => food.type === 'DRY');
    },

    wetFoods: (state): Food[] => {
      return state.foods.filter(food => food.type === 'WET');
    },

    uniqueBrands: (state): string[] => {
      const brands = state.foods
        .map(food => food.brand)
        .filter((brand): brand is string => !!brand);
      return [...new Set(brands)].sort();
    },

    isLoading: (state): boolean => state.loading,

    hasError: (state): boolean => !!state.error,

    isCacheValid: (state): boolean => {
      if (!state.cache.lastFetch) return false;
      const now = new Date();
      const timeDiff = now.getTime() - state.cache.lastFetch.getTime();
      return timeDiff < state.cache.ttl;
    },
  },

  actions: {
    async fetchFoods(filter?: FoodFilter, forceRefresh = false) {
      const { syncStatus } = useSync();
      const offlineStorage = OfflineStorage.getInstance();

      // If offline, load from local storage
      if (!syncStatus.value.isOnline) {
        this.loading = true;
        try {
          const localFoods = offlineStorage.getFoods();
          this.foods = localFoods;
          return this.filteredFoods;
        }
        catch (error) {
          this.error = 'Failed to load offline data';
          throw error;
        }
        finally {
          this.loading = false;
        }
      }

      // Use cache if valid and not forcing refresh
      if (!forceRefresh && this.isCacheValid && this.foods.length > 0) {
        return this.filteredFoods;
      }

      this.loading = true;
      this.error = null;

      try {
        const query = new URLSearchParams();
        if (filter?.name) query.append('name', filter.name);
        if (filter?.type) query.append('type', filter.type);
        if (filter?.brand) query.append('brand', filter.brand);
        if (filter?.limit) query.append('limit', filter.limit.toString());
        if (filter?.offset) query.append('offset', filter.offset.toString());

        const queryString = query.toString();
        const url = `/api/foods${queryString ? `?${queryString}` : ''}`;

        const data = await $fetch<Food[]>(url);

        this.foods = data.map(food => ({
          ...food,
          createdAt: new Date(food.createdAt),
          updatedAt: new Date(food.updatedAt),
        }));

        this.cache.lastFetch = new Date();
        return this.filteredFoods;
      }
      catch (error) {
        // Fallback to offline data if available
        try {
          const localFoods = offlineStorage.getFoods();
          if (localFoods.length > 0) {
            this.foods = localFoods;
            this.error = 'Using offline data';
            return this.filteredFoods;
          }
        }
        catch {
          // Ignore offline error, use original error
        }

        this.error
          = error instanceof Error ? error.message : 'Failed to fetch foods';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async createFood(foodInput: FoodInput): Promise<Food> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Create on server
          const data = await $fetch<Food>('/api/foods', {
            method: 'POST',
            body: foodInput,
          });

          const newFood = {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          };

          this.foods.push(newFood);
          return newFood;
        }
        else {
          // Offline: Create locally with temporary ID
          const localId = offlineOperations.addFood({
            name: foodInput.name,
            type: foodInput.type,
            brand: foodInput.brand,
            caloriesPerGram: foodInput.caloriesPerGram,
            pricePerUnit: foodInput.pricePerUnit,
            unit: foodInput.unit || 'g',
          });

          const newFood: Food = {
            id: localId,
            name: foodInput.name,
            type: foodInput.type,
            brand: foodInput.brand,
            caloriesPerGram: foodInput.caloriesPerGram,
            pricePerUnit: foodInput.pricePerUnit,
            unit: foodInput.unit || 'g',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          this.foods.push(newFood);
          return newFood;
        }
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to create food';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async updateFood(id: string, foodUpdate: FoodUpdate): Promise<Food> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Update on server
          const data = await $fetch<Food>(`/api/foods/${id}`, {
            method: 'PUT' as any,
            body: foodUpdate,
          });

          const updatedFood = {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          };

          const index = this.foods.findIndex(food => food.id === id);
          if (index !== -1) {
            this.foods[index] = updatedFood;
          }

          return updatedFood;
        }
        else {
          // Offline: Update locally
          offlineOperations.updateFood(id, foodUpdate);

          const index = this.foods.findIndex(food => food.id === id);
          if (index !== -1) {
            const updatedFood = {
              ...this.foods[index],
              ...foodUpdate,
              updatedAt: new Date(),
            };
            const validatedFood = {
              ...updatedFood,
              id: updatedFood.id || this.foods[index]?.id || '',
            };
            this.foods[index] = validatedFood as Food;
            return validatedFood as Food;
          }

          throw new Error('Food not found');
        }
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to update food';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async deleteFood(id: string): Promise<void> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Delete on server
          await $fetch(`/api/foods/${id}`, {
            method: 'DELETE' as any,
          });
        }
        else {
          // Offline: Mark for deletion
          offlineOperations.deleteFood(id);
        }

        this.foods = this.foods.filter(food => food.id !== id);
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to delete food';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    // Search and filter actions
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    setSelectedType(type: FoodType | null) {
      this.selectedType = type;
    },

    clearFilters() {
      this.searchQuery = '';
      this.selectedType = null;
    },

    // Utility actions
    searchFoodsByName(name: string): Food[] {
      const query = name.toLowerCase();
      return this.foods.filter(
        food =>
          food.name.toLowerCase().includes(query)
          || (food.brand && food.brand.toLowerCase().includes(query)),
      );
    },

    getFoodsByBrand(brand: string): Food[] {
      return this.foods.filter(
        food => food.brand && food.brand.toLowerCase() === brand.toLowerCase(),
      );
    },

    clearError() {
      this.error = null;
    },

    invalidateCache() {
      this.cache.lastFetch = null;
    },

    // Local state management methods
    addFoodToState(food: Food) {
      const existingIndex = this.foods.findIndex(f => f.id === food.id);
      if (existingIndex !== -1) {
        this.foods[existingIndex] = food;
      }
      else {
        this.foods.push(food);
      }
    },

    removeFoodFromState(id: string) {
      this.foods = this.foods.filter(food => food.id !== id);
    },

    // Load offline data into state
    loadOfflineData() {
      const offlineStorage = OfflineStorage.getInstance();
      this.foods = offlineStorage.getFoods();
    },
  },
});
