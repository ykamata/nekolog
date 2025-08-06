import { beforeAll, afterAll, vi } from 'vitest';
import { ref, reactive, computed, watch, watchEffect, nextTick, onMounted, onUnmounted, defineProps, defineEmits, readonly } from 'vue';

// Mock Vue's auto-imports for testing
global.ref = ref;
global.reactive = reactive;
global.computed = computed;
global.watch = watch;
global.watchEffect = watchEffect;
global.nextTick = nextTick;
global.onMounted = onMounted;
global.onUnmounted = onUnmounted;
global.defineProps = defineProps;
global.defineEmits = defineEmits;
global.readonly = readonly;

// Mock useResponsive composable globally
global.useResponsive = vi.fn(() => {
  // 画面サイズを動的に判定する関数
  const getScreenSize = () => {
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

  const screenSize = global.ref(getScreenSize());

  const updateScreenSize = () => {
    screenSize.value = getScreenSize();
  };

  // 初期化時に画面サイズを設定
  updateScreenSize();

  const getResponsiveClasses = (baseClasses) => {
    const classes = Array.isArray(baseClasses) ? baseClasses : [baseClasses];
    return [
      ...classes,
      {
        'mobile-layout': screenSize.value === 'mobile',
        'tablet-layout': screenSize.value === 'tablet',
      },
    ];
  };

  return {
    screenSize: global.readonly(screenSize),
    updateScreenSize,
    getResponsiveClasses,
  };
});

// Mock Nuxt's auto-imports
global.$fetch = vi.fn();

// Mock useVeterinaryMasters composable
vi.mock('~/composables/useVeterinaryMasters', () => ({
  useVeterinaryMasters: vi.fn(() => ({
    hospitals: global.ref([
      { id: '1', name: 'テスト動物病院1' },
      { id: '2', name: 'テスト動物病院2' },
    ]),
    doctors: global.ref([
      { id: '1', name: 'テスト先生1' },
      { id: '2', name: 'テスト先生2' },
    ]),
    treatments: global.ref([
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
    visits: global.ref([]),
    loading: global.ref(false),
    error: global.ref(null),
    fetchVisits: vi.fn().mockResolvedValue([]),
    createVisit: vi.fn().mockResolvedValue({}),
    updateVisit: vi.fn().mockResolvedValue({}),
    deleteVisit: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('~/composables/useVeterinaryAppointments', () => ({
  useVeterinaryAppointments: vi.fn(() => ({
    appointments: global.ref([]),
    loading: global.ref(false),
    error: global.ref(null),
    fetchAppointments: vi.fn().mockResolvedValue([]),
    createAppointment: vi.fn().mockResolvedValue({}),
    updateAppointment: vi.fn().mockResolvedValue({}),
    deleteAppointment: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('~/composables/useSync', () => ({
  useSync: vi.fn(() => ({
    syncStatus: global.ref('idle'),
    lastSyncTime: global.ref(null),
    conflicts: global.ref([]),
    sync: vi.fn().mockResolvedValue({}),
    resolveConflict: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('~/composables/useToast', () => ({
  useToast: vi.fn(() => ({
    toasts: global.ref([]),
    showToast: vi.fn(),
    hideToast: vi.fn(),
    clearToasts: vi.fn(),
  })),
}));

vi.mock('~/composables/useResponsive', () => ({
  useResponsive: vi.fn(() => ({
    screenSize: global.ref('desktop'),
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

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup after tests
});
