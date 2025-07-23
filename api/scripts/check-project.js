/**
 * Script to check if a specific project exists
 */

require('dotenv').config();
const { SheetsApiClient } = require('../services/sheets/SheetsApiClient');
const { SheetDataService } = require('../services/sheets/SheetDataService');

async function checkProject(projectId) {
  try {
    console.log(`🔍 Checking if project '${projectId}' exists...`);

    // Initialize services
    const sheetsClient = new SheetsApiClient();
    const sheetDataService = new SheetDataService(sheetsClient);

    // Check if the project_meta sheet exists
    const sheetExists = await sheetsClient.sheetExists('project_meta');
    console.log(`📋 project_meta sheet exists: ${sheetExists}`);

    if (!sheetExists) {
      console.error('❌ project_meta sheet does not exist!');
      return;
    }

    // Get the project_meta data
    const metaData = await sheetsClient.getSheetData('project_meta');
    console.log(`📊 project_meta data:`, metaData);

    // Check if the project exists in the meta data
    let projectExists = false;
    let projectConfig = null;

    for (let i = 1; i < metaData.values.length; i++) {
      const row = metaData.values[i];
      if (row[0] === projectId) {
        projectExists = true;
        projectConfig = {
          project_id: row[0],
          storage_provider: row[1],
          originals_root_url: row[2],
          proxies_root_url: row[3],
          created_at: new Date(row[4])
        };
        break;
      }
    }

    console.log(`📋 Project '${projectId}' exists: ${projectExists}`);
    if (projectExists) {
      console.log(`📊 Project config:`, projectConfig);
    }

    // Get all sheet data
    console.log('\n📊 Getting all sheet data...');
    const allData = await sheetDataService.getAllSheetData();
    
    console.log('✅ All data retrieved:');
    console.log(`  - Shots: ${allData.shots.length} records`);
    console.log(`  - Assets: ${allData.assets.length} records`);
    console.log(`  - Tasks: ${allData.tasks.length} records`);
    console.log(`  - Members: ${allData.members.length} records`);
    console.log(`  - Users: ${allData.users.length} records`);
    console.log(`  - Pages: ${allData.pages.length} records`);
    console.log(`  - Fields: ${allData.fields.length} records`);
    console.log(`  - Meta: ${allData.meta.length} records`);
    console.log(`  - Logs: ${allData.logs.length} records`);

    // Check if there are any shots
    if (allData.shots.length > 0) {
      console.log('\n📋 First shot:', JSON.stringify(allData.shots[0], null, 2));
    } else {
      console.log('\n⚠️ No shots found!');
    }

    console.log('\n🎉 Check complete!');

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
if (require.main === module) {
  const projectId = process.argv[2] || 'Oliver05';
  checkProject(projectId)
    .then(() => {
      console.log('\n✅ Check finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkProject };