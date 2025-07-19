import { AuthService, UserProfile } from '../AuthService';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn()
}));
jest.mock('jsonwebtoken');
jest.mock('ioredis');
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-session-id')
}));

// Mock fetch API
global.fetch = jest.fn();

describe('AuthService', () => {
  let authService: AuthService;
  const mockOAuth2Client = {
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    setCredentials: jest.fn()
  };
  const mockRedis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn()
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock implementations
    (OAuth2Client as jest.MockedClass<typeof OAuth2Client>).mockImplementation(() => mockOAuth2Client as any);
    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);
    (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
      if (payload.userId) return 'mock-access-token';
      return 'mock-refresh-token';
    });
    (jwt.verify as jest.Mock).mockImplementation((token, secret) => {
      if (token === 'mock-access-token') {
        return { userId: 'user123', email: 'test@example.com', sessionId: 'test-session-id' };
      }
      if (token === 'mock-refresh-token') {
        return { sessionId: 'test-session-id' };
      }
      throw new Error('Invalid token');
    });
    
    // Create instance
    authService = new AuthService();
  });

  describe('getAuthUrl', () => {
    it('should generate Google OAuth URL', () => {
      mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?test=true');
      
      const url = authService.getAuthUrl();
      
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        prompt: 'consent'
      });
      expect(url).toBe('https://accounts.google.com/o/oauth2/auth?test=true');
    });
  });

  describe('handleCallback', () => {
    it('should exchange code for tokens and user profile', async () => {
      // Mock responses
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: { access_token: 'google-access-token' }
      });
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/picture.jpg'
        })
      });
      
      // Call method
      const result = await authService.handleCallback('test-code');
      
      // Verify OAuth flow
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('test-code');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({ access_token: 'google-access-token' });
      
      // Verify user profile fetch
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: 'Bearer google-access-token' } }
      );
      
      // Verify token generation
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'session:test-session-id',
        expect.any(String),
        'EX',
        expect.any(Number)
      );
      
      // Verify result
      expect(result).toEqual({
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: expect.any(Number)
        },
        profile: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/picture.jpg'
        }
      });
    });

    it('should handle errors during authentication', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('OAuth error'));
      
      await expect(authService.handleCallback('invalid-code')).rejects.toThrow('Failed to authenticate with Google');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode valid token', () => {
      const result = authService.verifyToken('mock-access-token');
      
      expect(jwt.verify).toHaveBeenCalledWith('mock-access-token', expect.any(String));
      expect(result).toEqual({
        userId: 'user123',
        email: 'test@example.com',
        sessionId: 'test-session-id'
      });
    });

    it('should throw error for invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token with valid refresh token', async () => {
      // Mock session data in Redis
      mockRedis.get.mockResolvedValue(JSON.stringify({
        profile: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        }
      }));
      
      const result = await authService.refreshAccessToken('mock-refresh-token');
      
      expect(jwt.verify).toHaveBeenCalledWith('mock-refresh-token', expect.any(String));
      expect(mockRedis.get).toHaveBeenCalledWith('session:test-session-id');
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: expect.any(Number)
      });
    });

    it('should return null for invalid session', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await authService.refreshAccessToken('mock-refresh-token');
      
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should invalidate session', async () => {
      mockRedis.del.mockResolvedValue(1);
      
      const result = await authService.logout('test-session-id');
      
      expect(mockRedis.del).toHaveBeenCalledWith('session:test-session-id');
      expect(result).toBe(true);
    });

    it('should handle logout errors', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));
      
      const result = await authService.logout('test-session-id');
      
      expect(result).toBe(false);
    });
  });

  describe('getUserProjectPermission', () => {
    it('should return user permission for project', async () => {
      mockRedis.get.mockResolvedValue('admin');
      
      const result = await authService.getUserProjectPermission('user123', 'project123');
      
      expect(mockRedis.get).toHaveBeenCalledWith('permission:user123:project123');
      expect(result).toBe('admin');
    });

    it('should return null when user has no permission', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await authService.getUserProjectPermission('user123', 'project123');
      
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await authService.getUserProjectPermission('user123', 'project123');
      
      expect(result).toBeNull();
    });
  });

  describe('setUserProjectPermission', () => {
    it('should set user permission for project', async () => {
      mockRedis.set.mockResolvedValue('OK');
      
      const result = await authService.setUserProjectPermission('user123', 'project123', 'edit');
      
      expect(mockRedis.set).toHaveBeenCalledWith('permission:user123:project123', 'edit');
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));
      
      const result = await authService.setUserProjectPermission('user123', 'project123', 'edit');
      
      expect(result).toBe(false);
    });
  });

  describe('removeUserProjectPermission', () => {
    it('should remove user permission for project', async () => {
      mockRedis.del.mockResolvedValue(1);
      
      const result = await authService.removeUserProjectPermission('user123', 'project123');
      
      expect(mockRedis.del).toHaveBeenCalledWith('permission:user123:project123');
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));
      
      const result = await authService.removeUserProjectPermission('user123', 'project123');
      
      expect(result).toBe(false);
    });
  });

  describe('checkEntityAccess', () => {
    it('should return true when user has project access', async () => {
      mockRedis.get.mockResolvedValue('edit');
      
      const result = await authService.checkEntityAccess('user123', 'project123', 'shot', 'shot123');
      
      expect(mockRedis.get).toHaveBeenCalledWith('permission:user123:project123');
      expect(result).toBe(true);
    });

    it('should return false when user has no project access', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await authService.checkEntityAccess('user123', 'project123', 'shot', 'shot123');
      
      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await authService.checkEntityAccess('user123', 'project123', 'shot', 'shot123');
      
      expect(result).toBe(false);
    });
  });

  describe('getProjectMembers', () => {
    it('should return all project members', async () => {
      mockRedis.keys.mockResolvedValue(['permission:user1:project123', 'permission:user2:project123']);
      mockRedis.get.mockImplementation(async (key) => {
        if (key === 'permission:user1:project123') return 'admin';
        if (key === 'permission:user2:project123') return 'edit';
        return null;
      });
      
      const result = await authService.getProjectMembers('project123');
      
      expect(mockRedis.keys).toHaveBeenCalledWith('permission:*:project123');
      expect(result).toEqual([
        { userId: 'user1', projectId: 'project123', permission: 'admin' },
        { userId: 'user2', projectId: 'project123', permission: 'edit' }
      ]);
    });

    it('should handle errors', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));
      
      const result = await authService.getProjectMembers('project123');
      
      expect(result).toEqual([]);
    });
  });
});