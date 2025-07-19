import request from 'supertest';
import express from 'express';

// Mock the SheetsApiClient before importing the router
const mockSheetsClient = {
  validateConnection: jest.fn(),
  sheetExists: jest.fn(),
  getSheetData: jest.fn(),
  updateCell: jest.fn(),
  batchUpdate: jest.fn(),
  createSheet: jest.fn(),
  getRowCount: jest.fn(),
  getSpreadsheetInfo: jest.fn(),
  appendRows: jest.fn(),
  clearSheet: jest.fn()
};

jest.mock('../../services/sheets/SheetsApiClient', () => {
  return {
    SheetsApiClient: jest.fn().mockImplementation(() => mockSheetsClient)
  };
});

// Now import the router after mocking
import sheetsRouter from '../sheets';

describe('Sheets API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create Express app with sheets router
    app = express();
    app.use(express.json());
    app.use('/api/sheets', sheetsRouter);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /:sheetName', () => {
    it('should return sheet data successfully', async () => {
      const mockSheetData = {
        values: [['header1', 'header2'], ['value1', 'value2']],
        range: 'TestSheet!A1:B2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.getSheetData.mockResolvedValue(mockSheetData);

      const response = await request(app)
        .get('/api/sheets/TestSheet')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSheetData,
        message: "Retrieved data from sheet 'TestSheet'"
      });

      expect(mockSheetsClient.validateConnection).toHaveBeenCalled();
      expect(mockSheetsClient.sheetExists).toHaveBeenCalledWith('TestSheet');
      expect(mockSheetsClient.getSheetData).toHaveBeenCalledWith('TestSheet', undefined);
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
        .get('/api/sheets/TestSheet')
        .expect(503);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      });
    });

    it('should return 400 for invalid sheet name', async () => {
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
        updatedRange: 'TestSheet!A1',
        updatedRows: 1,
        conflict: false
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.updateCell.mockResolvedValue(mockUpdateResult);

      const updateData = {
        entityId: 'entity_001',
        fieldId: 'field_001',
        originalValue: 'old_value',
        newValue: 'new_value'
      };

      const response = await request(app)
        .put('/api/sheets/TestSheet/cell')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdateResult,
        message: "Successfully updated cell in sheet 'TestSheet'"
      });

      expect(mockSheetsClient.updateCell).toHaveBeenCalledWith({
        sheetName: 'TestSheet',
        entityId: 'entity_001',
        fieldId: 'field_001',
        originalValue: 'old_value',
        newValue: 'new_value',
        force: false
      });
    });

    it('should return 409 when conflict is detected', async () => {
      const mockUpdateResult = {
        success: false,
        conflict: true,
        currentValue: 'different_value'
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.updateCell.mockResolvedValue(mockUpdateResult);

      const updateData = {
        entityId: 'entity_001',
        fieldId: 'field_001',
        originalValue: 'old_value',
        newValue: 'new_value'
      };

      const response = await request(app)
        .put('/api/sheets/TestSheet/cell')
        .send(updateData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Conflict detected',
        message: 'Cell value has been modified by another user',
        data: {
          currentValue: 'different_value',
          originalValue: 'old_value',
          newValue: 'new_value'
        }
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .put('/api/sheets/TestSheet/cell')
        .send({ newValue: 'test' })
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
          { success: true, updatedRange: 'TestSheet!A1', updatedRows: 1, conflict: false },
          { success: true, updatedRange: 'TestSheet!B1', updatedRows: 1, conflict: false }
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
            entityId: 'entity_001',
            fieldId: 'field_001',
            originalValue: 'old_value1',
            newValue: 'new_value1'
          },
          {
            entityId: 'entity_002',
            fieldId: 'field_002',
            originalValue: 'old_value2',
            newValue: 'new_value2'
          }
        ]
      };

      const response = await request(app)
        .post('/api/sheets/TestSheet/batch')
        .send(batchData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockBatchResult,
        message: "Successfully updated 2 cells in sheet 'TestSheet'"
      });
    });

    it('should return 409 when conflicts are detected in batch', async () => {
      const mockBatchResult = {
        success: false,
        results: [
          { success: true, updatedRange: 'TestSheet!A1', updatedRows: 1, conflict: false },
          { success: false, conflict: true, currentValue: 'different_value' }
        ],
        totalUpdated: 1,
        conflicts: [{
          sheetName: 'TestSheet',
          entityId: 'entity_002',
          fieldId: 'field_002',
          originalValue: 'old_value2',
          newValue: 'new_value2'
        }]
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.batchUpdate.mockResolvedValue(mockBatchResult);

      const batchData = {
        updates: [
          {
            entityId: 'entity_001',
            fieldId: 'field_001',
            originalValue: 'old_value1',
            newValue: 'new_value1'
          },
          {
            entityId: 'entity_002',
            fieldId: 'field_002',
            originalValue: 'old_value2',
            newValue: 'new_value2'
          }
        ]
      };

      const response = await request(app)
        .post('/api/sheets/TestSheet/batch')
        .send(batchData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Conflicts detected in batch update',
        message: '1 conflicts found',
        data: {
          conflicts: mockBatchResult.conflicts,
          results: mockBatchResult.results,
          totalUpdated: 1
        }
      });
    });

    it('should return 400 when updates array is empty', async () => {
      const response = await request(app)
        .post('/api/sheets/TestSheet/batch')
        .send({ updates: [] })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'updates array is required and must not be empty'
      });
    });
  });

  describe('POST /', () => {
    it('should create sheet successfully', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(false);
      mockSheetsClient.createSheet.mockResolvedValue(true);

      const sheetData = {
        sheetName: 'NewSheet',
        headers: ['header1', 'header2', 'header3']
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

      expect(mockSheetsClient.createSheet).toHaveBeenCalledWith('NewSheet', ['header1', 'header2', 'header3']);
    });

    it('should return 409 when sheet already exists', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);

      const sheetData = {
        sheetName: 'ExistingSheet',
        headers: ['header1', 'header2']
      };

      const response = await request(app)
        .post('/api/sheets')
        .send(sheetData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: "Sheet 'ExistingSheet' already exists"
      });
    });

    it('should return 400 when sheetName is missing', async () => {
      const response = await request(app)
        .post('/api/sheets')
        .send({ headers: ['header1'] })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'sheetName is required'
      });
    });

    it('should return 400 when headers is not an array', async () => {
      const response = await request(app)
        .post('/api/sheets')
        .send({ sheetName: 'TestSheet', headers: 'not-an-array' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'headers must be an array'
      });
    });
  });

  describe('GET /:sheetName/info', () => {
    it('should return sheet info successfully', async () => {
      const mockSpreadsheetInfo = {
        title: 'Test Spreadsheet',
        sheetCount: 5,
        sheets: ['Sheet1', 'Sheet2', 'TestSheet', 'Sheet4', 'Sheet5']
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.getRowCount.mockResolvedValue(10);
      mockSheetsClient.getSpreadsheetInfo.mockResolvedValue(mockSpreadsheetInfo);

      const response = await request(app)
        .get('/api/sheets/TestSheet/info')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sheetName: 'TestSheet',
          rowCount: 10,
          spreadsheetTitle: 'Test Spreadsheet',
          totalSheets: 5
        },
        message: "Retrieved info for sheet 'TestSheet'"
      });
    });
  });

  describe('POST /:sheetName/rows', () => {
    it('should append rows successfully', async () => {
      const mockAppendResult = {
        success: true,
        updatedRange: 'TestSheet!A2:C3',
        updatedRows: 2
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.appendRows.mockResolvedValue(mockAppendResult);

      const rowsData = {
        values: [
          ['value1', 'value2', 'value3'],
          ['value4', 'value5', 'value6']
        ]
      };

      const response = await request(app)
        .post('/api/sheets/TestSheet/rows')
        .send(rowsData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAppendResult,
        message: "Successfully appended 2 rows to sheet 'TestSheet'"
      });

      expect(mockSheetsClient.appendRows).toHaveBeenCalledWith('TestSheet', rowsData.values);
    });

    it('should return 400 when values is not an array', async () => {
      const response = await request(app)
        .post('/api/sheets/TestSheet/rows')
        .send({ values: 'not-an-array' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'values array is required and must not be empty'
      });
    });

    it('should return 400 when row is not an array', async () => {
      const response = await request(app)
        .post('/api/sheets/TestSheet/rows')
        .send({ values: [['valid', 'row'], 'invalid-row'] })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Row at index 1 must be an array'
      });
    });
  });

  describe('DELETE /:sheetName/data', () => {
    it('should clear sheet data successfully', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.clearSheet.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/sheets/TestSheet/data')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Successfully cleared data from sheet 'TestSheet'"
      });

      expect(mockSheetsClient.clearSheet).toHaveBeenCalledWith('TestSheet');
    });

    it('should return 500 when clear operation fails', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.clearSheet.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/sheets/TestSheet/data')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to clear sheet data'
      });
    });
  });
});