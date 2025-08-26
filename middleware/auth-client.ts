/**
 * Client-side route middleware to check if user is authenticated
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check for login page to prevent infinite redirects
  if (to.path === '/login') {
    return;
  }

  const { isAuthenticated, initializeAuth, refreshToken } = useAuth();

  // Initialize auth state if not already done
  if (!isAuthenticated.value) {
    try {
      await initializeAuth();
    }
    catch (error) {
      // If initialization fails, redirect to login
      console.warn('認証初期化に失敗:', error);
      return navigateTo('/login');
    }
  }

  // If still not authenticated after initialization, try refresh token once more
  if (!isAuthenticated.value) {
    const refreshTokenCookie = useCookie('refresh-token');
    const accessToken = useCookie('access-token');

    // Only try refresh if we have a refresh token and no access token
    if (refreshTokenCookie.value && !accessToken.value) {
      try {
        await refreshToken();
        // If refresh succeeded, user should now be authenticated
        if (isAuthenticated.value) {
          return; // Continue to the requested page
        }
      }
      catch (error: unknown) {
        // Clear tokens on refresh failure to prevent retry loops
        refreshTokenCookie.value = null;
        accessToken.value = null;

        console.warn('トークンリフレッシュに失敗:', error);
        return navigateTo('/login');
      }
    }

    // If we have no tokens at all, redirect to login
    if (!accessToken.value && !refreshTokenCookie.value) {
      return navigateTo('/login');
    }

    // If we still have tokens but are not authenticated, there might be a temporary issue
    // Let the user stay on the page but they'll see the unauthenticated state
    if (accessToken.value || refreshTokenCookie.value) {
      console.warn('トークンは存在しますが認証状態が無効です');
      return;
    }

    // Fallback: redirect to login
    return navigateTo('/login');
  }
});
