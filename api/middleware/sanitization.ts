import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize request body to prevent common security issues
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip sanitization for file uploads
    if (req.is('multipart/form-data')) {
      return next();
    }
    
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    next();
  } catch (error) {
    console.error('Error sanitizing request:', error);
    next();
  }
};

/**
 * Recursively sanitize an object
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys to prevent prototype pollution
      const sanitizedKey = sanitizeString(key);
      
      // Skip dangerous keys
      if (sanitizedKey === '__proto__' || sanitizedKey === 'constructor' || sanitizedKey === 'prototype') {
        continue;
      }
      
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
};

/**
 * Sanitize a string to prevent XSS attacks and other injection attempts
 * @param str String to sanitize
 * @returns Sanitized string
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Remove or neutralize dangerous patterns
  let sanitized = str
    // XSS protection - replace HTML/XML characters
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;')
    
    // Remove javascript: protocol
    .replace(/javascript:/gi, 'blocked:')
    
    // Remove common SQL injection patterns
    .replace(/(\bDROP\s+TABLE\b)/gi, 'BLOCKED_SQL')
    .replace(/(\bUNION\s+SELECT\b)/gi, 'BLOCKED_SQL')
    .replace(/(\bINSERT\s+INTO\b)/gi, 'BLOCKED_SQL')
    .replace(/(\bDELETE\s+FROM\b)/gi, 'BLOCKED_SQL')
    
    // Remove command injection patterns
    .replace(/;\s*(ls|cat|rm|ping|whoami|id)\b/gi, '; BLOCKED_CMD')
    .replace(/\|\s*(cat|rm|ping|whoami|id)\b/gi, '| BLOCKED_CMD')
    .replace(/&&\s*(rm|ping|whoami|id)\b/gi, '&& BLOCKED_CMD')
    
    // Remove LDAP injection patterns
    .replace(/\*\)\(uid=\*/gi, 'BLOCKED_LDAP')
    .replace(/\*\)\(\|\(uid=\*\)\)/gi, 'BLOCKED_LDAP')
    
    // Remove XML/XXE patterns
    .replace(/<!DOCTYPE/gi, '&lt;!BLOCKED_XML')
    .replace(/<!ENTITY/gi, '&lt;!BLOCKED_XML')
    .replace(/SYSTEM\s+["'][^"']*["']/gi, 'BLOCKED_SYSTEM');
  
  return sanitized;
};