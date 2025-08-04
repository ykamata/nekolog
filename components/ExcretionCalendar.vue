<template>
  <div
    data-testid="excretion-calendar"
    class="excretion-calendar"
    role="application"
    aria-label="排泄記録カレンダー"
  >
    <!-- Calendar Header -->
    <div class="calendar-header">
      <div class="calendar-navigation">
        <button
          data-testid="prev-month-button"
          type="button"
          class="nav-button"
          :disabled="loading"
          :aria-label="`前の月へ移動: ${getPreviousMonthLabel()}`"
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

        <h2
          data-testid="calendar-header"
          class="calendar-title"
          aria-live="polite"
        >
          {{ currentMonthYear }}
        </h2>

        <button
          data-testid="next-month-button"
          type="button"
          class="nav-button"
          :disabled="loading"
          :aria-label="`次の月へ移動: ${getNextMonthLabel()}`"
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
      <div class="calendar-filters">
        <select
          id="calendar-cat-filter"
          v-model="selectedCatId"
          class="cat-filter"
          aria-label="猫でフィルタリング"
          @change="onCatChange"
        >
          <option value="">
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

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-state"
    >
      <div class="loading-spinner" />
      <p>カレンダーデータを読み込み中...</p>
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
      role="grid"
      :aria-label="`${currentMonthYear}のカレンダー`"
    >
      <!-- Day Headers -->
      <div
        class="day-headers"
        role="row"
      >
        <div
          v-for="day in dayHeaders"
          :key="day"
          class="day-header"
          role="columnheader"
          :aria-label="`${day}曜日`"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Days -->
      <div class="calendar-days">
        <button
          v-for="day in calendarDays"
          :key="`${day.date}-${day.isCurrentMonth}`"
          :data-testid="`calendar-day-${day.dayNumber}`"
          type="button"
          class="calendar-day"
          :class="{
            'current-month': day.isCurrentMonth,
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'selected': selectedDate === day.date,
            'has-records': day.hasRecords,
            'has-notes': day.hasNotes,
          }"
          role="gridcell"
          :aria-label="getDateAriaLabel(day)"
          :aria-selected="selectedDate === day.date"
          :aria-current="day.isToday ? 'date' : undefined"
          :tabindex="day.isCurrentMonth ? 0 : -1"
          @click="selectDate(day.date)"
          @keydown="handleKeyDown($event, day)"
        >
          <div class="day-number">
            {{ day.dayNumber }}
          </div>

          <!-- Record Indicators -->
          <div
            v-if="day.hasRecords"
            class="record-indicators"
          >
            <div
              v-if="day.urineCount > 0"
              class="record-indicator urine"
              :title="`おしっこ ${day.urineCount}回`"
            >
              <span class="indicator-icon">💧</span>
              <span class="indicator-count">{{ day.urineCount }}</span>
            </div>
            <div
              v-if="day.fecesCount > 0"
              class="record-indicator feces"
              :title="`うんち ${day.fecesCount}回`"
            >
              <span class="indicator-icon">💩</span>
              <span class="indicator-count">{{ day.fecesCount }}</span>
            </div>
          </div>

          <!-- Notes Indicator -->
          <div
            v-if="day.hasNotes"
            class="notes-indicator"
            title="メモあり"
          >
            📝
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- Statistics -->
  <div
    v-if="stats && !loading"
    class="calendar-stats"
  >
    <div class="stat-item">
      <span class="stat-label">総記録数:</span>
      <span class="stat-value">{{ stats.totalRecords }}回</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">おしっこ:</span>
      <span class="stat-value">{{ stats.urineRecords }}回</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">うんち:</span>
      <span class="stat-value">{{ stats.fecesRecords }}回</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">記録日数:</span>
      <span class="stat-value">{{ stats.daysWithRecords }}日</span>
    </div>
  </div>

  <!-- Detail Modal -->
  <ExcretionCalendarDetailModal
    :is-open="showDetailModal"
    :selected-date="selectedDate"
    :records="selectedDateRecords"
    :cats="cats"
    :loading="detailLoading"
    @close="closeDetailModal"
    @record-added="handleRecordAdded"
    @record-updated="handleRecordUpdated"
    @record-deleted="handleRecordDeleted"
    @refresh="loadCalendarData"
  />
</template>

<script setup lang="ts">
import ExcretionCalendarDetailModal from './ExcretionCalendarDetailModal.vue';
import type { Cat } from '~/types/index';
import type { ExcretionRecord, ExcretionCalendarDay, ExcretionRecordFilter, ExcretionCalendarStats } from '~/types/excretion';

