<template>
  <div class="medication-calendar">
    <!-- Calendar Header -->
    <div class="calendar-header">
      <div class="calendar-navigation">
        <button
          type="button"
          class="nav-button"
          :disabled="loading"
          @click="previousMonth"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 class="calendar-title">
          {{ currentMonthYear }}
        </h2>

        <button
          type="button"
          class="nav-button"
          :disabled="loading"
          @click="nextMonth"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <!-- Cat Filter -->
      <div
        v-if="cats.length > 0"
        class="cat-filter"
      >
        <select
          v-model="selectedCatId"
          class="cat-select"
          @change="onCatChange"
        >
          <option value="">
            全ての猫
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

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-state"
    >
      <div class="loading-spinner" />
      <p>カレンダーを読み込み中...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="error-state"
    >
      <p class="error-message">
        {{ error }}
      </p>
      <button
        type="button"
        class="retry-button"
        @click="loadCalendarData"
      >
        再試行
      </button>
    </div>

    <!-- Calendar Grid -->
    <div
      v-else
      class="calendar-grid"
    >
      <!-- Day Headers -->
      <div class="day-headers">
        <div
          v-for="day in dayHeaders"
          :key="day"
          class="day-header"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Days -->
      <div class="calendar-days">
        <div
          v-for="day in calendarDays"
          :key="`${day.date}-${day.isCurrentMonth}`"
          class="calendar-day"
          :class="{
            'current-month': day.isCurrentMonth,
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'selected': day.date === selectedDate,
            'has-administered': day.hasAdministered,
            'has-pending': day.hasPending,
            'has-missed': day.hasMissed,
          }"
          @click="selectDate(day.date)"
        >
          <div class="day-number">
            {{ day.dayNumber }}
          </div>

          <!-- Medication Indicators -->
          <div
            v-if="day.isCurrentMonth"
            class="medication-indicators"
          >
            <div
              v-if="day.hasAdministered"
              class="indicator administered"
              title="投与済み"
            />
            <div
              v-if="day.hasPending"
              class="indicator pending"
              title="投与予定"
            />
            <div
              v-if="day.hasMissed"
              class="indicator missed"
              title="未投与"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Date Details -->
    <div
      v-if="selectedDate && selectedDateData"
      class="selected-date-details"
    >
      <h3 class="details-title">
        {{ formatSelectedDate(selectedDate) }} の投与記録
      </h3>

      <div
        v-if="selectedDateData.records.length === 0 && selectedDateData.reminders.length === 0"
        class="no-records"
      >
        この日の投与記録はありません
      </div>

      <div
        v-else
        class="records-list"
      >
        <!-- Medication Records -->
        <div
          v-if="selectedDateData.records.length > 0"
          class="records-section"
        >
          <h4 class="section-title">
            投与記録
          </h4>

          <!-- Time-based grouping -->
          <div
            v-for="(records, period) in selectedDateData.groupedRecords"
            :key="period"
            class="time-period-group"
          >
            <div
              v-if="records.length > 0"
              class="time-period"
            >
              <h5 class="time-period-title">
                {{ getTimePeriodLabel(period) }}
              </h5>
              <div
                v-for="record in records"
                :key="record.id"
                class="record-item"
                :class="`status-${record.status.toLowerCase()}`"
              >
                <div class="record-info">
                  <span class="medication-name">{{ getMedicationName(record.medicationId) }}</span>
                  <span class="cat-name">{{ getCatName(record.catId) }}</span>
                  <span class="quantity">{{ record.quantity }}個</span>
                  <span class="time">{{ formatTime(record.administeredAt) }}</span>
                </div>
                <div class="record-status">
                  <span
                    class="status-badge"
                    :class="`status-${record.status.toLowerCase()}`"
                  >
                    {{ getStatusLabel(record.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reminders -->
        <div
          v-if="selectedDateData.reminders.length > 0"
          class="reminders-section"
        >
          <h4 class="section-title">
            リマインダー
          </h4>
          <div
            v-for="reminder in selectedDateData.reminders"
            :key="reminder.id"
            class="reminder-item"
            :class="`status-${reminder.status.toLowerCase()}`"
          >
            <div class="reminder-info">
              <span class="medication-name">{{ getMedicationName(reminder.medicationId) }}</span>
              <span class="cat-name">{{ getCatName(reminder.catId) }}</span>
              <span class="time">{{ formatTime(reminder.scheduledAt) }}</span>
            </div>
            <div class="reminder-status">
              <span
                class="status-badge"
                :class="`status-${reminder.status.toLowerCase()}`"
              >
                {{ getReminderStatusLabel(reminder.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="date-actions">
        <button
          type="button"
          class="action-button primary"
          @click="createRecord"
        >
          投与記録を追加
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useMedicationsStore } from '~/stores/medications';
import { useCatsStore } from '~/stores/cats';
import type { MedicationRecord, MedicationReminder, MedicationStatus, ReminderStatus } from '~/types/medication';

// Props
interface Props {
  initialDate?: Date;
  catId?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialDate: () => new Date(),
  catId: undefined,
});

// Emits
const emit = defineEmits<{
  dateSelected: [date: string];
  recordCreate: [date: string];
}>();

// Stores
const medicationsStore = useMedicationsStore();
const catsStore = useCatsStore();

// Reactive state
const currentDate = ref(new Date(props.initialDate));
const selectedDate = ref<string | null>(null);
const selectedCatId = ref(props.catId || undefined);
const loading = ref(false);
const error = ref<string | null>(null);

// Calendar data
interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAdministered: boolean;
  hasPending: boolean;
  hasMissed: boolean;
  records: MedicationRecord[];
  reminders: MedicationReminder[];
}

const calendarDays = ref<CalendarDay[]>([]);

// Helper functions
const groupRecordsByTimePeriod = (records: MedicationRecord[]) => {
  const groups = {
    morning: [] as MedicationRecord[],
    afternoon: [] as MedicationRecord[],
    evening: [] as MedicationRecord[],
  };

  records.forEach((record) => {
    const hour = new Date(record.administeredAt).getHours();

    if (hour >= 5 && hour < 12) {
      groups.morning.push(record);
    }
    else if (hour >= 12 && hour < 18) {
      groups.afternoon.push(record);
    }
    else {
      groups.evening.push(record);
    }
  });

  return groups;
};

const getTimePeriodLabel = (period: string): string => {
  const labels = {
    morning: '朝',
    afternoon: '昼',
    evening: '夜',
  };
  return labels[period as keyof typeof labels] || period;
};

// Computed properties
const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  });
});

