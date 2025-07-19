import express from 'express';
import { EntityManager } from '../services/entities/EntityManager';
import { SheetsApiClient } from '../services/sheets/SheetsApiClient';
import { StorageManager } from '../services/storage/StorageManager';
import { 
  EntityType, 
  EntityData, 
  EntityQueryParams,
  ApiResponse,
  Shot,
  Asset,
  Task,
  ProjectMember,
  User
} from '../../shared/types';

const router = express.Router();

// Initialize services
const sheetsClient = new SheetsApiClient();
const storageManager = new StorageManager();
const entityManager = new EntityManager(sheetsClient, storageManager);

// Validation middleware for entity type
const validateEntityType = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { type } = req.params;
  
  if (!['shot', 'asset', 'task', 'member', 'user'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid entity type. Must be one of: shot, asset, task, member, user'
    } as ApiResponse<null>);
  }
  
  next();
};

// Validation middleware for entity data
const validateEntityData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { type } = req.params;
  const data = req.body;
  
  if (!data || typeof data !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Request body must contain entity data'
    } as ApiResponse<null>);
  }
  
  // Basic validation based on entity type
  switch (type) {
    case 'shot':
      if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Shot title is required'
        } as ApiResponse<null>);
      }
      break;
      
    case 'asset':
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Asset name is required'
        } as ApiResponse<null>);
      }
      break;
      
    case 'task':
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Task name is required'
        } as ApiResponse<null>);
      }
      break;
      
    case 'member':
      if (!data.user_id || typeof data.user_id !== 'string' || data.user_id.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Member user_id is required'
        } as ApiResponse<null>);
      }
      break;
      
    case 'user':
      if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'User email is required'
        } as ApiResponse<null>);
      }
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'User name is required'
        } as ApiResponse<null>);
      }
      break;
  }
  
  next();
};

// Get all entities of a specific type with optional filtering and pagination
router.get('/:type', validateEntityType, async (req: express.Request, res: express.Response) => {
  try {
    const { type } = req.params;
    const { 
      limit = '100', 
      offset = '0', 
      sort_field, 
      sort_direction = 'asc',
      ...filters 
    } = req.query;

    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }

    // Build query parameters
    const queryParams: EntityQueryParams = {
      entityType: type as EntityType,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort: sort_field ? {
        field: sort_field as string,
        direction: sort_direction as 'asc' | 'desc'
      } : undefined
    };

    // Query entities
    const result = await entityManager.queryEntities(queryParams);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve entities'
      } as ApiResponse<null>);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        offset: result.offset,
        limit: result.limit,
        count: result.data.length
      },
      message: `Retrieved ${result.data.length} ${type} entities`
    } as ApiResponse<typeof result.data>);

  } catch (error) {
    console.error(`Error retrieving ${req.params.type} entities:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve entities'
    } as ApiResponse<null>);
  }
});

// Create a new entity
router.post('/:type', validateEntityType, validateEntityData, async (req: express.Request, res: express.Response) => {
  try {
    const { type } = req.params;
    const entityData = req.body;

    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }

    // Create entity
    const result = await entityManager.createEntity(type as EntityType, entityData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to create entity'
      } as ApiResponse<null>);
    }

    res.status(201).json({
      success: true,
      data: result.data,
      message: `${type} entity created successfully`
    } as ApiResponse<typeof result.data>);

  } catch (error) {
    console.error(`Error creating ${req.params.type} entity:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create entity'
    } as ApiResponse<null>);
  }
});

// Get a specific entity
router.get('/:type/:id', validateEntityType, async (req: express.Request, res: express.Response) => {
  try {
    const { type, id } = req.params;

    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }

    // Get entity
    const result = await entityManager.getEntity(type as EntityType, id);

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: `${type} entity with id '${id}' not found`
        } as ApiResponse<null>);
      }
      
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve entity'
      } as ApiResponse<null>);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: `Retrieved ${type} entity with id '${id}'`
    } as ApiResponse<typeof result.data>);

  } catch (error) {
    console.error(`Error retrieving ${req.params.type} entity:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve entities'
    } as ApiResponse<null>);
  }
});

// Update an entity
router.put('/:type/:id', validateEntityType, async (req: express.Request, res: express.Response) => {
  try {
    const { type, id } = req.params;
    const { force = false } = req.query;
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain update data'
      } as ApiResponse<null>);
    }

    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }

    // Update entity
    const result = await entityManager.updateEntity(
      type as EntityType, 
      id, 
      updates, 
      force === 'true'
    );

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: `${type} entity with id '${id}' not found`
        } as ApiResponse<null>);
      }
      
      if (result.conflicts && result.conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Update conflicts detected',
          conflicts: result.conflicts
        } as ApiResponse<null>);
      }
      
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to update entity'
      } as ApiResponse<null>);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: `${type} entity with id '${id}' updated successfully`
    } as ApiResponse<typeof result.data>);

  } catch (error) {
    console.error(`Error updating ${req.params.type} entity:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update entity'
    } as ApiResponse<null>);
  }
});

// Delete an entity
router.delete('/:type/:id', validateEntityType, async (req: express.Request, res: express.Response) => {
  try {
    const { type, id } = req.params;

    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }

    // Delete entity
    const result = await entityManager.deleteEntity(type as EntityType, id);

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: `${type} entity with id '${id}' not found`
        } as ApiResponse<null>);
      }
      
      if (result.error?.includes('Cannot delete entity')) {
        return res.status(409).json({
          success: false,
          error: result.error
        } as ApiResponse<null>);
      }
      
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to delete entity'
      } as ApiResponse<null>);
    }

    res.status(200).json({
      success: true,
      message: `${type} entity with id '${id}' deleted successfully`
    } as ApiResponse<null>);

  } catch (error) {
    console.error(`Error deleting ${req.params.type} entity:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete entity'
    } as ApiResponse<null>);
  }
});

// Link entities (manage foreign key relationships)
router.post('/:sourceType/:sourceId/link/:targetType/:targetId', validateEntityType, async (req: express.Request, res: express.Response) => {
  try {
    const { sourceType, sourceId, targetType, targetId } = req.params;
    const { linkField } = req.body;

    if (!linkField || typeof linkField !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'linkField is required in request body'
      } as ApiResponse<null>);
    }

    // Validate target entity type
    if (!['shot', 'asset', 'task', 'member', 'user'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid target entity type. Must be one of: shot, asset, task, member, user'
      } as ApiResponse<null>);
    }

    // Validate connection to Google Sheets API
    const isConnected = await sheetsClient.validateConnection();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      } as ApiResponse<null>);
    }

    // Link entities
    const result = await entityManager.linkEntities(
      sourceType as EntityType,
      sourceId,
      targetType as EntityType,
      targetId,
      linkField
    );

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: result.error
        } as ApiResponse<null>);
      }
      
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to link entities'
      } as ApiResponse<null>);
    }

    res.status(200).json({
      success: true,
      message: `Successfully linked ${sourceType} '${sourceId}' to ${targetType} '${targetId}' via field '${linkField}'`
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Error linking entities:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link entities'
    } as ApiResponse<null>);
  }
});

export default router;