import express from 'express';
import { SheetsApiClient } from '../services/sheets/SheetsApiClient';
import { SheetInitializationService } from '../services/sheets/SheetInitializationService';
import { ProjectConfig } from '../services/sheets/ISheetsApiClient';
import { ApiResponse } from '../../shared/types';

const router = express.Router();

// Initialize sheets client and initialization service
const sheetsClient = new SheetsApiClient();
const initService = new SheetInitializationService(sheetsClient);

// Validation middleware for project configuration
const validateProjectConfig = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { project_id, storage_provider, originals_root_url, proxies_root_url } = req.body;
  
  // Validate required fields
  if (!project_id || project_id.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'project_id is required'
    } as ApiResponse<null>);
  }
  
  if (!storage_provider || !['gdrive', 'box'].includes(storage_provider)) {
    return res.status(400).json({
      success: false,
      error: 'storage_provider must be either "gdrive" or "box"'
    } as ApiResponse<null>);
  }
  
  if (!originals_root_url || originals_root_url.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'originals_root_url is required'
    } as ApiResponse<null>);
  }
  
  if (!proxies_root_url || proxies_root_url.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'proxies_root_url is required'
    } as ApiResponse<null>);
  }
  
  next();
};

// Initialize a new project
router.post('/init', validateProjectConfig, async (req, res) => {
  try {
    const { project_id, storage_provider, originals_root_url, proxies_root_url, template } = req.body;
    
    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Prepare project configuration
    const projectConfig: ProjectConfig = {
      project_id,
      storage_provider,
      originals_root_url,
      proxies_root_url,
      created_at: new Date()
    };
    
    // Validate project configuration
    const validation = initService.validateProjectConfig(projectConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project configuration',
        message: validation.errors.join(', ')
      } as ApiResponse<null>);
    }
    
    // Initialize project with or without template
    let projectMeta;
    if (template && typeof template === 'string') {
      projectMeta = await initService.initSheetsWithTemplate(projectConfig, template);
    } else {
      projectMeta = await initService.initSheets(projectConfig);
    }
    
    res.status(201).json({
      success: true,
      data: projectMeta,
      message: `Project '${project_id}' initialized successfully with ${projectMeta.sheets_created.length} sheets`
    } as ApiResponse<typeof projectMeta>);
    
  } catch (error) {
    console.error('Error initializing project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize project',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Get project configuration
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if project_meta sheet exists
    const metaSheetExists = await sheetsClient.sheetExists('project_meta');
    if (!metaSheetExists) {
      return res.status(404).json({
        success: false,
        error: `Project '${projectId}' not found`
      } as ApiResponse<null>);
    }
    
    // Get project metadata from project_meta sheet
    const metaData = await sheetsClient.getSheetData('project_meta');
    
    // Find project by ID
    let projectConfig = null;
    for (let i = 1; i < metaData.values.length; i++) {
      const row = metaData.values[i];
      if (row[0] === projectId) {
        projectConfig = {
          project_id: row[0],
          storage_provider: row[1],
          originals_root_url: row[2],
          proxies_root_url: row[3],
          created_at: new Date(row[4])
        };
        break;
      }
    }
    
    if (!projectConfig) {
      return res.status(404).json({
        success: false,
        error: `Project '${projectId}' not found`
      } as ApiResponse<null>);
    }
    
    // Get additional project info
    const spreadsheetInfo = await sheetsClient.getSpreadsheetInfo();
    
    const projectInfo = {
      ...projectConfig,
      spreadsheet_title: spreadsheetInfo.title,
      total_sheets: spreadsheetInfo.sheetCount,
      available_sheets: spreadsheetInfo.sheets
    };
    
    res.status(200).json({
      success: true,
      data: projectInfo,
      message: `Retrieved configuration for project '${projectId}'`
    } as ApiResponse<typeof projectInfo>);
    
  } catch (error) {
    console.error('Error getting project configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Update project configuration
router.put('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { storage_provider, originals_root_url, proxies_root_url } = req.body;
    
    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Check if project_meta sheet exists
    const metaSheetExists = await sheetsClient.sheetExists('project_meta');
    if (!metaSheetExists) {
      return res.status(404).json({
        success: false,
        error: `Project '${projectId}' not found`
      } as ApiResponse<null>);
    }
    
    // Get current project metadata
    const metaData = await sheetsClient.getSheetData('project_meta');
    
    // Find project row
    let currentConfig = null;
    for (let i = 1; i < metaData.values.length; i++) {
      const row = metaData.values[i];
      if (row[0] === projectId) {
        currentConfig = {
          project_id: row[0],
          storage_provider: row[1],
          originals_root_url: row[2],
          proxies_root_url: row[3],
          created_at: new Date(row[4])
        };
        break;
      }
    }
    
    if (!currentConfig) {
      return res.status(404).json({
        success: false,
        error: `Project '${projectId}' not found`
      } as ApiResponse<null>);
    }
    
    // Prepare updated configuration
    const updatedConfig = {
      ...currentConfig,
      storage_provider: storage_provider || currentConfig.storage_provider,
      originals_root_url: originals_root_url || currentConfig.originals_root_url,
      proxies_root_url: proxies_root_url || currentConfig.proxies_root_url
    };
    
    // Validate updated configuration
    const validation = initService.validateProjectConfig(updatedConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project configuration',
        message: validation.errors.join(', ')
      } as ApiResponse<null>);
    }
    
    // Update the project_meta sheet
    const updates = [];
    if (storage_provider) {
      updates.push({
        sheetName: 'project_meta',
        entityId: projectId,
        fieldId: 'storage_provider',
        originalValue: currentConfig.storage_provider,
        newValue: storage_provider,
        force: true
      });
    }
    if (originals_root_url) {
      updates.push({
        sheetName: 'project_meta',
        entityId: projectId,
        fieldId: 'originals_root_url',
        originalValue: currentConfig.originals_root_url,
        newValue: originals_root_url,
        force: true
      });
    }
    if (proxies_root_url) {
      updates.push({
        sheetName: 'project_meta',
        entityId: projectId,
        fieldId: 'proxies_root_url',
        originalValue: currentConfig.proxies_root_url,
        newValue: proxies_root_url,
        force: true
      });
    }
    
    if (updates.length > 0) {
      await sheetsClient.batchUpdate({ updates });
    }
    
    res.status(200).json({
      success: true,
      data: updatedConfig,
      message: `Project '${projectId}' configuration updated successfully`
    } as ApiResponse<typeof updatedConfig>);
    
  } catch (error) {
    console.error('Error updating project configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Get available project templates
router.get('/templates/list', (req, res) => {
  try {
    const templates = initService.getProjectTemplates();
    
    res.status(200).json({
      success: true,
      data: templates,
      message: 'Retrieved available project templates'
    } as ApiResponse<typeof templates>);
    
  } catch (error) {
    console.error('Error getting project templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

// Get project status and health check
router.get('/:projectId/status', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }
    
    // Get spreadsheet info
    const spreadsheetInfo = await sheetsClient.getSpreadsheetInfo();
    
    // Check if all required sheets exist
    const requiredSheets = ['Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users', 'Pages', 'Fields', 'project_meta', 'Logs'];
    const existingSheets = spreadsheetInfo.sheets;
    const missingSheets = requiredSheets.filter(sheet => !existingSheets.includes(sheet));
    
    // Get row counts for each sheet
    const sheetStats: { [key: string]: number } = {};
    for (const sheet of existingSheets) {
      if (requiredSheets.includes(sheet)) {
        const rowCount = await sheetsClient.getRowCount(sheet);
        sheetStats[sheet] = rowCount;
      }
    }
    
    const projectStatus = {
      project_id: projectId,
      spreadsheet_title: spreadsheetInfo.title,
      sheets_configured: missingSheets.length === 0,
      total_sheets: spreadsheetInfo.sheetCount,
      required_sheets: requiredSheets.length,
      missing_sheets: missingSheets,
      sheet_statistics: sheetStats,
      api_connection: isConnected
    };
    
    res.status(200).json({
      success: true,
      data: projectStatus,
      message: `Retrieved status for project '${projectId}'`
    } as ApiResponse<typeof projectStatus>);
    
  } catch (error) {
    console.error('Error getting project status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project status',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

export default router;