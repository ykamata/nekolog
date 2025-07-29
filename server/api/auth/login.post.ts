import { z } from 'zod';
import {
  comparePassword,
  generateTokenPair,
  getSecureCookieOptions,
  getRefreshCookieOptions,
} from '~/lib/auth';
import { prisma } from '~/lib/prisma';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const { email, password } = loginSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password',
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password',
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
    };
    const { accessToken, refreshToken } = await generateTokenPair(tokenPayload);

    // Set secure cookies
    setCookie(event, 'access-token', accessToken, getSecureCookieOptions());
    setCookie(event, 'refresh-token', refreshToken, getRefreshCookieOptions());

    // Return user data and tokens (excluding password)
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
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
    console.error('Login error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
