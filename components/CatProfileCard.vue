<script setup lang="ts">
import ConfirmationDialog from './ConfirmationDialog.vue';
import type { Cat } from '~/types/cat-meal';

// Define props with TypeScript validation
interface Props {
  cat: Cat;
  showDetails?: boolean;
  showMealStats?: boolean;
  theme?: 'light' | 'dark' | 'colorful';
}

// Define emits with TypeScript
interface Emits {
  (e: 'select' | 'delete', id: string): void;
  (e: 'edit' | 'quick-meal', cat: Cat): void;
}

// Define props with default values and validation
const props = withDefaults(defineProps<Props>(), {
  showDetails: false,
  showMealStats: true,
  theme: 'light',
});

// Define emits
const emit = defineEmits<Emits>();

// State for confirmation dialog
const showDeleteConfirmation = ref(false);

// Reactive state using auto-imported Vue Composition API
const isExpanded = ref(false);
const mealStats = ref<{
  totalMeals: number;
  totalCalories: number;
  averageCaloriesPerMeal: number;
  lastMealTime?: Date;
} | null>(null);
const loadingStats = ref(false);

// Computed properties
const weightStatus = computed(() => {
  if (!props.cat.weight) return '未記録';
  if (props.cat.weight < 3) return '軽い';
  if (props.cat.weight > 6) return '重い';
  return '適正';
});

const catAge = computed(() => {
  if (!props.cat.birthdate) return '不明';

  const today = new Date();
  const birth = new Date(props.cat.birthdate);
  const ageInMs = today.getTime() - birth.getTime();
  const ageInYears = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));

  if (ageInYears < 1) {
    const ageInMonths = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 30.44));
    return `${ageInMonths}ヶ月`;
  }

  return `${ageInYears}歳`;
});

const cardClasses = computed(() => {
  return {
    'cat-card': true,
    'cat-card--light': props.theme === 'light',
    'cat-card--dark': props.theme === 'dark',
    'cat-card--colorful': props.theme === 'colorful',
    'cat-card--expanded': isExpanded.value,
  };
});

// Methods
const toggleExpand = (): void => {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value && props.showMealStats && !mealStats.value) {
    loadMealStats();
  }
};

// Removed unused selectCat method

const editCat = (): void => {
  emit('edit', props.cat);
};

const deleteCat = (): void => {
  showDeleteConfirmation.value = true;
};

const confirmDelete = (): void => {
  emit('delete', props.cat.id);
  showDeleteConfirmation.value = false;
};

const cancelDelete = (): void => {
  showDeleteConfirmation.value = false;
};

const quickMeal = (): void => {
  emit('quick-meal', props.cat);
};

const loadMealStats = async (): Promise<void> => {
  if (!props.showMealStats) return;

  loadingStats.value = true;
  try {
    const response = await $fetch(
      `/api/meals/analytics?catId=${props.cat.id}&days=7`,
    );
    mealStats.value = {
      totalMeals: response.summary.totalMeals,
      totalCalories: response.summary.totalCalories,
      averageCaloriesPerMeal: response.summary.averageCaloriesPerMeal,
      lastMealTime:
        response.analytics.dailyCalories.length > 0
          ? new Date(
            response.analytics?.dailyCalories?.[
              response.analytics.dailyCalories.length - 1
            ]?.date || '',
          )
          : undefined,
    };
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load meal stats:', error);
    mealStats.value = {
      totalMeals: 0,
      totalCalories: 0,
      averageCaloriesPerMeal: 0,
    };
  }
  finally {
    loadingStats.value = false;
  }
};

const formatWeight = (weight?: number): string => {
  if (!weight) return '未記録';
  return `${weight}kg`;
};

// Watch for changes
watch(
  () => props.cat.id,
  () => {
    mealStats.value = null;
    if (isExpanded.value && props.showMealStats) {
      loadMealStats();
    }
  },
);
</script>

