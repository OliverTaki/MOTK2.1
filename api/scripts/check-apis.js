/**
 * Script to check if required Google APIs are enabled
 */

const { google } = require('googleapis');
require('dotenv').config();

async function checkAPIs() {
  try {
    console.log('🔧 Checking Google APIs status...');

    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        client_email: process.env.GSA_EMAIL,
        private_key: process.env.GSA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/cloud-platform',
      ],
    });

    const serviceUsage = google.serviceusage({ version: 'v1', auth });

    // Check Sheets API
    try {
      const sheetsAPI = await serviceUsage.services.get({
        name: `projects/${process.env.GOOGLE_PROJECT_ID}/services/sheets.googleapis.com`
      });
      console.log('📊 Google Sheets API:', sheetsAPI.data.state);
    } catch (error) {
      console.log('❌ Google Sheets API: Not accessible or not enabled');
    }

    // Check Drive API
    try {
      const driveAPI = await serviceUsage.services.get({
        name: `projects/${process.env.GOOGLE_PROJECT_ID}/services/drive.googleapis.com`
      });
      console.log('📁 Google Drive API:', driveAPI.data.state);
    } catch (error) {
      console.log('❌ Google Drive API: Not accessible or not enabled');
    }

    // Try a simple Sheets API call
    console.log('\n🧪 Testing Sheets API access...');
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Try to list spreadsheets (this should work if API is enabled)
    try {
      const testResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'API Test - Delete Me'
          }
        }
      });
      
      console.log('✅ Sheets API test successful!');
      console.log('📊 Test spreadsheet created:', testResponse.data.spreadsheetId);
      
      // Clean up test spreadsheet
      const drive = google.drive({ version: 'v3', auth });
      await drive.files.delete({
        fileId: testResponse.data.spreadsheetId
      });
      console.log('🗑️ Test spreadsheet deleted');
      
    } catch (error) {
      console.log('❌ Sheets API test failed:', error.message);
      
      if (error.code === 403) {
        console.log('\n🔧 Possible solutions:');
        console.log('1. Enable Google Sheets API in Google Cloud Console');
        console.log('2. Enable Google Drive API in Google Cloud Console');
        console.log('3. Check service account permissions');
        console.log('\n🔗 Enable APIs here:');
        console.log(`   Sheets: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=${process.env.GOOGLE_PROJECT_ID}`);
        console.log(`   Drive:  https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${process.env.GOOGLE_PROJECT_ID}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking APIs:', error.message);
  }
}

// Run the script
if (require.main === module) {
  checkAPIs()
    .then(() => {
      console.log('\n✅ API check complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 API check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkAPIs };