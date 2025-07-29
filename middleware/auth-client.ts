/**
 * Client-side route middleware to check if user is authenticated
 */
export default defineNuxtRouteMiddleware(async (_to) => {
  const { isAuthenticated, initializeAuth, refreshToken } = useAuth();

  // Initialize auth state if not already done
  if (!isAuthenticated.value) {
    await initializeAuth();
  }

  // If still not authenticated after initialization, try refresh token once more
  if (!isAuthenticated.value) {
    const refreshTokenCookie = useCookie('refresh-token');

    if (refreshTokenCookie.value) {
      try {
        await refreshToken();
        // If refresh succeeded, user should now be authenticated
        if (isAuthenticated.value) {
          return; // Continue to the requested page
        }
      }
      catch (error: unknown) {
        // Only redirect to login if we're certain the tokens are invalid
        // For network errors or temporary issues, let the user stay and try again
        if (error?.message?.includes('Token refresh failed')
          && (error?.statusCode === 401 || error?.statusCode === 403)) {
          return navigateTo('/login');
        }
      }
    }

    // If we have any tokens, don't redirect immediately - there might be a temporary issue
    const accessToken = useCookie('access-token');
    if (accessToken.value || refreshTokenCookie.value) {
      // Keep the user on the current page but show them as unauthenticated
      // They can try refreshing or the tokens might work on the next request
      return;
    }

    // No tokens at all, redirect to login
    return navigateTo('/login');
  }
});