const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];

const cats = computed(() => catsStore.sortedCats);

const selectedDateData = computed(() => {
  if (!selectedDate.value) return null;

  const day = calendarDays.value.find(d => d.date === selectedDate.value);
  if (!day) return null;

  // Group records by time period
  const groupedRecords = groupRecordsByTimePeriod(day.records);

  return {
    records: day.records,
    reminders: day.reminders,
    groupedRecords,
  };
});

// Methods
const previousMonth = () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() - 1);
  currentDate.value = newDate;
};

const nextMonth = () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + 1);
  currentDate.value = newDate;
};

const onCatChange = () => {
  loadCalendarData();
};

const selectDate = (date: string) => {
  selectedDate.value = date;
  emit('dateSelected', date);
};

const createRecord = () => {
  if (selectedDate.value) {
    emit('recordCreate', selectedDate.value);
  }
};

const getMedicationName = (medicationId: number): string => {
  const medication = medicationsStore.getMedicationById(medicationId);
  return medication?.name || '不明な薬';
};

const getCatName = (catId: number): string => {
  const cat = catsStore.getCatById(catId);
  return cat?.name || '不明な猫';
};

const getStatusLabel = (status: MedicationStatus): string => {
  const labels = {
    PENDING: '予定',
    ADMINISTERED: '投与済み',
    SKIPPED: 'スキップ',
    MISSED: '未投与',
  };
  return labels[status] || status;
};

