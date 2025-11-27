<script setup lang="ts">
import type { DailyCalendarData } from '~/types/daily-calendar';

interface Props {
  isOpen: boolean;
  date: string;
  dayData: DailyCalendarData | null;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Computed
const formattedDate = computed(() => {
  if (!props.date) return '';
  const d = new Date(props.date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
});

const formattedWeekday = computed(() => {
  if (!props.date) return '';
  const d = new Date(props.date);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `(${weekdays[d.getDay()]})`;
});

// Methods
const handleClose = () => {
  emit('close');
};

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="handleBackdropClick"
      >
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">
              {{ formattedDate }} {{ formattedWeekday }}
            </h2>
            <button
              type="button"
              class="modal-close"
              @click="handleClose"
            >
              ✕
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <div
              v-if="!dayData || (dayData.mealCount === 0 && dayData.excretionCount.total === 0 && !dayData.hasEmergencyMedication && !dayData.hasMemo)"
              class="no-data"
            >
              <p>この日の記録はありません</p>
            </div>

            <div
              v-else
              class="detail-sections"
            >
              <!-- Meal Section -->
              <div
                v-if="dayData.totalCalories > 0"
                class="detail-section"
              >
                <div class="section-header">
                  <span class="section-icon">🍽️</span>
                  <h3 class="section-title">食事</h3>
                </div>
                <div class="section-content">
                  <div class="detail-item">
                    <span class="detail-label">回数:</span>
                    <span class="detail-value">{{ dayData.mealCount }}回</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">合計カロリー:</span>
                    <span class="detail-value highlight">{{ dayData.totalCalories }}kcal</span>
                  </div>
                </div>
              </div>

              <!-- Excretion Section -->
              <div
                v-if="dayData.excretionCount.total > 0"
                class="detail-section"
              >
                <div class="section-header">
                  <span class="section-icon">💧💩</span>
                  <h3 class="section-title">排泄</h3>
                </div>
                <div class="section-content">
                  <!-- Urine -->
                  <div
                    v-if="dayData.excretionTimes.urine.length > 0"
                    class="detail-item"
                  >
                    <span class="detail-label">💧 おしっこ:</span>
                    <div class="time-list">
                      <span
                        v-for="(time, index) in dayData.excretionTimes.urine"
                        :key="index"
                        class="time-badge"
                      >{{ time }}</span>
                    </div>
                  </div>

                  <!-- Feces -->
                  <div
                    v-if="dayData.excretionTimes.feces.length > 0"
                    class="detail-item"
                  >
                    <span class="detail-label">💩 うんち:</span>
                    <div class="time-list">
                      <span
                        v-for="(time, index) in dayData.excretionTimes.feces"
                        :key="index"
                        class="time-badge"
                      >{{ time }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Medication Section -->
              <div
                v-if="dayData.hasEmergencyMedication"
                class="detail-section"
              >
                <div class="section-header">
                  <span class="section-icon">💊</span>
                  <h3 class="section-title">頓服薬</h3>
                </div>
                <div class="section-content">
                  <div class="detail-item">
                    <span class="status-badge status-badge--success">投与済み</span>
                  </div>
                </div>
              </div>

              <!-- Memo Section -->
              <div
                v-if="dayData.hasMemo && dayData.dailyNote?.memo"
                class="detail-section"
              >
                <div class="section-header">
                  <span class="section-icon">📝</span>
                  <h3 class="section-title">メモ</h3>
                </div>
                <div class="section-content">
                  <div class="memo-text">
                    {{ dayData.dailyNote.memo }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn--secondary"
              @click="handleClose"
            >
              閉じる
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f8f9fa;
  color: #666;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #e2e8f0;
  color: #333;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.no-data {
  text-align: center;
  padding: 3rem 1rem;
  color: #999;
}

.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid #4caf50;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.section-icon {
  font-size: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.detail-label {
  font-weight: 500;
  color: #666;
  min-width: 120px;
}

.detail-value {
  font-weight: 600;
  color: #333;
}

.detail-value.highlight {
  color: #f57c00;
  font-size: 1.125rem;
}

.time-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.time-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1976d2;
}

.status-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge--success {
  background: #e8f5e9;
  color: #2e7d32;
}

.memo-text {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 1rem;
}

.btn--secondary {
  background: #f8f9fa;
  color: #666;
}

.btn--secondary:hover {
  background: #e2e8f0;
  color: #333;
}

/* Modal transition */
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
</style>
