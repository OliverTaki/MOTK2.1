import express, { Request, Response, NextFunction } from 'express';
import { SheetsApiClient } from '../services/sheets/SheetsApiClient';

const sheetsClient = new SheetsApiClient();
import { SheetInitializationService } from '../services/sheets/SheetInitializationService';
import { ProjectConfig } from '../services/sheets/ISheetsApiClient';
import { ApiResponse } from '../../shared/types';

const router = express.Router();
const initService = new SheetInitializationService(sheetsClient);

/**
 * Validate incoming project configuration payload
 */
const validateProjectConfig = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const { project_id, storage_provider, originals_root_url, proxies_root_url } = req.body;

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

  if (!originals_root_url || !proxies_root_url) {
    return res.status(400).json({
      success: false,
      error: 'Missing storage URLs'
    } as ApiResponse<null>);
  }

  next();
};

/**
 * POST /projects/init
 * Initialize a new project (creates sheets, writes meta row, etc.)
 */
router.post(
  '/init',
  validateProjectConfig,
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { project_id, storage_provider, originals_root_url, proxies_root_url, template } = req.body;

      // Check Sheets API connectivity
      if (!(await sheetsClient.validateConnection())) {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Google Sheets API'
        } as ApiResponse<null>);
      }

      const projectConfig: ProjectConfig = {
        project_id,
        storage_provider,
        originals_root_url,
        proxies_root_url,
        created_at: new Date(),
      };

      const validation = initService.validateProjectConfig(projectConfig);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project configuration',
          message: validation.errors.join(', ')
        } as ApiResponse<null>);
      }

      // If a template name was provided, use it
      const projectMeta = 
        template && typeof template === 'string'
          ? await initService.initSheetsWithTemplate(projectConfig, template)
          : await initService.initSheets(projectConfig);

      return res.status(201).json({
        success: true,
        data: projectMeta,
        message: `Project '${project_id}' initialized successfully with ${projectMeta.sheets_created.length} sheets`
      } as ApiResponse<typeof projectMeta>);

    } catch (error) {
      console.error('Error initializing project:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to initialize project',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse<null>);
    }
  }
);

/**
 * GET /projects/:projectId
 * Retrieve stored configuration and spreadsheet info for a project
 */
router.get(
  '/:projectId',
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId } = req.params;

      if (!(await sheetsClient.validateConnection())) {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Google Sheets API'
        } as ApiResponse<null>);
      }

      // Ensure the project_meta sheet exists
      if (!(await sheetsClient.sheetExists('project_meta'))) {
        return res.status(404).json({
          success: false,
          error: `Project '${projectId}' not found`
        } as ApiResponse<null>);
      }

      // Read the meta sheet
      const metaData = await sheetsClient.getSheetData('project_meta');
      let projectConfig: ProjectConfig | null = null;
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

      // Get spreadsheet metadata
      const spreadsheetInfo = await sheetsClient.getSpreadsheetInfo();
      const projectInfo = {
        ...projectConfig,
        spreadsheet_title: spreadsheetInfo.title,
        total_sheets: spreadsheetInfo.sheetCount,
        available_sheets: spreadsheetInfo.sheets
      };

      return res.status(200).json({
        success: true,
        data: projectInfo,
        message: `Retrieved configuration for project '${projectId}'`
      } as ApiResponse<typeof projectInfo>);

    } catch (error) {
      console.error('Error getting project configuration:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve project configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse<null>);
    }
  }
);

/**
 * PUT /projects/:projectId
 * Update storage URLs or provider for an existing project
 */
router.put(
  '/:projectId',
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId } = req.params;
      const { storage_provider, originals_root_url, proxies_root_url } = req.body;

      if (!(await sheetsClient.validateConnection())) {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Google Sheets API'
        } as ApiResponse<null>);
      }

      if (!(await sheetsClient.sheetExists('project_meta'))) {
        return res.status(404).json({
          success: false,
          error: `Project '${projectId}' not found`
        } as ApiResponse<null>);
      }

      // Load current config row
      const metaData = await sheetsClient.getSheetData('project_meta');
      let currentConfig: ProjectConfig | null = null;
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

      // Merge updates
      const updatedConfig: ProjectConfig = {
        ...currentConfig,
        storage_provider: storage_provider || currentConfig.storage_provider,
        originals_root_url: originals_root_url || currentConfig.originals_root_url,
        proxies_root_url: proxies_root_url || currentConfig.proxies_root_url
      };

      // Validate
      const validation = initService.validateProjectConfig(updatedConfig);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project configuration',
          message: validation.errors.join(', ')
        } as ApiResponse<null>);
      }

      // Build batch of cell updates
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

      if (updates.length) {
        await sheetsClient.batchUpdate({ updates });
      }

      return res.status(200).json({
        success: true,
        data: updatedConfig,
        message: `Project '${projectId}' configuration updated successfully`
      } as ApiResponse<typeof updatedConfig>);

    } catch (error) {
      console.error('Error updating project configuration:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update project configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse<null>);
    }
  }
);

/**
 * GET /projects/templates/list
 * List available project templates
 */
router.get(
  '/templates/list',
  (req: Request, res: Response) => {
    try {
      const templates = initService.getProjectTemplates();
      return res.status(200).json({
        success: true,
        data: templates,
        message: 'Retrieved available project templates'
      } as ApiResponse<typeof templates>);
    } catch (error) {
      console.error('Error getting project templates:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve project templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse<null>);
    }
  }
);

/**
 * GET /projects/:projectId/status
 * Return health/status info about the spreadsheet and sheets
 */
router.get(
  '/:projectId/status',
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId } = req.params;

      if (!(await sheetsClient.validateConnection())) {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Google Sheets API'
        } as ApiResponse<null>);
      }

      const spreadsheetInfo = await sheetsClient.getSpreadsheetInfo();
      const requiredSheets = [
        'Shots',
        'Assets',
        'Tasks',
        'ProjectMembers',
        'Users',
        'Pages',
        'Fields',
        'project_meta',
        'Logs'
      ];

      const missingSheets = requiredSheets.filter(
        (s) => !spreadsheetInfo.sheets.includes(s)
      );

      const sheetStats: Record<string, number> = {};
      for (const s of spreadsheetInfo.sheets) {
        if (requiredSheets.includes(s)) {
          sheetStats[s] = await sheetsClient.getRowCount(s);
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
        api_connection: true
      };

      return res.status(200).json({
        success: true,
        data: projectStatus,
        message: `Retrieved status for project '${projectId}'`
      } as ApiResponse<typeof projectStatus>);

    } catch (error) {
      console.error('Error getting project status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve project status',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse<null>);
    }
  }
);

export default router;
