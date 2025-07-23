import { Router } from 'express';
import { SheetsApiClient } from '../services/sheets/SheetsApiClient';
import { SheetDataService } from '../services/sheets/SheetDataService';

const router = Router();

// Initialize services lazily
let sheetsClient: SheetsApiClient | null = null;
let sheetDataService: SheetDataService | null = null;

function getSheetDataService(): SheetDataService {
  if (!sheetsClient) {
    sheetsClient = new SheetsApiClient();
  }
  if (!sheetDataService) {
    sheetDataService = new SheetDataService(sheetsClient!);
  }
  return sheetDataService!;
}

/**
 * GET /api/sheets/data
 * Get all sheet data for the current project
 */
router.get('/data', async (req, res) => {
  try {
    console.log('📊 Getting all sheet data...');
    
    const data = await getSheetDataService().getAllSheetData();
    
    res.json({
      success: true,
      data,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting sheet data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sheets/:sheetName
 * Get data from a specific sheet
 */
router.get('/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    console.log(`📋 Getting data from sheet: ${sheetName}`);
    
    const data = await getSheetDataService().getSheetData(sheetName);
    
    res.json({
      success: true,
      data,
      sheetName,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error getting data from sheet ${req.params.sheetName}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sheets/meta/project
 * Get project metadata
 */
router.get('/meta/project', async (req, res) => {
  try {
    console.log('📋 Getting project metadata...');
    
    const meta = await getSheetDataService().getProjectMeta();
    
    res.json({
      success: true,
      data: meta,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting project metadata:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sheets/meta/fields
 * Get field mappings
 */
router.get('/meta/fields', async (req, res) => {
  try {
    console.log('📋 Getting field mappings...');
    
    const mappings = await getSheetDataService().getFieldMappings();
    
    res.json({
      success: true,
      data: mappings,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting field mappings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;