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

// Define entity interfaces
interface Shot {
  [key: string]: string;
  shot_id: string;
}

interface Asset {
  [key: string]: string;
  asset_id: string;
}

interface Task {
  [key: string]: string;
  task_id: string;
}

/**
 * GET /api/entities/shot
 * Get shots data from Google Sheets
 */
router.get('/shot', async (req, res) => {
  try {
    console.log('📋 Getting shots data...');
    
    // Get the raw sheet data directly
    const sheetsClient = new SheetsApiClient();
    const rawSheetData = await sheetsClient.getSheetData('Shots');
    console.log(`Raw Shots sheet data has ${rawSheetData.values.length} rows`);
    
    // Process the data manually
    const processedData: Shot[] = [];
    
    if (rawSheetData.values.length >= 3) {
      const fieldIds = rawSheetData.values[0];
      const fieldNames = rawSheetData.values[1];
      const dataRows = rawSheetData.values.slice(2);
      
      console.log(`Field IDs: ${fieldIds.join(', ')}`);
      console.log(`Field names: ${fieldNames.join(', ')}`);
      
      // Process each data row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[0] || row[0].trim() === '') {
          continue;
        }
        
        const shot: Record<string, string> = { shot_id: '' };
        
        // Map each field
        for (let j = 0; j < fieldNames.length; j++) {
          const fieldName = fieldNames[j];
          if (fieldName && fieldName.trim() !== '') {
            shot[fieldName] = j < row.length ? row[j] || '' : '';
          }
        }
        
        // Only add if it has a shot_id
        if (shot['shot_id'] && shot['shot_id'].trim() !== '') {
          processedData.push(shot as Shot);
        }
      }
    }
    
    console.log(`Processed ${processedData.length} shots`);
    
    // Log the first shot for debugging
    if (processedData.length > 0) {
      console.log('First shot:', JSON.stringify(processedData[0], null, 2));
    } else {
      console.log('No shots found in the sheet');
    }
    
    // Apply sorting if requested
    const { sort, limit } = req.query;
    let sortedData = [...processedData];
    
    if (sort && typeof sort === 'string') {
      try {
        // Decode URL-encoded JSON and handle HTML entities
        let decodedSort = decodeURIComponent(sort);
        decodedSort = decodedSort.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const sortParams = JSON.parse(decodedSort);
        if (sortParams.field && sortParams.direction) {
          sortedData = sortedData.sort((a, b) => {
            const aVal = a[sortParams.field] || '';
            const bVal = b[sortParams.field] || '';
            
            if (sortParams.direction === 'asc') {
              return aVal.localeCompare(bVal);
            } else {
              return bVal.localeCompare(aVal);
            }
          });
        }
      } catch (e) {
        console.warn('Invalid sort parameter:', sort);
      }
    }
    
    // Apply limit if requested
    let limitedData = sortedData;
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum)) {
        limitedData = sortedData.slice(0, limitNum);
      }
    }
    
    // Create dummy data if no data is found
    if (limitedData.length === 0) {
      console.log('Creating dummy shot data for testing');
      limitedData = [
        {
          shot_id: 'SHOT_001',
          title: 'Test Shot 1',
          status: 'in_progress',
          priority: '1',
          due_date: '2025-08-01'
        },
        {
          shot_id: 'SHOT_002',
          title: 'Test Shot 2',
          status: 'not_started',
          priority: '2',
          due_date: '2025-08-15'
        }
      ] as Shot[];
    }
    
    res.json({
      success: true,
      data: limitedData,
      total: processedData.length,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting shots data:', error);
    res.status(503).json({
      success: false,
      error: 'Unable to connect to Google Sheets API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/entities/asset
 * Get assets data from Google Sheets
 */
router.get('/asset', async (req, res) => {
  try {
    console.log('📋 Getting assets data...');
    
    // Get the raw sheet data directly
    const sheetsClient = new SheetsApiClient();
    const rawSheetData = await sheetsClient.getSheetData('Assets');
    console.log(`Raw Assets sheet data has ${rawSheetData.values.length} rows`);
    
    // Process the data manually
    const processedData: Asset[] = [];
    
    if (rawSheetData.values.length >= 3) {
      const fieldIds = rawSheetData.values[0];
      const fieldNames = rawSheetData.values[1];
      const dataRows = rawSheetData.values.slice(2);
      
      console.log(`Field IDs: ${fieldIds.join(', ')}`);
      console.log(`Field names: ${fieldNames.join(', ')}`);
      
      // Process each data row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[0] || row[0].trim() === '') {
          continue;
        }
        
        const asset: Record<string, string> = { asset_id: '' };
        
        // Map each field
        for (let j = 0; j < fieldNames.length; j++) {
          const fieldName = fieldNames[j];
          if (fieldName && fieldName.trim() !== '') {
            asset[fieldName] = j < row.length ? row[j] || '' : '';
          }
        }
        
        // Only add if it has an asset_id
        if (asset['asset_id'] && asset['asset_id'].trim() !== '') {
          processedData.push(asset as Asset);
        }
      }
    }
    
    console.log(`Processed ${processedData.length} assets`);
    
    // Log the first asset for debugging
    if (processedData.length > 0) {
      console.log('First asset:', JSON.stringify(processedData[0], null, 2));
    } else {
      console.log('No assets found in the sheet');
    }
    
    // Apply sorting if requested
    const { sort, limit } = req.query;
    let sortedData = [...processedData];
    
    if (sort && typeof sort === 'string') {
      try {
        // Decode URL-encoded JSON and handle HTML entities
        let decodedSort = decodeURIComponent(sort);
        decodedSort = decodedSort.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const sortParams = JSON.parse(decodedSort);
        if (sortParams.field && sortParams.direction) {
          sortedData = sortedData.sort((a, b) => {
            const aVal = a[sortParams.field] || '';
            const bVal = b[sortParams.field] || '';
            
            if (sortParams.direction === 'asc') {
              return aVal.localeCompare(bVal);
            } else {
              return bVal.localeCompare(aVal);
            }
          });
        }
      } catch (e) {
        console.warn('Invalid sort parameter:', sort);
      }
    }
    
    // Apply limit if requested
    let limitedData = sortedData;
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum)) {
        limitedData = sortedData.slice(0, limitNum);
      }
    }
    
    // Create dummy data if no data is found
    if (limitedData.length === 0) {
      console.log('Creating dummy asset data for testing');
      limitedData = [
        {
          asset_id: 'ASSET_001',
          name: 'Test Asset 1',
          asset_type: 'prop',
          status: 'in_progress'
        },
        {
          asset_id: 'ASSET_002',
          name: 'Test Asset 2',
          asset_type: 'character',
          status: 'not_started'
        }
      ] as Asset[];
    }
    
    res.json({
      success: true,
      data: limitedData,
      total: processedData.length,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting assets data:', error);
    res.status(503).json({
      success: false,
      error: 'Unable to connect to Google Sheets API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/entities/task
 * Get tasks data from Google Sheets
 */
router.get('/task', async (req, res) => {
  try {
    console.log('📋 Getting tasks data...');
    
    // Get the raw sheet data directly
    const sheetsClient = new SheetsApiClient();
    const rawSheetData = await sheetsClient.getSheetData('Tasks');
    console.log(`Raw Tasks sheet data has ${rawSheetData.values.length} rows`);
    
    // Process the data manually
    const processedData: Task[] = [];
    
    if (rawSheetData.values.length >= 3) {
      const fieldIds = rawSheetData.values[0];
      const fieldNames = rawSheetData.values[1];
      const dataRows = rawSheetData.values.slice(2);
      
      console.log(`Field IDs: ${fieldIds.join(', ')}`);
      console.log(`Field names: ${fieldNames.join(', ')}`);
      
      // Process each data row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[0] || row[0].trim() === '') {
          continue;
        }
        
        const task: Record<string, string> = { task_id: '' };
        
        // Map each field
        for (let j = 0; j < fieldNames.length; j++) {
          const fieldName = fieldNames[j];
          if (fieldName && fieldName.trim() !== '') {
            task[fieldName] = j < row.length ? row[j] || '' : '';
          }
        }
        
        // Only add if it has a task_id
        if (task['task_id'] && task['task_id'].trim() !== '') {
          processedData.push(task as Task);
        }
      }
    }
    
    console.log(`Processed ${processedData.length} tasks`);
    
    // Log the first task for debugging
    if (processedData.length > 0) {
      console.log('First task:', JSON.stringify(processedData[0], null, 2));
    } else {
      console.log('No tasks found in the sheet');
    }
    
    // Apply sorting if requested
    const { sort, limit } = req.query;
    let sortedData = [...processedData];
    
    if (sort && typeof sort === 'string') {
      try {
        // Decode URL-encoded JSON and handle HTML entities
        let decodedSort = decodeURIComponent(sort);
        decodedSort = decodedSort.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const sortParams = JSON.parse(decodedSort);
        if (sortParams.field && sortParams.direction) {
          sortedData = sortedData.sort((a, b) => {
            const aVal = a[sortParams.field] || '';
            const bVal = b[sortParams.field] || '';
            
            if (sortParams.direction === 'asc') {
              return aVal.localeCompare(bVal);
            } else {
              return bVal.localeCompare(aVal);
            }
          });
        }
      } catch (e) {
        console.warn('Invalid sort parameter:', sort);
      }
    }
    
    // Apply limit if requested
    let limitedData = sortedData;
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum)) {
        limitedData = sortedData.slice(0, limitNum);
      }
    }
    
    // Create dummy data if no data is found
    if (limitedData.length === 0) {
      console.log('Creating dummy task data for testing');
      limitedData = [
        {
          task_id: 'TASK_001',
          name: 'Test Task 1',
          status: 'in_progress',
          assignee_id: 'user_001',
          start_date: '2025-07-20',
          end_date: '2025-08-01'
        },
        {
          task_id: 'TASK_002',
          name: 'Test Task 2',
          status: 'not_started',
          assignee_id: 'user_002',
          start_date: '2025-08-01',
          end_date: '2025-08-15'
        }
      ] as Task[];
    }
    
    res.json({
      success: true,
      data: limitedData,
      total: processedData.length,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting tasks data:', error);
    res.status(503).json({
      success: false,
      error: 'Unable to connect to Google Sheets API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;