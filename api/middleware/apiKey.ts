import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/* ---------------------------------------------------------------
 * Local types
 * ------------------------------------------------------------- */
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

/* ---------------------------------------------------------------
 * In‑memory key store (replace with DB in production)
 * ------------------------------------------------------------- */
const apiKeys: Map<string, ApiKey> = new Map();

/* ---------------------------------------------------------------
 * CRUD helpers
 * ------------------------------------------------------------- */
export const generateApiKey = (
  userId: string,
  name: string,
  permissions: string[] = ['read'],
  expiresInDays: number | null = 90
): ApiKey => {
  const key = crypto.randomBytes(32).toString('hex');
  const id = `key_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey: ApiKey = {
    id,
    key,
    name,
    createdBy: userId,
    createdAt: new Date(),
    expiresAt,
    permissions,
  };

  apiKeys.set(key, apiKey);
  return apiKey;
};

export const validateApiKey = (key: string): ApiKey | null => {
  if (!key || !apiKeys.has(key)) return null;

  const data = apiKeys.get(key)!;
  if (data.expiresAt && data.expiresAt < new Date()) return null;

  data.lastUsed = new Date();
  return data;
};

export const deleteApiKey = (key: string): boolean => apiKeys.delete(key);

export const listApiKeys = (userId: string): Omit<ApiKey, 'key'>[] =>
  Array.from(apiKeys.values())
    .filter((k) => k.createdBy === userId)
    .map(({ key, ...rest }) => rest);

/* ---------------------------------------------------------------
 * Middleware factory
 * ------------------------------------------------------------- */
export function requireApiKey(
  requiredPermissions: string[] = ['read']
): (req: Request, res: Response, next: NextFunction) => Response | void {
  /* inner guard – every path returns Response | void */
  function apiKeyGuard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Response | void {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required',
        message: 'Provide key in X-API-Key header',
      });
    }

    const keyData = validateApiKey(apiKey);
    if (!keyData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key',
        message: 'The provided API key is invalid or has expired',
      });
    }

    const ok = requiredPermissions.every((p) =>
      keyData.permissions.includes(p)
    );
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message:
          'The API key does not have the required permissions for this operation',
      });
    }

    (req as any).apiKey = keyData; // attach for downstream handlers
    return next(); // <- success path must return
  }

  /* outer function always returns guard – satisfies TS7030 */
  return apiKeyGuard;
}

/* ---------------------------------------------------------------
 * Express augmentation
 * ------------------------------------------------------------- */
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}
