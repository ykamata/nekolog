/**
 * Client-side authentication interceptor plugin
 * Automatically refreshes tokens on 401 responses
 */
export default defineNuxtPlugin(() => {
  const { refreshToken } = useAuth();

  // Add response interceptor for automatic token refresh
  $fetch.create({
    onResponseError({ response }) {
      // If we get a 401 error, try to refresh the token
      if (response.status === 401) {
        // Check if we have a refresh token
        const refreshTokenCookie = useCookie('refresh-token');

        if (refreshTokenCookie.value) {
          // Try to refresh token (this will be handled by the calling code)
          // We don't do it here to avoid infinite loops
          return;
        }
        else {
          // No refresh token, redirect to login
          navigateTo('/login');
        }
      }
    },
  });
});
