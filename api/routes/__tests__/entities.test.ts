import request from 'supertest';
import express from 'express';
import entitiesRouter from '../entities';
import { EntityType, ShotStatus, AssetType, TaskStatus } from '../../../shared/types';

describe('Entity Routes - Basic Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/entities', entitiesRouter);
  });

  describe('Route Validation', () => {
    it('should return 400 for invalid entity type', async () => {
      const response = await request(app)
        .get('/api/entities/invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid entity type. Must be one of: shot, asset, task, member, user'
      });
    });

    it('should return 400 for missing required fields in shot creation', async () => {
      const response = await request(app)
        .post('/api/entities/shot')
        .send({ episode: '01' }) // Missing title
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Shot title is required'
      });
    });

    it('should return 400 for missing required fields in asset creation', async () => {
      const response = await request(app)
        .post('/api/entities/asset')
        .send({ asset_type: AssetType.CHARACTER }) // Missing name
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Asset name is required'
      });
    });

    it('should return 400 for missing required fields in task creation', async () => {
      const response = await request(app)
        .post('/api/entities/task')
        .send({ status: TaskStatus.NOT_STARTED }) // Missing name
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Task name is required'
      });
    });

    it('should return 400 for missing required fields in member creation', async () => {
      const response = await request(app)
        .post('/api/entities/member')
        .send({ role: 'animator' }) // Missing user_id
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Member user_id is required'
      });
    });

    it('should return 400 for missing required fields in user creation', async () => {
      const response = await request(app)
        .post('/api/entities/user')
        .send({ name: 'Test User' }) // Missing email
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User email is required'
      });
    });

    it('should return 400 for invalid request body type', async () => {
      const response = await request(app)
        .post('/api/entities/shot')
        .send('')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Request body must contain entity data'
      });
    });

    it('should return 400 for empty request body in update', async () => {
      const response = await request(app)
        .put('/api/entities/shot/shot_123')
        .send()
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Request body must contain update data'
      });
    });

    it('should return 400 when linkField is missing in entity linking', async () => {
      const response = await request(app)
        .post('/api/entities/task/task_123/link/user/user_456')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'linkField is required in request body'
      });
    });

    it('should return 400 for invalid target entity type in linking', async () => {
      const response = await request(app)
        .post('/api/entities/task/task_123/link/invalid/target_456')
        .send({ linkField: 'assignee_id' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid target entity type. Must be one of: shot, asset, task, member, user'
      });
    });
  });

  describe('Route Structure', () => {
    it('should accept valid entity types', async () => {
      const validTypes = ['shot', 'asset', 'task', 'member', 'user'];
      
      for (const type of validTypes) {
        // These will fail with 503 (service unavailable) but that means the route validation passed
        const response = await request(app)
          .get(`/api/entities/${type}`)
          .expect(503);
        
        expect(response.body.error).toBe('Unable to connect to Google Sheets API');
      }
    });

    it('should handle query parameters for pagination', async () => {
      const response = await request(app)
        .get('/api/entities/shot')
        .query({
          limit: '10',
          offset: '5',
          sort_field: 'title',
          sort_direction: 'asc'
        })
        .expect(503); // Service unavailable due to no Google Sheets connection

      expect(response.body.error).toBe('Unable to connect to Google Sheets API');
    });

    it('should handle force parameter in updates', async () => {
      const response = await request(app)
        .put('/api/entities/shot/shot_123')
        .query({ force: 'true' })
        .send({ title: 'Updated Title' })
        .expect(503); // Service unavailable due to no Google Sheets connection

      expect(response.body.error).toBe('Unable to connect to Google Sheets API');
    });
  });
});