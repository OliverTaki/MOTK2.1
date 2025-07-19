import * as fs from 'fs';
import *s path from 'path';
import { FileInfo, EntityType } from '../../../../shared/types';

/**
 * Test utilities for proxy generation testing
 */
export class ProxyTestUtils {
  private static testDataDir = path.join(process.cwd(), 'test-data', 'media');

  /**
   * Ensure test data directory exists
   */
  static ensureTestDataDirectory(): void {
    if (!fs.existsSync(this.testDataDir)) {
      fs.mkdirSync(this.testDataDir, { recursive: true });
    }
  }

  /**
   * Create a sample video file for testing using FFmpeg
   */
  static async createSampleVideoFile(filename: string, durationSeconds: number = 1): Promise<string> {
    this.ensureTestDataDirectory();
    const filePath = path.join(this.testDataDir, filename);
    
    // Skip creation if file already exists
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    
    try {
      // Create a minimal test video using FFmpeg
      const ffmpeg = require('fluent-ffmpeg');
      
      return new Promise<string>((resolve, reject) => {
        ffmpeg()
          .input(`color=c=red:size=320x240:duration=${durationSeconds}`)
          .inputFormat('lavfi')
          .videoCodec('libx264')
          .videoBitrate('100k')
          .format('mp4')
          .output(filePath)
          .on('end', () => resolve(filePath))
          .on('error', (err: Error) => {
            console.warn(`Failed to create test video ${filename}, creating placeholder:`, err.message);
            // Fallback to placeholder file
            const buffer = Buffer.alloc(1024);
            fs.writeFileSync(filePath, buffer);
            resolve(filePath);
          })
          .run();
      });
    } catch (error) {
      console.warn(`FFmpeg not available for test video creation, using placeholder for ${filename}`);
      // Fallback to placeholder file
      const buffer = Buffer.alloc(1024);
      fs.writeFileSync(filePath, buffer);
      return filePath;
    }
  }

  /**
   * Create a sample video file synchronously for testing (fallback method)
   */
  static createSampleVideoFileSync(filename: string, sizeKB: number = 100): string {
    this.ensureTestDataDirectory();
    const filePath = path.join(this.testDataDir, filename);
    
    // Create a buffer with random data to simulate video content
    const buffer = Buffer.alloc(sizeKB * 1024);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  /**
   * Create sample FileInfo object for testing
   */
  static createSampleFileInfo(
    filename: string = 'test-video.mp4',
    entityType: EntityType = EntityType.SHOT,
    entityId: string = 'shot_001'
  ): FileInfo {
    return {
      id: `test-${Date.now()}`,
      name: filename,
      size: 1024000, // 1MB
      mimeType: 'video/mp4',
      path: `${entityType}_${entityId}/${filename}`,
      url: `https://storage.example.com/${entityType}_${entityId}/${filename}`,
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  }

  /**
   * Create multiple sample video files with different formats
   */
  static async createSampleVideoFiles(): Promise<{ [key: string]: string }> {
    this.ensureTestDataDirectory();
    
    const files = {
      'sample.mp4': await this.createSampleVideoFile('sample.mp4', 1),
      'sample.mov': await this.createSampleVideoFile('sample.mov', 1),
      'sample.avi': await this.createSampleVideoFile('sample.avi', 1),
      'sample.mkv': await this.createSampleVideoFile('sample.mkv', 1)
    };

    return files;
  }

  /**
   * Create multiple sample video files synchronously (fallback)
   */
  static createSampleVideoFilesSync(): { [key: string]: string } {
    this.ensureTestDataDirectory();
    
    const files = {
      'sample.mp4': this.createSampleVideoFileSync('sample.mp4', 500),
      'sample.mov': this.createSampleVideoFileSync('sample.mov', 750),
      'sample.avi': this.createSampleVideoFileSync('sample.avi', 600),
      'sample.mkv': this.createSampleVideoFileSync('sample.mkv', 800)
    };

    return files;
  }

  /**
   * Create sample image file (non-video) for negative testing
   */
  static createSampleImageFile(filename: string = 'test-image.jpg'): string {
    this.ensureTestDataDirectory();
    const filePath = path.join(this.testDataDir, filename);
    
    // Create a small buffer to simulate image content
    const buffer = Buffer.alloc(1024); // 1KB
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  /**
   * Clean up test files
   */
  static cleanupTestFiles(): void {
    if (fs.existsSync(this.testDataDir)) {
      const files = fs.readdirSync(this.testDataDir);
      files.forEach(file => {
        const filePath = path.join(this.testDataDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      fs.rmdirSync(this.testDataDir);
    }
  }

  /**
   * Get test data directory path
   */
  static getTestDataDir(): string {
    return this.testDataDir;
  }

  /**
   * Create FileInfo for image file (for negative testing)
   */
  static createSampleImageFileInfo(filename: string = 'test-image.jpg'): FileInfo {
    return {
      id: `test-img-${Date.now()}`,
      name: filename,
      size: 1024, // 1KB
      mimeType: 'image/jpeg',
      path: `shot_001/${filename}`,
      url: `https://storage.example.com/shot_001/${filename}`,
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  }

  /**
   * Verify proxy file naming convention
   */
  static verifyProxyFileName(
    proxyFileName: string,
    entityId: string,
    take?: string,
    version?: number
  ): boolean {
    let expectedName = entityId;
    
    if (take) {
      expectedName += `_${take}`;
    }
    
    if (version !== undefined) {
      expectedName += `_v${version.toString().padStart(2, '0')}`;
    }
    
    expectedName += '_proxy.mp4';
    
    return proxyFileName === expectedName;
  }

  /**
   * Create test configuration for different proxy scenarios
   */
  static getProxyTestScenarios(): Array<{
    name: string;
    entityId: string;
    take?: string;
    version?: number;
    expectedFileName: string;
  }> {
    return [
      {
        name: 'Basic proxy',
        entityId: 'shot_001',
        expectedFileName: 'shot_001_proxy.mp4'
      },
      {
        name: 'Proxy with take',
        entityId: 'shot_001',
        take: 'take1',
        expectedFileName: 'shot_001_take1_proxy.mp4'
      },
      {
        name: 'Proxy with version',
        entityId: 'shot_001',
        version: 3,
        expectedFileName: 'shot_001_v03_proxy.mp4'
      },
      {
        name: 'Proxy with take and version',
        entityId: 'shot_001',
        take: 'take2',
        version: 5,
        expectedFileName: 'shot_001_take2_v05_proxy.mp4'
      },
      {
        name: 'Asset proxy',
        entityId: 'asset_character_001',
        expectedFileName: 'asset_character_001_proxy.mp4'
      },
      {
        name: 'Task proxy with complex ID',
        entityId: 'task_animation_shot_001',
        take: 'final',
        version: 10,
        expectedFileName: 'task_animation_shot_001_final_v10_proxy.mp4'
      }
    ];
  }
}