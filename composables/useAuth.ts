import type { User } from '~/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  initializationPromise: Promise<void> | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

/**
 * Authentication composable for managing user authentication state
 */
export const useAuth = () => {
  // クライアントサイドでのみ永続化機能を使用
  const persistenceHelpers = import.meta.client
    ? useAuthPersistence()
    : {
        saveAuthState: () => {},
        clearAuthState: () => {},
        hasValidPersistedAuth: () => false,
      };

  const { saveAuthState, clearAuthState, hasValidPersistedAuth } = persistenceHelpers;

  const authState = useState<AuthState>('auth.state', () => {
    // クライアントサイドでは永続化された認証状態を初期値として使用
    if (import.meta.client) {
      try {
        const hasPersistedAuth = hasValidPersistedAuth();
        return {
          user: null,
          isAuthenticated: hasPersistedAuth,
          isLoading: false,
          error: null,
          isInitialized: false,
          initializationPromise: null,
        };
      }
      catch {
        // 永続化状態の取得に失敗した場合はデフォルト値を使用
        return {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          isInitialized: false,
          initializationPromise: null,
        };
      }
    }

    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitialized: false,
      initializationPromise: null,
    };
  });

  /**
   * Initialize authentication state from cookies
   * This function is designed to work with the auth plugin to avoid duplicate initialization
   */
  const initializeAuth = async () => {
    // サーバーサイドでは実行しない
    if (!import.meta.client) {
      return;
    }

    // 既に初期化済みの場合はスキップ
    if (authState.value.isInitialized) {
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        // eslint-disable-next-line no-console
        console.log('useAuth: 既に初期化済みのためスキップ');
      }
      return;
    }

    // 初期化中の場合は既存のPromiseを返す
    if (authState.value.initializationPromise) {
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        // eslint-disable-next-line no-console
        console.log('useAuth: 初期化中のため既存のPromiseを返す');
      }
      return authState.value.initializationPromise;
    }

    // リダイレクト管理を初期化
    const { initializeRedirect } = useRedirect();

    // 新しい初期化Promiseを作成
    const initPromise = (async () => {
      // 複数の同時初期化を防ぐ（ダブルチェック）
      if (authState.value.isLoading) {
        if (process.env.NODE_ENV === 'development' && import.meta.client) {
          // eslint-disable-next-line no-console
          console.log('useAuth: 既にローディング中のためスキップ');
        }
        return;
      }

      // 既に認証済みで初期化済みの場合はスキップ
      if (authState.value.isAuthenticated && authState.value.user && authState.value.isInitialized) {
        return;
      }

      // 認証プロセスの追跡を開始
      let processId = '';
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { startAuthProcess } = useAuthDebug();
          processId = startAuthProcess('AUTH_INITIALIZATION');
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }

      authState.value.isLoading = true;
      authState.value.error = null;

      // リダイレクト管理を初期化
      initializeRedirect();

      // デバッグログ（開発環境のみ）
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { logAuthStep } = useAuthDebug();
          logAuthStep(processId, 'INIT_START', {
            isAuthenticated: authState.value.isAuthenticated,
            hasUser: !!authState.value.user,
            isLoading: authState.value.isLoading,
          });
        }
        catch {
        // デバッグログでエラーが発生しても処理を継続
        }
      }

      try {
        // クッキーからトークンを取得
        const accessToken = useCookie('access-token');
        const refreshTokenCookie = useCookie('refresh-token');

        // デバッグログ: トークン状態確認
        if (process.env.NODE_ENV === 'development' && import.meta.client) {
          try {
            const { logAuthStep } = useAuthDebug();
            logAuthStep(processId, 'TOKEN_CHECK', {
              hasAccessToken: !!accessToken.value,
              hasRefreshToken: !!refreshTokenCookie.value,
              accessTokenLength: accessToken.value?.length || 0,
              refreshTokenLength: refreshTokenCookie.value?.length || 0,
            });
          }
          catch {
            // デバッグログでエラーが発生しても処理を継続
          }
        }

        // トークンが全くない場合は未認証状態に設定
        if (!accessToken.value && !refreshTokenCookie.value) {
          // 永続化された認証状態もクリア
          clearAuthState();
          authState.value.user = null;
          authState.value.isAuthenticated = false;

          // デバッグログ: トークンなし
          if (process.env.NODE_ENV === 'development' && import.meta.client) {
            try {
              const { logAuthStep } = useAuthDebug();
              logAuthStep(processId, 'NO_TOKENS', {}, true, undefined);
            }
            catch {
              // デバッグログでエラーが発生しても処理を継続
            }
          }
          return;
        }

        // 永続化された認証状態があるかチェック
        const hasPersistedAuth = hasValidPersistedAuth();

        // デバッグログ: 永続化状態確認
        if (process.env.NODE_ENV === 'development' && import.meta.client) {
          try {
            const { logAuthStep } = useAuthDebug();
            logAuthStep(processId, 'PERSISTENCE_CHECK', {
              hasPersistedAuth,
            });
          }
          catch {
            // デバッグログでエラーが発生しても処理を継続
          }
        }

        if (!hasPersistedAuth && !accessToken.value) {
        // 永続化された認証状態がなく、アクセストークンもない場合は
        // リフレッシュトークンのみでの認証を試行
        }

        // まずアクセストークンでユーザー情報を取得を試行
        let user: User | null = null;

        if (accessToken.value) {
          try {
            // デバッグログ: アクセストークンでの認証開始
            if (process.env.NODE_ENV === 'development' && import.meta.client) {
              try {
                const { logAuthStep } = useAuthDebug();
                logAuthStep(processId, 'ACCESS_TOKEN_AUTH_START');
              }
              catch {
                // デバッグログでエラーが発生しても処理を継続
              }
            }

            // エラーハンドリング機能付きでユーザー情報を取得
            const { retryableFetch } = await import('~/utils/auth-error-handling');

            user = await retryableFetch<User>('/api/auth/me', {}, 2, 1000);

            // 成功した場合は認証済み状態に設定
            if (user) {
              authState.value.user = user;
              authState.value.isAuthenticated = true;
              // 認証状態を永続化
              saveAuthState(true, user.email);

              // デバッグログ: アクセストークン認証成功
              if (process.env.NODE_ENV === 'development' && import.meta.client) {
                try {
                  const { logAuthStep } = useAuthDebug();
                  logAuthStep(processId, 'ACCESS_TOKEN_AUTH_SUCCESS', {
                    userId: user.id,
                    userEmail: user.email,
                  }, true);
                }
                catch {
                  // デバッグログでエラーが発生しても処理を継続
                }
              }

              // 自動ログイン成功時のリダイレクト処理
              const { handleAutoLoginRedirect } = useRedirect();
              // 非同期でリダイレクトを実行（初期化処理をブロックしない）
              nextTick(() => {
                handleAutoLoginRedirect().catch((error) => {
                  if (process.env.NODE_ENV === 'development' && import.meta.client) {
                    console.warn('自動ログイン後のリダイレクトに失敗:', error);
                  }
                });
              });

              return;
            }
          }
          catch (error) {
            // エラーを分類して適切に処理
            const { classifyAuthError, getErrorHandlingStrategy, logAuthError } = await import('~/utils/auth-error-handling');
            const authError = classifyAuthError(error);
            const strategy = getErrorHandlingStrategy(authError);

            // デバッグログ: アクセストークン認証エラー
            if (process.env.NODE_ENV === 'development' && import.meta.client) {
              try {
                const { logAuthStep } = useAuthDebug();
                logAuthStep(processId, 'ACCESS_TOKEN_AUTH_ERROR', {
                  errorType: authError.type,
                  errorMessage: authError.message,
                  shouldClearTokens: strategy.shouldClearTokens,
                }, false, authError.message);
              }
              catch {
                // デバッグログでエラーが発生しても処理を継続
              }
            }

            // エラーをログに記録
            logAuthError(authError, 'アクセストークンでのユーザー情報取得');

            // 認証エラーの場合はトークンをクリア
            if (strategy.shouldClearTokens) {
              accessToken.value = null;
            }

            // ネットワークエラーやサーバーエラーの場合はリフレッシュを試行しない
            if (authError.type === 'network' || authError.type === 'server') {
              // 永続化された認証状態があれば一時的にそれを使用
              if (hasPersistedAuth) {
                authState.value.isAuthenticated = true;

                // デバッグログ: 永続化状態使用
                if (process.env.NODE_ENV === 'development' && import.meta.client) {
                  try {
                    const { logAuthStep } = useAuthDebug();
                    logAuthStep(processId, 'FALLBACK_TO_PERSISTED', {
                      errorType: authError.type,
                    }, true);
                    console.log('ネットワークエラーのため永続化状態を使用');
                  }
                  catch {
                    // デバッグログでエラーが発生しても処理を継続
                  }
                }
                return;
              }
            }
          }
        }

        // アクセストークンが無効またはない場合、リフレッシュトークンで再試行
        if (refreshTokenCookie.value) {
          try {
            // デバッグログ: リフレッシュトークンでの認証開始
            if (process.env.NODE_ENV === 'development' && import.meta.client) {
              try {
                const { logAuthStep } = useAuthDebug();
                logAuthStep(processId, 'REFRESH_TOKEN_AUTH_START');
              }
              catch {
                // デバッグログでエラーが発生しても処理を継続
              }
            }

            const { retryableFetch } = await import('~/utils/auth-error-handling');

            const refreshResponse = await retryableFetch<{
              user: User;
              accessToken: string;
            }>('/api/auth/refresh', {
              method: 'POST',
            }, 1, 1000); // リトライ回数を1回に制限

            user = refreshResponse.user;

            if (user) {
              authState.value.user = user;
              authState.value.isAuthenticated = true;
              // 認証状態を永続化
              saveAuthState(true, user.email);

              // デバッグログ: リフレッシュトークン認証成功
              if (process.env.NODE_ENV === 'development' && import.meta.client) {
                try {
                  const { logAuthStep } = useAuthDebug();
                  logAuthStep(processId, 'REFRESH_TOKEN_AUTH_SUCCESS', {
                    userId: user.id,
                    userEmail: user.email,
                  }, true);
                }
                catch {
                  // デバッグログでエラーが発生しても処理を継続
                }
              }

              // 自動ログイン成功時のリダイレクト処理
              const { handleAutoLoginRedirect } = useRedirect();
              // 非同期でリダイレクトを実行（初期化処理をブロックしない）
              nextTick(() => {
                handleAutoLoginRedirect().catch((_error) => {
                  if (process.env.NODE_ENV === 'development' && import.meta.client) {
                    console.warn('自動ログイン後のリダイレクトに失敗:', _error);
                  }
                });
              });

              return;
            }
          }
          catch (refreshError: unknown) {
            // リフレッシュエラーを分類して処理
            const { classifyAuthError, getErrorHandlingStrategy, logAuthError } = await import('~/utils/auth-error-handling');
            const authError = classifyAuthError(refreshError);
            const strategy = getErrorHandlingStrategy(authError);

            // デバッグログ: リフレッシュトークン認証エラー
            if (process.env.NODE_ENV === 'development' && import.meta.client) {
              try {
                const { logAuthStep } = useAuthDebug();
                logAuthStep(processId, 'REFRESH_TOKEN_AUTH_ERROR', {
                  errorType: authError.type,
                  errorMessage: authError.message,
                  shouldClearTokens: strategy.shouldClearTokens,
                }, false, authError.message);
              }
              catch {
                // デバッグログでエラーが発生しても処理を継続
              }
            }

            // エラーをログに記録
            logAuthError(authError, 'リフレッシュトークンでの認証');

            // 認証エラーの場合は全てのトークンをクリア
            if (strategy.shouldClearTokens) {
              accessToken.value = null;
              refreshTokenCookie.value = null;
              clearAuthState();
            }

            // 認証エラーの場合は状態をクリア
            if (authError.type === 'authentication') {
              clearAuthState();
              authState.value.user = null;
              authState.value.isAuthenticated = false;
              return;
            }

            // その他のエラーの場合は永続化状態を維持
            if (hasPersistedAuth) {
              authState.value.isAuthenticated = true;

              // デバッグログ: ネットワークエラー時の永続化状態使用
              if (process.env.NODE_ENV === 'development' && import.meta.client) {
                try {
                  const { logAuthStep } = useAuthDebug();
                  logAuthStep(processId, 'NETWORK_ERROR_FALLBACK', {
                    errorType: authError.type,
                  }, true);
                }
                catch {
                  // デバッグログでエラーが発生しても処理を継続
                }
              }
              return;
            }
          }
        }

        // すべての認証試行が失敗した場合
        clearAuthState();
        authState.value.user = null;
        authState.value.isAuthenticated = false;

        // デバッグログ: 認証失敗
        if (process.env.NODE_ENV === 'development' && import.meta.client) {
          try {
            const { logAuthStep } = useAuthDebug();
            logAuthStep(processId, 'AUTH_FAILED', {}, false, 'All authentication attempts failed');
          }
          catch {
            // デバッグログでエラーが発生しても処理を継続
          }
        }
      }
      catch (error) {
        // 予期しないエラーが発生した場合
        authState.value.user = null;
        authState.value.isAuthenticated = false;

        // デバッグログ: 予期しないエラー
        if (process.env.NODE_ENV === 'development' && import.meta.client) {
          try {
            const { logAuthStep, logAuthError } = useAuthDebug();
            logAuthError(error, '認証初期化中の予期しないエラー', {
              processId,
            });
            logAuthStep(processId, 'UNEXPECTED_ERROR', {
              errorMessage: error instanceof Error ? error.message : String(error),
            }, false, 'Unexpected error during initialization');
          }
          catch {
            // デバッグログでエラーが発生しても処理を継続
            // eslint-disable-next-line no-console
            console.error('認証初期化エラー:', error);
          }
        }
      }
      finally {
        authState.value.isLoading = false;
        authState.value.isInitialized = true;
        authState.value.initializationPromise = null;

        // デバッグログ: プロセス完了
        if (process.env.NODE_ENV === 'development' && import.meta.client) {
          try {
            const { endAuthProcess } = useAuthDebug();
            endAuthProcess(processId, authState.value.isAuthenticated, {
              finalState: {
                isAuthenticated: authState.value.isAuthenticated,
                hasUser: !!authState.value.user,
                userEmail: authState.value.user?.email,
              },
            });
          }
          catch {
            // デバッグログでエラーが発生しても処理を継続
          }
        }
      }
    })();

    // 初期化Promiseを保存
    authState.value.initializationPromise = initPromise;

    return initPromise;
  };

  /**
   * Login user with email and password
   */
  const login = async (credentials: LoginCredentials) => {
    console.log('useAuth.login 開始:', credentials.email);

    // 認証プロセスの追跡を開始（クライアントサイドのみ）
    let processId = '';
    if (process.env.NODE_ENV === 'development' && import.meta.client) {
      try {
        const { startAuthProcess } = useAuthDebug();
        processId = startAuthProcess('USER_LOGIN');
      }
      catch {
        // デバッグログでエラーが発生しても処理を継続
      }
    }

    authState.value.isLoading = true;
    authState.value.error = null;

    try {
      // デバッグログ: ログイン開始
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { logAuthStep } = useAuthDebug();
          logAuthStep(processId, 'LOGIN_START', {
            email: credentials.email,
            hasPassword: !!credentials.password,
          });
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }

      if (process.env.NODE_ENV === 'development') {

      }

      // エラーハンドリング機能付きでログインを実行
      const { retryableFetch } = await import('~/utils/auth-error-handling');

      const response = await retryableFetch<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: credentials,
      }, 2, 1000);

      authState.value.user = response.user;
      authState.value.isAuthenticated = true;
      authState.value.isInitialized = true;

      // 認証状態を永続化
      saveAuthState(true, response.user.email);

      // デバッグログ: ログイン成功
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { logAuthStep } = useAuthDebug();
          logAuthStep(processId, 'LOGIN_SUCCESS', {
            userId: response.user.id,
            userEmail: response.user.email,
          }, true);
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }

      // ログイン成功時のリダイレクト処理は呼び出し元で処理
      // （login関数の呼び出し元でhandleLoginRedirectを実行）

      return response;
    }
    catch (error: unknown) {
      // 改善されたエラーメッセージを使用
      const { getAuthErrorInfo, formatAuthError } = await import('~/utils/auth-error-messages');
      const { logAuthError } = await import('~/utils/auth-error-handling');

      // エラー情報を取得
      const errorInfo = getAuthErrorInfo(error);

      // デバッグログ: ログインエラー
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { logAuthStep } = useAuthDebug();
          logAuthStep(processId, 'LOGIN_ERROR', {
            errorType: errorInfo.type,
            errorMessage: errorInfo.message,
            email: credentials.email,
          }, false, errorInfo.message);
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }

      // エラーをログに記録
      logAuthError({
        type: errorInfo.type === 'validation' || errorInfo.type === 'timeout' || errorInfo.type === 'general' ? 'unknown' : errorInfo.type,
        message: errorInfo.message,
        originalError: error,
      }, 'ユーザーログイン');

      // ユーザーフレンドリーなエラーメッセージを設定
      const userMessage = formatAuthError(error);
      authState.value.error = userMessage;

      throw new Error(userMessage);
    }
    finally {
      authState.value.isLoading = false;

      // デバッグログ: プロセス完了
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { endAuthProcess } = useAuthDebug();
          endAuthProcess(processId, authState.value.isAuthenticated, {
            finalState: {
              isAuthenticated: authState.value.isAuthenticated,
              hasUser: !!authState.value.user,
              userEmail: authState.value.user?.email,
            },
          });
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }
    }
  };

  /**
   * Register new user
   */
  const register = async (data: RegisterData) => {
    // 認証プロセスの追跡を開始
    let processId = '';
    if (process.env.NODE_ENV === 'development' && import.meta.client) {
      try {
        const { startAuthProcess } = useAuthDebug();
        processId = startAuthProcess('USER_REGISTER');
      }
      catch {
        // デバッグログでエラーが発生しても処理を継続
      }
    }

    authState.value.isLoading = true;
    authState.value.error = null;

    try {
      // デバッグログ: 登録開始
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { logAuthStep } = useAuthDebug();
          logAuthStep(processId, 'REGISTER_START', {
            email: data.email,
            hasPassword: !!data.password,
            hasName: !!data.name,
          });
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }

      // エラーハンドリング機能付きでユーザー登録を実行
      const { retryableFetch } = await import('~/utils/auth-error-handling');

      const response = await retryableFetch<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/register', {
        method: 'POST',
        body: data,
      }, 2, 1000);

      authState.value.user = response.user;
      authState.value.isAuthenticated = true;
      authState.value.isInitialized = true;

      // 認証状態を永続化
      saveAuthState(true, response.user.email);

      // デバッグログ: 登録成功
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { logAuthStep } = useAuthDebug();
          logAuthStep(processId, 'REGISTER_SUCCESS', {
            userId: response.user.id,
            userEmail: response.user.email,
          }, true);
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }

      // 登録成功時のリダイレクト処理は呼び出し元で処理
      // （register関数の呼び出し元でhandleLoginRedirectを実行）

      return response;
    }
    catch (error: unknown) {
      // 改善されたエラーメッセージを使用
      const { getAuthErrorInfo, formatAuthError } = await import('~/utils/auth-error-messages');
      const { logAuthError } = await import('~/utils/auth-error-handling');

      // エラー情報を取得
      const errorInfo = getAuthErrorInfo(error);

      // デバッグログ: 登録エラー
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { logAuthStep } = useAuthDebug();
          logAuthStep(processId, 'REGISTER_ERROR', {
            errorType: errorInfo.type,
            errorMessage: errorInfo.message,
            email: data.email,
          }, false, errorInfo.message);
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }

      // エラーをログに記録
      logAuthError({
        type: errorInfo.type === 'validation' || errorInfo.type === 'timeout' || errorInfo.type === 'general' ? 'unknown' : errorInfo.type,
        message: errorInfo.message,
        originalError: error,
      }, 'ユーザー登録');

      // ユーザーフレンドリーなエラーメッセージを設定
      const userMessage = formatAuthError(error);
      authState.value.error = userMessage;

      throw new Error(userMessage);
    }
    finally {
      authState.value.isLoading = false;

      // デバッグログ: プロセス完了
      if (process.env.NODE_ENV === 'development' && import.meta.client) {
        try {
          const { endAuthProcess } = useAuthDebug();
          endAuthProcess(processId, authState.value.isAuthenticated, {
            finalState: {
              isAuthenticated: authState.value.isAuthenticated,
              hasUser: !!authState.value.user,
              userEmail: authState.value.user?.email,
            },
          });
        }
        catch {
          // デバッグログでエラーが発生しても処理を継続
        }
      }
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    authState.value.isLoading = true;
    authState.value.error = null;

    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
      });
    }
    catch {
      // Even if logout fails on server, continue with local cleanup
    }
    finally {
      // Always clear local state and cookies
      if (import.meta.client) {
        const accessToken = useCookie('access-token');
        const refreshTokenCookie = useCookie('refresh-token');
        accessToken.value = null;
        refreshTokenCookie.value = null;

        // 永続化された認証状態もクリア
        clearAuthState();
      }

      authState.value.user = null;
      authState.value.isAuthenticated = false;
      authState.value.isLoading = false;
      authState.value.isInitialized = true; // ログアウト後も初期化済み状態を維持

      // Redirect to login page
      if (import.meta.client) {
        await navigateTo('/login');
      }
    }
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    authState.value.error = null;
  };

  /**
   * Clear all authentication tokens and state
   * Use this when you're certain the tokens are invalid
   */
  const clearTokens = () => {
    if (import.meta.client) {
      const accessToken = useCookie('access-token');
      const refreshTokenCookie = useCookie('refresh-token');
      accessToken.value = null;
      refreshTokenCookie.value = null;

      // 永続化された認証状態もクリア
      clearAuthState();
    }

    authState.value.user = null;
    authState.value.isAuthenticated = false;
    authState.value.error = null;
    authState.value.isInitialized = true; // トークンクリア後も初期化済み状態を維持
  };

  /**
   * Check if user has specific role or permission
   */
  const hasPermission = (_permission: string): boolean => {
    // For this simple app, all authenticated users have all permissions
    return authState.value.isAuthenticated;
  };

  /**
   * Refresh authentication token
   */
  const refreshToken = async () => {
    // 既にリフレッシュ中の場合は重複実行を防ぐ
    if (authState.value.isLoading) {
      throw new Error('リフレッシュ処理が既に実行中です');
    }

    authState.value.isLoading = true;

    try {
      // リフレッシュトークンの存在確認
      const refreshTokenCookie = useCookie('refresh-token');
      if (!refreshTokenCookie.value) {
        throw new Error('リフレッシュトークンが見つかりません');
      }

      // エラーハンドリング機能付きでリフレッシュを実行（リトライ回数を制限）
      const { retryableFetch } = await import('~/utils/auth-error-handling');

      const response = await retryableFetch<{
        user: User;
        accessToken: string;
      }>('/api/auth/refresh', {
        method: 'POST',
      }, 1, 1000); // リトライ回数を1回に制限

      authState.value.user = response.user;
      authState.value.isAuthenticated = true;
      authState.value.isInitialized = true;

      // 認証状態を永続化
      saveAuthState(true, response.user.email);

      return response;
    }
    catch (error: unknown) {
      // エラーを分類して適切に処理
      const { classifyAuthError, getErrorHandlingStrategy, logAuthError } = await import('~/utils/auth-error-handling');
      const authError = classifyAuthError(error);
      const strategy = getErrorHandlingStrategy(authError);

      // エラーをログに記録
      logAuthError(authError, 'トークンリフレッシュ');

      // 認証エラーの場合は状態をクリア
      if (strategy.shouldClearTokens || authError.type === 'authentication') {
        authState.value.user = null;
        authState.value.isAuthenticated = false;
        authState.value.isInitialized = true;

        if (import.meta.client) {
          const accessToken = useCookie('access-token');
          const refreshTokenCookie = useCookie('refresh-token');
          accessToken.value = null;
          refreshTokenCookie.value = null;
          clearAuthState();
        }
      }

      // ネットワークエラーやサーバーエラーの場合は状態を維持
      if (authError.type === 'network' || authError.type === 'server') {
        throw new Error(`トークンリフレッシュ一時的失敗: ${authError.message}`);
      }

      throw new Error(`トークンリフレッシュ失敗: ${authError.message}`);
    }
    finally {
      authState.value.isLoading = false;
    }
  };

  return {
    // State
    user: readonly(computed(() => authState.value.user)),
    isAuthenticated: readonly(computed(() => authState.value.isAuthenticated)),
    isLoading: readonly(computed(() => authState.value.isLoading)),
    error: readonly(computed(() => authState.value.error)),
    isInitialized: readonly(computed(() => authState.value.isInitialized)),

    // Actions
    initializeAuth,
    login,
    register,
    logout,
    clearError,
    clearTokens,
    hasPermission,
    refreshToken,
  };
};

/**
 * Alias for useAuth to maintain compatibility with existing code
 */
export const useAuthState = useAuth;