interface Props {
  cats: Cat[];
  catId?: string;
}

interface Emits {
  (e: 'dateSelected', date: string, records: ExcretionRecord[]): void;
  (e: 'monthChanged', year: number, month: number): void;
  (e: 'catChanged', catId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  catId: '',
});

const emit = defineEmits<Emits>();

// Composables
const { fetchCalendarData } = useExcretionRecords();

// State
const currentDate = ref(new Date());
const selectedDate = ref<string | null>(null);
const selectedCatId = ref(props.catId);
const loading = ref(false);
const error = ref<string | null>(null);

// Detail modal state
const showDetailModal = ref(false);
const selectedDateRecords = ref<ExcretionRecord[]>([]);
const detailLoading = ref(false);

// Calendar data
interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasRecords: boolean;
  hasNotes: boolean;
  urineCount: number;
  fecesCount: number;
  records: ExcretionRecord[];
}

const calendarDays = ref<CalendarDay[]>([]);
const calendarData = ref<Record<string, ExcretionCalendarDay>>({});
const stats = ref<ExcretionCalendarStats | null>(null);

// Constants
const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];

// Computed
const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  });
});

// Methods
const previousMonth = () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() - 1);
  currentDate.value = newDate;
  emit('monthChanged', newDate.getFullYear(), newDate.getMonth() + 1);
};

const nextMonth = () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + 1);
  currentDate.value = newDate;
  emit('monthChanged', newDate.getFullYear(), newDate.getMonth() + 1);
};

// Accessibility helper methods
const getPreviousMonthLabel = () => {
  const prevDate = new Date(currentDate.value);
  prevDate.setMonth(prevDate.getMonth() - 1);
  return prevDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  });
};

const getNextMonthLabel = () => {
  const nextDate = new Date(currentDate.value);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  });
};

const getDateAriaLabel = (day: CalendarDay) => {
  const date = new Date(day.date);
  let label = date.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
  });

  if (day.isToday) {
    label += ' (今日)';
  }

  if (day.hasRecords) {
    const recordParts = [];
    if (day.urineCount > 0) {
      recordParts.push(`おしっこ${day.urineCount}回`);
    }
    if (day.fecesCount > 0) {
      recordParts.push(`うんち${day.fecesCount}回`);
    }
    label += ` - ${recordParts.join(', ')}`;
  }

  if (day.hasNotes) {
    label += ' - メモあり';
  }

  return label;
};

const handleKeyDown = (event: KeyboardEvent, day: CalendarDay) => {
  const currentIndex = calendarDays.value.findIndex(d => d.date === day.date);
  let newIndex = currentIndex;

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      newIndex = Math.max(0, currentIndex - 1);
      break;
    case 'ArrowRight':
      event.preventDefault();
      newIndex = Math.min(calendarDays.value.length - 1, currentIndex + 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      newIndex = Math.max(0, currentIndex - 7);
      break;
    case 'ArrowDown':
      event.preventDefault();
      newIndex = Math.min(calendarDays.value.length - 1, currentIndex + 7);
      break;
    case 'Home':
      event.preventDefault();
      newIndex = calendarDays.value.findIndex(d => d.isCurrentMonth && d.dayNumber === 1);
      break;
    case 'End':
    { event.preventDefault();
      const lastDayOfMonth = calendarDays.value.filter(d => d.isCurrentMonth).pop();
      if (lastDayOfMonth) {
        newIndex = calendarDays.value.findIndex(d => d.date === lastDayOfMonth.date);
      }
      break; }
    case 'Enter':
    case ' ':
      event.preventDefault();
      selectDate(day.date);
      return;
  }

  if (newIndex !== currentIndex && calendarDays.value[newIndex]) {
    const newDay = calendarDays.value[newIndex];
    if (newDay) {
      const button = document.querySelector(`[data-testid="calendar-day-${newDay.dayNumber}"]`) as HTMLButtonElement;
      if (button) {
        button.focus();
      }
    }
  }
};

const selectDate = async (date: string) => {
  selectedDate.value = date;
  const dayData = calendarData.value[date];
  const records = dayData ? dayData.records : [];

  // Emit the event for parent components
  emit('dateSelected', date, records);

  // Show detail modal with records for this date
  await loadDetailRecords(date);
  showDetailModal.value = true;
};

