/**
 * Script to debug environment variables
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🔍 Environment Variables Debug:');
console.log('GOOGLE_PROJECT_ID:', process.env.GOOGLE_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('GSA_EMAIL:', process.env.GSA_EMAIL ? '✅ Set' : '❌ Missing');
console.log('GSA_PRIVATE_KEY:', process.env.GSA_PRIVATE_KEY ? '✅ Set (length: ' + process.env.GSA_PRIVATE_KEY.length + ')' : '❌ Missing');
console.log('GOOGLE_SHEETS_ID:', process.env.GOOGLE_SHEETS_ID ? '✅ Set' : '❌ Missing');

if (process.env.GSA_EMAIL) {
  console.log('GSA_EMAIL value:', process.env.GSA_EMAIL);
}

if (process.env.GSA_PRIVATE_KEY) {
  console.log('GSA_PRIVATE_KEY starts with:', process.env.GSA_PRIVATE_KEY.substring(0, 50) + '...');
  console.log('Contains \\n sequences:', process.env.GSA_PRIVATE_KEY.includes('\\n'));
}

// Test credentials object creation
try {
  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID ?? '',
    client_email: process.env.GSA_EMAIL ?? '',
    private_key: (process.env.GSA_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  };
  
  console.log('\n📋 Credentials object:');
  console.log('type:', credentials.type);
  console.log('project_id:', credentials.project_id);
  console.log('client_email:', credentials.client_email);
  console.log('private_key length:', credentials.private_key.length);
  console.log('private_key starts with:', credentials.private_key.substring(0, 30) + '...');
  
} catch (error) {
  console.error('❌ Error creating credentials:', error.message);
}