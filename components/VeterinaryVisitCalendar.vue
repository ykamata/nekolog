<script setup lang="ts">
import { useResponsive } from '~/composables/useResponsive';
import type { Cat } from '~/types/cat-meal';
import type {
  VeterinaryVisitWithRelations,
  VeterinaryAppointmentWithRelations,
  CalendarEventData,
  CalendarVisitData,
  CalendarAppointmentData,
} from '~/types/veterinary-visit';

interface Props {
  visits: VeterinaryVisitWithRelations[];
  appointments?: VeterinaryAppointmentWithRelations[];
  cats: Cat[];
  selectedCatId?: string;
  showAppointments?: boolean;
  loading?: boolean;
  viewMode?: 'calendar' | 'list';
  showBloodTestFilter?: boolean;
  showVisitTypeFilter?: boolean;
  initialDate?: Date;
}

interface Emits {
  (e: 'dateSelected', date: Date, events: CalendarEventData[]): void;
  (e: 'visitCreate', date: Date): void;
  (e: 'appointmentCreate', date: Date): void;
  (e: 'monthChanged', year: number, month: number): void;
  (e: 'catFilterChanged', catId: string): void;
  (e: 'viewModeChanged', mode: 'calendar' | 'list'): void;
  (e: 'bloodTestFilterChanged', showBloodTestOnly: boolean): void;
  (e: 'appointmentFilterChanged', showAppointments: boolean): void;
  (e: 'notesUpdated', data: { eventId: string; eventType: 'visit' | 'appointment'; notes: string }): void;
}

const props = withDefaults(defineProps<Props>(), {
  appointments: () => [],
  selectedCatId: '',
  showAppointments: true,
  loading: false,
  viewMode: 'calendar',
  showBloodTestFilter: true,
  showVisitTypeFilter: true,
  initialDate: () => new Date(),
});

const emit = defineEmits<Emits>();

// Calendar state
const currentDate = ref(props.initialDate);
const selectedDate = ref<Date | null>(null);
const showDetailModal = ref(false);
const selectedDateEvents = ref<CalendarEventData[]>([]);

// Filter state
const internalCatFilter = ref(props.selectedCatId);
const internalViewMode = ref(props.viewMode);
const bloodTestFilter = ref<'all' | 'bloodTest' | 'noBloodTest'>('all');
const appointmentFilter = ref(props.showAppointments);

// Detail modal state
const editingEventId = ref<string | null>(null);
const editingNotes = ref('');

// レスポンシブ対応
const { screenSize, getResponsiveClasses } = useResponsive();

// Computed properties
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());

const monthName = computed(() => {
  return currentDate.value.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  });
});

// フィルタリングされた通院記録を取得
const filteredVisits = computed(() => {
  let filtered = props.visits;

  // 猫フィルター
  if (internalCatFilter.value) {
    filtered = filtered.filter(visit => visit.catId === internalCatFilter.value);
  }

  // 血液検査フィルター
  if (bloodTestFilter.value === 'bloodTest') {
    filtered = filtered.filter(visit => visit.hasBloodTest);
  }
  else if (bloodTestFilter.value === 'noBloodTest') {
    filtered = filtered.filter(visit => !visit.hasBloodTest);
  }

  return filtered;
});

// フィルタリングされた予約を取得
const filteredAppointments = computed(() => {
  if (!appointmentFilter.value) {
    return [];
  }

  let filtered = props.appointments;

  // 猫フィルター
  if (internalCatFilter.value) {
    filtered = filtered.filter(appointment => appointment.catId === internalCatFilter.value);
  }

  return filtered;
});

// 指定日のイベントを取得
const getEventsForDate = (date: Date): CalendarEventData[] => {
  const events: CalendarEventData[] = [];

  // フィルタリングされた通院記録を追加
  const dayVisits = filteredVisits.value.filter(visit =>
    isSameDay(new Date(visit.visitDate), date),
  );

  dayVisits.forEach((visit) => {
    const cat = props.cats.find(c => c.id === visit.catId);
    events.push({
      id: visit.id,
      catId: visit.catId,
      catName: cat?.name || '不明',
      visitDate: new Date(visit.visitDate),
      hospitalName: visit.hospital.name,
      doctorName: visit.doctor?.name,
      hasBloodTest: visit.hasBloodTest,
      notes: visit.notes,
      type: 'visit',
    } as CalendarVisitData);
  });

  // フィルタリングされた予約を追加
  const dayAppointments = filteredAppointments.value.filter(appointment =>
    isSameDay(new Date(appointment.appointmentDate), date),
  );

  dayAppointments.forEach((appointment) => {
    const cat = props.cats.find(c => c.id === appointment.catId);
    events.push({
      id: appointment.id,
      catId: appointment.catId,
      catName: cat?.name || '不明',
      appointmentDate: new Date(appointment.appointmentDate),
      hospitalName: appointment.hospital.name,
      doctorName: appointment.doctor?.name,
      status: appointment.status,
      notes: appointment.notes,
      type: 'appointment',
    } as CalendarAppointmentData);
  });

  return events;
};

// カレンダーの日付データを生成
const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;

  // 月の最初の日と最後の日
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // カレンダーの開始日（前月の日曜日から）
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  // カレンダーの終了日（次月の土曜日まで）
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  const days: CalendarDay[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayEvents = getEventsForDate(current);

    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
      isToday: isToday(current),
      isSelected: selectedDate.value ? isSameDay(current, selectedDate.value) : false,
      events: dayEvents,
      hasVisits: dayEvents.some(e => e.type === 'visit'),
      hasAppointments: dayEvents.some(e => e.type === 'appointment'),
      hasBloodTest: dayEvents.some(e => e.type === 'visit' && (e as CalendarVisitData).hasBloodTest),
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
});

