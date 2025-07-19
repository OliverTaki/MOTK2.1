// Simple test to check if backend is working
const http = require('http');

console.log('🔍 Testing backend connection...');

// Test backend health endpoint
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`✅ Backend responded with status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response:', data);
    
    if (res.statusCode === 200) {
      console.log('🎉 Backend is working correctly!');
    } else {
      console.log('⚠️  Backend responded but with error status');
    }
  });
});

req.on('error', (err) => {
  console.log('❌ Backend connection failed:', err.message);
  console.log('');
  console.log('🔧 Troubleshooting steps:');
  console.log('1. Make sure you started the backend server:');
  console.log('   cd api');
  console.log('   npm run dev');
  console.log('');
  console.log('2. Check if port 3001 is available:');
  console.log('   npx kill-port 3001');
  console.log('');
  console.log('3. Check for errors in the backend terminal');
});

req.end();

// Also test the projects endpoint that's failing
setTimeout(() => {
  console.log('\n🔍 Testing projects endpoint...');
  
  const projectOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/projects/demo-project',
    method: 'GET'
  };

  const projectReq = http.request(projectOptions, (res) => {
    console.log(`📡 Projects endpoint status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Projects endpoint working');
      } else {
        console.log('❌ Projects endpoint error:', data);
      }
    });
  });

  projectReq.on('error', (err) => {
    console.log('❌ Projects endpoint failed:', err.message);
  });

  projectReq.end();
}, 1000);