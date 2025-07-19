import { BoxProvider } from '../BoxProvider';
import { StorageConfig, EntityType } from '../../../../shared/types';

describe('BoxProvider', () => {
  let provider: BoxProvider;

  const mockConfig: StorageConfig = {
    provider: 'box',
    originalsRootUrl: 'https://app.box.com/folder/originals',
    proxiesRootUrl: 'https://app.box.com/folder/proxies',
    credentials: {
      accessToken: 'mock-access-token'
    }
  };

  beforeEach(() => {
    provider = new BoxProvider();
  });

  describe('initialize', () => {
    it('should initialize with valid config', async () => {
      await provider.initialize(mockConfig);
      
      expect(provider.getProviderType()).toBe('box');
    });
  });

  describe('createEntityFolder', () => {
    beforeEach(async () => {
      await provider.initialize(mockConfig);
    });

    it('should create entity folders in both ORIGINALS and PROXIES', async () => {
      const entityType: EntityType = 'shot';
      const entityId = 'shot_001';

      const result = await provider.createEntityFolder(entityType, entityId);

      expect(result).toEqual({
        entityType,
        entityId,
        originalsPath: `ORIGINALS/${entityType}_${entityId}`,
        proxiesPath: `PROXIES/${entityType}_${entityId}`,
        originalsUrl: `${mockConfig.originalsRootUrl}/ORIGINALS/${entityType}_${entityId}`,
        proxiesUrl: `${mockConfig.proxiesRootUrl}/PROXIES/${entityType}_${entityId}`
      });
    });

    it('should throw error if not initialized', async () => {
      const uninitializedProvider = new BoxProvider();
      
      await expect(
        uninitializedProvider.createEntityFolder('shot', 'shot_001')
      ).rejects.toThrow('Storage provider not initialized');
    });
  });

  describe('createFolder', () => {
    beforeEach(async () => {
      await provider.initialize(mockConfig);
    });

    it('should create folder with generated ID', async () => {
      const folderName = 'test_folder';
      const parentId = 'parent_folder_id';

      const result = await provider.createFolder(folderName, parentId);

      expect(result.name).toBe(folderName);
      expect(result.parentId).toBe(parentId);
      expect(result.id).toMatch(/^box_folder_\d+_[a-z0-9]+$/);
      expect(result.url).toMatch(/^https:\/\/app\.box\.com\/folder\//);
    });
  });

  describe('moveToDeleted', () => {
    beforeEach(async () => {
      await provider.initialize(mockConfig);
    });

    it('should handle moving entity to deleted', async () => {
      const entityType: EntityType = 'asset';
      const entityId = 'asset_001';
      const metadata = { reason: 'Project cancelled' };

      // Should not throw error
      await expect(
        provider.moveToDeleted(entityType, entityId, metadata)
      ).resolves.not.toThrow();
    });
  });

  describe('generateFileUrl', () => {
    beforeEach(async () => {
      await provider.initialize(mockConfig);
    });

    it('should generate correct URL for originals', () => {
      const path = 'shot_001/video.mp4';
      const url = provider.generateFileUrl(path, false);
      
      expect(url).toBe(`${mockConfig.originalsRootUrl}/${path}`);
    });

    it('should generate correct URL for proxies', () => {
      const path = 'shot_001_proxy.mp4';
      const url = provider.generateFileUrl(path, true);
      
      expect(url).toBe(`${mockConfig.proxiesRootUrl}/${path}`);
    });
  });

  describe('folderExists', () => {
    beforeEach(async () => {
      await provider.initialize(mockConfig);
    });

    it('should return true for any path (simulated)', async () => {
      const exists = await provider.folderExists('any/path');
      expect(exists).toBe(true);
    });
  });

  describe('listFolder', () => {
    beforeEach(async () => {
      await provider.initialize(mockConfig);
    });

    it('should return empty array (simulated)', async () => {
      const contents = await provider.listFolder('any/path');
      expect(contents).toEqual([]);
    });
  });

  describe('getFolderInfo', () => {
    beforeEach(async () => {
      await provider.initialize(mockConfig);
    });

    it('should return folder info with generated ID', async () => {
      const path = 'test/folder/path';
      const info = await provider.getFolderInfo(path);

      expect(info.name).toBe('path');
      expect(info.path).toBe(path);
      expect(info.id).toMatch(/^box_folder_/);
      expect(info.url).toMatch(/^https:\/\/app\.box\.com\/folder\//);
    });
  });

  describe('getProviderType', () => {
    it('should return box', () => {
      expect(provider.getProviderType()).toBe('box');
    });
  });
});