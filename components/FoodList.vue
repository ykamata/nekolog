<script setup lang="ts">
import type { Food } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

interface Props {
  foods: Food[];
  loading?: boolean;
  showActions?: boolean;
}

interface Emits {
  (e: 'select' | 'edit' | 'delete', food: Food): void;
  (e: 'add'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
});

const emit = defineEmits<Emits>();

// Filter and search state
const searchQuery = ref('');
const selectedType = ref<FoodType | null>(null);
const sortBy = ref<'name' | 'type' | 'calories' | 'price'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

// Computed properties
const filteredAndSortedFoods = computed(() => {
  let filtered = props.foods;

  // Filter by search query
  if (searchQuery.value.trim()) {
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

  // Sort
  filtered.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy.value) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'calories':
        aValue = a.caloriesPerGram;
        bValue = b.caloriesPerGram;
        break;
      case 'price':
        aValue = a.pricePerUnit || 0;
        bValue = b.pricePerUnit || 0;
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
});

const foodTypeOptions = computed(() => [
  { value: null, label: 'すべて' },
  { value: FoodType.DRY, label: 'ドライフード' },
  { value: FoodType.WET, label: 'ウェットフード' },
]);

const sortOptions = computed(() => [
  { value: 'name', label: '名前' },
  { value: 'type', label: 'タイプ' },
  { value: 'calories', label: 'カロリー' },
  { value: 'price', label: '価格' },
]);

// Methods
const handleSelectFood = (food: Food) => {
  emit('select', food);
};

const handleEditFood = (food: Food) => {
  emit('edit', food);
};

const handleDeleteFood = (food: Food) => {
  emit('delete', food);
};

const handleAddFood = () => {
  emit('add');
};

const handleSortChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const newSortBy = target.value as 'name' | 'type' | 'calories' | 'price';

  if (sortBy.value === newSortBy) {
    // Toggle sort order if same field
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  }
  else {
    sortBy.value = newSortBy;
    sortOrder.value = 'asc';
  }
};

// Format functions
const formatFoodType = (type: FoodType): string => {
  return type === FoodType.DRY ? 'ドライフード' : 'ウェットフード';
};

const formatCalories = (caloriesPerGram: number): string => {
  return `${caloriesPerGram}kcal/g`;
};

const formatPrice = (price?: number): string => {
  if (!price) return '未設定';
  return `¥${price.toLocaleString()}`;
};

const getFoodTypeColor = (type: FoodType): string => {
  return type === FoodType.DRY ? '#8bc34a' : '#ff9800';
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedType.value = null;
  sortBy.value = 'name';
  sortOrder.value = 'asc';
};
</script>

<template>
  <div class="food-list">
    <div class="food-list__header">
      <h2 class="food-list__title">
        フード管理
      </h2>
      <button
        v-if="showActions"
        :disabled="loading"
        class="btn btn--primary"
        @click="handleAddFood"
      >
        + 新しいフードを追加
      </button>
    </div>

    <!-- Filters and Search -->
    <div class="food-list__controls">
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="フード名やブランドで検索..."
        >
        <div class="search-icon">
          🔍
        </div>
      </div>

      <div class="filter-container">
        <select
          v-model="selectedType"
          class="filter-select"
        >
          <option
            v-for="option in foodTypeOptions"
            :key="option.value || 'all'"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="sort-container">
        <select
          :value="sortBy"
          class="sort-select"
          @change="handleSortChange"
        >
          <option
            v-for="option in sortOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}順
          </option>
        </select>
        <button
          class="sort-order-btn"
          :class="{ 'sort-order-btn--desc': sortOrder === 'desc' }"
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
        >
          {{ sortOrder === "asc" ? "↑" : "↓" }}
        </button>
      </div>

      <button
        v-if="searchQuery || selectedType"
        class="clear-filters-btn"
        @click="clearFilters"
      >
        フィルタをクリア
      </button>
    </div>

    <div
      v-if="loading"
      class="food-list__loading"
    >
      <div class="loading-spinner" />
      <p>フード情報を読み込み中...</p>
    </div>

    <div
      v-else-if="filteredAndSortedFoods.length === 0"
      class="food-list__empty"
    >
      <div class="empty-state">
        <div class="empty-state__icon">
          🍽️
        </div>
        <h3 class="empty-state__title">
          {{
            searchQuery || selectedType
              ? "該当するフードが見つかりません"
              : "フードが登録されていません"
          }}
        </h3>
        <p class="empty-state__message">
          {{
            searchQuery || selectedType
              ? "検索条件を変更してみてください。"
              : "最初のフードを追加して、食事管理を始めましょう。"
          }}
        </p>
        <button
          v-if="showActions && !searchQuery && !selectedType"
          class="btn btn--primary"
          @click="handleAddFood"
        >
          フードを追加する
        </button>
      </div>
    </div>

    <div
      v-else
      class="food-list__grid"
    >
      <div
        v-for="food in filteredAndSortedFoods"
        :key="food.id"
        class="food-card"
        @click="handleSelectFood(food)"
      >
        <div class="food-card__header">
          <div
            class="food-card__type-badge"
            :style="{ backgroundColor: getFoodTypeColor(food.type) }"
          >
            {{ formatFoodType(food.type) }}
          </div>
          <div
            v-if="showActions"
            class="food-card__menu"
          >
            <button
              class="menu-btn"
              @click.stop="handleEditFood(food)"
            >
              ✏️
            </button>
            <button
              class="menu-btn menu-btn--danger"
              @click.stop="handleDeleteFood(food)"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="food-card__content">
          <h3 class="food-card__name">
            {{ food.name }}
          </h3>

          <div
            v-if="food.brand"
            class="food-card__brand"
          >
            {{ food.brand }}
          </div>

          <div class="food-card__info">
            <div class="food-card__info-item">
              <span class="food-card__info-label">カロリー:</span>
              <span class="food-card__info-value">{{
                formatCalories(food.caloriesPerGram)
              }}</span>
            </div>

            <div class="food-card__info-item">
              <span class="food-card__info-label">価格:</span>
              <span class="food-card__info-value">{{
                formatPrice(food.pricePerUnit)
              }}</span>
            </div>

            <div class="food-card__info-item">
              <span class="food-card__info-label">単位:</span>
              <span class="food-card__info-value">{{ food.unit }}</span>
            </div>

            <div
              v-if="food._count?.meals !== undefined"
              class="food-card__info-item"
            >
              <span class="food-card__info-label">使用回数:</span>
              <span class="food-card__info-value">{{ food._count.meals }}回</span>
            </div>
          </div>

          <div
            v-if="showActions"
            class="food-card__actions"
          >
            <button
              class="btn btn--small btn--secondary"
              @click.stop="handleEditFood(food)"
            >
              編集
            </button>
            <button
              class="btn btn--small btn--danger"
              @click.stop="handleDeleteFood(food)"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.food-list {
  width: 100%;
}

