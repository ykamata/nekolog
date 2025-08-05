import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  hashPassword,
  comparePassword,
  extractTokenFromHeader,
  getSecureCookieOptions,
  getRefreshCookieOptions,
} from '~/lib/auth';

describe('Auth Utils', () => {
  const mockPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  describe('Token Generation', () => {
    it('should generate access token', async () => {
      const token = await generateAccessToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate refresh token', async () => {
      const token = await generateRefreshToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate token pair', async () => {
      const tokens = await generateTokenPair(mockPayload);
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      const token = await generateAccessToken(mockPayload);
      const decoded = await verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
    });

    it('should return null for invalid token', async () => {
      const decoded = await verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', async () => {
      // Test with a malformed token
      const decoded = await verifyToken(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      );
      expect(decoded).toBeNull();
    });
  });

  describe('Password Hashing', () => {
    const password = 'test-password-123';

    it('should hash password', async () => {
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should compare password correctly', async () => {
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(password);
      const isValid = await comparePassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Token Extraction', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(extractTokenFromHeader('Invalid header')).toBeNull();
      expect(extractTokenFromHeader('Basic token')).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });
  });

  describe('Cookie Options', () => {
    it('should return secure cookie options', () => {
      const options = getSecureCookieOptions();
      expect(options).toHaveProperty('httpOnly', true);
      expect(options).toHaveProperty('sameSite', 'strict');
      expect(options).toHaveProperty('path', '/');
      expect(options).toHaveProperty('maxAge');
      expect(typeof options.maxAge).toBe('number');
    });

    it('should return refresh cookie options', () => {
      const options = getRefreshCookieOptions();
      expect(options).toHaveProperty('httpOnly', true);
      expect(options).toHaveProperty('sameSite', 'strict');
      expect(options).toHaveProperty('path', '/');
      expect(options).toHaveProperty('maxAge');
      expect(typeof options.maxAge).toBe('number');
      expect(options.maxAge).toBeGreaterThan(getSecureCookieOptions().maxAge);
    });
  });
});
