import { Request, Response, NextFunction } from 'express';
import { authenticationService } from '../services/auth/AuthenticationService';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        name: string;
      };
    }
  }
}

/**
 * Authentication middleware - Verifies JWT token and sets user context
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }

    // Verify JWT token
    const decoded = authenticationService.verifyJwtToken(token);
    
    // Set user context
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name
    };

    return next(); // ★ 必ず return
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Optional authentication middleware - Sets user context if token is present
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = authenticationService.verifyJwtToken(token);
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name
        };
      } catch (error) {
        // Token is invalid but we don't fail the request
        console.warn('Optional auth token invalid:', error);
      }
    }

    next();
  } catch (error) {
    // Don't fail the request for optional auth
    next();
  }
};

/**
 * Session validation middleware - Validates and refreshes session if needed
 */
export const validateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const sessionData = req.body.session || req.headers['x-session-data'];

    if (!sessionData) {
      return res.status(401).json({
        error: 'Session data required'
      });
    }

    const sessionObj = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    const validation = await authenticationService.validateSession(sessionObj);

    if (!validation.valid) {
      return res.status(401).json({
        error: 'Invalid or expired session'
      });
    }

    // Set user context
    if (validation.user) {
      req.user = {
        userId: validation.user.id,
        email: validation.user.email,
        name: validation.user.name ?? '', // ← fallback
      };
    }

    if (validation.newTokens) {
      res.locals.newTokens = validation.newTokens;
    }

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid session' });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = ['user']; // Default role
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next(); // ★ 必ず return
  };
};

/**
 * Admin authorization middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Error handler for authentication errors
 */
export const authErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  return res.status(401).json({ error: error.message || 'Auth error' });
};