import express from 'express';
import { SheetsApiClient } from '../services/sheets/SheetsApiClient';
import { authenticateToken as authMiddleware } from '../middleware/auth'; // ← 修正
import { PageConfig, PageType, EntityType } from '../../shared/types';

const router = express.Router();

// Initialize services lazily
let sheetsClient: SheetsApiClient | null = null;

function getSheetsClient(): SheetsApiClient {
  if (!sheetsClient) {
    sheetsClient = new SheetsApiClient();
  }
  return sheetsClient!;
}

/**
 * Get all page configurations
 * GET /api/pages
 * Optional query param: entity - Filter by entity type
 */
router.get(
  '/',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const entityType = req.query.entity as EntityType | undefined;
      const pagesData = await getSheetsClient().getSheetData('Pages');
      if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
        return res.json({ success: true, data: [] });
      }
      const headers = pagesData.values[0];
      const dataRows = pagesData.values.slice(1);
      const pages: PageConfig[] = dataRows.map(row => {
        const configObj = JSON.parse(row[headers.indexOf('config')] || '{}');
        return {
          page_id: row[headers.indexOf('page_id')],
          name: row[headers.indexOf('name')],
          type: row[headers.indexOf('type')] as PageType,
          config: configObj,
          shared: row[headers.indexOf('shared')] === 'true',
          created_by: row[headers.indexOf('created_by')],
          created_date: new Date(row[headers.indexOf('created_date')]),
          modified_date: new Date(row[headers.indexOf('modified_date')])
        };
      });
      const filteredPages = entityType
        ? pages.filter(page => page.config.entity === entityType)
        : pages;
      return res.json({ success: true, data: filteredPages });
    } catch (error: any) {
      console.error('Error fetching page configurations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch page configurations'
      });
    }
  }
);

/**
 * Get a specific page configuration
 * GET /api/pages/:pageId
 */
router.get(
  '/:pageId',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { pageId } = req.params;
      const pagesData = await getSheetsClient().getSheetData('Pages');
      if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
        return res.status(404).json({
          success: false,
          error: 'Page configuration not found'
        });
      }
      const headers = pagesData.values[0];
      const dataRows = pagesData.values.slice(1);
      const pageIndex = dataRows.findIndex(
        row => row[headers.indexOf('page_id')] === pageId
      );
      if (pageIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Page configuration not found'
        });
      }
      const pageRow = dataRows[pageIndex];
      const configObj = JSON.parse(pageRow[headers.indexOf('config')] || '{}');
      const pageConfig: PageConfig = {
        page_id: pageRow[headers.indexOf('page_id')],
        name: pageRow[headers.indexOf('name')],
        type: pageRow[headers.indexOf('type')] as PageType,
        config: configObj,
        shared: pageRow[headers.indexOf('shared')] === 'true',
        created_by: pageRow[headers.indexOf('created_by')],
        created_date: new Date(pageRow[headers.indexOf('created_date')]),
        modified_date: new Date(pageRow[headers.indexOf('modified_date')])
      };
      return res.json({ success: true, data: pageConfig });
    } catch (error: any) {
      console.error('Error fetching page configuration:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch page configuration'
      });
    }
  }
);

/**
 * Create a new page configuration
 * POST /api/pages
 */
router.post(
  '/',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { name, type, config, shared, created_by } = req.body;
      if (!name || !type || !config || created_by === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      const pageId = `page_${Date.now()}`;
      const now = new Date().toISOString();
      const newPageRow = [
        pageId,
        name,
        type,
        JSON.stringify(config),
        shared ? 'true' : 'false',
        created_by,
        now,
        now
      ];
      await getSheetsClient().appendRows('Pages', [newPageRow]);
      const pageConfig: PageConfig = {
        page_id: pageId,
        name,
        type: type as PageType,
        config,
        shared: !!shared,
        created_by,
        created_date: new Date(now),
        modified_date: new Date(now)
      };
      return res.status(201).json({ success: true, data: pageConfig });
    } catch (error: any) {
      console.error('Error creating page configuration:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create page configuration'
      });
    }
  }
);

/**
 * Update a page configuration
 * PUT /api/pages/:pageId
 */
