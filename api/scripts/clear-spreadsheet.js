/**
 * Script to clear all sheets in the current spreadsheet
 */

const { google } = require('googleapis');
require('dotenv').config();

async function clearSpreadsheet() {
  try {
    console.log('🔧 Clearing existing spreadsheet...');

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

    // Get all sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const sheetNames = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title).filter(Boolean) || [];
    console.log('📋 Found sheets:', sheetNames);

    // Clear all sheets
    for (const sheetName of sheetNames) {
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: spreadsheetId,
          range: `${sheetName}!A:Z`,
        });
        console.log(`✅ Cleared sheet: ${sheetName}`);
      } catch (error) {
        console.log(`⚠️ Could not clear sheet ${sheetName}:`, error.message);
      }
    }

    console.log('🎉 Spreadsheet cleared successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Run a new project initialization');
    console.log('2. Test the new structure');

  } catch (error) {
    console.error('❌ Error clearing spreadsheet:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  clearSpreadsheet()
    .then(() => {
      console.log('\n✅ Clear complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Clear failed:', error.message);
      process.exit(1);
    });
}

module.exports = { clearSpreadsheet };