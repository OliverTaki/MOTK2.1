import express from 'express';
import { authenticate } from '../middleware/auth';
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
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const keys = listApiKeys(req.user.userId);
    
    res.json({
      success: true,
      data: keys,
      message: `Found ${keys.length} API keys`
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys'
    });
  }
});

/**
 * Create a new API key
 */
router.post('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const { name, permissions, expiresInDays } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'API key name is required'
      });
    }
    
    // Generate API key
    const apiKey = generateApiKey(
      req.user.userId,
      name,
      permissions || ['read'],
      expiresInDays !== undefined ? expiresInDays : 90
    );
    
    // Return the API key (only returned once at creation)
    res.status(201).json({
      success: true,
      data: apiKey,
      message: 'API key created successfully'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key'
    });
  }
});

/**
 * Delete an API key
 */
router.delete('/:keyOrId', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const { keyOrId } = req.params;
    
    // Find the key by ID or actual key value
    const keys = listApiKeys(req.user.userId);
    const keyToDelete = keys.find(key => key.id === keyOrId);
    
    if (!keyToDelete) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }
    
    // Delete the key using the actual key value (not ID)
    // We need to find the actual key value to delete it
    // This is a limitation of the current in-memory implementation
    const deleted = deleteApiKey(keyOrId); // Try with the parameter first
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete API key'
      });
    }
    
    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key'
    });
  }
});

/**
 * Validate an API key (for testing)
 */
router.post('/validate', authenticate, requireAdminPermission(), async (req, res) => {
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
    
    // Don't return the actual key
    const { key: _, ...keyData } = apiKey;
    
    res.json({
      success: true,
      data: keyData,
      message: 'API key is valid'
    });
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate API key'
    });
  }
});

export default router;