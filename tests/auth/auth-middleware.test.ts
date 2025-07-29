import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, optionalAuth } from '~/middleware/auth';
import { generateAccessToken } from '~/lib/auth';

// Mock Nuxt utilities
const mockCreateError = vi.fn((options) => {
  const error = new Error(options.statusMessage);
  (error as any).statusCode = options.statusCode;
  return error;
});
const mockGetHeader = vi.fn();
const mockGetCookie = vi.fn();

vi.mock('#imports', () => ({
  createError: mockCreateError,
  getHeader: mockGetHeader,
  getCookie: mockGetCookie,
}));

// Mock global functions that would be available in Nuxt runtime
global.createError = mockCreateError;
global.getHeader = mockGetHeader;
global.getCookie = mockGetCookie;

describe('Auth Middleware', () => {
  const mockPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  const validToken = generateAccessToken(mockPayload);

  beforeEach(() => {
    vi.clearAllMocks();
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
