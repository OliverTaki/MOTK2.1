/**
 * Script to recreate Google Sheets with proper two-row header structure
 * Row 1: field_001, field_002, field_003...
 * Row 2: shot_id, episode, scene, title...
 */

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function recreateProperSheets() {
  try {
    console.log('🔧 Recreating Google Sheets with proper structure...');

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
    
    console.log('🔍 Debug info:');
    console.log('  GOOGLE_SHEETS_ID:', spreadsheetId);
    console.log('  GSA_EMAIL:', process.env.GSA_EMAIL);
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_ID environment variable is not set');
    }

    // 1. Clear all existing sheets first
    console.log('🗑️ Clearing existing sheets...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets || [];
    
    // Clear content from all sheets
    for (const sheet of existingSheets) {
      const sheetName = sheet.properties?.title;
      if (sheetName && !['シート1', 'Sheet1'].includes(sheetName)) {
        console.log(`  Clearing ${sheetName}...`);
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A:Z`
        });
      }
    }

    // 2. Create proper sheet structure with two-row headers
    const sheetConfigs = [
      {
        name: 'Shots',
        fieldIds: [
          'field_001', 'field_002', 'field_003', 'field_004', 'field_005', 'field_006',
          'field_007', 'field_008', 'field_009', 'field_010',
          'field_011', 'field_012', 'field_013', 'field_014'
        ],
        fieldNames: [
          'shot_id', 'episode', 'scene', 'title', 'status', 'priority',
          'due_date', 'timecode_fps', 'folder_label', 'folder_url',
          'thumbnails', 'file_list', 'versions', 'notes'
        ]
      },
      {
        name: 'Assets',
        fieldIds: [
          'field_015', 'field_016', 'field_017', 'field_018', 'field_019',
          'field_020', 'field_021', 'field_022', 'field_023', 'field_024', 'field_025'
        ],
        fieldNames: [
          'asset_id', 'name', 'asset_type', 'status', 'overlap_sensitive',
          'folder_label', 'folder_url', 'thumbnails', 'file_list', 'versions', 'notes'
        ]
      },
      {
        name: 'Tasks',
        fieldIds: [
          'field_026', 'field_027', 'field_028', 'field_029', 'field_030',
          'field_031', 'field_032', 'field_033', 'field_034', 'field_035'
        ],
        fieldNames: [
          'task_id', 'name', 'status', 'assignee_id', 'start_date',
          'end_date', 'shot_id', 'folder_label', 'folder_url', 'notes'
        ]
      },
      {
        name: 'ProjectMembers',
        fieldIds: [
          'field_036', 'field_037', 'field_038', 'field_039', 'field_040',
          'field_041', 'field_042'
        ],
        fieldNames: [
          'member_id', 'user_id', 'role', 'department', 'permissions',
          'joined_date', 'active'
        ]
      },
      {
        name: 'Users',
        fieldIds: [
          'field_043', 'field_044', 'field_045', 'field_046', 'field_047',
          'field_048', 'field_049'
        ],
        fieldNames: [
          'user_id', 'email', 'name', 'google_id', 'avatar_url',
          'created_date', 'last_login'
        ]
      },
      {
        name: 'Pages',
        fieldIds: [
          'field_050', 'field_051', 'field_052', 'field_053', 'field_054', 'field_055',
          'field_056', 'field_057'
        ],
        fieldNames: [
          'page_id', 'name', 'type', 'config', 'shared', 'created_by',
          'created_date', 'modified_date'
        ]
      },
      {
        name: 'Fields',
        fieldIds: [
          'field_id', 'entity', 'field_name', 'type', 'editable',
          'required', 'options'
        ],
        fieldNames: [
          'field_id', 'entity', 'field_name', 'type', 'editable',
          'required', 'options'
        ]
      },
      {
        name: 'project_meta',
        fieldIds: [
          'project_id', 'storage_provider', 'originals_root_url',
          'proxies_root_url', 'created_at'
        ],
        fieldNames: [
          'project_id', 'storage_provider', 'originals_root_url',
          'proxies_root_url', 'created_at'
        ]
      },
      {
        name: 'Logs',
        fieldIds: [
          'field_058', 'field_059', 'field_060', 'field_061', 'field_062',
          'field_063', 'field_064', 'field_065'
        ],
        fieldNames: [
          'log_id', 'timestamp', 'user_id', 'action', 'entity_type',
          'entity_id', 'changes', 'ip_address'
        ]
      }
    ];

    // 3. Create sheets if they don't exist and set up proper headers
    for (const config of sheetConfigs) {
      console.log(`📝 Setting up ${config.name} sheet...`);
      
      // Check if sheet exists
      const sheetExists = existingSheets.some(sheet => sheet.properties?.title === config.name);
      
      if (!sheetExists) {
        // Create the sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: config.name
                }
              }
            }]
          }
        });
        console.log(`  ✅ Created ${config.name} sheet`);
      }

      // Set up two-row header structure
      const headerData = [
        config.fieldIds,    // Row 1: field_001, field_002, etc.
        config.fieldNames   // Row 2: shot_id, episode, etc.
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${config.name}!A1:${String.fromCharCode(65 + config.fieldIds.length - 1)}2`,
        valueInputOption: 'RAW',
        requestBody: {
          values: headerData
        }
      });

      console.log(`  ✅ Set up headers for ${config.name}`);
    }

    // 4. Add sample data to Shots sheet
    console.log('📝 Adding sample data to Shots...');
    const sampleShots = [
      [
        'shot_001', 'EP01', 'SC01', 'Opening Scene', 'not_started', '1',
        '2024-02-01', '24fps', 'shot_001', `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/shots/shot_001`,
        '', '', '', 'Opening establishing shot'
      ],
      [
        'shot_002', 'EP01', 'SC01', 'Character Introduction', 'in_progress', '2',
        '2024-02-05', '24fps', 'shot_002', `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/shots/shot_002`,
        '', '', '', 'Main character enters frame'
      ],
      [
        'shot_003', 'EP01', 'SC02', 'Dialogue Scene', 'not_started', '1',
        '2024-02-10', '24fps', 'shot_003', `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/shots/shot_003`,
        '', '', '', 'Two-person dialogue sequence'
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Shots!A3:N',
      valueInputOption: 'RAW',
      requestBody: {
        values: sampleShots
      }
    });

    // 5. Add sample data to Assets sheet
    console.log('📝 Adding sample data to Assets...');
    const sampleAssets = [
      [
        'asset_001', 'Main Character', 'character', 'in_progress', 'false',
        'main_character', `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/assets/main_character`,
        '', '', '', 'Primary protagonist character model'
      ],
      [
        'asset_002', 'Coffee Cup', 'prop', 'completed', 'false',
        'coffee_cup', `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/assets/coffee_cup`,
        '', '', '', 'Reusable coffee cup prop'
      ],
      [
        'asset_003', 'Office Environment', 'environment', 'not_started', 'true',
        'office_env', `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/assets/office_env`,
        '', '', '', 'Main office environment set'
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Assets!A3:K',
      valueInputOption: 'RAW',
      requestBody: {
        values: sampleAssets
      }
    });

    // 6. Add sample data to Tasks sheet
    console.log('📝 Adding sample data to Tasks...');
    const sampleTasks = [
      [
        'task_001', 'Character Modeling', 'in_progress', 'user_001',
        '2024-01-15', '2024-01-30', '', 'character_modeling', 
        `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/tasks/character_modeling`, 'Model main character'
      ],
      [
        'task_002', 'Shot Animation', 'not_started', 'user_002',
        '2024-02-01', '2024-02-15', 'shot_001', 'shot_001_anim',
        `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/tasks/shot_001_anim`, 'Animate opening shot'
      ],
      [
        'task_003', 'Environment Texturing', 'not_started', 'user_003',
        '2024-01-20', '2024-02-05', '', 'env_texturing',
        `${process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals'}/tasks/env_texturing`, 'Texture office environment'
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Tasks!A3:J',
      valueInputOption: 'RAW',
      requestBody: {
        values: sampleTasks
      }
    });

    // 7. Add field definitions
    console.log('📝 Adding field definitions...');
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
      ['field_035', 'task', 'notes', 'text', 'true', 'false', '']
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Fields!A3:G',
      valueInputOption: 'RAW',
      requestBody: {
        values: fieldDefinitions
      }
    });

    // 8. Add project metadata
    console.log('📝 Adding project metadata...');
    const projectMeta = [
      [
        'Oliver05',
        'gdrive',
        process.env.ORIGINALS_ROOT || 'https://drive.google.com/drive/folders/originals',
        process.env.PROXIES_ROOT || 'https://drive.google.com/drive/folders/proxies',
        new Date().toISOString()
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'project_meta!A3:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: projectMeta
      }
    });

    console.log('🎉 Google Sheets recreation complete!');
    console.log('');
    console.log('📋 Structure created:');
    console.log('  Row 1: field_001, field_002, field_003...');
    console.log('  Row 2: shot_id, episode, scene, title...');
    console.log('  Row 3+: Actual data');
    console.log('');
    console.log('✅ All sheets now have proper two-row header structure');

  } catch (error) {
    console.error('❌ Error recreating sheets:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  recreateProperSheets()
    .then(() => {
      console.log('\n✅ Recreation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Recreation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { recreateProperSheets };