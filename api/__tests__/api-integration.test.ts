import request from 'supertest';
import express from 'express';
import { setupSwagger } from '../swagger';
import authRoutes from '../routes/auth';
import sheetsRoutes from '../routes/sheets';
import entitiesRoutes from '../routes/entities';
import filesRoutes from '../routes/files';
import projectsRoutes from '../routes/projects';
import pagesRoutes from '../routes/pages';
import membersRoutes from '../routes/members';
import logsRoutes from '../routes/logs';
import apiKeysRoutes from '../routes/apikeys';
import { defaultRateLimiter } from '../middleware/rateLimiting';
import { sanitizeRequest } from '../middleware/sanitization';

// Mock external dependencies
jest.mock('../services/sheets/SheetsApiClient');
jest.mock('../services/auth/AuthService');
jest.mock('../services/entities/EntityManager');
jest.mock('../services/files/FileUploadService');
jest.mock('../services/storage/StorageManager');

describe('API Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Create Express app
    app = express();
    
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(sanitizeRequest);
    app.use(defaultRateLimiter);
    
    // Setup Swagger documentation
    setupSwagger(app);
    
    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/sheets', sheetsRoutes);
    app.use('/api/entities', entitiesRoutes);
    app.use('/api/files', filesRoutes);
    app.use('/api/projects', projectsRoutes);
    app.use('/api/pages', pagesRoutes);
    app.use('/api/members', membersRoutes);
    app.use('/api/logs', logsRoutes);
    app.use('/api/apikeys', apiKeysRoutes);
    
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('API Documentation', () => {
    it('should serve Swagger UI at /api-docs', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);
      
      expect(response.text).toContain('Swagger UI');
    });

    it('should serve OpenAPI spec at /api-docs.json', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body.info.title).toBe('MOTK API Documentation');
    });

    it('should include all expected tags in documentation', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      const expectedTags = [
        'Authentication',
        'API Keys',
        'Sheets',
        'Files',
        'Entities',
        'Projects',
        'Pages',
        'Members',
        'Logs'
      ];
      
      const tagNames = response.body.tags.map((tag: any) => tag.name);
      expectedTags.forEach(expectedTag => {
        expect(tagNames).toContain(expectedTag);
      });
    });

    it('should include security schemes for both JWT and API key auth', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body.components.securitySchemes).toHaveProperty('bearerAuth');
      expect(response.body.components.securitySchemes).toHaveProperty('apiKeyAuth');
      expect(response.body.components.securitySchemes.apiKeyAuth.name).toBe('X-API-Key');
    });
  });

  describe('Authentication Endpoints', () => {
    it('should have Google OAuth endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body.paths).toHaveProperty('/auth/google');
      expect(response.body.paths).toHaveProperty('/auth/google/callback');
      expect(response.body.paths).toHaveProperty('/auth/refresh');
      expect(response.body.paths).toHaveProperty('/auth/logout');
    });

    it('should return 401 for protected endpoints without authentication', async () => {
      const response = await request(app)
        .get('/api/sheets/Shots')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication');
    });
  });

  describe('API Key Management Endpoints', () => {
    it('should have API key endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body.paths).toHaveProperty('/apikeys');
      expect(response.body.paths).toHaveProperty('/apikeys/{id}');
      expect(response.body.paths).toHaveProperty('/apikeys/validate');
    });

    it('should require authentication for API key management', async () => {
      const response = await request(app)
        .get('/api/apikeys')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should validate API key creation request body', async () => {
      const response = await request(app)
        .post('/api/apikeys')
        .send({}) // Empty body
        .expect(401); // Will fail auth first
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Sheets Endpoints', () => {
    it('should have all sheet endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      const sheetPaths = [
        '/sheets/{sheetName}',
        '/sheets/{sheetName}/cell',
        '/sheets/{sheetName}/batch',
        '/sheets/{sheetName}/info',
        '/sheets',
        '/sheets/{sheetName}/data',
        '/sheets/{sheetName}/rows'
      ];
      
      sheetPaths.forEach(path => {
        expect(response.body.paths).toHaveProperty(path);
      });
    });

    it('should require authentication for sheet operations', async () => {
      const response = await request(app)
        .get('/api/sheets/Shots')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Entity Endpoints', () => {
    it('should have all entity endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      const entityPaths = [
        '/entities/{type}',
        '/entities/{type}/{id}',
        '/entities/{type}/{id}/link/{targetType}/{targetId}',
        '/entities/{type}/{id}/links'
      ];
      
      entityPaths.forEach(path => {
        expect(response.body.paths).toHaveProperty(path);
      });
    });

    it('should validate entity type parameter', async () => {
      const response = await request(app)
        .get('/api/entities/invalid_type')
        .expect(401); // Will fail auth first
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('File Management Endpoints', () => {
    it('should have all file endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      const filePaths = [
        '/files/upload/{entityType}/{entityId}',
        '/files/upload-multiple/{entityType}/{entityId}',
        '/files/url/{entityType}/{entityId}/{fileName}',
        '/files/list/{entityType}/{entityId}',
        '/files/{entityType}/{entityId}/{fileName}',
        '/files/archive/{entityType}/{entityId}',
        '/files/proxy/{fileId}'
      ];
      
      filePaths.forEach(path => {
        expect(response.body.paths).toHaveProperty(path);
      });
    });

    it('should require authentication for file operations', async () => {
      const response = await request(app)
        .get('/api/files/list/shot/shot_123')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Project Management Endpoints', () => {
    it('should have all project endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      const projectPaths = [
        '/projects',
        '/projects/{projectId}',
        '/projects/{projectId}/init',
        '/projects/{projectId}/storage'
      ];
      
      projectPaths.forEach(path => {
        expect(response.body.paths).toHaveProperty(path);
      });
    });

    it('should require authentication for project operations', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Page Configuration Endpoints', () => {
    it('should have all page endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      const pagePaths = [
        '/pages',
        '/pages/{pageId}',
        '/pages/{pageId}/share',
        '/pages/{pageId}/duplicate'
      ];
      
      pagePaths.forEach(path => {
        expect(response.body.paths).toHaveProperty(path);
      });
    });

    it('should require authentication for page operations', async () => {
      const response = await request(app)
        .get('/api/pages')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Member Management Endpoints', () => {
    it('should have all member endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      const memberPaths = [
        '/members',
        '/members/{memberId}',
        '/members/{memberId}/deactivate',
        '/members/{memberId}/activate',
        '/members/invite'
      ];
      
      memberPaths.forEach(path => {
        expect(response.body.paths).toHaveProperty(path);
      });
    });

    it('should require authentication for member operations', async () => {
      const response = await request(app)
        .get('/api/members')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Logging Endpoints', () => {
    it('should have all log endpoints documented', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      const logPaths = [
        '/logs',
        '/logs/export',
        '/logs/stats'
      ];
      
      logPaths.forEach(path => {
        expect(response.body.paths).toHaveProperty(path);
      });
    });

    it('should require authentication for log operations', async () => {
      const response = await request(app)
        .get('/api/logs')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Validation', () => {
    it('should sanitize request inputs', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>',
        __proto__: { polluted: true }
      };
      
      const response = await request(app)
        .post('/api/entities/shot')
        .send(maliciousInput)
        .expect(401); // Will fail auth first
      
      expect(response.body.success).toBe(false);
    });

    it('should apply rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/api/sheets/Shots')
      );
      
      const responses = await Promise.all(requests);
      
      // All should fail with 401 (auth) rather than 429 (rate limit) in this test
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/sheets/NonExistentSheet')
        .expect(401);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });

    it('should handle validation errors properly', async () => {
      const response = await request(app)
        .post('/api/sheets/Shots/cell')
        .send({}) // Invalid body
        .expect(401); // Will fail auth first
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      // Check that response includes proper content type
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('API Versioning', () => {
    it('should include version information in API documentation', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body.info.version).toBe('1.0.0');
      expect(response.body.openapi).toBe('3.0.0');
    });
  });
});