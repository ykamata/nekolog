<script setup lang="ts">
import CatMedicationHistory from './CatMedicationHistory.vue';
import { useMedicationsStore } from '~/stores/medications';
import type {
  Medication,
  MedicationRecord,
  MedicationRecordInput,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

interface Props {
  cats: Cat[];
  medications: Medication[];
  loading?: boolean;
}

interface Emits {
  (e: 'record-created', record: MedicationRecord): void;
  (e: 'record-updated', record: MedicationRecord): void;
  (e: 'record-deleted', recordId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

// State
const selectedCatId = ref<string>('all');
const showCombinedView = computed(() => selectedCatId.value === 'all');

// Get selected cat
const selectedCat = computed(() => {
  if (selectedCatId.value === 'all') return null;
  return props.cats.find(cat => cat.id === selectedCatId.value);
});

// Methods
const handleCatChange = (catId: string) => {
  selectedCatId.value = catId;
};

const handleRecordCreated = (record: MedicationRecord) => {
  emit('record-created', record);
};

const handleRecordUpdated = (record: MedicationRecord) => {
  emit('record-updated', record);
};

const handleRecordDeleted = (recordId: string) => {
  emit('record-deleted', recordId);
};

// Get medication summary for a cat
const getCatMedicationSummary = (cat: Cat) => {
  const medicationsStore = useMedicationsStore();
  return medicationsStore.getCatMedicationSummary(cat.id);
};

// Get today's reminders for a cat
const getCatTodaysReminders = (cat: Cat) => {
  const medicationsStore = useMedicationsStore();
  return medicationsStore.getTodaysRemindersByCat(cat.id);
};

// Get pending reminders for a cat
const getCatPendingReminders = (cat: Cat) => {
  const medicationsStore = useMedicationsStore();
  return medicationsStore.getPendingRemindersByCat(cat.id);
};

// Format last administered date
const formatLastAdministered = (date?: Date): string => {
  if (!date) return '記録なし';

  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return '1時間以内';
    }
    else if (diffHours < 24) {
      return `${diffHours}時間前`;
    }
    else if (diffDays === 1) {
      return '昨日';
    }
    else if (diffDays < 7) {
      return `${diffDays}日前`;
    }
    else {
      return new Intl.DateTimeFormat('ja-JP', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  }
  catch {
    return '記録なし';
  }
};
</script>

<template>
  <div class="cat-medication-dashboard">
    <!-- Header with cat selector -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">
          薬管理ダッシュボード
        </h1>
        <div class="cat-selector">
          <label
            for="cat-select"
            class="selector-label"
          >
            表示する猫:
          </label>
          <select
            id="cat-select"
            v-model="selectedCatId"
            class="cat-select"
            @change="handleCatChange(selectedCatId)"
          >
            <option value="all">
              すべての猫
            </option>
            <option
              v-for="cat in cats"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Combined view for all cats -->
    <div
      v-if="showCombinedView"
      class="combined-view"
    >
      <div class="cats-overview">
        <h2 class="section-title">
          猫別薬管理状況
        </h2>
        <div class="cats-grid">
          <div
            v-for="cat in cats"
            :key="cat.id"
            class="cat-summary-card"
            @click="handleCatChange(cat.id)"
          >
            <!-- Cat Avatar -->
            <div class="cat-avatar">
              <img
                v-if="cat.photoUrl"
                :src="cat.photoUrl"
                :alt="cat.name"
                class="cat-photo"
              >
              <div
                v-else
                class="cat-photo-placeholder"
              >
                🐱
              </div>
            </div>

            <!-- Cat Info -->
            <div class="cat-info">
              <h3 class="cat-name">
                {{ cat.name }}
              </h3>
              <div class="cat-stats">
                <div class="stat-item">
                  <span class="stat-label">投与記録:</span>
                  <span class="stat-value">{{ getCatMedicationSummary(cat).totalRecords }}件</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">未投与:</span>
                  <span class="stat-value pending">{{ getCatMedicationSummary(cat).pendingRecords }}件</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">最終投与:</span>
                  <span class="stat-value">{{ formatLastAdministered(getCatMedicationSummary(cat).lastAdministered) }}</span>
                </div>
              </div>

              <!-- Today's Reminders -->
              <div
                v-if="getCatTodaysReminders(cat).length > 0"
                class="reminders-badge"
              >
                <span class="reminder-icon">🔔</span>
                <span class="reminder-text">今日のリマインダー: {{ getCatTodaysReminders(cat).length }}件</span>
              </div>

              <!-- Pending Reminders -->
              <div
                v-if="getCatPendingReminders(cat).length > 0"
                class="pending-badge"
              >
                <span class="pending-icon">⚠️</span>
                <span class="pending-text">未処理: {{ getCatPendingReminders(cat).length }}件</span>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
              <button
                class="quick-action-btn"
                @click.stop="handleCatChange(cat.id)"
              >
                詳細を見る
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Overall Statistics -->
      <div class="overall-stats">
        <h2 class="section-title">
          全体統計
        </h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              📊
            </div>
            <div class="stat-content">
              <div class="stat-number">
                {{ cats.reduce((sum, cat) => sum + getCatMedicationSummary(cat).totalRecords, 0) }}
              </div>
              <div class="stat-label">
                総投与記録数
              </div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              ⏰
            </div>
            <div class="stat-content">
              <div class="stat-number pending">
                {{ cats.reduce((sum, cat) => sum + getCatMedicationSummary(cat).pendingRecords, 0) }}
              </div>
              <div class="stat-label">
                未投与記録数
              </div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              🔔
            </div>
            <div class="stat-content">
              <div class="stat-number">
                {{ cats.reduce((sum, cat) => sum + getCatTodaysReminders(cat).length, 0) }}
              </div>
              <div class="stat-label">
                今日のリマインダー
              </div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              💊
            </div>
            <div class="stat-content">
              <div class="stat-number">
                {{ medications.length }}
              </div>
              <div class="stat-label">
                登録薬数
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Individual cat view -->
    <div
      v-else-if="selectedCat"
      class="individual-view"
    >
      <CatMedicationHistory
        :cat="selectedCat"
        :medications="medications"
        :loading="loading"
        @record-created="handleRecordCreated"
        @record-updated="handleRecordUpdated"
        @record-deleted="handleRecordDeleted"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="empty-state"
    >
      <div class="empty-icon">
        🐱
      </div>
      <h2 class="empty-title">
        猫が登録されていません
      </h2>
      <p class="empty-description">
        薬管理を始めるには、まず猫を登録してください。
      </p>
    </div>
  </div>
</template>

<style scoped>
.cat-medication-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

/* Header */
.dashboard-header {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.dashboard-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: #333;
}

.cat-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selector-label {
  font-weight: 500;
  color: #666;
}

.cat-select {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 0.9rem;
  min-width: 150px;
}

.cat-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

/* Combined View */
.combined-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

/* Cats Overview */
.cats-overview {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.cat-summary-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
}

.cat-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #4caf50;
}

.cat-avatar {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.cat-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e0e0;
}

.cat-photo-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 2px solid #e0e0e0;
}

.cat-info {
  text-align: center;
}

.cat-name {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.cat-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 500;
  color: #333;
}

.stat-value.pending {
  color: #f59e0b;
}

.reminders-badge,
.pending-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.reminders-badge {
  background: #dbeafe;
  color: #1e40af;
}

.pending-badge {
  background: #fef3c7;
  color: #92400e;
}

.quick-actions {
  margin-top: 1rem;
}

.quick-action-btn {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #4caf50;
  border-radius: 4px;
  background: white;
  color: #4caf50;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.quick-action-btn:hover {
  background: #4caf50;
  color: white;
}

/* Overall Statistics */
.overall-stats {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fafafa;
}

.stat-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.stat-number.pending {
  color: #f59e0b;
}

.stat-card .stat-label {
  font-size: 0.9rem;
  color: #666;
}

/* Individual View */
.individual-view {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-title {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: #333;
}

.empty-description {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .cat-medication-dashboard {
    padding: 0.5rem;
  }

  .dashboard-header {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-title {
    font-size: 1.5rem;
    text-align: center;
  }

  .cat-selector {
    justify-content: center;
  }

  .cats-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .stat-icon {
    font-size: 1.5rem;
  }

  .stat-number {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
