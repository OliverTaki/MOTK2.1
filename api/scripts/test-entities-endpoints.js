/**
 * Script to test entities endpoints directly
 */

const axios = require('axios');

async function testEntitiesEndpoints() {
  try {
    console.log('🧪 Testing entities endpoints...');

    const baseUrl = 'http://localhost:3001';
    
    // Test health endpoint first
    console.log('\n🏥 Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${baseUrl}/health`);
      console.log('✅ Health check:', healthResponse.data);
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      console.log('💡 Make sure the API server is running on port 3001');
      return;
    }

    // Test entities endpoints
    const endpoints = [
      '/api/entities/shot?sort=%7B%22field%22%3A%22due_date%22%2C%22direction%22%3A%22asc%22%7D&limit=10',
      '/api/entities/asset?sort=%7B%22field%22%3A%22status%22%2C%22direction%22%3A%22asc%22%7D&limit=10',
      '/api/entities/task?sort=%7B%22field%22%3A%22end_date%22%2C%22direction%22%3A%22asc%22%7D&limit=10'
    ];

    for (const endpoint of endpoints) {
      console.log(`\n📋 Testing ${endpoint}...`);
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`);
        console.log('✅ Success:', {
          status: response.status,
          dataCount: response.data.data?.length || 0,
          total: response.data.total
        });
        
        if (response.data.data && response.data.data.length > 0) {
          console.log('  Sample record:', JSON.stringify(response.data.data[0], null, 2));
        }
      } catch (error) {
        console.error('❌ Failed:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
    }

    console.log('\n🎉 Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testEntitiesEndpoints()
    .then(() => {
      console.log('\n✅ Test finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testEntitiesEndpoints };