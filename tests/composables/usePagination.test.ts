import { describe, it, expect, beforeEach } from 'vitest';
import type { PaginationInfo } from '~/types/veterinary-master';

// Composableを動的にインポート
const { usePagination } = await import('~/composables/usePagination');

describe('usePagination', () => {
  it('初期状態が正しく設定される', () => {
    const {
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages,
      hasNextPage,
      hasPrevPage,
    } = usePagination({
      initialPage: 2,
      initialLimit: 15,
    });

    expect(currentPage.value).toBe(2);
    expect(itemsPerPage.value).toBe(15);
    expect(totalItems.value).toBe(0);
    expect(totalPages.value).toBe(0);
    expect(hasNextPage.value).toBe(false);
    expect(hasPrevPage.value).toBe(true);
  });

  it('ページネーション情報を更新できる', () => {
    const {
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages,
      hasNextPage,
      hasPrevPage,
      updatePagination,
    } = usePagination();

    const paginationInfo: PaginationInfo = {
      page: 3,
      limit: 10,
      total: 50,
      totalPages: 5,
      hasNext: true,
      hasPrev: true,
    };

    updatePagination(paginationInfo);

    expect(currentPage.value).toBe(3);
    expect(itemsPerPage.value).toBe(10);
    expect(totalItems.value).toBe(50);
    expect(totalPages.value).toBe(5);
    expect(hasNextPage.value).toBe(true);
    expect(hasPrevPage.value).toBe(true);
  });

  it('ページナビゲーションが正しく動作する', () => {
    const {
      currentPage,
      totalItems,
      itemsPerPage,
      hasNextPage,
      hasPrevPage,
      goToPage,
      nextPage,
      prevPage,
    } = usePagination();

    // 総アイテム数を設定（5ページ分）
    totalItems.value = 50;
    itemsPerPage.value = 10;

    // 3ページ目に移動
    goToPage(3);
    expect(currentPage.value).toBe(3);
    expect(hasNextPage.value).toBe(true);
    expect(hasPrevPage.value).toBe(true);

    // 次のページ
    nextPage();
    expect(currentPage.value).toBe(4);

    // 前のページ
    prevPage();
    expect(currentPage.value).toBe(3);

    // 最初のページ
    goToPage(1);
    expect(currentPage.value).toBe(1);
    expect(hasPrevPage.value).toBe(false);

    // 最後のページ
    goToPage(5);
    expect(currentPage.value).toBe(5);
    expect(hasNextPage.value).toBe(false);

    // 範囲外のページには移動しない
    goToPage(0);
    expect(currentPage.value).toBe(5); // 変更されない

    goToPage(6);
    expect(currentPage.value).toBe(5); // 変更されない
  });

  it('表示用の情報が正しく計算される', () => {
    const {
      currentPage,
      itemsPerPage,
      totalItems,
      startItem,
      endItem,
    } = usePagination();

    totalItems.value = 47;
    itemsPerPage.value = 10;
    currentPage.value = 3;

    expect(startItem.value).toBe(21); // (3-1) * 10 + 1
    expect(endItem.value).toBe(30); // 3 * 10

    // 最後のページ
    currentPage.value = 5;
    expect(startItem.value).toBe(41);
    expect(endItem.value).toBe(47); // 総数を超えない

    // アイテムが0の場合
    totalItems.value = 0;
    expect(startItem.value).toBe(0);
    expect(endItem.value).toBe(0);
  });

  it('表示ページ番号が正しく計算される', () => {
    const {
      currentPage,
      itemsPerPage,
      totalItems,
      visiblePages,
    } = usePagination();

    totalItems.value = 100;
    itemsPerPage.value = 10; // 10ページ

    // 最初の方のページ
    currentPage.value = 2;
    expect(visiblePages.value).toEqual([1, 2, 3, 4, 5]);

    // 中間のページ
    currentPage.value = 6;
    expect(visiblePages.value).toEqual([4, 5, 6, 7, 8]);

    // 最後の方のページ
    currentPage.value = 9;
    expect(visiblePages.value).toEqual([6, 7, 8, 9, 10]);

    // 総ページ数が5以下の場合
    totalItems.value = 30; // 3ページ
    expect(visiblePages.value).toEqual([1, 2, 3]);
  });

  it('アイテム数の変更でページが調整される', () => {
    const {
      currentPage,
      itemsPerPage,
      setItemsPerPage,
      totalItems,
    } = usePagination();

    totalItems.value = 100;
    currentPage.value = 10; // 10ページ目
    itemsPerPage.value = 10;

    // アイテム数を増やす（ページ数が減る）
    setItemsPerPage(20); // 5ページになる
    expect(currentPage.value).toBe(5); // 最後のページに調整される
    expect(itemsPerPage.value).toBe(20);

    // 制限値のテスト
    setItemsPerPage(200); // maxLimitを超える
    expect(itemsPerPage.value).toBe(100); // maxLimitに制限される

    setItemsPerPage(1); // minLimitを下回る
    expect(itemsPerPage.value).toBe(5); // minLimitに制限される
  });

  it('リセット機能が動作する', () => {
    const {
      currentPage,
      itemsPerPage,
      totalItems,
      paginationInfo,
      reset,
      updatePagination,
    } = usePagination({
      initialPage: 2,
      initialLimit: 15,
    });

    // 状態を変更
    const mockPaginationInfo: PaginationInfo = {
      page: 5,
      limit: 25,
      total: 100,
      totalPages: 4,
      hasNext: false,
      hasPrev: true,
    };
    updatePagination(mockPaginationInfo);

    // リセット
    reset();

    expect(currentPage.value).toBe(2); // 初期値に戻る
    expect(itemsPerPage.value).toBe(15); // 初期値に戻る
    expect(totalItems.value).toBe(0);
    expect(paginationInfo.value).toBe(null);
  });
});
