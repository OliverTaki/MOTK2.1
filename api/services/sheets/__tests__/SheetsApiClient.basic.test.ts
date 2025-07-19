import { SheetsApiClient } from '../SheetsApiClient';

// Simple test without complex mocking
describe('SheetsApiClient Basic Tests', () => {
  describe('constructor', () => {
    it('should create instance with provided parameters', () => {
      const client = new SheetsApiClient('test-id', 'test-key');
      expect(client).toBeInstanceOf(SheetsApiClient);
    });

    it('should create instance with environment variables', () => {
      process.env.GOOGLE_SHEETS_ID = 'env-id';
      process.env.GOOGLE_SHEETS_API_KEY = 'env-key';
      
      const client = new SheetsApiClient();
      expect(client).toBeInstanceOf(SheetsApiClient);
    });
  });

  describe('getSheetHeaders', () => {
    it('should return correct headers for Shots sheet', () => {
      const client = new SheetsApiClient('test-id', 'test-key');
      // Access private method for testing (we'll make it public for testing)
      const headers = (client as any).getSheetHeaders('Shots');
      
      expect(headers).toContain('shot_id');
      expect(headers).toContain('title');
      expect(headers).toContain('status');
      expect(headers).toContain('due_date');
    });

    it('should return correct headers for Assets sheet', () => {
      const client = new SheetsApiClient('test-id', 'test-key');
      const headers = (client as any).getSheetHeaders('Assets');
      
      expect(headers).toContain('asset_id');
      expect(headers).toContain('name');
      expect(headers).toContain('asset_type');
      expect(headers).toContain('status');
    });

    it('should return correct headers for Tasks sheet', () => {
      const client = new SheetsApiClient('test-id', 'test-key');
      const headers = (client as any).getSheetHeaders('Tasks');
      
      expect(headers).toContain('task_id');
      expect(headers).toContain('name');
      expect(headers).toContain('assignee_id');
      expect(headers).toContain('start_date');
    });
  });

  describe('findCellValue and findCellRange', () => {
    it('should find cell value correctly', () => {
      const client = new SheetsApiClient('test-id', 'test-key');
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

      const status = (client as any).findCellValue(mockData, 'shot_002', 'status');
      expect(status).toBe('not_started');
    });

    it('should find cell range correctly', () => {
      const client = new SheetsApiClient('test-id', 'test-key');
      const mockData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_001', 'Opening Scene', 'in_progress'],
          ['shot_002', 'Closing Scene', 'not_started']
        ],
        range: 'Shots!A1:C3',
        majorDimension: 'ROWS' as const
      };

      const range = (client as any).findCellRange(mockData, 'shot_001', 'title');
      expect(range).toBe('B2');

      const statusRange = (client as any).findCellRange(mockData, 'shot_002', 'status');
      expect(statusRange).toBe('C3');
    });

    it('should return null for non-existent entity or field', () => {
      const client = new SheetsApiClient('test-id', 'test-key');
      const mockData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_001', 'Opening Scene', 'in_progress']
        ],
        range: 'Shots!A1:C2',
        majorDimension: 'ROWS' as const
      };

      const value = (client as any).findCellValue(mockData, 'shot_999', 'title');
      expect(value).toBeNull();

      const range = (client as any).findCellRange(mockData, 'shot_001', 'nonexistent_field');
      expect(range).toBeNull();
    });
  });
});