const getReminderStatusLabel = (status: ReminderStatus): string => {
  const labels = {
    PENDING: '待機中',
    ACKNOWLEDGED: '確認済み',
    SNOOZED: 'スヌーズ',
    DISMISSED: '無視',
  };
  return labels[status] || status;
};

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSelectedDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

const generateCalendarDays = (): CalendarDay[] => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  // Get first day of month and last day of month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get first day of calendar (might be from previous month)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  // Get last day of calendar (might be from next month)
  const endDate = new Date(lastDay);
  const remainingDays = 6 - lastDay.getDay();
  endDate.setDate(endDate.getDate() + remainingDays);

  const days: CalendarDay[] = [];
  const currentDateObj = new Date(startDate);
  const today = new Date();

  while (currentDateObj <= endDate) {
    const dateString = currentDateObj.toISOString().split('T')[0];
    const isCurrentMonth = currentDateObj.getMonth() === month;
    const isToday
      = currentDateObj.getDate() === today.getDate()
        && currentDateObj.getMonth() === today.getMonth()
        && currentDateObj.getFullYear() === today.getFullYear();

    // Get records and reminders for this date
    const dayRecords = medicationsStore.records.filter((record) => {
      const recordDate = new Date(record.administeredAt).toISOString().split('T')[0];
      const matchesDate = recordDate === dateString;
      const matchesCat = !selectedCatId.value || record.catId === selectedCatId.value;
      return matchesDate && matchesCat;
    });

    const dayReminders = medicationsStore.reminders.filter((reminder) => {
      const reminderDate = new Date(reminder.scheduledAt).toISOString().split('T')[0];
      const matchesDate = reminderDate === dateString;
      const matchesCat = !selectedCatId.value || reminder.catId === selectedCatId.value;
      return matchesDate && matchesCat;
    });

    // Determine status indicators
    const hasAdministered = dayRecords.some(r => r.status === 'ADMINISTERED');
    const hasPending = dayRecords.some(r => r.status === 'PENDING')
      || dayReminders.some(r => r.status === 'PENDING');
    const hasMissed = dayRecords.some(r => r.status === 'MISSED');

    days.push({
      date: dateString || '',
      dayNumber: currentDateObj.getDate(),
      isCurrentMonth,
      isToday,
      hasAdministered,
      hasPending,
      hasMissed,
      records: dayRecords,
      reminders: dayReminders,
    });

    currentDateObj.setDate(currentDateObj.getDate() + 1);
  }

  return days;
};

const loadCalendarData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Load cats if not already loaded
    if (cats.value.length === 0) {
      await catsStore.fetchCats();
    }

    // Load medications if not already loaded
    if (medicationsStore.medications.length === 0) {
      await medicationsStore.fetchMedications();
    }

    // Calculate date range for current month view
    const year = currentDate.value.getFullYear();
    const month = currentDate.value.getMonth();
    const startDate = new Date(year, month, 1);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday of first week

    const endDate = new Date(year, month + 1, 0);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End at Saturday of last week

    // Load medication records for the date range
    await medicationsStore.fetchMedicationRecords({
      startDate,
      endDate,
      catId: selectedCatId.value || undefined,
    });

    // Load medication reminders for the date range
    await medicationsStore.fetchMedicationReminders({
      startDate,
      endDate,
      catId: selectedCatId.value || undefined,
    });

    // Generate calendar days after all data is loaded
    calendarDays.value = generateCalendarDays();
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'カレンダーデータの読み込みに失敗しました';
    // Still generate calendar days even if data loading fails
    calendarDays.value = generateCalendarDays();
  }
  finally {
    loading.value = false;
  }
};

// Watch for date changes
watch(currentDate, () => {
  loadCalendarData();
});

watch(() => props.catId, (newCatId) => {
  selectedCatId.value = newCatId || undefined;
  loadCalendarData();
});

// Initialize
onMounted(async () => {
  await loadCalendarData();
});
</script>

