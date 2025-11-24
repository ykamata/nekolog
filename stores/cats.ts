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
    ttl: 30 * 1000, // 30秒に短縮（開発時は短めに設定）
  });

  // Getters
  const getCatById = computed(() =>
    (id: number): Cat | undefined => {
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

      // キャッシュを無効化するためのヘッダーを追加
      const data = await $fetch<Cat[]>(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

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
      console.error('🐱 猫ストア: エラー発生', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch cats';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const createCat = async (catInput: CatInput): Promise<Cat> => {
    const { syncStatus } = useSync();
    loading.value = true;
    error.value = null;

    try {
      // オフライン時は登録不可
      if (!syncStatus.value.isOnline) {
        throw new Error('オフライン時はデータの登録ができません');
      }

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
      // キャッシュを無効化して次回確実に最新データを取得
      invalidateCache();
      return newCat;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create cat';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const updateCat = async (id: number, catUpdate: CatUpdate): Promise<Cat> => {
    const { syncStatus } = useSync();
    loading.value = true;
    error.value = null;

    try {
      // オフライン時は更新不可
      if (!syncStatus.value.isOnline) {
        throw new Error('オフライン時はデータの更新ができません');
      }

      // Online: Update on server
      console.log('🐱 catsStore.updateCat - Sending data:', JSON.stringify(catUpdate, null, 2));
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

      // キャッシュを無効化して次回確実に最新データを取得
      invalidateCache();
      return updatedCat;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update cat';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const deleteCat = async (id: number): Promise<void> => {
    const { syncStatus } = useSync();
    loading.value = true;
    error.value = null;

    try {
      // オフライン時は削除不可
      if (!syncStatus.value.isOnline) {
        throw new Error('オフライン時はデータの削除ができません');
      }

      // Online: Delete on server
      await $fetch(`/api/cats/${id}`, {
        method: 'DELETE',
      });

      cats.value = cats.value.filter(cat => cat.id !== id);
      // キャッシュを無効化して次回確実に最新データを取得
      invalidateCache();
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
    console.log('🐱 猫ストア: キャッシュを無効化');
  };

  // 強制リフレッシュ用のメソッドを追加
  const refreshCats = async (filter?: CatFilter) => {
    console.log('🐱 猫ストア: 強制リフレッシュ実行');
    return await fetchCats(filter, true);
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

  const removeCatFromState = (id: number) => {
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
    refreshCats, // 新しく追加
    addCatToState,
    removeCatFromState,
    loadOfflineData,
  };
}); ;