// 週の配列（日曜日から土曜日）
const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

// 日付ユーティリティ関数
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate();
};

const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

// Methods
const navigateMonth = (direction: 'prev' | 'next') => {
  const newDate = new Date(currentDate.value);
  if (direction === 'prev') {
    newDate.setMonth(newDate.getMonth() - 1);
  }
  else {
    newDate.setMonth(newDate.getMonth() + 1);
  }
  currentDate.value = newDate;
  emit('monthChanged', newDate.getFullYear(), newDate.getMonth());
};

const goToToday = () => {
  const today = new Date();
  currentDate.value = today;
  selectedDate.value = today;
  emit('monthChanged', today.getFullYear(), today.getMonth());
};

const handleDateClick = (day: CalendarDay) => {
  selectedDate.value = day.date;
  selectedDateEvents.value = day.events;

  // イベントがある場合は詳細モーダルを表示
  if (day.events.length > 0) {
    showDetailModal.value = true;
  }

  // 日付の時間部分を00:00:00にして発火
  const dateOnly = new Date(day.date);
  dateOnly.setHours(0, 0, 0, 0);
  emit('dateSelected', dateOnly, day.events);
};

const handleDateDoubleClick = (day: CalendarDay) => {
  // ダブルクリックで新規記録作成
  emit('visitCreate', day.date);
};

const handleDateRightClick = (event: MouseEvent, day: CalendarDay) => {
  event.preventDefault();
  // 右クリックで予約作成
  emit('appointmentCreate', day.date);
};

// 詳細モーダル関連のメソッド
const closeDetailModal = () => {
  showDetailModal.value = false;
  editingEventId.value = null;
  editingNotes.value = '';
};

const startEditingNotes = (event: CalendarEventData) => {
  editingEventId.value = event.id;
  editingNotes.value = event.notes || '';
};

const cancelEditingNotes = () => {
  editingEventId.value = null;
  editingNotes.value = '';
};

const saveNotes = async (event: CalendarEventData) => {
  // 親コンポーネントにイベントを発火して処理を委譲
  emit('notesUpdated', {
    eventId: event.id,
    eventType: event.type,
    notes: editingNotes.value,
  });

  // 編集状態をリセット
  editingEventId.value = null;
  editingNotes.value = '';
};

const formatEventTime = (event: CalendarEventData): string => {
  const date = event.type === 'visit'
    ? (event as CalendarVisitData).visitDate
    : (event as CalendarAppointmentData).appointmentDate;

  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getEventTypeLabel = (event: CalendarEventData): string => {
  if (event.type === 'visit') {
    return '通院記録';
  }
  else {
    const appointment = event as CalendarAppointmentData;
    return `予約 (${appointment.status === 'SCHEDULED' ? '予定' : appointment.status === 'COMPLETED' ? '完了' : 'キャンセル'})`;
  }
};

// フィルター機能のメソッド
const handleCatFilterChange = (catId: string) => {
  internalCatFilter.value = catId;
  emit('catFilterChanged', catId);
};

const handleViewModeChange = (mode: 'calendar' | 'list') => {
  internalViewMode.value = mode;
  emit('viewModeChanged', mode);
};

const handleBloodTestFilterChange = (filter: 'all' | 'bloodTest' | 'noBloodTest') => {
  bloodTestFilter.value = filter;
  emit('bloodTestFilterChanged', filter === 'bloodTest');
};

const handleAppointmentFilterChange = (show: boolean) => {
  appointmentFilter.value = show;
  emit('appointmentFilterChanged', show);
};

// 日付のスタイルクラスを取得
const getDayClasses = (day: CalendarDay): string[] => {
  const classes = ['calendar-day'];

  if (!day.isCurrentMonth) {
    classes.push('calendar-day--other-month');
  }

  if (day.isToday) {
    classes.push('calendar-day--today');
  }

  if (day.isSelected) {
    classes.push('calendar-day--selected');
  }

  if (day.hasVisits) {
    classes.push('calendar-day--has-visits');
    classes.push('has-visit'); // テスト用のクラス名
  }

  if (day.hasAppointments) {
    classes.push('calendar-day--has-appointments');
    classes.push('has-appointment'); // テスト用のクラス名
  }

  if (day.hasBloodTest) {
    classes.push('calendar-day--has-blood-test');
  }

  return classes;
};

// 日付のイベント表示用のドットを取得
const getEventDots = (day: CalendarDay) => {
  const dots: EventDot[] = [];

  // 猫別にグループ化
  const catGroups = new Map<string, CalendarEventData[]>();
  day.events.forEach((event) => {
    if (!catGroups.has(event.catId)) {
      catGroups.set(event.catId, []);
    }
    catGroups.get(event.catId)!.push(event);
  });

  // 各猫のイベントに対してドットを生成
  catGroups.forEach((events, catId) => {
    const cat = props.cats.find(c => c.id === catId);
    const hasVisit = events.some(e => e.type === 'visit');
    const hasAppointment = events.some(e => e.type === 'appointment');
    const hasBloodTest = events.some(e => e.type === 'visit' && (e as CalendarVisitData).hasBloodTest);

    dots.push({
      catId,
      catName: cat?.name || '不明',
      hasVisit,
      hasAppointment,
      hasBloodTest,
      eventCount: events.length,
    });
  });

  return dots.slice(0, 3); // 最大3つまで表示
};

// 通院記録IDを取得するヘルパー関数
const getVisitId = (day: CalendarDay): string => {
  const visitEvent = day.events.find(e => e.type === 'visit');
  return visitEvent ? visitEvent.id : '';
};

// 予約IDを取得するヘルパー関数
const getAppointmentId = (day: CalendarDay): string => {
  const appointmentEvent = day.events.find(e => e.type === 'appointment');
  return appointmentEvent ? appointmentEvent.id : '';
};

// カレンダーコンテナのCSSクラスを取得
const calendarClasses = computed(() => getResponsiveClasses('veterinary-calendar'));

// 日付セルのaria-label属性を生成
const getDateAriaLabel = (day: CalendarDay): string => {
  const dateStr = day.date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const eventDescriptions: string[] = [];
  if (day.hasVisits) {
    eventDescriptions.push('通院記録あり');
  }
  if (day.hasAppointments) {
    eventDescriptions.push('予約あり');
  }
  if (day.hasBloodTest) {
    eventDescriptions.push('血液検査実施');
  }

  return eventDescriptions.length > 0
    ? `${dateStr} ${eventDescriptions.join(', ')}`
    : dateStr;
};

// 型定義
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEventData[];
  hasVisits: boolean;
  hasAppointments: boolean;
  hasBloodTest: boolean;
}

