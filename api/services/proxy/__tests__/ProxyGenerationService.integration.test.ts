import { ProxyGenerationService } from '../ProxyGenerationService';
import { StorageManager } from '../../storage/StorageManager';
import { EntityType, ProxyJobStatus } from '../../../../shared/types';
import *s fs from 'fs';
import *s path from 'path';

// Mock storage manager
jest.mock('../../storage/StorageManager', () => ({
  storageManager: {
    isInitialized: jest.fn(() => true),
    uploadFile: jest.fn(),
    generateFileUrl: jest.fn((filePath: string) => `https://mockstorage.com/${filePath}`),
    createEntityFolder: jest.fn(),
    fileExists: jest.fn(),
    listEntityFiles: jest.fn(),
    getFileInfo: jest.fn(),
    deleteFile: jest.fn(),
    moveToDeleted: jest.fn(),
  }
}));

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
        // Simulate successful completion by creating a dummy file
        const outputPath = this._outputs[0].target;
        fs.writeFileSync(outputPath, 'dummy video content');
        setTimeout(() => callback(), 10);
      } else if (event === 'progress') {
        setTimeout(() => callback({ percent: 50 }), 5);
      }
      return this;
    }),
    run: jest.fn().mockReturnThis()
  }));
  return mockFfmpeg;
});