<style scoped>
.medication-calendar {
  @apply bg-white rounded-lg shadow-sm border border-gray-200;
}

.calendar-header {
  @apply p-4 border-b border-gray-200 flex items-center justify-between;
}

.calendar-navigation {
  @apply flex items-center space-x-4;
}

.nav-button {
  @apply p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed;
}

.calendar-title {
  @apply text-lg font-semibold text-gray-900;
}

.cat-filter {
  @apply flex items-center space-x-2;
}

.cat-select {
  @apply px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.loading-state {
  @apply p-8 text-center;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4;
}

.error-state {
  @apply p-8 text-center;
}

.error-message {
  @apply text-red-600 mb-4;
}

.retry-button {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700;
}

.calendar-grid {
  @apply p-4;
}

.day-headers {
  @apply grid grid-cols-7 gap-1 mb-2;
}

.day-header {
  @apply p-2 text-center text-sm font-medium text-gray-500;
}

.calendar-days {
  @apply grid grid-cols-7 gap-1;
}

.calendar-day {
  @apply relative p-2 min-h-[60px] border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors;
}

.calendar-day.current-month {
  @apply bg-white;
}

.calendar-day.other-month {
  @apply bg-gray-50 text-gray-400;
}

.calendar-day.today {
  @apply bg-blue-50 border-blue-200;
}

.calendar-day.selected {
  @apply bg-blue-100 border-blue-300;
}

.calendar-day.has-administered {
  @apply border-l-4 border-l-green-500;
}

.calendar-day.has-pending {
  @apply border-l-4 border-l-yellow-500;
}

.calendar-day.has-missed {
  @apply border-l-4 border-l-red-500;
}

.day-number {
  @apply text-sm font-medium;
}

.medication-indicators {
  @apply absolute bottom-1 right-1 flex space-x-1;
}

.indicator {
  @apply w-2 h-2 rounded-full;
}

.indicator.administered {
  @apply bg-green-500;
}

.indicator.pending {
  @apply bg-yellow-500;
}

.indicator.missed {
  @apply bg-red-500;
}

.selected-date-details {
  @apply p-4 border-t border-gray-200 bg-gray-50;
}

.details-title {
  @apply text-lg font-semibold text-gray-900 mb-4;
}

.no-records {
  @apply text-gray-500 text-center py-4;
}

.records-list {
  @apply space-y-4;
}

.section-title {
  @apply text-base font-medium text-gray-700 mb-2;
}

.record-item,
.reminder-item {
  @apply flex items-center justify-between p-3 bg-white rounded-md border border-gray-200;
}

.record-info,
.reminder-info {
  @apply flex items-center space-x-3 text-sm;
}

.medication-name {
  @apply font-medium text-gray-900;
}

.cat-name {
  @apply text-gray-600;
}

.quantity {
  @apply text-gray-600;
}

.time {
  @apply text-gray-500;
}

.status-badge {
  @apply px-2 py-1 text-xs font-medium rounded-full;
}

.status-badge.status-pending {
  @apply bg-yellow-100 text-yellow-800;
}

.status-badge.status-administered {
  @apply bg-green-100 text-green-800;
}

.status-badge.status-skipped {
  @apply bg-gray-100 text-gray-800;
}

.status-badge.status-missed {
  @apply bg-red-100 text-red-800;
}

.status-badge.status-acknowledged {
  @apply bg-blue-100 text-blue-800;
}

.status-badge.status-snoozed {
  @apply bg-purple-100 text-purple-800;
}

.status-badge.status-dismissed {
  @apply bg-gray-100 text-gray-800;
}

.date-actions {
  @apply mt-4 flex justify-end;
}

.action-button {
  @apply px-4 py-2 rounded-md font-medium transition-colors;
}

.action-button.primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.time-period-group {
  @apply mb-4;
}

.time-period {
  @apply border-l-4 border-l-blue-200 pl-3 mb-3;
}

.time-period-title {
  @apply text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide;
}
</style>
