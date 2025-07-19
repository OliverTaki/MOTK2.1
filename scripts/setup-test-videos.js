const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

/**
 * Script to create test video files for proxy generation testing
 */
async function createTestVideo(outputPath, duration = 1, width = 320, height = 240, color = 'blue') {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Creating test video: ${outputPath}`);
    
    ffmpeg()
      .input(`color=c=${color}:size=${width}x${height}:duration=${duration}`)
      .inputFormat('lavfi')
      .videoCodec('libx264')
      .videoBitrate('100k')
      .format('mp4')
      .output(outputPath)
      .on('end', () => {
        console.log(`✓ Created: ${outputPath}`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`✗ Failed to create ${outputPath}:`, err.message);
        reject(err);
      })
      .run();
  });
}

async function setupTestVideos() {
  const testDataDir = path.join(process.cwd(), 'test-data', 'media');
  
  console.log('Setting up test video files...');
  
  const videoConfigs = [
    { name: 'sample.mp4', color: 'red', duration: 2 },
    { name: 'test-video.mp4', color: 'green', duration: 1 },
    { name: 'original.mov', color: 'blue', duration: 1 },
    { name: 'video_1.mp4', color: 'yellow', duration: 1 },
    { name: 'video_2.mp4', color: 'purple', duration: 1 },
    { name: 'video_3.mp4', color: 'orange', duration: 1 },
    { name: 'concurrent_0.mp4', color: 'cyan', duration: 1 },
    { name: 'concurrent_1.mp4', color: 'magenta', duration: 1 },
    { name: 'concurrent_2.mp4', color: 'lime', duration: 1 },
    { name: 'concurrent_3.mp4', color: 'pink', duration: 1 },
    { name: 'concurrent_4.mp4', color: 'brown', duration: 1 }
  ];

  try {
    for (const config of videoConfigs) {
      const filePath = path.join(testDataDir, config.name);
      
      // Skip if file already exists
      if (fs.existsSync(filePath)) {
        console.log(`⚠ Skipping existing file: ${config.name}`);
        continue;
      }
      
      await createTestVideo(filePath, config.duration, 320, 240, config.color);
    }
    
    console.log('\n✅ Test video setup complete!');
  } catch (error) {
    console.error('\n❌ Failed to setup test videos:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupTestVideos();
}

module.exports = { setupTestVideos, createTestVideo };