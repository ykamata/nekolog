import { defineStore } from 'pinia';
import type { Cat, CatInput, CatUpdate, CatFilter } from '~/types/cat-meal';
import { OfflineStorage } from '~/utils/offline-storage';
import { useSync } from '~/composables/useSync';

interface CatsState {
  cats: Cat[];
  loading: boolean;
  error: string | null;
  cache: {
    lastFetch: Date | null;
    ttl: number; // Time to live in milliseconds
  };
}

export const useCatsStore = defineStore('cats', {
  state: (): CatsState => ({
    cats: [],
    loading: false,
    error: null,
    cache: {
      lastFetch: null,
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  }),

  getters: {
    getCatById:
      state =>
        (id: string): Cat | undefined => {
          return state.cats.find(cat => cat.id === id);
        },

    getCatsByName:
      state =>
        (name: string): Cat[] => {
          return state.cats.filter(cat =>
            cat.name.toLowerCase().includes(name.toLowerCase()),
          );
        },

    sortedCats: (state): Cat[] => {
      return [...state.cats].sort((a, b) => a.name.localeCompare(b.name));
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
    async fetchCats(filter?: CatFilter, forceRefresh = false) {
      const { syncStatus } = useSync();
      const offlineStorage = OfflineStorage.getInstance();

      // If offline, load from local storage
      if (!syncStatus.value.isOnline) {
        this.loading = true;
        try {
          const localCats = offlineStorage.getCats();
          this.cats = localCats;
          return this.cats;
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
      if (!forceRefresh && this.isCacheValid && this.cats.length > 0) {
        return this.cats;
      }

      this.loading = true;
      this.error = null;

      try {
        const query = new URLSearchParams();
        if (filter?.name) query.append('name', filter.name);
        if (filter?.limit) query.append('limit', filter.limit.toString());
        if (filter?.offset) query.append('offset', filter.offset.toString());

        const queryString = query.toString();
        const url = `/api/cats${queryString ? `?${queryString}` : ''}`;

        const data = await $fetch<Cat[]>(url);

        this.cats = data.map(cat => ({
          ...cat,
          birthdate: cat.birthdate ? new Date(cat.birthdate) : undefined,
          createdAt: new Date(cat.createdAt),
          updatedAt: new Date(cat.updatedAt),
        }));

        this.cache.lastFetch = new Date();
        return this.cats;
      }
      catch (error) {
        // Fallback to offline data if available
        try {
          const localCats = offlineStorage.getCats();
          if (localCats.length > 0) {
            this.cats = localCats;
            this.error = 'Using offline data';
            return this.cats;
          }
        }
        catch {
          // Ignore offline error, use original error
        }

        this.error
          = error instanceof Error ? error.message : 'Failed to fetch cats';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async createCat(catInput: CatInput): Promise<Cat> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

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

          this.cats.push(newCat);
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

          this.cats.push(newCat);
          return newCat;
        }
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to create cat';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async updateCat(id: string, catUpdate: CatUpdate): Promise<Cat> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Update on server
          const data = await $fetch<Cat>(`/api/cats/${id}`, {
            method: 'PUT',
            body: catUpdate,
          });

          const updatedCat = {
            ...data,
            birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          };

          const index = this.cats.findIndex(cat => cat.id === id);
          if (index !== -1) {
            this.cats[index] = updatedCat;
          }

          return updatedCat;
        }
        else {
          // Offline: Update locally
          offlineOperations.updateCat(id, catUpdate);

          const index = this.cats.findIndex(cat => cat.id === id);
          if (index !== -1) {
            const updatedCat = {
              ...this.cats[index],
              ...catUpdate,
              birthdate: catUpdate.birthdate
                ? new Date(catUpdate.birthdate)
                : this.cats[index].birthdate,
              updatedAt: new Date(),
            };
            this.cats[index] = updatedCat;
            return updatedCat;
          }

          throw new Error('Cat not found');
        }
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to update cat';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async deleteCat(id: string): Promise<void> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

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

        this.cats = this.cats.filter(cat => cat.id !== id);
      }
      catch (error) {
        this.error
          = error instanceof Error ? error.message : 'Failed to delete cat';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },

    invalidateCache() {
      this.cache.lastFetch = null;
    },

    // Local state management methods
    addCatToState(cat: Cat) {
      const existingIndex = this.cats.findIndex(c => c.id === cat.id);
      if (existingIndex !== -1) {
        this.cats[existingIndex] = cat;
      }
      else {
        this.cats.push(cat);
      }
    },

    removeCatFromState(id: string) {
      this.cats = this.cats.filter(cat => cat.id !== id);
    },

    // Load offline data into state
    loadOfflineData() {
      const offlineStorage = OfflineStorage.getInstance();
      this.cats = offlineStorage.getCats();
    },
  },
});
