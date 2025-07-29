/**
 * Authenticated fetch composable with automatic token refresh
 */
export const useAuthenticatedFetch = () => {
  const { refreshToken: refreshAuthToken } = useAuth();

  /**
   * Fetch with automatic token refresh on 401 errors
   */
  const authenticatedFetch = async <T>(url: string, options: any = {}): Promise<T> => {
    try {
      // First attempt
      return await $fetch<T>(url, options);
    }
    catch (error: any) {
      // If 401 error, try to refresh token and retry
      if (error?.response?.status === 401 || error?.statusCode === 401) {
        try {
          // Try to refresh token
          await refreshAuthToken();

          // Retry the original request
          return await $fetch<T>(url, options);
        }
        catch (refreshError) {
          // Refresh failed, redirect to login
          await navigateTo('/login');
          throw refreshError;
        }
      }

      // Re-throw non-401 errors
      throw error;
    }
  };

  return {
    authenticatedFetch,
  };
};
