import request from 'supertest';
import express from 'express';
import entitiesRouter from '../entities';
import { SheetsApiClient } from '../../services/sheets/SheetsApiClient';
import { StorageManager } from '../../services/storage/StorageManager';
import { EntityType, ShotStatus, AssetType, TaskStatus } from '../../../shared/types';

describe('Entity Routes Integration Tests', () => {
  let app: express.Application;
  let sheetsClient: SheetsApiClient;
  let storageManager: StorageManager;

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/entities', entitiesRouter);

    // Initialize services
    sheetsClient = new SheetsApiClient();
    storageManager = new StorageManager();
  });

  beforeEach(async () => {
    // Skip tests if Google Sheets API is not available
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      console.log('Skipping integration tests - Google Sheets API not available');
      return;
    }
  });

  describe('Shot Entity Operations', () => {
    let createdShotId: string;

    it('should create a new shot entity', async () => {
      const shotData = {
        title: 'Integration Test Shot',
        episode: '01',
        scene: '001',
        status: ShotStatus.NOT_STARTED,
        priority: 1,
        notes: 'Test shot for integration testing'
      };

      const response = await request(app)
        .post('/api/entities/shot')
        .send(shotData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: shotData.title,
        episode: shotData.episode,
        scene: shotData.scene,
        status: shotData.status,
        priority: shotData.priority,
        notes: shotData.notes
      });
      expect(response.body.data.shot_id).toBeDefined();

      createdShotId = response.body.data.shot_id;
    });

    it('should retrieve the created shot entity', async () => {
      if (!createdShotId) {
        console.log('Skipping test - no shot created');
        return;
      }

      const response = await request(app)
        .get(`/api/entities/shot/${createdShotId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shot_id).toBe(createdShotId);
      expect(response.body.data.title).toBe('Integration Test Shot');
    });

    it('should update the shot entity', async () => {
      if (!createdShotId) {
        console.log('Skipping test - no shot created');
        return;
      }

      const updates = {
        title: 'Updated Integration Test Shot',
        status: ShotStatus.IN_PROGRESS,
        priority: 2
      };

      const response = await request(app)
        .put(`/api/entities/shot/${createdShotId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.status).toBe(updates.status);
      expect(response.body.data.priority).toBe(updates.priority);
    });

    it('should list shot entities including the created one', async () => {
      const response = await request(app)
        .get('/api/entities/shot')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toMatchObject({
        total: expect.any(Number),
        offset: 0,
        limit: 100,
        count: expect.any(Number)
      });

      if (createdShotId) {
        const createdShot = response.body.data.find((shot: any) => shot.shot_id === createdShotId);
        expect(createdShot).toBeDefined();
        expect(createdShot.title).toBe('Updated Integration Test Shot');
      }
    });

    it('should filter shot entities', async () => {
      const response = await request(app)
        .get('/api/entities/shot')
        .query({
          episode: '01',
          status: ShotStatus.IN_PROGRESS
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // All returned shots should match the filter criteria
      response.body.data.forEach((shot: any) => {
        if (shot.episode) expect(shot.episode).toBe('01');
        if (shot.status) expect(shot.status).toBe(ShotStatus.IN_PROGRESS);
      });
    });

    it('should delete the shot entity', async () => {
      if (!createdShotId) {
        console.log('Skipping test - no shot created');
        return;
      }

      const response = await request(app)
        .delete(`/api/entities/shot/${createdShotId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify the shot is deleted
      await request(app)
        .get(`/api/entities/shot/${createdShotId}`)
        .expect(404);
    });
  });

  describe('Asset Entity Operations', () => {
    let createdAssetId: string;

    it('should create a new asset entity', async () => {
      const assetData = {
        name: 'Integration Test Character',
        asset_type: AssetType.CHARACTER,
        overlap_sensitive: true,
        notes: 'Test character for integration testing'
      };

      const response = await request(app)
        .post('/api/entities/asset')
        .send(assetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: assetData.name,
        asset_type: assetData.asset_type,
        overlap_sensitive: assetData.overlap_sensitive,
        notes: assetData.notes
      });
      expect(response.body.data.asset_id).toBeDefined();

      createdAssetId = response.body.data.asset_id;
    });

    it('should retrieve and update the asset entity', async () => {
      if (!createdAssetId) {
        console.log('Skipping test - no asset created');
        return;
      }

      // Retrieve
      const getResponse = await request(app)
        .get(`/api/entities/asset/${createdAssetId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.asset_id).toBe(createdAssetId);

      // Update
      const updates = {
        name: 'Updated Integration Test Character',
        asset_type: AssetType.PROP
      };

      const updateResponse = await request(app)
        .put(`/api/entities/asset/${createdAssetId}`)
        .send(updates)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe(updates.name);
      expect(updateResponse.body.data.asset_type).toBe(updates.asset_type);
    });

    afterAll(async () => {
      // Clean up created asset
      if (createdAssetId) {
        await request(app)
          .delete(`/api/entities/asset/${createdAssetId}`)
          .catch(() => {
            // Ignore cleanup errors
          });
      }
    });
  });

  describe('Task Entity Operations', () => {
    let createdTaskId: string;
    let createdUserId: string;

    beforeAll(async () => {
      // Create a user for task assignment
      const userData = {
        email: 'test.user@example.com',
        name: 'Test User',
        google_id: 'google_test_123'
      };

      const userResponse = await request(app)
        .post('/api/entities/user')
        .send(userData);

      if (userResponse.status === 201) {
        createdUserId = userResponse.body.data.user_id;
      }
    });

    it('should create a new task entity', async () => {
      const taskData = {
        name: 'Integration Test Task',
        status: TaskStatus.NOT_STARTED,
        start_date: new Date().toISOString(),
        notes: 'Test task for integration testing'
      };

      const response = await request(app)
        .post('/api/entities/task')
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: taskData.name,
        status: taskData.status,
        notes: taskData.notes
      });
      expect(response.body.data.task_id).toBeDefined();

      createdTaskId = response.body.data.task_id;
    });

    it('should link task to user via assignee_id', async () => {
      if (!createdTaskId || !createdUserId) {
        console.log('Skipping test - missing task or user');
        return;
      }

      const response = await request(app)
        .post(`/api/entities/task/${createdTaskId}/link/user/${createdUserId}`)
        .send({ linkField: 'assignee_id' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Successfully linked');

      // Verify the link was created
      const taskResponse = await request(app)
        .get(`/api/entities/task/${createdTaskId}`)
        .expect(200);

      expect(taskResponse.body.data.assignee_id).toBe(createdUserId);
    });

    afterAll(async () => {
      // Clean up created entities
      if (createdTaskId) {
        await request(app)
          .delete(`/api/entities/task/${createdTaskId}`)
          .catch(() => {
            // Ignore cleanup errors
          });
      }
      if (createdUserId) {
        await request(app)
          .delete(`/api/entities/user/${createdUserId}`)
          .catch(() => {
            // Ignore cleanup errors
          });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid entity types', async () => {
      const response = await request(app)
        .get('/api/entities/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid entity type');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/entities/shot')
        .send({ episode: '01' }) // Missing title
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('title is required');
    });

    it('should handle non-existent entity retrieval', async () => {
      const response = await request(app)
        .get('/api/entities/shot/nonexistent_id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should handle non-existent entity update', async () => {
      const response = await request(app)
        .put('/api/entities/asset/nonexistent_id')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should handle non-existent entity deletion', async () => {
      const response = await request(app)
        .delete('/api/entities/task/nonexistent_id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Pagination and Sorting', () => {
    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/entities/shot')
        .query({
          limit: '5',
          offset: '0'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.limit).toBe(5);
      expect(response.body.meta.offset).toBe(0);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should handle sorting parameters', async () => {
      const response = await request(app)
        .get('/api/entities/shot')
        .query({
          sort_field: 'title',
          sort_direction: 'asc'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify sorting if there are multiple results
      if (response.body.data.length > 1) {
        const titles = response.body.data.map((shot: any) => shot.title).filter(Boolean);
        const sortedTitles = [...titles].sort();
        expect(titles).toEqual(sortedTitles);
      }
    });
  });
});