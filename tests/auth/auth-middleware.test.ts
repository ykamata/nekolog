import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, optionalAuth } from '~/lib/auth-middleware';
import { generateAccessToken } from '~/lib/auth';

// Mock Nuxt utilities
const mockCreateError = vi.fn((options) => {
  const error = new Error(options.statusMessage);
  (error as any).statusCode = options.statusCode;
  return error;
});
const mockGetHeader = vi.fn();
const mockGetCookie = vi.fn();
const mockSetCookie = vi.fn();

// Mock H3 functions
vi.mock('h3', () => ({
  createError: mockCreateError,
  getHeader: mockGetHeader,
  getCookie: mockGetCookie,
  setCookie: mockSetCookie,
}));

// Mock Prisma
vi.mock('~/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock global functions that would be available in Nuxt runtime
(global as any).createError = mockCreateError;
(global as any).getHeader = mockGetHeader;
(global as any).getCookie = mockGetCookie;
(global as unknown).setCookie = mockSetCookie;

describe('Auth Middleware', () => {
  const mockPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  let validToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    validToken = await generateAccessToken(mockPayload);
  });

  describe('requireAuth', () => {
    it('should authenticate with valid Authorization header', async () => {
      const mockEvent = {
        context: {},
      };

      // Mock getHeader to return Bearer token
      mockGetHeader.mockReturnValue(`Bearer ${validToken}`);

      const result = await requireAuth(mockEvent);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockPayload.userId);
      expect(result.email).toBe(mockPayload.email);
      expect(mockEvent.context.user).toBeDefined();
    });

    it('should authenticate with valid cookie', async () => {
      const mockEvent = {
        context: {},
      };

      // Mock getHeader to return null (no Authorization header)
      // Mock getCookie to return valid token
      mockGetHeader.mockReturnValue(undefined);
      mockGetCookie.mockReturnValue(validToken);

      const result = await requireAuth(mockEvent);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockPayload.userId);
      expect(result.email).toBe(mockPayload.email);
    });

    it('should throw error when no token provided', async () => {
      const mockEvent = {
        context: {},
      };

      // Mock both getHeader and getCookie to return null
      mockGetHeader.mockReturnValue(undefined);
      mockGetCookie.mockReturnValue(null);

      await expect(requireAuth(mockEvent)).rejects.toThrow(
        'Authentication required',
      );
    });

    it('should throw error with invalid token', async () => {
      const mockEvent = {
        context: {},
      };

      // Mock getHeader to return invalid token
      mockGetHeader.mockReturnValue('Bearer invalid-token');

      await expect(requireAuth(mockEvent)).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });

  describe('optionalAuth', () => {
    it('should return user data when authenticated', async () => {
      const mockEvent = {
        context: {},
      };

      // Mock getHeader to return Bearer token
      mockGetHeader.mockReturnValue(`Bearer ${validToken}`);

      const result = await optionalAuth(mockEvent);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockPayload.userId);
      expect(result?.email).toBe(mockPayload.email);
    });

    it('should return null when not authenticated', async () => {
      const mockEvent = {
        context: {},
      };

      // Mock both getHeader and getCookie to return null
      mockGetHeader.mockReturnValue(undefined);
      mockGetCookie.mockReturnValue(null);

      const result = await optionalAuth(mockEvent);

      expect(result).toBeNull();
    });

    it('should return null with invalid token', async () => {
      const mockEvent = {
        context: {},
      };

      // Mock getHeader to return invalid token
      mockGetHeader.mockReturnValue('Bearer invalid-token');

      const result = await optionalAuth(mockEvent);

      expect(result).toBeNull();
    });
  });
});
