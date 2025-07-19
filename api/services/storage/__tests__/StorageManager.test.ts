import { StorageManager } from '../StorageManager';
import { GoogleDriveProvider } from '../GoogleDriveProvider';
import { BoxProvider } from '../BoxProvider';
import { StorageConfig, EntityType } from '../../../../shared/types';

// Mock the providers
jest.mock('../GoogleDriveProvider');
jest.mock('../BoxProvider');

const MockedGoogleDriveProvider = GoogleDriveProvider as jest.MockedClass<typeof GoogleDriveProvider>;
const MockedBoxProvider = BoxProvider as jest.MockedClass<typeof BoxProvider>;

describe('StorageManager', () => {
  let storageManager: StorageManager;
  let mockProvider: any;

  const mockGDriveConfig: StorageConfig = {
    provider: 'gdrive',
    originalsRootUrl: 'https://drive.google.com/drive/folders/originals',
    proxiesRootUrl: 'https://drive.google.com/drive/folders/proxies',
    credentials: { client_email: 'test@example.com' }
  };

  const mockBoxConfig: StorageConfig = {
    provider: 'box',
    originalsRootUrl: 'https://app.box.com/folder/originals',
    proxiesRootUrl: 'https://app.box.com/folder/proxies',
    credentials: { accessToken: 'mock-token' }
  };

  beforeEach(() => {
    storageManager = new StorageManager();
    
    // Create mock provider instance
    mockProvider = {
      initialize: jest.fn(),
      createEntityFolder: jest.fn(),
      createFolder: jest.fn(),
      moveToDeleted: jest.fn(),
      generateFileUrl: jest.fn(),
      generateFolderUrl: jest.fn(),
      folderExists: jest.fn(),
      listFolder: jest.fn(),
      getFolderInfo: jest.fn(),
      getProviderType: jest.fn()
    };

    MockedGoogleDriveProvider.mockImplementation(() => mockProvider);
    MockedBoxProvider.mockImplementation(() => mockProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with valid config', async () => {
      await storageManager.initialize(mockGDriveConfig);

      expect(MockedGoogleDriveProvider).toHaveBeenCalled();
      expect(mockProvider.initialize).toHaveBeenCalledWith(mockGDriveConfig);
      expect(storageManager.isInitialized()).toBe(true);
    });

    it('should initialize with Box provider', async () => {
      await storageManager.initialize(mockBoxConfig);

      expect(MockedBoxProvider).toHaveBeenCalled();
      expect(mockProvider.initialize).toHaveBeenCalledWith(mockBoxConfig);
      expect(storageManager.isInitialized()).toBe(true);
    });

    it('should throw error for unsupported provider', async () => {
      const invalidConfig = { ...mockGDriveConfig, provider: 'invalid' as any };

      await expect(storageManager.initialize(invalidConfig))
        .rejects.toThrow('Unsupported storage provider: invalid');
    });
  });

  describe('createEntityFolder', () => {
    beforeEach(async () => {
      await storageManager.initialize(mockGDriveConfig);
    });

    it('should create entity folder through provider', async () => {
      const entityType: EntityType = 'shot';
      const entityId = 'shot_001';
      const expectedResult = {
        entityType,
        entityId,
        originalsPath: 'ORIGINALS/shot_shot_001',
        proxiesPath: 'PROXIES/shot_shot_001',
        originalsUrl: 'https://example.com/originals',
        proxiesUrl: 'https://example.com/proxies'
      };

      mockProvider.createEntityFolder.mockResolvedValue(expectedResult);

      const result = await storageManager.createEntityFolder(entityType, entityId);

      expect(mockProvider.createEntityFolder).toHaveBeenCalledWith(entityType, entityId);
      expect(result).toEqual(expectedResult);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedManager = new StorageManager();

      await expect(
        uninitializedManager.createEntityFolder('shot', 'shot_001')
      ).rejects.toThrow('Storage manager not initialized');
    });
  });

  describe('generateFileUrl', () => {
    beforeEach(async () => {
      await storageManager.initialize(mockGDriveConfig);
    });

    it('should generate file URL through provider', () => {
      const path = 'shot_001/video.mp4';
      const expectedUrl = 'https://example.com/file.mp4';

      mockProvider.generateFileUrl.mockReturnValue(expectedUrl);

      const result = storageManager.generateFileUrl(path, false);

      expect(mockProvider.generateFileUrl).toHaveBeenCalledWith(path, false);
      expect(result).toBe(expectedUrl);
    });

    it('should default isProxy to false', () => {
      const path = 'shot_001/video.mp4';
      mockProvider.generateFileUrl.mockReturnValue('url');

      storageManager.generateFileUrl(path);

      expect(mockProvider.generateFileUrl).toHaveBeenCalledWith(path, false);
    });
  });

  describe('getConfig', () => {
    it('should return null when not initialized', () => {
      expect(storageManager.getConfig()).toBeNull();
    });

    it('should return config when initialized', async () => {
      await storageManager.initialize(mockGDriveConfig);
      expect(storageManager.getConfig()).toEqual(mockGDriveConfig);
    });
  });

  describe('static utility methods', () => {
    describe('generateEntityFolderName', () => {
      it('should generate correct folder name', () => {
        const result = StorageManager.generateEntityFolderName('shot', 'shot_001');
        expect(result).toBe('shot_shot_001');
      });
    });

    describe('parseEntityFolderName', () => {
      it('should parse valid folder name', () => {
        const result = StorageManager.parseEntityFolderName('shot_shot_001');
        expect(result).toEqual({
          entityType: 'shot',
          entityId: 'shot_001'
        });
      });

      it('should handle complex entity IDs', () => {
        const result = StorageManager.parseEntityFolderName('asset_character_main_hero');
        expect(result).toEqual({
          entityType: 'asset',
          entityId: 'character_main_hero'
        });
      });

      it('should return null for invalid folder name', () => {
        expect(StorageManager.parseEntityFolderName('invalid')).toBeNull();
        expect(StorageManager.parseEntityFolderName('invalid_type_id')).toBeNull();
      });
    });

    describe('buildProxyFileName', () => {
      it('should build basic proxy file name', () => {
        const result = StorageManager.buildProxyFileName('shot_001', 'video.mp4');
        expect(result).toBe('shot_001_proxy.mp4');
      });

      it('should build proxy file name with take', () => {
        const result = StorageManager.buildProxyFileName('shot_001', 'video.mp4', 'take2');
        expect(result).toBe('shot_001_take2_proxy.mp4');
      });

      it('should build proxy file name with version', () => {
        const result = StorageManager.buildProxyFileName('shot_001', 'video.mp4', undefined, 3);
        expect(result).toBe('shot_001_v03_proxy.mp4');
      });

      it('should build proxy file name with take and version', () => {
        const result = StorageManager.buildProxyFileName('shot_001', 'video.mp4', 'final', 12);
        expect(result).toBe('shot_001_final_v12_proxy.mp4');
      });

      it('should handle files without extension', () => {
        const result = StorageManager.buildProxyFileName('shot_001', 'video');
        expect(result).toBe('shot_001_proxy.mp4');
      });
    });

    describe('parseProxyFileName', () => {
      it('should parse basic proxy file name', () => {
        const result = StorageManager.parseProxyFileName('shot_001_proxy.mp4');
        expect(result).toEqual({
          entityId: 'shot_001',
          extension: 'mp4'
        });
      });

      it('should parse proxy file name with take', () => {
        const result = StorageManager.parseProxyFileName('shot_001_take2_proxy.mp4');
        expect(result).toEqual({
          entityId: 'shot_001',
          take: 'take2',
          extension: 'mp4'
        });
      });

      it('should parse proxy file name with version', () => {
        const result = StorageManager.parseProxyFileName('shot_001_v03_proxy.mp4');
        expect(result).toEqual({
          entityId: 'shot_001',
          version: 3,
          extension: 'mp4'
        });
      });

      it('should parse proxy file name with take and version', () => {
        const result = StorageManager.parseProxyFileName('shot_001_final_v12_proxy.mov');
        expect(result).toEqual({
          entityId: 'shot_001',
          take: 'final',
          version: 12,
          extension: 'mov'
        });
      });

      it('should return null for invalid proxy file name', () => {
        expect(StorageManager.parseProxyFileName('not_a_proxy.mp4')).toEqual({
          entityId: 'not',
          take: 'a',
          extension: 'mp4'
        });
        expect(StorageManager.parseProxyFileName('shot_001.mp4')).toBeNull();
      });
    });
  });

  describe('delegation methods', () => {
    beforeEach(async () => {
      await storageManager.initialize(mockGDriveConfig);
    });

    it('should delegate createFolder to provider', async () => {
      const folderInfo = { id: '1', name: 'test', path: '/test', url: 'url' };
      mockProvider.createFolder.mockResolvedValue(folderInfo);

      const result = await storageManager.createFolder('test', 'parent');

      expect(mockProvider.createFolder).toHaveBeenCalledWith('test', 'parent');
      expect(result).toEqual(folderInfo);
    });

    it('should delegate moveToDeleted to provider', async () => {
      const metadata = { reason: 'test' };

      await storageManager.moveToDeleted('shot', 'shot_001', metadata);

      expect(mockProvider.moveToDeleted).toHaveBeenCalledWith('shot', 'shot_001', metadata);
    });

    it('should delegate folderExists to provider', async () => {
      mockProvider.folderExists.mockResolvedValue(true);

      const result = await storageManager.folderExists('/test/path');

      expect(mockProvider.folderExists).toHaveBeenCalledWith('/test/path');
      expect(result).toBe(true);
    });

    it('should delegate listFolder to provider', async () => {
      const contents = [{ id: '1', name: 'file', path: '/file', url: 'url' }];
      mockProvider.listFolder.mockResolvedValue(contents);

      const result = await storageManager.listFolder('/test');

      expect(mockProvider.listFolder).toHaveBeenCalledWith('/test');
      expect(result).toEqual(contents);
    });

    it('should delegate getFolderInfo to provider', async () => {
      const folderInfo = { id: '1', name: 'test', path: '/test', url: 'url' };
      mockProvider.getFolderInfo.mockResolvedValue(folderInfo);

      const result = await storageManager.getFolderInfo('/test');

      expect(mockProvider.getFolderInfo).toHaveBeenCalledWith('/test');
      expect(result).toEqual(folderInfo);
    });

    it('should delegate getProviderType to provider', () => {
      mockProvider.getProviderType.mockReturnValue('gdrive');

      const result = storageManager.getProviderType();

      expect(mockProvider.getProviderType).toHaveBeenCalled();
      expect(result).toBe('gdrive');
    });
  });
});