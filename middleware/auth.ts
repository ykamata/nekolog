/**
 * Client-side route middleware to check if user is authenticated
 * This is a simplified version that redirects to login if not authenticated
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
        if (error && typeof error === 'object' && 'message' in error
          && typeof error.message === 'string' && error.message.includes('Token refresh failed')
          && (('statusCode' in error && (error.statusCode === 401 || error.statusCode === 403)))) {
          return navigateTo('/login');
        }
      }
    }

    // If we have any tokens, don't redirect immediately - there might be a temporary issue
    const accessToken = useCookie('access-token');
    if (accessToken.value || refreshTokenCookie.value) {
      // Keep the user on the current page but show them as unauthenticated
      return;
    }

    // No tokens at all, redirect to login
    return navigateTo('/login');
  }
});
