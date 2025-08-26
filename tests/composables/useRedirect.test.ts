import { describe, it, expect, beforeEach, vi } from 'vitest';

// Nuxtのモック
const mockState = {
  value: {
    pendingRedirect: null,
    lastVisitedPath: null,
    redirectReason: null,
  },
};

vi.mock('#app', () => ({
  useState: vi.fn(() => mockState),
  useRoute: vi.fn(() => ({
    fullPath: '/test-path',
    query: {},
  })),
  navigateTo: vi.fn(),
  nextTick: vi.fn(() => Promise.resolve()),
}));

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// import.meta.clientのモック
Object.defineProperty(import.meta, 'client', {
  value: true,
});

// useRedirectをモック後にインポート
const { useRedirect } = await import('~/composables/useRedirect');

describe('useRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    // 状態をリセット
    mockState.value = {
      pendingRedirect: null,
      lastVisitedPath: null,
      redirectReason: null,
    };
  });

  describe('isValidRedirectPath', () => {
    it('有効なパスを正しく判定する', () => {
      const { isValidRedirectPath } = useRedirect();

      expect(isValidRedirectPath('/dashboard')).toBe(true);
      expect(isValidRedirectPath('/cats/123')).toBe(true);
      expect(isValidRedirectPath('/meals/history?date=2024-01-01')).toBe(true);
    });

    it('無効なパスを正しく判定する', () => {
      const { isValidRedirectPath } = useRedirect();

      // 除外パス
      expect(isValidRedirectPath('/login')).toBe(false);
      expect(isValidRedirectPath('/register')).toBe(false);
      expect(isValidRedirectPath('/logout')).toBe(false);

      // 外部URL
      expect(isValidRedirectPath('http://example.com')).toBe(false);
      expect(isValidRedirectPath('https://example.com')).toBe(false);
      expect(isValidRedirectPath('//example.com')).toBe(false);

      // 無効な形式
      expect(isValidRedirectPath('')).toBe(false);
      expect(isValidRedirectPath('relative-path')).toBe(false);
      expect(isValidRedirectPath(null as unknown)).toBe(false);
    });
  });

  describe('getAutoLoginRedirectPath', () => {
    it('保存された状態がない場合はデフォルトパスを返す', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { getAutoLoginRedirectPath } = useRedirect();
      const result = getAutoLoginRedirectPath();

      expect(result).toBe('/');
    });
  });
});