<template>
  <div :class="cardClasses">
    <div class="cat-card__header">
      <img
        v-if="cat.photoUrl"
        :src="cat.photoUrl"
        :alt="cat.name"
        class="cat-card__image"
      >
      <div
        v-else
        class="cat-card__image cat-card__image--placeholder"
      >
        🐱
      </div>

      <div class="cat-card__title">
        <h3>{{ cat.name }}</h3>
        <span class="cat-card__age">{{ catAge }}</span>
      </div>

      <button
        class="cat-card__expand-btn"
        @click="toggleExpand"
      >
        {{ isExpanded ? "▲" : "▼" }}
      </button>
    </div>

    <div class="cat-card__content">
      <div class="cat-card__info">
        <div class="cat-card__info-item">
          <span class="cat-card__info-label">体重:</span>
          <span class="cat-card__info-value">
            {{ formatWeight(cat.weight) }}
            <span
              v-if="cat.weight"
              class="cat-card__weight-status"
              :class="`cat-card__weight-status--${weightStatus}`"
            >
              ({{ weightStatus }})
            </span>
          </span>
        </div>
      </div>

      <div
        v-if="showMealStats && isExpanded"
        class="cat-card__meal-stats"
      >
        <h4 class="cat-card__stats-title">
          最近7日間の食事統計
        </h4>
        <div
          v-if="loadingStats"
          class="cat-card__stats-loading"
        >
          読み込み中...
        </div>
        <div
          v-else-if="mealStats"
          class="cat-card__stats-grid"
        >
          <div class="cat-card__stat-item">
            <span class="cat-card__stat-label">食事回数</span>
            <span class="cat-card__stat-value">{{ mealStats.totalMeals }}回</span>
          </div>
          <div class="cat-card__stat-item">
            <span class="cat-card__stat-label">総カロリー</span>
            <span class="cat-card__stat-value">{{ mealStats.totalCalories }}kcal</span>
          </div>
          <div class="cat-card__stat-item">
            <span class="cat-card__stat-label">平均カロリー/回</span>
            <span class="cat-card__stat-value">{{ mealStats.averageCaloriesPerMeal }}kcal</span>
          </div>
        </div>
      </div>

      <div class="cat-card__actions">
        <button
          class="cat-card__btn cat-card__btn--primary"
          @click="quickMeal"
        >
          食事記録
        </button>
        <button
          class="cat-card__btn"
          @click="editCat"
        >
          編集
        </button>
        <button
          class="cat-card__btn cat-card__btn--danger"
          @click="deleteCat"
        >
          削除
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`${cat.name}を削除`"
      :message="`${cat.name}を削除しますか？この操作は取り消せません。関連する食事記録も削除されます。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.cat-card {
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cat-card--light {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  color: #333333;
}

.cat-card--dark {
  background-color: #2c3e50;
  border: 1px solid #1a2530;
  color: #ffffff;
}

.cat-card--colorful {
  background-color: #f8f9ff;
  border: 2px solid #7e57c2;
  color: #333333;
}

.cat-card--expanded {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.cat-card__header {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.cat-card--dark .cat-card__header {
  border-bottom-color: #3d5166;
}

.cat-card--colorful .cat-card__header {
  border-bottom-color: #b39ddb;
  background-color: #ede7f6;
}

.cat-card__image {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 1rem;
}

.cat-card__image--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  font-size: 1.5rem;
}

.cat-card__title {
  flex: 1;
}

.cat-card__title h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.2rem;
}

.cat-card__age {
  font-size: 0.9rem;
  color: #666;
}

.cat-card__expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: inherit;
  padding: 0.5rem;
}

.cat-card__content {
  padding: 1rem;
}

.cat-card__info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.cat-card__info-label {
  font-weight: 500;
  color: #666;
}

.cat-card__info-value {
  color: #333;
}

.cat-card__weight-status {
  font-size: 0.8rem;
  margin-left: 0.25rem;
}

.cat-card__weight-status--適正 {
  color: #4caf50;
}

.cat-card__weight-status--軽い {
  color: #ff9800;
}

.cat-card__weight-status--重い {
  color: #f44336;
}

.cat-card__weight-status--未記録 {
  color: #999;
}

.cat-card__meal-stats {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed #e0e0e0;
}

.cat-card--dark .cat-card__meal-stats {
  border-top-color: #3d5166;
}

.cat-card--colorful .cat-card__meal-stats {
  border-top-color: #b39ddb;
}

.cat-card__stats-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.cat-card--dark .cat-card__stats-title {
  color: white;
}

.cat-card__stats-loading {
  text-align: center;
  color: #666;
  font-style: italic;
}

.cat-card__stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.cat-card__stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.cat-card--dark .cat-card__stat-item {
  background-color: #34495e;
}

.cat-card--colorful .cat-card__stat-item {
  background-color: #f3e5f5;
}

.cat-card__stat-label {
  font-size: 0.9rem;
  color: #666;
}

.cat-card--dark .cat-card__stat-label {
  color: #bdc3c7;
}

.cat-card__stat-value {
  font-weight: 600;
  color: #333;
}

.cat-card--dark .cat-card__stat-value {
  color: white;
}

.cat-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.cat-card__btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  background-color: #e0e0e0;
  color: #333;
  transition: background-color 0.2s;
}

.cat-card__btn:hover {
  background-color: #d0d0d0;
}

.cat-card__btn--primary {
  background-color: #4caf50;
  color: white;
}

.cat-card__btn--primary:hover {
  background-color: #388e3c;
}

.cat-card__btn--danger {
  background-color: #f44336;
  color: white;
}

.cat-card__btn--danger:hover {
  background-color: #d32f2f;
}

.cat-card--dark .cat-card__btn {
  background-color: #34495e;
  color: white;
}

.cat-card--dark .cat-card__btn:hover {
  background-color: #2c3e50;
}

.cat-card--dark .cat-card__btn--primary {
  background-color: #2ecc71;
}

.cat-card--dark .cat-card__btn--primary:hover {
  background-color: #27ae60;
}

.cat-card--dark .cat-card__btn--danger {
  background-color: #e74c3c;
}

.cat-card--dark .cat-card__btn--danger:hover {
  background-color: #c0392b;
}

.cat-card__edit-form {
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.cat-card--dark .form-input,
.cat-card--dark .form-textarea {
  background-color: #34495e;
  border-color: #2c3e50;
  color: white;
}

.form-textarea {
  resize: vertical;
}

.cat-card__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
