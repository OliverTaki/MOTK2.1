import request from 'supertest';
import app from '../../server';
import { storageManager } from '../../services/storage/StorageManager';
import { fileUploadService } from '../../services/files/FileUploadService';

// Mock the storage manager and file upload service
jest.mock('../../services/storage/StorageManager');
jest.mock('../../services/files/FileUploadService');

const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
const mockFileUploadService = fileUploadService as jest.Mocked<typeof fileUploadService>;

describe('Files Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock storage manager initialization check
    mockStorageManager.isInitialized.mockReturnValue(true);
    
    // Reset all mocks for fileUploadService
    mockFileUploadService.validateFileUpload = jest.fn();
    mockFileUploadService.uploadFile = jest.fn();
    mockFileUploadService.generateFileMetadata = jest.fn();
    mockFileUploadService.getFileInfo = jest.fn();
    mockFileUploadService.getFileUrl = jest.fn();
    mockFileUploadService.listFiles = jest.fn();
    mockFileUploadService.getEntityFiles = jest.fn();
    mockFileUploadService.deleteFile = jest.fn();
    mockFileUploadService.archiveEntityFolder = jest.fn();
  });

  describe('POST /api/files/upload/:entityType/:entityId', () => {
    it('should upload a file successfully', async () => {
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

      const mockMetadata = {
        fileId: 'file123',
        fileName: 'test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        entityType: 'shot',
        entityId: '001',
        uploadedAt: new Date().toISOString(),
        url: 'https://example.com/file123',
        path: 'shot_001/test.jpg'
      };

      mockFileUploadService.uploadFile.mockResolvedValue(mockFileInfo);
      mockFileUploadService.generateFileMetadata.mockReturnValue(mockMetadata);

      const response = await request(app)
        .post('/api/files/upload/shot/001')
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          file: {
            ...mockFileInfo,
            createdAt: mockFileInfo.createdAt.toISOString(),
            modifiedAt: mockFileInfo.modifiedAt.toISOString()
          },
          metadata: mockMetadata
        },
        message: 'File uploaded successfully'
      });

      expect(mockFileUploadService.validateFileUpload).toHaveBeenCalled();
      expect(mockFileUploadService.uploadFile).toHaveBeenCalledWith(
        'shot',
        '001',
        expect.any(Buffer),
        'test.jpg',
        'image/jpeg',
        undefined
      );
    });

    it('should upload a file to a specific field', async () => {
      const mockFileInfo = {
        id: 'file123',
        name: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        path: 'shot_001/thumbnails/test.jpg',
        url: 'https://example.com/file123',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      mockFileUploadService.uploadFile.mockResolvedValue(mockFileInfo);
      mockFileUploadService.generateFileMetadata.mockReturnValue({});

      const response = await request(app)
        .post('/api/files/upload/shot/001?fieldName=thumbnails')
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockFileUploadService.uploadFile).toHaveBeenCalledWith(
        'shot',
        '001',
        expect.any(Buffer),
        'test.jpg',
        'image/jpeg',
        'thumbnails'
      );
    });

    it('should return 400 if no file is provided', async () => {
      const response = await request(app)
        .post('/api/files/upload/shot/001')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No file provided'
      });
    });

    it('should return 400 for invalid entity type', async () => {
      const response = await request(app)
        .post('/api/files/upload/invalid/001')
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid entity type'
      });
    });

    it('should return 400 for invalid field name', async () => {
      const response = await request(app)
        .post('/api/files/upload/shot/001?fieldName=invalid')
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid field name'
      });
    });

    it('should handle file upload validation errors', async () => {
      mockFileUploadService.validateFileUpload.mockImplementation(() => {
        throw new Error('File too large');
      });

      const response = await request(app)
        .post('/api/files/upload/shot/001')
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'File too large'
      });
    });

    it('should handle upload service errors', async () => {
      mockFileUploadService.uploadFile.mockRejectedValue(new Error('Storage error'));

      const response = await request(app)
        .post('/api/files/upload/shot/001')
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Storage error'
      });
    });
  });

  describe('POST /api/files/upload-multiple/:entityType/:entityId', () => {
    it('should upload multiple files successfully', async () => {
      const mockFileInfo1 = {
        id: 'file123',
        name: 'test1.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        path: 'shot_001/test1.jpg',
        url: 'https://example.com/file123',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      const mockFileInfo2 = {
        id: 'file124',
        name: 'test2.jpg',
        size: 2048,
        mimeType: 'image/jpeg',
        path: 'shot_001/test2.jpg',
        url: 'https://example.com/file124',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      mockFileUploadService.uploadFile
        .mockResolvedValueOnce(mockFileInfo1)
        .mockResolvedValueOnce(mockFileInfo2);
      mockFileUploadService.generateFileMetadata.mockReturnValue({});

      const response = await request(app)
        .post('/api/files/upload-multiple/shot/001')
        .attach('files', Buffer.from('test file 1'), 'test1.jpg')
        .attach('files', Buffer.from('test file 2'), 'test2.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uploaded).toHaveLength(2);
      expect(response.body.message).toBe('2 files uploaded successfully');
    });

    it('should handle partial upload failures', async () => {
      const mockFileInfo = {
        id: 'file123',
        name: 'test1.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        path: 'shot_001/test1.jpg',
        url: 'https://example.com/file123',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      mockFileUploadService.uploadFile
        .mockResolvedValueOnce(mockFileInfo)
        .mockRejectedValueOnce(new Error('Upload failed'));
      mockFileUploadService.generateFileMetadata.mockReturnValue({});

      const response = await request(app)
        .post('/api/files/upload-multiple/shot/001')
        .attach('files', Buffer.from('test file 1'), 'test1.jpg')
        .attach('files', Buffer.from('test file 2'), 'test2.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uploaded).toHaveLength(1);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.message).toBe('1 files uploaded successfully, 1 failed');
    });

    it('should return 400 if no files are provided', async () => {
      const response = await request(app)
        .post('/api/files/upload-multiple/shot/001')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No files provided'
      });
    });
  });

  describe('GET /api/files/:entityType/:entityId/:fileName', () => {
    it('should get file information successfully', async () => {
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

      mockFileUploadService.getFileInfo.mockResolvedValue(mockFileInfo);

      const response = await request(app)
        .get('/api/files/shot/001/test.jpg')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockFileInfo,
          createdAt: mockFileInfo.createdAt.toISOString(),
          modifiedAt: mockFileInfo.modifiedAt.toISOString()
        }
      });

      expect(mockFileUploadService.getFileInfo).toHaveBeenCalledWith(
        'shot',
        '001',
        'test.jpg',
        undefined
      );
    });

    it('should return 404 for file not found', async () => {
      mockFileUploadService.getFileInfo.mockRejectedValue(new Error('File not found'));

      const response = await request(app)
        .get('/api/files/shot/001/nonexistent.jpg')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'File not found'
      });
    });

    it('should return 400 for invalid entity type', async () => {
      const response = await request(app)
        .get('/api/files/invalid/001/test.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid entity type'
      });
    });
  });

  describe('GET /api/files/url/:entityType/:entityId/:fileName', () => {
    it('should get file URL successfully', async () => {
      const mockUrl = 'https://example.com/shot_001/test.jpg';
      mockFileUploadService.getFileUrl.mockReturnValue(mockUrl);

      const response = await request(app)
        .get('/api/files/url/shot/001/test.jpg')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          url: mockUrl,
          fileName: 'test.jpg',
          entityType: 'shot',
          entityId: '001',
          fieldName: undefined,
          isProxy: false
        }
      });

      expect(mockFileUploadService.getFileUrl).toHaveBeenCalledWith(
        'shot',
        '001',
        'test.jpg',
        undefined,
        false
      );
    });

    it('should get proxy file URL', async () => {
      const mockUrl = 'https://example.com/proxies/shot_001/test.jpg';
      mockFileUploadService.getFileUrl.mockReturnValue(mockUrl);

      const response = await request(app)
        .get('/api/files/url/shot/001/test.jpg?proxy=true')
        .expect(200);

      expect(response.body.data.isProxy).toBe(true);
      expect(mockFileUploadService.getFileUrl).toHaveBeenCalledWith(
        'shot',
        '001',
        'test.jpg',
        undefined,
        true
      );
    });
  });

  describe('GET /api/files/list/:entityType/:entityId', () => {
    it('should list files for specific field', async () => {
      const mockFiles = [
        {
          id: 'file123',
          name: 'test1.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
          path: 'shot_001/thumbnails/test1.jpg',
          url: 'https://example.com/file123',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ];

      mockFileUploadService.listFiles.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/api/files/list/shot/001?fieldName=thumbnails');
      
      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
      
      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          files: mockFiles.map(file => ({
            ...file,
            createdAt: file.createdAt.toISOString(),
            modifiedAt: file.modifiedAt.toISOString()
          })),
          fieldName: 'thumbnails',
          count: 1
        }
      });

      expect(mockFileUploadService.listFiles).toHaveBeenCalledWith(
        'shot',
        '001',
        'thumbnails'
      );
    });

    it('should list all entity files organized by field type', async () => {
      const mockEntityFiles = {
        thumbnails: [],
        file_list: [],
        versions: []
      };

      mockFileUploadService.getEntityFiles.mockResolvedValue(mockEntityFiles);

      const response = await request(app)
        .get('/api/files/list/shot/001')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockEntityFiles,
          totalCount: 0
        }
      });

      expect(mockFileUploadService.getEntityFiles).toHaveBeenCalledWith('shot', '001');
    });
  });

  describe('DELETE /api/files/:entityType/:entityId/:fileName', () => {
    it('should delete file successfully', async () => {
      mockFileUploadService.deleteFile.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/files/shot/001/test.jpg')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'File deleted successfully'
      });

      expect(mockFileUploadService.deleteFile).toHaveBeenCalledWith(
        'shot',
        '001',
        'test.jpg',
        undefined
      );
    });

    it('should return 404 for file not found', async () => {
      mockFileUploadService.deleteFile.mockRejectedValue(new Error('File not found'));

      const response = await request(app)
        .delete('/api/files/shot/001/nonexistent.jpg')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'File not found'
      });
    });
  });

  describe('POST /api/files/archive/:entityType/:entityId', () => {
    it('should archive entity folder successfully', async () => {
      const metadata = { reason: 'Entity deleted', deletedBy: 'user123' };
      mockFileUploadService.archiveEntityFolder.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/files/archive/shot/001')
        .send({ metadata })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Entity folder archived successfully'
      });

      expect(mockFileUploadService.archiveEntityFolder).toHaveBeenCalledWith(
        'shot',
        '001',
        metadata
      );
    });

    it('should return 400 for invalid entity type', async () => {
      const response = await request(app)
        .post('/api/files/archive/invalid/001')
        .send({ metadata: {} })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid entity type'
      });
    });
  });

  describe('POST /api/files/proxy/:fileId', () => {
    it('should return 501 for proxy generation (not implemented)', async () => {
      const response = await request(app)
        .post('/api/files/proxy/file123')
        .expect(501);

      expect(response.body).toEqual({
        success: false,
        message: 'Proxy generation not implemented yet - will be implemented in task 3.3'
      });
    });
  });
});