import {
  verifyToken,
  generateAccessToken,
  getSecureCookieOptions,
} from '~/lib/auth';
import { prisma } from '~/lib/prisma';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Get refresh token from cookies
    const refreshToken = getCookie(event, 'refresh-token');

    if (!refreshToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Refresh token not found',
      });
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken);
    if (!payload) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid refresh token',
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      });
    }

    // Generate new access token
    const newAccessToken = await generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    // Set new access token cookie
    setCookie(event, 'access-token', newAccessToken, getSecureCookieOptions());

    return {
      user,
      accessToken: newAccessToken,
    };
  }
  catch (error) {
    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
