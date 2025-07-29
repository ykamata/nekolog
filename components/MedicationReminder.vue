<script setup lang="ts">
import type { MedicationReminder, ReminderStatus } from '~/types/medication';

interface Props {
  reminders: MedicationReminder[];
  loading?: boolean;
  showActions?: boolean;
}

interface Emits {
  (e: 'acknowledge', reminder: MedicationReminder): void;
  (e: 'snooze', reminder: MedicationReminder, minutes: number): void;
  (e: 'dismiss', reminder: MedicationReminder): void;
  (e: 'refresh'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
});

const emit = defineEmits<Emits>();

// State for snooze dialog
const showSnoozeDialog = ref(false);
const reminderToSnooze = ref<MedicationReminder | null>(null);
const snoozeMinutes = ref(15);

// Snooze options
const snoozeOptions = [
  { value: 5, label: '5分' },
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 60, label: '1時間' },
  { value: 120, label: '2時間' },
];

// Computed properties
const pendingReminders = computed(() =>
  props.reminders.filter(reminder => reminder.status === 'PENDING'),
);

const overdueReminders = computed(() => {
  const now = new Date();
  return pendingReminders.value.filter(reminder =>
    new Date(reminder.scheduledAt) < now,
  );
});

const upcomingReminders = computed(() => {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  return pendingReminders.value.filter((reminder) => {
    const scheduledAt = new Date(reminder.scheduledAt);
    return scheduledAt >= now && scheduledAt <= nextHour;
  });
});

const snoozedReminders = computed(() =>
  props.reminders.filter(reminder => reminder.status === 'SNOOZED'),
);

const acknowledgedReminders = computed(() =>
  props.reminders.filter(reminder => reminder.status === 'ACKNOWLEDGED'),
);

const dismissedReminders = computed(() =>
  props.reminders.filter(reminder => reminder.status === 'DISMISSED'),
);

// Methods
const handleAcknowledge = (reminder: MedicationReminder) => {
  emit('acknowledge', reminder);
};

const handleSnooze = (reminder: MedicationReminder) => {
  reminderToSnooze.value = reminder;
  showSnoozeDialog.value = true;
};

const confirmSnooze = () => {
  if (reminderToSnooze.value) {
    emit('snooze', reminderToSnooze.value, snoozeMinutes.value);
  }
  showSnoozeDialog.value = false;
  reminderToSnooze.value = null;
  snoozeMinutes.value = 15;
};

const cancelSnooze = () => {
  showSnoozeDialog.value = false;
  reminderToSnooze.value = null;
  snoozeMinutes.value = 15;
};

const handleDismiss = (reminder: MedicationReminder) => {
  emit('dismiss', reminder);
};

const handleRefresh = () => {
  emit('refresh');
};

// Format time display
const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Format date display
const formatDate = (date: Date): string => {
  const now = new Date();
  const reminderDate = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());

  if (reminderDay.getTime() === today.getTime()) {
    return '今日';
  }
  else if (reminderDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
    return '昨日';
  }
  else if (reminderDay.getTime() === today.getTime() + 24 * 60 * 60 * 1000) {
    return '明日';
  }
  else {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
    }).format(reminderDate);
  }
};

// Get status display
const getStatusDisplay = (status: ReminderStatus): { text: string; class: string } => {
  const statusMap = {
    PENDING: { text: '待機中', class: 'status--pending' },
    ACKNOWLEDGED: { text: '確認済み', class: 'status--acknowledged' },
    SNOOZED: { text: 'スヌーズ中', class: 'status--snoozed' },
    DISMISSED: { text: '無視', class: 'status--dismissed' },
  };
  return statusMap[status] || { text: status, class: 'status--default' };
};

// Check if reminder is overdue
const isOverdue = (reminder: MedicationReminder): boolean => {
  const now = new Date();
  return new Date(reminder.scheduledAt) < now && reminder.status === 'PENDING';
};

// Check if reminder is upcoming (within next hour)
const isUpcoming = (reminder: MedicationReminder): boolean => {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  const scheduledAt = new Date(reminder.scheduledAt);
  return scheduledAt >= now && scheduledAt <= nextHour && reminder.status === 'PENDING';
};
</script>

