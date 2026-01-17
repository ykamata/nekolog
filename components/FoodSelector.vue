<script setup lang="ts">
import type { Food } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

interface Props {
  foods: Food[];
  selectedFoodId?: number;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  showSearch?: boolean;
  showTypeFilter?: boolean;
}

interface Emits {
  (e: 'select', food: Food): void;
  (e: 'search', query: string): void;
  (e: 'filter', type: FoodType | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  placeholder: 'フードを選択してください',
  disabled: false,
  showSearch: true,
  showTypeFilter: true,
});

const emit = defineEmits<Emits>();

// State
const searchQuery = ref('');
const selectedType = ref<FoodType | ''>('' as FoodType | '');
const isDropdownOpen = ref(false);
const recentSelections = ref<number[]>([]);

// Computed properties
const selectedFood = computed(() => {
  return props.foods.find(food => food.id === props.selectedFoodId);
});

const filteredFoods = computed(() => {
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
  if (selectedType.value !== '') {
    filtered = filtered.filter(food => food.type === selectedType.value);
  }

  // Sort by recent selections first, then by name
  return filtered.sort((a, b) => {
    const aIsRecent = recentSelections.value.includes(a.id);
    const bIsRecent = recentSelections.value.includes(b.id);

    if (aIsRecent && !bIsRecent) return -1;
    if (!aIsRecent && bIsRecent) return 1;

    return a.name.localeCompare(b.name);
  });
});

const recentFoods = computed(() => {
  return recentSelections.value
    .map(id => props.foods.find(food => food.id === id))
    .filter(Boolean) as Food[];
});

const foodTypeOptions = computed(() => [
  { value: '', label: 'すべて' },
  { value: FoodType.DRY, label: 'ドライフード' },
  { value: FoodType.WET, label: 'ウェットフード' },
]);

// Methods
const handleFoodSelect = (food: Food) => {
  // Add to recent selections
  const index = recentSelections.value.indexOf(food.id);
  if (index > -1) {
    recentSelections.value.splice(index, 1);
  }
  recentSelections.value.unshift(food.id);

  // Keep only last 5 recent selections
  if (recentSelections.value.length > 5) {
    recentSelections.value = recentSelections.value.slice(0, 5);
  }

  emit('select', food);
  isDropdownOpen.value = false;
};

const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  searchQuery.value = target.value;
  emit('search', target.value);
};

const handleTypeFilter = (type: FoodType | '') => {
  selectedType.value = type;
  emit('filter', type === '' ? null : type);
};

const toggleDropdown = () => {
  if (!props.disabled) {
    isDropdownOpen.value = !isDropdownOpen.value;
  }
};

const closeDropdown = () => {
  isDropdownOpen.value = false;
};

// Format food display
const formatFoodDisplay = (food: Food): string => {
  const brand = food.brand ? `${food.brand} ` : '';
  const type = food.type === FoodType.DRY ? '[ドライ]' : '[ウェット]';
  return `${brand}${food.name} ${type}`;
};

const formatCalories = (caloriesPerGram: number): string => {
  return `${caloriesPerGram}kcal/g`;
};

