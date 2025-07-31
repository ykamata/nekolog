<template>
  <div
    ref="containerRef"
    class="virtual-scroll-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <!-- Spacer for items before visible range -->
    <div
      v-if="startIndex > 0"
      :style="{ height: startIndex * itemHeight + 'px' }"
    />

    <!-- Visible items -->
    <div
      v-for="(item, index) in visibleItems"
      :key="getItemKey(item as Record<string, unknown>, startIndex + index)"
      :style="{ height: itemHeight + 'px' }"
      class="virtual-scroll-item"
    >
      <slot
        :item="item"
        :index="startIndex + index"
      />
    </div>

    <!-- Spacer for items after visible range -->
    <div
      v-if="endIndex < items.length"
      :style="{ height: (items.length - endIndex) * itemHeight + 'px' }"
    />

    <!-- Loading indicator for infinite scroll -->
    <div
      v-if="hasMore && isLoadingMore"
      class="virtual-scroll-loading"
      :style="{ height: itemHeight + 'px' }"
    >
      <div class="loading-spinner" />
      <span>読み込み中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  items: unknown[];
  itemHeight: number;
  containerHeight: number;
  buffer?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  keyField?: string;
}

interface Emits {
  (e: 'load-more'): void;
  (e: 'scroll', scrollTop: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 5,
  hasMore: false,
  isLoadingMore: false,
  keyField: 'id',
});

const emit = defineEmits<Emits>();

// Refs
const containerRef = ref<HTMLElement>();

// State
const scrollTop = ref(0);
const isScrolling = ref(false);
const scrollTimeout = ref<NodeJS.Timeout>();

// Computed properties
const visibleCount = computed(() => {
  return Math.ceil(props.containerHeight / props.itemHeight);
});

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight) - props.buffer;
  return Math.max(0, index);
});

const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value + props.buffer * 2;
  return Math.min(props.items.length, index);
});

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value);
});

// Methods
const getItemKey = (
  item: Record<string, unknown>,
  index: number,
): string | number => {
  if (props.keyField && item[props.keyField]) {
    return item[props.keyField] as string | number;
  }
  return index;
};

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;

  // Emit scroll event
  emit('scroll', scrollTop.value);

  // Set scrolling state
  isScrolling.value = true;
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value);
  }
  scrollTimeout.value = setTimeout(() => {
    isScrolling.value = false;
  }, 150);

  // Check if we need to load more items
  if (props.hasMore && !props.isLoadingMore) {
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const scrollPosition = scrollTop.value + clientHeight;

    // Load more when we're within 200px of the bottom
    if (scrollHeight - scrollPosition < 200) {
      emit('load-more');
    }
  }
};

const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
  if (!containerRef.value) return;

  const targetScrollTop = index * props.itemHeight;
  containerRef.value.scrollTo({
    top: targetScrollTop,
    behavior,
  });
};

const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(0, behavior);
};

const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  if (!containerRef.value) return;

  containerRef.value.scrollTo({
    top: containerRef.value.scrollHeight,
    behavior,
  });
};

// Expose methods
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
});

// Cleanup
onUnmounted(() => {
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value);
  }
});
</script>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.virtual-scroll-item {
  display: flex;
  align-items: center;
  width: 100%;
}

.virtual-scroll-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Custom scrollbar */
.virtual-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Firefox scrollbar */
.virtual-scroll-container {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .virtual-scroll-container::-webkit-scrollbar {
    width: 4px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .virtual-scroll-container::-webkit-scrollbar-thumb {
    background: #000;
  }

  .loading-spinner {
    border-color: #000;
    border-top-color: transparent;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }
}
</style>
