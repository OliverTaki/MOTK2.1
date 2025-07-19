import request from 'supertest';
import express from 'express';
import authRouter from '../auth';
import { authService } from '../../services/auth/AuthService';

// Mock AuthService
jest.mock('../../services/auth/AuthService', () => ({
  authService: {
    getAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
    refreshAccessToken: jest.fn(),
    logout: jest.fn(),
    verifyToken: jest.fn()
  }
}));

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = {
      userId: 'user123',
      email: 'test@example.com',
      sessionId: 'session123'
    };
    next();
  }
}));

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
  });

  describe('GET /auth/google', () => {
    it('should return Google OAuth URL', async () => {
      // Mock implementation
      (authService.getAuthUrl as jest.Mock).mockReturnValue('https://accounts.google.com/o/oauth2/auth?test=true');
      
      // Execute request
      const response = await request(app).get('/auth/google');
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ authUrl: 'https://accounts.google.com/o/oauth2/auth?test=true' });
      expect(authService.getAuthUrl).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Mock implementation
      (authService.getAuthUrl as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to generate URL');
      });
      
      // Execute request
      const response = await request(app).get('/auth/google');
      
      // Verify response
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to generate authentication URL' });
    });
  });

  describe('GET /auth/google/callback', () => {
    it('should handle OAuth callback successfully', async () => {
      // Mock implementation
      (authService.handleCallback as jest.Mock).mockResolvedValue({
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600
        },
        profile: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/picture.jpg'
        }
      });
      
      // Execute request
      const response = await request(app).get('/auth/google/callback?code=test-code');
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/picture.jpg'
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600
        }
      });
      expect(authService.handleCallback).toHaveBeenCalledWith('test-code');
    });

    it('should return 400 when code is missing', async () => {
      // Execute request
      const response = await request(app).get('/auth/google/callback');
      
      // Verify response
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Authorization code is required' });
    });

    it('should handle authentication errors', async () => {
      // Mock implementation
      (authService.handleCallback as jest.Mock).mockRejectedValue(new Error('Authentication failed'));
      
      // Execute request
      const response = await request(app).get('/auth/google/callback?code=invalid-code');
      
      // Verify response
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Authentication failed' });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      // Mock implementation
      (authService.refreshAccessToken as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      });
      
      // Execute request
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600
        }
      });
      expect(authService.refreshAccessToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should return 400 when refresh token is missing', async () => {
      // Execute request
      const response = await request(app).post('/auth/refresh').send({});
      
      // Verify response
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Refresh token is required' });
    });

    it('should return 401 when refresh token is invalid', async () => {
      // Mock implementation
      (authService.refreshAccessToken as jest.Mock).mockResolvedValue(null);
      
      // Execute request
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });
      
      // Verify response
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid or expired refresh token' });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      // Mock implementation
      (authService.logout as jest.Mock).mockResolvedValue(true);
      
      // Execute request
      const response = await request(app).post('/auth/logout');
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Logged out successfully' });
      expect(authService.logout).toHaveBeenCalledWith('session123');
    });

    it('should handle logout errors', async () => {
      // Mock implementation
      (authService.logout as jest.Mock).mockResolvedValue(false);
      
      // Execute request
      const response = await request(app).post('/auth/logout');
      
      // Verify response
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to logout' });
    });
  });
});