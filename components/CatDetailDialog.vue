<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';

interface Props {
  isOpen: boolean;
  cat: Cat | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'edit', cat: Cat): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

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

// Format date display
const formatDate = (date?: Date | string | null): string => {
  if (!date) return '未記録';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '未記録';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}年${month}月${day}日`;
};

// Handle close
const handleClose = () => {
  emit('close');
};

// Handle edit
const handleEdit = () => {
  if (props.cat) {
    emit('edit', props.cat);
  }
};

// Handle backdrop click
const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
};

// Handle image error
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.style.display = 'none';
  }
};

// Close dialog with Escape key
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) {
    handleClose();
  }
};

// Add/remove event listener for Escape key
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen && cat"
        class="modal-overlay"
        @click="handleBackdropClick"
      >
        <div class="modal-container">
          <div class="modal-header">
            <h2 class="modal-title">
              {{ cat.name }}の詳細情報
            </h2>
            <button
              type="button"
              class="modal-close"
              @click="handleClose"
            >
              ✕
            </button>
          </div>

          <div class="modal-body">
            <!-- Cat Photo -->
            <div class="cat-photo-section">
              <div class="cat-photo-container">
                <img
                  v-if="cat.photoUrl"
                  :src="cat.photoUrl"
                  :alt="cat.name"
                  class="cat-photo"
                  @error="handleImageError"
                >
                <div
                  v-else
                  class="cat-photo-placeholder"
                >
                  🐱
                </div>
              </div>
            </div>

            <!-- Cat Information -->
            <div class="cat-info-section">
              <div class="info-group">
                <div class="info-label">
                  名前
                </div>
                <div class="info-value">
                  {{ cat.name || '名前未設定' }}
                </div>
              </div>

              <div class="info-group">
                <div class="info-label">
                  年齢
                </div>
                <div class="info-value">
                  {{ calculateAge(cat.birthdate) }}
                </div>
              </div>

              <div class="info-group">
                <div class="info-label">
                  生年月日
                </div>
                <div class="info-value">
                  {{ formatDate(cat.birthdate) }}
                </div>
              </div>

              <div class="info-group">
                <div class="info-label">
                  体重
                </div>
                <div class="info-value">
                  {{ formatWeight(cat.weight) }}
                </div>
              </div>

              <div class="info-group">
                <div class="info-label">
                  登録日
                </div>
                <div class="info-value">
                  {{ formatDate(cat.createdAt) }}
                </div>
              </div>

              <div class="info-group">
                <div class="info-label">
                  最終更新日
                </div>
                <div class="info-value">
                  {{ formatDate(cat.updatedAt) }}
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn--secondary"
              @click="handleClose"
            >
              閉じる
            </button>
            <button
              type="button"
              class="btn btn--primary"
              @click="handleEdit"
            >
              編集
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  color: #666;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
}

.modal-close:hover {
  background: #e0e0e0;
  color: #333;
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.cat-photo-section {
  margin-bottom: 2rem;
}

.cat-photo-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 8px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cat-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cat-photo-placeholder {
  font-size: 5rem;
  color: #999;
}

.cat-info-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.info-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-label {
  font-weight: 600;
  color: #666;
  font-size: 0.95rem;
}

.info-value {
  font-size: 1rem;
  color: #333;
  text-align: right;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn--primary {
  background-color: #4caf50;
  color: white;
}

.btn--primary:hover {
  background-color: #45a049;
}

.btn--secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn--secondary:hover {
  background-color: #e0e0e0;
}

/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .modal-container {
    max-width: 100%;
    max-height: 85vh;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .modal-header {
    padding: 1.25rem 1.5rem;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .cat-photo-placeholder {
    font-size: 4rem;
  }

  .info-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.875rem;
  }

  .info-value {
    text-align: left;
  }

  .modal-footer {
    padding: 1.25rem 1.5rem;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-container,
  .modal-leave-active .modal-container {
    transition: none;
  }
}
</style>
