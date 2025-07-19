import { ProxyGenerationService } from '../ProxyGenerationService';
import { EntityType, FileInfo, ProxyJobStatus } from '../../../../shared/types';
import *s fs from 'fs';
import *s path from 'path';

// Mock fluent-ffmpeg
jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = jest.fn(() => ({
    videoCodec: jest.fn().mockReturnThis(),
    videoBitrate: jest.fn().mockReturnThis(),
    size: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function(this: any, event: string, callback: Function) {
      if (event === 'end') {
        // Simulate successful completion
        setTimeout(() => callback(), 100);
      } else if (event === 'progress') {
        // Simulate progress updates
        setTimeout(() => callback({ percent: 50 }), 50);
        setTimeout(() => callback({ percent: 100 }), 90);
      }
      return this;
    }),
    run: jest.fn().mockReturnThis()
  }));
  return mockFfmpeg;
});

// Mock storage manager
jest.mock('../../storage/StorageManager', () => ({
  storageManager: {
    isInitialized: jest.fn(() => true),
    generateFileUrl: jest.fn((path: string, isProxy: boolean) => 
      `https://storage.example.com/${path}`
    )
  }
}));

describe('ProxyGenerationService', () => {
  let service: ProxyGenerationService;
  let mockFileInfo: FileInfo;
  let tempDir: string;

  beforeEach(() => {
    service = new ProxyGenerationService();
    tempDir = path.join(process.cwd(), 'temp', 'proxy-generation');
    
    mockFileInfo = {
      id: 'test-file-id',
      name: 'test-video.mp4',
      size: 1024000,
      mimeType: 'video/mp4',
      path: 'shot_001/test-video.mp4',
      url: 'https://storage.example.com/shot_001/test-video.mp4',
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        const filePath = path.join(tempDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  describe('Proxy filename generation', () => {
    test('should generate correct proxy filename without take or version', () => {
      const service = new ProxyGenerationService();
      // Access private method through type assertion for testing
      const generateProxyFileName = (service as any).generateProxyFileName.bind(service);
      
      const result = generateProxyFileName('shot_001', 'original.mov');
      expect(result).toBe('shot_001_proxy.mp4');
    });

    test('should generate correct proxy filename with take', () => {
      const service = new ProxyGenerationService();
      const generateProxyFileName = (service as any).generateProxyFileName.bind(service);
      
      const result = generateProxyFileName('shot_001', 'original.mov', 'take1');
      expect(result).toBe('shot_001_take1_proxy.mp4');
    });

    test('should generate correct proxy filename with version', () => {
      const service = new ProxyGenerationService();
      const generateProxyFileName = (service as any).generateProxyFileName.bind(service);
      
      const result = generateProxyFileName('shot_001', 'original.mov', undefined, 3);
      expect(result).toBe('shot_001_v03_proxy.mp4');
    });

    test('should generate correct proxy filename with take and version', () => {
      const service = new ProxyGenerationService();
      const generateProxyFileName = (service as any).generateProxyFileName.bind(service);
      
      const result = generateProxyFileName('shot_001', 'original.mov', 'take2', 5);
      expect(result).toBe('shot_001_take2_v05_proxy.mp4');
    });
  });

  describe('Video file detection', () => {
    test('should correctly identify video files', () => {
      const service = new ProxyGenerationService();
      const isVideoFile = (service as any).isVideoFile.bind(service);
      
      expect(isVideoFile('video/mp4')).toBe(true);
      expect(isVideoFile('video/quicktime')).toBe(true);
      expect(isVideoFile('video/x-msvideo')).toBe(true);
      expect(isVideoFile('image/jpeg')).toBe(false);
      expect(isVideoFile('application/pdf')).toBe(false);
    });
  });

  describe('Job queue management', () => {
    test('should queue proxy generation job', async () => {
      const jobId = await service.queueProxyGeneration(
        EntityType.SHOT,
        'shot_001',
        mockFileInfo
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      const job = service.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.entityType).toBe(EntityType.SHOT);
      expect(job?.entityId).toBe('shot_001');
      expect(job?.status).toBe(ProxyJobStatus.PENDING);
    });

    test('should process queued jobs', async () => {
      const jobId = await service.queueProxyGeneration(
        EntityType.SHOT,
        'shot_001',
        mockFileInfo
      );

      // Wait for job to be processed
      await new Promise(resolve => setTimeout(resolve, 200));

      const job = service.getJobStatus(jobId);
      expect(job?.status).toBe(ProxyJobStatus.COMPLETED);
      expect(job?.progress).toBe(100);
      expect(job?.completedAt).toBeDefined();
    });

    test('should get entity jobs', async () => {
      const jobId1 = await service.queueProxyGeneration(
        EntityType.SHOT,
        'shot_001',
        mockFileInfo
      );
      
      const jobId2 = await service.queueProxyGeneration(
        EntityType.SHOT,
        'shot_001',
        { ...mockFileInfo, name: 'test-video-2.mp4' }
      );

      const entityJobs = service.getEntityJobs(EntityType.SHOT, 'shot_001');
      expect(entityJobs).toHaveLength(2);
      expect(entityJobs.map(job => job.id)).toContain(jobId1);
      expect(entityJobs.map(job => job.id)).toContain(jobId2);
    });

    test('should cancel pending jobs', async () => {
      const jobId = await service.queueProxyGeneration(
        EntityType.SHOT,
        'shot_001',
        mockFileInfo
      );

      const cancelled = service.cancelJob(jobId);
      expect(cancelled).toBe(true);

      const job = service.getJobStatus(jobId);
      expect(job?.status).toBe(ProxyJobStatus.FAILED);
      expect(job?.error).toBe('Job cancelled by user');
    });

    test('should not cancel processing jobs', async () => {
      const jobId = await service.queueProxyGeneration(
        EntityType.SHOT,
        'shot_001',
        mockFileInfo
      );

      // Wait a bit for job to start processing
      await new Promise(resolve => setTimeout(resolve, 50));

      const cancelled = service.cancelJob(jobId);
      expect(cancelled).toBe(false);
    });
  });

  describe('Immediate proxy generation', () => {
    test('should generate proxy immediately for video file', async () => {
      const result = await service.generateProxyImmediate(
        EntityType.SHOT,
        'shot_001',
        mockFileInfo
      );

      expect(result).toBeDefined();
      expect(result.originalFileInfo).toEqual(mockFileInfo);
      expect(result.proxyFileName).toBe('shot_001_proxy.mp4');
      expect(result.proxyFileInfo).toBeDefined();
      expect(result.proxyFileInfo.mimeType).toBe('video/mp4');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    test('should throw error for non-video files', async () => {
      const imageFile = {
        ...mockFileInfo,
        mimeType: 'image/jpeg',
        name: 'test-image.jpg'
      };

      await expect(
        service.generateProxyImmediate(EntityType.SHOT, 'shot_001', imageFile)
      ).rejects.toThrow('File test-image.jpg is not a video file');
    });

    test('should generate proxy with take and version', async () => {
      const result = await service.generateProxyImmediate(
        EntityType.SHOT,
        'shot_001',
        mockFileInfo,
        'take1',
        2
      );

      expect(result.proxyFileName).toBe('shot_001_take1_v02_proxy.mp4');
    });
  });

  describe('Queue status and management', () => {
    test('should return correct queue status', async () => {
      const status1 = service.getQueueStatus();
      expect(status1.queueLength).toBe(0);
      expect(status1.totalJobs).toBe(0);

      await service.queueProxyGeneration(EntityType.SHOT, 'shot_001', mockFileInfo);
      await service.queueProxyGeneration(EntityType.ASSET, 'asset_001', mockFileInfo);

      const status2 = service.getQueueStatus();
      expect(status2.totalJobs).toBe(2);
    });

    test('should clear old completed jobs', async () => {
      const jobId = await service.queueProxyGeneration(
        EntityType.SHOT,
        'shot_001',
        mockFileInfo
      );

      // Wait for job completion
      await new Promise(resolve => setTimeout(resolve, 200));

      // Manually set completion time to be old
      const job = service.getJobStatus(jobId);
      if (job) {
        job.completedAt = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
      }

      const clearedCount = service.clearOldJobs(24);
      expect(clearedCount).toBe(1);

      const clearedJob = service.getJobStatus(jobId);
      expect(clearedJob).toBeNull();
    });
  });

  describe('Error handling', () => {
    test('should handle FFmpeg processing errors', async () => {
      // Mock FFmpeg to throw error
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.mockImplementationOnce(() => ({
        videoCodec: jest.fn().mockReturnThis(),
        videoBitrate: jest.fn().mockReturnThis(),
        size: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function(this: any, event: string, callback: Function) {
          if (event === 'error') {
            setTimeout(() => callback(new Error('FFmpeg processing failed')), 100);
          }
          return this;
        }),
        run: jest.fn().mockReturnThis()
      }));

      await expect(
        service.generateProxyImmediate(EntityType.SHOT, 'shot_001', mockFileInfo)
      ).rejects.toThrow('FFmpeg processing failed');
    });

    test('should handle storage manager not initialized', async () => {
      // Mock storage manager as not initialized
      const { storageManager } = require('../../storage/StorageManager');
      storageManager.isInitialized.mockReturnValueOnce(false);

      await expect(
        service.generateProxyImmediate(EntityType.SHOT, 'shot_001', mockFileInfo)
      ).rejects.toThrow('Storage manager not initialized');
    });
  });

  describe('Default proxy options', () => {
    test('should use correct default options for proxy generation', () => {
      const service = new ProxyGenerationService();
      const getDefaultProxyOptions = (service as any).getDefaultProxyOptions.bind(service);
      
      const options = getDefaultProxyOptions();
      expect(options.resolution).toBe('1920x1080');
      expect(options.bitrate).toBe('1000k');
      expect(options.format).toBe('mp4');
      expect(options.codec).toBe('libx264');
    });
  });
});