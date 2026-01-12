import { requireAuth } from '~/lib/auth-middleware';
import { prisma } from '~/lib/prisma';
import { toLocalISOString } from '~/utils/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Require authentication
    const payload = await requireAuth(event);

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

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseUser = {
      ...user,
      createdAt: toLocalISOString(user.createdAt),
      updatedAt: toLocalISOString(user.updatedAt),
    };

    return responseUser;
  }
  catch (error) {
    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Get user error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
