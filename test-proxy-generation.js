const { ProxyGenerationService } = require('./dist/api/services/proxy/ProxyGenerationService');
const { EntityType } = require('./dist/shared/types');

async function testProxyGeneration() {
  console.log('Testing proxy generation...');
  
  const service = new ProxyGenerationService();
  
  // Create a test file info that points to our test video
  const testFileInfo = {
    id: 'test-file-1',
    name: 'sample.mp4',
    size: 1024000,
    mimeType: 'video/mp4',
    path: 'test-data/media/sample.mp4',
    url: 'file://test-data/media/sample.mp4',
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  try {
    console.log('Generating proxy for sample.mp4...');
    const result = await service.generateProxyImmediate(
      EntityType.SHOT,
      'shot_001',
      testFileInfo
    );
    
    console.log('✅ Proxy generation successful!');
    console.log('Proxy filename:', result.proxyFileName);
    console.log('Proxy file info:', result.proxyFileInfo);
  } catch (error) {
    console.error('❌ Proxy generation failed:', error.message);
  }
}

testProxyGeneration();