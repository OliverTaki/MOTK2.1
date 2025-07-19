import request from 'supertest';
import express from 'express';
import membersRouter from '../members';
import { authService } from '../../services/auth/AuthService';
import { authenticate } from '../../middleware/auth';
import { PermissionLevel } from '../../middleware/authorization';

// Mock AuthService
jest.mock('../../services/auth/AuthService', () => ({
  authService: {
    getUserProjectPermission: jest.fn(),
    getProjectMembers: jest.fn(),
    setUserProjectPermission: jest.fn(),
    removeUserProjectPermission: jest.fn()
  }
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      userId: 'user123',
      email: 'test@example.com',
      sessionId: 'session123'
    };
    next();
  })
}));

// Mock authorization middleware
jest.mock('../../middleware/authorization', () => {
  const originalModule = jest.requireActual('../../middleware/authorization');
  return {
    ...originalModule,
    requireAdminPermission: jest.fn(() => (req: any, res: any, next: any) => {
      // Mock implementation that checks if user has admin permission
      const mockPermission = req.headers['x-mock-permission'];
      if (mockPermission === 'admin') {
        next();
      } else {
        res.status(403).json({ error: 'Admin permission required' });
      }
    })
  };
});

describe('Members Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(membersRouter);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /projects/:projectId/members', () => {
    it('should return project members when user has access', async () => {
      // Setup
      (authService.getUserProjectPermission as jest.Mock).mockResolvedValue('edit');
      (authService.getProjectMembers as jest.Mock).mockResolvedValue([
        { userId: 'user1', projectId: 'project123', permission: 'admin' },
        { userId: 'user2', projectId: 'project123', permission: 'edit' }
      ]);
      
      // Execute
      const response = await request(app)
        .get('/projects/project123/members');
      
      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        members: [
          { userId: 'user1', projectId: 'project123', permission: 'admin' },
          { userId: 'user2', projectId: 'project123', permission: 'edit' }
        ]
      });
      expect(authService.getUserProjectPermission).toHaveBeenCalledWith('user123', 'project123');
      expect(authService.getProjectMembers).toHaveBeenCalledWith('project123');
    });

    it('should return 403 when user has no access to project', async () => {
      // Setup
      (authService.getUserProjectPermission as jest.Mock).mockResolvedValue(null);
      
      // Execute
      const response = await request(app)
        .get('/projects/project123/members');
      
      // Verify
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'You do not have access to this project' });
      expect(authService.getProjectMembers).not.toHaveBeenCalled();
    });
  });

  describe('POST /projects/:projectId/members', () => {
    it('should add member when user has admin permission', async () => {
      // Setup
      (authService.setUserProjectPermission as jest.Mock).mockResolvedValue(true);
      
      // Execute
      const response = await request(app)
        .post('/projects/project123/members')
        .set('x-mock-permission', 'admin')
        .send({
          userId: 'newuser',
          permission: 'edit'
        });
      
      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Member added successfully' });
      expect(authService.setUserProjectPermission).toHaveBeenCalledWith(
        'newuser', 'project123', 'edit'
      );
    });

    it('should return 403 when user does not have admin permission', async () => {
      // Execute
      const response = await request(app)
        .post('/projects/project123/members')
        .set('x-mock-permission', 'edit')
        .send({
          userId: 'newuser',
          permission: 'edit'
        });
      
      // Verify
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Admin permission required' });
      expect(authService.setUserProjectPermission).not.toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      // Execute
      const response = await request(app)
        .post('/projects/project123/members')
        .set('x-mock-permission', 'admin')
        .send({
          userId: 'newuser'
          // Missing permission
        });
      
      // Verify
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'User ID and permission are required' });
      expect(authService.setUserProjectPermission).not.toHaveBeenCalled();
    });

    it('should return 400 when permission is invalid', async () => {
      // Execute
      const response = await request(app)
        .post('/projects/project123/members')
        .set('x-mock-permission', 'admin')
        .send({
          userId: 'newuser',
          permission: 'invalid'
        });
      
      // Verify
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid permission level');
      expect(authService.setUserProjectPermission).not.toHaveBeenCalled();
    });
  });

  describe('PUT /projects/:projectId/members/:userId', () => {
    it('should update member permission when user has admin permission', async () => {
      // Setup
      (authService.setUserProjectPermission as jest.Mock).mockResolvedValue(true);
      
      // Execute
      const response = await request(app)
        .put('/projects/project123/members/user456')
        .set('x-mock-permission', 'admin')
        .send({
          permission: 'view'
        });
      
      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Member updated successfully' });
      expect(authService.setUserProjectPermission).toHaveBeenCalledWith(
        'user456', 'project123', 'view'
      );
    });

    it('should return 403 when user does not have admin permission', async () => {
      // Execute
      const response = await request(app)
        .put('/projects/project123/members/user456')
        .set('x-mock-permission', 'edit')
        .send({
          permission: 'view'
        });
      
      // Verify
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Admin permission required' });
      expect(authService.setUserProjectPermission).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /projects/:projectId/members/:userId', () => {
    it('should remove member when user has admin permission', async () => {
      // Setup
      (authService.removeUserProjectPermission as jest.Mock).mockResolvedValue(true);
      
      // Execute
      const response = await request(app)
        .delete('/projects/project123/members/user456')
        .set('x-mock-permission', 'admin');
      
      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Member removed successfully' });
      expect(authService.removeUserProjectPermission).toHaveBeenCalledWith(
        'user456', 'project123'
      );
    });

    it('should return 403 when user does not have admin permission', async () => {
      // Execute
      const response = await request(app)
        .delete('/projects/project123/members/user456')
        .set('x-mock-permission', 'edit');
      
      // Verify
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Admin permission required' });
      expect(authService.removeUserProjectPermission).not.toHaveBeenCalled();
    });
  });
});