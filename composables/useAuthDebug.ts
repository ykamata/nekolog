/**
 * Debug utilities for authentication (development only)
 */
export const useAuthDebug = () => {
  const logAuthState = (context: string) => {
    if (process.env.NODE_ENV === 'development') {
      const accessToken = useCookie('access-token');
      const refreshToken = useCookie('refresh-token');

      console.log(`[AUTH DEBUG] ${context}:`, {
        hasAccessToken: !!accessToken.value,
        hasRefreshToken: !!refreshToken.value,
        accessTokenLength: accessToken.value?.length || 0,
        refreshTokenLength: refreshToken.value?.length || 0,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return {
    logAuthState,
  };
};
