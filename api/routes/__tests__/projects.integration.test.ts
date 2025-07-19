import request from 'supertest';
import express from 'express';
import projectsRouter from '../projects';

describe('Projects API Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create Express app with projects router
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectsRouter);
  });

  describe('Complete Project Workflow', () => {
    it('should handle complete project initialization workflow', async () => {
      // Test project initialization
      const projectData = {
        project_id: 'integration-test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/folders/originals',
        proxies_root_url: 'https://drive.google.com/folders/proxies'
      };

      // This will fail with 503 because we don't have real Google Sheets credentials
      // but it tests the complete validation and routing logic
      const initResponse = await request(app)
        .post('/api/projects/init')
        .send(projectData)
        .expect(503);

      expect(initResponse.body).toEqual({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      });
    });

    it('should handle project initialization with template', async () => {
      const projectData = {
        project_id: 'template-test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/folders/originals',
        proxies_root_url: 'https://drive.google.com/folders/proxies',
        template: 'animation_series'
      };

      // This will fail with 503 because we don't have real Google Sheets credentials
      const initResponse = await request(app)
        .post('/api/projects/init')
        .send(projectData)
        .expect(503);

      expect(initResponse.body).toEqual({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      });
    });

    it('should validate all required fields in correct order', async () => {
      // Test missing project_id
      let response = await request(app)
        .post('/api/projects/init')
        .send({
          storage_provider: 'gdrive',
          originals_root_url: 'https://example.com',
          proxies_root_url: 'https://example.com'
        })
        .expect(400);

      expect(response.body.error).toBe('project_id is required');

      // Test invalid storage_provider
      response = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: 'test',
          storage_provider: 'invalid',
          originals_root_url: 'https://example.com',
          proxies_root_url: 'https://example.com'
        })
        .expect(400);

      expect(response.body.error).toBe('storage_provider must be either "gdrive" or "box"');

      // Test missing originals_root_url
      response = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: 'test',
          storage_provider: 'gdrive',
          proxies_root_url: 'https://example.com'
        })
        .expect(400);

      expect(response.body.error).toBe('originals_root_url is required');

      // Test missing proxies_root_url
      response = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: 'test',
          storage_provider: 'gdrive',
          originals_root_url: 'https://example.com'
        })
        .expect(400);

      expect(response.body.error).toBe('proxies_root_url is required');
    });

    it('should handle project retrieval workflow', async () => {
      // This will fail with 503 because we don't have real Google Sheets credentials
      const response = await request(app)
        .get('/api/projects/test-project')
        .expect(503);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      });
    });

    it('should handle project update workflow', async () => {
      const updateData = {
        storage_provider: 'box',
        originals_root_url: 'https://box.com/folders/new-originals'
      };

      // This will fail with 503 because we don't have real Google Sheets credentials
      const response = await request(app)
        .put('/api/projects/test-project')
        .send(updateData)
        .expect(503);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      });
    });

    it('should handle project status check workflow', async () => {
      // This will fail with 503 because we don't have real Google Sheets credentials
      const response = await request(app)
        .get('/api/projects/test-project/status')
        .expect(503);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      });
    });

    it('should handle templates list workflow', async () => {
      // This should work without Google Sheets connection
      const response = await request(app)
        .get('/api/projects/templates/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('animation_series');
      expect(response.body.data).toHaveProperty('short_film');
      expect(response.body.data).toHaveProperty('commercial');
      expect(response.body.data).toHaveProperty('music_video');
      expect(response.body.message).toBe('Retrieved available project templates');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/projects/init')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/projects/init')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('project_id is required');
    });

    it('should handle very long project IDs', async () => {
      const longProjectId = 'a'.repeat(1000);
      
      const response = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: longProjectId,
          storage_provider: 'gdrive',
          originals_root_url: 'https://example.com',
          proxies_root_url: 'https://example.com'
        })
        .expect(503); // Will fail at connection, but validation passes

      expect(response.body.error).toBe('Unable to connect to Google Sheets API');
    });

    it('should handle special characters in project IDs', async () => {
      const specialProjectId = 'test-project_123.v2';
      
      const response = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: specialProjectId,
          storage_provider: 'gdrive',
          originals_root_url: 'https://example.com',
          proxies_root_url: 'https://example.com'
        })
        .expect(503); // Will fail at connection, but validation passes

      expect(response.body.error).toBe('Unable to connect to Google Sheets API');
    });
  });

  describe('API Response Format Integration', () => {
    it('should maintain consistent response format across all endpoints', async () => {
      // Test init endpoint response format
      const initResponse = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: 'test',
          storage_provider: 'gdrive',
          originals_root_url: 'https://example.com',
          proxies_root_url: 'https://example.com'
        })
        .expect(503);

      expect(initResponse.body).toHaveProperty('success');
      expect(initResponse.body).toHaveProperty('error');
      expect(initResponse.body.success).toBe(false);

      // Test get endpoint response format
      const getResponse = await request(app)
        .get('/api/projects/test-project')
        .expect(503);

      expect(getResponse.body).toHaveProperty('success');
      expect(getResponse.body).toHaveProperty('error');
      expect(getResponse.body.success).toBe(false);

      // Test templates endpoint response format (should succeed)
      const templatesResponse = await request(app)
        .get('/api/projects/templates/list')
        .expect(200);

      expect(templatesResponse.body).toHaveProperty('success');
      expect(templatesResponse.body).toHaveProperty('data');
      expect(templatesResponse.body).toHaveProperty('message');
      expect(templatesResponse.body.success).toBe(true);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous project initialization requests', async () => {
      const projectData = {
        project_id: 'concurrent-test',
        storage_provider: 'gdrive',
        originals_root_url: 'https://example.com',
        proxies_root_url: 'https://example.com'
      };

      // Send 5 concurrent requests
      const promises = Array(5).fill(null).map((_, index) => 
        request(app)
          .post('/api/projects/init')
          .send({
            ...projectData,
            project_id: `concurrent-test-${index}`
          })
      );

      const responses = await Promise.all(promises);

      // All should fail with 503 (connection error) but handle the requests properly
      responses.forEach(response => {
        expect(response.status).toBe(503);
        expect(response.body.error).toBe('Unable to connect to Google Sheets API');
      });
    });

    it('should handle mixed endpoint requests concurrently', async () => {
      const promises = [
        request(app).get('/api/projects/templates/list'),
        request(app).get('/api/projects/test-1'),
        request(app).get('/api/projects/test-2/status'),
        request(app).post('/api/projects/init').send({
          project_id: 'concurrent-init',
          storage_provider: 'gdrive',
          originals_root_url: 'https://example.com',
          proxies_root_url: 'https://example.com'
        })
      ];

      const responses = await Promise.all(promises);

      // Templates should succeed
      expect(responses[0].status).toBe(200);
      expect(responses[0].body.success).toBe(true);

      // Others should fail with 503 (connection error)
      expect(responses[1].status).toBe(503);
      expect(responses[2].status).toBe(503);
      expect(responses[3].status).toBe(503);
    });
  });
});