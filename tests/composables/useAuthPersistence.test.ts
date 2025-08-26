import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// localStorage のモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// グローバルオブジェクトのモック
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

// import.meta.client のモック
Object.defineProperty(import.meta, 'client', {
  value: true,
  writable: true,
});

// useAuthPersistence を動的にインポート
const { useAuthPersistence } = await import('~/composables/useAuthPersistence');

describe('useAuthPersistence', () => {
  const AUTH_STORAGE_KEY = 'nekolog-auth-state';
  const CURRENT_SCHEMA_VERSION = '1.1.0';

  beforeEach(() => {
    // 各テスト前にlocalStorageをクリア
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    localStorageMock.clear();
  });

  describe('localStorage操作の基本機能', () => {
    it('認証状態を正常に保存できる', () => {
      const { saveAuthState } = useAuthPersistence();
      const testEmail = 'test@example.com';

      saveAuthState(true, testEmail);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEY,
        expect.stringContaining(testEmail),
      );

      // 保存されたデータの構造を確認
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toMatchObject({
        isAuthenticated: true,
        userEmail: testEmail,
        version: CURRENT_SCHEMA_VERSION,
        lastAuthCheck: expect.any(Number),
      });
    });

    it('認証状態を正常に読み込める', () => {
      const { saveAuthState, loadAuthState } = useAuthPersistence();
      const testEmail = 'test@example.com';

      // データを保存
      saveAuthState(true, testEmail);

      // データを読み込み
      const loadedState = loadAuthState();

      expect(loadedState).toMatchObject({
        isAuthenticated: true,
        userEmail: testEmail,
        version: CURRENT_SCHEMA_VERSION,
        lastAuthCheck: expect.any(Number),
      });
    });

    it('認証状態を正常にクリアできる', () => {
      const { saveAuthState, clearAuthState, loadAuthState } = useAuthPersistence();

      // データを保存
      saveAuthState(true, 'test@example.com');
      expect(loadAuthState()).not.toBeNull();

      // データをクリア
      clearAuthState();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
      expect(loadAuthState()).toBeNull();
    });

    it('有効な永続化認証状態を正しく判定できる', () => {
      const { saveAuthState, hasValidPersistedAuth } = useAuthPersistence();

      // 初期状態では無効
      expect(hasValidPersistedAuth()).toBe(false);

      // 認証状態を保存
      saveAuthState(true, 'test@example.com');
      expect(hasValidPersistedAuth()).toBe(true);

      // 未認証状態を保存
      saveAuthState(false);
      expect(hasValidPersistedAuth()).toBe(false);
    });
  });

  describe('データ移行処理のテスト', () => {
    it('古い形式のデータ（v1.0.0以前）を新しい形式に移行できる', () => {
      const { loadAuthState } = useAuthPersistence();

      // 古い形式のデータを直接localStorageに設定
      const legacyData = {
        isAuthenticated: true,
        lastAuthCheck: Date.now(),
        userEmail: 'legacy@example.com',
      };

      localStorageMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(legacyData));

      // データを読み込み（移行処理が実行される）
      const migratedState = loadAuthState();

      expect(migratedState).toMatchObject({
        isAuthenticated: true,
        userEmail: 'legacy@example.com',
        version: CURRENT_SCHEMA_VERSION,
        lastAuthCheck: expect.any(Number),
      });

      // 移行後のデータが保存されることを確認
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEY,
        expect.stringContaining(CURRENT_SCHEMA_VERSION),
      );
    });

    it('必須フィールドが不足している古いデータは無効として扱われる', () => {
      const { loadAuthState } = useAuthPersistence();

      // 不正な古い形式のデータ
      const invalidLegacyData = {
        userEmail: 'invalid@example.com',
        // isAuthenticated と lastAuthCheck が不足
      };

      localStorageMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(invalidLegacyData));

      const result = loadAuthState();
      expect(result).toBeNull();

      // 不正なデータはクリアされる
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    });

    it('現在のバージョンのデータはそのまま読み込まれる', () => {
      const { loadAuthState } = useAuthPersistence();

      const currentVersionData = {
        isAuthenticated: true,
        lastAuthCheck: Date.now(),
        userEmail: 'current@example.com',
        version: CURRENT_SCHEMA_VERSION,
      };

      localStorageMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentVersionData));

      const result = loadAuthState();
      expect(result).toMatchObject(currentVersionData);

      // 既に現在バージョンなので再保存は行われない
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリングのテスト', () => {
    it('localStorage が利用できない環境では何も実行されない', () => {
      // import.meta.client を false に設定
      Object.defineProperty(import.meta, 'client', {
        value: false,
        writable: true,
      });

      const { saveAuthState, loadAuthState, clearAuthState } = useAuthPersistence();

      saveAuthState(true, 'test@example.com');
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      const result = loadAuthState();
      expect(result).toBeNull();
      expect(localStorageMock.getItem).not.toHaveBeenCalled();

      clearAuthState();
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();

      // import.meta.client を元に戻す
      Object.defineProperty(import.meta, 'client', {
        value: true,
        writable: true,
      });
    });

    it('JSON解析エラー時は破損データをクリアして null を返す', () => {
      const { loadAuthState } = useAuthPersistence();

      // 不正なJSONデータを設定
      localStorageMock.setItem(AUTH_STORAGE_KEY, 'invalid json data');

      const result = loadAuthState();
      expect(result).toBeNull();

      // 破損したデータがクリアされる
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    });

    it('localStorage容量不足エラー時は適切にハンドリングされる', () => {
      const { saveAuthState } = useAuthPersistence();

      // QuotaExceededError をシミュレート
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      Object.setPrototypeOf(quotaError, DOMException.prototype);

      localStorageMock.setItem.mockImplementationOnce(() => {
        throw quotaError;
      });

      // エラーが発生してもクラッシュしない
      expect(() => {
        saveAuthState(true, 'test@example.com');
      }).not.toThrow();

      // clear() と再試行が実行される
      expect(localStorageMock.clear).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2); // 最初の失敗 + 再試行
    });

    it('古すぎる認証状態は無効として扱われる', () => {
      const { loadAuthState } = useAuthPersistence();

      // 6分前（5分の制限を超える）のタイムスタンプ
      const oldTimestamp = Date.now() - (6 * 60 * 1000);
      const oldData = {
        isAuthenticated: true,
        lastAuthCheck: oldTimestamp,
        userEmail: 'old@example.com',
        version: CURRENT_SCHEMA_VERSION,
      };

      localStorageMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(oldData));

      const result = loadAuthState();
      expect(result).toBeNull();

      // 古いデータはクリアされる
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    });

    it('データサイズが大きすぎる場合は保存をスキップする', () => {
      const { saveAuthState } = useAuthPersistence();

      // 非常に長いメールアドレスを作成（5KB制限を超える）
      const longEmail = 'a'.repeat(5001) + '@example.com';

      saveAuthState(true, longEmail);

      // 大きすぎるデータは保存されない
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('removeItem失敗時は空文字で上書きを試行する', () => {
      const { clearAuthState } = useAuthPersistence();

      // removeItem でエラーを発生させる
      const removeError = new Error('Remove failed');
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw removeError;
      });

      clearAuthState();

      // removeItem が失敗した後、setItem で空文字を設定
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY, '');
    });
  });

  describe('バリデーション機能のテスト', () => {
    it('不正な型のデータは無効として扱われる', () => {
      const { loadAuthState } = useAuthPersistence();

      // 文字列データ（オブジェクトではない）
      localStorageMock.setItem(AUTH_STORAGE_KEY, '"invalid string data"');

      const result = loadAuthState();
      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    });

    it('null データは無効として扱われる', () => {
      const { loadAuthState } = useAuthPersistence();

      localStorageMock.setItem(AUTH_STORAGE_KEY, 'null');

      const result = loadAuthState();
      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    });

    it('必須フィールドの型が不正な場合は無効として扱われる', () => {
      const { loadAuthState } = useAuthPersistence();

      const invalidData = {
        isAuthenticated: 'true', // boolean ではなく string
        lastAuthCheck: Date.now(),
        version: CURRENT_SCHEMA_VERSION,
      };

      localStorageMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(invalidData));

      const result = loadAuthState();
      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    });
  });

  describe('統合テスト', () => {
    it('保存→読み込み→クリアの一連の流れが正常に動作する', () => {
      const { saveAuthState, loadAuthState, clearAuthState, hasValidPersistedAuth } = useAuthPersistence();
      const testEmail = 'integration@example.com';

      // 1. 初期状態では認証状態なし
      expect(hasValidPersistedAuth()).toBe(false);
      expect(loadAuthState()).toBeNull();

      // 2. 認証状態を保存
      saveAuthState(true, testEmail);
      expect(hasValidPersistedAuth()).toBe(true);

      // 3. 保存した状態を読み込み
      const loadedState = loadAuthState();
      expect(loadedState).toMatchObject({
        isAuthenticated: true,
        userEmail: testEmail,
        version: CURRENT_SCHEMA_VERSION,
      });

      // 4. 状態をクリア
      clearAuthState();
      expect(hasValidPersistedAuth()).toBe(false);
      expect(loadAuthState()).toBeNull();
    });

    it('複数回の保存と読み込みが正常に動作する', () => {
      const { saveAuthState, loadAuthState } = useAuthPersistence();

      // 最初の保存
      saveAuthState(true, 'first@example.com');
      let state = loadAuthState();
      expect(state?.userEmail).toBe('first@example.com');
      expect(state?.isAuthenticated).toBe(true);

      // 2回目の保存（上書き）
      saveAuthState(false, 'second@example.com');
      state = loadAuthState();
      expect(state?.userEmail).toBe('second@example.com');
      expect(state?.isAuthenticated).toBe(false);

      // 3回目の保存（メールアドレスなし）
      saveAuthState(true);
      state = loadAuthState();
      expect(state?.userEmail).toBeUndefined();
      expect(state?.isAuthenticated).toBe(true);
    });
  });
});
