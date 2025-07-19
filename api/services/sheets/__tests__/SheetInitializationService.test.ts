import { SheetInitializationService } from '../SheetInitializationService';
import { ISheetsApiClient, ProjectConfig, ProjectMeta, UpdateResult } from '../ISheetsApiClient';
import { ShotStatus, AssetStatus, TaskStatus, AssetType, FieldType } from '../../../../shared/types';

// Mock implementation of ISheetsApiClient
class MockSheetsApiClient implements ISheetsApiClient {
  private mockSheets: { [key: string]: any[][] } = {};
  private mockCreatedSheets: string[] = [];
  private mockFailedSheets: string[] = [];

  // Set mock behavior
  setMockCreatedSheets(created: string[]) {
    this.mockCreatedSheets = created;
  }

  setMockFailedSheets(failed: string[]) {
    this.mockFailedSheets = failed;
  }

  setMockSheetData(sheetName: string, data: any[][]) {
    this.mockSheets[sheetName] = data;
  }

  // ISheetsApiClient implementation
  async initializeProject(projectConfig: ProjectConfig): Promise<ProjectMeta> {
    throw new Error('Method not implemented in mock');
  }

  async getSheetData(sheetName: string, range?: string) {
    return {
      values: this.mockSheets[sheetName] || [],
      range: range || sheetName,
      majorDimension: 'ROWS' as const
    };
  }

  async updateCell() {
    return { success: true };
  }

  async batchUpdate() {
    return { success: true, results: [], totalUpdated: 0, conflicts: [] };
  }

  async createSheet(sheetName: string, headers: string[]): Promise<boolean> {
    if (this.mockFailedSheets.includes(sheetName)) {
      return false;
    }
    this.mockSheets[sheetName] = [headers];
    return true;
  }

  async getSheetNames(): Promise<string[]> {
    return Object.keys(this.mockSheets);
  }

  async clearSheet(): Promise<boolean> {
    return true;
  }

  async appendRows(sheetName: string, values: any[][]): Promise<UpdateResult> {
    if (!this.mockSheets[sheetName]) {
      this.mockSheets[sheetName] = [];
    }
    this.mockSheets[sheetName].push(...values);
    return { success: true, updatedRows: values.length };
  }

  async validateConnection(): Promise<boolean> {
    return true;
  }

  async getSpreadsheetInfo() {
    return { title: 'Test Sheet', sheetCount: 0, sheets: [] };
  }

  async sheetExists(): Promise<boolean> {
    return true;
  }

  async getRowCount(): Promise<number> {
    return 0;
  }

  async createMultipleSheets(sheetConfigs: Array<{ name: string; headers: string[] }>) {
    const created: string[] = [];
    const failed: string[] = [];

    for (const config of sheetConfigs) {
      if (this.mockFailedSheets.includes(config.name)) {
        failed.push(config.name);
      } else {
        created.push(config.name);
        this.mockSheets[config.name] = [config.headers];
      }
    }

    return { created, failed };
  }
}

describe('SheetInitializationService', () => {
  let service: SheetInitializationService;
  let mockClient: MockSheetsApiClient;
  let testProjectConfig: ProjectConfig;

  beforeEach(() => {
    mockClient = new MockSheetsApiClient();
    service = new SheetInitializationService(mockClient);
    
    testProjectConfig = {
      project_id: 'test_project_001',
      storage_provider: 'gdrive',
      originals_root_url: 'https://drive.google.com/drive/folders/originals',
      proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
      created_at: new Date('2024-01-01T00:00:00Z')
    };

    // Set up successful sheet creation by default
    mockClient.setMockCreatedSheets([
      'Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users', 
      'Pages', 'Fields', 'project_meta', 'Logs'
    ]);
    mockClient.setMockFailedSheets([]);
  });

  describe('initSheets', () => {
    it('should successfully initialize all 9 required sheets', async () => {
      const result = await service.initSheets(testProjectConfig);

      expect(result.project_id).toBe('test_project_001');
      expect(result.sheets_created).toHaveLength(9);
      expect(result.sheets_created).toEqual([
        'Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users',
        'Pages', 'Fields', 'project_meta', 'Logs'
      ]);
      expect(result.storage_configured).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should handle partial sheet creation failures gracefully', async () => {
      mockClient.setMockFailedSheets(['Assets', 'Tasks']);
      mockClient.setMockCreatedSheets([
        'Shots', 'ProjectMembers', 'Users', 'Pages', 'Fields', 'project_meta', 'Logs'
      ]);

      const result = await service.initSheets(testProjectConfig);

      expect(result.sheets_created).toHaveLength(7);
      expect(result.sheets_created).not.toContain('Assets');
      expect(result.sheets_created).not.toContain('Tasks');
    });

    it('should create sheets with correct headers', async () => {
      await service.initSheets(testProjectConfig);

      // Check Shots sheet headers
      const shotsData = await mockClient.getSheetData('Shots');
      expect(shotsData.values[0]).toEqual([
        'shot_id', 'episode', 'scene', 'title', 'status', 'priority',
        'due_date', 'timecode_fps', 'folder_label', 'folder_url',
        'thumbnails', 'file_list', 'versions', 'notes'
      ]);

      // Check Assets sheet headers
      const assetsData = await mockClient.getSheetData('Assets');
      expect(assetsData.values[0]).toEqual([
        'asset_id', 'name', 'asset_type', 'status', 'overlap_sensitive',
        'folder_label', 'folder_url', 'thumbnails', 'file_list', 'versions', 'notes'
      ]);

      // Check Tasks sheet headers
      const tasksData = await mockClient.getSheetData('Tasks');
      expect(tasksData.values[0]).toEqual([
        'task_id', 'name', 'status', 'assignee_id', 'start_date',
        'end_date', 'shot_id', 'folder_label', 'folder_url', 'notes'
      ]);
    });

    it('should insert sample data for all entity types', async () => {
      await service.initSheets(testProjectConfig);

      // Check sample shots data
      const shotsData = await mockClient.getSheetData('Shots');
      expect(shotsData.values.length).toBeGreaterThan(1); // Headers + sample data
      expect(shotsData.values[1][0]).toBe('shot_001'); // First shot ID
      expect(shotsData.values[1][4]).toBe(ShotStatus.NOT_STARTED); // Status

      // Check sample assets data
      const assetsData = await mockClient.getSheetData('Assets');
      expect(assetsData.values.length).toBeGreaterThan(1);
      expect(assetsData.values[1][0]).toBe('asset_001'); // First asset ID
      expect(assetsData.values[1][2]).toBe(AssetType.CHARACTER); // Asset type

      // Check sample tasks data
      const tasksData = await mockClient.getSheetData('Tasks');
      expect(tasksData.values.length).toBeGreaterThan(1);
      expect(tasksData.values[1][0]).toBe('task_001'); // First task ID
      expect(tasksData.values[1][2]).toBe(TaskStatus.IN_PROGRESS); // Status
    });

    it('should insert project metadata correctly', async () => {
      await service.initSheets(testProjectConfig);

      const metaData = await mockClient.getSheetData('project_meta');
      expect(metaData.values.length).toBe(2); // Headers + metadata row
      expect(metaData.values[1]).toEqual([
        'test_project_001',
        'gdrive',
        'https://drive.google.com/drive/folders/originals',
        'https://drive.google.com/drive/folders/proxies',
        '2024-01-01T00:00:00.000Z'
      ]);
    });

    it('should insert field definitions for all entity types', async () => {
      await service.initSheets(testProjectConfig);

      const fieldsData = await mockClient.getSheetData('Fields');
      expect(fieldsData.values.length).toBeGreaterThan(30); // Many field definitions

      // Check some specific field definitions
      const shotIdField = fieldsData.values.find(row => row[0] === 'field_001');
      expect(shotIdField).toEqual([
        'field_001', 'shot', 'shot_id', FieldType.TEXT, 'false', 'true', ''
      ]);

      const statusField = fieldsData.values.find(row => row[0] === 'field_005');
      expect(statusField).toEqual([
        'field_005', 'shot', 'status', FieldType.SELECT, 'true', 'true', 
        'not_started,in_progress,review,approved,completed'
      ]);
    });

    it('should insert sample page configurations', async () => {
      await service.initSheets(testProjectConfig);

      const pagesData = await mockClient.getSheetData('Pages');
      expect(pagesData.values.length).toBe(4); // Headers + 3 sample pages

      // Check first page configuration
      const shotsOverviewPage = pagesData.values[1];
      expect(shotsOverviewPage[0]).toBe('page_001');
      expect(shotsOverviewPage[1]).toBe('Shots Overview');
      expect(shotsOverviewPage[2]).toBe('table');
      
      const config = JSON.parse(shotsOverviewPage[3]);
      expect(config.entity).toBe('shot');
      expect(config.fields).toContain('shot_id');
      expect(config.fields).toContain('title');
    });

    it('should insert initial log entry', async () => {
      await service.initSheets(testProjectConfig);

      const logsData = await mockClient.getSheetData('Logs');
      expect(logsData.values.length).toBe(2); // Headers + initial log

      const logEntry = logsData.values[1];
      expect(logEntry[0]).toBe('log_001');
      expect(logEntry[2]).toBe('system');
      expect(logEntry[3]).toBe('project_created');
      expect(logEntry[4]).toBe('project');
      expect(logEntry[5]).toBe('test_project_001');
    });

    it('should throw error when sheet creation fails completely', async () => {
      mockClient.setMockCreatedSheets([]);
      mockClient.setMockFailedSheets([
        'Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users',
        'Pages', 'Fields', 'project_meta', 'Logs'
      ]);

      await expect(service.initSheets(testProjectConfig)).rejects.toThrow();
    });
  });

  describe('validateProjectConfig', () => {
    it('should validate correct project configuration', () => {
      const result = service.validateProjectConfig(testProjectConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty project ID', () => {
      const invalidConfig = { ...testProjectConfig, project_id: '' };
      const result = service.validateProjectConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project ID is required');
    });

    it('should reject invalid storage provider', () => {
      const invalidConfig = { ...testProjectConfig, storage_provider: 'invalid' as any };
      const result = service.validateProjectConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Storage provider must be either "gdrive" or "box"');
    });

    it('should reject empty URLs', () => {
      const invalidConfig = {
        ...testProjectConfig,
        originals_root_url: '',
        proxies_root_url: ''
      };
      const result = service.validateProjectConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Originals root URL is required');
      expect(result.errors).toContain('Proxies root URL is required');
    });

    it('should reject invalid date', () => {
      const invalidConfig = { ...testProjectConfig, created_at: 'invalid' as any };
      const result = service.validateProjectConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Created date must be a valid Date object');
    });
  });

  describe('getProjectTemplates', () => {
    it('should return predefined project templates', () => {
      const templates = service.getProjectTemplates();
      
      expect(templates).toHaveProperty('animation_series');
      expect(templates).toHaveProperty('short_film');
      expect(templates).toHaveProperty('commercial');
      expect(templates).toHaveProperty('music_video');
      
      expect(templates.animation_series.storage_provider).toBe('gdrive');
      expect(templates.commercial.storage_provider).toBe('box');
    });
  });

  describe('initSheetsWithTemplate', () => {
    it('should initialize sheets with animation series template', async () => {
      const result = await service.initSheetsWithTemplate(testProjectConfig, 'animation_series');
      
      expect(result.project_id).toBe('test_project_001');
      expect(result.sheets_created).toHaveLength(9);
      expect(result.storage_configured).toBe(true);
    });

    it('should initialize sheets with commercial template', async () => {
      const configWithoutProvider = { ...testProjectConfig };
      delete (configWithoutProvider as any).storage_provider;
      
      const result = await service.initSheetsWithTemplate(configWithoutProvider, 'commercial');
      
      expect(result.project_id).toBe('test_project_001');
      expect(result.sheets_created).toHaveLength(9);
    });

    it('should throw error for unknown template', async () => {
      await expect(
        service.initSheetsWithTemplate(testProjectConfig, 'unknown_template')
      ).rejects.toThrow('Unknown template: unknown_template');
    });
  });

  describe('Box storage provider configuration', () => {
    it('should handle Box storage provider correctly', async () => {
      const boxConfig: ProjectConfig = {
        ...testProjectConfig,
        storage_provider: 'box',
        originals_root_url: 'https://app.box.com/folder/originals',
        proxies_root_url: 'https://app.box.com/folder/proxies'
      };

      const result = await service.initSheets(boxConfig);
      
      expect(result.project_id).toBe('test_project_001');
      expect(result.storage_configured).toBe(true);

      // Check metadata was inserted with Box URLs
      const metaData = await mockClient.getSheetData('project_meta');
      expect(metaData.values[1][1]).toBe('box');
      expect(metaData.values[1][2]).toBe('https://app.box.com/folder/originals');
      expect(metaData.values[1][3]).toBe('https://app.box.com/folder/proxies');
    });
  });

  describe('Error handling', () => {
    it('should handle errors during sample data insertion', async () => {
      // Mock appendRows to throw error for specific sheet
      const originalAppendRows = mockClient.appendRows;
      mockClient.appendRows = jest.fn().mockImplementation((sheetName: string, values: any[][]) => {
        if (sheetName === 'Shots') {
          throw new Error('Failed to insert sample shots');
        }
        return originalAppendRows.call(mockClient, sheetName, values);
      });

      await expect(service.initSheets(testProjectConfig)).rejects.toThrow(
        'Failed to initialize sheets'
      );
    });

    it('should provide detailed error messages', async () => {
      mockClient.createMultipleSheets = jest.fn().mockRejectedValue(
        new Error('Google Sheets API quota exceeded')
      );

      await expect(service.initSheets(testProjectConfig)).rejects.toThrow(
        'Failed to initialize sheets: Google Sheets API quota exceeded'
      );
    });
  });
});