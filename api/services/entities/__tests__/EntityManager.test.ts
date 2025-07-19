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
  EntityQueryParams
} from '../../../../shared/types';

// Mock dependencies
jest.mock('../../sheets/SheetsApiClient');
jest.mock('../../storage/StorageManager');

describe('EntityManager', () => {
  let entityManager: EntityManager;
  let mockSheetsClient: jest.Mocked<SheetsApiClient>;
  let mockStorageManager: jest.Mocked<StorageManager>;

  beforeEach(() => {
    mockSheetsClient = new SheetsApiClient() as jest.Mocked<SheetsApiClient>;
    mockStorageManager = new StorageManager() as jest.Mocked<StorageManager>;
    entityManager = new EntityManager(mockSheetsClient, mockStorageManager);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createEntity', () => {
    it('should create a shot entity successfully', async () => {
      const shotData: Partial<Shot> = {
        title: 'Opening Scene',
        status: ShotStatus.NOT_STARTED,
        episode: '01',
        scene: '001'
      };

      mockSheetsClient.appendRows.mockResolvedValue({
        success: true,
        updatedRange: 'Shots!A2:N2',
        updatedRows: 1
      });

      mockStorageManager.createEntityFolder.mockResolvedValue({
        entityType: EntityType.SHOT,
        entityId: 'shot_123',
        originalsPath: '/shots/shot_123/originals',
        proxiesPath: '/shots/shot_123/proxies',
        originalsUrl: 'https://drive.google.com/originals/shot_123',
        proxiesUrl: 'https://drive.google.com/proxies/shot_123'
      });

      const result = await entityManager.createEntity(EntityType.SHOT, shotData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('Opening Scene');
      expect(result.data?.shot_id).toBeDefined();
      expect(mockSheetsClient.appendRows).toHaveBeenCalledWith('Shots', expect.any(Array));
      expect(mockStorageManager.createEntityFolder).toHaveBeenCalled();
    });

    it('should create an asset entity successfully', async () => {
      const assetData: Partial<Asset> = {
        name: 'Main Character',
        asset_type: AssetType.CHARACTER,
        status: AssetStatus.NOT_STARTED
      };

      mockSheetsClient.appendRows.mockResolvedValue({
        success: true,
        updatedRange: 'Assets!A2:K2',
        updatedRows: 1
      });

      mockStorageManager.createEntityFolder.mockResolvedValue({
        entityType: EntityType.ASSET,
        entityId: 'asset_456',
        originalsPath: '/assets/asset_456/originals',
        proxiesPath: '/assets/asset_456/proxies',
        originalsUrl: 'https://drive.google.com/originals/asset_456',
        proxiesUrl: 'https://drive.google.com/proxies/asset_456'
      });

      const result = await entityManager.createEntity(EntityType.ASSET, assetData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Main Character');
      expect(result.data?.asset_id).toBeDefined();
      expect(mockSheetsClient.appendRows).toHaveBeenCalledWith('Assets', expect.any(Array));
    });

    it('should fail validation for missing required fields', async () => {
      const invalidShotData: Partial<Shot> = {
        episode: '01'
        // Missing required title field
      };

      const result = await entityManager.createEntity(EntityType.SHOT, invalidShotData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('title is required');
      expect(mockSheetsClient.appendRows).not.toHaveBeenCalled();
    });

    it('should handle sheet append failure', async () => {
      const shotData: Partial<Shot> = {
        title: 'Test Shot',
        status: ShotStatus.NOT_STARTED
      };

      mockSheetsClient.appendRows.mockResolvedValue({
        success: false
      });

      const result = await entityManager.createEntity(EntityType.SHOT, shotData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create entity');
    });
  });

  describe('getEntity', () => {
    it('should retrieve a shot entity successfully', async () => {
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status', 'episode'],
          ['shot_123', 'Opening Scene', 'not_started', '01']
        ],
        range: 'Shots!A1:D2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const result = await entityManager.getEntity<Shot>(EntityType.SHOT, 'shot_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.shot_id).toBe('shot_123');
      expect(result.data?.title).toBe('Opening Scene');
      expect(result.data?.status).toBe('not_started');
    });

    it('should return error when entity not found', async () => {
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_456', 'Other Scene', 'in_progress']
        ],
        range: 'Shots!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const result = await entityManager.getEntity<Shot>(EntityType.SHOT, 'shot_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entity not found');
    });

    it('should handle empty sheet', async () => {
      const mockSheetData = {
        values: [],
        range: 'Shots!A1:A1',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const result = await entityManager.getEntity<Shot>(EntityType.SHOT, 'shot_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entity not found');
    });
  });

  describe('updateEntity', () => {
    it('should update entity successfully without conflicts', async () => {
      // Mock getting current entity
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_123', 'Opening Scene', 'not_started']
        ],
        range: 'Shots!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      // Mock successful cell update
      mockSheetsClient.updateCell.mockResolvedValue({
        success: true,
        updatedRange: 'Shots!C2',
        updatedRows: 1,
        conflict: false
      });

      const updates: Partial<Shot> = {
        status: ShotStatus.IN_PROGRESS
      };

      const result = await entityManager.updateEntity(EntityType.SHOT, 'shot_123', updates);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(ShotStatus.IN_PROGRESS);
      expect(mockSheetsClient.updateCell).toHaveBeenCalledWith({
        sheetName: 'Shots',
        entityId: 'shot_123',
        fieldId: 'status',
        originalValue: 'not_started',
        newValue: ShotStatus.IN_PROGRESS,
        force: false
      });
    });

    it('should handle update conflicts', async () => {
      // Mock getting current entity
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_123', 'Opening Scene', 'not_started']
        ],
        range: 'Shots!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      // Mock conflict in cell update
      mockSheetsClient.updateCell.mockResolvedValue({
        success: false,
        conflict: true,
        currentValue: 'in_progress'
      });

      const updates: Partial<Shot> = {
        status: ShotStatus.COMPLETED
      };

      const result = await entityManager.updateEntity(EntityType.SHOT, 'shot_123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update conflicts detected');
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts?.length).toBe(1);
    });

    it('should force update when force flag is true', async () => {
      // Mock getting current entity
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_123', 'Opening Scene', 'not_started']
        ],
        range: 'Shots!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      // Mock successful forced update
      mockSheetsClient.updateCell.mockResolvedValue({
        success: true,
        updatedRange: 'Shots!C2',
        updatedRows: 1,
        conflict: false
      });

      const updates: Partial<Shot> = {
        status: ShotStatus.COMPLETED
      };

      const result = await entityManager.updateEntity(EntityType.SHOT, 'shot_123', updates, true);

      expect(result.success).toBe(true);
      expect(mockSheetsClient.updateCell).toHaveBeenCalledWith(
        expect.objectContaining({ force: true })
      );
    });
  });

  describe('deleteEntity', () => {
    it('should delete entity successfully', async () => {
      // Mock entity exists
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_123', 'Opening Scene', 'not_started']
        ],
        range: 'Shots!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData
        .mockResolvedValueOnce(mockSheetData) // getEntity call
        .mockResolvedValueOnce({ // queryEntities call for constraint check (empty tasks)
          values: [['task_id', 'name', 'shot_id']],
          range: 'Tasks!A1:C1',
          majorDimension: 'ROWS' as const
        })
        .mockResolvedValueOnce(mockSheetData); // getSheetData call for deleteRow
      
      mockSheetsClient.deleteRow = jest.fn().mockResolvedValue({ success: true });
      mockStorageManager.moveToDeleted = jest.fn().mockResolvedValue(undefined);

      const result = await entityManager.deleteEntity(EntityType.SHOT, 'shot_123');

      expect(result.success).toBe(true);
      expect(mockStorageManager.moveToDeleted).toHaveBeenCalledWith(EntityType.SHOT, 'shot_123');
      expect(mockSheetsClient.deleteRow).toHaveBeenCalledWith('Shots', 2);
    });

    it('should fail when entity not found', async () => {
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status']
        ],
        range: 'Shots!A1:C1',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const result = await entityManager.deleteEntity(EntityType.SHOT, 'shot_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entity not found');
      expect(mockSheetsClient.deleteRow).not.toHaveBeenCalled();
    });

    it('should prevent deletion when foreign key constraints exist', async () => {
      // Mock user exists
      const mockUserSheetData = {
        values: [
          ['user_id', 'email', 'name'],
          ['user_123', 'test@example.com', 'Test User']
        ],
        range: 'Users!A1:C2',
        majorDimension: 'ROWS' as const
      };

      // Mock member references this user
      const mockMemberSheetData = {
        values: [
          ['member_id', 'user_id', 'role'],
          ['member_456', 'user_123', 'animator']
        ],
        range: 'ProjectMembers!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData
        .mockResolvedValueOnce(mockUserSheetData) // getEntity call
        .mockResolvedValueOnce(mockMemberSheetData); // queryEntities call

      const result = await entityManager.deleteEntity(EntityType.USER, 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User is referenced by project members');
    });
  });

  describe('queryEntities', () => {
    it('should query entities with filters', async () => {
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status', 'episode'],
          ['shot_001', 'Scene 1', 'not_started', '01'],
          ['shot_002', 'Scene 2', 'in_progress', '01'],
          ['shot_003', 'Scene 3', 'not_started', '02']
        ],
        range: 'Shots!A1:D4',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const queryParams: EntityQueryParams = {
        entityType: EntityType.SHOT,
        filters: {
          episode: '01',
          status: 'not_started'
        }
      };

      const result = await entityManager.queryEntities<Shot>(queryParams);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].shot_id).toBe('shot_001');
      expect(result.total).toBe(1);
    });

    it('should query entities with sorting', async () => {
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'priority'],
          ['shot_001', 'Scene 1', '3'],
          ['shot_002', 'Scene 2', '1'],
          ['shot_003', 'Scene 3', '2']
        ],
        range: 'Shots!A1:C4',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const queryParams: EntityQueryParams = {
        entityType: EntityType.SHOT,
        sort: {
          field: 'priority',
          direction: 'asc'
        }
      };

      const result = await entityManager.queryEntities<Shot>(queryParams);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].shot_id).toBe('shot_002'); // priority 1
      expect(result.data[1].shot_id).toBe('shot_003'); // priority 2
      expect(result.data[2].shot_id).toBe('shot_001'); // priority 3
    });

    it('should query entities with pagination', async () => {
      const mockSheetData = {
        values: [
          ['shot_id', 'title'],
          ['shot_001', 'Scene 1'],
          ['shot_002', 'Scene 2'],
          ['shot_003', 'Scene 3'],
          ['shot_004', 'Scene 4'],
          ['shot_005', 'Scene 5']
        ],
        range: 'Shots!A1:B6',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const queryParams: EntityQueryParams = {
        entityType: EntityType.SHOT,
        limit: 2,
        offset: 1
      };

      const result = await entityManager.queryEntities<Shot>(queryParams);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].shot_id).toBe('shot_002');
      expect(result.data[1].shot_id).toBe('shot_003');
      expect(result.total).toBe(5);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should handle empty results', async () => {
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status']
        ],
        range: 'Shots!A1:C1',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const queryParams: EntityQueryParams = {
        entityType: EntityType.SHOT
      };

      const result = await entityManager.queryEntities<Shot>(queryParams);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('linkEntities', () => {
    it('should link entities successfully', async () => {
      // Mock target entity exists
      const mockAssetSheetData = {
        values: [
          ['asset_id', 'name'],
          ['asset_123', 'Main Character']
        ],
        range: 'Assets!A1:B2',
        majorDimension: 'ROWS' as const
      };

      // Mock source entity exists and update
      const mockTaskSheetData = {
        values: [
          ['task_id', 'name', 'asset_id'],
          ['task_456', 'Modeling Task', '']
        ],
        range: 'Tasks!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData
        .mockResolvedValueOnce(mockAssetSheetData) // getEntity for target
        .mockResolvedValueOnce(mockTaskSheetData); // getEntity for source in updateEntity

      mockSheetsClient.updateCell.mockResolvedValue({
        success: true,
        updatedRange: 'Tasks!C2',
        updatedRows: 1,
        conflict: false
      });

      const result = await entityManager.linkEntities(
        EntityType.TASK,
        'task_456',
        EntityType.ASSET,
        'asset_123',
        'asset_id'
      );

      expect(result.success).toBe(true);
      expect(mockSheetsClient.updateCell).toHaveBeenCalledWith({
        sheetName: 'Tasks',
        entityId: 'task_456',
        fieldId: 'asset_id',
        originalValue: null,
        newValue: 'asset_123',
        force: false
      });
    });

    it('should fail when target entity does not exist', async () => {
      const mockSheetData = {
        values: [
          ['asset_id', 'name']
        ],
        range: 'Assets!A1:B1',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const result = await entityManager.linkEntities(
        EntityType.TASK,
        'task_456',
        EntityType.ASSET,
        'asset_123',
        'asset_id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Target entity not found');
    });
  });

  describe('data type conversion', () => {
    it('should properly convert date fields', async () => {
      const mockSheetData = {
        values: [
          ['task_id', 'name', 'start_date', 'end_date'],
          ['task_123', 'Test Task', '2024-01-15', '2024-01-30']
        ],
        range: 'Tasks!A1:D2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const result = await entityManager.getEntity<Task>(EntityType.TASK, 'task_123');

      expect(result.success).toBe(true);
      expect(result.data?.start_date).toBeInstanceOf(Date);
      expect(result.data?.end_date).toBeInstanceOf(Date);
    });

    it('should properly convert boolean fields', async () => {
      const mockSheetData = {
        values: [
          ['asset_id', 'name', 'overlap_sensitive'],
          ['asset_123', 'Test Asset', 'true']
        ],
        range: 'Assets!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const result = await entityManager.getEntity<Asset>(EntityType.ASSET, 'asset_123');

      expect(result.success).toBe(true);
      expect(result.data?.overlap_sensitive).toBe(true);
    });

    it('should properly convert JSON fields', async () => {
      const mockThumbnails = [{ id: '1', name: 'thumb1.jpg', url: 'http://example.com/thumb1.jpg' }];
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'thumbnails'],
          ['shot_123', 'Test Shot', JSON.stringify(mockThumbnails)]
        ],
        range: 'Shots!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const result = await entityManager.getEntity<Shot>(EntityType.SHOT, 'shot_123');

      expect(result.success).toBe(true);
      expect(result.data?.thumbnails).toEqual(mockThumbnails);
    });
  });
});