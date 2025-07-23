/**
 * Script to fix FIELDS and PROJECT_META sheets and add default values
 */

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixSpecialSheets() {
  try {
    console.log('🔧 Fixing FIELDS and PROJECT_META sheets...');

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

    // 1. Fix FIELDS sheet - should only have one header row
    console.log('📝 Fixing Fields sheet...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Fields!A:G'
    });

    // Set single header row for Fields
    const fieldsHeader = [
      ['field_id', 'entity', 'field_name', 'type', 'editable', 'required', 'options']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Fields!A1:G1',
      valueInputOption: 'RAW',
      requestBody: {
        values: fieldsHeader
      }
    });

    // Add field definitions starting from row 2
    const fieldDefinitions = [
      // Shot fields (field_001 to field_014)
      ['field_001', 'shot', 'shot_id', 'text', 'false', 'true', ''],
      ['field_002', 'shot', 'episode', 'text', 'true', 'false', ''],
      ['field_003', 'shot', 'scene', 'text', 'true', 'false', ''],
      ['field_004', 'shot', 'title', 'text', 'true', 'true', ''],
      ['field_005', 'shot', 'status', 'select', 'true', 'true', 'not_started,in_progress,review,approved,completed'],
      ['field_006', 'shot', 'priority', 'number', 'true', 'false', ''],
      ['field_007', 'shot', 'due_date', 'date', 'true', 'false', ''],
      ['field_008', 'shot', 'timecode_fps', 'text', 'true', 'false', ''],
      ['field_009', 'shot', 'folder_label', 'text', 'true', 'false', ''],
      ['field_010', 'shot', 'folder_url', 'url', 'true', 'false', ''],
      ['field_011', 'shot', 'thumbnails', 'thumbnails', 'true', 'false', ''],
      ['field_012', 'shot', 'file_list', 'file_list', 'true', 'false', ''],
      ['field_013', 'shot', 'versions', 'versions', 'true', 'false', ''],
      ['field_014', 'shot', 'notes', 'text', 'true', 'false', ''],
      
      // Asset fields (field_015 to field_025)
      ['field_015', 'asset', 'asset_id', 'text', 'false', 'true', ''],
      ['field_016', 'asset', 'name', 'text', 'true', 'true', ''],
      ['field_017', 'asset', 'asset_type', 'select', 'true', 'true', 'character,prop,environment,effect,other'],
      ['field_018', 'asset', 'status', 'select', 'true', 'true', 'not_started,in_progress,review,approved,completed'],
      ['field_019', 'asset', 'overlap_sensitive', 'checkbox', 'true', 'false', ''],
      ['field_020', 'asset', 'folder_label', 'text', 'true', 'false', ''],
      ['field_021', 'asset', 'folder_url', 'url', 'true', 'false', ''],
      ['field_022', 'asset', 'thumbnails', 'thumbnails', 'true', 'false', ''],
      ['field_023', 'asset', 'file_list', 'file_list', 'true', 'false', ''],
      ['field_024', 'asset', 'versions', 'versions', 'true', 'false', ''],
      ['field_025', 'asset', 'notes', 'text', 'true', 'false', ''],
      
      // Task fields (field_026 to field_035)
      ['field_026', 'task', 'task_id', 'text', 'false', 'true', ''],
      ['field_027', 'task', 'name', 'text', 'true', 'true', ''],
      ['field_028', 'task', 'status', 'select', 'true', 'true', 'not_started,in_progress,blocked,review,completed'],
      ['field_029', 'task', 'assignee_id', 'link_user', 'true', 'false', ''],
      ['field_030', 'task', 'start_date', 'date', 'true', 'false', ''],
      ['field_031', 'task', 'end_date', 'date', 'true', 'false', ''],
      ['field_032', 'task', 'shot_id', 'link_shot', 'true', 'false', ''],
      ['field_033', 'task', 'folder_label', 'text', 'true', 'false', ''],
      ['field_034', 'task', 'folder_url', 'url', 'true', 'false', ''],
      ['field_035', 'task', 'notes', 'text', 'true', 'false', ''],
      
      // Member fields (field_036 to field_042)
      ['field_036', 'member', 'member_id', 'text', 'false', 'true', ''],
      ['field_037', 'member', 'user_id', 'link_user', 'true', 'true', ''],
      ['field_038', 'member', 'role', 'text', 'true', 'true', ''],
      ['field_039', 'member', 'department', 'select', 'true', 'true', 'ANIMATION,PRODUCTION,CAMERA,EDIT,SOUND,VFX'],
      ['field_040', 'member', 'permissions', 'select', 'true', 'true', 'view,edit,admin'],
      ['field_041', 'member', 'joined_date', 'date', 'true', 'false', ''],
      ['field_042', 'member', 'active', 'checkbox', 'true', 'false', ''],
      
      // User fields (field_043 to field_049)
      ['field_043', 'user', 'user_id', 'text', 'false', 'true', ''],
      ['field_044', 'user', 'email', 'text', 'true', 'true', ''],
      ['field_045', 'user', 'name', 'text', 'true', 'true', ''],
      ['field_046', 'user', 'google_id', 'text', 'false', 'true', ''],
      ['field_047', 'user', 'avatar_url', 'url', 'true', 'false', ''],
      ['field_048', 'user', 'created_date', 'date', 'false', 'false', ''],
      ['field_049', 'user', 'last_login', 'date', 'false', 'false', ''],
      
      // Page fields (field_050 to field_057)
      ['field_050', 'page', 'page_id', 'text', 'false', 'true', ''],
      ['field_051', 'page', 'name', 'text', 'true', 'true', ''],
      ['field_052', 'page', 'type', 'select', 'true', 'true', 'table,overview,detail,schedule,chat,forum'],
      ['field_053', 'page', 'config', 'text', 'true', 'false', ''],
      ['field_054', 'page', 'shared', 'checkbox', 'true', 'false', ''],
      ['field_055', 'page', 'created_by', 'link_user', 'false', 'true', ''],
      ['field_056', 'page', 'created_date', 'date', 'false', 'false', ''],
      ['field_057', 'page', 'modified_date', 'date', 'false', 'false', ''],
      
      // Log fields (field_058 to field_065)
      ['field_058', 'log', 'log_id', 'text', 'false', 'true', ''],
      ['field_059', 'log', 'timestamp', 'date', 'false', 'true', ''],
      ['field_060', 'log', 'user_id', 'link_user', 'false', 'true', ''],
      ['field_061', 'log', 'action', 'text', 'false', 'true', ''],
      ['field_062', 'log', 'entity_type', 'select', 'false', 'true', 'shot,asset,task,member,user,page'],
      ['field_063', 'log', 'entity_id', 'text', 'false', 'true', ''],
      ['field_064', 'log', 'changes', 'text', 'false', 'false', ''],
      ['field_065', 'log', 'ip_address', 'text', 'false', 'false', '']
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Fields!A2:G',
      valueInputOption: 'RAW',
      requestBody: {
        values: fieldDefinitions
      }
    });

    console.log('  ✅ Fields sheet fixed');

    // 2. Fix project_meta sheet - should only have one header row
    console.log('📝 Fixing project_meta sheet...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'project_meta!A:E'
    });

    // Set single header row for project_meta
    const projectMetaHeader = [
      ['project_id', 'storage_provider', 'originals_root_url', 'proxies_root_url', 'created_at']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'project_meta!A1:E1',
      valueInputOption: 'RAW',
      requestBody: {
        values: projectMetaHeader
      }
    });

    // Add project metadata starting from row 2
    const projectMeta = [
      [
        'Oliver05',
        'gdrive',
        process.env.ORIGINALS_ROOT_URL || 'https://drive.google.com/drive/folders/originals',
        process.env.PROXIES_ROOT_URL || 'https://drive.google.com/drive/folders/proxies',
        new Date().toISOString()
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'project_meta!A2:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: projectMeta
      }
    });

    console.log('  ✅ project_meta sheet fixed');

    // 3. Add default values to other sheets
    console.log('📝 Adding default values to ProjectMembers...');
    const sampleMembers = [
      [
        'member_001', 'user_001', 'Animator', 'ANIMATION', 'edit',
        '2024-01-01', 'true'
      ],
      [
        'member_002', 'user_002', 'Modeler', 'ANIMATION', 'edit',
        '2024-01-01', 'true'
      ],
      [
        'member_003', 'user_003', 'Director', 'PRODUCTION', 'admin',
        '2024-01-01', 'true'
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'ProjectMembers!A3:G',
      valueInputOption: 'RAW',
      requestBody: {
        values: sampleMembers
      }
    });

    console.log('📝 Adding default values to Users...');
    const sampleUsers = [
      [
        'user_001', 'animator@example.com', 'Alice Animator', 'google_id_001',
        'https://example.com/avatar1.jpg', '2024-01-01', '2024-01-15'
      ],
      [
        'user_002', 'modeler@example.com', 'Bob Modeler', 'google_id_002',
        'https://example.com/avatar2.jpg', '2024-01-01', '2024-01-14'
      ],
      [
        'user_003', 'director@example.com', 'Carol Director', 'google_id_003',
        'https://example.com/avatar3.jpg', '2024-01-01', '2024-01-16'
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Users!A3:G',
      valueInputOption: 'RAW',
      requestBody: {
        values: sampleUsers
      }
    });

    console.log('📝 Adding default values to Pages...');
    const samplePages = [
      [
        'page_001', 'Shots Overview', 'table', 
        JSON.stringify({
          entity: 'shot',
          fields: ['shot_id', 'title', 'status', 'priority', 'due_date'],
          fieldWidths: { shot_id: 100, title: 200, status: 120, priority: 80, due_date: 120 },
          filters: {},
          sorting: { field: 'priority', direction: 'desc' }
        }),
        'true', 'user_003', '2024-01-01', '2024-01-01'
      ],
      [
        'page_002', 'Assets Library', 'table',
        JSON.stringify({
          entity: 'asset',
          fields: ['asset_id', 'name', 'asset_type', 'status'],
          fieldWidths: { asset_id: 100, name: 200, asset_type: 120, status: 120 },
          filters: {},
          sorting: { field: 'name', direction: 'asc' }
        }),
        'true', 'user_003', '2024-01-01', '2024-01-01'
      ],
      [
        'page_003', 'Task Dashboard', 'table',
        JSON.stringify({
          entity: 'task',
          fields: ['task_id', 'name', 'status', 'assignee_id', 'due_date'],
          fieldWidths: { task_id: 100, name: 200, status: 120, assignee_id: 120, due_date: 120 },
          filters: { status: ['in_progress', 'not_started'] },
          sorting: { field: 'due_date', direction: 'asc' }
        }),
        'true', 'user_003', '2024-01-01', '2024-01-01'
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Pages!A3:H',
      valueInputOption: 'RAW',
      requestBody: {
        values: samplePages
      }
    });

    console.log('🎉 Sheet fixes complete!');
    console.log('');
    console.log('✅ Fixed issues:');
    console.log('  - Fields sheet: Single header row (no field_id mapping needed)');
    console.log('  - project_meta sheet: Single header row (no field_id mapping needed)');
    console.log('  - Added default values to ProjectMembers, Users, and Pages');
    console.log('  - Logs sheet remains empty (as requested)');

  } catch (error) {
    console.error('❌ Error fixing sheets:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  fixSpecialSheets()
    .then(() => {
      console.log('\n✅ Fix complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixSpecialSheets };