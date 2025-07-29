import type { User } from '~/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
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
  const authState = useState<AuthState>('auth.state', () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  }));

  /**
   * Initialize authentication state from cookies
   */
  const initializeAuth = async () => {
    // Prevent multiple simultaneous initialization attempts
    if (authState.value.isLoading) {
      return;
    }

    authState.value.isLoading = true;
    authState.value.error = null;

    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      const { logAuthState } = useAuthDebug();
      logAuthState('initializeAuth start');
    }

    try {
      // Check if we have access token in cookies
      const accessToken = useCookie('access-token');
      const refreshTokenCookie = useCookie('refresh-token');

      // If no tokens at all, set unauthenticated state
      if (!accessToken.value && !refreshTokenCookie.value) {
        authState.value.user = null;
        authState.value.isAuthenticated = false;
        return;
      }

      // Try to get user info first - this will automatically refresh token if needed via middleware
      let user: User | null = null;

      try {
        user = await $fetch<User>('/api/auth/me');
      }
      catch (meError: any) {
        // If /api/auth/me fails but we have refresh token, try manual refresh
        if (refreshTokenCookie.value && (meError?.statusCode === 401 || meError?.response?.status === 401)) {
          try {
            const refreshResponse = await $fetch<{
              user: User;
              accessToken: string;
            }>('/api/auth/refresh', {
              method: 'POST',
            });

            user = refreshResponse.user;
          }
          catch (refreshError: any) {
            // Only clear tokens if refresh token is definitively invalid
            if (refreshError?.statusCode === 401 || refreshError?.statusCode === 403) {
              // Token is actually invalid, but let's be conservative and not clear immediately
              // The user might be offline or there might be a temporary server issue
            }
          }
        }
      }

      if (user) {
        authState.value.user = user;
        authState.value.isAuthenticated = true;
      }
      else {
        // Don't clear tokens here - keep them for potential future refresh attempts
        authState.value.user = null;
        authState.value.isAuthenticated = false;
      }
    }
    catch {
      // Failed to initialize auth, set to unauthenticated state but keep tokens
      authState.value.user = null;
      authState.value.isAuthenticated = false;
    }
    finally {
      authState.value.isLoading = false;

      // Debug logging (development only)
      if (process.env.NODE_ENV === 'development') {
        const { logAuthState } = useAuthDebug();
        logAuthState(`initializeAuth end - authenticated: ${authState.value.isAuthenticated}`);
      }
    }
  };

  /**
   * Login user with email and password
   */
  const login = async (credentials: LoginCredentials) => {
    authState.value.isLoading = true;
    authState.value.error = null;

    try {
      const response = await $fetch<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: credentials,
      });

      authState.value.user = response.user;
      authState.value.isAuthenticated = true;

      return response;
    }
    catch (error: any) {
      const errorMessage
        = error?.data?.message || error?.message || 'Login failed';
      authState.value.error = errorMessage;
      throw new Error(errorMessage);
    }
    finally {
      authState.value.isLoading = false;
    }
  };

  /**
   * Register new user
   */
  const register = async (data: RegisterData) => {
    authState.value.isLoading = true;
    authState.value.error = null;

    try {
      const response = await $fetch<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/register', {
        method: 'POST',
        body: data,
      });

      authState.value.user = response.user;
      authState.value.isAuthenticated = true;

      return response;
    }
    catch (error: any) {
      const errorMessage
        = error?.data?.message || error?.message || 'Registration failed';
      authState.value.error = errorMessage;
      throw new Error(errorMessage);
    }
    finally {
      authState.value.isLoading = false;
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
      const accessToken = useCookie('access-token');
      const refreshTokenCookie = useCookie('refresh-token');
      accessToken.value = null;
      refreshTokenCookie.value = null;

      authState.value.user = null;
      authState.value.isAuthenticated = false;
      authState.value.isLoading = false;

      // Redirect to login page
      await navigateTo('/login');
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
    const accessToken = useCookie('access-token');
    const refreshTokenCookie = useCookie('refresh-token');
    accessToken.value = null;
    refreshTokenCookie.value = null;

    authState.value.user = null;
    authState.value.isAuthenticated = false;
    authState.value.error = null;
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
    try {
      const response = await $fetch<{
        user: User;
        accessToken: string;
      }>('/api/auth/refresh', {
        method: 'POST',
      });

      authState.value.user = response.user;
      authState.value.isAuthenticated = true;

      return response;
    }
    catch (error: unknown) {
      authState.value.user = null;
      authState.value.isAuthenticated = false;

      // Only clear tokens if the refresh token is actually invalid (401/403)
      // Don't clear on network errors or temporary server issues
      if ((error?.response?.status === 401 || error?.statusCode === 401
        || error?.response?.status === 403 || error?.statusCode === 403)
      && error?.statusMessage?.includes('Invalid') || error?.statusMessage?.includes('expired')) {
        const accessToken = useCookie('access-token');
        const refreshTokenCookie = useCookie('refresh-token');
        accessToken.value = null;
        refreshTokenCookie.value = null;
      }

      throw new Error('Token refresh failed');
    }
  };

  return {
    // State
    user: readonly(computed(() => authState.value.user)),
    isAuthenticated: readonly(computed(() => authState.value.isAuthenticated)),
    isLoading: readonly(computed(() => authState.value.isLoading)),
    error: readonly(computed(() => authState.value.error)),

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
