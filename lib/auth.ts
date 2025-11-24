import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
// import type { User } from '~/types/auth'

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production',
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
): Promise<string> {
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(JWT_EXPIRES_IN)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
): Promise<string> {
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
): Promise<TokenPair> {
  return {
    accessToken: await generateAccessToken(payload),
    refreshToken: await generateRefreshToken(payload),
  };
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
  catch {
    // Token verification failed
    return null;
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(
  authHeader: string | undefined,
): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Create secure cookie options
 */
export function getSecureCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const, // 開発環境での問題を回避するためstrictからlaxに変更
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/',
  };
}

/**
 * Create refresh token cookie options
 */
export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const, // 開発環境での問題を回避するためstrictからlaxに変更
    maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
    path: '/',
  };
}

/**
 * Debug function to test token generation and verification
 */
export async function debugTokenFlow(payload: Omit<JWTPayload, 'iat' | 'exp'>) {
  try {
    const accessToken = await generateAccessToken(payload);
    const verified = await verifyToken(accessToken);
    return { accessToken, verified };
  }
  catch {
    return null;
  }
}
