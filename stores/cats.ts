import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Cat, CatInput, CatUpdate, CatFilter } from '~/types/cat-meal';
import { OfflineStorage } from '~/utils/offline-storage';
import { useSync } from '~/composables/useSync';

export const useCatsStore = defineStore('cats', () => {
  // State
  const cats = ref<Cat[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const cache = ref({
    lastFetch: null as Date | null,
    ttl: 5 * 60 * 1000, // 5 minutes
  });

  // Getters
  const getCatById = computed(() =>
    (id: string): Cat | undefined => {
      return cats.value.find(cat => cat.id === id);
    },
  );

  const getCatsByName = computed(() =>
    (name: string): Cat[] => {
      return cats.value.filter(cat =>
        cat.name.toLowerCase().includes(name.toLowerCase()),
      );
    },
  );

  const sortedCats = computed((): Cat[] => {
    return [...cats.value].sort((a, b) => a.name.localeCompare(b.name));
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
  const fetchCats = async (filter?: CatFilter, forceRefresh = false) => {
    console.log('🐱 猫ストア: fetchCats開始', { filter, forceRefresh });

    // Use cache if valid and not forcing refresh
    if (!forceRefresh && isCacheValid.value && cats.value.length > 0) {
      console.log('🐱 猫ストア: キャッシュを使用');
      return cats.value;
    }

    loading.value = true;
    error.value = null;

    try {
      const query = new URLSearchParams();
      if (filter?.name) query.append('name', filter.name);
      if (filter?.limit) query.append('limit', filter.limit.toString());
      if (filter?.offset) query.append('offset', filter.offset.toString());

      const queryString = query.toString();
      const url = `/api/cats${queryString ? `?${queryString}` : ''}`;

      console.log('🐱 猫ストア: API呼び出し', url);
      const data = await $fetch<Cat[]>(url);
      console.log('🐱 猫ストア: API レスポンス', data);

      cats.value = data.map(cat => ({
        ...cat,
        birthdate: cat.birthdate ? new Date(cat.birthdate) : undefined,
        createdAt: new Date(cat.createdAt),
        updatedAt: new Date(cat.updatedAt),
      }));

      cache.value.lastFetch = new Date();
      console.log('🐱 猫ストア: データ設定完了', cats.value.length);
      return cats.value;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch cats';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const createCat = async (catInput: CatInput): Promise<Cat> => {
    const { syncStatus, offlineOperations } = useSync();
    loading.value = true;
    error.value = null;

    try {
      if (syncStatus.value.isOnline) {
        // Online: Create on server
        const data = await $fetch<Cat>('/api/cats', {
          method: 'POST',
          body: catInput,
        });

        const newCat = {
          ...data,
          birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        };

        cats.value.push(newCat);
        return newCat;
      }
      else {
        // Offline: Create locally with temporary ID
        const localId = offlineOperations.addCat({
          name: catInput.name,
          birthdate: catInput.birthdate
            ? new Date(catInput.birthdate)
            : undefined,
          weight: catInput.weight,
          photoUrl: catInput.photoUrl,
        });

        const newCat: Cat = {
          id: localId,
          name: catInput.name,
          birthdate: catInput.birthdate
            ? new Date(catInput.birthdate)
            : undefined,
          weight: catInput.weight,
          photoUrl: catInput.photoUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        cats.value.push(newCat);
        return newCat;
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create cat';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const updateCat = async (id: string, catUpdate: CatUpdate): Promise<Cat> => {
    const { syncStatus, offlineOperations } = useSync();
    loading.value = true;
    error.value = null;

    try {
      if (syncStatus.value.isOnline) {
        // Online: Update on server
        const response = await $fetch<{ cat: Cat; message: string }>(`/api/cats/${id}`, {
          method: 'PUT',
          body: catUpdate,
        });

        const updatedCat = {
          ...response.cat,
          birthdate: response.cat.birthdate ? new Date(response.cat.birthdate) : undefined,
          createdAt: new Date(response.cat.createdAt),
          updatedAt: new Date(response.cat.updatedAt),
        };

        const index = cats.value.findIndex(cat => cat.id === id);
        if (index !== -1) {
          cats.value[index] = updatedCat;
        }

        return updatedCat;
      }
      else {
        // Offline: Update locally
        offlineOperations.updateCat(id, catUpdate);

        const index = cats.value.findIndex(cat => cat.id === id);
        if (index !== -1) {
          const updatedCat = {
            ...cats.value[index],
            ...catUpdate,
            birthdate: catUpdate.birthdate
              ? new Date(catUpdate.birthdate)
              : cats.value[index]?.birthdate,
            updatedAt: new Date(),
          };
          const validatedCat = {
            ...updatedCat,
            id: updatedCat.id || cats.value[index]?.id || '',
          };
          cats.value[index] = validatedCat as Cat;
          return validatedCat as Cat;
        }

        throw new Error('Cat not found');
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update cat';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const deleteCat = async (id: string): Promise<void> => {
    const { syncStatus, offlineOperations } = useSync();
    loading.value = true;
    error.value = null;

    try {
      if (syncStatus.value.isOnline) {
        // Online: Delete on server
        await $fetch(`/api/cats/${id}`, {
          method: 'DELETE',
        });
      }
      else {
        // Offline: Mark for deletion
        offlineOperations.deleteCat(id);
      }

      cats.value = cats.value.filter(cat => cat.id !== id);
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete cat';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const invalidateCache = () => {
    cache.value.lastFetch = null;
  };

  // Local state management methods
  const addCatToState = (cat: Cat) => {
    const existingIndex = cats.value.findIndex(c => c.id === cat.id);
    if (existingIndex !== -1) {
      cats.value[existingIndex] = cat;
    }
    else {
      cats.value.push(cat);
    }
  };

  const removeCatFromState = (id: string) => {
    cats.value = cats.value.filter(cat => cat.id !== id);
  };

  // Load offline data into state
  const loadOfflineData = () => {
    const offlineStorage = OfflineStorage.getInstance();
    cats.value = offlineStorage.getCats();
  };

  return {
    // State
    cats,
    loading,
    error,
    cache,
    // Getters
    getCatById,
    getCatsByName,
    sortedCats,
    isLoading,
    hasError,
    isCacheValid,
    // Actions
    fetchCats,
    createCat,
    updateCat,
    deleteCat,
    clearError,
    invalidateCache,
    addCatToState,
    removeCatFromState,
    loadOfflineData,
  };
});
