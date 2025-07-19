import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper utility to create actual test video files for proxy generation testing
 */
export class VideoTestHelper {
  /**
   * Create a simple test video file using FFmpeg
   */
  static async createTestVideo(
    outputPath: string,
    duration: number = 1,
    width: number = 320,
    height: number = 240,
    color: string = 'blue'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      ffmpeg()
        .input(`color=c=${color}:size=${width}x${height}:duration=${duration}`)
        .inputFormat('lavfi')
        .videoCodec('libx264')
        .videoBitrate('100k')
        .format('mp4')
        .output(outputPath)
        .on('end', () => {
          console.log(`Created test video: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Failed to create test video ${outputPath}:`, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Create multiple test video files for different formats
   */
  static async createTestVideoFiles(baseDir: string): Promise<{ [key: string]: string }> {
    const files: { [key: string]: string } = {};
    
    const videoConfigs = [
      { name: 'sample.mp4', color: 'red' },
      { name: 'test-video.mp4', color: 'green' },
      { name: 'original.mp4', color: 'blue' },
      { name: 'video_1.mp4', color: 'yellow' },
      { name: 'video_2.mp4', color: 'purple' },
      { name: 'video_3.mp4', color: 'orange' }
    ];

    for (const config of videoConfigs) {
      const filePath = path.join(baseDir, config.name);
      try {
        await this.createTestVideo(filePath, 1, 320, 240, config.color);
        files[config.name] = filePath;
      } catch (error) {
        console.warn(`Failed to create ${config.name}, skipping:`, error);
      }
    }

    return files;
  }

  /**
   * Check if FFmpeg is available
   */
  static async checkFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg()
        .input('color=c=black:size=1x1:duration=0.1')
        .inputFormat('lavfi')
        .format('null')
        .output('-')
        .on('end', () => resolve(true))
        .on('error', () => resolve(false))
        .run();
    });
  }

  /**
   * Create a placeholder file if FFmpeg is not available
   */
  static createPlaceholderVideo(outputPath: string, sizeKB: number = 100): void {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a buffer with some structured data that looks like a video file header
    const buffer = Buffer.alloc(sizeKB * 1024);
    
    // Add some MP4-like header bytes
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // isom brand
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // compatible brands
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31  // more brands
    ]);
    
    mp4Header.copy(buffer, 0);
    
    // Fill rest with random data
    for (let i = mp4Header.length; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`Created placeholder video file: ${outputPath}`);
  }
}