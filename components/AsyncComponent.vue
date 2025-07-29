<template>
  <div class="lazy-component">
    <!-- Loading state while component is being loaded -->
    <div
      v-if="isLoading"
      class="lazy-loading"
    >
      <LoadingStates
        :type="loadingType"
        :count="loadingCount"
      />
    </div>

    <!-- Error state if component fails to load -->
    <div
      v-else-if="hasError"
      class="lazy-error"
    >
      <div class="error-content">
        <div class="error-icon">
          ⚠️
        </div>
        <h3 class="error-title">
          コンポーネントの読み込みに失敗しました
        </h3>
        <p class="error-message">
          ネットワーク接続を確認して、再試行してください。
        </p>
        <button
          type="button"
          class="retry-button"
          @click="retryLoad"
        >
          再試行
        </button>
      </div>
    </div>

    <!-- Loaded component -->
    <component
      :is="loadedComponent"
      v-else-if="loadedComponent"
      v-bind="componentProps"
      v-on="componentEvents"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  componentName: string;
  componentProps?: Record<string, any>;
  componentEvents?: Record<string, Function>;
  loadingType?:
    | 'card'
    | 'list'
    | 'grid'
    | 'chart'
    | 'table'
    | 'form'
    | 'default';
  loadingCount?: number;
  retryDelay?: number;
  maxRetries?: number;
}

const props = withDefaults(defineProps<Props>(), {
  componentProps: () => ({}),
  componentEvents: () => ({}),
  loadingType: 'default',
  loadingCount: 3,
  retryDelay: 1000,
  maxRetries: 3,
});

// State
const isLoading = ref(true);
const hasError = ref(false);
const loadedComponent = ref<any>(null);
const retryCount = ref(0);

// Component loading map for lazy loading
const componentMap: Record<string, () => Promise<any>> = {
  MealChart: () => import('~/components/MealChart.vue'),
  MealRecordList: () => import('~/components/MealRecordList.vue'),
  MealRecordForm: () => import('~/components/MealRecordForm.vue'),
  CatList: () => import('~/components/CatList.vue'),
  CatManagementForm: () => import('~/components/CatManagementForm.vue'),
  FoodList: () => import('~/components/FoodList.vue'),
  FoodManagementForm: () => import('~/components/FoodManagementForm.vue'),
  FoodSelector: () => import('~/components/FoodSelector.vue'),
  DateTimePicker: () => import('~/components/DateTimePicker.vue'),
  ConfirmationDialog: () => import('~/components/ConfirmationDialog.vue'),
  SyncStatus: () => import('~/components/SyncStatus.vue'),
  VirtualScroll: () => import('~/components/VirtualScroll.vue'),
  LoadingStates: () => import('~/components/LoadingStates.vue'),
};

// Methods
const loadComponent = async () => {
  try {
    isLoading.value = true;
    hasError.value = false;

    const componentLoader = componentMap[props.componentName];
    if (!componentLoader) {
      throw new Error(`Component "${props.componentName}" not found`);
    }

    // Add artificial delay for better UX (prevents flash)
    const [component] = await Promise.all([
      componentLoader(),
      new Promise(resolve => setTimeout(resolve, 100)),
    ]);

    loadedComponent.value = component.default || component;
    retryCount.value = 0;
  }
  catch (error) {
    console.error(`Failed to load component "${props.componentName}":`, error);
    hasError.value = true;
  }
  finally {
    isLoading.value = false;
  }
};

const retryLoad = async () => {
  if (retryCount.value >= props.maxRetries) {
    return;
  }

  retryCount.value++;

  // Add exponential backoff
  const delay = props.retryDelay * Math.pow(2, retryCount.value - 1);
  await new Promise(resolve => setTimeout(resolve, delay));

  await loadComponent();
};

// Lifecycle
onMounted(() => {
  loadComponent();
});

// Watch for component name changes
watch(
  () => props.componentName,
  () => {
    loadedComponent.value = null;
    retryCount.value = 0;
    loadComponent();
  },
);
</script>

<style scoped>
.lazy-component {
  width: 100%;
  min-height: 200px;
}

.lazy-loading {
  width: 100%;
}

.lazy-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.error-message {
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: #45a049;
  transform: translateY(-1px);
}

.retry-button:active {
  transform: translateY(0);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .lazy-error {
    padding: 1rem;
    min-height: 150px;
  }

  .error-icon {
    font-size: 2rem;
  }

  .error-title {
    font-size: 1.1rem;
  }

  .error-message {
    font-size: 0.8rem;
  }

  .retry-button {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .retry-button {
    background: #000;
    border: 2px solid #000;
  }

  .retry-button:hover {
    background: #333;
    border-color: #333;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .retry-button:hover {
    transform: none;
  }

  .retry-button:active {
    transform: none;
  }
}
</style>
