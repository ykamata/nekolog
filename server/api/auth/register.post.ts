import { z } from 'zod';
import {
  hashPassword,
  generateTokenPair,
  getSecureCookieOptions,
  getRefreshCookieOptions,
} from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { toLocalISOString } from '~/utils/cat-meal';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const { email, password, name } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User already exists',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Create user
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        createdAt: nowJST,
        updatedAt: nowJST,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseUser = {
      ...user,
      createdAt: toLocalISOString(user.createdAt),
      updatedAt: toLocalISOString(user.updatedAt),
    };

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
    };
    const { accessToken, refreshToken } = await generateTokenPair(tokenPayload);

    // Set secure cookies
    setCookie(event, 'access-token', accessToken, getSecureCookieOptions());
    setCookie(event, 'refresh-token', refreshToken, getRefreshCookieOptions());

    return {
      user: responseUser,
      accessToken,
      refreshToken,
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Registration error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
