/**
 * Script to create a new Google Spreadsheet for MOTK project
 * Run this to get a spreadsheet ID for your .env file
 */

const { google } = require('googleapis');
require('dotenv').config();

async function createSpreadsheet() {
  try {
    console.log('🔧 Checking environment variables...');
    console.log('Project ID:', process.env.GOOGLE_PROJECT_ID ? 'Set' : 'Missing');
    console.log('Service Account Email:', process.env.GSA_EMAIL ? 'Set' : 'Missing');
    console.log('Private Key:', process.env.GSA_PRIVATE_KEY ? 'Set' : 'Missing');

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

    console.log('🔧 Testing authentication...');
    const authClient = await auth.getClient();
    console.log('✅ Authentication successful');

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    console.log('🔧 Creating new MOTK spreadsheet...');

    // Create new spreadsheet
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `MOTK Project:Oliver05`,
        },
        sheets: [
          {
            properties: {
              title: 'project_meta',
            },
          },
        ],
      },
    });

    const spreadsheetId = response.data.spreadsheetId;
    const spreadsheetUrl = response.data.spreadsheetUrl;

    console.log('✅ Spreadsheet created successfully!');
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
    console.log(`🔗 Spreadsheet URL: ${spreadsheetUrl}`);

    // Make the spreadsheet accessible to anyone with the link
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'anyone',
      },
    });

    console.log('🔓 Spreadsheet permissions set to "anyone with link can edit"');
    console.log('');
    console.log('📝 Next steps:');
    console.log(`1. Add this line to your api/.env file:`);
    console.log(`   GOOGLE_SHEETS_ID=${spreadsheetId}`);
    console.log('');
    console.log('2. Test the connection by running:');
    console.log('   cd api && npm run dev');
    console.log('');
    console.log('3. Initialize your project by calling:');
    console.log('   POST http://localhost:3001/api/projects/init');

    return spreadsheetId;
  } catch (error) {
    console.error('❌ Error creating spreadsheet:', error);
    
    if (error.message?.includes('credentials')) {
      console.log('');
      console.log('🔧 Credential issues detected. Please check:');
      console.log('1. GSA_EMAIL is set correctly in .env');
      console.log('2. GSA_PRIVATE_KEY is set correctly (with proper newlines)');
      console.log('3. Service account has Sheets and Drive API access');
    }
    
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createSpreadsheet()
    .then((id) => {
      console.log(`\n🎉 Setup complete! Spreadsheet ID: ${id}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createSpreadsheet };