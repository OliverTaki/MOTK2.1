import request from 'supertest';
import app from '../../server';
import { SheetsApiClient } from '../../services/sheets/SheetsApiClient';

// Mock the SheetsApiClient
jest.mock('../../services/sheets/SheetsApiClient');

const MockedSheetsApiClient = SheetsApiClient as jest.MockedClass<typeof SheetsApiClient>;

describe('Sheets API Integration Tests', () => {
  let mockSheetsClient: jest.Mocked<SheetsApiClient>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a mock instance
    mockSheetsClient = {
      validateConnection: jest.fn(),
      sheetExists: jest.fn(),
      getSheetData: jest.fn(),
      updateCell: jest.fn(),
      batchUpdate: jest.fn(),
      getRowCount: jest.fn(),
      getSpreadsheetInfo: jest.fn(),
      createSheet: jest.fn(),
      clearSheet: jest.fn(),
      appendRows: jest.fn(),
      getSheetNames: jest.fn(),
      initializeProject: jest.fn(),
      createMultipleSheets: jest.fn()
    } as any;

    // Mock the constructor to return our mock instance
    MockedSheetsApiClient.mockImplementation(() => mockSheetsClient);
  });

  describe('GET /:sheetName', () => {
    it('should return sheet data successfully', async () => {
      const mockSheetData = {
        values: [
          ['shot_id', 'title', 'status'],
          ['shot_001', 'Opening Scene', 'not_started']
        ],
        range: 'Shots!A1:C2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const response = await request(app)
        .get('/api/sheets/Shots')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSheetData,
        message: "Retrieved data from sheet 'Shots'"
      });

      expect(mockSheetsClient.validateConnection).toHaveBeenCalled();
      expect(mockSheetsClient.sheetExists).toHaveBeenCalledWith('Shots');
      expect(mockSheetsClient.getSheetData).toHaveBeenCalledWith('Shots', undefined);
    });

    it('should return 404 when sheet does not exist', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/sheets/NonExistentSheet')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: "Sheet 'NonExistentSheet' not found"
      });
    });

    it('should return 503 when connection fails', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/sheets/Shots')
        .expect(503);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      });
    });

    it('should validate sheet name format', async () => {
      const response = await request(app)
        .get('/api/sheets/Invalid@Sheet!')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid sheet name format'
      });
    });
  });

  describe('PUT /:sheetName/cell', () => {
    it('should update cell successfully', async () => {
      const mockUpdateResult = {
        success: true,
        updatedRange: 'Shots!B2',
        updatedRows: 1,
        conflict: false
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.updateCell.mockResolvedValue(mockUpdateResult);

      const updateData = {
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'Old Title',
        newValue: 'New Title',
        force: false
      };

      const response = await request(app)
        .put('/api/sheets/Shots/cell')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdateResult,
        message: "Successfully updated cell in sheet 'Shots'"
      });

      expect(mockSheetsClient.updateCell).toHaveBeenCalledWith({
        sheetName: 'Shots',
        ...updateData
      });
    });

    it('should handle conflicts with 409 status', async () => {
      const mockConflictResult = {
        success: false,
        conflict: true,
        currentValue: 'Different Value'
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.updateCell.mockResolvedValue(mockConflictResult);

      const updateData = {
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'Old Title',
        newValue: 'New Title'
      };

      const response = await request(app)
        .put('/api/sheets/Shots/cell')
        .send(updateData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Conflict detected',
        message: 'Cell value has been modified by another user',
        data: {
          currentValue: 'Different Value',
          originalValue: 'Old Title',
          newValue: 'New Title'
        }
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .put('/api/sheets/Shots/cell')
        .send({
          entityId: 'shot_001'
          // Missing fieldId and newValue
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'entityId and fieldId are required'
      });
    });
  });

  describe('POST /:sheetName/batch', () => {
    it('should perform batch update successfully', async () => {
      const mockBatchResult = {
        success: true,
        results: [
          { success: true, updatedRange: 'Shots!B2', updatedRows: 1, conflict: false },
          { success: true, updatedRange: 'Shots!C2', updatedRows: 1, conflict: false }
        ],
        totalUpdated: 2,
        conflicts: []
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.batchUpdate.mockResolvedValue(mockBatchResult);

      const batchData = {
        updates: [
          {
            entityId: 'shot_001',
            fieldId: 'title',
            originalValue: 'Old Title',
            newValue: 'New Title'
          },
          {
            entityId: 'shot_001',
            fieldId: 'status',
            originalValue: 'not_started',
            newValue: 'in_progress'
          }
        ]
      };

      const response = await request(app)
        .post('/api/sheets/Shots/batch')
        .send(batchData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockBatchResult,
        message: "Successfully updated 2 cells in sheet 'Shots'"
      });
    });

    it('should handle batch conflicts', async () => {
      const mockBatchResult = {
        success: false,
        results: [
          { success: false, conflict: true, currentValue: 'Different Value' }
        ],
        totalUpdated: 0,
        conflicts: [{
          sheetName: 'Shots',
          entityId: 'shot_001',
          fieldId: 'title',
          originalValue: 'Old Title',
          newValue: 'New Title',
          force: false
        }]
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.batchUpdate.mockResolvedValue(mockBatchResult);

      const batchData = {
        updates: [
          {
            entityId: 'shot_001',
            fieldId: 'title',
            originalValue: 'Old Title',
            newValue: 'New Title'
          }
        ]
      };

      const response = await request(app)
        .post('/api/sheets/Shots/batch')
        .send(batchData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Conflicts detected in batch update',
        message: '1 conflicts found',
        data: {
          conflicts: mockBatchResult.conflicts,
          results: mockBatchResult.results,
          totalUpdated: 0
        }
      });
    });
  });

  describe('GET /:sheetName/info', () => {
    it('should return sheet metadata', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.getRowCount.mockResolvedValue(10);
      mockSheetsClient.getSpreadsheetInfo.mockResolvedValue({
        title: 'MOTK Project',
        sheetCount: 9,
        sheets: ['Shots', 'Assets', 'Tasks']
      });

      const response = await request(app)
        .get('/api/sheets/Shots/info')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sheetName: 'Shots',
          rowCount: 10,
          spreadsheetTitle: 'MOTK Project',
          totalSheets: 9
        },
        message: "Retrieved info for sheet 'Shots'"
      });
    });
  });

  describe('POST /', () => {
    it('should create new sheet successfully', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(false);
      mockSheetsClient.createSheet.mockResolvedValue(true);

      const sheetData = {
        sheetName: 'NewSheet',
        headers: ['id', 'name', 'status']
      };

      const response = await request(app)
        .post('/api/sheets')
        .send(sheetData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: sheetData,
        message: "Successfully created sheet 'NewSheet'"
      });

      expect(mockSheetsClient.createSheet).toHaveBeenCalledWith('NewSheet', ['id', 'name', 'status']);
    });

    it('should return 409 if sheet already exists', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/sheets')
        .send({
          sheetName: 'ExistingSheet',
          headers: ['id', 'name']
        })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: "Sheet 'ExistingSheet' already exists"
      });
    });
  });

  describe('POST /:sheetName/rows', () => {
    it('should append rows successfully', async () => {
      const mockAppendResult = {
        success: true,
        updatedRange: 'Shots!A2:C3',
        updatedRows: 2
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.appendRows.mockResolvedValue(mockAppendResult);

      const rowData = {
        values: [
          ['shot_002', 'Second Shot', 'not_started'],
          ['shot_003', 'Third Shot', 'in_progress']
        ]
      };

      const response = await request(app)
        .post('/api/sheets/Shots/rows')
        .send(rowData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAppendResult,
        message: "Successfully appended 2 rows to sheet 'Shots'"
      });

      expect(mockSheetsClient.appendRows).toHaveBeenCalledWith('Shots', rowData.values);
    });
  });

  describe('DELETE /:sheetName/data', () => {
    it('should clear sheet data successfully', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.clearSheet.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/sheets/Shots/data')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Successfully cleared data from sheet 'Shots'"
      });

      expect(mockSheetsClient.clearSheet).toHaveBeenCalledWith('Shots');
    });
  });
});