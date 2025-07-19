import { Request, Response } from 'express';
import { authenticate, optionalAuthenticate } from '../auth';
import { authService } from '../../services/auth/AuthService';

// Mock AuthService
jest.mock('../../services/auth/AuthService', () => ({
  authService: {
    verifyToken: jest.fn()
  }
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  describe('authenticate', () => {
    it('should pass with valid token', () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };
      
      (authService.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
        sessionId: 'session123'
      });
      
      // Execute
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({
        userId: 'user123',
        email: 'test@example.com',
        sessionId: 'session123'
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header', () => {
      // Execute
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is invalid', () => {
      // Setup
      mockRequest.headers = {
        authorization: 'InvalidFormat'
      };
      
      // Execute
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };
      
      (authService.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Execute
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('should attach user with valid token', () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };
      
      (authService.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
        sessionId: 'session123'
      });
      
      // Execute
      optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({
        userId: 'user123',
        email: 'test@example.com',
        sessionId: 'session123'
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when no authorization header', () => {
      // Execute
      optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when token verification fails', () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };
      
      (authService.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Execute
      optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});