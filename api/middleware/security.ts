import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

/** ------------------------------------------------------------------
 * 1. Global security configuration (CORS + Helmet)
 * -----------------------------------------------------------------*/
export const securityConfig = {
  cors: {
    origin:
      process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
      ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://sheets.googleapis.com',
          'https://drive.googleapis.com',
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  },
};

export const applySecurity = (app: any) => {
  app.use(helmet(securityConfig.helmet));
  app.use(cors(securityConfig.cors));
  app.set('trust proxy', 1);
};

/** ------------------------------------------------------------------
 * 2. Advanced rate‑limiter factory
 * -----------------------------------------------------------------*/
export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) {
  const limiter = rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: opts.message || 'Too many requests, please try again later',
      message: 'Rate limit exceeded',
    },
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? false,
    skipFailedRequests: opts.skipFailedRequests ?? false,
    keyGenerator: opts.keyGenerator,
    skip(req) {
      const trusted = process.env.TRUSTED_API_KEYS?.split(',') || [];
      const key = req.headers['x-api-key'] as string;
      return trusted.includes(key);
    },
  });

  // wrap so the outer function returns a guard (Response | void)
  return function rateLimiterGuard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Response | void {
    return limiter(req, res, next);
  };
}

/* ------------------------------------------------------------------
 * 3. Tiered limiter (static instances)
 * -----------------------------------------------------------------*/
// ❶ 事前に limiter を作成
const apiKeyLimiter = rateLimit({
  windowMs: 60_000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'API‑key rate limit exceeded', message: 'Rate limit exceeded' },
});

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Auth rate limit exceeded', message: 'Rate limit exceeded' },
});

const anonLimiter = rateLimit({
  windowMs: 60_000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Unauth rate limit exceeded', message: 'Rate limit exceeded' },
});

// ❷ 毎リクエストでは「どの limiter を使うか」だけ判断
export const tieredRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const auth   = req.headers.authorization;

  if (apiKey)     return apiKeyLimiter(req, res, next);
  if (auth)       return authLimiter(req, res, next);
  /* else */       return anonLimiter(req, res, next);
};


/** ------------------------------------------------------------------
 * 4. IP‑based blocking / tracking
 * -----------------------------------------------------------------*/
const blockedIPs = new Set<string>();
const suspicious = new Map<string, { count: number; last: Date }>();

export function ipSecurityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  const ip = req.ip || 'unknown';

  if (blockedIPs.has(ip)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address has been blocked due to suspicious activity',
    });
  }

  const now = new Date();
  const record = suspicious.get(ip) || { count: 0, last: now };
  if (now.getTime() - record.last.getTime() > 3_600_000) record.count = 0; // reset after 1h
  record.count += 1;
  record.last = now;
  suspicious.set(ip, record);

  if (record.count > 100) {
    blockedIPs.add(ip);
    console.warn(`[SECURITY] Blocked IP ${ip}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address has been blocked due to suspicious activity',
    });
  }

  return next(); // success path
}

/** ------------------------------------------------------------------
 * 5. Request‑size limiter
 * -----------------------------------------------------------------*/
export function requestSizeLimiter(max: string = '10mb') {
  const maxBytes = parseSize(max);
  return function sizeGuard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Response | void {
    const len = req.headers['content-length'];
    if (len && parseInt(len, 10) > maxBytes) {
      return res.status(413).json({
        success: false,
        error: 'Request too large',
        message: `Request size exceeds ${max}`,
      });
    }
    return next();
  };
}

function parseSize(str: string): number {
  const units: Record<string, number> = { b: 1, kb: 1024, mb: 1_048_576, gb: 1_073_741_824 };
  const match = str.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) throw new Error(`Invalid size format: ${str}`);
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  return Math.floor(value * units[unit]);
}

/** ------------------------------------------------------------------
 * 6. Security headers & audit logger
 * -----------------------------------------------------------------*/
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Request-ID', req.headers['x-request-id'] || generateRequestId());

  if (req.path.includes('/auth') || req.path.includes('/apikeys')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
};

export const auditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  const sensitive = ['/auth', '/apikeys', '/admin'];
  const isSensitive = sensitive.some((p) => req.path.includes(p));
  if (isSensitive) {
    console.log(`[SECURITY] ${req.method} ${req.path} – IP: ${req.ip}`);
  }

  const original = res.json.bind(res);
  res.json = (body: any) => {
    const duration = Date.now() - start;
    if (body && !body.success && req.path.includes('/auth')) {
      console.warn(`[SECURITY] Failed auth – IP: ${req.ip} – ${duration}ms`);
    }
    if (req.path.includes('/apikeys')) {
      console.log(
        `[SECURITY] API key op – ${req.method} – ${res.statusCode} – ${duration}ms`
      );
    }
    return original(body);
  };

  next();
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** ------------------------------------------------------------------
 * 7. Bundle export
 * -----------------------------------------------------------------*/
export const securityMiddleware = {
  applySecurity,
  createRateLimiter,
  tieredRateLimiter,
  ipSecurityMiddleware,
  requestSizeLimiter,
  securityHeaders,
  auditLogger,
};