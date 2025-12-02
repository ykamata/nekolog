<script setup lang="ts">
import ConfirmationDialog from './ConfirmationDialog.vue';
import CatDetailDialog from './CatDetailDialog.vue';
import type { Cat } from '~/types/cat-meal';

interface Props {
  cats: Cat[];
  loading?: boolean;
  showActions?: boolean;
}

interface Emits {
  (e: 'select' | 'edit' | 'delete', cat: Cat): void;
  (e: 'add'): void;
}

const _props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
});

const emit = defineEmits<Emits>();

// State for confirmation dialog
const showDeleteConfirmation = ref(false);
const catToDelete = ref<Cat | null>(null);

// State for detail dialog
const showDetailDialog = ref(false);
const selectedCat = ref<Cat | null>(null);

// Methods
const handleSelectCat = (cat: Cat) => {
  selectedCat.value = cat;
  showDetailDialog.value = true;
  emit('select', cat);
};

const handleEditCat = (cat: Cat) => {
  emit('edit', cat);
};

const handleEditFromDetail = (cat: Cat) => {
  showDetailDialog.value = false;
  selectedCat.value = null;
  emit('edit', cat);
};

const handleCloseDetail = () => {
  showDetailDialog.value = false;
  selectedCat.value = null;
};

const handleDeleteCat = (cat: Cat) => {
  catToDelete.value = cat;
  showDeleteConfirmation.value = true;
};

const confirmDelete = () => {
  if (catToDelete.value) {
    emit('delete', catToDelete.value);
  }
  showDeleteConfirmation.value = false;
  catToDelete.value = null;
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  catToDelete.value = null;
};

const handleAddCat = () => {
  emit('add');
};

// Calculate age from birthdate
const calculateAge = (birthdate?: Date | string | null): string => {
  if (!birthdate) return '不明';

  const today = new Date();
  const birth = new Date(birthdate);

  // Check if date is valid
  if (isNaN(birth.getTime())) return '不明';

  const ageInMs = today.getTime() - birth.getTime();
  const ageInYears = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));

  if (ageInYears < 1) {
    const ageInMonths = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 30.44));
    return ageInMonths <= 0 ? '1ヶ月未満' : `${ageInMonths}ヶ月`;
  }

  return `${ageInYears}歳`;
};

// Format weight display
const formatWeight = (weight?: number | null): string => {
  if (weight === null || weight === undefined || weight === 0) return '未記録';
  return `${weight}kg`;
};

// Handle image error
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.style.display = 'none';
  }
};
</script>

<template>
  <div class="cat-list">
    <div class="cat-list__header">
      <h2 class="cat-list__title">
        猫の管理
      </h2>
      <button
        v-if="showActions"
        :disabled="loading"
        class="btn btn--primary"
        @click="handleAddCat"
      >
        + 新しい猫を追加
      </button>
    </div>

    <div
      v-if="loading"
      class="cat-list__loading"
    >
      <div class="loading-spinner" />
      <p>猫の情報を読み込み中...</p>
    </div>

    <div
      v-else-if="cats.length === 0"
      class="cat-list__empty"
    >
      <div class="empty-state">
        <div class="empty-state__icon">
          🐱
        </div>
        <h3 class="empty-state__title">
          猫が登録されていません
        </h3>
        <p class="empty-state__message">
          最初の猫を追加して、食事管理を始めましょう。
        </p>
        <button
          v-if="showActions"
          class="btn btn--primary"
          @click="handleAddCat"
        >
          猫を追加する
        </button>
      </div>
    </div>

    <div
      v-else
      class="cat-list__grid"
    >
      <div
        v-for="cat in cats"
        :key="cat.id"
        class="cat-card"
        @click="handleSelectCat(cat)"
      >
        <div class="cat-card__image-container">
          <img
            v-if="cat.photoUrl"
            :src="cat.photoUrl"
            :alt="cat.name"
            class="cat-card__image"
            @error="handleImageError"
          >
          <div
            v-else
            class="cat-card__image cat-card__image--placeholder"
          >
            🐱
          </div>
        </div>

        <div class="cat-card__content">
          <h3 class="cat-card__name">
            {{ cat.name || '名前未設定' }}
          </h3>

          <div class="cat-card__info">
            <div class="cat-card__info-item">
              <span class="cat-card__info-label">年齢:</span>
              <span class="cat-card__info-value">{{
                calculateAge(cat.birthdate)
              }}</span>
            </div>

            <div class="cat-card__info-item">
              <span class="cat-card__info-label">体重:</span>
              <span class="cat-card__info-value">{{
                formatWeight(cat.weight)
              }}</span>
            </div>
          </div>

          <div
            v-if="showActions"
            class="cat-card__actions"
          >
            <button
              class="btn btn--small btn--secondary"
              @click.stop="handleEditCat(cat)"
            >
              編集
            </button>
            <button
              class="btn btn--small btn--danger"
              @click.stop="handleDeleteCat(cat)"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cat Detail Dialog -->
    <CatDetailDialog
      :is-open="showDetailDialog"
      :cat="selectedCat"
      @close="handleCloseDetail"
      @edit="handleEditFromDetail"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="`${catToDelete?.name}を削除`"
      :message="`${catToDelete?.name}を削除しますか？この操作は取り消せません。関連する食事記録も削除されます。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.cat-list {
  width: 100%;
}

.cat-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 0 1rem 1rem 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.cat-list__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.cat-list__loading {
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

.cat-list__empty {
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

.cat-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.cat-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #4caf50;
}

.cat-card__image-container {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.cat-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cat-card__image--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #999;
}

.cat-card__content {
  padding: 1.25rem;
}

.cat-card__name {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.cat-card__info {
  margin-bottom: 1.5rem;
}

.cat-card__info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.cat-card__info-label {
  font-weight: 500;
  color: #666;
}

.cat-card__info-value {
  color: #333;
}

.cat-card__actions {
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
  .cat-list__header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .cat-list__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .cat-card__image-container {
    height: 150px;
  }

  .cat-card__content {
    padding: 1rem;
  }

  .cat-card__actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .cat-list__header {
    margin-bottom: 1rem;
  }

  .cat-list__title {
    font-size: 1.25rem;
  }

  .empty-state__icon {
    font-size: 3rem;
  }
}
</style>