const loadDetailRecords = async (date: string) => {
  detailLoading.value = true;

  try {
    // Get detailed records for the selected date
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const params: ExcretionRecordFilter = {
      startDate,
      endDate,
    };

    if (selectedCatId.value) {
      params.catId = selectedCatId.value;
    }

    const { fetchRecords } = useExcretionRecords();
    const response = await fetchRecords(params);
    selectedDateRecords.value = response.records;
  }
  catch (err) {
    selectedDateRecords.value = [];
  }
  finally {
    detailLoading.value = false;
  }
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedDate.value = null;
  selectedDateRecords.value = [];
};

const handleRecordAdded = () => {
  // Refresh calendar data when a record is added
  loadCalendarData();
};

const handleRecordUpdated = () => {
  // Refresh calendar data when a record is updated
  loadCalendarData();
};

const handleRecordDeleted = () => {
  // Refresh calendar data when a record is deleted
  loadCalendarData();
};

const onCatChange = () => {
  emit('catChanged', selectedCatId.value);
  loadCalendarData();
};

const generateCalendarDays = (): CalendarDay[] => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  // Get first and last day of the month
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
    if (!dateString) continue; // Skip if dateString is undefined

    const dayData = calendarData.value[dateString];

    days.push({
      date: dateString,
      dayNumber: currentDateObj.getDate(),
      isCurrentMonth: currentDateObj.getMonth() === month,
      isToday: currentDateObj.toDateString() === today.toDateString(),
      hasRecords: !!dayData && dayData.records.length > 0,
      hasNotes: !!dayData && dayData.hasNotes,
      urineCount: dayData ? dayData.urineCount : 0,
      fecesCount: dayData ? dayData.fecesCount : 0,
      records: dayData ? dayData.records : [],
    });

    currentDateObj.setDate(currentDateObj.getDate() + 1);
  }

  return days;
};

const loadCalendarData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const year = currentDate.value.getFullYear();
    const month = currentDate.value.getMonth() + 1;

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const params: ExcretionRecordFilter = {
      startDate,
      endDate,
    };
    if (selectedCatId.value) {
      params.catId = selectedCatId.value;
    }

    const response = await fetchCalendarData(params);

    // Convert array to object for easier lookup
    calendarData.value = {};
    response.records.forEach((dayData: ExcretionCalendarDay) => {
      calendarData.value[dayData.date] = dayData;
    });

    stats.value = response.stats || null;

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
  selectedCatId.value = newCatId || '';
  loadCalendarData();
});

// Initialize
onMounted(async () => {
  await loadCalendarData();
});
</script>

<style scoped>
.excretion-calendar {
  @apply bg-white rounded-lg shadow-sm border border-gray-200;
}

.calendar-header {
  @apply p-4 border-b border-gray-200 flex items-center justify-between;
}

.calendar-navigation {
  @apply flex items-center space-x-4;
}

.nav-button {
  @apply p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.calendar-title {
  @apply text-lg font-semibold text-gray-900;
}

.calendar-filters {
  @apply flex items-center space-x-2;
}

.cat-filter {
  @apply px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
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
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors;
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
  @apply relative p-2 min-h-[80px] border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors;
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

.calendar-day.has-records {
  @apply border-l-4 border-l-green-500;
}

.calendar-day.has-notes {
  @apply border-r-4 border-r-yellow-500;
}

.day-number {
  @apply text-sm font-medium mb-1;
}

.record-indicators {
  @apply flex flex-col space-y-1;
}

.record-indicator {
  @apply flex items-center space-x-1 text-xs;
}

.record-indicator.urine {
  @apply text-blue-600;
}

.record-indicator.feces {
  @apply text-amber-600;
}

.indicator-icon {
  @apply text-xs;
}

.indicator-count {
  @apply font-medium;
}

.notes-indicator {
  @apply absolute top-1 right-1 text-xs;
}

.calendar-stats {
  @apply p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-4;
}

.stat-item {
  @apply flex items-center space-x-2;
}

.stat-label {
  @apply text-sm text-gray-600;
}

.stat-value {
  @apply text-sm font-medium text-gray-900;
}

/* Responsive design */
@media (max-width: 640px) {
  .calendar-header {
    @apply flex-col space-y-4;
  }

  .calendar-navigation {
    @apply w-full justify-center;
  }

  .calendar-filters {
    @apply w-full justify-center;
  }

  .calendar-day {
    @apply min-h-[60px] p-1;
  }

  .day-number {
    @apply text-xs;
  }

  .record-indicator {
    @apply text-xs;
  }

  .indicator-icon {
    @apply text-xs;
  }

  .calendar-stats {
    @apply flex-col space-y-2;
  }
}
</style>