interface EventDot {
  catId: string;
  catName: string;
  hasVisit: boolean;
  hasAppointment: boolean;
  hasBloodTest: boolean;
  eventCount: number;
}

// Watch for prop changes
watch(
  () => [props.visits, props.appointments, props.selectedCatId],
  () => {
    // データが変更されたら選択状態をリセット
    if (selectedDate.value) {
      const day = calendarDays.value.find(d => isSameDay(d.date, selectedDate.value!));
      if (day) {
        selectedDateEvents.value = day.events;
        emit('dateSelected', day.date, day.events);
      }
    }
  },
  { deep: true },
);

// Watch for external prop changes
watch(
  () => props.selectedCatId,
  (newCatId) => {
    internalCatFilter.value = newCatId || '';
  },
);

watch(
  () => props.viewMode,
  (newMode) => {
    internalViewMode.value = newMode;
  },
);

watch(
  () => props.showAppointments,
  (newShow) => {
    appointmentFilter.value = newShow;
  },
);

// モバイルの場合はデフォルトでリスト表示
watch(screenSize, (newSize) => {
  if (newSize === 'mobile' && internalViewMode.value === 'calendar') {
    internalViewMode.value = 'list';
    emit('viewModeChanged', 'list');
  }
});
</script>

<template>
  <div
    :class="calendarClasses"
    data-testid="calendar-container"
  >
    <!-- Calendar Header -->
    <div
      class="calendar-header"
      data-testid="calendar-header"
    >
      <div class="calendar-navigation">
        <button
          class="nav-btn"
          data-testid="prev-month-button"
          @click="navigateMonth('prev')"
        >
          <svg
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
          {{ monthName }}
        </h2>

        <button
          class="nav-btn"
          data-testid="next-month-button"
          @click="navigateMonth('next')"
        >
          <svg
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

      <button
        class="today-btn"
        @click="goToToday"
      >
        今日
      </button>
    </div>

    <!-- Calendar Filters -->
    <div class="calendar-filters">
      <!-- View Mode Toggle -->
      <div class="filter-group">
        <label class="filter-label">表示モード</label>
        <div class="view-mode-toggle">
          <button
            class="toggle-btn"
            :class="{ 'toggle-btn--active': internalViewMode === 'calendar' }"
            @click="handleViewModeChange('calendar')"
          >
            <svg
              class="toggle-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            カレンダー
          </button>
          <button
            class="toggle-btn"
            :class="{ 'toggle-btn--active': internalViewMode === 'list' }"
            data-testid="list-mode-button"
            @click="handleViewModeChange('list')"
          >
            <svg
              class="toggle-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            一覧
          </button>
        </div>
      </div>

      <!-- Cat Filter -->
      <div class="filter-group">
        <label
          for="cat-filter"
          class="filter-label"
        >猫フィルター</label>
        <select
          id="cat-filter"
          :value="internalCatFilter"
          class="filter-select"
          data-testid="cat-filter"
          aria-describedby="cat-filter-description"
          @change="handleCatFilterChange(($event.target as HTMLSelectElement).value)"
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
        <div
          id="cat-filter-description"
          class="sr-only"
        >
          特定の猫の記録のみを表示するためのフィルター
        </div>
      </div>

      <!-- Blood Test Filter -->
      <div
        v-if="showBloodTestFilter"
        class="filter-group"
      >
        <label class="filter-label">血液検査フィルター</label>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="bloodTestFilter === 'bloodTest'"
              class="checkbox-input"
              data-testid="blood-test-filter"
              aria-describedby="blood-test-filter-description"
              @change="handleBloodTestFilterChange(($event.target as HTMLInputElement).checked ? 'bloodTest' : 'all')"
            >
            <span class="checkbox-text">血液検査のみ表示</span>
          </label>
          <div
            id="blood-test-filter-description"
            class="sr-only"
          >
            血液検査を実施した通院記録のみを表示
          </div>
        </div>
      </div>

      <!-- Appointment Filter -->
      <div
        v-if="showVisitTypeFilter"
        class="filter-group"
      >
        <label class="filter-label">表示内容</label>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="appointmentFilter"
              class="checkbox-input"
              @change="handleAppointmentFilterChange(($event.target as HTMLInputElement).checked)"
            >
            <span class="checkbox-text">予約を表示</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Calendar Legend -->
    <div class="calendar-legend">
      <div class="legend-item">
        <div class="legend-dot legend-dot--visit" />
        <span>通院記録</span>
      </div>
      <div
        v-if="appointmentFilter"
        class="legend-item"
      >
        <div class="legend-dot legend-dot--appointment" />
        <span>予約</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot legend-dot--blood-test" />
        <span>血液検査</span>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="calendar-loading"
    >
      <div
        class="loading-spinner"
        data-testid="loading-spinner"
      />
      <p>カレンダーを読み込み中...</p>
    </div>

    <!-- Calendar View -->
    <div
      v-if="internalViewMode === 'calendar'"
      data-testid="calendar-view"
    >
      <!-- Calendar Grid -->
      <div
        v-if="!loading"
        class="calendar-grid"
        data-testid="calendar-grid"
      >
        <!-- Week Header -->
        <div class="calendar-week-header">
          <div
            v-for="day in weekDays"
            :key="day"
            class="week-day-header"
            :class="{ 'week-day-header--weekend': day === '日' || day === '土' }"
          >
            {{ day }}
          </div>
        </div>

        <!-- Calendar Days -->
        <div class="calendar-days">
          <div
            v-for="day in calendarDays"
            :key="day.date.toISOString()"
            :class="getDayClasses(day)"
            :data-date="day.date.toISOString().split('T')[0]"
            role="button"
            :aria-label="getDateAriaLabel(day)"
            :aria-pressed="day.isSelected"
            :aria-current="day.isToday ? 'date' : undefined"
            :aria-describedby="day.events.length > 0 ? `events-${day.date.toISOString().split('T')[0]}` : undefined"
            tabindex="0"
            @click="handleDateClick(day)"
            @dblclick="handleDateDoubleClick(day)"
            @contextmenu="handleDateRightClick($event, day)"
            @keydown.enter="handleDateClick(day)"
            @keydown.space.prevent="handleDateClick(day)"
          >
            <div class="day-number">
              {{ day.date.getDate() }}
            </div>

            <!-- 通院記録マーク -->
            <div
              v-if="day.hasVisits"
              :data-testid="`visit-mark-${getVisitId(day)}`"
              class="visit-mark"
              aria-label="通院記録あり"
            />

            <!-- 血液検査マーク -->
            <div
              v-if="day.hasBloodTest"
              :data-testid="`blood-test-mark-${getVisitId(day)}`"
              class="blood-test-mark"
              aria-label="血液検査実施"
            />

            <!-- 予約マーク -->
            <div
              v-if="day.hasAppointments"
              :data-testid="`appointment-mark-${getAppointmentId(day)}`"
              class="appointment-mark"
              aria-label="予約あり"
            />

            <!-- Event Dots -->
            <div
              v-if="day.events.length > 0"
              :id="`events-${day.date.toISOString().split('T')[0]}`"
              class="event-dots"
              role="group"
              :aria-label="`${day.date.toLocaleDateString('ja-JP')}のイベント`"
            >
              <div
                v-for="dot in getEventDots(day)"
                :key="dot.catId"
                class="event-dot"
                :class="{
                  'event-dot--visit': dot.hasVisit,
                  'event-dot--appointment': dot.hasAppointment,
                  'event-dot--blood-test': dot.hasBloodTest,
                }"
                :title="`${dot.catName}: ${dot.eventCount}件`"
                :aria-label="`${dot.catName}: ${dot.eventCount}件のイベント`"
              />
              <div
                v-if="day.events.length > 3"
                class="event-dot event-dot--more"
                :title="`他 ${day.events.length - 3}件`"
                :aria-label="`他 ${day.events.length - 3}件のイベント`"
              >
                +{{ day.events.length - 3 }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- データなしメッセージ（全体用） -->
    <div
      v-if="!loading && filteredVisits.length === 0 && filteredAppointments.length === 0"
      data-testid="no-data-message"
      class="no-data-message"
    >
      記録がありません
    </div>

    <!-- List View -->
    <div
      v-else-if="internalViewMode === 'list'"
      data-testid="list-view"
    >
      <!-- リスト表示の実装は既存のコードを使用 -->
      <div
        v-if="filteredVisits.length > 0 || filteredAppointments.length > 0"
        class="visit-list"
      >
        <!-- 通院記録のリスト表示 -->
        <div
          v-for="visit in filteredVisits"
          :key="visit.id"
          class="visit-item"
        >
          <div class="visit-date">
            {{ new Date(visit.visitDate).toLocaleDateString('ja-JP') }}
          </div>
          <div class="visit-details">
            <div class="visit-cat">
              {{ visit.cat.name }}
            </div>
            <div class="visit-hospital">
              {{ visit.hospital.name }}
            </div>
            <div
              v-if="visit.doctor"
              class="visit-doctor"
            >
              {{ visit.doctor.name }}
            </div>
            <div
              v-if="visit.hasBloodTest"
              class="blood-test-indicator"
            >
              🩸 血液検査実施
            </div>
          </div>
        </div>

        <!-- 予約のリスト表示 -->
        <div
          v-for="appointment in filteredAppointments"
          :key="appointment.id"
          class="appointment-item"
        >
          <div class="appointment-date">
            {{ new Date(appointment.appointmentDate).toLocaleDateString('ja-JP') }}
          </div>
          <div class="appointment-details">
            <div class="appointment-cat">
              {{ appointment.cat.name }}
            </div>
            <div class="appointment-hospital">
              {{ appointment.hospital.name }}
            </div>
            <div
              v-if="appointment.doctor"
              class="appointment-doctor"
            >
              {{ appointment.doctor.name }}
            </div>
            <div class="appointment-status">
              {{ appointment.status }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar Instructions -->
    <div class="calendar-instructions">
      <p class="instruction-text">
        <strong>操作方法:</strong>
        クリック: 詳細表示 | ダブルクリック: 通院記録追加 | 右クリック: 予約追加
      </p>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="showDetailModal"
      class="modal-overlay"
      @click.self="closeDetailModal"
    >
      <div
        class="detail-modal"
        data-testid="detail-modal"
      >
        <div class="modal-header">
          <h3 class="modal-title">
            {{ selectedDate?.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) }}の記録
          </h3>
          <button
            class="modal-close-btn"
            @click="closeDetailModal"
          >
            ×
          </button>
        </div>

        <div class="modal-content">
          <div
            v-if="selectedDateEvents.length === 0"
            class="empty-events"
          >
            <p>この日の記録はありません</p>
          </div>

          <div
            v-else
            class="events-list"
          >
            <div
              v-for="event in selectedDateEvents"
              :key="event.id"
              class="event-item"
              :class="{
                'event-item--visit': event.type === 'visit',
                'event-item--appointment': event.type === 'appointment',
              }"
              :data-testid="`${event.type}-item-${event.id}`"
            >
              <div class="event-header">
                <div class="event-type-badge">
                  {{ getEventTypeLabel(event) }}
                </div>
                <div class="event-time">
                  {{ formatEventTime(event) }}
                </div>
              </div>

              <div class="event-details">
                <div class="event-cat">
                  <strong>{{ event.catName }}</strong>
                </div>
                <div class="event-hospital">
                  {{ event.hospitalName }}
                  <span
                    v-if="event.doctorName"
                    class="event-doctor"
                  >
                    - {{ event.doctorName }}
                  </span>
                </div>

                <!-- 通院記録の場合の追加情報 -->
                <div
                  v-if="event.type === 'visit'"
                  class="visit-extras"
                >
                  <div
                    v-if="(event as CalendarVisitData).hasBloodTest"
                    class="blood-test-indicator"
                    data-testid="blood-test-indicator"
                  >
                    🩸 血液検査実施
                  </div>
                </div>

                <!-- メモ表示・編集 -->
                <div class="event-notes">
                  <div
                    v-if="editingEventId !== event.id"
                    class="notes-display"
                  >
                    <div
                      v-if="event.notes"
                      class="notes-content"
                    >
                      <strong>メモ:</strong>
                      <p>{{ event.notes }}</p>
                    </div>
                    <div
                      v-else
                      class="notes-empty"
                    >
                      メモなし
                    </div>
                    <button
                      class="edit-notes-btn"
                      @click="startEditingNotes(event)"
                    >
                      <svg
                        class="edit-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      編集
                    </button>
                  </div>

                  <div
                    v-else
                    class="notes-edit"
                  >
                    <textarea
                      v-model="editingNotes"
                      class="notes-textarea"
                      data-testid="notes-input"
                      placeholder="メモを入力してください"
                      rows="3"
                      @blur="saveNotes(event)"
                    />
                    <div class="notes-actions">
                      <button
                        class="btn btn--small btn--secondary"
                        @click="cancelEditingNotes"
                      >
                        キャンセル
                      </button>
                      <button
                        class="btn btn--small btn--primary"
                        @click="saveNotes(event)"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            class="btn btn--secondary"
            data-testid="close-modal-button"
            @click="closeDetailModal"
          >
            閉じる
          </button>
          <button
            class="btn btn--primary"
            data-testid="add-visit-button"
            @click="emit('visitCreate', selectedDate!); closeDetailModal()"
          >
            新規記録追加
          </button>
          <button
            class="btn btn--secondary"
            data-testid="add-appointment-button"
            @click="emit('appointmentCreate', selectedDate!); closeDetailModal()"
          >
            予約追加
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.veterinary-calendar {
  background: white;
}

