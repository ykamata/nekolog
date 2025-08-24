import { beforeAll, afterAll, vi } from 'vitest';
import { ref, reactive, computed, watch, watchEffect, nextTick, onMounted, onUnmounted, defineProps, defineEmits, readonly } from 'vue';

// Mock Vue's auto-imports for testing
(global as any).ref = ref;
(global as any).reactive = reactive;
(global as any).computed = computed;
(global as any).watch = watch;
(global as any).watchEffect = watchEffect;
(global as any).nextTick = nextTick;
(global as any).onMounted = onMounted;
(global as any).onUnmounted = onUnmounted;
(global as any).defineProps = defineProps;
(global as any).defineEmits = defineEmits;
(global as any).readonly = readonly;

// Mock useResponsive composable globally
(global as any).useResponsive = vi.fn(() => {
  // 画面サイズを動的に判定する関数
  const getScreenSize = (): 'mobile' | 'tablet' | 'desktop' => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 768) {
        return 'mobile';
      }
      else if (width < 1024) {
        return 'tablet';
      }
      else {
        return 'desktop';
      }
    }
    return 'desktop';
  };

  const screenSize = (global as any).ref(getScreenSize());

  const updateScreenSize = () => {
    screenSize.value = getScreenSize();
  };

  // 初期化時に画面サイズを設定
  updateScreenSize();

  const getResponsiveClasses = (baseClasses: string | string[]) => {
    const classes = Array.isArray(baseClasses) ? baseClasses : [baseClasses];
    const responsiveClasses: string[] = [];

    if (screenSize.value === 'mobile') {
      responsiveClasses.push('mobile-layout');
    }
    else if (screenSize.value === 'tablet') {
      responsiveClasses.push('tablet-layout');
    }

    return [
      ...classes,
      ...responsiveClasses,
    ];
  };

  return {
    screenSize: (global as any).readonly(screenSize),
    updateScreenSize,
    getResponsiveClasses,
  };
});

// Mock Nuxt's auto-imports
(global as any).$fetch = vi.fn();

// Mock NuxtLink
const NuxtLink = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};
(global as any).NuxtLink = NuxtLink;

// Mock useVeterinaryMasters composable
vi.mock('~/composables/useVeterinaryMasters', () => ({
  useVeterinaryMasters: vi.fn(() => ({
    hospitals: (global as any).ref([
      { id: '1', name: 'テスト動物病院1' },
      { id: '2', name: 'テスト動物病院2' },
    ]),
    doctors: (global as any).ref([
      { id: '1', name: 'テスト先生1' },
      { id: '2', name: 'テスト先生2' },
    ]),
    treatments: (global as any).ref([
      { id: '1', name: '健康診断' },
      { id: '2', name: 'ワクチン接種' },
      { id: '3', name: '血液検査' },
    ]),
    createHospital: vi.fn().mockResolvedValue({ id: '3', name: '新しい病院' }),
    createDoctor: vi.fn().mockResolvedValue({ id: '3', name: '新しい先生' }),
    createTreatment: vi.fn().mockResolvedValue({ id: '4', name: '新しい処方' }),
    fetchHospitals: vi.fn().mockResolvedValue([
      { id: '1', name: 'テスト動物病院1' },
      { id: '2', name: 'テスト動物病院2' },
    ]),
    fetchDoctors: vi.fn().mockResolvedValue([
      { id: '1', name: 'テスト先生1' },
      { id: '2', name: 'テスト先生2' },
    ]),
    fetchTreatments: vi.fn().mockResolvedValue([
      { id: '1', name: '健康診断' },
      { id: '2', name: 'ワクチン接種' },
      { id: '3', name: '血液検査' },
    ]),
  })),
}));

