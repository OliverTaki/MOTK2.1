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
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN'
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

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
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
export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionData = req.body.session || req.headers['x-session-data'];
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        error: 'Session data required',
        code: 'NO_SESSION'
      });
    }

    const sessionObj = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    const validation = await authenticationService.validateSession(sessionObj);

    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION'
      });
    }

    // Set user context
    if (validation.user) {
      req.user = {
        userId: validation.user.id,
        email: validation.user.email,
        name: validation.user.name
      };
    }

    // If tokens were refreshed, include them in response
    if (validation.newTokens) {
      res.locals.newTokens = validation.newTokens;
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(401).json({
      success: false,
      error: 'Session validation failed',
      code: 'SESSION_ERROR'
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    // For now, we'll implement basic role checking
    // In a full implementation, you'd check user roles from database
    const userRoles = ['user']; // Default role
    
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: userRoles
      });
    }

    next();
  };
};

/**
 * Admin authorization middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Error handler for authentication errors
 */
export const authErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  next(error);
};