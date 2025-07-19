import request from 'supertest';
import express from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { authService } from '../../services/auth/AuthService';
import authRouter from '../../routes/auth';
import membersRouter from '../../routes/members';
import { authenticate } from '../../middleware/auth';
import { requireAdminPermission, requireEditPermission, requireViewPermission } from '../../middleware/authorization';

// Mock Redis
jest.mock('ioredis');

describe('Authorization Integration Tests', () => {
  let app: express.Application;
  let server: Server;
  let mockRedis: any;
  
  // Test users
  const adminUser = { userId: 'admin123', email: 'admin@example.com', sessionId: 'admin-session' };
  const editorUser = { userId: 'editor123', email: 'editor@example.com', sessionId: 'editor-session' };
  const viewerUser = { userId: 'viewer123', email: 'viewer@example.com', sessionId: 'viewer-session' };
  const unauthorizedUser = { userId: 'unauthorized123', email: 'unauthorized@example.com', sessionId: 'unauthorized-session' };
  
  // Test tokens
  const adminToken = jwt.sign(adminUser, 'test-secret');
  const editorToken = jwt.sign(editorUser, 'test-secret');
  const viewerToken = jwt.sign(viewerUser, 'test-secret');
  const unauthorizedToken = jwt.sign(unauthorizedUser, 'test-secret');

  beforeAll(() => {
    // Setup mock Redis
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    };
    
    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);
    
    // Setup test permissions
    mockRedis.get.mockImplementation(async (key: string) => {
      if (key === 'permission:admin123:project123') return 'admin';
      if (key === 'permission:editor123:project123') return 'edit';
      if (key === 'permission:viewer123:project123') return 'view';
      if (key === 'session:admin-session') return JSON.stringify({ profile: adminUser });
      if (key === 'session:editor-session') return JSON.stringify({ profile: editorUser });
      if (key === 'session:viewer-session') return JSON.stringify({ profile: viewerUser });
      return null;
    });
    
    mockRedis.keys.mockResolvedValue([
      'permission:admin123:project123',
      'permission:editor123:project123',
      'permission:viewer123:project123'
    ]);
    
    // Mock the authService methods directly for the tests
    jest.spyOn(authService, 'getUserProjectPermission').mockImplementation(async (userId, projectId) => {
      if (userId === 'admin123' && projectId === 'project123') return 'admin';
      if (userId === 'editor123' && projectId === 'project123') return 'edit';
      if (userId === 'viewer123' && projectId === 'project123') return 'view';
      return null;
    });
    
    jest.spyOn(authService, 'checkEntityAccess').mockResolvedValue(true);
    jest.spyOn(authService, 'getProjectMembers').mockResolvedValue([
      { userId: 'admin123', projectId: 'project123', permission: 'admin' },
      { userId: 'editor123', projectId: 'project123', permission: 'edit' },
      { userId: 'viewer123', projectId: 'project123', permission: 'view' }
    ]);
    jest.spyOn(authService, 'setUserProjectPermission').mockResolvedValue(true);
    jest.spyOn(authService, 'removeUserProjectPermission').mockResolvedValue(true);
    
    // Mock JWT verification
    jest.spyOn(jwt, 'verify').mockImplementation((token: string) => {
      if (token === adminToken) return adminUser;
      if (token === editorToken) return editorUser;
      if (token === viewerToken) return viewerUser;
      if (token === unauthorizedToken) return unauthorizedUser;
      throw new Error('Invalid token');
    });
    
    // Setup test routes
    app = express();
    app.use(express.json());
    
    // Auth routes
    app.use('/auth', authRouter);
    
    // Member management routes
    app.use('/api', membersRouter);
    
    // Test routes with different permission requirements
    app.get('/api/admin-only', authenticate, requireAdminPermission('project123'), (req, res) => {
      res.json({ message: 'Admin access granted', user: req.user });
    });
    
    app.get('/api/edit-or-admin', authenticate, requireEditPermission('project123'), (req, res) => {
      res.json({ message: 'Edit access granted', user: req.user });
    });
    
    app.get('/api/view-or-higher', authenticate, requireViewPermission('project123'), (req, res) => {
      res.json({ message: 'View access granted', user: req.user });
    });
    
    // Start server
    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
    jest.restoreAllMocks();
  });

  describe('Permission-based access control', () => {
    it('should allow admin access to admin-only endpoint', async () => {
      const response = await request(app)
        .get('/api/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin access granted');
    });
    
    it('should deny editor access to admin-only endpoint', async () => {
      const response = await request(app)
        .get('/api/admin-only')
        .set('Authorization', `Bearer ${editorToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('This action requires admin permission');
    });
    
    it('should allow admin and editor access to edit-or-admin endpoint', async () => {
      const adminResponse = await request(app)
        .get('/api/edit-or-admin')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const editorResponse = await request(app)
        .get('/api/edit-or-admin')
        .set('Authorization', `Bearer ${editorToken}`);
      
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.message).toBe('Edit access granted');
      
      expect(editorResponse.status).toBe(200);
      expect(editorResponse.body.message).toBe('Edit access granted');
    });
    
    it('should deny viewer access to edit-or-admin endpoint', async () => {
      const response = await request(app)
        .get('/api/edit-or-admin')
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('This action requires edit permission');
    });
    
    it('should allow all authenticated users with permissions to access view-or-higher endpoint', async () => {
      const adminResponse = await request(app)
        .get('/api/view-or-higher')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const editorResponse = await request(app)
        .get('/api/view-or-higher')
        .set('Authorization', `Bearer ${editorToken}`);
      
      const viewerResponse = await request(app)
        .get('/api/view-or-higher')
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.message).toBe('View access granted');
      
      expect(editorResponse.status).toBe(200);
      expect(editorResponse.body.message).toBe('View access granted');
      
      expect(viewerResponse.status).toBe(200);
      expect(viewerResponse.body.message).toBe('View access granted');
    });
    
    it('should deny access to users without project permissions', async () => {
      const response = await request(app)
        .get('/api/view-or-higher')
        .set('Authorization', `Bearer ${unauthorizedToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this project');
    });
    
    it('should deny access to unauthenticated users', async () => {
      const response = await request(app)
        .get('/api/view-or-higher');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Project member management', () => {
    it('should allow admin to get project members', async () => {
      const response = await request(app)
        .get('/api/projects/project123/members')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.members).toHaveLength(3);
      expect(response.body.members).toEqual(expect.arrayContaining([
        { userId: 'admin123', projectId: 'project123', permission: 'admin' },
        { userId: 'editor123', projectId: 'project123', permission: 'edit' },
        { userId: 'viewer123', projectId: 'project123', permission: 'view' }
      ]));
    });
    
    it('should allow editor to get project members', async () => {
      const response = await request(app)
        .get('/api/projects/project123/members')
        .set('Authorization', `Bearer ${editorToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.members).toHaveLength(3);
    });
    
    it('should allow viewer to get project members', async () => {
      const response = await request(app)
        .get('/api/projects/project123/members')
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.members).toHaveLength(3);
    });
    
    it('should deny unauthorized users from getting project members', async () => {
      const response = await request(app)
        .get('/api/projects/project123/members')
        .set('Authorization', `Bearer ${unauthorizedToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this project');
    });
    
    it('should allow admin to add new project member', async () => {
      const response = await request(app)
        .post('/api/projects/project123/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-mock-permission', 'admin') // For the mock authorization middleware
        .send({
          userId: 'newuser123',
          permission: 'view'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Member added successfully');
      expect(authService.setUserProjectPermission).toHaveBeenCalledWith('newuser123', 'project123', 'view');
    });
    
    it('should deny editor from adding new project member', async () => {
      const response = await request(app)
        .post('/api/projects/project123/members')
        .set('Authorization', `Bearer ${editorToken}`)
        .set('x-mock-permission', 'edit') // For the mock authorization middleware
        .send({
          userId: 'newuser123',
          permission: 'view'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('This action requires admin permission');
    });
    
    it('should allow admin to update member permission', async () => {
      const response = await request(app)
        .put('/api/projects/project123/members/viewer123')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-mock-permission', 'admin') // For the mock authorization middleware
        .send({
          permission: 'edit'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Member updated successfully');
      expect(authService.setUserProjectPermission).toHaveBeenCalledWith('viewer123', 'project123', 'edit');
    });
    
    it('should allow admin to remove project member', async () => {
      const response = await request(app)
        .delete('/api/projects/project123/members/viewer123')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-mock-permission', 'admin'); // For the mock authorization middleware
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Member removed successfully');
      expect(authService.removeUserProjectPermission).toHaveBeenCalledWith('viewer123', 'project123');
    });
  });
});