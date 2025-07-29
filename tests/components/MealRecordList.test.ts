import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import MealRecordList from '~/components/MealRecordList.vue';
import type { Cat, Food, MealRecord } from '~/types/cat-meal';

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// Mock data
const mockCats: Cat[] = [
  {
    id: 'cat1',
    name: 'ミケ',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cat2',
    name: 'タマ',
    birthdate: new Date('2019-06-15'),
    weight: 3.8,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockFoods: Food[] = [
  {
    id: 'food1',
    name: 'プレミアムキャットフード',
    type: 'DRY',
    brand: 'ロイヤルカナン',
    caloriesPerGram: 4.2,
    pricePerUnit: 2000,
    unit: 'g',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'food2',
    name: 'ウェットフード缶詰',
    type: 'WET',
    brand: 'ヒルズ',
    caloriesPerGram: 1.8,
    pricePerUnit: 300,
    unit: 'g',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockMealRecords: MealRecord[] = [
  {
    id: 'meal1',
    catId: 'cat1',
    foodId: 'food1',
    quantity: 50,
    calories: 210,
    mealTime: new Date('2024-01-15T08:00:00'),
    notes: '朝食',
    createdAt: new Date(),
    updatedAt: new Date(),
    cat: mockCats[0],
    food: mockFoods[0],
  },
  {
    id: 'meal2',
    catId: 'cat2',
    foodId: 'food2',
    quantity: 85,
    calories: 153,
    mealTime: new Date('2024-01-15T12:00:00'),
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    cat: mockCats[1],
    food: mockFoods[1],
  },
];

const mockApiResponse = {
  mealRecords: mockMealRecords,
  pagination: {
    total: 2,
    limit: 20,
    offset: 0,
    hasMore: false,
  },
};

describe('MealRecordList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockApiResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with meal records', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    // Wait for data to load
    await nextTick();
    await nextTick();

    expect(wrapper.find('.list-title').text()).toBe('食事履歴');
    expect(wrapper.find('.record-count').text()).toBe('2件の記録');
  });

  it('displays loading state initially', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    // Wait for component to mount and start loading
    await nextTick();

    expect(wrapper.find('.loading-state').exists()).toBe(true);
    expect(wrapper.find('.loading-spinner').exists()).toBe(true);
  });

  it('displays error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('.error-state').exists()).toBe(true);
    expect(wrapper.find('.error-message').text()).toBe(
      'データの取得に失敗しました',
    );
  });

  it('displays empty state when no records', async () => {
    mockFetch.mockResolvedValue({
      mealRecords: [],
      pagination: {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    });

    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-title').text()).toBe('食事記録がありません');
  });

  it('renders meal record cards correctly', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    const cards = wrapper.findAll('.meal-record-card');
    expect(cards).toHaveLength(2);

    // Check first card
    const firstCard = cards[0];
    expect(firstCard.find('.cat-name').text()).toBe('ミケ');
    expect(firstCard.find('.food-name').text()).toContain(
      'プレミアムキャットフード',
    );
    expect(firstCard.find('.food-brand').text()).toBe('(ロイヤルカナン)');
    expect(firstCard.find('.quantity-value').text()).toBe('50');
    expect(firstCard.find('.calories-value').text()).toBe('210');
    expect(firstCard.find('.notes-content').text()).toBe('朝食');
  });

  it('handles cat filter correctly', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    // Click on cat filter
    const catButtons = wrapper.findAll('.cat-filter .filter-button');
    await catButtons[1].trigger('click'); // First cat (index 1 because "すべて" is index 0)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('catId=cat1'),
    );
  });

  it('handles date range shortcuts correctly', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    // Click on "今日" shortcut
    const dateButtons = wrapper.findAll('.date-shortcuts .filter-button');
    await dateButtons[0].trigger('click');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('startDate='),
    );
  });

  it('handles food type filter correctly', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    // Click on DRY filter
    const foodTypeButtons = wrapper.findAll('.food-type-filter .filter-button');
    await foodTypeButtons[1].trigger('click'); // DRY button

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('foodType=DRY'),
    );
  });

  it('clears filters correctly', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
        initialFilter: { catId: 'cat1' },
      },
    });

    await nextTick();
    await nextTick();

    // Clear filters button should be visible
    expect(wrapper.find('.clear-filters-button').exists()).toBe(true);

    await wrapper.find('.clear-filters-button').trigger('click');

    // Should call fetch without filters
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=20&offset=0'),
    );
  });

  it('emits edit event when edit button is clicked', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    const editButton = wrapper.find('.edit-button');
    await editButton.trigger('click');

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockMealRecords[0]]);
  });

  it('emits delete event when delete button is clicked', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    const deleteButton = wrapper.find('.delete-button');
    await deleteButton.trigger('click');

    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('delete')?.[0]).toEqual([mockMealRecords[0]]);
  });

  it('handles load more functionality', async () => {
    mockFetch.mockResolvedValue({
      mealRecords: mockMealRecords,
      pagination: {
        total: 40,
        limit: 20,
        offset: 0,
        hasMore: true,
      },
    });

    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('.load-more-button').exists()).toBe(true);

    // Mock second page response
    mockFetch.mockResolvedValueOnce({
      mealRecords: [mockMealRecords[0]], // One more record
      pagination: {
        total: 40,
        limit: 20,
        offset: 20,
        hasMore: true,
      },
    });

    await wrapper.find('.load-more-button').trigger('click');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('offset=20'),
    );
  });

  it('formats meal time correctly', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    const mealTime = wrapper.find('.meal-time').text();
    expect(mealTime).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  it('formats quantity correctly', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    const quantityValues = wrapper.findAll('.quantity-value');
    expect(quantityValues[0].text()).toBe('50'); // Integer
    expect(quantityValues[1].text()).toBe('85'); // Integer
  });

  it('shows food type badges correctly', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    const badges = wrapper.findAll('.food-type-badge');
    expect(badges[0].text()).toBe('ドライ');
    expect(badges[0].classes()).toContain('food-type-badge--dry');
    expect(badges[1].text()).toBe('ウェット');
    expect(badges[1].classes()).toContain('food-type-badge--wet');
  });

  it('shows notes when available', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    const cards = wrapper.findAll('.meal-record-card');

    // First card has notes
    expect(cards[0].find('.notes').exists()).toBe(true);
    expect(cards[0].find('.notes-content').text()).toBe('朝食');

    // Second card has no notes
    expect(cards[1].find('.notes').exists()).toBe(false);
  });

  it('emits filter-change event when filters are applied', async () => {
    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    // Apply cat filter
    const catButtons = wrapper.findAll('.cat-filter .filter-button');
    await catButtons[1].trigger('click');

    expect(wrapper.emitted('filter-change')).toBeTruthy();
    expect(wrapper.emitted('filter-change')?.[0][0]).toMatchObject({
      catId: 'cat1',
    });
  });

  it('handles retry button in error state', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
      },
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('.error-state').exists()).toBe(true);

    // Mock successful retry
    mockFetch.mockResolvedValueOnce(mockApiResponse);

    await wrapper.find('.retry-button').trigger('click');

    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial call + retry
  });

  it('respects initial filter prop', async () => {
    const initialFilter = { catId: 'cat1', foodType: 'DRY' as const };

    mount(MealRecordList, {
      props: {
        cats: mockCats,
        foods: mockFoods,
        initialFilter,
      },
    });

    await nextTick();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('catId=cat1'),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('foodType=DRY'),
    );
  });
});
