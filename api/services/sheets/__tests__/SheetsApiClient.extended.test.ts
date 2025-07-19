import { SheetsApiClient } from '../SheetsApiClient';
import { google } from 'googleapis';

// Mock Google APIs
jest.mock('googleapis');

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

describe('SheetsApiClient Extended Features', () => {
  let client: SheetsApiClient;
  const testSpreadsheetId = 'test-spreadsheet-id';
  const testApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoogle.sheets.mockReturnValue(mockSheets as any);
    client = new SheetsApiClient(testSpreadsheetId, testApiKey);
  });

  describe('getSpreadsheetInfo', () => {
    it('should return spreadsheet metadata', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          properties: {
            title: 'Test MOTK Project'
          },
          sheets: [
            { properties: { title: 'Shots' } },
            { properties: { title: 'Assets' } },
            { properties: { title: 'Tasks' } }
          ]
        }
      });

      const result = await client.getSpreadsheetInfo();
      
      expect(result).toEqual({
        title: 'Test MOTK Project',
        sheetCount: 3,
        sheets: ['Shots', 'Assets', 'Tasks']
      });
    });

    it('should handle missing title gracefully', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'Sheet1' } }
          ]
        }
      });

      const result = await client.getSpreadsheetInfo();
      
      expect(result.title).toBe('Unknown');
      expect(result.sheetCount).toBe(1);
    });
  });

  describe('sheetExists', () => {
    it('should return true when sheet exists', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'Shots' } },
            { properties: { title: 'Assets' } }
          ]
        }
      });

      const exists = await client.sheetExists('Shots');
      expect(exists).toBe(true);
    });

    it('should return false when sheet does not exist', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'Shots' } }
          ]
        }
      });

      const exists = await client.sheetExists('NonExistent');
      expect(exists).toBe(false);
    });

    it('should return false on error', async () => {
      mockSheets.spreadsheets.get.mockRejectedValue(new Error('API Error'));

      const exists = await client.sheetExists('Shots');
      expect(exists).toBe(false);
    });
  });

  describe('getRowCount', () => {
    it('should return correct row count', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['header1', 'header2'],
            ['row1col1', 'row1col2'],
            ['row2col1', 'row2col2'],
            ['row3col1', 'row3col2']
          ],
          range: 'Shots!A1:B4'
        }
      });

      const rowCount = await client.getRowCount('Shots');
      expect(rowCount).toBe(4);
    });

    it('should return 0 for empty sheet', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [],
          range: 'Shots!A1:A1'
        }
      });

      const rowCount = await client.getRowCount('Shots');
      expect(rowCount).toBe(0);
    });

    it('should return 0 on error', async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValue(new Error('API Error'));

      const rowCount = await client.getRowCount('Shots');
      expect(rowCount).toBe(0);
    });
  });

  describe('createMultipleSheets', () => {
    it('should create multiple sheets successfully', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { sheets: [] }
      });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });
      mockSheets.spreadsheets.values.append.mockResolvedValue({
        data: { updates: { updatedRange: 'A1:C1', updatedRows: 1 } }
      });

      const sheetConfigs = [
        { name: 'Shots', headers: ['shot_id', 'title', 'status'] },
        { name: 'Assets', headers: ['asset_id', 'name', 'type'] },
        { name: 'Tasks', headers: ['task_id', 'name', 'assignee'] }
      ];

      const result = await client.createMultipleSheets(sheetConfigs);
      
      expect(result.created).toEqual(['Shots', 'Assets', 'Tasks']);
      expect(result.failed).toEqual([]);
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      mockSheets.spreadsheets.get
        .mockResolvedValueOnce({ data: { sheets: [] } }) // First sheet succeeds
        .mockRejectedValueOnce(new Error('API Error')) // Second sheet fails
        .mockResolvedValueOnce({ data: { sheets: [] } }); // Third sheet succeeds

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });
      mockSheets.spreadsheets.values.append.mockResolvedValue({
        data: { updates: { updatedRange: 'A1:C1', updatedRows: 1 } }
      });

      const sheetConfigs = [
        { name: 'Shots', headers: ['shot_id', 'title'] },
        { name: 'FailSheet', headers: ['id', 'name'] },
        { name: 'Tasks', headers: ['task_id', 'name'] }
      ];

      const result = await client.createMultipleSheets(sheetConfigs);
      
      expect(result.created).toEqual(['Shots', 'Tasks']);
      expect(result.failed).toEqual(['FailSheet']);
    });
  });

  describe('columnIndexToLetter', () => {
    it('should convert column indices to letters correctly', () => {
      // Test private method by casting to any
      const client = new SheetsApiClient(testSpreadsheetId, testApiKey);
      
      expect((client as any).columnIndexToLetter(0)).toBe('A');
      expect((client as any).columnIndexToLetter(1)).toBe('B');
      expect((client as any).columnIndexToLetter(25)).toBe('Z');
      expect((client as any).columnIndexToLetter(26)).toBe('AA');
      expect((client as any).columnIndexToLetter(27)).toBe('AB');
      expect((client as any).columnIndexToLetter(51)).toBe('AZ');
      expect((client as any).columnIndexToLetter(52)).toBe('BA');
    });
  });

  describe('Enhanced findCellRange', () => {
    it('should handle large column indices correctly', () => {
      const client = new SheetsApiClient(testSpreadsheetId, testApiKey);
      const mockData = {
        values: [
          // Create a wide header row with many columns
          Array.from({ length: 30 }, (_, i) => `col_${i}`),
          Array.from({ length: 30 }, (_, i) => i === 0 ? 'entity_001' : `value_${i}`)
        ],
        range: 'Sheet!A1:AD2',
        majorDimension: 'ROWS' as const
      };

      // Test finding a cell in column 29 (should be AD)
      const range = (client as any).findCellRange(mockData, 'entity_001', 'col_29');
      expect(range).toBe('AD2');
    });
  });

  describe('Error handling improvements', () => {
    it('should handle additional retryable error patterns', () => {
      const client = new SheetsApiClient(testSpreadsheetId, testApiKey);
      
      // Test new retryable error patterns
      expect((client as any).isRetryableError(new Error('Service unavailable'))).toBe(true);
      expect((client as any).isRetryableError(new Error('Bad gateway'))).toBe(true);
      expect((client as any).isRetryableError(new Error('Gateway timeout'))).toBe(true);
      
      // Test non-retryable errors
      expect((client as any).isRetryableError(new Error('Invalid credentials'))).toBe(false);
      expect((client as any).isRetryableError(new Error('Permission denied'))).toBe(false);
    });
  });
});