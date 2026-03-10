<script setup lang="ts">
import DailyRecordDialog from './DailyRecordDialog.vue';
import DayDetailDialog from './DayDetailDialog.vue';
import type {
  MonthlyCalendarData,
  DailyCalendarData,
} from '~/types/daily-calendar';
import type { Cat } from '~/types/cat-meal';

interface Props {
  catId?: number;
}

interface Emits {
  (e: 'selectDate', data: DailyCalendarData): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth() + 1);
const calendarData = ref<MonthlyCalendarData | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const cats = ref<Cat[]>([]);
const selectedCatId = ref<number | null>(null);

// Dialog state
const showRecordDialog = ref(false);
const showDetailDialog = ref(false);
const selectedDate = ref('');
const selectedDayData = ref<DailyCalendarData | null>(null);

// Message state
const message = ref('');
const messageType = ref<'success' | 'error'>('success');
const showMessage = ref(false);
let messageTimeout: NodeJS.Timeout | null = null;

// Computed
const monthName = computed(() => {
  return `${currentYear.value}年${currentMonth.value}月`;
});

const selectedCatName = computed(() => {
  const id = props.catId || selectedCatId.value;
  return cats.value.find((c) => c.id === id)?.name ?? '';
});

const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

const calendarDays = computed(() => {
  if (!calendarData.value) return [];

  const firstDay = new Date(
    currentYear.value,
    currentMonth.value - 1,
    1
  ).getDay();
  const daysInMonth = calendarData.value.days.length;

  // Add empty slots for days before the first day of the month
  const days: (DailyCalendarData | null)[] = Array(firstDay).fill(null);

  // Add actual days
  days.push(...calendarData.value.days);

  return days;
});

// Methods
const fetchCats = async () => {
  try {
    const data = await $fetch<Cat[]>('/api/cats');
    cats.value = data;
    if (data.length > 0 && !selectedCatId.value) {
      selectedCatId.value = data[0]?.id ?? null;
    }
  } catch (err) {
    console.error('猫データ取得エラー:', err);
  }
};

const fetchCalendarData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const params: Record<string, string> = {
      year: String(currentYear.value),
      month: String(currentMonth.value),
    };

    const catIdToUse = props.catId || selectedCatId.value;
    if (catIdToUse) {
      params.catId = String(catIdToUse);
    }

    const data = await $fetch<MonthlyCalendarData>('/api/daily-calendar', {
      params,
    });

    calendarData.value = data;
  } catch (err) {
    console.error('カレンダーデータ取得エラー:', err);
    error.value = 'カレンダーデータの取得に失敗しました';
  } finally {
    isLoading.value = false;
  }
};

const goToPreviousMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
  fetchCalendarData();
};

const goToNextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
  fetchCalendarData();
};

const goToToday = () => {
  const today = new Date();
  currentYear.value = today.getFullYear();
  currentMonth.value = today.getMonth() + 1;
  fetchCalendarData();
};

const handleDayClick = (day: DailyCalendarData) => {
  selectedDate.value = day.date;
  selectedDayData.value = day;
  showRecordDialog.value = true;
  emit('selectDate', day);
};

const handleDayRightClick = (event: MouseEvent, day: DailyCalendarData) => {
  event.preventDefault();
  selectedDate.value = day.date;
  selectedDayData.value = day;
  showDetailDialog.value = true;
};

const handleDialogClose = () => {
  showRecordDialog.value = false;
  selectedDate.value = '';
  selectedDayData.value = null;
};

const handleDetailDialogClose = () => {
  showDetailDialog.value = false;
};

const handleDialogRefresh = () => {
  fetchCalendarData();
};

const handleShowMessage = (msg: string, type: 'success' | 'error') => {
  message.value = msg;
  messageType.value = type;
  showMessage.value = true;

  // Clear previous timeout
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }

  // Hide message after 5 seconds
  messageTimeout = setTimeout(() => {
    showMessage.value = false;
  }, 5000);
};

const isToday = (dateStr: string) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  return dateStr === todayStr;
};

const getSignalColorClass = (color?: string | null) => {
  if (!color) return '';
  switch (color) {
    case 'GREEN':
      return 'signal-green';
    case 'YELLOW':
      return 'signal-yellow';
    case 'RED':
      return 'signal-red';
    case 'PRISMATIC':
      return 'signal-prismatic';
    default:
      return '';
  }
};

// Watch catId changes
watch(
  () => props.catId,
  () => {
    fetchCalendarData();
  }
);

