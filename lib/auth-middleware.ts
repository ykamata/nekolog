import type { H3Event } from 'h3';
import { verifyToken, extractTokenFromHeader, generateAccessToken, getSecureCookieOptions } from '~/lib/auth';
import type { JWTPayload } from '~/lib/auth';
import { prisma } from '~/lib/prisma';

/**
 * Authentication middleware for API routes
 * Verifies JWT token from Authorization header or cookies
 * Automatically refreshes access token if expired but refresh token is valid
 */
export async function requireAuth(event: H3Event): Promise<JWTPayload> {
  // Try to get token from Authorization header first
  let token = extractTokenFromHeader(getHeader(event, 'authorization'));

  // If no token in header, try to get from cookies
  if (!token) {
    token = getCookie(event, 'access-token') || null;
  }

  // If no access token, check for refresh token
  if (!token) {
    const refreshToken = getCookie(event, 'refresh-token');
    if (refreshToken) {
      const refreshedToken = await tryRefreshToken(event, refreshToken);
      if (refreshedToken) {
        token = refreshedToken;
      }
    }
  }

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    });
  }

  let payload = await verifyToken(token);

  // If token is invalid/expired, try to refresh it
  if (!payload) {
    const refreshToken = getCookie(event, 'refresh-token');
    if (refreshToken) {
      const refreshedToken = await tryRefreshToken(event, refreshToken);
      if (refreshedToken) {
        payload = await verifyToken(refreshedToken);
      }
    }
  }

  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired token',
    });
  }

  // Add user info to event context for use in API handlers
  event.context.user = payload;

  return payload;
}

/**
 * Try to refresh access token using refresh token
 */
async function tryRefreshToken(event: H3Event, refreshToken: string): Promise<string | null> {
  try {
    // Verify refresh token
    const refreshPayload = await verifyToken(refreshToken);
    if (!refreshPayload) {
      return null;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: refreshPayload.userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return null;
    }

    // Generate new access token
    const newAccessToken = await generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    // Set new access token cookie
    setCookie(event, 'access-token', newAccessToken, getSecureCookieOptions());

    return newAccessToken;
  }
  catch {
    // Refresh failed, return null
    return null;
  }
}

/**
 * Optional authentication middleware
 * Returns user info if authenticated, null otherwise
 */
export async function optionalAuth(event: H3Event): Promise<JWTPayload | null> {
  try {
    return await requireAuth(event);
  }
  catch {
    return null;
  }
}
