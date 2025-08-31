/**
 * デバウンス機能を提供するコンポーザブル
 * 検索機能のパフォーマンス最適化に使用
 */

export interface UseDebounceOptions {
  delay?: number;
  immediate?: boolean;
}

export interface UseDebounceReturn<T extends (...args: any[]) => any> {
  debouncedFn: T;
  cancel: () => void;
  flush: () => void;
  pending: Readonly<Ref<boolean>>;
}

/**
 * 関数をデバウンスする
 * @param fn デバウンスする関数
 * @param delay デバウンス遅延時間（ミリ秒）
 * @param options オプション
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300,
  options: UseDebounceOptions = {},
): UseDebounceReturn<T> {
  const { immediate = false } = options;

  let timeoutId: NodeJS.Timeout | null = null;
  const pending = ref(false);

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      pending.value = false;
    }
  };

  const flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      pending.value = false;
    }
  };

  const debouncedFn = ((...args: Parameters<T>) => {
    cancel();

    if (immediate && !pending.value) {
      fn(...args);
      pending.value = true;
      return;
    }

    pending.value = true;
    timeoutId = setTimeout(() => {
      fn(...args);
      pending.value = false;
      timeoutId = null;
    }, delay);
  }) as T;

  // コンポーネントがアンマウントされた時にクリーンアップ
  onUnmounted(() => {
    cancel();
  });

  return {
    debouncedFn,
    cancel,
    flush,
    pending: readonly(pending),
  };
}

/**
 * 検索用のデバウンス機能
 * 検索クエリの変更を監視し、デバウンスされた検索を実行
 */
export interface UseSearchDebounceOptions extends UseDebounceOptions {
  minLength?: number;
  onSearch?: (query: string) => void | Promise<void>;
}

export interface UseSearchDebounceReturn {
  searchQuery: Ref<string>;
  debouncedSearch: (query: string) => void;
  isSearching: Readonly<Ref<boolean>>;
  clearSearch: () => void;
}

export function useSearchDebounce(
  initialQuery: string = '',
  delay: number = 300,
  options: UseSearchDebounceOptions = {},
): UseSearchDebounceReturn {
  const { minLength = 0, onSearch } = options;

  const searchQuery = ref(initialQuery);
  const isSearching = ref(false);

  const performSearch = async (query: string) => {
    if (query.length < minLength) {
      return;
    }

    isSearching.value = true;
    try {
      if (onSearch) {
        await onSearch(query);
      }
    }
    finally {
      isSearching.value = false;
    }
  };

  const { debouncedFn: debouncedSearch } = useDebounce(performSearch, delay);

  const clearSearch = () => {
    searchQuery.value = '';
    if (onSearch) {
      onSearch('');
    }
  };

  // searchQueryの変更を監視してデバウンス検索を実行
  watch(searchQuery, (newQuery) => {
    debouncedSearch(newQuery);
  });

  return {
    searchQuery,
    debouncedSearch,
    isSearching: readonly(isSearching),
    clearSearch,
  };
}

/**
 * ページネーション用のデバウンス機能
 * 無限スクロールやページ変更時のパフォーマンス最適化
 */
export interface UsePaginationDebounceOptions {
  delay?: number;
  onPageChange?: (page: number) => void | Promise<void>;
}

export interface UsePaginationDebounceReturn {
  currentPage: Ref<number>;
  debouncedPageChange: (page: number) => void;
  isChangingPage: Readonly<Ref<boolean>>;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}

export function usePaginationDebounce(
  initialPage: number = 1,
  delay: number = 100,
  options: UsePaginationDebounceOptions = {},
): UsePaginationDebounceReturn {
  const { onPageChange } = options;

  const currentPage = ref(initialPage);
  const isChangingPage = ref(false);

  const performPageChange = async (page: number) => {
    if (page < 1) return;

    isChangingPage.value = true;
    try {
      currentPage.value = page;
      if (onPageChange) {
        await onPageChange(page);
      }
    }
    finally {
      isChangingPage.value = false;
    }
  };

  const { debouncedFn: debouncedPageChange } = useDebounce(performPageChange, delay);

  const nextPage = () => {
    debouncedPageChange(currentPage.value + 1);
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      debouncedPageChange(currentPage.value - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1) {
      debouncedPageChange(page);
    }
  };

  return {
    currentPage,
    debouncedPageChange,
    isChangingPage: readonly(isChangingPage),
    nextPage,
    prevPage,
    goToPage,
  };
}
