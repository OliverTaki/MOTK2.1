import request from 'supertest';
import app from '../../server';
import { storageManager } from '../../services/storage/StorageManager';
import { StorageConfig } from '../../../shared/types';

describe('Files Integration Tests', () => {
  const mockStorageConfig: StorageConfig = {
    provider: 'gdrive',
    originalsRootUrl: 'https://drive.google.com/drive/folders/originals',
    proxiesRootUrl: 'https://drive.google.com/drive/folders/proxies',
    credentials: {
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'test-key-id',
      private_key: 'test-private-key',
      client_email: 'test@test-project.iam.gserviceaccount.com',
      client_id: 'test-client-id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token'
    }
  };

  beforeAll(async () => {
    // Initialize storage manager with mock configuration
    try {
      await storageManager.initialize(mockStorageConfig);
    } catch (error) {
      // In test environment, we expect this to fail due to mock credentials
      // We'll mock the storage operations instead
      console.log('Storage initialization failed (expected in test environment)');
    }
  });

  describe('Complete File Upload Workflow', () => {
    const entityType = 'shot';
    const entityId = 'test_001';
    const testFileName = 'test_image.jpg';
    const testFileContent = Buffer.from('fake image content');

    beforeEach(() => {
      // Mock storage manager methods for integration tests
      jest.spyOn(storageManager, 'isInitialized').mockReturnValue(true);
      jest.spyOn(storageManager, 'createEntityFolder').mockResolvedValue({
        entityType: 'shot',
        entityId: 'test_001',
        originalsPath: 'ORIGINALS/shot_test_001',
        proxiesPath: 'PROXIES/shot_test_001',
        originalsUrl: 'https://drive.google.com/drive/folders/originals/shot_test_001',
        proxiesUrl: 'https://drive.google.com/drive/folders/proxies/shot_test_001'
      });
      
      jest.spyOn(storageManager, 'uploadFile').mockResolvedValue({
        id: 'mock_file_id',
        name: testFileName,
        size: testFileContent.length,
        mimeType: 'image/jpeg',
        path: `${entityType}_${entityId}/${testFileName}`,
        url: `https://drive.google.com/file/d/mock_file_id/view`,
        createdAt: new Date(),
        modifiedAt: new Date()
      });

      jest.spyOn(storageManager, 'listEntityFiles').mockResolvedValue([
        {
          id: 'mock_file_id',
          name: testFileName,
          size: testFileContent.length,
          mimeType: 'image/jpeg',
          path: `${entityType}_${entityId}/${testFileName}`,
          url: `https://drive.google.com/file/d/mock_file_id/view`,
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ]);

      jest.spyOn(storageManager, 'getFileInfo').mockResolvedValue({
        id: 'mock_file_id',
        name: testFileName,
        size: testFileContent.length,
        mimeType: 'image/jpeg',
        path: `${entityType}_${entityId}/${testFileName}`,
        url: `https://drive.google.com/file/d/mock_file_id/view`,
        createdAt: new Date(),
        modifiedAt: new Date()
      });

      jest.spyOn(storageManager, 'fileExists').mockResolvedValue(true);
      jest.spyOn(storageManager, 'deleteFile').mockResolvedValue(undefined);
      jest.spyOn(storageManager, 'moveToDeleted').mockResolvedValue(undefined);
      jest.spyOn(storageManager, 'generateFileUrl').mockReturnValue(
        `https://drive.google.com/file/d/mock_file_id/view`
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should complete full file upload and management workflow', async () => {
      // Step 1: Upload a file
      const uploadResponse = await request(app)
        .post(`/api/files/upload/${entityType}/${entityId}`)
        .attach('file', testFileContent, testFileName)
        .expect(201);

      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.data.file.name).toBe(testFileName);
      expect(uploadResponse.body.data.metadata.entityType).toBe(entityType);
      expect(uploadResponse.body.data.metadata.entityId).toBe(entityId);

      // Step 2: Get file information
      const fileInfoResponse = await request(app)
        .get(`/api/files/${entityType}/${entityId}/${testFileName}`)
        .expect(200);

      expect(fileInfoResponse.body.success).toBe(true);
      expect(fileInfoResponse.body.data.name).toBe(testFileName);
      expect(fileInfoResponse.body.data.id).toBe('mock_file_id');

      // Step 3: Get file URL
      const fileUrlResponse = await request(app)
        .get(`/api/files/url/${entityType}/${entityId}/${testFileName}`)
        .expect(200);

      expect(fileUrlResponse.body.success).toBe(true);
      expect(fileUrlResponse.body.data.url).toContain('mock_file_id');
      expect(fileUrlResponse.body.data.isProxy).toBe(false);

      // Step 4: List files in entity folder
      const listFilesResponse = await request(app)
        .get(`/api/files/list/${entityType}/${entityId}`)
        .expect(200);

      expect(listFilesResponse.body.success).toBe(true);
      expect(listFilesResponse.body.data.totalCount).toBeGreaterThan(0);

      // Step 5: Delete the file
      const deleteResponse = await request(app)
        .delete(`/api/files/${entityType}/${entityId}/${testFileName}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('File deleted successfully');
    });

    it('should handle thumbnails field upload workflow', async () => {
      const fieldName = 'thumbnails';

      // Upload to thumbnails field
      const uploadResponse = await request(app)
        .post(`/api/files/upload/${entityType}/${entityId}?fieldName=${fieldName}`)
        .attach('file', testFileContent, testFileName)
        .expect(201);

      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.data.metadata.fieldName).toBe(fieldName);

      // List files in thumbnails field
      const listResponse = await request(app)
        .get(`/api/files/list/${entityType}/${entityId}?fieldName=${fieldName}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.fieldName).toBe(fieldName);
    });

    it('should handle versions field upload workflow', async () => {
      const fieldName = 'versions';

      // Mock versions-specific behavior
      jest.spyOn(storageManager, 'uploadFile').mockResolvedValue({
        id: 'mock_version_file_id',
        name: testFileName,
        size: testFileContent.length,
        mimeType: 'image/jpeg',
        path: `${entityType}_${entityId}/${fieldName}/${testFileName}`,
        url: `https://drive.google.com/file/d/mock_version_file_id/view`,
        createdAt: new Date(),
        modifiedAt: new Date()
      });

      // Upload to versions field
      const uploadResponse = await request(app)
        .post(`/api/files/upload/${entityType}/${entityId}?fieldName=${fieldName}`)
        .attach('file', testFileContent, testFileName)
        .expect(201);

      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.data.metadata.fieldName).toBe(fieldName);
      expect(uploadResponse.body.data.file.path).toContain(`/${fieldName}/`);
    });

    it('should handle multiple file upload workflow', async () => {
      const file1Content = Buffer.from('file 1 content');
      const file2Content = Buffer.from('file 2 content');
      const file1Name = 'file1.jpg';
      const file2Name = 'file2.jpg';

      // Mock multiple file uploads
      jest.spyOn(storageManager, 'uploadFile')
        .mockResolvedValueOnce({
          id: 'mock_file_1_id',
          name: file1Name,
          size: file1Content.length,
          mimeType: 'image/jpeg',
          path: `${entityType}_${entityId}/${file1Name}`,
          url: `https://drive.google.com/file/d/mock_file_1_id/view`,
          createdAt: new Date(),
          modifiedAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'mock_file_2_id',
          name: file2Name,
          size: file2Content.length,
          mimeType: 'image/jpeg',
          path: `${entityType}_${entityId}/${file2Name}`,
          url: `https://drive.google.com/file/d/mock_file_2_id/view`,
          createdAt: new Date(),
          modifiedAt: new Date()
        });

      // Upload multiple files
      const uploadResponse = await request(app)
        .post(`/api/files/upload-multiple/${entityType}/${entityId}`)
        .attach('files', file1Content, file1Name)
        .attach('files', file2Content, file2Name)
        .expect(201);

      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.data.uploaded).toHaveLength(2);
      expect(uploadResponse.body.message).toBe('2 files uploaded successfully');
    });

    it('should handle entity folder archival workflow', async () => {
      const archiveMetadata = {
        reason: 'Entity deleted by user',
        deletedBy: 'user123',
        deletedAt: new Date().toISOString()
      };

      // Archive entity folder
      const archiveResponse = await request(app)
        .post(`/api/files/archive/${entityType}/${entityId}`)
        .send({ metadata: archiveMetadata })
        .expect(200);

      expect(archiveResponse.body.success).toBe(true);
      expect(archiveResponse.body.message).toBe('Entity folder archived successfully');

      // Verify storage manager was called with correct parameters
      expect(storageManager.moveToDeleted).toHaveBeenCalledWith(
        entityType,
        entityId,
        archiveMetadata
      );
    });

    it('should handle file validation errors in workflow', async () => {
      // Test file size validation
      const largeFileContent = Buffer.alloc(101 * 1024 * 1024); // 101MB

      const response = await request(app)
        .post(`/api/files/upload/${entityType}/${entityId}`)
        .attach('file', largeFileContent, 'large_file.jpg')
        .expect(413); // Payload too large

      // The error should be caught by Multer's file size limit
    });

    it('should handle storage provider errors gracefully', async () => {
      // Mock storage error
      jest.spyOn(storageManager, 'uploadFile').mockRejectedValue(
        new Error('Storage provider unavailable')
      );

      const response = await request(app)
        .post(`/api/files/upload/${entityType}/${entityId}`)
        .attach('file', testFileContent, testFileName)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Storage provider unavailable');
    });

    it('should handle concurrent file operations', async () => {
      const file1Name = 'concurrent1.jpg';
      const file2Name = 'concurrent2.jpg';

      // Mock concurrent uploads
      jest.spyOn(storageManager, 'uploadFile')
        .mockImplementation(async (entityType, entityId, buffer, mimeType, originalName) => {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            id: `mock_${originalName}_id`,
            name: originalName,
            size: buffer.length,
            mimeType,
            path: `${entityType}_${entityId}/${originalName}`,
            url: `https://drive.google.com/file/d/mock_${originalName}_id/view`,
            createdAt: new Date(),
            modifiedAt: new Date()
          };
        });

      // Start concurrent uploads
      const [upload1, upload2] = await Promise.all([
        request(app)
          .post(`/api/files/upload/${entityType}/${entityId}`)
          .attach('file', testFileContent, file1Name),
        request(app)
          .post(`/api/files/upload/${entityType}/${entityId}`)
          .attach('file', testFileContent, file2Name)
      ]);

      expect(upload1.status).toBe(201);
      expect(upload2.status).toBe(201);
      expect(upload1.body.data.file.name).toBe(file1Name);
      expect(upload2.body.data.file.name).toBe(file2Name);
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle storage manager not initialized', async () => {
      jest.spyOn(storageManager, 'isInitialized').mockReturnValue(false);

      const response = await request(app)
        .post('/api/files/upload/shot/001')
        .attach('file', Buffer.from('test'), 'test.jpg')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Storage manager not initialized');
    });

    it('should handle invalid file names', async () => {
      const invalidFileName = 'file<>with|invalid*chars.jpg';

      const response = await request(app)
        .post('/api/files/upload/shot/001')
        .attach('file', Buffer.from('test'), invalidFileName)
        .expect(400);

      // Multer should catch this in fileFilter
      expect(response.body.error).toContain('invalid characters');
    });

    it('should handle missing entity folders gracefully', async () => {
      jest.spyOn(storageManager, 'isInitialized').mockReturnValue(true);
      jest.spyOn(storageManager, 'folderExists').mockResolvedValue(false);
      jest.spyOn(storageManager, 'createEntityFolder').mockResolvedValue({
        entityType: 'shot',
        entityId: '001',
        originalsPath: 'ORIGINALS/shot_001',
        proxiesPath: 'PROXIES/shot_001',
        originalsUrl: 'https://example.com/originals/shot_001',
        proxiesUrl: 'https://example.com/proxies/shot_001'
      });
      jest.spyOn(storageManager, 'uploadFile').mockResolvedValue({
        id: 'file123',
        name: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        path: 'shot_001/test.jpg',
        url: 'https://example.com/file123',
        createdAt: new Date(),
        modifiedAt: new Date()
      });

      const response = await request(app)
        .post('/api/files/upload/shot/001')
        .attach('file', Buffer.from('test'), 'test.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      // Should have created the entity folder automatically
      expect(storageManager.createEntityFolder).toHaveBeenCalledWith('shot', '001');
    });
  });
});