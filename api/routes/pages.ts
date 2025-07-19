import express from 'express';
import { SheetsApiClient } from '../services/sheets/SheetsApiClient';
import { authMiddleware } from '../middleware/auth';
import { PageConfig, PageType, EntityType } from '../../shared/types';

const router = express.Router();
const sheetsClient = new SheetsApiClient();

/**
 * Get all page configurations
 * GET /api/pages
 * Optional query param: entity - Filter by entity type
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const entityType = req.query.entity as EntityType | undefined;
    
    // Get all pages from the Pages sheet
    const pagesData = await sheetsClient.getSheetData('Pages');
    
    if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
      return res.json({ success: true, data: [] });
    }
    
    // Extract headers and data rows
    const headers = pagesData.values[0];
    const dataRows = pagesData.values.slice(1);
    
    // Map rows to PageConfig objects
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
    
    // Filter by entity type if specified
    const filteredPages = entityType 
      ? pages.filter(page => page.config.entity === entityType)
      : pages;
    
    res.json({ success: true, data: filteredPages });
  } catch (error) {
    console.error('Error fetching page configurations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch page configurations' 
    });
  }
});

/**
 * Get a specific page configuration
 * GET /api/pages/:pageId
 */
router.get('/:pageId', authMiddleware, async (req, res) => {
  try {
    const { pageId } = req.params;
    
    // Get all pages from the Pages sheet
    const pagesData = await sheetsClient.getSheetData('Pages');
    
    if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Page configuration not found' 
      });
    }
    
    // Extract headers and data rows
    const headers = pagesData.values[0];
    const dataRows = pagesData.values.slice(1);
    
    // Find the page with matching ID
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
    
    res.json({ success: true, data: pageConfig });
  } catch (error) {
    console.error('Error fetching page configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch page configuration' 
    });
  }
});

/**
 * Create a new page configuration
 * POST /api/pages
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, type, config, shared, created_by } = req.body;
    
    // Validate required fields
    if (!name || !type || !config || created_by === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Generate a new page ID
    const pageId = `page_${Date.now()}`;
    const now = new Date().toISOString();
    
    // Create new page row
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
    
    // Append to Pages sheet
    await sheetsClient.appendRows('Pages', [newPageRow]);
    
    // Return the created page config
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
    
    res.status(201).json({ success: true, data: pageConfig });
  } catch (error) {
    console.error('Error creating page configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create page configuration' 
    });
  }
});

/**
 * Update a page configuration
 * PUT /api/pages/:pageId
 */
router.put('/:pageId', authMiddleware, async (req, res) => {
  try {
    const { pageId } = req.params;
    const updates = req.body;
    
    // Get all pages from the Pages sheet
    const pagesData = await sheetsClient.getSheetData('Pages');
    
    if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Page configuration not found' 
      });
    }
    
    // Extract headers and data rows
    const headers = pagesData.values[0];
    const dataRows = pagesData.values.slice(1);
    
    // Find the page with matching ID
    const pageIndex = dataRows.findIndex(
      row => row[headers.indexOf('page_id')] === pageId
    );
    
    if (pageIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Page configuration not found' 
      });
    }
    
    // Update the page row
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
    
    // Always update modified date
    const now = new Date().toISOString();
    pageRow[headers.indexOf('modified_date')] = now;
    
    // Update the row in the sheet
    const rowNumber = pageIndex + 2; // +1 for 0-index, +1 for header row
    await sheetsClient.updateRow('Pages', rowNumber, pageRow);
    
    // Return the updated page config
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
    
    res.json({ success: true, data: pageConfig });
  } catch (error) {
    console.error('Error updating page configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update page configuration' 
    });
  }
});

/**
 * Delete a page configuration
 * DELETE /api/pages/:pageId
 */
router.delete('/:pageId', authMiddleware, async (req, res) => {
  try {
    const { pageId } = req.params;
    
    // Get all pages from the Pages sheet
    const pagesData = await sheetsClient.getSheetData('Pages');
    
    if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Page configuration not found' 
      });
    }
    
    // Extract headers and data rows
    const headers = pagesData.values[0];
    const dataRows = pagesData.values.slice(1);
    
    // Find the page with matching ID
    const pageIndex = dataRows.findIndex(
      row => row[headers.indexOf('page_id')] === pageId
    );
    
    if (pageIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Page configuration not found' 
      });
    }
    
    // Delete the row from the sheet
    const rowNumber = pageIndex + 2; // +1 for 0-index, +1 for header row
    await sheetsClient.deleteRow('Pages', rowNumber);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting page configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete page configuration' 
    });
  }
});

/**
 * Share/unshare a page configuration
 * PUT /api/pages/:pageId/share
 */
router.put('/:pageId/share', authMiddleware, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { shared } = req.body;
    
    if (shared === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing shared parameter' 
      });
    }
    
    // Get all pages from the Pages sheet
    const pagesData = await sheetsClient.getSheetData('Pages');
    
    if (!pagesData || !pagesData.values || pagesData.values.length <= 1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Page configuration not found' 
      });
    }
    
    // Extract headers and data rows
    const headers = pagesData.values[0];
    const dataRows = pagesData.values.slice(1);
    
    // Find the page with matching ID
    const pageIndex = dataRows.findIndex(
      row => row[headers.indexOf('page_id')] === pageId
    );
    
    if (pageIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Page configuration not found' 
      });
    }
    
    // Update the shared status
    const pageRow = [...dataRows[pageIndex]];
    pageRow[headers.indexOf('shared')] = shared ? 'true' : 'false';
    
    // Always update modified date
    const now = new Date().toISOString();
    pageRow[headers.indexOf('modified_date')] = now;
    
    // Update the row in the sheet
    const rowNumber = pageIndex + 2; // +1 for 0-index, +1 for header row
    await sheetsClient.updateRow('Pages', rowNumber, pageRow);
    
    // Return the updated page config
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
    
    res.json({ success: true, data: pageConfig });
  } catch (error) {
    console.error('Error updating page sharing status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update page sharing status' 
    });
  }
});

export default router;