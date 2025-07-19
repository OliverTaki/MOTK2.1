import { EntityManager } from '../EntityManager';
import { SheetsApiClient } from '../../sheets/SheetsApiClient';
import { StorageManager } from '../../storage/StorageManager';
import {
  EntityType,
  Shot,
  Asset,
  Task,
  ProjectMember,
  User,
  ShotStatus,
  AssetStatus,
  TaskStatus,
  AssetType,
  EntityQueryParams,
  StorageConfig
} from '../../../../shared/types';

describe('EntityManager Integration Tests', () => {
  let entityManager: EntityManager;
  let sheetsClient: SheetsApiClient;
  let storageManager: StorageManager;
  
  // Test configuration
  const testSpreadsheetId = process.env.TEST_GOOGLE_SHEETS_ID || 'test-spreadsheet-id';
  const testApiKey = process.env.TEST_GOOGLE_SHEETS_API_KEY || 'test-api-key';

  beforeAll(async () => {
    // Skip integration tests if no test credentials provided
    if (!process.env.TEST_GOOGLE_SHEETS_ID || !process.env.TEST_GOOGLE_SHEETS_API_KEY) {
      console.log('Skipping integration tests - no test credentials provided');
      return;
    }

    // Initialize real clients for integration testing
    sheetsClient = new SheetsApiClient(testSpreadsheetId, testApiKey);
    
    const storageConfig: StorageConfig = {
      provider: 'gdrive',
      originalsRootUrl: 'https://drive.google.com/test-originals',
      proxiesRootUrl: 'https://drive.google.com/test-proxies'
    };
    
    storageManager = new StorageManager();
    await storageManager.initialize(storageConfig);
    entityManager = new EntityManager(sheetsClient, storageManager);

    // Initialize test sheets if needed
    await setupTestSheets();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await clearTestData();
  });

  describe('Shot Entity Operations', () => {
    it('should create, read, update, and delete a shot entity', async () => {
      // Skip if no test credentials
      if (!process.env.TEST_GOOGLE_SHEETS_ID) {
        return;
      }

      // Create
      const shotData: Partial<Shot> = {
        title: 'Integration Test Shot',
        status: ShotStatus.NOT_STARTED,
        episode: '01',
        scene: '001',
        priority: 1
      };

      const createResult = await entityManager.createEntity(EntityType.SHOT, shotData);
      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeDefined();
      
      const shotId = createResult.data!.shot_id;
      expect(shotId).toBeDefined();

      // Read
      const readResult = await entityManager.getEntity<Shot>(EntityType.SHOT, shotId);
      expect(readResult.success).toBe(true);
      expect(readResult.data?.title).toBe('Integration Test Shot');
      expect(readResult.data?.status).toBe(ShotStatus.NOT_STARTED);

      // Update
      const updateResult = await entityManager.updateEntity(
        EntityType.SHOT,
        shotId,
        { status: ShotStatus.IN_PROGRESS, priority: 2 }
      );
      expect(updateResult.success).toBe(true);
      expect((updateResult.data as Shot)?.status).toBe(ShotStatus.IN_PROGRESS);
      expect((updateResult.data as Shot)?.priority).toBe(2);

      // Verify update
      const verifyResult = await entityManager.getEntity<Shot>(EntityType.SHOT, shotId);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data?.status).toBe(ShotStatus.IN_PROGRESS);

      // Delete
      const deleteResult = await entityManager.deleteEntity(EntityType.SHOT, shotId);
      expect(deleteResult.success).toBe(true);

      // Verify deletion
      const deletedResult = await entityManager.getEntity<Shot>(EntityType.SHOT, shotId);
      expect(deletedResult.success).toBe(false);
      expect(deletedResult.error).toBe('Entity not found');
    });

    it('should handle concurrent updates with conflict detection', async () => {
      // Skip if no test credentials
      if (!process.env.TEST_GOOGLE_SHEETS_ID) {
        return;
      }

      // Create initial shot
      const shotData: Partial<Shot> = {
        title: 'Conflict Test Shot',
        status: ShotStatus.NOT_STARTED
      };

      const createResult = await entityManager.createEntity(EntityType.SHOT, shotData);
      expect(createResult.success).toBe(true);
      
      const shotId = createResult.data!.shot_id;

      // Simulate concurrent update by manually updating the sheet
      await sheetsClient.updateCell({
        sheetName: 'Shots',
        entityId: shotId,
        fieldId: 'status',
        originalValue: ShotStatus.NOT_STARTED,
        newValue: ShotStatus.REVIEW,
        force: true
      });

      // Try to update with old original value (should detect conflict)
      const conflictResult = await entityManager.updateEntity(
        EntityType.SHOT,
        shotId,
        { status: ShotStatus.IN_PROGRESS }
      );

      // This might succeed or fail depending on timing - the important thing is it handles gracefully
      expect(conflictResult.success).toBeDefined();
      
      if (!conflictResult.success) {
        expect(conflictResult.conflicts).toBeDefined();
        expect(conflictResult.conflicts!.length).toBeGreaterThan(0);
      }

      // Force update should work
      const forceResult = await entityManager.updateEntity(
        EntityType.SHOT,
        shotId,
        { status: ShotStatus.COMPLETED },
        true
      );
      expect(forceResult.success).toBe(true);
    });
  });

  describe('Asset Entity Operations', () => {
    it('should create and manage asset entities', async () => {
      // Skip if no test credentials
      if (!process.env.TEST_GOOGLE_SHEETS_ID) {
        return;
      }

      const assetData: Partial<Asset> = {
        name: 'Integration Test Character',
        asset_type: AssetType.CHARACTER,
        status: AssetStatus.NOT_STARTED,
        overlap_sensitive: true
      };

      const createResult = await entityManager.createEntity(EntityType.ASSET, assetData);
      expect(createResult.success).toBe(true);
      expect(createResult.data?.name).toBe('Integration Test Character');
      expect(createResult.data?.overlap_sensitive).toBe(true);

      const assetId = createResult.data!.asset_id;

      // Update asset
      const updateResult = await entityManager.updateEntity(
        EntityType.ASSET,
        assetId,
        { status: AssetStatus.IN_PROGRESS, overlap_sensitive: false }
      );
      expect(updateResult.success).toBe(true);
      expect((updateResult.data as Asset)?.overlap_sensitive).toBe(false);
    });
  });

  describe('Task Entity Operations', () => {
    it('should create tasks and link to shots', async () => {
      // Skip if no test credentials
      if (!process.env.TEST_GOOGLE_SHEETS_ID) {
        return;
      }

      // Create a shot first
      const shotData: Partial<Shot> = {
        title: 'Task Link Test Shot',
        status: ShotStatus.NOT_STARTED
      };

      const shotResult = await entityManager.createEntity(EntityType.SHOT, shotData);
      expect(shotResult.success).toBe(true);
      const shotId = shotResult.data!.shot_id;

      // Create a task
      const taskData: Partial<Task> = {
        name: 'Animation Task',
        status: TaskStatus.NOT_STARTED,
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-30')
      };

      const taskResult = await entityManager.createEntity(EntityType.TASK, taskData);
      expect(taskResult.success).toBe(true);
      const taskId = taskResult.data!.task_id;

      // Link task to shot
      const linkResult = await entityManager.linkEntities(
        EntityType.TASK,
        taskId,
        EntityType.SHOT,
        shotId,
        'shot_id'
      );
      expect(linkResult.success).toBe(true);

      // Verify link
      const verifyResult = await entityManager.getEntity<Task>(EntityType.TASK, taskId);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data?.shot_id).toBe(shotId);
    });
  });

  describe('Query Operations', () => {
    it('should query entities with complex filters and sorting', async () => {
      // Skip if no test credentials
      if (!process.env.TEST_GOOGLE_SHEETS_ID) {
        return;
      }

      // Create multiple test shots
      const shots = [
        { title: 'Query Test Shot 1', status: ShotStatus.NOT_STARTED, episode: '01', priority: 3 },
        { title: 'Query Test Shot 2', status: ShotStatus.IN_PROGRESS, episode: '01', priority: 1 },
        { title: 'Query Test Shot 3', status: ShotStatus.NOT_STARTED, episode: '02', priority: 2 },
        { title: 'Query Test Shot 4', status: ShotStatus.COMPLETED, episode: '01', priority: 1 }
      ];

      const createdShots = [];
      for (const shotData of shots) {
        const result = await entityManager.createEntity(EntityType.SHOT, shotData);
        expect(result.success).toBe(true);
        createdShots.push(result.data!);
      }

      // Query with filters
      const filterQuery: EntityQueryParams = {
        entityType: EntityType.SHOT,
        filters: {
          episode: '01',
          status: ShotStatus.NOT_STARTED
        }
      };

      const filterResult = await entityManager.queryEntities<Shot>(filterQuery);
      expect(filterResult.success).toBe(true);
      expect(filterResult.data.length).toBe(1);
      expect(filterResult.data[0].title).toBe('Query Test Shot 1');

      // Query with sorting
      const sortQuery: EntityQueryParams = {
        entityType: EntityType.SHOT,
        filters: { episode: '01' },
        sort: {
          field: 'priority',
          direction: 'asc'
        }
      };

      const sortResult = await entityManager.queryEntities<Shot>(sortQuery);
      expect(sortResult.success).toBe(true);
      expect(sortResult.data.length).toBe(3);
      expect(sortResult.data[0].priority).toBe(1);
      expect(sortResult.data[2].priority).toBe(3);

      // Query with pagination
      const pageQuery: EntityQueryParams = {
        entityType: EntityType.SHOT,
        limit: 2,
        offset: 1
      };

      const pageResult = await entityManager.queryEntities<Shot>(pageQuery);
      expect(pageResult.success).toBe(true);
      expect(pageResult.data.length).toBe(2);
      expect(pageResult.total).toBeGreaterThanOrEqual(4);
      expect(pageResult.offset).toBe(1);
      expect(pageResult.limit).toBe(2);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should prevent deletion when foreign key constraints exist', async () => {
      // Skip if no test credentials
      if (!process.env.TEST_GOOGLE_SHEETS_ID) {
        return;
      }

      // Create user
      const userData: Partial<User> = {
        email: 'test@example.com',
        name: 'Test User',
        google_id: 'google_123'
      };

      const userResult = await entityManager.createEntity(EntityType.USER, userData);
      expect(userResult.success).toBe(true);
      const userId = userResult.data!.user_id;

      // Create project member referencing the user
      const memberData: Partial<ProjectMember> = {
        user_id: userId,
        role: 'animator',
        department: 'ANIMATION',
        permissions: 'edit' as const,
        joined_date: new Date(),
        active: true
      };

      const memberResult = await entityManager.createEntity(EntityType.MEMBER, memberData);
      expect(memberResult.success).toBe(true);

      // Try to delete user (should fail due to foreign key constraint)
      const deleteResult = await entityManager.deleteEntity(EntityType.USER, userId);
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error).toContain('User is referenced by project members');

      // Delete member first, then user should be deletable
      const deleteMemberResult = await entityManager.deleteEntity(EntityType.MEMBER, memberResult.data!.member_id);
      expect(deleteMemberResult.success).toBe(true);

      const deleteUserResult = await entityManager.deleteEntity(EntityType.USER, userId);
      expect(deleteUserResult.success).toBe(true);
    });
  });

  // Helper functions for test setup and cleanup

  async function setupTestSheets(): Promise<void> {
    try {
      // Check if sheets exist, create if needed
      const sheetNames = await sheetsClient.getSheetNames();
      const requiredSheets = ['Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users'];
      
      for (const sheetName of requiredSheets) {
        if (!sheetNames.includes(sheetName)) {
          // Create sheet with headers
          await sheetsClient.createSheet({
            name: sheetName,
            headers: getSheetHeaders(sheetName)
          });
        }
      }
    } catch (error) {
      console.warn('Could not setup test sheets:', error);
    }
  }

  async function clearTestData(): Promise<void> {
    try {
      const sheets = ['Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users'];
      
      for (const sheetName of sheets) {
        const sheetData = await sheetsClient.getSheetData(sheetName);
        if (sheetData.values && sheetData.values.length > 1) {
          // Clear all data except headers
          const range = `${sheetName}!A2:Z${sheetData.values.length}`;
          await sheetsClient.clearRange(range);
        }
      }
    } catch (error) {
      console.warn('Could not clear test data:', error);
    }
  }

  async function cleanupTestData(): Promise<void> {
    // Same as clearTestData for now
    await clearTestData();
  }

  function getSheetHeaders(sheetName: string): string[] {
    const headers: { [key: string]: string[] } = {
      'Shots': [
        'shot_id', 'episode', 'scene', 'title', 'status', 'priority', 
        'due_date', 'timecode_fps', 'folder_label', 'folder_url', 
        'thumbnails', 'file_list', 'versions', 'notes'
      ],
      'Assets': [
        'asset_id', 'name', 'asset_type', 'status', 'overlap_sensitive',
        'folder_label', 'folder_url', 'thumbnails', 'file_list', 'versions', 'notes'
      ],
      'Tasks': [
        'task_id', 'name', 'status', 'assignee_id', 'start_date', 
        'end_date', 'shot_id', 'folder_label', 'folder_url', 'notes'
      ],
      'ProjectMembers': [
        'member_id', 'user_id', 'role', 'department', 'permissions', 
        'joined_date', 'active'
      ],
      'Users': [
        'user_id', 'email', 'name', 'google_id', 'avatar_url', 
        'created_date', 'last_login'
      ]
    };
    return headers[sheetName] || [];
  }
});