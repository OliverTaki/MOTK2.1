import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

/**
 * Security configuration for the API
 */
export const securityConfig = {
  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
  },
  
  // Helmet security headers configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'https://accounts.google.com', 'https://sheets.googleapis.com', 'https://drive.googleapis.com']
      }
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for Swagger UI
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }
};

/**
 * Apply security middleware to Express app
 */
export const applySecurity = (app: any) => {
  // Apply Helmet for security headers
  app.use(helmet(securityConfig.helmet));
  
  // Apply CORS
  app.use(cors(securityConfig.cors));
  
  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);
};

/**
 * Advanced rate limiting with different tiers
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later',
      message: 'Rate limit exceeded'
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: options.keyGenerator,
    skip: (req: Request) => {
      // Skip rate limiting for trusted internal services
      const trustedApiKeys = process.env.TRUSTED_API_KEYS?.split(',') || [];
      const apiKey = req.headers['x-api-key'] as string;
      return trustedApiKeys.includes(apiKey);
    }
  });
};

/**
 * Tiered rate limiting based on authentication status
 */
export const tieredRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;
  
  // Different limits based on authentication
  let limiter;
  
  if (apiKey) {
    // API key users get higher limits
    limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 1000, // 1000 requests per minute for API keys
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'API key rate limit exceeded',
        message: 'Rate limit exceeded'
      }
    });
  } else if (authHeader) {
    // Authenticated users get moderate limits
    limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 200, // 200 requests per minute for authenticated users
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'Authenticated user rate limit exceeded',
        message: 'Rate limit exceeded'
      }
    });
  } else {
    // Unauthenticated users get lower limits
    limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 50, // 50 requests per minute for unauthenticated users
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'Unauthenticated user rate limit exceeded',
        message: 'Rate limit exceeded'
      }
    });
  }
  
  limiter(req, res, next);
};

/**
 * IP-based blocking middleware for suspicious activity
 */
const blockedIPs = new Set<string>();
const suspiciousActivity = new Map<string, { count: number; lastActivity: Date }>();

export const ipSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || 'unknown';
  
  // Check if IP is blocked
  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address has been blocked due to suspicious activity'
    });
  }
  
  // Track suspicious activity patterns
  const now = new Date();
  const activity = suspiciousActivity.get(clientIP) || { count: 0, lastActivity: now };
  
  // Reset count if more than 1 hour has passed
  if (now.getTime() - activity.lastActivity.getTime() > 60 * 60 * 1000) {
    activity.count = 0;
  }
  
  // Increment activity count
  activity.count++;
  activity.lastActivity = now;
  suspiciousActivity.set(clientIP, activity);
  
  // Block IP if too many failed requests (will be implemented by error handler)
  if (activity.count > 100) {
    blockedIPs.add(clientIP);
    console.warn(`Blocked IP ${clientIP} due to excessive requests`);
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address has been blocked due to suspicious activity'
    });
  }
  
  next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          success: false,
          error: 'Request too large',
          message: `Request size exceeds maximum allowed size of ${maxSize}`
        });
      }
    }
    
    next();
  };
};

/**
 * Parse size string to bytes
 */
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
};

/**
 * Security headers middleware for API responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Request-ID', req.headers['x-request-id'] || generateRequestId());
  
  // Prevent caching of sensitive endpoints
  if (req.path.includes('/auth') || req.path.includes('/apikeys')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

/**
 * Generate unique request ID
 */
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Audit logging middleware for security events
 */
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log security-relevant requests
  const securityEndpoints = ['/auth', '/apikeys', '/admin'];
  const isSecurityEndpoint = securityEndpoints.some(endpoint => req.path.includes(endpoint));
  
  if (isSecurityEndpoint) {
    console.log(`[SECURITY] ${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.headers['user-agent']}`);
  }
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    // Log failed authentication attempts
    if (body && !body.success && req.path.includes('/auth')) {
      console.warn(`[SECURITY] Failed auth attempt - IP: ${req.ip} - Duration: ${duration}ms`);
    }
    
    // Log API key operations
    if (req.path.includes('/apikeys')) {
      console.log(`[SECURITY] API key operation - Method: ${req.method} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Export all security middleware as a bundle
 */
export const securityMiddleware = {
  applySecurity,
  createRateLimiter,
  tieredRateLimiter,
  ipSecurityMiddleware,
  requestSizeLimiter,
  securityHeaders,
  auditLogger
};