import request from 'supertest';
import express from 'express';
import filesRouter from '../routes/files';
import { fileManagementIntegrationService } from '../services/files/FileManagementIntegrationService';
import { storageInitializationService } from '../services/storage/StorageInitializationService';

// Mock the services
jest.mock('../services/files/FileManagementIntegrationService');
jest.mock('../services/storage/StorageInitializationService');

const app = express();
app.use(express.json());
app.use('/api/files', filesRouter);

describe('File Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Storage Status', () => {
    it('should return storage status', async () => {
      const mockStatus = {
        initialized: true,
        provider: 'gdrive',
        config: {
          provider: 'gdrive',
          originalsRootUrl: 'https://drive.google.com/originals',
          proxiesRootUrl: 'https://drive.google.com/proxies'
        }
      };

      (fileManagementIntegrationService.getStorageStatus as jest.Mock).mockReturnValue(mockStatus);

      const response = await request(app)
        .get('/api/files/storage/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatus);
    });

    it('should handle storage status errors', async () => {
      (fileManagementIntegrationService.getStorageStatus as jest.Mock).mockImplementation(() => {
        throw new Error('Storage not initialized');
      });

      const response = await request(app)
        .get('/api/files/storage/status')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Storage not initialized');
    });
  });

  describe('Storage Connectivity Test', () => {
    it('should test storage connectivity successfully', async () => {
      const mockTestResult = {
        success: true,
        provider: 'gdrive'
      };

      (fileManagementIntegrationService.testStorageConnectivity as jest.Mock).mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/files/storage/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTestResult);
      expect(response.body.message).toContain('Storage connectivity test passed');
    });

    it('should handle storage connectivity test failure', async () => {
      const mockTestResult = {
        success: false,
        provider: 'unknown',
        error: 'Connection failed'
      };

      (fileManagementIntegrationService.testStorageConnectivity as jest.Mock).mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/files/storage/test')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toEqual(mockTestResult);
      expect(response.body.message).toContain('Storage connectivity test failed');
    });
  });

  describe('Proxy Generation', () => {
    it('should queue proxy generation for video file', async () => {
      const mockFileInfo = {
        id: 'file-1',
        name: 'video.mp4',
        size: 10485760,
        mimeType: 'video/mp4',
        path: '/shot_001/video.mp4',
        url: 'https://example.com/video.mp4',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      const mockJobId = 'job-123';

      // Mock the file upload service
      const mockFileUploadService = {
        getFileInfo: jest.fn().mockResolvedValue(mockFileInfo)
      };

      // Mock the proxy generation service
      const mockProxyGenerationService = {
        queueProxyGeneration: jest.fn().mockResolvedValue(mockJobId)
      };

      // Mock the dynamic imports
      jest.doMock('../services/files/FileUploadService', () => ({
        fileUploadService: mockFileUploadService
      }));

      jest.doMock('../services/proxy/ProxyGenerationService', () => ({
        proxyGenerationService: mockProxyGenerationService
      }));

      const response = await request(app)
        .post('/api/files/proxy/shot/shot_001/video.mp4')
        .send({
          take: 'main',
          version: 1,
          immediate: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe(mockJobId);
      expect(response.body.data.status).toBe('queued');
    });

    it('should reject proxy generation for non-video file', async () => {
      const mockFileInfo = {
        id: 'file-1',
        name: 'document.pdf',
        size: 1048576,
        mimeType: 'application/pdf',
        path: '/shot_001/document.pdf',
        url: 'https://example.com/document.pdf',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      // Mock the file upload service
      const mockFileUploadService = {
        getFileInfo: jest.fn().mockResolvedValue(mockFileInfo)
      };

      jest.doMock('../services/files/FileUploadService', () => ({
        fileUploadService: mockFileUploadService
      }));

      const response = await request(app)
        .post('/api/files/proxy/shot/shot_001/document.pdf')
        .send({
          immediate: false
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('only supported for video files');
    });

    it('should get proxy generation job status', async () => {
      const mockJob = {
        id: 'job-123',
        entityType: 'shot',
        entityId: 'shot_001',
        originalFileInfo: {
          id: 'file-1',
          name: 'video.mp4',
          size: 10485760,
          mimeType: 'video/mp4',
          path: '/shot_001/video.mp4',
          url: 'https://example.com/video.mp4',
          createdAt: new Date(),
          modifiedAt: new Date()
        },
        proxyFileName: 'shot_001_proxy.mp4',
        status: 'processing',
        progress: 45,
        createdAt: new Date(),
        startedAt: new Date()
      };

      // Mock the proxy generation service
      const mockProxyGenerationService = {
        getJobStatus: jest.fn().mockReturnValue(mockJob)
      };

      jest.doMock('../services/proxy/ProxyGenerationService', () => ({
        proxyGenerationService: mockProxyGenerationService
      }));

      const response = await request(app)
        .get('/api/files/proxy/status/job-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('job-123');
      expect(response.body.data.status).toBe('processing');
      expect(response.body.data.progress).toBe(45);
    });

    it('should return 404 for non-existent job', async () => {
      // Mock the proxy generation service
      const mockProxyGenerationService = {
        getJobStatus: jest.fn().mockReturnValue(null)
      };

      jest.doMock('../services/proxy/ProxyGenerationService', () => ({
        proxyGenerationService: mockProxyGenerationService
      }));

      const response = await request(app)
        .get('/api/files/proxy/status/non-existent-job')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });

    it('should get proxy queue status', async () => {
      const mockQueueStatus = {
        queueLength: 2,
        isProcessing: true,
        totalJobs: 10,
        completedJobs: 7,
        failedJobs: 1
      };

      // Mock the proxy generation service
      const mockProxyGenerationService = {
        getQueueStatus: jest.fn().mockReturnValue(mockQueueStatus)
      };

      jest.doMock('../services/proxy/ProxyGenerationService', () => ({
        proxyGenerationService: mockProxyGenerationService
      }));

      const response = await request(app)
        .get('/api/files/proxy/queue/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQueueStatus);
    });
  });

  describe('Entity Archive', () => {
    it('should archive entity with files and proxies', async () => {
      (fileManagementIntegrationService.archiveEntityWithFiles as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/files/archive/shot/shot_001')
        .send({
          metadata: {
            reason: 'Project completed',
            archivedBy: 'user123'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('archived successfully');
      expect(fileManagementIntegrationService.archiveEntityWithFiles).toHaveBeenCalledWith(
        'shot',
        'shot_001',
        {
          reason: 'Project completed',
          archivedBy: 'user123'
        }
      );
    });

    it('should handle invalid entity type for archive', async () => {
      const response = await request(app)
        .post('/api/files/archive/invalid/entity_001')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid entity type');
    });
  });

  describe('Integration Service Functionality', () => {
    it('should initialize file management system', async () => {
      await expect(fileManagementIntegrationService.initialize()).resolves.not.toThrow();
    });

    it('should get storage status', () => {
      const mockStatus = {
        initialized: true,
        provider: 'gdrive',
        config: {
          provider: 'gdrive',
          originalsRootUrl: 'https://drive.google.com/originals',
          proxiesRootUrl: 'https://drive.google.com/proxies'
        }
      };

      (fileManagementIntegrationService.getStorageStatus as jest.Mock).mockReturnValue(mockStatus);

      const status = fileManagementIntegrationService.getStorageStatus();
      expect(status).toEqual(mockStatus);
    });

    it('should test storage connectivity', async () => {
      const mockResult = {
        success: true,
        provider: 'gdrive'
      };

      (fileManagementIntegrationService.testStorageConnectivity as jest.Mock).mockResolvedValue(mockResult);

      const result = await fileManagementIntegrationService.testStorageConnectivity();
      expect(result).toEqual(mockResult);
    });
  });
});

describe('File Management Integration - Error Handling', () => {
  it('should handle service initialization errors', async () => {
    (fileManagementIntegrationService.initialize as jest.Mock).mockRejectedValue(
      new Error('Storage initialization failed')
    );

    await expect(fileManagementIntegrationService.initialize()).rejects.toThrow('Storage initialization failed');
  });

  it('should handle storage connectivity test errors', async () => {
    (fileManagementIntegrationService.testStorageConnectivity as jest.Mock).mockRejectedValue(
      new Error('Connection timeout')
    );

    await expect(fileManagementIntegrationService.testStorageConnectivity()).rejects.toThrow('Connection timeout');
  });

  it('should handle archive operation errors', async () => {
    (fileManagementIntegrationService.archiveEntityWithFiles as jest.Mock).mockRejectedValue(
      new Error('Archive failed')
    );

    const response = await request(app)
      .post('/api/files/archive/shot/shot_001')
      .send({})
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Archive failed');
  });
});