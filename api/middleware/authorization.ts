import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/AuthService';
import { EntityType, ProjectMember } from '../../shared/types';

/**
 * Permission levels in order of increasing access
 */
export enum PermissionLevel {
  VIEW = 'view',
  EDIT = 'edit',
  ADMIN = 'admin'
}

/**
 * Interface for authorization options
 */
export interface AuthorizationOptions {
  projectId?: string;
  entityType?: EntityType;
  entityId?: string;
  requiredPermission: PermissionLevel;
}

/**
 * Check if a permission level meets or exceeds the required level
 */
export function hasPermission(userPermission: string, requiredPermission: PermissionLevel): boolean {
  const permissionHierarchy = {
    [PermissionLevel.VIEW]: 1,
    [PermissionLevel.EDIT]: 2,
    [PermissionLevel.ADMIN]: 3
  };

  return permissionHierarchy[userPermission as PermissionLevel] >= permissionHierarchy[requiredPermission];
}

/**
 * Authorization middleware to check user permissions
 */
export const authorize = (options: AuthorizationOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get project ID from options or request parameters
      const projectId = options.projectId || req.params.projectId || req.body.projectId;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Get user's permission for this project
      const userPermission = await authService.getUserProjectPermission(req.user.userId, projectId);
      
      if (!userPermission) {
        return res.status(403).json({ error: 'You do not have access to this project' });
      }

      // Check if user has required permission level
      if (!hasPermission(userPermission, options.requiredPermission)) {
        return res.status(403).json({ 
          error: `This action requires ${options.requiredPermission} permission` 
        });
      }

      // If entity-specific check is required
      if (options.entityType && options.entityId) {
        const hasEntityAccess = await authService.checkEntityAccess(
          req.user.userId,
          projectId,
          options.entityType,
          options.entityId
        );

        if (!hasEntityAccess) {
          return res.status(403).json({ error: 'You do not have access to this entity' });
        }
      }

      // Attach permission level to request for potential use in route handlers
      req.userPermission = userPermission;
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// Convenience middleware factories for common permission levels
export const requireViewPermission = (projectId?: string) => 
  authorize({ projectId, requiredPermission: PermissionLevel.VIEW });

export const requireEditPermission = (projectId?: string) => 
  authorize({ projectId, requiredPermission: PermissionLevel.EDIT });

export const requireAdminPermission = (projectId?: string) => 
  authorize({ projectId, requiredPermission: PermissionLevel.ADMIN });

// Extend Express Request type to include user permission
declare global {
  namespace Express {
    interface Request {
      userPermission?: string;
    }
  }
}