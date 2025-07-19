import { ISheetsApiClient, ProjectConfig, ProjectMeta } from './ISheetsApiClient';
import { ShotStatus, AssetStatus, TaskStatus, AssetType, FieldType } from '../../../shared/types';

/**
 * Service for initializing Google Sheets with standardized project templates
 * Handles creation of all 9 required sheets with proper schemas and sample data
 */
export class SheetInitializationService {
  constructor(private sheetsClient: ISheetsApiClient) {}

  /**
   * Initialize sheets with standardized project templates
   * Creates all 9 required sheets with proper column schemas and sample data
   */
  async initSheets(projectConfig: ProjectConfig): Promise<ProjectMeta> {
    try {
      // Define all sheet configurations
      const sheetConfigs = this.getSheetConfigurations();
      
      // Create all sheets with headers
      const { created, failed } = await this.sheetsClient.createMultipleSheets(sheetConfigs);
      
      if (failed.length > 0) {
        console.warn(`Failed to create sheets: ${failed.join(', ')}`);
      }

      // If no sheets were created, throw an error
      if (created.length === 0) {
        throw new Error('Failed to create any sheets');
      }

      // Insert sample data for each sheet
      await this.insertSampleData(projectConfig);

      // Insert project metadata
      await this.insertProjectMetadata(projectConfig);

      return {
        project_id: projectConfig.project_id,
        sheets_created: created,
        storage_configured: true,
        created_at: new Date()
      };

    } catch (error) {
      console.error('Error initializing sheets:', error);
      throw new Error(`Failed to initialize sheets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get standardized sheet configurations with headers
   */
  private getSheetConfigurations(): Array<{ name: string; headers: string[] }> {
    return [
      {
        name: 'Shots',
        headers: [
          'shot_id', 'episode', 'scene', 'title', 'status', 'priority',
          'due_date', 'timecode_fps', 'folder_label', 'folder_url',
          'thumbnails', 'file_list', 'versions', 'notes'
        ]
      },
      {
        name: 'Assets',
        headers: [
          'asset_id', 'name', 'asset_type', 'status', 'overlap_sensitive',
          'folder_label', 'folder_url', 'thumbnails', 'file_list', 'versions', 'notes'
        ]
      },
      {
        name: 'Tasks',
        headers: [
          'task_id', 'name', 'status', 'assignee_id', 'start_date',
          'end_date', 'shot_id', 'folder_label', 'folder_url', 'notes'
        ]
      },
      {
        name: 'ProjectMembers',
        headers: [
          'member_id', 'user_id', 'role', 'department', 'permissions',
          'joined_date', 'active'
        ]
      },
      {
        name: 'Users',
        headers: [
          'user_id', 'email', 'name', 'google_id', 'avatar_url',
          'created_date', 'last_login'
        ]
      },
      {
        name: 'Pages',
        headers: [
          'page_id', 'name', 'type', 'config', 'shared', 'created_by',
          'created_date', 'modified_date'
        ]
      },
      {
        name: 'Fields',
        headers: [
          'field_id', 'entity', 'field_name', 'type', 'editable',
          'required', 'options'
        ]
      },
      {
        name: 'project_meta',
        headers: [
          'project_id', 'storage_provider', 'originals_root_url',
          'proxies_root_url', 'created_at'
        ]
      },
      {
        name: 'Logs',
        headers: [
          'log_id', 'timestamp', 'user_id', 'action', 'entity_type',
          'entity_id', 'changes', 'ip_address'
        ]
      }
    ];
  }

  /**
   * Insert sample data for each sheet type
   */
  private async insertSampleData(projectConfig: ProjectConfig): Promise<void> {
    // Insert sample shots
    await this.insertSampleShots();
    
    // Insert sample assets
    await this.insertSampleAssets();
    
    // Insert sample tasks
    await this.insertSampleTasks();
    
    // Insert sample users
    await this.insertSampleUsers();
    
    // Insert sample project members
    await this.insertSampleProjectMembers();
    
    // Insert field definitions
    await this.insertFieldDefinitions();
    
    // Insert sample pages
    await this.insertSamplePages();
    
    // Insert initial log entry
    await this.insertInitialLog(projectConfig);
  }

  /**
   * Insert sample shots data
   */
  private async insertSampleShots(): Promise<void> {
    const sampleShots = [
      [
        'shot_001', 'EP01', 'SC01', 'Opening Scene', ShotStatus.NOT_STARTED, '1',
        '2024-02-01', '24fps', 'shot_001', `${process.env.ORIGINALS_ROOT}/shots/shot_001`,
        '', '', '', 'Opening establishing shot'
      ],
      [
        'shot_002', 'EP01', 'SC01', 'Character Introduction', ShotStatus.IN_PROGRESS, '2',
        '2024-02-05', '24fps', 'shot_002', `${process.env.ORIGINALS_ROOT}/shots/shot_002`,
        '', '', '', 'Main character enters frame'
      ],
      [
        'shot_003', 'EP01', 'SC02', 'Dialogue Scene', ShotStatus.NOT_STARTED, '1',
        '2024-02-10', '24fps', 'shot_003', `${process.env.ORIGINALS_ROOT}/shots/shot_003`,
        '', '', '', 'Two-person dialogue sequence'
      ]
    ];

    await this.sheetsClient.appendRows('Shots', sampleShots);
  }

  /**
   * Insert sample assets data
   */
  private async insertSampleAssets(): Promise<void> {
    const sampleAssets = [
      [
        'asset_001', 'Main Character', AssetType.CHARACTER, AssetStatus.IN_PROGRESS, 'false',
        'main_character', `${process.env.ORIGINALS_ROOT}/assets/main_character`,
        '', '', '', 'Primary protagonist character model'
      ],
      [
        'asset_002', 'Coffee Cup', AssetType.PROP, AssetStatus.COMPLETED, 'false',
        'coffee_cup', `${process.env.ORIGINALS_ROOT}/assets/coffee_cup`,
        '', '', '', 'Reusable coffee cup prop'
      ],
      [
        'asset_003', 'Office Environment', AssetType.ENVIRONMENT, AssetStatus.NOT_STARTED, 'true',
        'office_env', `${process.env.ORIGINALS_ROOT}/assets/office_env`,
        '', '', '', 'Main office environment set'
      ]
    ];

    await this.sheetsClient.appendRows('Assets', sampleAssets);
  }

  /**
   * Insert sample tasks data
   */
  private async insertSampleTasks(): Promise<void> {
    const sampleTasks = [
      [
        'task_001', 'Character Modeling', TaskStatus.IN_PROGRESS, 'user_001',
        '2024-01-15', '2024-01-30', '', 'character_modeling', 
        `${process.env.ORIGINALS_ROOT}/tasks/character_modeling`, 'Model main character'
      ],
      [
        'task_002', 'Shot Animation', TaskStatus.NOT_STARTED, 'user_002',
        '2024-02-01', '2024-02-15', 'shot_001', 'shot_001_anim',
        `${process.env.ORIGINALS_ROOT}/tasks/shot_001_anim`, 'Animate opening shot'
      ],
      [
        'task_003', 'Environment Texturing', TaskStatus.NOT_STARTED, 'user_003',
        '2024-01-20', '2024-02-05', '', 'env_texturing',
        `${process.env.ORIGINALS_ROOT}/tasks/env_texturing`, 'Texture office environment'
      ]
    ];

    await this.sheetsClient.appendRows('Tasks', sampleTasks);
  }

  /**
   * Insert sample users data
   */
  private async insertSampleUsers(): Promise<void> {
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

    await this.sheetsClient.appendRows('Users', sampleUsers);
  }

  /**
   * Insert sample project members data
   */
  private async insertSampleProjectMembers(): Promise<void> {
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

    await this.sheetsClient.appendRows('ProjectMembers', sampleMembers);
  }

  /**
   * Insert field definitions for all entity types
   */
  private async insertFieldDefinitions(): Promise<void> {
    const fieldDefinitions = [
      // Shot fields
      ['field_001', 'shot', 'shot_id', FieldType.TEXT, 'false', 'true', ''],
      ['field_002', 'shot', 'episode', FieldType.TEXT, 'true', 'false', ''],
      ['field_003', 'shot', 'scene', FieldType.TEXT, 'true', 'false', ''],
      ['field_004', 'shot', 'title', FieldType.TEXT, 'true', 'true', ''],
      ['field_005', 'shot', 'status', FieldType.SELECT, 'true', 'true', 'not_started,in_progress,review,approved,completed'],
      ['field_006', 'shot', 'priority', FieldType.NUMBER, 'true', 'false', ''],
      ['field_007', 'shot', 'due_date', FieldType.DATE, 'true', 'false', ''],
      ['field_008', 'shot', 'timecode_fps', FieldType.TEXT, 'true', 'false', ''],
      ['field_009', 'shot', 'thumbnails', FieldType.THUMBNAILS, 'true', 'false', ''],
      ['field_010', 'shot', 'file_list', FieldType.FILE_LIST, 'true', 'false', ''],
      ['field_011', 'shot', 'versions', FieldType.VERSIONS, 'true', 'false', ''],
      
      // Asset fields
      ['field_012', 'asset', 'asset_id', FieldType.TEXT, 'false', 'true', ''],
      ['field_013', 'asset', 'name', FieldType.TEXT, 'true', 'true', ''],
      ['field_014', 'asset', 'asset_type', FieldType.SELECT, 'true', 'true', 'character,prop,environment,effect,other'],
      ['field_015', 'asset', 'status', FieldType.SELECT, 'true', 'true', 'not_started,in_progress,review,approved,completed'],
      ['field_016', 'asset', 'overlap_sensitive', FieldType.CHECKBOX, 'true', 'false', ''],
      ['field_017', 'asset', 'thumbnails', FieldType.THUMBNAILS, 'true', 'false', ''],
      ['field_018', 'asset', 'file_list', FieldType.FILE_LIST, 'true', 'false', ''],
      ['field_019', 'asset', 'versions', FieldType.VERSIONS, 'true', 'false', ''],
      
      // Task fields
      ['field_020', 'task', 'task_id', FieldType.TEXT, 'false', 'true', ''],
      ['field_021', 'task', 'name', FieldType.TEXT, 'true', 'true', ''],
      ['field_022', 'task', 'status', FieldType.SELECT, 'true', 'true', 'not_started,in_progress,blocked,review,completed'],
      ['field_023', 'task', 'assignee_id', FieldType.LINK_USER, 'true', 'false', ''],
      ['field_024', 'task', 'start_date', FieldType.DATE, 'true', 'false', ''],
      ['field_025', 'task', 'end_date', FieldType.DATE, 'true', 'false', ''],
      ['field_026', 'task', 'shot_id', FieldType.LINK_SHOT, 'true', 'false', ''],
      
      // Member fields
      ['field_027', 'member', 'member_id', FieldType.TEXT, 'false', 'true', ''],
      ['field_028', 'member', 'user_id', FieldType.LINK_USER, 'true', 'true', ''],
      ['field_029', 'member', 'role', FieldType.TEXT, 'true', 'true', ''],
      ['field_030', 'member', 'department', FieldType.SELECT, 'true', 'true', 'ANIMATION,PRODUCTION,CAMERA,EDIT,SOUND,VFX'],
      ['field_031', 'member', 'permissions', FieldType.SELECT, 'true', 'true', 'view,edit,admin'],
      
      // User fields
      ['field_032', 'user', 'user_id', FieldType.TEXT, 'false', 'true', ''],
      ['field_033', 'user', 'email', FieldType.TEXT, 'true', 'true', ''],
      ['field_034', 'user', 'name', FieldType.TEXT, 'true', 'true', ''],
      ['field_035', 'user', 'google_id', FieldType.TEXT, 'false', 'true', ''],
      ['field_036', 'user', 'avatar_url', FieldType.URL, 'true', 'false', '']
    ];

    await this.sheetsClient.appendRows('Fields', fieldDefinitions);
  }

  /**
   * Insert sample page configurations
   */
  private async insertSamplePages(): Promise<void> {
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

    await this.sheetsClient.appendRows('Pages', samplePages);
  }

  /**
   * Insert project metadata
   */
  private async insertProjectMetadata(projectConfig: ProjectConfig): Promise<void> {
    const metadataRow = [
      projectConfig.project_id,
      projectConfig.storage_provider,
      projectConfig.originals_root_url,
      projectConfig.proxies_root_url,
      projectConfig.created_at.toISOString()
    ];

    await this.sheetsClient.appendRows('project_meta', [metadataRow]);
  }

  /**
   * Insert initial log entry
   */
  private async insertInitialLog(projectConfig: ProjectConfig): Promise<void> {
    const logEntry = [
      'log_001',
      new Date().toISOString(),
      'system',
      'project_created',
      'project',
      projectConfig.project_id,
      JSON.stringify({ 
        storage_provider: projectConfig.storage_provider,
        sheets_created: 9
      }),
      '127.0.0.1'
    ];

    await this.sheetsClient.appendRows('Logs', [logEntry]);
  }

  /**
   * Validate project configuration before initialization
   */
  validateProjectConfig(projectConfig: ProjectConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!projectConfig.project_id || projectConfig.project_id.trim() === '') {
      errors.push('Project ID is required');
    }

    if (!projectConfig.storage_provider || !['gdrive', 'box'].includes(projectConfig.storage_provider)) {
      errors.push('Storage provider must be either "gdrive" or "box"');
    }

    if (!projectConfig.originals_root_url || projectConfig.originals_root_url.trim() === '') {
      errors.push('Originals root URL is required');
    }

    if (!projectConfig.proxies_root_url || projectConfig.proxies_root_url.trim() === '') {
      errors.push('Proxies root URL is required');
    }

    if (!projectConfig.created_at || !(projectConfig.created_at instanceof Date)) {
      errors.push('Created date must be a valid Date object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get template variations for different project types
   */
  getProjectTemplates(): { [key: string]: Partial<ProjectConfig> } {
    return {
      'animation_series': {
        storage_provider: 'gdrive'
      },
      'short_film': {
        storage_provider: 'gdrive'
      },
      'commercial': {
        storage_provider: 'box'
      },
      'music_video': {
        storage_provider: 'gdrive'
      }
    };
  }

  /**
   * Initialize project with template
   */
  async initSheetsWithTemplate(
    projectConfig: ProjectConfig, 
    templateName: string
  ): Promise<ProjectMeta> {
    const templates = this.getProjectTemplates();
    const template = templates[templateName];
    
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    // Merge template with project config
    const mergedConfig = { ...projectConfig, ...template };
    
    return this.initSheets(mergedConfig);
  }
}