const formatPrice = (price?: number): string => {
  if (!price) return '';
  return `¥${price.toLocaleString()}`;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  const container = document.querySelector('.food-selector');
  if (container && !container.contains(target)) {
    closeDropdown();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);

  // Load recent selections from localStorage
  try {
    const stored = localStorage.getItem('recentFoodSelections');
    if (stored) {
      recentSelections.value = JSON.parse(stored);
    }
  }
  catch {
    // Ignore localStorage errors
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Save recent selections to localStorage
watch(
  recentSelections,
  (newSelections) => {
    try {
      localStorage.setItem(
        'recentFoodSelections',
        JSON.stringify(newSelections),
      );
    }
    catch {
      // Ignore localStorage errors
    }
  },
  { deep: true },
);
</script>

<template>
  <div class="food-selector">
    <!-- Search and Filter Controls -->
    <div
      v-if="showSearch || showTypeFilter"
      class="selector-controls"
    >
      <div
        v-if="showSearch"
        class="search-container"
      >
        <input
          :value="searchQuery"
          type="text"
          class="search-input"
          placeholder="フード名やブランドで検索..."
          :disabled="disabled"
          @input="handleSearchInput"
        >
        <div class="search-icon">
          🔍
        </div>
      </div>

      <div
        v-if="showTypeFilter"
        class="filter-container"
      >
        <select
          :value="selectedType"
          class="type-filter"
          :disabled="disabled"
          @change="
            handleTypeFilter(
              ($event.target as HTMLSelectElement).value as FoodType | '',
            )
          "
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
    </div>

    <!-- Selected Food Display -->
    <div
      class="selected-food"
      :class="{
        'selected-food--disabled': disabled,
        'selected-food--open': isDropdownOpen,
      }"
      @click="toggleDropdown"
    >
      <div
        v-if="selectedFood"
        class="selected-food-content"
      >
        <div class="selected-food-main">
          <span class="selected-food-name">{{
            formatFoodDisplay(selectedFood)
          }}</span>
          <span class="selected-food-calories">{{
            formatCalories(selectedFood.caloriesPerGram)
          }}</span>
        </div>
        <div
          v-if="selectedFood.pricePerUnit"
          class="selected-food-price"
        >
          {{ formatPrice(selectedFood.pricePerUnit) }}
        </div>
      </div>
      <div
        v-else
        class="selected-food-placeholder"
      >
        {{ placeholder }}
      </div>
      <div
        class="dropdown-arrow"
        :class="{ 'dropdown-arrow--open': isDropdownOpen }"
      >
        ▼
      </div>
    </div>

    <!-- Dropdown List -->
    <div
      v-if="isDropdownOpen"
      class="dropdown-list"
    >
      <div
        v-if="loading"
        class="dropdown-loading"
      >
        <div class="loading-spinner" />
        <span>読み込み中...</span>
      </div>

      <div
        v-else-if="filteredFoods.length === 0"
        class="dropdown-empty"
      >
        <div class="empty-icon">
          🍽️
        </div>
        <p>該当するフードが見つかりません</p>
      </div>

      <div
        v-else
        class="dropdown-content"
      >
        <!-- Recent Selections -->
        <div
          v-if="recentFoods.length > 0 && !searchQuery && selectedType === ''"
          class="recent-section"
        >
          <div class="section-header">
            最近選択したフード
          </div>
          <button
            v-for="food in recentFoods"
            :key="`recent-${food.id}`"
            type="button"
            class="food-item food-item--recent"
            @click="handleFoodSelect(food)"
          >
            <div class="food-item-main">
              <div class="food-item-name">
                {{ formatFoodDisplay(food) }}
              </div>
              <div class="food-item-details">
                <span class="food-item-calories">{{
                  formatCalories(food.caloriesPerGram)
                }}</span>
                <span
                  v-if="food.pricePerUnit"
                  class="food-item-price"
                >{{
                  formatPrice(food.pricePerUnit)
                }}</span>
              </div>
            </div>
            <div class="recent-badge">
              最近
            </div>
          </button>
          <div class="section-divider" />
        </div>

        <!-- All Foods -->
        <div class="foods-section">
          <div
            v-if="recentFoods.length > 0 && !searchQuery && !selectedType"
            class="section-header"
          >
            すべてのフード
          </div>
          <button
            v-for="food in filteredFoods"
            :key="food.id"
            type="button"
            class="food-item"
            :class="{
              'food-item--selected': food.id === selectedFoodId,
              'food-item--recent': recentSelections.includes(food.id),
            }"
            @click="handleFoodSelect(food)"
          >
            <div class="food-item-main">
              <div class="food-item-name">
                {{ formatFoodDisplay(food) }}
              </div>
              <div class="food-item-details">
                <span class="food-item-calories">{{
                  formatCalories(food.caloriesPerGram)
                }}</span>
                <span
                  v-if="food.pricePerUnit"
                  class="food-item-price"
                >{{
                  formatPrice(food.pricePerUnit)
                }}</span>
              </div>
            </div>
            <div
              v-if="food.id === selectedFoodId"
              class="selected-badge"
            >
              ✓
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.food-selector {
  position: relative;
  width: 100%;
}

.selector-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.search-container {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.search-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  pointer-events: none;
}

.filter-container {
  min-width: 140px;
}

.type-filter {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
}

.type-filter:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.selected-food {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 3rem;
}

.selected-food:hover:not(.selected-food--disabled) {
  border-color: #4caf50;
}

.selected-food--open {
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.selected-food--disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.selected-food-content {
  flex: 1;
}

.selected-food-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.selected-food-name {
  font-weight: 500;
  color: #333;
}

.selected-food-calories {
  font-size: 0.8rem;
  color: #666;
  background: #f0f0f0;
  padding: 0.125rem 0.375rem;
  border-radius: 12px;
}

.selected-food-price {
  font-size: 0.8rem;
  color: #666;
}

.selected-food-placeholder {
  color: #999;
  font-style: italic;
}

.dropdown-arrow {
  margin-left: 0.5rem;
  color: #666;
  transition: transform 0.2s ease;
  font-size: 0.8rem;
}

.dropdown-arrow--open {
  transform: rotate(180deg);
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.dropdown-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.dropdown-empty {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.dropdown-content {
  padding: 0.5rem 0;
}

.section-header {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f8f8f8;
  border-bottom: 1px solid #eee;
}

.section-divider {
  height: 1px;
  background: #eee;
  margin: 0.5rem 0;
}

.food-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.food-item:hover {
  background-color: #f8fff8;
  border-color: #4caf50;
}

.food-item--selected {
  background-color: #e8f5e9;
}

.food-item--recent {
  background-color: #fff3e0;
}

.food-item-main {
  flex: 1;
}

.food-item-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.food-item-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.food-item-calories {
  font-size: 0.8rem;
  color: #666;
  background: #f0f0f0;
  padding: 0.125rem 0.375rem;
  border-radius: 12px;
}

.food-item-price {
  font-size: 0.8rem;
  color: #666;
}

.recent-badge,
.selected-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.recent-badge {
  background: #ff9800;
  color: white;
}

.selected-badge {
  background: #4caf50;
  color: white;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .selector-controls {
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-container {
    min-width: auto;
  }

  .dropdown-list {
    max-height: 250px;
  }

  .food-item {
    padding: 1rem;
  }

  .food-item-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>
