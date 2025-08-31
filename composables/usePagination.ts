/**
 * ページネーション機能を提供するコンポーザブル
 * 大量データ対応とパフォーマンス最適化
 */

import type { PaginationInfo } from '~/types/veterinary-master';

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  maxLimit?: number;
  minLimit?: number;
}

export interface UsePaginationReturn {
  // 現在の状態
  currentPage: Ref<number>;
  itemsPerPage: Ref<number>;
  totalItems: Ref<number>;
  totalPages: Readonly<Ref<number>>;

  // ページネーション情報
  paginationInfo: Readonly<Ref<PaginationInfo | null>>;

  // ナビゲーション状態
  hasNextPage: Readonly<Ref<boolean>>;
  hasPrevPage: Readonly<Ref<boolean>>;

  // 表示用の情報
  startItem: Readonly<Ref<number>>;
  endItem: Readonly<Ref<number>>;
  visiblePages: Readonly<Ref<number[]>>;

  // アクション
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setItemsPerPage: (limit: number) => void;
  updatePagination: (info: PaginationInfo) => void;
  reset: () => void;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialLimit = 20,
    maxLimit = 100,
    minLimit = 5,
  } = options;

  // リアクティブな状態
  const currentPage = ref(initialPage);
  const itemsPerPage = ref(Math.min(maxLimit, Math.max(minLimit, initialLimit)));
  const totalItems = ref(0);
  const paginationInfo = ref<PaginationInfo | null>(null);

  // 計算プロパティ
  const totalPages = computed(() => {
    return Math.ceil(totalItems.value / itemsPerPage.value);
  });

  const hasNextPage = computed(() => {
    return currentPage.value < totalPages.value;
  });

  const hasPrevPage = computed(() => {
    return currentPage.value > 1;
  });

  const startItem = computed(() => {
    if (totalItems.value === 0) return 0;
    return (currentPage.value - 1) * itemsPerPage.value + 1;
  });

  const endItem = computed(() => {
    const end = currentPage.value * itemsPerPage.value;
    return Math.min(end, totalItems.value);
  });

  const visiblePages = computed(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    const total = totalPages.value;

    if (total <= maxVisible) {
      // 総ページ数が表示可能数以下の場合、全て表示
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    }
    else {
      // 現在のページを中心に表示
      let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
      const end = Math.min(total, start + maxVisible - 1);

      // 終端に合わせて開始位置を調整
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  });

  // アクション
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  const nextPage = () => {
    if (hasNextPage.value) {
      currentPage.value++;
    }
  };

  const prevPage = () => {
    if (hasPrevPage.value) {
      currentPage.value--;
    }
  };

  const setItemsPerPage = (limit: number) => {
    const newLimit = Math.min(maxLimit, Math.max(minLimit, limit));
    if (newLimit !== itemsPerPage.value) {
      itemsPerPage.value = newLimit;
      // ページ数が変わる可能性があるので、現在のページを調整
      const newTotalPages = Math.ceil(totalItems.value / newLimit);
      if (currentPage.value > newTotalPages) {
        currentPage.value = Math.max(1, newTotalPages);
      }
    }
  };

  const updatePagination = (info: PaginationInfo) => {
    paginationInfo.value = info;
    totalItems.value = info.total;
    currentPage.value = info.page;
    itemsPerPage.value = info.limit;
  };

  const reset = () => {
    currentPage.value = initialPage;
    itemsPerPage.value = initialLimit;
    totalItems.value = 0;
    paginationInfo.value = null;
  };

  return {
    // 状態
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    paginationInfo: readonly(paginationInfo),

    // ナビゲーション状態
    hasNextPage,
    hasPrevPage,

    // 表示情報
    startItem,
    endItem,
    visiblePages,

    // アクション
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPage,
    updatePagination,
    reset,
  };
}

/**
 * 無限スクロール用のページネーション
 */
export interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  onLoadMore?: () => void | Promise<void>;
}

export interface UseInfiniteScrollReturn {
  targetRef: Ref<HTMLElement | null>;
  isLoading: Readonly<Ref<boolean>>;
  hasMore: Ref<boolean>;
  loadMore: () => Promise<void>;
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    onLoadMore,
  } = options;

  const targetRef = ref<HTMLElement | null>(null);
  const isLoading = ref(false);
  const hasMore = ref(true);

  const loadMore = async () => {
    if (isLoading.value || !hasMore.value) return;

    isLoading.value = true;
    try {
      if (onLoadMore) {
        await onLoadMore();
      }
    }
    finally {
      isLoading.value = false;
    }
  };

  // Intersection Observer を使用して無限スクロールを実装
  onMounted(() => {
    if (!import.meta.client) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore.value && !isLoading.value) {
          loadMore();
        }
      },
      {
        threshold,
        rootMargin,
      },
    );

    watch(targetRef, (newTarget, oldTarget) => {
      if (oldTarget) {
        observer.unobserve(oldTarget);
      }
      if (newTarget) {
        observer.observe(newTarget);
      }
    }, { immediate: true });

    onUnmounted(() => {
      observer.disconnect();
    });
  });

  return {
    targetRef,
    isLoading: readonly(isLoading),
    hasMore,
    loadMore,
  };
}

/**
 * 仮想スクロール用のヘルパー
 * 大量データの表示パフォーマンスを最適化
 */
export interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface UseVirtualScrollReturn {
  visibleStartIndex: Readonly<Ref<number>>;
  visibleEndIndex: Readonly<Ref<number>>;
  visibleItems: Readonly<Ref<number[]>>;
  totalHeight: Readonly<Ref<number>>;
  offsetY: Readonly<Ref<number>>;
  updateScrollTop: (scrollTop: number) => void;
}

export function useVirtualScroll<T>(
  items: Ref<T[]>,
  options: UseVirtualScrollOptions,
): UseVirtualScrollReturn {
  const { itemHeight, containerHeight, overscan = 5 } = options;

  const scrollTop = ref(0);

  const visibleStartIndex = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan);
  });

  const visibleEndIndex = computed(() => {
    const endIndex = Math.min(
      items.value.length - 1,
      Math.ceil((scrollTop.value + containerHeight) / itemHeight) + overscan,
    );
    return Math.max(visibleStartIndex.value, endIndex);
  });

  const visibleItems = computed(() => {
    const result: number[] = [];
    for (let i = visibleStartIndex.value; i <= visibleEndIndex.value; i++) {
      result.push(i);
    }
    return result;
  });

  const totalHeight = computed(() => {
    return items.value.length * itemHeight;
  });

  const offsetY = computed(() => {
    return visibleStartIndex.value * itemHeight;
  });

  const updateScrollTop = (newScrollTop: number) => {
    scrollTop.value = newScrollTop;
  };

  return {
    visibleStartIndex,
    visibleEndIndex,
    visibleItems,
    totalHeight,
    offsetY,
    updateScrollTop,
  };
}
