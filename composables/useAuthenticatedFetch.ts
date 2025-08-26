/**
 * Authenticated fetch composable with automatic token refresh and improved error handling
 */
export const useAuthenticatedFetch = () => {
  const { refreshToken: refreshAuthToken } = useAuth();

  /**
   * Fetch with automatic token refresh on 401 errors and improved error classification
   */
  const authenticatedFetch = async <T>(url: string, options: any = {}): Promise<T> => {
    try {
      // First attempt with retry capability for network errors
      const { retryableFetch } = await import('~/utils/auth-error-handling');
      const result = await retryableFetch<T>(url, options, 2, 1000);
      return result as T;
    }
    catch (error: unknown) {
      // Classify the error to determine appropriate handling
      const { classifyAuthError, getErrorHandlingStrategy, logAuthError } = await import('~/utils/auth-error-handling');
      const authError = classifyAuthError(error);
      const strategy = getErrorHandlingStrategy(authError);

      // エラーをログに記録
      logAuthError(authError, `認証付きfetch: ${url}`);

      // If authentication error, try to refresh token and retry
      if (authError.type === 'authentication') {
        try {
          // Try to refresh token
          await refreshAuthToken();

          // Retry the original request once more
          const result = await $fetch<T>(url, options);
          return result as T;
        }
        catch (refreshError) {
          // Classify refresh error
          const refreshAuthError = classifyAuthError(refreshError);

          // エラーをログに記録
          logAuthError(refreshAuthError, `トークンリフレッシュ後の再試行: ${url}`);

          // If refresh failed due to authentication issues, redirect to login
          if (refreshAuthError.type === 'authentication') {
            await navigateTo('/login');
          }

          throw refreshError;
        }
      }

      // For network errors, provide user-friendly message but don't redirect
      if (authError.type === 'network') {
        throw new Error('ネットワーク接続に問題があります。しばらく待ってから再試行してください。');
      }

      // For server errors, provide appropriate message
      if (authError.type === 'server') {
        throw new Error('サーバーで一時的な問題が発生しています。しばらく待ってから再試行してください。');
      }

      // Re-throw other errors with original message
      throw error;
    }
  };

  return {
    authenticatedFetch,
  };
};
