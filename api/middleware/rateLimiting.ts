import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Default rate limiter configuration
 * Limits to 100 requests per minute per IP
 */
export const defaultRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    message: 'Rate limit exceeded'
  },
  // Skip rate limiting for trusted sources (e.g., internal services)
  skip: (req: Request) => {
    // Example: Skip rate limiting for internal API calls with a specific header
    const apiKey = req.headers['x-api-key'];
    if (apiKey && process.env.TRUSTED_API_KEYS) {
      const trustedKeys = process.env.TRUSTED_API_KEYS.split(',');
      return trustedKeys.includes(apiKey as string);
    }
    return false;
  }
});

/**
 * Stricter rate limiter for authentication endpoints
 * Limits to 10 requests per minute per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    message: 'Rate limit exceeded'
  }
});

/**
 * Rate limiter for file upload endpoints
 * Limits to 20 requests per minute per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many file upload requests, please try again later',
    message: 'Rate limit exceeded'
  }
});

/**
 * Rate limiter for API key creation/management
 * Limits to 5 requests per minute per IP
 */
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many API key management requests, please try again later',
    message: 'Rate limit exceeded'
  }
});