.food-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 0 1rem 1rem 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.food-list__title {
  margin: 0;
  padding: 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.food-list__controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-container {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.search-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  pointer-events: none;
}

.filter-container,
.sort-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-select,
.sort-select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  min-width: 120px;
}

.filter-select:focus,
.sort-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.sort-order-btn {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.sort-order-btn:hover {
  background-color: #f8fff8;
  border-color: #4caf50;
}

.sort-order-btn--desc {
  background-color: #4caf50;
  color: white;
  border-color: #4caf50;
}

.clear-filters-btn {
  padding: 0.75rem 1rem;
  border: 1px solid #ff9800;
  border-radius: 4px;
  background: #fff3e0;
  color: #ff9800;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.clear-filters-btn:hover {
  background-color: #ff9800;
  color: white;
}

.food-list__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.food-list__empty {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

.empty-state {
  text-align: center;
  max-width: 400px;
}

.empty-state__icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state__title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #333;
}

.empty-state__message {
  margin: 0 0 2rem 0;
  color: #666;
  line-height: 1.5;
}

.food-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.food-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.food-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #4caf50;
}

.food-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f8f8f8;
  border-bottom: 1px solid #e0e0e0;
}

.food-card__type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  color: white;
  font-size: 0.8rem;
  font-weight: 500;
}

.food-card__menu {
  display: flex;
  gap: 0.25rem;
}

.menu-btn {
  padding: 0.25rem;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.menu-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.menu-btn--danger:hover {
  background-color: rgba(244, 67, 54, 0.1);
}

.food-card__content {
  padding: 1.25rem;
}

.food-card__name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.food-card__brand {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #666;
  font-style: italic;
}

.food-card__info {
  margin-bottom: 1.5rem;
}

.food-card__info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.food-card__info-label {
  font-weight: 500;
  color: #666;
}

.food-card__info-value {
  color: #333;
}

.food-card__actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn--primary {
  background-color: #4caf50;
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: #388e3c;
}

.btn--secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn--secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.btn--danger {
  background-color: #f44336;
  color: white;
}

.btn--danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

.btn--small {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  flex: 1;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .food-list__header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .food-list__controls {
    flex-direction: column;
    gap: 0.75rem;
  }

  .search-container {
    min-width: auto;
  }

  .filter-container,
  .sort-container {
    justify-content: space-between;
  }

  .filter-select,
  .sort-select {
    min-width: auto;
    flex: 1;
  }

  .food-list__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .food-card__content {
    padding: 1rem;
  }

  .food-card__actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .food-list__header {
    margin-bottom: 1rem;
  }

  .food-list__title {
    font-size: 1.25rem;
  }

  .empty-state__icon {
    font-size: 3rem;
  }
}
</style>
