import express from 'express';
import { SheetsApiClient } from '../services/sheets/SheetsApiClient';
import { CellUpdateParams, BatchUpdateParams } from '../services/sheets/ISheetsApiClient';
import { ApiResponse } from '../../shared/types';

const router = express.Router();

// Initialize sheets client
const sheetsClient = new SheetsApiClient();

// Validation middleware for sheet names
const validateSheetName = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { sheetName } = req.params;
  
  if (!sheetName || sheetName.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Sheet name is required'
    } as ApiResponse<null>);
  }
  
  // Validate sheet name format (basic validation)
  if (!/^[a-zA-Z0-9_\s-]+$/.test(sheetName)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid sheet name format'
    } as ApiResponse<null>);
  }
  
  next();
};

// Get sheet data
router.get('/:sheetName', validateSheetName, async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { range } = req.query;
    
    // Validate connection first
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if sheet exists
    const exists = await sheetsClient.sheetExists(sheetName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: `Sheet '${sheetName}' not found`
      } as ApiResponse<null>);
    }
    
    // Get sheet data
    const sheetData = await sheetsClient.getSheetData(sheetName, range as string);
    
    res.status(200).json({
      success: true,
      data: sheetData,
      message: `Retrieved data from sheet '${sheetName}'`
    } as ApiResponse<typeof sheetData>);
    
  } catch (error) {
    console.error('Error getting sheet data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sheet data',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Update single cell
router.put('/:sheetName/cell', validateSheetName, async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { entityId, fieldId, originalValue, newValue, force } = req.body;
    
    // Validate required fields
    if (!entityId || !fieldId) {
      return res.status(400).json({
        success: false,
        error: 'entityId and fieldId are required'
      } as ApiResponse<null>);
    }
    
    if (newValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'newValue is required'
      } as ApiResponse<null>);
    }
    
    // Validate connection
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if sheet exists
    const exists = await sheetsClient.sheetExists(sheetName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: `Sheet '${sheetName}' not found`
      } as ApiResponse<null>);
    }
    
    // Prepare update parameters
    const updateParams: CellUpdateParams = {
      sheetName,
      entityId,
      fieldId,
      originalValue,
      newValue,
      force: force || false
    };
    
    // Perform update
    const result = await sheetsClient.updateCell(updateParams);
    
    // Handle conflicts
    if (result.conflict) {
      return res.status(409).json({
        success: false,
        error: 'Conflict detected',
        message: 'Cell value has been modified by another user',
        data: {
          currentValue: result.currentValue,
          originalValue,
          newValue
        }
      } as ApiResponse<any>);
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update cell'
      } as ApiResponse<null>);
    }
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Successfully updated cell in sheet '${sheetName}'`
    } as ApiResponse<typeof result>);
    
  } catch (error) {
    console.error('Error updating cell:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cell',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Batch update cells
router.post('/:sheetName/batch', validateSheetName, async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { updates } = req.body;
    
    // Validate updates array
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'updates array is required and must not be empty'
      } as ApiResponse<null>);
    }
    
    // Validate each update
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      if (!update.entityId || !update.fieldId || update.newValue === undefined) {
        return res.status(400).json({
          success: false,
          error: `Invalid update at index ${i}: entityId, fieldId, and newValue are required`
        } as ApiResponse<null>);
      }
    }
    
    // Validate connection
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if sheet exists
    const exists = await sheetsClient.sheetExists(sheetName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: `Sheet '${sheetName}' not found`
      } as ApiResponse<null>);
    }
    
    // Prepare batch update parameters
    const batchParams: BatchUpdateParams = {
      updates: updates.map((update: any) => ({
        sheetName,
        entityId: update.entityId,
        fieldId: update.fieldId,
        originalValue: update.originalValue,
        newValue: update.newValue,
        force: update.force || false
      }))
    };
    
    // Perform batch update
    const result = await sheetsClient.batchUpdate(batchParams);
    
    // Handle conflicts
    if (result.conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Conflicts detected in batch update',
        message: `${result.conflicts.length} conflicts found`,
        data: {
          conflicts: result.conflicts,
          results: result.results,
          totalUpdated: result.totalUpdated
        }
      } as ApiResponse<any>);
    }
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Successfully updated ${result.totalUpdated} cells in sheet '${sheetName}'`
    } as ApiResponse<typeof result>);
    
  } catch (error) {
    console.error('Error in batch update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch update',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Get sheet metadata
router.get('/:sheetName/info', validateSheetName, async (req, res) => {
  try {
    const { sheetName } = req.params;
    
    // Validate connection
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if sheet exists
    const exists = await sheetsClient.sheetExists(sheetName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: `Sheet '${sheetName}' not found`
      } as ApiResponse<null>);
    }
    
    // Get sheet info
    const rowCount = await sheetsClient.getRowCount(sheetName);
    const spreadsheetInfo = await sheetsClient.getSpreadsheetInfo();
    
    const sheetInfo = {
      sheetName,
      rowCount,
      spreadsheetTitle: spreadsheetInfo.title,
      totalSheets: spreadsheetInfo.sheetCount
    };
    
    res.status(200).json({
      success: true,
      data: sheetInfo,
      message: `Retrieved info for sheet '${sheetName}'`
    } as ApiResponse<typeof sheetInfo>);
    
  } catch (error) {
    console.error('Error getting sheet info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sheet info',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Create new sheet
router.post('/', async (req, res) => {
  try {
    const { sheetName, headers } = req.body;
    
    // Validate required fields
    if (!sheetName || sheetName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'sheetName is required'
      } as ApiResponse<null>);
    }
    
    if (!Array.isArray(headers)) {
      return res.status(400).json({
        success: false,
        error: 'headers must be an array'
      } as ApiResponse<null>);
    }
    
    // Validate sheet name format
    if (!/^[a-zA-Z0-9_\s-]+$/.test(sheetName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sheet name format'
      } as ApiResponse<null>);
    }
    
    // Validate connection
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if sheet already exists
    const exists = await sheetsClient.sheetExists(sheetName);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: `Sheet '${sheetName}' already exists`
      } as ApiResponse<null>);
    }
    
    // Create sheet
    const success = await sheetsClient.createSheet(sheetName, headers);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create sheet'
      } as ApiResponse<null>);
    }
    
    res.status(201).json({
      success: true,
      data: { sheetName, headers },
      message: `Successfully created sheet '${sheetName}'`
    } as ApiResponse<{ sheetName: string; headers: string[] }>);
    
  } catch (error) {
    console.error('Error creating sheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sheet',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Clear sheet data (keeping headers)
router.delete('/:sheetName/data', validateSheetName, async (req, res) => {
  try {
    const { sheetName } = req.params;
    
    // Validate connection
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if sheet exists
    const exists = await sheetsClient.sheetExists(sheetName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: `Sheet '${sheetName}' not found`
      } as ApiResponse<null>);
    }
    
    // Clear sheet data
    const success = await sheetsClient.clearSheet(sheetName);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to clear sheet data'
      } as ApiResponse<null>);
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully cleared data from sheet '${sheetName}'`
    } as ApiResponse<null>);
    
  } catch (error) {
    console.error('Error clearing sheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear sheet data',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Append rows to sheet
router.post('/:sheetName/rows', validateSheetName, async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { values } = req.body;
    
    // Validate values
    if (!Array.isArray(values) || values.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'values array is required and must not be empty'
      } as ApiResponse<null>);
    }
    
    // Validate that each row is an array
    for (let i = 0; i < values.length; i++) {
      if (!Array.isArray(values[i])) {
        return res.status(400).json({
          success: false,
          error: `Row at index ${i} must be an array`
        } as ApiResponse<null>);
      }
    }
    
    // Validate connection
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if sheet exists
    const exists = await sheetsClient.sheetExists(sheetName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: `Sheet '${sheetName}' not found`
      } as ApiResponse<null>);
    }
    
    // Append rows
    const result = await sheetsClient.appendRows(sheetName, values);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to append rows'
      } as ApiResponse<null>);
    }
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Successfully appended ${values.length} rows to sheet '${sheetName}'`
    } as ApiResponse<typeof result>);
    
  } catch (error) {
    console.error('Error appending rows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to append rows',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

export default router;