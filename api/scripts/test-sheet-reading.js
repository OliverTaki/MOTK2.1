/**
 * Script to test sheet data reading functionality
 */

const { SheetsApiClient } = require('../services/sheets/SheetsApiClient');
const { SheetDataService } = require('../services/sheets/SheetDataService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testSheetReading() {
  try {
    console.log('🧪 Testing sheet data reading...');

    // Initialize services
    const sheetsClient = new SheetsApiClient();
    const sheetDataService = new SheetDataService(sheetsClient);

    // Test 1: Get all sheet data
    console.log('\n📊 Test 1: Getting all sheet data...');
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

    // Test 2: Get specific sheet data
    console.log('\n📋 Test 2: Getting Shots data...');
    const shotsData = await sheetDataService.getSheetData('Shots');
    console.log('✅ Shots data:');
    if (shotsData.length > 0) {
      console.log('  First shot:', JSON.stringify(shotsData[0], null, 2));
    }

    // Test 3: Get field mappings
    console.log('\n🗺️ Test 3: Getting field mappings...');
    const fieldMappings = await sheetDataService.getFieldMappings();
    console.log('✅ Field mappings:');
    console.log('  Sample mappings:', Object.keys(fieldMappings).slice(0, 5).map(key => ({
      [key]: fieldMappings[key]
    })));

    // Test 4: Get project metadata
    console.log('\n📋 Test 4: Getting project metadata...');
    const projectMeta = await sheetDataService.getProjectMeta();
    console.log('✅ Project metadata:', JSON.stringify(projectMeta, null, 2));

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testSheetReading()
    .then(() => {
      console.log('\n✅ Test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testSheetReading };