watch(
  () => selectedCatId.value,
  () => {
    if (selectedCatId.value) {
      fetchCalendarData();
    }
  }
);

// Lifecycle
onMounted(() => {
  fetchCats();
  fetchCalendarData();
});
</script>

<template>
  <div class="daily-calendar">
    <!-- Calendar Header -->
    <div class="calendar-header">
      <div class="calendar-controls">
        <!-- Cat Selector -->
        <div v-if="!catId" class="cat-selector">
          <label class="cat-label">猫:</label>
          <select v-model="selectedCatId" class="cat-select">
            <option v-for="cat in cats" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Month Navigation -->
        <div class="calendar-nav">
          <button type="button" class="nav-button" @click="goToPreviousMonth">
            ‹
          </button>
          <h2 class="month-title">
            {{ monthName }}
          </h2>
          <button type="button" class="nav-button" @click="goToNextMonth">
            ›
          </button>
        </div>

        <!-- Today Button -->
        <button type="button" class="today-button" @click="goToToday">
          今日
        </button>
      </div>
    </div>

    <!-- Message Display -->
    <Transition name="message-slide">
      <div
        v-if="showMessage"
        class="calendar-message"
        :class="{
          'calendar-message--success': messageType === 'success',
          'calendar-message--error': messageType === 'error',
        }"
      >
        <span class="message-icon">{{
          messageType === 'success' ? '✓' : '✕'
        }}</span>
        <span class="message-text">{{ message }}</span>
      </div>
    </Transition>

    <!-- Loading State -->
    <div v-if="isLoading" class="calendar-loading">
      <div class="loading-spinner" />
      <p>カレンダーを読み込み中...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="calendar-error">
      <p class="error-message">
        {{ error }}
      </p>
      <button type="button" class="retry-button" @click="fetchCalendarData">
        再試行
      </button>
    </div>

    <!-- Calendar Grid -->
    <div v-else class="calendar-content">
      <!-- Week day headers -->
      <div class="calendar-weekdays">
        <div
          v-for="day in weekDays"
          :key="day"
          class="weekday"
          :class="{
            'weekday--sunday': day === '日',
            'weekday--saturday': day === '土',
          }"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar days -->
      <div class="calendar-grid">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="calendar-day"
          :class="{
            'calendar-day--empty': !day,
            'calendar-day--today': day && isToday(day.date),
            'calendar-day--has-data':
              day &&
              (day.mealCount > 0 ||
                day.excretionCount.total > 0 ||
                day.hasMemo ||
                day.hasEmergencyMedication),
            [getSignalColorClass(day?.signalColor)]: day && day.signalColor,
          }"
          @click="day && handleDayClick(day)"
          @contextmenu="day && handleDayRightClick($event, day)"
        >
          <div v-if="day" class="day-content">
            <!-- Day header with number and icons -->
            <div class="day-header">
              <span class="day-number">{{ new Date(day.date).getDate() }}</span>
              <div class="day-icons">
                <span
                  v-if="day.hasEmergencyMedication"
                  class="icon-badge"
                  title="頓服薬あり"
                  >💊</span
                >
                <span v-if="day.hasMemo" class="icon-badge" title="メモあり"
                  >📝</span
                >
              </div>
            </div>

            <!-- Event details -->
            <div class="day-details">
              <!-- Total calories -->
              <div
                v-if="day.totalCalories > 0"
                class="detail-row detail-calories"
                :title="`合計カロリー: ${day.totalCalories}kcal`"
              >
                <span class="detail-label">🍽️</span>
                <span class="detail-value">{{ day.totalCalories }}kcal</span>
              </div>

              <!-- Excretion times -->
              <div
                v-if="
                  day.excretionTimes.urine.length > 0 ||
                  day.excretionTimes.feces.length > 0
                "
                class="detail-row detail-excretion"
              >
                <!-- Urine times -->
                <div
                  v-if="day.excretionTimes.urine.length > 0"
                  class="excretion-times"
                  :title="`おしっこ: ${day.excretionTimes.urine.join(', ')}`"
                >
                  <span class="excretion-icon">💧</span>
                  <span class="excretion-values">{{
                    day.excretionTimes.urine.join(', ')
                  }}</span>
                </div>

                <!-- Feces times -->
                <div
                  v-if="day.excretionTimes.feces.length > 0"
                  class="excretion-times"
                  :title="`うんち: ${day.excretionTimes.feces.join(', ')}`"
                >
                  <span class="excretion-icon">💩</span>
                  <span class="excretion-values">{{
                    day.excretionTimes.feces.join(', ')
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="calendar-legend">
      <div class="legend-title">凡例</div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-icon">🍽️</span>
          <span class="legend-label">食事</span>
        </div>
        <div class="legend-item">
          <span class="legend-icon">💧💩</span>
          <span class="legend-label">排泄</span>
        </div>
        <div class="legend-item">
          <span class="legend-icon">💊</span>
          <span class="legend-label">頓服薬</span>
        </div>
        <div class="legend-item">
          <span class="legend-icon">📝</span>
          <span class="legend-label">メモ</span>
        </div>
      </div>
      <div class="legend-separator" />
      <div class="legend-subtitle">健康シグナル</div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-color-box signal-prismatic-box" />
          <span class="legend-label">最高✨</span>
        </div>
        <div class="legend-item">
          <span class="legend-color-box signal-green-box" />
          <span class="legend-label">良い</span>
        </div>
        <div class="legend-item">
          <span class="legend-color-box signal-yellow-box" />
          <span class="legend-label">まあまあ</span>
        </div>
        <div class="legend-item">
          <span class="legend-color-box signal-red-box" />
          <span class="legend-label">ダメ</span>
        </div>
      </div>
    </div>

    <!-- Daily Record Dialog -->
    <DailyRecordDialog
      :is-open="showRecordDialog"
      :date="selectedDate"
      :day-data="selectedDayData"
      :initial-cat-id="props.catId || selectedCatId"
      :initial-cat-name="selectedCatName"
      @close="handleDialogClose"
      @refresh="handleDialogRefresh"
      @show-message="handleShowMessage"
    />

    <!-- Day Detail Dialog -->
    <DayDetailDialog
      :is-open="showDetailDialog"
      :date="selectedDate"
      :day-data="selectedDayData"
      @close="handleDetailDialogClose"
    />
  </div>
</template>

<style scoped>
.daily-calendar {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Message Display */
.calendar-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.calendar-message--success {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
}

.calendar-message--error {
  background: linear-gradient(135deg, #f44336 0%, #e57373 100%);
  color: white;
}

.message-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  font-weight: 700;
  font-size: 1rem;
}

.message-text {
  flex: 1;
  font-size: 1rem;
}

/* Message transition */
.message-slide-enter-active,
.message-slide-leave-active {
  transition: all 0.3s ease;
}

.message-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.message-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Calendar Header */
.calendar-header {
  margin-bottom: 1.5rem;
}

.calendar-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.cat-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.cat-label {
  font-weight: 600;
  color: white;
  font-size: 1rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.cat-select {
  padding: 0.5rem 1rem;
  border: 2px solid white;
  border-radius: 6px;
  background: white;
  font-size: 1rem;
  font-weight: 600;
  color: #667eea;
  cursor: pointer;
  min-width: 150px;
  transition: all 0.2s ease;
}

.cat-select:hover {
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.cat-select:focus {
  outline: none;
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5);
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  background: #e8f5e9;
  border-color: #4caf50;
  color: #4caf50;
}

.month-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  min-width: 150px;
  text-align: center;
}

.today-button {
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.today-button:hover {
  background: #45a049;
}

/* Loading and Error States */
.calendar-loading,
.calendar-error {
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

.error-message {
  color: #f44336;
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Calendar Content */
.calendar-content {
  margin-bottom: 1.5rem;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.weekday {
  padding: 0.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: #666;
}

.weekday--sunday {
  color: #f44336;
}

.weekday--saturday {
  color: #2196f3;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  min-height: 100px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.calendar-day:not(.calendar-day--empty):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #4caf50;
}

.calendar-day--empty {
  background: transparent;
  border: none;
  cursor: default;
}

.calendar-day--today {
  border: 2px solid #4caf50;
  background: #e8f5e9;
}

.calendar-day--has-data {
  background: white;
}

/* Health Signal Colors */
.calendar-day.signal-green {
  background: linear-gradient(
    135deg,
    rgba(76, 175, 80, 0.15) 0%,
    rgba(129, 199, 132, 0.1) 100%
  );
  border-color: #4caf50;
}

.calendar-day.signal-green.calendar-day--has-data {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, white 100%);
  border-left: 4px solid #4caf50;
}

.calendar-day.signal-yellow {
  background: linear-gradient(
    135deg,
    rgba(255, 193, 7, 0.2) 0%,
    rgba(255, 224, 130, 0.15) 100%
  );
  border-color: #ffc107;
}

.calendar-day.signal-yellow.calendar-day--has-data {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, white 100%);
  border-left: 4px solid #ffc107;
}

.calendar-day.signal-red {
  background: linear-gradient(
    135deg,
    rgba(244, 67, 54, 0.2) 0%,
    rgba(239, 154, 154, 0.15) 100%
  );
  border-color: #f44336;
}

.calendar-day.signal-red.calendar-day--has-data {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, white 100%);
  border-left: 4px solid #f44336;
}

/* Prismatic - Rainbow Gradient Animation */
@keyframes rainbow-flow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes prismatic-shimmer {
  0% {
    opacity: 0.8;
    transform: translateX(-100%);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.8;
    transform: translateX(100%);
  }
}

.calendar-day.signal-prismatic {
  position: relative;
  background: linear-gradient(
    90deg,
    rgba(255, 0, 0, 0.3) 0%,
    rgba(255, 154, 0, 0.3) 10%,
    rgba(208, 222, 33, 0.3) 20%,
    rgba(79, 220, 74, 0.3) 30%,
    rgba(63, 218, 216, 0.3) 40%,
    rgba(47, 201, 226, 0.3) 50%,
    rgba(28, 127, 238, 0.3) 60%,
    rgba(95, 21, 242, 0.3) 70%,
    rgba(186, 12, 248, 0.3) 80%,
    rgba(251, 7, 217, 0.3) 90%,
    rgba(255, 0, 0, 0.3) 100%
  );
  background-size: 200% 200%;
  animation: rainbow-flow 3s ease infinite;
  border: 2px solid transparent;
  border-image: linear-gradient(
      90deg,
      #ff0000,
      #ff9a00,
      #d0de21,
      #4fdc4a,
      #3fdad8,
      #2fc9e2,
      #1c7fee,
      #5f15f2,
      #ba0cf8,
      #fb07d9,
      #ff0000
    )
    1;
  box-shadow:
    0 0 15px rgba(255, 255, 255, 0.5),
    0 0 25px rgba(186, 12, 248, 0.3),
    inset 0 0 20px rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.calendar-day.signal-prismatic::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 45%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.4) 55%,
    transparent 100%
  );
  animation: prismatic-shimmer 2.5s ease-in-out infinite;
  pointer-events: none;
}

.calendar-day.signal-prismatic.calendar-day--has-data {
  background:
    linear-gradient(
      90deg,
      rgba(255, 0, 0, 0.15) 0%,
      rgba(255, 154, 0, 0.15) 10%,
      rgba(208, 222, 33, 0.15) 20%,
      rgba(79, 220, 74, 0.15) 30%,
      rgba(63, 218, 216, 0.15) 40%,
      rgba(47, 201, 226, 0.15) 50%,
      rgba(28, 127, 238, 0.15) 60%,
      rgba(95, 21, 242, 0.15) 70%,
      rgba(186, 12, 248, 0.15) 80%,
      rgba(251, 7, 217, 0.15) 90%,
      rgba(255, 0, 0, 0.15) 100%
    ),
    white;
  background-size:
    200% 200%,
    100% 100%;
  animation: rainbow-flow 3s ease infinite;
  border-left: 4px solid;
  border-image: linear-gradient(
      180deg,
      #ff0000,
      #ff9a00,
      #d0de21,
      #4fdc4a,
      #3fdad8,
      #2fc9e2,
      #1c7fee,
      #5f15f2,
      #ba0cf8,
      #fb07d9
    )
    1;
}

.calendar-day.signal-prismatic:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 0 20px rgba(255, 255, 255, 0.6),
    0 0 35px rgba(186, 12, 248, 0.5),
    0 8px 16px rgba(0, 0, 0, 0.2),
    inset 0 0 25px rgba(255, 255, 255, 0.3);
}

.day-content {
  padding: 0.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Day header with number and icons */
.day-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.25rem;
}

.day-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
}

