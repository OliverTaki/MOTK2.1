import express from 'express';
import { authenticateToken as authMiddleware } from '../middleware/auth'; // ← 修正
import { requireAdminPermission } from '../middleware/authorization';
import { 
  generateApiKey, 
  validateApiKey, 
  deleteApiKey, 
  listApiKeys 
} from '../middleware/apiKey';

const router = express.Router();

/**
 * List all API keys for the authenticated user
 */
router.get(
  '/',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      const keys = listApiKeys(req.user.userId);
      return res.json({
        success: true,
        data: keys,
        message: `Found ${keys.length} API keys`
      });
    } catch (error: any) {
      console.error('Error listing API keys:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to list API keys'
      });
    }
  }
);

/**
 * Create a new API key
 */
router.post(
  '/',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      const { name, permissions, expiresInDays } = req.body;
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'API key name is required'
        });
      }
      const apiKey = generateApiKey(
        req.user.userId,
        name,
        permissions || ['read'],
        expiresInDays !== undefined ? expiresInDays : 90
      );
      return res.status(201).json({
        success: true,
        data: apiKey,
        message: 'API key created successfully'
      });
    } catch (error: any) {
      console.error('Error creating API key:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create API key'
      });
    }
  }
);

/**
 * Delete an API key
 */
router.delete(
  '/:keyOrId',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      const { keyOrId } = req.params;
      const keys = listApiKeys(req.user.userId);
      const keyToDelete = keys.find(key => key.id === keyOrId);
      if (!keyToDelete) {
        return res.status(404).json({
          success: false,
          error: 'API key not found'
        });
      }
      const deleted = deleteApiKey(keyOrId);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Failed to delete API key'
        });
      }
      return res.json({
        success: true,
        message: 'API key deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete API key'
      });
    }
  }
);

/**
 * Validate an API key (for testing)
 */
router.post(
  '/validate',
  authMiddleware,
  requireAdminPermission(),
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { key } = req.body;
      if (!key) {
        return res.status(400).json({
          success: false,
          error: 'API key is required'
        });
      }
      const apiKey = validateApiKey(key);
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired API key'
        });
      }
      const { key: _, ...keyData } = apiKey;
      return res.json({
        success: true,
        data: keyData,
        message: 'API key is valid'
      });
    } catch (error: any) {
      console.error('Error validating API key:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate API key'
      });
    }
  }
);

export default router;