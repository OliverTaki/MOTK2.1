import { GoogleDriveProvider } from '../GoogleDriveProvider';
import { StorageConfig, EntityType } from '../../../../shared/types';
import { google } from 'googleapis';

// Mock googleapis
jest.mock('googleapis');
const mockGoogle = google as jest.Mocked<typeof google>;

describe('GoogleDriveProvider', () => {
  let provider: GoogleDriveProvider;
  let mockDrive: any;
  let mockAuth: any;

  const mockConfig: StorageConfig = {
    provider: 'gdrive',
    originalsRootUrl: 'https://drive.google.com/drive/folders/originals',
    proxiesRootUrl: 'https://drive.google.com/drive/folders/proxies',
    credentials: {
      client_email: 'test@example.com',
      private_key: 'mock-private-key'
    }
  };

  beforeEach(() => {
    provider = new GoogleDriveProvider();
    
    // Mock Google Auth
    mockAuth = {
      getClient: jest.fn()
    };
    
    // Mock Drive API
    mockDrive = {
      files: {
        create: jest.fn(),
        list: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    };

    (mockGoogle.auth as any).GoogleAuth = jest.fn().mockImplementation(() => mockAuth);
    mockGoogle.drive = jest.fn().mockReturnValue(mockDrive);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with valid config', async () => {
      // Mock finding existing root folders
      mockDrive.files.list
        .mockResolvedValueOnce({
          data: { files: [{ id: 'originals-root-id', name: 'ORIGINALS' }] }
        })
        .mockResolvedValueOnce({
          data: { files: [{ id: 'proxies-root-id', name: 'PROXIES' }] }
        });

      await provider.initialize(mockConfig);

      expect(mockGoogle.auth.GoogleAuth).toHaveBeenCalledWith({
        credentials: mockConfig.credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
      });
      expect(mockGoogle.drive).toHaveBeenCalledWith({ version: 'v3', auth: mockAuth });
    });

    it('should create root folders if they do not exist', async () => {
      // Mock no existing folders found
      mockDrive.files.list
        .mockResolvedValueOnce({ data: { files: [] } })
        .mockResolvedValueOnce({ data: { files: [] } });

      // Mock folder creation
      mockDrive.files.create
        .mockResolvedValueOnce({
          data: { id: 'new-originals-id', name: 'ORIGINALS', webViewLink: 'https://drive.google.com/originals' }
        })
        .mockResolvedValueOnce({
          data: { id: 'new-proxies-id', name: 'PROXIES', webViewLink: 'https://drive.google.com/proxies' }
        });

      // Mock getFolderPath calls
      mockDrive.files.get
        .mockResolvedValueOnce({
          data: { name: 'ORIGINALS', parents: [] }
        })
        .mockResolvedValueOnce({
          data: { name: 'PROXIES', parents: [] }
        });

      await provider.initialize(mockConfig);

      expect(mockDrive.files.create).toHaveBeenCalledTimes(2);
      expect(mockDrive.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: 'ORIGINALS',
          mimeType: 'application/vnd.google-apps.folder',
          parents: undefined
        },
        fields: 'id, name, parents, webViewLink'
      });
    });
  });

  describe('createEntityFolder', () => {
    beforeEach(async () => {
      // Initialize provider first
      mockDrive.files.list
        .mockResolvedValueOnce({
          data: { files: [{ id: 'originals-root-id', name: 'ORIGINALS' }] }
        })
        .mockResolvedValueOnce({
          data: { files: [{ id: 'proxies-root-id', name: 'PROXIES' }] }
        });

      await provider.initialize(mockConfig);
    });

    it('should create entity folders in both ORIGINALS and PROXIES', async () => {
      const entityType: EntityType = 'shot';
      const entityId = 'shot_001';
      const expectedFolderName = `${entityType}_${entityId}`;

      // Mock folder creation responses
      mockDrive.files.create
        .mockResolvedValueOnce({
          data: {
            id: 'originals-entity-folder-id',
            name: expectedFolderName,
            parents: ['originals-root-id'],
            webViewLink: 'https://drive.google.com/originals/entity'
          }
        })
        .mockResolvedValueOnce({
          data: {
            id: 'proxies-entity-folder-id',
            name: expectedFolderName,
            parents: ['proxies-root-id'],
            webViewLink: 'https://drive.google.com/proxies/entity'
          }
        });

      // Mock getFolderPath calls
      mockDrive.files.get
        .mockResolvedValueOnce({
          data: { name: expectedFolderName, parents: ['originals-root-id'] }
        })
        .mockResolvedValueOnce({
          data: { name: 'ORIGINALS', parents: [] }
        })
        .mockResolvedValueOnce({
          data: { name: expectedFolderName, parents: ['proxies-root-id'] }
        })
        .mockResolvedValueOnce({
          data: { name: 'PROXIES', parents: [] }
        });

      const result = await provider.createEntityFolder(entityType, entityId);

      expect(result).toEqual({
        entityType,
        entityId,
        originalsPath: `ORIGINALS/${expectedFolderName}`,
        proxiesPath: `PROXIES/${expectedFolderName}`,
        originalsUrl: `${mockConfig.originalsRootUrl}/ORIGINALS/${expectedFolderName}`,
        proxiesUrl: `${mockConfig.proxiesRootUrl}/PROXIES/${expectedFolderName}`
      });

      expect(mockDrive.files.create).toHaveBeenCalledTimes(2);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedProvider = new GoogleDriveProvider();
      
      await expect(
        uninitializedProvider.createEntityFolder('shot', 'shot_001')
      ).rejects.toThrow('Storage provider not initialized');
    });
  });

  describe('moveToDeleted', () => {
    beforeEach(async () => {
      // Initialize provider
      mockDrive.files.list
        .mockResolvedValueOnce({
          data: { files: [{ id: 'originals-root-id', name: 'ORIGINALS' }] }
        })
        .mockResolvedValueOnce({
          data: { files: [{ id: 'proxies-root-id', name: 'PROXIES' }] }
        });

      await provider.initialize(mockConfig);
    });

    it('should move entity folder to deleted with metadata', async () => {
      const entityType: EntityType = 'asset';
      const entityId = 'asset_001';
      const metadata = { reason: 'Project cancelled', deletedBy: 'user123' };

      // Mock finding entity folder
      mockDrive.files.list
        .mockResolvedValueOnce({
          data: {
            files: [{
              id: 'entity-folder-id',
              name: `${entityType}_${entityId}`,
              parents: ['originals-root-id'],
              webViewLink: 'https://drive.google.com/entity'
            }]
          }
        })
        // Mock finding deleted folder (doesn't exist)
        .mockResolvedValueOnce({ data: { files: [] } })
        // Mock finding proxies folder
        .mockResolvedValueOnce({
          data: {
            files: [{
              id: 'proxies-entity-folder-id',
              name: `${entityType}_${entityId}`,
              parents: ['proxies-root-id']
            }]
          }
        });

      // Mock creating deleted folder
      mockDrive.files.create
        .mockResolvedValueOnce({
          data: {
            id: 'deleted-folder-id',
            name: 'deleted',
            parents: ['originals-root-id'],
            webViewLink: 'https://drive.google.com/deleted'
          }
        })
        // Mock creating info file
        .mockResolvedValueOnce({
          data: { id: 'info-file-id', name: `${entityType}_${entityId}_info.txt` }
        });

      await provider.moveToDeleted(entityType, entityId, metadata);

      // Verify folder was moved
      expect(mockDrive.files.update).toHaveBeenCalledWith({
        fileId: 'entity-folder-id',
        addParents: 'deleted-folder-id',
        removeParents: 'originals-root-id',
        fields: 'id, parents'
      });

      // Verify proxies folder was deleted
      expect(mockDrive.files.delete).toHaveBeenCalledWith({
        fileId: 'proxies-entity-folder-id'
      });

      // Verify that files.create was called twice (deleted folder + info file)
      expect(infoFileCall).toBeDefined();
      expect(infoFileCall![0].media?.body).toContain(metadata.reason);
      expect(infoFileCall![0].media?.body).toContain(metadata.deletedBy);
    });
  });

  describe('generateFileUrl', () => {
    beforeEach(async () => {
      // Mock finding existing root folders for initialization
      mockDrive.files.list
        .mockResolvedValueOnce({
          data: { files: [{ id: 'originals-root-id', name: 'ORIGINALS' }] }
        })
        .mockResolvedValueOnce({
          data: { files: [{ id: 'proxies-root-id', name: 'PROXIES' }] }
        });

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

  describe('getProviderType', () => {
    it('should return gdrive', () => {
      expect(provider.getProviderType()).toBe('gdrive');
    });
  });
});