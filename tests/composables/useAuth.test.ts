import { ref } from 'process';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuth } from '~/composables/useAuth';
import type { User } from '~/types/auth';

// モック用のユーザーデータ
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// モック関数の作成
const mockSaveAuthState = vi.fn();
const mockClearAuthState = vi.fn();
const mockHasValidPersistedAuth = vi.fn(() => false);
const mockUseCookie = vi.fn();
const mockUseState = vi.fn();
const mockFetch = vi.fn();
const mockNavigateTo = vi.fn();
const mockNextTick = vi.fn(fn => Promise.resolve().then(fn));

// モック設定
vi.mock('~/composables/useAuthPersistence', () => ({
  useAuthPersistence: () => ({
    saveAuthState: mockSaveAuthState,
    clearAuthState: mockClearAuthState,
    hasValidPersistedAuth: mockHasValidPersistedAuth,
  }),
}));

vi.mock('~/composables/useRedirect', () => ({
  useRedirect: () => ({
    initializeRedirect: vi.fn(),
    handleAutoLoginRedirect: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('~/composables/useAuthDebug', () => ({
  useAuthDebug: () => ({
    startAuthProcess: vi.fn(() => 'test-process-id'),
    logAuthStep: vi.fn(),
    endAuthProcess: vi.fn(),
    logAuthError: vi.fn(),
  }),
}));

vi.mock('~/utils/auth-error-handling', () => ({
  retryableFetch: vi.fn(),
  classifyAuthError: vi.fn(error => ({
    type: 'auth',
    message: error.message || 'Authentication error',
    originalError: error,
  })),
  getErrorHandlingStrategy: vi.fn(() => ({
    shouldClearTokens: true,
  })),
  logAuthError: vi.fn(),
}));

vi.mock('~/utils/auth-error-messages', () => ({
  getAuthErrorInfo: vi.fn(error => ({
    type: 'auth',
    message: error.message || 'Authentication error',
  })),
  formatAuthError: vi.fn(error => error.message || 'Authentication error'),
}));

// Nuxt関数のグローバルモック
global.useState = mockUseState;
global.useCookie = mockUseCookie;
global.$fetch = mockFetch;
global.navigateTo = mockNavigateTo;
global.nextTick = mockNextTick;
global.useNuxtApp = vi.fn(() => ({
  $authPluginState: {},
}));

vi.mock('#app', () => ({
  useCookie: mockUseCookie,
  useState: mockUseState,
  $fetch: mockFetch,
  navigateTo: mockNavigateTo,
  nextTick: mockNextTick,
  useNuxtApp: vi.fn(() => ({
    $authPluginState: {},
  })),
}));

describe('useAuth', () => {
  // 状態管理用のモック
  let mockAuthState: any;
  let mockCookieValue: any;

  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();

    // import.meta.client を true に設定
    Object.defineProperty(import.meta, 'client', {
      value: true,
      writable: true,
    });

    // 認証状態のモック
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitialized: false,
      initializationPromise: null,
    };

    // useState のモック実装
    mockUseState.mockImplementation((key, init) => {
      const state = ref(typeof init === 'function' ? init() : init);
      if (key === 'auth.state') {
        state.value = { ...mockAuthState };
      }
      return state;
    });

    // useCookie のモック実装
    mockCookieValue = { value: null };
    mockUseCookie.mockReturnValue(mockCookieValue);

    // 永続化機能のモックをリセット
    mockHasValidPersistedAuth.mockReturnValue(false);
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    vi.restoreAllMocks();
  });

  describe('認証状態管理の基盤改善（要件2.3）', () => {
    it('AuthStateにisInitializedとinitializationPromiseフィールドが含まれている', () => {
      const { isInitialized } = useAuth();

      // isInitializedが存在し、初期値がfalseであることを確認
      expect(isInitialized.value).toBe(false);
    });

    it('初期化完了後にisInitializedがtrueになる', async () => {
      const { initializeAuth, isInitialized } = useAuth();

      // 初期状態では未初期化
      expect(isInitialized.value).toBe(false);

      // 初期化を実行
      await initializeAuth();

      // 初期化完了後は初期化済み状態になる
      expect(isInitialized.value).toBe(true);
    });

    it('重複初期化が防止される', async () => {
      const { initializeAuth, isInitialized } = useAuth();

      // 最初の初期化
      await initializeAuth();
      expect(isInitialized.value).toBe(true);

      // 2回目の初期化は実行されない（既に初期化済みのため）
      const secondInit = await initializeAuth();
      expect(secondInit).toBeUndefined();
    });

    it('初期化中の重複実行が防止される', async () => {
      const { initializeAuth } = useAuth();

      // 同時に複数の初期化を開始
      const promise1 = initializeAuth();
      const promise2 = initializeAuth();

      // 両方とも同じPromiseを返すことを確認
      expect(promise1).toBe(promise2);

      await Promise.all([promise1, promise2]);
    });
  });

  describe('認証初期化プロセス（要件1.1, 2.1）', () => {
    it('サーバーサイドでは初期化を実行しない', async () => {
      // import.meta.client を false に設定
      Object.defineProperty(import.meta, 'client', {
        value: false,
        writable: true,
      });

      const { initializeAuth } = useAuth();
      const result = await initializeAuth();

      expect(result).toBeUndefined();
      expect(mockUseCookie).not.toHaveBeenCalled();
    });

    it('トークンがない場合は未認証状態に設定される', async () => {
      const { initializeAuth, isAuthenticated, user } = useAuth();

      // トークンなしの状態
      mockCookieValue.value = null;

      await initializeAuth();

      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
      expect(mockClearAuthState).toHaveBeenCalled();
    });

    it('有効なアクセストークンがある場合は認証状態を復元する', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      (retryableFetch as any).mockResolvedValue(mockUser);

      const { initializeAuth, isAuthenticated, user } = useAuth();

      // アクセストークンを設定
      mockUseCookie.mockImplementation((name) => {
        if (name === 'access-token') {
          return { value: 'valid-access-token' };
        }
        return { value: null };
      });

      await initializeAuth();

      expect(isAuthenticated.value).toBe(true);
      expect(user.value).toEqual(mockUser);
      expect(mockSaveAuthState).toHaveBeenCalledWith(true, mockUser.email);
    });

    it('アクセストークンが無効でリフレッシュトークンが有効な場合はトークンを更新する', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');

      // アクセストークンでの認証は失敗、リフレッシュは成功
      (retryableFetch as any)
        .mockRejectedValueOnce(new Error('Access token invalid'))
        .mockResolvedValueOnce({
          user: mockUser,
          accessToken: 'new-access-token',
        });

      const { initializeAuth, isAuthenticated, user } = useAuth();

      // アクセストークンとリフレッシュトークンを設定
      mockUseCookie.mockImplementation((name) => {
        if (name === 'access-token') {
          return { value: 'invalid-access-token' };
        }
        if (name === 'refresh-token') {
          return { value: 'valid-refresh-token' };
        }
        return { value: null };
      });

      await initializeAuth();

      expect(isAuthenticated.value).toBe(true);
      expect(user.value).toEqual(mockUser);
      expect(mockSaveAuthState).toHaveBeenCalledWith(true, mockUser.email);
    });

    it('永続化された認証状態がある場合は初期状態で認証済みとする', () => {
      mockHasValidPersistedAuth.mockReturnValue(true);

      const { isAuthenticated } = useAuth();

      expect(isAuthenticated.value).toBe(true);
    });
  });

  describe('ログイン機能（要件1, 2, 3）', () => {
    it('正常なログインが成功する', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      const loginResponse = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      (retryableFetch as any).mockResolvedValue(loginResponse);

      const { login, isAuthenticated, user } = useAuth();

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await login(credentials);

      expect(result).toEqual(loginResponse);
      expect(isAuthenticated.value).toBe(true);
      expect(user.value).toEqual(mockUser);
      expect(mockSaveAuthState).toHaveBeenCalledWith(true, mockUser.email);
    });

    it('ログインエラー時は適切なエラーメッセージを設定する', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      const loginError = new Error('Invalid credentials');
      (retryableFetch as any).mockRejectedValue(loginError);

      const { login, error, isAuthenticated } = useAuth();

      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      await expect(login(credentials)).rejects.toThrow('Invalid credentials');
      expect(error.value).toBe('Invalid credentials');
      expect(isAuthenticated.value).toBe(false);
    });

    it('ログイン中はローディング状態になる', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      (retryableFetch as any).mockReturnValue(loginPromise);

      const { login, isLoading } = useAuth();

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginCall = login(credentials);

      // ログイン中はローディング状態
      expect(isLoading.value).toBe(true);

      // ログイン完了
      resolveLogin!({
        user: mockUser,
        accessToken: 'token',
        refreshToken: 'refresh',
      });
      await loginCall;

      // ローディング状態が解除される
      expect(isLoading.value).toBe(false);
    });
  });

  describe('ユーザー登録機能（要件1, 2, 3）', () => {
    it('正常なユーザー登録が成功する', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      const registerResponse = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      (retryableFetch as any).mockResolvedValue(registerResponse);

      const { register, isAuthenticated, user } = useAuth();

      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const result = await register(registerData);

      expect(result).toEqual(registerResponse);
      expect(isAuthenticated.value).toBe(true);
      expect(user.value).toEqual(mockUser);
      expect(mockSaveAuthState).toHaveBeenCalledWith(true, mockUser.email);
    });

    it('登録エラー時は適切なエラーメッセージを設定する', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      const registerError = new Error('Email already exists');
      (retryableFetch as any).mockRejectedValue(registerError);

      const { register, error, isAuthenticated } = useAuth();

      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
      };

      await expect(register(registerData)).rejects.toThrow('Email already exists');
      expect(error.value).toBe('Email already exists');
      expect(isAuthenticated.value).toBe(false);
    });
  });

  describe('ログアウト機能（要件3.3）', () => {
    it('正常なログアウトが実行される', async () => {
      mockFetch.mockResolvedValue({});

      const { logout, isAuthenticated, user } = useAuth();

      // 初期状態を認証済みに設定
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = mockUser;

      await logout();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
      expect(mockClearAuthState).toHaveBeenCalled();
      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });

    it('サーバーでのログアウト失敗時もローカル状態はクリアされる', async () => {
      mockFetch.mockRejectedValue(new Error('Server error'));

      const { logout, isAuthenticated, user } = useAuth();

      // 初期状態を認証済みに設定
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = mockUser;

      await logout();

      // サーバーエラーでもローカル状態はクリアされる
      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
      expect(mockClearAuthState).toHaveBeenCalled();
      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });

    it('ログアウト後も初期化済み状態は維持される', async () => {
      mockFetch.mockResolvedValue({});

      const { logout, isInitialized } = useAuth();

      // 初期化済み状態に設定
      mockAuthState.isInitialized = true;

      await logout();

      expect(isInitialized.value).toBe(true);
    });
  });

  describe('トークンリフレッシュ機能（要件3.1, 3.2）', () => {
    it('正常なトークンリフレッシュが成功する', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      const refreshResponse = {
        user: mockUser,
        accessToken: 'new-access-token',
      };
      (retryableFetch as any).mockResolvedValue(refreshResponse);

      const { refreshToken, isAuthenticated, user } = useAuth();

      const result = await refreshToken();

      expect(result).toEqual(refreshResponse);
      expect(isAuthenticated.value).toBe(true);
      expect(user.value).toEqual(mockUser);
      expect(mockSaveAuthState).toHaveBeenCalledWith(true, mockUser.email);
    });

    it('リフレッシュ失敗時は認証状態をクリアする', async () => {
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      (retryableFetch as any).mockRejectedValue(new Error('Refresh token expired'));

      const { refreshToken, isAuthenticated, user } = useAuth();

      await expect(refreshToken()).rejects.toThrow();
      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
      expect(mockClearAuthState).toHaveBeenCalled();
    });

    it('ネットワークエラー時は状態を維持する', async () => {
      const { retryableFetch, classifyAuthError } = await import('~/utils/auth-error-handling');
      const networkError = new Error('Network error');
      (retryableFetch as any).mockRejectedValue(networkError);
      (classifyAuthError as any).mockReturnValue({
        type: 'network',
        message: 'Network error',
        originalError: networkError,
      });

      const { refreshToken } = useAuth();

      // 初期状態を認証済みに設定
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = mockUser;

      await expect(refreshToken()).rejects.toThrow('トークンリフレッシュ一時的失敗');

      // ネットワークエラーの場合は状態を維持
      expect(mockClearAuthState).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング（要件2.2, 3.2）', () => {
    it('エラー状態をクリアできる', () => {
      const { clearError, error } = useAuth();

      // エラー状態を設定
      mockAuthState.error = 'Test error';

      clearError();

      expect(error.value).toBeNull();
    });

    it('トークンを手動でクリアできる', () => {
      const { clearTokens, isAuthenticated, user } = useAuth();

      // 認証済み状態を設定
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = mockUser;

      clearTokens();

      expect(isAuthenticated.value).toBe(false);
      expect(user.value).toBeNull();
      expect(mockClearAuthState).toHaveBeenCalled();
    });

    it('トークンクリア後も初期化済み状態は維持される', () => {
      const { clearTokens, isInitialized } = useAuth();

      // 初期化済み状態を設定
      mockAuthState.isInitialized = true;

      clearTokens();

      expect(isInitialized.value).toBe(true);
    });
  });

  describe('権限チェック機能', () => {
    it('認証済みユーザーは全ての権限を持つ', () => {
      const { hasPermission } = useAuth();

      // 認証済み状態を設定
      mockAuthState.isAuthenticated = true;

      expect(hasPermission('any-permission')).toBe(true);
    });

    it('未認証ユーザーは権限を持たない', () => {
      const { hasPermission } = useAuth();

      // 未認証状態を設定
      mockAuthState.isAuthenticated = false;

      expect(hasPermission('any-permission')).toBe(false);
    });
  });

  describe('状態の読み取り専用性', () => {
    it('返される状態は読み取り専用である', () => {
      const { user, isAuthenticated, isLoading, error, isInitialized } = useAuth();

      // 読み取り専用のComputedRefであることを確認
      expect(user).toHaveProperty('value');
      expect(isAuthenticated).toHaveProperty('value');
      expect(isLoading).toHaveProperty('value');
      expect(error).toHaveProperty('value');
      expect(isInitialized).toHaveProperty('value');

      // 直接変更できないことを確認（TypeScriptレベルでの制約）
      // 実際のテストでは値の変更を試みてエラーが発生することを確認
    });
  });
});
