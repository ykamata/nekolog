import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Food,
  FoodInput,
  FoodUpdate,
  FoodFilter,
  FoodType,
} from '~/types/cat-meal';
import { OfflineStorage } from '~/utils/offline-storage';
import { useSync } from '~/composables/useSync';

export const useFoodsStore = defineStore('foods', () => {
  // State
  const foods = ref<Food[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const searchQuery = ref('');
  const selectedType = ref<FoodType | null>(null);
  const cache = ref({
    lastFetch: null as Date | null,
    ttl: 10 * 60 * 1000, // 10 minutes (foods change less frequently)
  });

  // Getters
  const getFoodById = computed(() =>
    (id: string): Food | undefined => {
      return foods.value.find(food => food.id === id);
    },
  );

  const filteredFoods = computed((): Food[] => {
    let filtered = [...foods.value];

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        food =>
          food.name.toLowerCase().includes(query)
          || (food.brand && food.brand.toLowerCase().includes(query)),
      );
    }

    // Filter by type
    if (selectedType.value) {
      filtered = filtered.filter(food => food.type === selectedType.value);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  });

  const foodsByType = computed(() =>
    (type: FoodType): Food[] => {
      return foods.value.filter(food => food.type === type);
    },
  );

  const dryFoods = computed((): Food[] => {
    return foods.value.filter(food => food.type === 'DRY');
  });

  const wetFoods = computed((): Food[] => {
    return foods.value.filter(food => food.type === 'WET');
  });

  const uniqueBrands = computed((): string[] => {
    const brands = foods.value
      .map(food => food.brand)
      .filter((brand): brand is string => !!brand);
    return [...new Set(brands)].sort();
  });

  const isLoading = computed((): boolean => loading.value);

  const hasError = computed((): boolean => !!error.value);

  const isCacheValid = computed((): boolean => {
    if (!cache.value.lastFetch) return false;
    const now = new Date();
    const timeDiff = now.getTime() - cache.value.lastFetch.getTime();
    return timeDiff < cache.value.ttl;
  });

  // Actions
  const fetchFoods = async (filter?: FoodFilter, forceRefresh = false) => {
    console.log('🥫 フードストア: fetchFoods開始', { filter, forceRefresh });

    // Use cache if valid and not forcing refresh
    if (!forceRefresh && isCacheValid.value && foods.value.length > 0) {
      console.log('🥫 フードストア: キャッシュを使用');
      return filteredFoods.value;
    }

    loading.value = true;
    error.value = null;

    try {
      const query = new URLSearchParams();
      if (filter?.name) query.append('name', filter.name);
      if (filter?.type) query.append('type', filter.type);
      if (filter?.brand) query.append('brand', filter.brand);
      if (filter?.limit) query.append('limit', filter.limit.toString());
      if (filter?.offset) query.append('offset', filter.offset.toString());

      const queryString = query.toString();
      const url = `/api/foods${queryString ? `?${queryString}` : ''}`;

      console.log('🥫 フードストア: API呼び出し', url);
      const data = await $fetch<Food[]>(url);
      console.log('🥫 フードストア: API レスポンス', data);

      foods.value = data.map(food => ({
        ...food,
        createdAt: new Date(food.createdAt),
        updatedAt: new Date(food.updatedAt),
      }));

      cache.value.lastFetch = new Date();
      console.log('🥫 フードストア: データ設定完了', foods.value.length);
      return filteredFoods.value;
    }
    catch (err) {
      console.error('🥫 フードストア: エラー', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch foods';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const createFood = async (foodInput: FoodInput): Promise<Food> => {
    const { syncStatus } = useSync();
    loading.value = true;
    error.value = null;

    try {
      // オフライン時は登録不可
      if (!syncStatus.value.isOnline) {
        throw new Error('オフライン時はデータの登録ができません');
      }

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

      foods.value.push(newFood);
      return newFood;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create food';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const updateFood = async (id: string, foodUpdate: FoodUpdate): Promise<Food> => {
    const { syncStatus } = useSync();
    loading.value = true;
    error.value = null;

    try {
      // オフライン時は更新不可
      if (!syncStatus.value.isOnline) {
        throw new Error('オフライン時はデータの更新ができません');
      }

      // Online: Update on server
      const data = await $fetch<Food>(`/api/foods/${id}`, {
        method: 'PUT',
        body: foodUpdate,
      });

      const updatedFood = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };

      const index = foods.value.findIndex(food => food.id === id);
      if (index !== -1) {
        foods.value[index] = updatedFood;
      }

      return updatedFood;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update food';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const deleteFood = async (id: string): Promise<void> => {
    const { syncStatus } = useSync();
    loading.value = true;
    error.value = null;

    try {
      // オフライン時は削除不可
      if (!syncStatus.value.isOnline) {
        throw new Error('オフライン時はデータの削除ができません');
      }

      // Online: Delete on server
      await $fetch(`/api/foods/${id}`, {
        method: 'DELETE',
      } as any);

      foods.value = foods.value.filter(food => food.id !== id);
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete food';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  // Search and filter actions
  const setSearchQuery = (query: string) => {
    searchQuery.value = query;
  };

  const setSelectedType = (type: FoodType | null) => {
    selectedType.value = type;
  };

  const clearFilters = () => {
    searchQuery.value = '';
    selectedType.value = null;
  };

  // Utility actions
  const searchFoodsByName = (name: string): Food[] => {
    const query = name.toLowerCase();
    return foods.value.filter(
      food =>
        food.name.toLowerCase().includes(query)
        || (food.brand && food.brand.toLowerCase().includes(query)),
    );
  };

  const getFoodsByBrand = (brand: string): Food[] => {
    return foods.value.filter(
      food => food.brand && food.brand.toLowerCase() === brand.toLowerCase(),
    );
  };

  const clearError = () => {
    error.value = null;
  };

  const invalidateCache = () => {
    cache.value.lastFetch = null;
  };

  // Local state management methods
  const addFoodToState = (food: Food) => {
    const existingIndex = foods.value.findIndex(f => f.id === food.id);
    if (existingIndex !== -1) {
      foods.value[existingIndex] = food;
    }
    else {
      foods.value.push(food);
    }
  };

  const removeFoodFromState = (id: string) => {
    foods.value = foods.value.filter(food => food.id !== id);
  };

  // Load offline data into state
  const loadOfflineData = () => {
    const offlineStorage = OfflineStorage.getInstance();
    foods.value = offlineStorage.getFoods();
  };

  return {
    // State
    foods,
    loading,
    error,
    searchQuery,
    selectedType,
    cache,
    // Getters
    getFoodById,
    filteredFoods,
    foodsByType,
    dryFoods,
    wetFoods,
    uniqueBrands,
    isLoading,
    hasError,
    isCacheValid,
    // Actions
    fetchFoods,
    createFood,
    updateFood,
    deleteFood,
    setSearchQuery,
    setSelectedType,
    clearFilters,
    searchFoodsByName,
    getFoodsByBrand,
    clearError,
    invalidateCache,
    addFoodToState,
    removeFoodFromState,
    loadOfflineData,
  };
});
