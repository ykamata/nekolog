import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';

// Composableを動的にインポート
const { useDebounce, useSearchDebounce, usePaginationDebounce } = await import('~/composables/useDebounce');

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('関数をデバウンスできる', async () => {
    const mockFn = vi.fn();
    const { debouncedFn } = useDebounce(mockFn, 300);

    // 複数回呼び出し
    debouncedFn('arg1');
    debouncedFn('arg2');
    debouncedFn('arg3');

    // まだ実行されていない
    expect(mockFn).not.toHaveBeenCalled();

    // 300ms経過
    vi.advanceTimersByTime(300);

    // 最後の呼び出しのみ実行される
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg3');
  });

  it('デバウンス中にキャンセルできる', async () => {
    const mockFn = vi.fn();
    const { debouncedFn, cancel } = useDebounce(mockFn, 300);

    debouncedFn('arg1');
    cancel();

    vi.advanceTimersByTime(300);

    expect(mockFn).not.toHaveBeenCalled();
  });

  it('immediate オプションが動作する', async () => {
    const mockFn = vi.fn();
    const { debouncedFn } = useDebounce(mockFn, 300, { immediate: true });

    debouncedFn('arg1');

    // 即座に実行される
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1');
  });
});

describe('useSearchDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('検索クエリをデバウンスできる', async () => {
    const mockOnSearch = vi.fn();
    const { searchQuery } = useSearchDebounce('', 300, {
      onSearch: mockOnSearch,
    });

    searchQuery.value = 'test1';
    await nextTick();
    searchQuery.value = 'test2';
    await nextTick();
    searchQuery.value = 'test3';
    await nextTick();

    // まだ実行されていない
    expect(mockOnSearch).not.toHaveBeenCalled();

    // 300ms経過
    vi.advanceTimersByTime(300);

    // 最後のクエリで実行される
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith('test3');
  });

  it('最小文字数制限が動作する', async () => {
    const mockOnSearch = vi.fn();
    const { searchQuery } = useSearchDebounce('', 300, {
      minLength: 3,
      onSearch: mockOnSearch,
    });

    searchQuery.value = 'te';
    await nextTick();
    vi.advanceTimersByTime(300);

    // 最小文字数に満たないので実行されない
    expect(mockOnSearch).not.toHaveBeenCalled();

    searchQuery.value = 'test';
    await nextTick();
    vi.advanceTimersByTime(300);

    // 最小文字数を満たすので実行される
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith('test');
  });

  it('検索をクリアできる', async () => {
    const mockOnSearch = vi.fn();
    const { searchQuery, clearSearch } = useSearchDebounce('initial', 300, {
      onSearch: mockOnSearch,
    });

    clearSearch();

    expect(searchQuery.value).toBe('');
    expect(mockOnSearch).toHaveBeenCalledWith('');
  });
});

describe('usePaginationDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ページ変更をデバウンスできる', async () => {
    const mockOnPageChange = vi.fn();
    const { currentPage, goToPage } = usePaginationDebounce(1, 100, {
      onPageChange: mockOnPageChange,
    });

    goToPage(2);
    goToPage(3);
    goToPage(4);

    // まだ実行されていない
    expect(mockOnPageChange).not.toHaveBeenCalled();
    expect(currentPage.value).toBe(1); // まだ変更されていない

    // 100ms経過
    vi.advanceTimersByTime(100);

    // 最後のページ変更が実行される
    expect(mockOnPageChange).toHaveBeenCalledTimes(1);
    expect(mockOnPageChange).toHaveBeenCalledWith(4);
    expect(currentPage.value).toBe(4);
  });

  it('次のページ・前のページが動作する', async () => {
    const mockOnPageChange = vi.fn();
    const { currentPage, nextPage, prevPage } = usePaginationDebounce(2, 100, {
      onPageChange: mockOnPageChange,
    });

    nextPage();
    vi.advanceTimersByTime(100);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
    expect(currentPage.value).toBe(3);

    prevPage();
    vi.advanceTimersByTime(100);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
    expect(currentPage.value).toBe(2);
  });

  it('ページ1未満には移動しない', async () => {
    const mockOnPageChange = vi.fn();
    const { currentPage, prevPage } = usePaginationDebounce(1, 100, {
      onPageChange: mockOnPageChange,
    });

    prevPage();
    vi.advanceTimersByTime(100);

    // ページ1未満には移動しない
    expect(mockOnPageChange).not.toHaveBeenCalled();
    expect(currentPage.value).toBe(1);
  });
});
