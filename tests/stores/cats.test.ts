import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCatsStore } from '~/stores/cats';
import type { Cat, CatInput, CatUpdate } from '~/types/cat-meal';

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('useCatsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockCat: Cat = {
    id: 1,
    name: 'Test Cat',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
    photoUrl: 'test.jpg',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockCatInput: CatInput = {
    name: 'New Cat',
    birthdate: new Date('2021-01-01'),
    weight: 3.5,
  };

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useCatsStore();

      expect(store.cats).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.cache.lastFetch).toBe(null);
      expect(store.cache.ttl).toBe(5 * 60 * 1000);
    });
  });

  describe('getters', () => {
    it('should get cat by id', () => {
      const store = useCatsStore();
      store.cats = [mockCat];

      expect(store.getCatById(1)).toEqual(mockCat);
      expect(store.getCatById(999)).toBeUndefined();
    });

    it('should get cats by name', () => {
      const store = useCatsStore();
      const cat1 = { ...mockCat, name: 'Fluffy' };
      const cat2 = { ...mockCat, id: 2, name: 'Mittens' };
      store.cats = [cat1, cat2];

      expect(store.getCatsByName('flu')).toEqual([cat1]);
      expect(store.getCatsByName('mit')).toEqual([cat2]);
      expect(store.getCatsByName('nonexistent')).toEqual([]);
    });

    it('should return sorted cats', () => {
      const store = useCatsStore();
      const cat1 = { ...mockCat, name: 'Zebra' };
      const cat2 = { ...mockCat, id: 2, name: 'Alpha' };
      store.cats = [cat1, cat2];

      expect(store.sortedCats).toEqual([cat2, cat1]);
    });

    it('should check cache validity', () => {
      const store = useCatsStore();

      // No cache
      expect(store.isCacheValid).toBe(false);

      // Fresh cache
      store.cache.lastFetch = new Date();
      expect(store.isCacheValid).toBe(true);

      // Expired cache
      store.cache.lastFetch = new Date(Date.now() - 10 * 60 * 1000);
      expect(store.isCacheValid).toBe(false);
    });
  });

  describe('fetchCats', () => {
    it('should fetch cats successfully', async () => {
      const store = useCatsStore();
      mockFetch.mockResolvedValueOnce([mockCat]);

      const result = await store.fetchCats();

      expect(mockFetch).toHaveBeenCalledWith('/api/cats');
      expect(store.cats).toHaveLength(1);
      expect(store.cats[0].name).toBe('Test Cat');
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(result).toEqual(store.cats);
    });

    it('should use cache when valid', async () => {
      const store = useCatsStore();
      store.cats = [mockCat];
      store.cache.lastFetch = new Date();

      const result = await store.fetchCats();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual([mockCat]);
    });

    it('should force refresh when requested', async () => {
      const store = useCatsStore();
      store.cats = [mockCat];
      store.cache.lastFetch = new Date();
      mockFetch.mockResolvedValueOnce([mockCat]);

      await store.fetchCats(undefined, true);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      const store = useCatsStore();
      const error = new Error('Fetch failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.fetchCats()).rejects.toThrow('Fetch failed');
      expect(store.error).toBe('Fetch failed');
      expect(store.loading).toBe(false);
    });

    it('should apply filters', async () => {
      const store = useCatsStore();
      mockFetch.mockResolvedValueOnce([mockCat]);

      await store.fetchCats({ name: 'test', limit: 10, offset: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cats?name=test&limit=10&offset=5',
      );
    });
  });

  describe('createCat', () => {
    it('should create cat successfully', async () => {
      const store = useCatsStore();
      mockFetch.mockResolvedValueOnce(mockCat);

      const result = await store.createCat(mockCatInput);

      expect(mockFetch).toHaveBeenCalledWith('/api/cats', {
        method: 'POST',
        body: mockCatInput,
      });
      expect(store.cats).toHaveLength(1);
      expect(store.cats[0]).toEqual(result);
      expect(result.name).toBe('Test Cat');
    });

    it('should handle create error', async () => {
      const store = useCatsStore();
      const error = new Error('Create failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.createCat(mockCatInput)).rejects.toThrow(
        'Create failed',
      );
      expect(store.error).toBe('Create failed');
    });
  });

  describe('updateCat', () => {
    it('should update cat successfully', async () => {
      const store = useCatsStore();
      store.cats = [mockCat];
      const updatedCat = { ...mockCat, name: 'Updated Cat' };
      mockFetch.mockResolvedValueOnce(updatedCat);

      const catUpdate: CatUpdate = { name: 'Updated Cat' };
      const result = await store.updateCat(1, catUpdate);

      expect(mockFetch).toHaveBeenCalledWith('/api/cats/1', {
        method: 'PUT',
        body: catUpdate,
      });
      expect(store.cats[0].name).toBe('Updated Cat');
      expect(result.name).toBe('Updated Cat');
    });

    it('should handle update error', async () => {
      const store = useCatsStore();
      const error = new Error('Update failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.updateCat(1, { name: 'Updated' })).rejects.toThrow(
        'Update failed',
      );
      expect(store.error).toBe('Update failed');
    });
  });

  describe('deleteCat', () => {
    it('should delete cat successfully', async () => {
      const store = useCatsStore();
      store.cats = [mockCat];
      mockFetch.mockResolvedValueOnce(undefined);

      await store.deleteCat(1);

      expect(mockFetch).toHaveBeenCalledWith('/api/cats/1', {
        method: 'DELETE',
      });
      expect(store.cats).toHaveLength(0);
    });

    it('should handle delete error', async () => {
      const store = useCatsStore();
      const error = new Error('Delete failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.deleteCat(1)).rejects.toThrow('Delete failed');
      expect(store.error).toBe('Delete failed');
    });
  });

  describe('utility methods', () => {
    it('should clear error', () => {
      const store = useCatsStore();
      store.error = 'Test error';

      store.clearError();

      expect(store.error).toBe(null);
    });

    it('should invalidate cache', () => {
      const store = useCatsStore();
      store.cache.lastFetch = new Date();

      store.invalidateCache();

      expect(store.cache.lastFetch).toBe(null);
    });

    it('should add cat to state', () => {
      const store = useCatsStore();

      store.addCatToState(mockCat);

      expect(store.cats).toHaveLength(1);
      expect(store.cats[0]).toEqual(mockCat);
    });

    it('should update existing cat in state', () => {
      const store = useCatsStore();
      store.cats = [mockCat];
      const updatedCat = { ...mockCat, name: 'Updated' };

      store.addCatToState(updatedCat);

      expect(store.cats).toHaveLength(1);
      expect(store.cats[0].name).toBe('Updated');
    });

    it('should remove cat from state', () => {
      const store = useCatsStore();
      store.cats = [mockCat];

      store.removeCatFromState(1);

      expect(store.cats).toHaveLength(0);
    });
  });
});
