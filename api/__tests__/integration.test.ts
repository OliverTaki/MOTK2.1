import request from 'supertest';
import app from '../server';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        message: 'MOTK API is running'
      });
    });
  });

  describe('Sheets API Routes', () => {
    it('should have sheets routes mounted', async () => {
      // This will return 503 because we don't have actual Google Sheets credentials
      // but it confirms the route is mounted and accessible
      const response = await request(app)
        .get('/api/sheets/TestSheet')
        .expect(503);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Unable to connect to Google Sheets API');
    });

    it('should validate sheet name format', async () => {
      const response = await request(app)
        .get('/api/sheets/Invalid@Sheet!')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid sheet name format'
      });
    });

    it('should validate required fields for cell updates', async () => {
      const response = await request(app)
        .put('/api/sheets/TestSheet/cell')
        .send({ newValue: 'test' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'entityId and fieldId are required'
      });
    });
  });

  describe('Other API Routes', () => {
    it('should have auth routes mounted', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .expect(501);

      expect(response.body).toEqual({
        message: 'Not implemented yet'
      });
    });

    it('should have entities routes mounted', async () => {
      const response = await request(app)
        .get('/api/entities/shots')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'List of shots entities will be returned here');
    });

    it('should have projects routes mounted', async () => {
      const response = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: 'test-project',
          storage_provider: 'gdrive',
          originals_root_url: 'https://drive.google.com/folders/originals',
          proxies_root_url: 'https://drive.google.com/folders/proxies'
        })
        .expect(503); // Will fail with connection error, but route is mounted

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Unable to connect to Google Sheets API');
    });

    it('should have files routes mounted', async () => {
      const response = await request(app)
        .get('/api/files/entity_001/test.jpg')
        .expect(501);

      expect(response.body).toEqual({
        message: 'Not implemented yet'
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);
    });
  });
});