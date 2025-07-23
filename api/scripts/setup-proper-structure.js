/**
 * Script to set up proper spreadsheet structure with correct field IDs
 */

const { google } = require('googleapis');
require('dotenv').config();

async function setupProperStructure() {
  try {
    console.log('🔧 Setting up proper spreadsheet structure...');

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

    // 1. Update spreadsheet title
    console.log('📝 Updating spreadsheet title...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSpreadsheetProperties: {
              properties: {
                title: 'MOTK [Project:Oliver05]'
              },
              fields: 'title'
            }
          }
        ]
      }
    });
    console.log('✅ Spreadsheet title updated');

    // 2. Delete default sheet if it exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const defaultSheet = spreadsheet.data.sheets?.find(sheet => 
      sheet.properties?.title === 'シート1' || sheet.properties?.title === 'Sheet1'
    );
    
    if (defaultSheet && defaultSheet.properties?.sheetId !== undefined) {
      console.log('🗑️ Deleting default sheet...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: defaultSheet.properties.sheetId
              }
            }
          ]
        }
      });
      console.log('✅ Default sheet deleted');
    }

    console.log('🎉 Spreadsheet structure setup complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Run project initialization');
    console.log('2. Check that field_001, field_002... appear in ROW 1');

  } catch (error) {
    console.error('❌ Error setting up structure:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  setupProperStructure()
    .then(() => {
      console.log('\n✅ Setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupProperStructure };