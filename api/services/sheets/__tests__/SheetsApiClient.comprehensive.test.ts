import { SheetsApiClient } from '../SheetsApiClient';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import {
  CellUpdateParams,
  BatchUpdateParams,
  ProjectConfig,
  SheetData
} from '../ISheetsApiClient';

// Mock Google APIs
jest.mock('googleapis');
jest.mock('google-auth-library');

const mockSheets = {
  spreadsheets: {
    values: {
      get: jest.fn(),
      update: jest.fn(),
      append: jest.fn(),
      clear: jest.fn()
    },
    get: jest.fn(),
    batchUpdate: jest.fn()
  }
};

const mockGoogle = google as jest.Mocked<typeof google>;
const mockGoogleAuth = GoogleAuth as jest.MockedClass<typeof GoogleAuth>;

describe('SheetsApiClient Comprehensive Tests', () => {
  let client: SheetsApiClient;
  const testSpreadsheetId = 'test-spreadsheet-id';
  const testApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoogle.sheets.mockReturnValue(mockSheets as any);
    client = new SheetsApiClient(testSpreadsheetId, testApiKey);
  });

  describe('Authentication and Connection', () => {
    it('should initialize with API key authentication', () => {
      expect(mockGoogle.sheets).toHaveBeenCalledWith({
        version: 'v4',
        auth: testApiKey
      });
    });

    it('should validate connection successfully', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [{ properties: { title: 'Sheet1' } }]
        }
      });

      const result = await client.validateConnection();
      expect(result).toBe(true);
    });

    it('should handle connection validation failure', async () => {
      mockSheets.spreadsheets.get.mockRejectedValue(new Error('Connection failed'));
      const result = await client.validateConnection();
      expect(result).toBe(false);
    });
  });

  describe('Sheet Operations', () => {
    it('should get sheet data successfully', async () => {
      const mockResponse = {
        data: {
          values: [
            ['shot_id', 'title', 'status'],
            ['shot_001', 'Opening Scene', 'in_progress']
          ],
          range: 'Shots!A1:C2'
        }
      };

      mockSheets.spreadsheets.values.get.mockResolvedValue(mockResponse);
      const result = await client.getSheetData('Shots');
      
      expect(result).toEqual({
        values: mockResponse.data.values,
        range: mockResponse.data.range,
        majorDimension: 'ROWS'
      });
    });

    it('should create new sheet with headers', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { sheets: [] }
      });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });
      mockSheets.spreadsheets.values.append.mockResolvedValue({
        data: { updates: { updatedRange: 'A1:C1', updatedRows: 1 } }
      });

      const result = await client.createSheet('NewSheet', ['col1', 'col2', 'col3']);
      expect(result).toBe(true);
    });

    it('should get sheet names', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'Shots' } },
            { properties: { title: 'Assets' } }
          ]
        }
      });

      const result = await client.getSheetNames();
      expect(result).toEqual(['Shots', 'Assets']);
    });
  });

  describe('Cell Update Operations', () => {
    const mockSheetData: SheetData = {
      values: [
        ['shot_id', 'title', 'status'],
        ['shot_001', 'Opening Scene', 'in_progress'],
        ['shot_002', 'Closing Scene', 'not_started']
      ],
      range: 'Shots!A1:C3',
      majorDimension: 'ROWS'
    };

    beforeEach(() => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: mockSheetData
      });
    });

    it('should update cell without conflict', async () => {
      const updateParams: CellUpdateParams = {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'status',
        originalValue: 'in_progress',
        newValue: 'completed'
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue({
        data: { updatedRange: 'Shots!C2', updatedRows: 1 }
      });

      const result = await client.updateCell(updateParams);
      expect(result.success).toBe(true);
      expect(result.conflict).toBe(false);
    });

    it('should detect conflict when original value differs', async () => {
      const updateParams: CellUpdateParams = {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'status',
        originalValue: 'not_started', // Different from current
        newValue: 'completed'
      };

      const result = await client.updateCell(updateParams);
      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.currentValue).toBe('in_progress');
    });

    it('should force update when force flag is true', async () => {
      const updateParams: CellUpdateParams = {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'status',
        originalValue: 'not_started',
        newValue: 'completed',
        force: true
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue({
        data: { updatedRange: 'Shots!C2', updatedRows: 1 }
      });

      const result = await client.updateCell(updateParams);
      expect(result.success).toBe(true);
      expect(result.conflict).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    const mockSheetData: SheetData = {
      values: [
        ['shot_id', 'title', 'status'],
        ['shot_001', 'Opening Scene', 'in_progress'],
        ['shot_002', 'Closing Scene', 'not_started']
      ],
      range: 'Shots!A1:C3',
      majorDimension: 'ROWS'
    };

    beforeEach(() => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: mockSheetData
      });
    });

    it('should perform batch updates successfully', async () => {
      const batchParams: BatchUpdateParams = {
        updates: [
          {
            sheetName: 'Shots',
            entityId: 'shot_001',
            fieldId: 'status',
            originalValue: 'in_progress',
            newValue: 'completed'
          },
          {
            sheetName: 'Shots',
            entityId: 'shot_002',
            fieldId: 'status',
            originalValue: 'not_started',
            newValue: 'in_progress'
          }
        ]
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue({
        data: { updatedRange: 'Shots!C2', updatedRows: 1 }
      });

      const result = await client.batchUpdate(batchParams);
      expect(result.success).toBe(true);
      expect(result.totalUpdated).toBe(2);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('Project Initialization', () => {
    const projectConfig: ProjectConfig = {
      project_id: 'test-project',
      storage_provider: 'gdrive',
      originals_root_url: 'https://drive.google.com/originals',
      proxies_root_url: 'https://drive.google.com/proxies',
      created_at: new Date('2023-01-01')
    };

    it('should initialize project with all required sheets', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { sheets: [] }
      });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });
      mockSheets.spreadsheets.values.append.mockResolvedValue({
        data: { updates: { updatedRange: 'A1:E1', updatedRows: 1 } }
      });

      const result = await client.initializeProject(projectConfig);
      
      expect(result.project_id).toBe('test-project');
      expect(result.sheets_created).toHaveLength(9);
      expect(result.sheets_created).toContain('Shots');
      expect(result.sheets_created).toContain('Assets');
      expect(result.sheets_created).toContain('Tasks');
      expect(result.storage_configured).toBe(true);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      mockSheets.spreadsheets.values.get
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue({
          data: { values: [['test']], range: 'A1:A1' }
        });

      const result = await client.getSheetData('TestSheet');
      expect(result.values).toEqual([['test']]);
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValue(
        new Error('Invalid spreadsheet ID')
      );

      await expect(client.getSheetData('TestSheet')).rejects.toThrow(
        'Invalid spreadsheet ID'
      );
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Helper Methods', () => {
    it('should return correct headers for different sheet types', () => {
      const shotsHeaders = (client as any).getSheetHeaders('Shots');
      expect(shotsHeaders).toContain('shot_id');
      expect(shotsHeaders).toContain('episode');
      expect(shotsHeaders).toContain('title');

      const assetsHeaders = (client as any).getSheetHeaders('Assets');
      expect(assetsHeaders).toContain('asset_id');
      expect(assetsHeaders).toContain('name');
      expect(assetsHeaders).toContain('asset_type');

      const tasksHeaders = (client as any).getSheetHeaders('Tasks');
      expect(tasksHeaders).toContain('task_id');
      expect(tasksHeaders).toContain('assignee_id');
      expect(tasksHeaders).toContain('start_date');
    });

    it('should find cell values correctly', () => {
      const mockData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_001', 'Opening Scene', 'in_progress'],
          ['shot_002', 'Closing Scene', 'not_started']
        ],
        range: 'Shots!A1:C3',
        majorDimension: 'ROWS' as const
      };

      const value = (client as any).findCellValue(mockData, 'shot_001', 'title');
      expect(value).toBe('Opening Scene');

      const range = (client as any).findCellRange(mockData, 'shot_001', 'status');
      expect(range).toBe('C2');
    });
  });
});