// Mock other commonly used composables
vi.mock('~/composables/useVeterinaryVisits', () => ({
  useVeterinaryVisits: vi.fn(() => ({
    visits: (global as any).ref([]),
    loading: (global as any).ref(false),
    error: (global as any).ref(null),
    fetchVisits: vi.fn().mockResolvedValue([]),
    createVisit: vi.fn().mockResolvedValue({}),
    updateVisit: vi.fn().mockResolvedValue({}),
    deleteVisit: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('~/composables/useVeterinaryAppointments', () => ({
  useVeterinaryAppointments: vi.fn(() => ({
    appointments: (global as any).ref([]),
    loading: (global as any).ref(false),
    error: (global as any).ref(null),
    fetchAppointments: vi.fn().mockResolvedValue([]),
    createAppointment: vi.fn().mockResolvedValue({}),
    updateAppointment: vi.fn().mockResolvedValue({}),
    deleteAppointment: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('~/composables/useSync', () => ({
  useSync: vi.fn(() => ({
    syncStatus: (global as any).ref('idle'),
    lastSyncTime: (global as any).ref(null),
    conflicts: (global as any).ref([]),
    sync: vi.fn().mockResolvedValue({}),
    resolveConflict: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('~/composables/useToast', () => ({
  useToast: vi.fn(() => ({
    toasts: (global as any).ref([]),
    showToast: vi.fn(),
    hideToast: vi.fn(),
    clearToasts: vi.fn(),
  })),
}));

vi.mock('~/composables/useResponsive', () => ({
  useResponsive: vi.fn(() => ({
    screenSize: (global as any).ref('desktop'),
    updateScreenSize: vi.fn(),
    getResponsiveClasses: vi.fn((baseClasses) => {
      const classes = Array.isArray(baseClasses) ? baseClasses : [baseClasses];
      return [
        ...classes,
        {
          'mobile-layout': false,
          'tablet-layout': false,
        },
      ];
    }),
  })),
}));

// Mock Chart.js
vi.mock('chart.js', () => {
  const mockChart = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    data: {},
    options: {},
  }));

  // Chart.registerを静的メソッドとして追加
  mockChart.register = vi.fn();

  return {
    Chart: mockChart,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    BarElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
  };
});

// Mock vue-chartjs
vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<canvas></canvas>',
  },
  Bar: {
    name: 'Bar',
    props: ['data', 'options'],
    template: '<canvas></canvas>',
  },
}));

// Mock useAnalyticsStore
vi.mock('~/stores/analytics', () => ({
  useAnalyticsStore: vi.fn(() => ({
    analytics: (global as any).ref({
      dailyCalories: [],
      weeklyAverage: 0,
      foodTypeBreakdown: [],
      totalMeals: 0,
      averageCaloriesPerMeal: 0,
    }),
    loading: (global as any).ref(false),
    error: (global as any).ref(null),
    errorInfo: (global as any).ref(null),
    errorMessage: (global as any).ref(''),
    retryCount: (global as any).ref(0),
    canRetry: (global as any).ref(true),
    hasData: (global as any).ref(false),
    hasDataQualityIssues: (global as any).ref(false),
    dataQualityScore: (global as any).ref(100),
    dataQualityLevel: (global as any).ref('good'),
    anomaliesInfo: (global as any).ref(null),
    qualityRecommendations: (global as any).ref([]),
    currentChartMode: (global as any).ref('line'),
    isLineChartMode: (global as any).computed(() => true),
    isBarChartMode: (global as any).computed(() => false),
    selectedFoodType: (global as any).ref(null),
    fetchAnalytics: vi.fn().mockResolvedValue({}),
    retryLastOperation: vi.fn().mockResolvedValue({}),
    setChartDisplayMode: vi.fn(),
    toggleChartDisplayMode: vi.fn(),
    setSelectedFoodType: vi.fn(),
    restoreDisplaySettings: vi.fn(),
  })),
}));

// Mock useMedicationsStore
vi.mock('~/stores/medications', () => ({
  useMedicationsStore: vi.fn(() => ({
    medications: (global as any).ref([]),
    records: (global as any).ref([]),
    reminders: (global as any).ref([]),
    loading: (global as any).ref(false),
    error: (global as unknown).ref(null),
    fetchMedications: vi.fn().mockResolvedValue([]),
    fetchRecords: vi.fn().mockResolvedValue([]),
    fetchReminders: vi.fn().mockResolvedValue([]),
    createMedication: vi.fn().mockResolvedValue({}),
    updateMedication: vi.fn().mockResolvedValue({}),
    deleteMedication: vi.fn().mockResolvedValue({}),
    createRecord: vi.fn().mockResolvedValue({}),
    updateRecord: vi.fn().mockResolvedValue({}),
    deleteRecord: vi.fn().mockResolvedValue({}),
  })),
}));

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';

  // Mock window.innerWidth for responsive tests
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation((_callback: IntersectionObserverCallback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

afterAll(async () => {
  // Cleanup after tests
});
