import { FileUploadService } from '../FileUploadService';
import { storageManager } from '../../storage/StorageManager';
import { EntityType, FieldType } from '../../../../shared/types';

// Mock the storage manager
jest.mock('../../storage/StorageManager');

const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;

  beforeEach(() => {
    fileUploadService = new FileUploadService();
    jest.clearAllMocks();
    
    // Default mock implementations
    mockStorageManager.isInitialized.mockReturnValue(true);
    mockStorageManager.folderExists.mockResolvedValue(true);
  });

  describe('uploadFile', () => {
    const mockFileInfo = {
      id: 'file123',
      name: 'test.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
      path: 'shot_001/test.jpg',
      url: 'https://example.com/file123',
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    it('should upload file successfully', async () => {
      mockStorageManager.uploadFile.mockResolvedValue(mockFileInfo);

      const result = await fileUploadService.uploadFile(
        'shot',
        '001',
        Buffer.from('test content'),
        'test.jpg',
        'image/jpeg'
      );

      expect(result).toEqual(mockFileInfo);
      expect(mockStorageManager.uploadFile).toHaveBeenCalledWith(
        'shot',
        '001',
        expect.any(Buffer),
        'image/jpeg',
        'test.jpg',
        undefined
      );
    });

    it('should upload file to specific field', async () => {
      mockStorageManager.uploadFile.mockResolvedValue(mockFileInfo);

      await fileUploadService.uploadFile(
        'shot',
        '001',
        Buffer.from('test content'),
        'test.jpg',
        'image/jpeg',
        'thumbnails'
      );

      expect(mockStorageManager.uploadFile).toHaveBeenCalledWith(
        'shot',
        '001',
        expect.any(Buffer),
        'image/jpeg',
        'test.jpg',
        'thumbnails'
      );
    });

    it('should throw error if storage manager not initialized', async () => {
      mockStorageManager.isInitialized.mockReturnValue(false);

      await expect(
        fileUploadService.uploadFile(
          'shot',
          '001',
          Buffer.from('test content'),
          'test.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow('Storage manager not initialized');
    });

    it('should throw error for invalid entity type', async () => {
      await expect(
        fileUploadService.uploadFile(
          'invalid' as EntityType,
          '001',
          Buffer.from('test content'),
          'test.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow('Invalid entity type: invalid');
    });

    it('should throw error for invalid field name', async () => {
      await expect(
        fileUploadService.uploadFile(
          'shot',
          '001',
          Buffer.from('test content'),
          'test.jpg',
          'image/jpeg',
          'invalid'
        )
      ).rejects.toThrow('Invalid field name: invalid');
    });

    it('should create entity folder if it does not exist', async () => {
      mockStorageManager.folderExists.mockResolvedValue(false);
      mockStorageManager.createEntityFolder.mockResolvedValue({
        entityType: 'shot',
        entityId: '001',
        originalsPath: 'ORIGINALS/shot_001',
        proxiesPath: 'PROXIES/shot_001',
        originalsUrl: 'https://example.com/originals/shot_001',
        proxiesUrl: 'https://example.com/proxies/shot_001'
      });
      mockStorageManager.uploadFile.mockResolvedValue(mockFileInfo);

      await fileUploadService.uploadFile(
        'shot',
        '001',
        Buffer.from('test content'),
        'test.jpg',
        'image/jpeg'
      );

      expect(mockStorageManager.createEntityFolder).toHaveBeenCalledWith('shot', '001');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockStorageManager.fileExists.mockResolvedValue(true);
      mockStorageManager.deleteFile.mockResolvedValue(undefined);

      await fileUploadService.deleteFile('shot', '001', 'test.jpg');

      expect(mockStorageManager.fileExists).toHaveBeenCalledWith('shot', '001', 'test.jpg', undefined);
      expect(mockStorageManager.deleteFile).toHaveBeenCalledWith('shot', '001', 'test.jpg', undefined);
    });

    it('should throw error if file does not exist', async () => {
      mockStorageManager.fileExists.mockResolvedValue(false);

      await expect(
        fileUploadService.deleteFile('shot', '001', 'nonexistent.jpg')
      ).rejects.toThrow('File not found: nonexistent.jpg');
    });

    it('should throw error if storage manager not initialized', async () => {
      mockStorageManager.isInitialized.mockReturnValue(false);

      await expect(
        fileUploadService.deleteFile('shot', '001', 'test.jpg')
      ).rejects.toThrow('Storage manager not initialized');
    });
  });

  describe('getFileInfo', () => {
    const mockFileInfo = {
      id: 'file123',
      name: 'test.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
      path: 'shot_001/test.jpg',
      url: 'https://example.com/file123',
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    it('should get file info successfully', async () => {
      mockStorageManager.getFileInfo.mockResolvedValue(mockFileInfo);

      const result = await fileUploadService.getFileInfo('shot', '001', 'test.jpg');

      expect(result).toEqual(mockFileInfo);
      expect(mockStorageManager.getFileInfo).toHaveBeenCalledWith('shot', '001', 'test.jpg', undefined);
    });

    it('should get file info for specific field', async () => {
      mockStorageManager.getFileInfo.mockResolvedValue(mockFileInfo);

      await fileUploadService.getFileInfo('shot', '001', 'test.jpg', 'versions');

      expect(mockStorageManager.getFileInfo).toHaveBeenCalledWith('shot', '001', 'test.jpg', 'versions');
    });
  });

  describe('listFiles', () => {
    const mockFiles = [
      {
        id: 'file123',
        name: 'test1.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        path: 'shot_001/test1.jpg',
        url: 'https://example.com/file123',
        createdAt: new Date(),
        modifiedAt: new Date()
      },
      {
        id: 'file124',
        name: 'test2.jpg',
        size: 2048,
        mimeType: 'image/jpeg',
        path: 'shot_001/test2.jpg',
        url: 'https://example.com/file124',
        createdAt: new Date(),
        modifiedAt: new Date()
      }
    ];

    it('should list files successfully', async () => {
      mockStorageManager.listEntityFiles.mockResolvedValue(mockFiles);

      const result = await fileUploadService.listFiles('shot', '001');

      expect(result).toEqual(mockFiles);
      expect(mockStorageManager.listEntityFiles).toHaveBeenCalledWith('shot', '001', undefined);
    });

    it('should list files for specific field', async () => {
      mockStorageManager.listEntityFiles.mockResolvedValue(mockFiles);

      await fileUploadService.listFiles('shot', '001', 'thumbnails');

      expect(mockStorageManager.listEntityFiles).toHaveBeenCalledWith('shot', '001', 'thumbnails');
    });
  });

  describe('getFileUrl', () => {
    it('should get file URL successfully', async () => {
      const mockUrl = 'https://example.com/shot_001/test.jpg';
      mockStorageManager.generateFileUrl.mockReturnValue(mockUrl);

      const result = fileUploadService.getFileUrl('shot', '001', 'test.jpg');

      expect(result).toBe(mockUrl);
      expect(mockStorageManager.generateFileUrl).toHaveBeenCalledWith('shot_001/test.jpg', false);
    });

    it('should get proxy file URL', async () => {
      const mockUrl = 'https://example.com/proxies/shot_001/test.jpg';
      mockStorageManager.generateFileUrl.mockReturnValue(mockUrl);

      const result = fileUploadService.getFileUrl('shot', '001', 'test.jpg', undefined, true);

      expect(result).toBe(mockUrl);
      expect(mockStorageManager.generateFileUrl).toHaveBeenCalledWith('shot_001/test.jpg', true);
    });

    it('should get file URL for versions field', async () => {
      const mockUrl = 'https://example.com/shot_001/versions/test.jpg';
      mockStorageManager.generateFileUrl.mockReturnValue(mockUrl);

      const result = fileUploadService.getFileUrl('shot', '001', 'test.jpg', 'versions');

      expect(result).toBe(mockUrl);
      expect(mockStorageManager.generateFileUrl).toHaveBeenCalledWith('shot_001/versions/test.jpg', false);
    });
  });

  describe('getEntityFiles', () => {
    it('should get entity files organized by field type', async () => {
      const mockThumbnails = [
        {
          id: 'thumb1',
          name: 'thumb1.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
          path: 'shot_001/thumb1.jpg',
          url: 'https://example.com/thumb1',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ];

      const mockVersions = [
        {
          id: 'version1',
          name: 'version1.mp4',
          size: 5120,
          mimeType: 'video/mp4',
          path: 'shot_001/versions/version1.mp4',
          url: 'https://example.com/version1',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ];

      mockStorageManager.listEntityFiles
        .mockResolvedValueOnce(mockThumbnails) // thumbnails
        .mockResolvedValueOnce(mockThumbnails) // file_list (same as thumbnails)
        .mockResolvedValueOnce(mockVersions); // versions

      const result = await fileUploadService.getEntityFiles('shot', '001');

      expect(result).toEqual({
        thumbnails: mockThumbnails,
        file_list: mockThumbnails,
        versions: mockVersions
      });

      expect(mockStorageManager.listEntityFiles).toHaveBeenCalledTimes(3);
      expect(mockStorageManager.listEntityFiles).toHaveBeenNthCalledWith(1, 'shot', '001', undefined);
      expect(mockStorageManager.listEntityFiles).toHaveBeenNthCalledWith(2, 'shot', '001', undefined);
      expect(mockStorageManager.listEntityFiles).toHaveBeenNthCalledWith(3, 'shot', '001', 'versions');
    });
  });

  describe('archiveEntityFolder', () => {
    it('should archive entity folder successfully', async () => {
      const metadata = { reason: 'Entity deleted', deletedBy: 'user123' };
      mockStorageManager.moveToDeleted.mockResolvedValue(undefined);

      await fileUploadService.archiveEntityFolder('shot', '001', metadata);

      expect(mockStorageManager.moveToDeleted).toHaveBeenCalledWith('shot', '001', metadata);
    });

    it('should throw error if storage manager not initialized', async () => {
      mockStorageManager.isInitialized.mockReturnValue(false);

      await expect(
        fileUploadService.archiveEntityFolder('shot', '001')
      ).rejects.toThrow('Storage manager not initialized');
    });
  });

  describe('validateFileUpload', () => {
    it('should validate file upload successfully', () => {
      const fileBuffer = Buffer.from('test content');
      
      expect(() => {
        fileUploadService.validateFileUpload(fileBuffer, 'test.jpg', 'image/jpeg');
      }).not.toThrow();
    });

    it('should throw error for file too large', () => {
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
      
      expect(() => {
        fileUploadService.validateFileUpload(largeBuffer, 'large.jpg', 'image/jpeg');
      }).toThrow('File size exceeds maximum allowed size');
    });

    it('should throw error for empty file name', () => {
      const fileBuffer = Buffer.from('test content');
      
      expect(() => {
        fileUploadService.validateFileUpload(fileBuffer, '', 'image/jpeg');
      }).toThrow('File name is required');
    });

    it('should throw error for invalid characters in file name', () => {
      const fileBuffer = Buffer.from('test content');
      
      expect(() => {
        fileUploadService.validateFileUpload(fileBuffer, 'file<>with|invalid*chars.jpg', 'image/jpeg');
      }).toThrow('File name contains invalid characters');
    });

    it('should validate MIME type for thumbnails field', () => {
      const fileBuffer = Buffer.from('test content');
      
      // Should allow images
      expect(() => {
        fileUploadService.validateFileUpload(fileBuffer, 'image.jpg', 'image/jpeg', FieldType.THUMBNAILS);
      }).not.toThrow();

      // Should allow videos
      expect(() => {
        fileUploadService.validateFileUpload(fileBuffer, 'video.mp4', 'video/mp4', FieldType.THUMBNAILS);
      }).not.toThrow();

      // Should reject other types
      expect(() => {
        fileUploadService.validateFileUpload(fileBuffer, 'document.pdf', 'application/pdf', FieldType.THUMBNAILS);
      }).toThrow('Thumbnails field only accepts image and video files');
    });

    it('should allow any file type for versions and file_list fields', () => {
      const fileBuffer = Buffer.from('test content');
      
      expect(() => {
        fileUploadService.validateFileUpload(fileBuffer, 'document.pdf', 'application/pdf', FieldType.VERSIONS);
      }).not.toThrow();

      expect(() => {
        fileUploadService.validateFileUpload(fileBuffer, 'document.pdf', 'application/pdf', FieldType.FILE_LIST);
      }).not.toThrow();
    });
  });

  describe('generateFileMetadata', () => {
    it('should generate file metadata correctly', () => {
      const fileInfo = {
        id: 'file123',
        name: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        path: 'shot_001/test.jpg',
        url: 'https://example.com/file123',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      const metadata = fileUploadService.generateFileMetadata(
        fileInfo,
        'shot',
        '001',
        'thumbnails'
      );

      expect(metadata).toEqual({
        fileId: 'file123',
        fileName: 'test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        entityType: 'shot',
        entityId: '001',
        fieldName: 'thumbnails',
        uploadedAt: expect.any(String),
        url: 'https://example.com/file123',
        path: 'shot_001/test.jpg'
      });

      // Verify uploadedAt is a valid ISO string
      expect(new Date(metadata.uploadedAt)).toBeInstanceOf(Date);
    });

    it('should generate metadata without field name', () => {
      const fileInfo = {
        id: 'file123',
        name: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        path: 'shot_001/test.jpg',
        url: 'https://example.com/file123',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      const metadata = fileUploadService.generateFileMetadata(
        fileInfo,
        'shot',
        '001'
      );

      expect(metadata.fieldName).toBeUndefined();
    });
  });
});