import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Interface for API key data
 */
interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  permissions: string[];
  lastUsed?: Date;
}

/**
 * In-memory store for API keys (in production, use a database)
 */
const apiKeys: Map<string, ApiKey> = new Map();

/**
 * Generate a new API key
 * @param userId User ID of the creator
 * @param name Name/description of the API key
 * @param permissions Array of permissions for this key
 * @param expiresInDays Number of days until expiration (null for no expiration)
 * @returns The generated API key data
 */
export const generateApiKey = (
  userId: string,
  name: string,
  permissions: string[] = ['read'],
  expiresInDays: number | null = 90
): ApiKey => {
  // Generate a random key
  const keyBuffer = crypto.randomBytes(32);
  const key = keyBuffer.toString('hex');
  
  // Generate a key ID (shorter, for reference)
  const id = `key_${crypto.randomBytes(8).toString('hex')}`;
  
  // Calculate expiration date
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) 
    : null;
  
  // Create API key object
  const apiKey: ApiKey = {
    id,
    key,
    name,
    createdBy: userId,
    createdAt: new Date(),
    expiresAt,
    permissions
  };
  
  // Store the API key
  apiKeys.set(key, apiKey);
  
  return apiKey;
};

/**
 * Validate an API key
 * @param key The API key to validate
 * @returns The API key data if valid, null otherwise
 */
export const validateApiKey = (key: string): ApiKey | null => {
  if (!key || !apiKeys.has(key)) {
    return null;
  }
  
  const apiKey = apiKeys.get(key)!;
  
  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }
  
  // Update last used timestamp
  apiKey.lastUsed = new Date();
  
  return apiKey;
};

/**
 * Delete an API key
 * @param key The API key to delete
 * @returns True if deleted, false if not found
 */
export const deleteApiKey = (key: string): boolean => {
  return apiKeys.delete(key);
};

/**
 * List all API keys for a user
 * @param userId User ID
 * @returns Array of API keys (without the actual key value)
 */
export const listApiKeys = (userId: string): Omit<ApiKey, 'key'>[] => {
  return Array.from(apiKeys.values())
    .filter(apiKey => apiKey.createdBy === userId)
    .map(({ key, ...rest }) => rest);
};

/**
 * Middleware to authenticate requests using API key
 * @param requiredPermissions Array of permissions required for the endpoint
 */
export const requireApiKey = (requiredPermissions: string[] = ['read']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required',
        message: 'Please provide an API key in the X-API-Key header'
      });
    }
    
    // Validate API key
    const keyData = validateApiKey(apiKey);
    
    if (!keyData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key',
        message: 'The provided API key is invalid or has expired'
      });
    }
    
    // Check permissions
    const hasRequiredPermissions = requiredPermissions.every(
      permission => keyData.permissions.includes(permission)
    );
    
    if (!hasRequiredPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'The API key does not have the required permissions for this operation'
      });
    }
    
    // Attach API key data to request
    req.apiKey = keyData;
    
    next();
  };
};

// Extend Express Request type to include API key
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}