<template>
  <div class="medication-reminder">
    <div class="medication-reminder__header">
      <h2 class="medication-reminder__title">
        薬のリマインダー
      </h2>
      <button
        :disabled="loading"
        class="btn btn--secondary btn--small"
        @click="handleRefresh"
      >
        🔄 更新
      </button>
    </div>

    <div
      v-if="loading"
      class="medication-reminder__loading"
    >
      <div class="loading-spinner" />
      <p>リマインダーを読み込み中...</p>
    </div>

    <div
      v-else-if="props.reminders.length === 0"
      class="medication-reminder__empty"
    >
      <div class="empty-state">
        <div class="empty-state__icon">
          🔔
        </div>
        <h3 class="empty-state__title">
          リマインダーがありません
        </h3>
        <p class="empty-state__message">
          薬のスケジュールを設定すると、リマインダーが表示されます。
        </p>
      </div>
    </div>

    <div
      v-else
      class="medication-reminder__content"
    >
      <!-- Overdue Reminders -->
      <div
        v-if="overdueReminders.length > 0"
        class="reminder-section reminder-section--urgent"
      >
        <h3 class="reminder-section__title">
          ⚠️ 期限切れ ({{ overdueReminders.length }})
        </h3>
        <div class="reminder-list">
          <div
            v-for="reminder in overdueReminders"
            :key="reminder.id"
            class="reminder-card reminder-card--overdue"
          >
            <div class="reminder-card__header">
              <div class="reminder-card__info">
                <h4 class="reminder-card__medication">
                  {{ reminder.medication?.name || '薬名不明' }}
                </h4>
                <p class="reminder-card__cat">
                  {{ reminder.cat?.name || '猫名不明' }}
                </p>
              </div>
              <div class="reminder-card__time">
                <span class="reminder-card__date">{{ formatDate(reminder.scheduledAt) }}</span>
                <span class="reminder-card__clock">{{ formatTime(reminder.scheduledAt) }}</span>
              </div>
            </div>

            <div
              v-if="showActions"
              class="reminder-card__actions"
            >
              <button
                class="btn btn--primary btn--small"
                @click="handleAcknowledge(reminder)"
              >
                ✓ 投与完了
              </button>
              <button
                class="btn btn--secondary btn--small"
                @click="handleSnooze(reminder)"
              >
                ⏰ スヌーズ
              </button>
              <button
                class="btn btn--danger btn--small"
                @click="handleDismiss(reminder)"
              >
                ✕ 無視
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming Reminders -->
      <div
        v-if="upcomingReminders.length > 0"
        class="reminder-section reminder-section--upcoming"
      >
        <h3 class="reminder-section__title">
          🔔 まもなく ({{ upcomingReminders.length }})
        </h3>
        <div class="reminder-list">
          <div
            v-for="reminder in upcomingReminders"
            :key="reminder.id"
            class="reminder-card reminder-card--upcoming"
          >
            <div class="reminder-card__header">
              <div class="reminder-card__info">
                <h4 class="reminder-card__medication">
                  {{ reminder.medication?.name || '薬名不明' }}
                </h4>
                <p class="reminder-card__cat">
                  {{ reminder.cat?.name || '猫名不明' }}
                </p>
              </div>
              <div class="reminder-card__time">
                <span class="reminder-card__date">{{ formatDate(reminder.scheduledAt) }}</span>
                <span class="reminder-card__clock">{{ formatTime(reminder.scheduledAt) }}</span>
              </div>
            </div>

            <div
              v-if="showActions"
              class="reminder-card__actions"
            >
              <button
                class="btn btn--primary btn--small"
                @click="handleAcknowledge(reminder)"
              >
                ✓ 投与完了
              </button>
              <button
                class="btn btn--secondary btn--small"
                @click="handleSnooze(reminder)"
              >
                ⏰ スヌーズ
              </button>
              <button
                class="btn btn--danger btn--small"
                @click="handleDismiss(reminder)"
              >
                ✕ 無視
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Snoozed Reminders -->
      <div
        v-if="snoozedReminders.length > 0"
        class="reminder-section"
      >
        <h3 class="reminder-section__title">
          ⏰ スヌーズ中 ({{ snoozedReminders.length }})
        </h3>
        <div class="reminder-list">
          <div
            v-for="reminder in snoozedReminders"
            :key="reminder.id"
            class="reminder-card reminder-card--snoozed"
          >
            <div class="reminder-card__header">
              <div class="reminder-card__info">
                <h4 class="reminder-card__medication">
                  {{ reminder.medication?.name || '薬名不明' }}
                </h4>
                <p class="reminder-card__cat">
                  {{ reminder.cat?.name || '猫名不明' }}
                </p>
              </div>
              <div class="reminder-card__time">
                <span class="reminder-card__date">{{ formatDate(reminder.scheduledAt) }}</span>
                <span class="reminder-card__clock">{{ formatTime(reminder.scheduledAt) }}</span>
              </div>
            </div>

            <div class="reminder-card__status">
              <span class="status-badge status--snoozed">
                スヌーズ中
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Actions -->
      <div
        v-if="acknowledgedReminders.length > 0 || dismissedReminders.length > 0"
        class="reminder-section reminder-section--recent"
      >
        <h3 class="reminder-section__title">
          📋 最近の操作
        </h3>
        <div class="reminder-list">
          <div
            v-for="reminder in [...acknowledgedReminders, ...dismissedReminders].slice(0, 5)"
            :key="reminder.id"
            class="reminder-card reminder-card--completed"
          >
            <div class="reminder-card__header">
              <div class="reminder-card__info">
                <h4 class="reminder-card__medication">
                  {{ reminder.medication?.name || '薬名不明' }}
                </h4>
                <p class="reminder-card__cat">
                  {{ reminder.cat?.name || '猫名不明' }}
                </p>
              </div>
              <div class="reminder-card__time">
                <span class="reminder-card__date">{{ formatDate(reminder.scheduledAt) }}</span>
                <span class="reminder-card__clock">{{ formatTime(reminder.scheduledAt) }}</span>
              </div>
            </div>

            <div class="reminder-card__status">
              <span
                class="status-badge"
                :class="getStatusDisplay(reminder.status).class"
              >
                {{ getStatusDisplay(reminder.status).text }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Snooze Dialog -->
    <div
      v-if="showSnoozeDialog"
      class="modal-overlay"
      @click="cancelSnooze"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h3 class="modal-title">
            スヌーズ時間を選択
          </h3>
        </div>

        <div class="modal-body">
          <p class="modal-message">
            {{ reminderToSnooze?.medication?.name }} のリマインダーをスヌーズします。
          </p>

          <div class="snooze-options">
            <label
              v-for="option in snoozeOptions"
              :key="option.value"
              class="snooze-option"
            >
              <input
                v-model="snoozeMinutes"
                type="radio"
                :value="option.value"
                class="snooze-option__radio"
              >
              <span class="snooze-option__label">{{ option.label }}</span>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button
            class="btn btn--secondary"
            @click="cancelSnooze"
          >
            キャンセル
          </button>
          <button
            class="btn btn--primary"
            @click="confirmSnooze"
          >
            スヌーズ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.medication-reminder {
  width: 100%;
}

.medication-reminder__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.medication-reminder__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.medication-reminder__loading {
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.medication-reminder__empty {
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
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.medication-reminder__content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.reminder-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.reminder-section--urgent {
  border-color: #f44336;
  background-color: #fff5f5;
}

.reminder-section--upcoming {
  border-color: #ff9800;
  background-color: #fff8f0;
}

.reminder-section--recent {
  border-color: #9e9e9e;
}

.reminder-section__title {
  margin: 0;
  padding: 1rem 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.reminder-section--urgent .reminder-section__title {
  background-color: #ffebee;
  color: #c62828;
}

.reminder-section--upcoming .reminder-section__title {
  background-color: #fff3e0;
  color: #e65100;
}

.reminder-list {
  display: flex;
  flex-direction: column;
}

.reminder-card {
  padding: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
}

.reminder-card:last-child {
  border-bottom: none;
}

.reminder-card:hover {
  background-color: #f8f9fa;
}

.reminder-card--overdue {
  background-color: #fff5f5;
}

.reminder-card--upcoming {
  background-color: #fff8f0;
}

.reminder-card--snoozed {
  background-color: #f3f4f6;
}

.reminder-card--completed {
  opacity: 0.8;
}

.reminder-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.reminder-card__info {
  flex: 1;
}

.reminder-card__medication {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.reminder-card__cat {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.reminder-card__time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.reminder-card__date {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.reminder-card__clock {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.reminder-card__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.reminder-card__status {
  display: flex;
  justify-content: flex-end;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status--pending {
  background-color: #fff3cd;
  color: #856404;
}

.status--acknowledged {
  background-color: #d4edda;
  color: #155724;
}

.status--snoozed {
  background-color: #cce5ff;
  color: #004085;
}

.status--dismissed {
  background-color: #f8d7da;
  color: #721c24;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
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
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

/* Modal styles */
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
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 1.5rem 1.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.modal-message {
  margin: 0 0 1.5rem 0;
  color: #666;
  line-height: 1.5;
}

.snooze-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.snooze-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.snooze-option:hover {
  background-color: #f8f9fa;
}

.snooze-option__radio {
  margin-right: 0.75rem;
}

.snooze-option__label {
  font-size: 0.9rem;
  color: #333;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
  justify-content: flex-end;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .medication-reminder__header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .reminder-card__header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .reminder-card__time {
    align-items: flex-start;
    text-align: left;
  }

  .reminder-card__actions {
    flex-direction: column;
  }

  .modal-content {
    width: 95%;
  }

  .modal-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .medication-reminder__title {
    font-size: 1.25rem;
  }

  .reminder-section__title {
    font-size: 1rem;
    padding: 0.75rem 1rem;
  }

  .reminder-card {
    padding: 1rem;
  }

  .empty-state__icon {
    font-size: 3rem;
  }
}
</style>
