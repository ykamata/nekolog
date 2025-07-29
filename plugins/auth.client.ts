/**
 * Client-side authentication plugin
 * Provides authentication state management and user session handling
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuth();

  // Try to restore session from cookies on client-side
  if (import.meta.client) {
    // Check if we have any tokens before attempting initialization
    const accessToken = useCookie('access-token');
    const refreshToken = useCookie('refresh-token');

    if (accessToken.value || refreshToken.value) {
      try {
        await auth.initializeAuth();
      }
      catch (error) {
        // Initialization failed, but don't clear tokens
        // Let the user try again or let middleware handle it
      }
    }
  }

  // Provide auth state globally
  return {
    provide: {
      auth,
    },
  };
});
