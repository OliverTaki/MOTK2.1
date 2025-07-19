import { Request, Response } from 'express';
import { authorize, hasPermission, PermissionLevel } from '../authorization';
import { authService } from '../../services/auth/AuthService';
import { ENTITY_KIND } from '../../../shared/types';

// Mock AuthService
jest.mock('../../services/auth/AuthService', () => ({
  authService: {
    getUserProjectPermission: jest.fn(),
    checkEntityAccess: jest.fn()
  }
}));

describe('Authorization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: 'user123',
        email: 'test@example.com',
        sessionId: 'session123'
      },
      params: {
        projectId: 'project123'
      },
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true when user has higher permission than required', () => {
      expect(hasPermission(PermissionLevel.ADMIN, PermissionLevel.VIEW)).toBe(true);
      expect(hasPermission(PermissionLevel.ADMIN, PermissionLevel.EDIT)).toBe(true);
      expect(hasPermission(PermissionLevel.EDIT, PermissionLevel.VIEW)).toBe(true);
    });

    it('should return true when user has exact permission required', () => {
      expect(hasPermission(PermissionLevel.VIEW, PermissionLevel.VIEW)).toBe(true);
      expect(hasPermission(PermissionLevel.EDIT, PermissionLevel.EDIT)).toBe(true);
      expect(hasPermission(PermissionLevel.ADMIN, PermissionLevel.ADMIN)).toBe(true);
    });

    it('should return false when user has lower permission than required', () => {
      expect(hasPermission(PermissionLevel.VIEW, PermissionLevel.EDIT)).toBe(false);
      expect(hasPermission(PermissionLevel.VIEW, PermissionLevel.ADMIN)).toBe(false);
      expect(hasPermission(PermissionLevel.EDIT, PermissionLevel.ADMIN)).toBe(false);
    });
  });

  describe('authorize middleware', () => {
    it('should pass when user has sufficient permission', async () => {
      // Setup
      (authService.getUserProjectPermission as jest.Mock).mockResolvedValue('admin');
      
      const middleware = authorize({ 
        requiredPermission: PermissionLevel.EDIT,
        projectId: 'project123'
      });
      
      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(authService.getUserProjectPermission).toHaveBeenCalledWith('user123', 'project123');
      expect(mockRequest.userPermission).toBe('admin');
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Setup
      mockRequest.user = undefined;
      
      const middleware = authorize({ 
        requiredPermission: PermissionLevel.VIEW,
        projectId: 'project123'
      });
      
      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when project ID is missing', async () => {
      // Setup
      mockRequest.params = {};
      mockRequest.body = {};
      
      const middleware = authorize({ 
        requiredPermission: PermissionLevel.VIEW
      });
      
      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Project ID is required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when user has no access to project', async () => {
      // Setup
      (authService.getUserProjectPermission as jest.Mock).mockResolvedValue(null);
      
      const middleware = authorize({ 
        requiredPermission: PermissionLevel.VIEW,
        projectId: 'project123'
      });
      
      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'You do not have access to this project' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when user has insufficient permission', async () => {
      // Setup
      (authService.getUserProjectPermission as jest.Mock).mockResolvedValue('view');
      
      const middleware = authorize({ 
        requiredPermission: PermissionLevel.EDIT,
        projectId: 'project123'
      });
      
      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'This action requires edit permission' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should check entity access when entityType and entityId are provided', async () => {
      // Setup
      (authService.getUserProjectPermission as jest.Mock).mockResolvedValue('edit');
      (authService.checkEntityAccess as jest.Mock).mockResolvedValue(true);
      
      const middleware = authorize({ 
        requiredPermission: PermissionLevel.EDIT,
        projectId: 'project123',
        entityType: ENTITY_KIND.SHOT,
        entityId: 'shot123'
      });
      
      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(authService.checkEntityAccess).toHaveBeenCalledWith(
        'user123', 'project123', ENTITY_KIND.SHOT, 'shot123'
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 when user has no access to entity', async () => {
      // Setup
      (authService.getUserProjectPermission as jest.Mock).mockResolvedValue('edit');
      (authService.checkEntityAccess as jest.Mock).mockResolvedValue(false);
      
      const middleware = authorize({ 
        requiredPermission: PermissionLevel.EDIT,
        projectId: 'project123',
        entityType: ENTITY_KIND.SHOT,
        entityId: 'shot123'
      });
      
      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'You do not have access to this entity' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Setup
      (authService.getUserProjectPermission as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      const middleware = authorize({ 
        requiredPermission: PermissionLevel.VIEW,
        projectId: 'project123'
      });
      
      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authorization check failed' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});