/**
 * Script to verify the Google Sheets structure
 */

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifySheetStructure() {
  try {
    console.log('🔍 Verifying Google Sheets structure...');

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
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // Check Shots sheet structure
    console.log('📋 Checking Shots sheet...');
    const shotsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Shots!A1:N5'
    });

    const rows = shotsData.data.values || [];
    
    if (rows.length >= 2) {
      console.log('  Row 1 (Field IDs):', rows[0]);
      console.log('  Row 2 (Field Names):', rows[1]);
      
      if (rows.length > 2) {
        console.log('  Row 3 (Sample Data):', rows[2]);
      }
    }

    // Check Assets sheet structure
    console.log('\n📋 Checking Assets sheet...');
    const assetsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Assets!A1:K3'
    });

    const assetRows = assetsData.data.values || [];
    
    if (assetRows.length >= 2) {
      console.log('  Row 1 (Field IDs):', assetRows[0]);
      console.log('  Row 2 (Field Names):', assetRows[1]);
    }

    // Check Fields sheet
    console.log('\n📋 Checking Fields sheet...');
    const fieldsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Fields!A1:G5'
    });

    const fieldRows = fieldsData.data.values || [];
    
    if (fieldRows.length >= 2) {
      console.log('  Row 1 (Headers):', fieldRows[0]);
      console.log('  Row 2 (Headers):', fieldRows[1]);
      
      if (fieldRows.length > 2) {
        console.log('  Row 3 (Field Definition):', fieldRows[2]);
      }
    }

    console.log('\n✅ Structure verification complete!');

  } catch (error) {
    console.error('❌ Error verifying structure:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  verifySheetStructure()
    .then(() => {
      console.log('\n✅ Verification complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { verifySheetStructure };