.day-icons {
  display: flex;
  gap: 0.25rem;
}

.icon-badge {
  font-size: 0.875rem;
  line-height: 1;
}

/* Day details */
.day-details {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.75rem;
  flex: 1;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  line-height: 1.2;
}

.detail-calories {
  padding: 0.25rem 0.375rem;
  background: #fff3e0;
  border-radius: 4px;
  border-left: 3px solid #ff9800;
}

.detail-label {
  font-size: 0.875rem;
}

.detail-value {
  font-weight: 600;
  color: #f57c00;
}

.detail-excretion {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.excretion-times {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.25rem;
  background: #e3f2fd;
  border-radius: 4px;
  font-size: 0.7rem;
}

.excretion-icon {
  font-size: 0.875rem;
  line-height: 1;
}

.excretion-values {
  font-weight: 500;
  color: #1976d2;
  font-size: 0.7rem;
  line-height: 1.2;
  word-break: break-all;
}

/* Legend */
.calendar-legend {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.legend-title {
  font-weight: 600;
  color: #666;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.legend-subtitle {
  font-weight: 600;
  color: #666;
  margin-bottom: 0.5rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
}

.legend-separator {
  height: 1px;
  background: #e2e8f0;
  margin: 0.75rem 0;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-icon {
  font-size: 1rem;
}

.legend-color-box {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.signal-prismatic-box {
  background: linear-gradient(
    90deg,
    rgba(255, 0, 0, 0.4) 0%,
    rgba(255, 154, 0, 0.4) 14%,
    rgba(208, 222, 33, 0.4) 28%,
    rgba(79, 220, 74, 0.4) 42%,
    rgba(47, 201, 226, 0.4) 56%,
    rgba(95, 21, 242, 0.4) 70%,
    rgba(186, 12, 248, 0.4) 84%,
    rgba(255, 0, 0, 0.4) 100%
  );
  background-size: 200% 100%;
  animation: rainbow-flow 3s ease infinite;
  border: 1px solid;
  border-image: linear-gradient(
      90deg,
      #ff0000,
      #ff9a00,
      #d0de21,
      #4fdc4a,
      #2fc9e2,
      #5f15f2,
      #ba0cf8,
      #ff0000
    )
    1;
}

.signal-green-box {
  background: linear-gradient(
    135deg,
    rgba(76, 175, 80, 0.3) 0%,
    rgba(129, 199, 132, 0.2) 100%
  );
  border-color: #4caf50;
}

.signal-yellow-box {
  background: linear-gradient(
    135deg,
    rgba(255, 193, 7, 0.4) 0%,
    rgba(255, 224, 130, 0.3) 100%
  );
  border-color: #ffc107;
}

.signal-red-box {
  background: linear-gradient(
    135deg,
    rgba(244, 67, 54, 0.4) 0%,
    rgba(239, 154, 154, 0.3) 100%
  );
  border-color: #f44336;
}

.legend-label {
  font-size: 0.85rem;
  color: #666;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .daily-calendar {
    padding: 1rem;
  }

  .calendar-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .calendar-nav {
    justify-content: center;
  }

  .month-title {
    font-size: 1.25rem;
  }

  .calendar-day {
    min-height: 80px;
  }

  .day-content {
    padding: 0.375rem;
  }

  .day-number {
    font-size: 1rem;
  }

  .indicator {
    font-size: 0.7rem;
  }

  .legend-items {
    gap: 0.5rem;
  }

  /* スマホ用: カロリー表示を簡略化 */
  .detail-calories {
    padding: 0.2rem 0.3rem;
    background: transparent;
    border: none;
  }

  .detail-calories .detail-label {
    display: none; /* 🍽️アイコンを非表示 */
  }

  .detail-calories .detail-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: #f57c00;
  }

  /* スマホ用: 排泄時刻を非表示、アイコンのみ表示 */
  .excretion-times {
    padding: 0;
    background: transparent;
    justify-content: center;
  }

  .excretion-values {
    display: none; /* 時刻を非表示 */
  }

  .excretion-icon {
    font-size: 0.5rem;
  }

  /* スマホ用: アイコンバッジのサイズ調整 */
  .icon-badge {
    font-size: 0.5rem;
  }

  /* スマホ用: アイコンを縦並びに */
  .day-icons {
    flex-direction: column;
    gap: 0.125rem;
  }

  /* スマホ用: 詳細行の配置調整 */
  .detail-excretion {
    flex-direction: row;
    gap: 0.25rem;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .calendar-day {
    min-height: 60px;
  }

  .day-content {
    padding: 0.25rem;
  }

  .day-number {
    font-size: 0.9rem;
  }

  .event-indicators {
    font-size: 0.65rem;
  }

  .indicator {
    padding: 0.0625rem 0.125rem;
  }

  /* 480px以下でさらに調整 */
  .detail-calories .detail-value {
    font-size: 0.65rem;
  }

  .excretion-icon {
    font-size: 0.5rem;
  }

  .icon-badge {
    font-size: 0.5rem;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .calendar-day:hover {
    transform: none;
  }

  * {
    transition: none !important;
  }
}
</style>
