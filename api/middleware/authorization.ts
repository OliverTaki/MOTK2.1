/* ────────────────────────────────────────────────────────────────
   middleware/authorization.ts
────────────────────────────────────────────────────────────────── */
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/AuthService';
import { EntityType } from '../../shared/types';

/* --------------------------------------------------------------
 * Permission hierarchy
 * ------------------------------------------------------------ */
export enum PermissionLevel {
  VIEW = 'view',
  EDIT = 'edit',
  ADMIN = 'admin',
}

const rank: Record<PermissionLevel, number> = {
  [PermissionLevel.VIEW]: 1,
  [PermissionLevel.EDIT]: 2,
  [PermissionLevel.ADMIN]: 3,
};

function meetsRequired(
  userPerm: string,
  required: PermissionLevel
): boolean {
  return rank[userPerm as PermissionLevel] >= rank[required];
}

/* --------------------------------------------------------------
 * Types for authorize()
 * ------------------------------------------------------------ */
export interface AuthorizationOptions {
  projectId?: string;
  entityType?: EntityType;
  entityId?: string;
  requiredPermission: PermissionLevel;
}

/* --------------------------------------------------------------
 * Generic authorize factory
 * ------------------------------------------------------------ */
export function authorize(
  options: AuthorizationOptions
): (req: Request, res: Response, next: NextFunction) => Promise<Response | void> {
  /* inner guard function ------------- */
  const guard = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      /* 1) must be authenticated */
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      /* 2) resolve projectId */
      const projectId =
        options.projectId || req.params.projectId || req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      /* 3) project‑level permission */
      const userId = (req.user as any).user_id ?? (req.user as any).id;
      const userPerm = await authService.getUserProjectPermission(
        userId,
        projectId
      );

      if (!userPerm) {
        return res.status(403).json({ error: 'No access to this project' });
      }
      if (!meetsRequired(userPerm, options.requiredPermission)) {
        return res
          .status(403)
          .json({ error: `Requires ${options.requiredPermission} permission` });
      }

      /* 4) optional entity‑level check */
      if (options.entityType && options.entityId) {
        const ok = await authService.checkEntityAccess(
          userId,
          projectId,
          options.entityType,
          options.entityId
        );
        if (!ok) {
          return res
            .status(403)
            .json({ error: 'You do not have access to this entity' });
        }
      }

      /* expose for handlers */
      (req as any).userPermission = userPerm;
      return next(); /* ← 正常系でも必ず return */
    } catch (err: any) {
      console.error('Authorization error:', err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };

  /* outer function ALWAYS returns guard → TS7030 解消 */
  return guard;
}

/* --------------------------------------------------------------
 * Convenience helpers
 * ------------------------------------------------------------ */
export const requireViewPermission = (projectId?: string) =>
  authorize({ projectId, requiredPermission: PermissionLevel.VIEW });

export const requireEditPermission = (projectId?: string) =>
  authorize({ projectId, requiredPermission: PermissionLevel.EDIT });

export function requireAdminPermission(): (
  req: Request,
  res: Response,
  next: NextFunction
) => Response | void {
  const adminGuard = (
    req: Request,
    res: Response,
    next: NextFunction
  ): Response | void => {
    const role = (req.user as any)?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    return next();
  };
  return adminGuard;
}

/* --------------------------------------------------------------
 * Express augmentation
 * ------------------------------------------------------------ */
declare global {
  namespace Express {
    interface Request {
      /** e.g. 'view' | 'edit' | 'admin' after authorize() */
      userPermission?: string;
    }
  }
}