/* Screen reader only text */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.calendar-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background-color: #f0f0f0;
  border-color: #4caf50;
}

.nav-btn svg {
  width: 1.25rem;
  height: 1.25rem;
  color: #666;
}

.calendar-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  min-width: 200px;
  text-align: center;
}

.today-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #4caf50;
  background: white;
  color: #4caf50;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.today-btn:hover {
  background-color: #4caf50;
  color: white;
}

.calendar-filters {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 120px;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.view-mode-toggle {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: white;
  color: #666;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border-right: 1px solid #ddd;
}

.toggle-btn:last-child {
  border-right: none;
}

.toggle-btn:hover {
  background-color: #f0f0f0;
}

.toggle-btn--active {
  background-color: #4caf50;
  color: white;
}

.toggle-btn--active:hover {
  background-color: #388e3c;
}

.toggle-icon {
  width: 1rem;
  height: 1rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.checkbox-input {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.checkbox-text {
  color: #333;
}

.calendar-legend {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 0.875rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.legend-dot--visit {
  background-color: #4caf50;
}

.legend-dot--appointment {
  background-color: #2196f3;
}

.legend-dot--blood-test {
  background-color: #f44336;
}

.calendar-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.calendar-grid {
  padding: 1rem;
}

.calendar-week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 1px;
}

.week-day-header {
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  color: #666;
  background-color: #f8f9fa;
  font-size: 0.875rem;
}

.week-day-header--weekend {
  color: #f44336;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background-color: #e0e0e0;
}

.calendar-day {
  position: relative;
  min-height: 6rem;
  padding: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.calendar-day:hover {
  background-color: #f5f5f5;
}

.calendar-day:focus {
  outline: 2px solid #4caf50;
  outline-offset: -2px;
}

.calendar-day--other-month {
  color: #ccc;
  background-color: #fafafa;
}

.calendar-day--today {
  background-color: #e8f5e8;
  font-weight: bold;
}

.calendar-day--selected {
  background-color: #4caf50;
  color: white;
}

.calendar-day--has-visits {
  border-left: 4px solid #4caf50;
}

.calendar-day--has-appointments {
  border-right: 4px solid #2196f3;
}

.calendar-day--has-blood-test {
  border-top: 4px solid #f44336;
}

.day-number {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

/* マーク要素のスタイル */
.visit-mark,
.blood-test-mark,
.appointment-mark {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.visit-mark {
  top: 4px;
  left: 4px;
  background-color: #4caf50;
}

.blood-test-mark {
  top: 4px;
  right: 4px;
  background-color: #f44336;
}

.appointment-mark {
  bottom: 4px;
  left: 4px;
  background-color: #2196f3;
}

/* データなしメッセージのスタイル */
.no-data-message {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

/* リスト表示のスタイル */
.visit-list {
  padding: 1rem;
}

.visit-item,
.appointment-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  align-items: center;
}

.visit-date,
.appointment-date {
  min-width: 120px;
  font-weight: 600;
  color: #333;
}

.visit-details,
.appointment-details {
  flex: 1;
}

.visit-cat,
.appointment-cat {
  font-weight: 600;
  color: #4caf50;
}

.visit-hospital,
.appointment-hospital {
  color: #666;
  margin-top: 0.25rem;
}

.visit-doctor,
.appointment-doctor {
  color: #888;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.appointment-status {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.25rem;
}

.blood-test-indicator {
  color: #f44336;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Mobile layout styles */
.veterinary-calendar.mobile-layout {
  font-size: 0.875rem;
}

.veterinary-calendar.mobile-layout .calendar-header {
  padding: 1rem;
  flex-direction: column;
  gap: 1rem;
}

.veterinary-calendar.mobile-layout .calendar-title {
  font-size: 1.25rem;
  min-width: auto;
}

.veterinary-calendar.mobile-layout .calendar-filters {
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.veterinary-calendar.mobile-layout .filter-group {
  min-width: auto;
}

.veterinary-calendar.mobile-layout .calendar-day {
  min-height: 4rem;
  padding: 0.25rem;
}

.veterinary-calendar.mobile-layout .day-number {
  font-size: 0.75rem;
}

.veterinary-calendar.mobile-layout .visit-mark,
.veterinary-calendar.mobile-layout .blood-test-mark,
.veterinary-calendar.mobile-layout .appointment-mark {
  width: 6px;
  height: 6px;
}

/* Tablet layout styles */
.veterinary-calendar.tablet-layout {
  font-size: 0.9rem;
}

.veterinary-calendar.tablet-layout .calendar-header {
  padding: 1.25rem;
}

.veterinary-calendar.tablet-layout .calendar-title {
  font-size: 1.375rem;
}

.veterinary-calendar.tablet-layout .calendar-filters {
  padding: 1.25rem;
  gap: 1.25rem;
}

.veterinary-calendar.tablet-layout .calendar-day {
  min-height: 5rem;
  padding: 0.375rem;
}

.veterinary-calendar.tablet-layout .day-number {
  font-size: 0.8125rem;
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .veterinary-calendar {
    max-width: 1200px;
    margin: 0 auto;
  }

  .calendar-header {
    padding: 2rem;
  }

  .calendar-title {
    font-size: 1.75rem;
  }

  .nav-btn {
    width: 3rem;
    height: 3rem;
  }

  .nav-btn svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .today-btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .calendar-filters {
    padding: 1.5rem 2rem;
    gap: 2rem;
  }

  .filter-group {
    min-width: 150px;
  }

  .filter-select {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }

  .calendar-grid {
    padding: 1.5rem;
  }

  .calendar-day {
    min-height: 7rem;
    padding: 0.75rem;
  }

  .day-number {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .event-dots {
    gap: 0.375rem;
  }

  .event-dot {
    width: 0.75rem;
    height: 0.75rem;
  }

  .calendar-instructions {
    padding: 1.5rem 2rem;
  }

  .instruction-text {
    font-size: 1rem;
  }

  /* Desktop detail modal */
  .detail-modal {
    max-width: 700px;
    max-height: 80vh;
  }

  .modal-header {
    padding: 2rem;
  }

  .modal-title {
    font-size: 1.5rem;
  }

  .modal-content {
    padding: 2rem;
  }

  .event-item {
    padding: 1.5rem;
    border-radius: 12px;
  }

  .event-header {
    margin-bottom: 1rem;
  }

  .event-type-badge {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .event-time {
    font-size: 1.1rem;
  }

  .event-details {
    gap: 1rem;
  }

  .event-cat {
    font-size: 1.2rem;
  }

  .event-hospital {
    font-size: 1.1rem;
  }

  .notes-textarea {
    padding: 1rem;
    font-size: 1rem;
    min-height: 120px;
  }

  .modal-footer {
    padding: 2rem;
    gap: 1rem;
  }

  .modal-footer .btn {
    padding: 0.75rem 2rem;
    font-size: 1rem;
  }
}

/* Large desktop optimizations */
@media (min-width: 1440px) {
  .veterinary-calendar {
    max-width: 1400px;
  }

  .calendar-header {
    padding: 2.5rem;
  }

  .calendar-title {
    font-size: 2rem;
  }

  .calendar-filters {
    padding: 2rem 2.5rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
  }

  .calendar-day {
    min-height: 8rem;
    padding: 1rem;
  }

  .day-number {
    font-size: 1.1rem;
  }

  .event-dots {
    flex-wrap: wrap;
    max-width: 100%;
  }

  .event-dot {
    width: 1rem;
    height: 1rem;
  }

  .detail-modal {
    max-width: 900px;
  }

  .modal-content {
    padding: 2.5rem;
  }

  .events-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .event-item {
    padding: 2rem;
  }
}

.calendar-day:hover {
  background-color: #f8f9fa;
}

.calendar-day--other-month {
  background-color: #fafafa;
  color: #ccc;
}

.calendar-day--other-month:hover {
  background-color: #f0f0f0;
}

.calendar-day--today {
  background-color: #e8f5e8;
}

.calendar-day--today .day-number {
  color: #2e7d32;
  font-weight: 700;
}

.calendar-day--selected {
  background-color: #c8e6c9;
  box-shadow: inset 0 0 0 2px #4caf50;
}

.calendar-day--has-visits {
  border-left: 3px solid #4caf50;
}

.calendar-day--has-appointments {
  border-right: 3px solid #2196f3;
}

.calendar-day--has-blood-test {
  border-top: 3px solid #f44336;
}

.day-number {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.event-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: auto;
}

.event-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: #ddd;
  position: relative;
}

.event-dot--visit {
  background-color: #4caf50;
}

.event-dot--appointment {
  background-color: #2196f3;
}

.event-dot--blood-test {
  background-color: #f44336;
  box-shadow: 0 0 0 1px white, 0 0 0 2px #f44336;
}

.event-dot--more {
  width: auto;
  height: auto;
  padding: 0.125rem 0.25rem;
  background-color: #666;
  color: white;
  font-size: 0.625rem;
  font-weight: 500;
  border-radius: 0.25rem;
  line-height: 1;
}

.calendar-instructions {
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-top: 1px solid #e0e0e0;
}

.instruction-text {
  margin: 0;
  font-size: 0.875rem;
  color: #666;
  text-align: center;
}

/* Detail Modal Styles */
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

.detail-modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  line-height: 1;
}

.modal-close-btn:hover {
  color: #333;
}

.modal-content {
  padding: 1.5rem;
}

.empty-events {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.event-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  background: #fafafa;
}

.event-item--visit {
  border-left: 4px solid #4caf50;
}

.event-item--appointment {
  border-left: 4px solid #2196f3;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.event-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.event-item--visit .event-type-badge {
  background-color: #4caf50;
}

.event-item--appointment .event-type-badge {
  background-color: #2196f3;
}

.event-time {
  font-weight: 500;
  color: #666;
}

.event-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-cat {
  color: #333;
}

.event-hospital {
  color: #666;
}

.event-doctor {
  color: #888;
}

.visit-extras {
  margin-top: 0.5rem;
}

.blood-test-indicator {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.event-notes {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.notes-display {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.notes-content {
  flex: 1;
}

.notes-content strong {
  color: #333;
}

.notes-content p {
  margin: 0.5rem 0 0 0;
  color: #666;
  line-height: 1.5;
}

.notes-empty {
  flex: 1;
  color: #999;
  font-style: italic;
}

.edit-notes-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-notes-btn:hover {
  background-color: #f0f0f0;
  border-color: #4caf50;
}

.edit-icon {
  width: 1rem;
  height: 1rem;
}

.notes-edit {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notes-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 4rem;
}

.notes-textarea:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.notes-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
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

.btn--small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

/* Tablet responsive */
@media (max-width: 1024px) {
  .calendar-header {
    padding: 1.25rem;
  }

  .calendar-title {
    font-size: 1.3rem;
    min-width: 180px;
  }

  .calendar-filters {
    padding: 1rem 1.25rem;
    gap: 1rem;
  }

  .filter-group {
    min-width: 100px;
  }

  .calendar-grid {
    padding: 0.75rem;
  }

  .calendar-day {
    min-height: 5rem;
    padding: 0.375rem;
  }

  .day-number {
    font-size: 0.8rem;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .veterinary-calendar {
    border-radius: 0;
    overflow: visible;
  }

  .calendar-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .calendar-navigation {
    justify-content: center;
    gap: 1.5rem;
    order: 1;
  }

  .nav-btn {
    width: 3rem;
    height: 3rem;
    border-radius: 8px;
  }

  .nav-btn svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .calendar-title {
    font-size: 1.25rem;
    min-width: auto;
    text-align: center;
  }

  .today-btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 8px;
    align-self: center;
    min-width: 120px;
    order: 2;
  }

  /* Mobile-optimized filters */
  .calendar-filters {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .filter-group {
    min-width: auto;
    width: 100%;
  }

  .filter-label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .filter-select {
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .view-mode-toggle {
    border-radius: 8px;
    width: 100%;
  }

  .toggle-btn {
    padding: 0.875rem 1rem;
    font-size: 1rem;
    min-height: 48px;
    flex: 1;
    justify-content: center;
  }

  .toggle-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .checkbox-label {
    padding: 0.875rem 1rem;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    min-height: 48px;
  }

  .checkbox-input {
    width: 1.25rem;
    height: 1.25rem;
  }

  .checkbox-text {
    font-size: 1rem;
  }

  /* Mobile calendar legend */
  .calendar-legend {
    padding: 1rem;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }

  .legend-item {
    font-size: 1rem;
    gap: 0.75rem;
  }

  .legend-dot {
    width: 1rem;
    height: 1rem;
  }

  /* Mobile calendar grid */
  .calendar-grid {
    padding: 0.5rem;
  }

  .calendar-week-header {
    gap: 2px;
    margin-bottom: 2px;
  }

  .week-day-header {
    padding: 0.75rem 0.25rem;
    font-size: 1rem;
    font-weight: 700;
  }

  .calendar-days {
    gap: 2px;
    background-color: #e0e0e0;
  }

  .calendar-day {
    min-height: 4rem;
    padding: 0.5rem 0.25rem;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
  }

  .calendar-day:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }

  .day-number {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    text-align: center;
  }

  .event-dots {
    justify-content: center;
    gap: 0.25rem;
    margin-top: auto;
  }

  .event-dot {
    width: 0.75rem;
    height: 0.75rem;
  }

  .event-dot--more {
    padding: 0.25rem 0.375rem;
    font-size: 0.7rem;
    border-radius: 0.375rem;
  }

  /* Mobile instructions */
  .calendar-instructions {
    padding: 1rem;
  }

  .instruction-text {
    font-size: 1rem;
    line-height: 1.5;
  }

  /* Mobile detail modal */
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .detail-modal {
    width: 100%;
    max-height: 80vh;
    border-radius: 16px 16px 0 0;
    margin: 0;
  }

  .modal-header {
    padding: 1.25rem 1rem;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    border-bottom: 2px solid #e0e0e0;
  }

  .modal-title {
    font-size: 1.1rem;
  }

  .modal-close-btn {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.75rem;
    border-radius: 8px;
  }

  .modal-content {
    padding: 1rem;
    max-height: calc(80vh - 120px);
    overflow-y: auto;
  }

  .events-list {
    gap: 1rem;
  }

  .event-item {
    padding: 1rem;
    border-radius: 12px;
    border: 2px solid #e0e0e0;
  }

  .event-header {
    margin-bottom: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .event-type-badge {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    border-radius: 8px;
  }

  .event-time {
    font-size: 1rem;
    font-weight: 600;
  }

  .event-details {
    gap: 0.75rem;
  }

  .event-cat {
    font-size: 1.1rem;
  }

  .event-hospital {
    font-size: 1rem;
  }

  .notes-textarea {
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 120px;
  }

  .notes-actions {
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .btn--small {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
    min-height: 44px;
  }

  .edit-notes-btn {
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 44px;
  }

  .notes-display {
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-footer {
    padding: 1rem;
    gap: 0.75rem;
    position: sticky;
    bottom: 0;
    background: white;
    border-top: 2px solid #e0e0e0;
    flex-direction: column;
  }

  .modal-footer .btn {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    min-height: 48px;
    border-radius: 8px;
  }
}

/* Small mobile responsive */
@media (max-width: 480px) {
  .calendar-header {
    padding: 0.75rem;
  }

  .calendar-navigation {
    gap: 1rem;
  }

  .nav-btn {
    width: 2.5rem;
    height: 2.5rem;
  }

  .nav-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .calendar-title {
    font-size: 1.1rem;
  }

  .today-btn {
    padding: 0.625rem 1.25rem;
    font-size: 0.9rem;
    min-width: 100px;
  }

  .calendar-filters {
    padding: 0.75rem;
  }

  .filter-label {
    font-size: 0.9rem;
  }

  .filter-select,
  .toggle-btn {
    padding: 0.75rem 0.875rem;
    font-size: 0.9rem;
  }

  .calendar-legend {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .legend-item {
    font-size: 0.9rem;
  }

  .week-day-header {
    padding: 0.625rem 0.125rem;
    font-size: 0.9rem;
  }

  .calendar-day {
    min-height: 3.5rem;
    padding: 0.375rem 0.125rem;
  }

  .day-number {
    font-size: 0.9rem;
  }

  .event-dot {
    width: 0.625rem;
    height: 0.625rem;
  }

  .instruction-text {
    font-size: 0.9rem;
  }

  .detail-modal {
    max-height: 90vh;
  }

  .modal-header {
    padding: 1rem 0.75rem;
  }

  .modal-title {
    font-size: 1rem;
  }

  .modal-content {
    padding: 0.75rem;
  }

  .event-item {
    padding: 0.75rem;
  }

  .event-type-badge {
    padding: 0.375rem 0.625rem;
    font-size: 0.8rem;
  }

  .event-time {
    font-size: 0.9rem;
  }

  .event-cat {
    font-size: 1rem;
  }

  .event-hospital {
    font-size: 0.9rem;
  }

  .modal-footer {
    padding: 0.75rem;
  }

  .modal-footer .btn {
    padding: 0.875rem;
    font-size: 0.9rem;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .nav-btn,
  .today-btn,
  .filter-select,
  .toggle-btn,
  .checkbox-label,
  .calendar-day,
  .modal-close-btn,
  .edit-notes-btn,
  .btn {
    min-height: 44px;
  }

  .calendar-day {
    cursor: pointer;
  }

  .calendar-day:hover {
    background-color: #f8f9fa;
  }

  .calendar-day:active {
    background-color: #e9ecef;
    transform: scale(0.98);
  }

  .nav-btn:active,
  .today-btn:active,
  .toggle-btn:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }

  /* Improve touch targets for small elements */
  .event-dot {
    min-width: 12px;
    min-height: 12px;
  }
}

/* Landscape mobile optimization */
@media (max-width: 768px) and (orientation: landscape) {
  .modal-overlay {
    align-items: center;
    padding: 1rem;
  }

  .detail-modal {
    max-height: 85vh;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
  }

  .calendar-header {
    flex-direction: row;
    align-items: center;
  }

  .calendar-filters {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .filter-group {
    flex: 1;
    min-width: 150px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .veterinary-calendar,
  .detail-modal {
    border: 3px solid #000;
  }

  .calendar-day {
    border: 1px solid #000;
  }

  .calendar-day--selected {
    background: #000;
    color: #fff;
  }

  .calendar-day--today {
    background: #fff;
    border: 3px solid #000;
  }

  .nav-btn,
  .today-btn,
  .filter-select,
  .toggle-btn {
    border: 2px solid #000;
  }

  .toggle-btn--active {
    background: #000;
    color: #fff;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .calendar-day:active,
  .nav-btn:active,
  .today-btn:active,
  .toggle-btn:active {
    transform: none;
  }

  .loading-spinner {
    animation: none;
  }

  * {
    transition: none !important;
  }
}
</style>