describe('ProxyGenerationService Integration', () => {
  let service: ProxyGenerationService;
  let tempDir: string;
  const mockStorageManager = StorageManager.storageManager as jest.Mocked<typeof StorageManager.storageManager>;

  beforeEach(() => {
    service = new ProxyGenerationService();
    tempDir = path.join(process.cwd(), 'temp', 'proxy-generation');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Reset mocks before each test
    mockStorageManager.uploadFile.mockClear();
    mockStorageManager.generateFileUrl.mockClear();
    mockStorageManager.createEntityFolder.mockClear();
    mockStorageManager.fileExists.mockClear();
    mockStorageManager.listEntityFiles.mockClear();
    mockStorageManager.getFileInfo.mockClear();
    mockStorageManager.deleteFile.mockClear();
    mockStorageManager.moveToDeleted.mockClear();
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should generate and upload a proxy for a video file', async () => {
    const entityId = 'shot_001';
    const originalFileName = 'test_video.mp4';
    const originalFileInfo = {
      id: 'original-id',
      name: originalFileName,
      size: 1000,
      mimeType: 'video/mp4',
      path: `originals/${originalFileName}`,
      url: `https://mockstorage.com/originals/${originalFileName}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    // Mock the downloadFileToTemp to create a dummy input file
    jest.spyOn(service as any, 'downloadFileToTemp').mockImplementation(async (fileInfo) => {
      const tempInputPath = path.join(tempDir, `input_${fileInfo.name}`);
      fs.writeFileSync(tempInputPath, 'dummy video content');
      return tempInputPath;
    });

    mockStorageManager.uploadFile.mockResolvedValue({
      id: 'proxy-id',
      name: 'shot_001_proxy.mp4',
      size: 500,
      mimeType: 'video/mp4',
      path: 'proxies/shot_001_proxy.mp4',
      url: 'https://mockstorage.com/proxies/shot_001_proxy.mp4',
      createdAt: new Date(),
      modifiedAt: new Date(),
    });

    const proxyInfo = await service.generateProxyImmediate(
      EntityType.SHOT,
      entityId,
      originalFileInfo
    );

    expect(proxyInfo).toBeDefined();
    expect(proxyInfo.proxyFileName).toBe('shot_001_proxy.mp4');
    expect(mockStorageManager.uploadFile).toHaveBeenCalledTimes(1);
    expect(mockStorageManager.uploadFile).toHaveBeenCalledWith(
      'proxies/shot_001_proxy.mp4',
      expect.any(Buffer),
      'video/mp4',
      'shot_001_proxy.mp4'
    );
  });

  it('should queue and process a proxy generation job', async () => {
    const entityId = 'asset_001';
    const originalFileName = 'asset_video.mov';
    const originalFileInfo = {
      id: 'original-asset-id',
      name: originalFileName,
      size: 2000,
      mimeType: 'video/quicktime',
      path: `originals/${originalFileName}`,
      url: `https://mockstorage.com/originals/${originalFileName}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    // Mock the downloadFileToTemp for queued jobs
    jest.spyOn(service as any, 'downloadFileToTemp').mockImplementation(async (fileInfo) => {
      const tempInputPath = path.join(tempDir, `input_${fileInfo.name}`);
      fs.writeFileSync(tempInputPath, 'dummy video content');
      return tempInputPath;
    });

    mockStorageManager.uploadFile.mockResolvedValue({
      id: 'proxy-asset-id',
      name: 'asset_001_proxy.mp4',
      size: 1000,
      mimeType: 'video/mp4',
      path: 'proxies/asset_001_proxy.mp4',
      url: 'https://mockstorage.com/proxies/asset_001_proxy.mp4',
      createdAt: new Date(),
      modifiedAt: new Date(),
    });

    const jobId = await service.queueProxyGeneration(
      EntityType.ASSET,
      entityId,
      originalFileInfo
    );

    // Allow time for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 100)); 

    const jobStatus = service.getJobStatus(jobId);
    expect(jobStatus?.status).toBe(ProxyJobStatus.COMPLETED);
    expect(jobStatus?.progress).toBe(100);
    expect(mockStorageManager.uploadFile).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple queued jobs correctly', async () => {
    const mockFileInfo1 = {
      id: 'id1', name: 'video1.mp4', size: 100, mimeType: 'video/mp4',
      path: 'path1', url: 'url1', createdAt: new Date(), modifiedAt: new Date()
    };
    const mockFileInfo2 = {
      id: 'id2', name: 'video2.mp4', size: 200, mimeType: 'video/mp4',
      path: 'path2', url: 'url2', createdAt: new Date(), modifiedAt: new Date()
    };

    jest.spyOn(service as any, 'downloadFileToTemp').mockImplementation(async (fileInfo) => {
      const tempInputPath = path.join(tempDir, `input_${fileInfo.name}`);
      fs.writeFileSync(tempInputPath, 'dummy video content');
      return tempInputPath;
    });

    mockStorageManager.uploadFile.mockResolvedValue({
      id: 'proxy-id', name: 'proxy.mp4', size: 50, mimeType: 'video/mp4',
      path: 'path', url: 'url', createdAt: new Date(), modifiedAt: new Date()
    });

    const jobId1 = await service.queueProxyGeneration(EntityType.SHOT, 'shot1', mockFileInfo1);
    const jobId2 = await service.queueProxyGeneration(EntityType.ASSET, 'asset1', mockFileInfo2);

    // Wait for both jobs to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(service.getJobStatus(jobId1)?.status).toBe(ProxyJobStatus.COMPLETED);
    expect(service.getJobStatus(jobId2)?.status).toBe(ProxyJobStatus.COMPLETED);
    expect(mockStorageManager.uploadFile).toHaveBeenCalledTimes(2);
  });

  it('should handle errors during proxy generation', async () => {
    const entityId = 'shot_002';
    const originalFileName = 'bad_video.mp4';
    const originalFileInfo = {
      id: 'original-bad-id',
      name: originalFileName,
      size: 1000,
      mimeType: 'video/mp4',
      path: `originals/${originalFileName}`,
      url: `https://mockstorage.com/originals/${originalFileName}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    // Mock FFmpeg to throw an error
    const mockFfmpeg = require('fluent-ffmpeg');
    mockFfmpeg.mockImplementationOnce(() => ({
      videoCodec: jest.fn().mockReturnThis(),
      videoBitrate: jest.fn().mockReturnThis(),
      size: jest.fn().mockReturnThis(),
      format: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation(function(this: any, event: string, callback: Function) {
        if (event === 'error') {
          setTimeout(() => callback(new Error('FFmpeg failed')), 10);
        }
        return this;
      }),
      run: jest.fn().mockReturnThis()
    }));

    const jobId = await service.queueProxyGeneration(
      EntityType.SHOT,
      entityId,
      originalFileInfo
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    const jobStatus = service.getJobStatus(jobId);
    expect(jobStatus?.status).toBe(ProxyJobStatus.FAILED);
    expect(jobStatus?.error).toBe('FFmpeg failed');
    expect(mockStorageManager.uploadFile).not.toHaveBeenCalled();
  });

  it('should clean up temp files after successful generation', async () => {
    const entityId = 'shot_003';
    const originalFileName = 'clean_video.mp4';
    const originalFileInfo = {
      id: 'original-clean-id',
      name: originalFileName,
      size: 1000,
      mimeType: 'video/mp4',
      path: `originals/${originalFileName}`,
      url: `https://mockstorage.com/originals/${originalFileName}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    jest.spyOn(service as any, 'downloadFileToTemp').mockImplementation(async (fileInfo) => {
      const tempInputPath = path.join(tempDir, `input_${fileInfo.name}`);
      fs.writeFileSync(tempInputPath, 'dummy video content');
      return tempInputPath;
    });

    mockStorageManager.uploadFile.mockResolvedValue({
      id: 'proxy-id', name: 'proxy.mp4', size: 50, mimeType: 'video/mp4',
      path: 'path', url: 'url', createdAt: new Date(), modifiedAt: new Date()
    });

    await service.generateProxyImmediate(
      EntityType.SHOT,
      entityId,
      originalFileInfo
    );

    // Expect temp directory to be empty after cleanup
    expect(fs.readdirSync(tempDir)).toHaveLength(0);
  });

  it('should clean up temp files after failed generation', async () => {
    const entityId = 'shot_004';
    const originalFileName = 'fail_video.mp4';
    const originalFileInfo = {
      id: 'original-fail-id',
      name: originalFileName,
      size: 1000,
      mimeType: 'video/mp4',
      path: `originals/${originalFileName}`,
      url: `https://mockstorage.com/originals/${originalFileName}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    // Mock FFmpeg to throw an error
    const mockFfmpeg = require('fluent-ffmpeg');
    mockFfmpeg.mockImplementationOnce(() => ({
      videoCodec: jest.fn().mockReturnThis(),
      videoBitrate: jest.fn().mockReturnThis(),
      size: jest.fn().mockReturnThis(),
      format: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation(function(this: any, event: string, callback: Function) {
        if (event === 'error') {
          setTimeout(() => callback(new Error('FFmpeg failed')), 10);
        }
        return this;
      }),
      run: jest.fn().mockReturnThis()
    }));

    jest.spyOn(service as any, 'downloadFileToTemp').mockImplementation(async (fileInfo) => {
      const tempInputPath = path.join(tempDir, `input_${fileInfo.name}`);
      fs.writeFileSync(tempInputPath, 'dummy video content');
      return tempInputPath;
    });

    await expect(
      service.generateProxyImmediate(
        EntityType.SHOT,
        entityId,
        originalFileInfo
      )
    ).rejects.toThrow('FFmpeg failed');

    // Expect temp directory to be empty after cleanup
    expect(fs.readdirSync(tempDir)).toHaveLength(0);
  });
});