router.put(
  '/:pageId',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { pageId } = req.params;
      const updates = req.body;
      const pagesData = await getSheetsClient().getSheetData('Pages');
      if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
        return res.status(404).json({
          success: false,
          error: 'Page configuration not found'
        });
      }
      const headers = pagesData.values[0];
      const dataRows = pagesData.values.slice(1);
      const pageIndex = dataRows.findIndex(
        row => row[headers.indexOf('page_id')] === pageId
      );
      if (pageIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Page configuration not found'
        });
      }
      const pageRow = [...dataRows[pageIndex]];
      if (updates.name !== undefined) {
        pageRow[headers.indexOf('name')] = updates.name;
      }
      if (updates.type !== undefined) {
        pageRow[headers.indexOf('type')] = updates.type;
      }
      if (updates.config !== undefined) {
        pageRow[headers.indexOf('config')] = JSON.stringify(updates.config);
      }
      if (updates.shared !== undefined) {
        pageRow[headers.indexOf('shared')] = updates.shared ? 'true' : 'false';
      }
      const now = new Date().toISOString();
      pageRow[headers.indexOf('modified_date')] = now;
      const rowNumber = pageIndex + 2;
      await getSheetsClient().updateRow('Pages', rowNumber, pageRow);
      const configObj = JSON.parse(pageRow[headers.indexOf('config')] || '{}');
      const pageConfig: PageConfig = {
        page_id: pageRow[headers.indexOf('page_id')],
        name: pageRow[headers.indexOf('name')],
        type: pageRow[headers.indexOf('type')] as PageType,
        config: configObj,
        shared: pageRow[headers.indexOf('shared')] === 'true',
        created_by: pageRow[headers.indexOf('created_by')],
        created_date: new Date(pageRow[headers.indexOf('created_date')]),
        modified_date: new Date(now)
      };
      return res.json({ success: true, data: pageConfig });
    } catch (error: any) {
      console.error('Error updating page configuration:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update page configuration'
      });
    }
  }
);

/**
 * Delete a page configuration
 * DELETE /api/pages/:pageId
 */
router.delete(
  '/:pageId',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { pageId } = req.params;
      const pagesData = await getSheetsClient().getSheetData('Pages');
      if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
        return res.status(404).json({
          success: false,
          error: 'Page configuration not found'
        });
      }
      const headers = pagesData.values[0];
      const dataRows = pagesData.values.slice(1);
      const pageIndex = dataRows.findIndex(
        row => row[headers.indexOf('page_id')] === pageId
      );
      if (pageIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Page configuration not found'
        });
      }
      const rowNumber = pageIndex + 2;
      await getSheetsClient().deleteRow('Pages', rowNumber);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting page configuration:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete page configuration'
      });
    }
  }
);

/**
 * Share/unshare a page configuration
 * PUT /api/pages/:pageId/share
 */
router.put(
  '/:pageId/share',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { pageId } = req.params;
      const { shared } = req.body;
      if (shared === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing shared parameter'
        });
      }
      const pagesData = await getSheetsClient().getSheetData('Pages');
      if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
        return res.status(404).json({
          success: false,
          error: 'Page configuration not found'
        });
      }
      const headers = pagesData.values[0];
      const dataRows = pagesData.values.slice(1);
      const pageIndex = dataRows.findIndex(
        row => row[headers.indexOf('page_id')] === pageId
      );
      if (pageIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Page configuration not found'
        });
      }
      const pageRow = [...dataRows[pageIndex]];
      pageRow[headers.indexOf('shared')] = shared ? 'true' : 'false';
      const now = new Date().toISOString();
      pageRow[headers.indexOf('modified_date')] = now;
      const rowNumber = pageIndex + 2;
      await getSheetsClient().updateRow('Pages', rowNumber, pageRow);
      const configObj = JSON.parse(pageRow[headers.indexOf('config')] || '{}');
      const pageConfig: PageConfig = {
        page_id: pageRow[headers.indexOf('page_id')],
        name: pageRow[headers.indexOf('name')],
        type: pageRow[headers.indexOf('type')] as PageType,
        config: configObj,
        shared: shared,
        created_by: pageRow[headers.indexOf('created_by')],
        created_date: new Date(pageRow[headers.indexOf('created_date')]),
        modified_date: new Date(now)
      };
      return res.json({ success: true, data: pageConfig });
    } catch (error: any) {
      console.error('Error updating page sharing status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update page sharing status'
      });
    }
  }
);

export default router;