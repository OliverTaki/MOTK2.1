import { Request, Response, NextFunction } from 'express';
import {
  createRateLimiter,
  tieredRateLimiter,
  ipSecurityMiddleware,
  requestSizeLimiter,
  securityHeaders,
  auditLogger
} from '../security';

describe('Security Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
      path: '/api/test'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      removeHeader: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter with specified options', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 100,
        message: 'Custom rate limit message'
      });

      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should use API key as identifier when available', () => {
      mockRequest.headers = { 'x-api-key': 'test_api_key' };
      
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 100,
        keyGenerator: (req: Request) => {
          const apiKey = req.headers['x-api-key'] as string;
          return apiKey ? `api_key:${apiKey}` : req.ip || 'unknown';
        }
      });

      expect(limiter).toBeDefined();
    });
  });

  describe('tieredRateLimiter', () => {
    it('should apply different limits based on authentication', async () => {
      // Test with API key
      mockRequest.headers = { 'x-api-key': 'test_api_key' };
      await new Promise<void>((resolve) => {
        const nextWrapper = () => {
          mockNext();
          resolve();
        };
        tieredRateLimiter(mockRequest as Request, mockResponse as Response, nextWrapper);
      });
      
      // Test with auth header
      mockRequest.headers = { authorization: 'Bearer token' };
      await new Promise<void>((resolve) => {
        const nextWrapper = () => {
          mockNext();
          resolve();
        };
        tieredRateLimiter(mockRequest as Request, mockResponse as Response, nextWrapper);
      });
      
      // Test without authentication
      mockRequest.headers = {};
      await new Promise<void>((resolve) => {
        const nextWrapper = () => {
          mockNext();
          resolve();
        };
        tieredRateLimiter(mockRequest as Request, mockResponse as Response, nextWrapper);
      });
      
      // Should have been called 3 times (once for each test)
      expect(mockNext).toHaveBeenCalledTimes(3);
    });
  });

  describe('ipSecurityMiddleware', () => {
    it('should allow normal requests', () => {
      ipSecurityMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should track suspicious activity', () => {
      // Make multiple requests from same IP
      for (let i = 0; i < 5; i++) {
        ipSecurityMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }
      
      expect(mockNext).toHaveBeenCalledTimes(5);
    });

    it('should handle unknown IP addresses', () => {
      const reqWithoutIp = { ...mockRequest, ip: undefined };
      
      ipSecurityMiddleware(reqWithoutIp as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requestSizeLimiter', () => {
    it('should allow requests within size limit', () => {
      mockRequest.headers = { 'content-length': '1000' }; // 1KB
      
      const limiter = requestSizeLimiter('10mb');
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding size limit', () => {
      mockRequest.headers = { 'content-length': '20971520' }; // 20MB
      
      const limiter = requestSizeLimiter('10mb');
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request too large',
        message: 'Request size exceeds maximum allowed size of 10mb'
      });
    });

    it('should handle requests without content-length header', () => {
      mockRequest.headers = {};
      
      const limiter = requestSizeLimiter('10mb');
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should parse different size units correctly', () => {
      // Test with bytes
      mockRequest.headers = { 'content-length': '500' };
      let limiter = requestSizeLimiter('1kb');
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Reset mocks
      mockNext.mockClear();
      mockResponse.status = jest.fn().mockReturnThis();

      // Test with KB
      mockRequest.headers = { 'content-length': '2048' }; // 2KB
      limiter = requestSizeLimiter('1kb');
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(413);
    });
  });

  describe('securityHeaders', () => {
    it('should add security headers to response', () => {
      mockRequest.headers = {};
      
      securityHeaders(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', '1.0.0');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should add no-cache headers for sensitive endpoints', () => {
      const reqWithAuthPath = { ...mockRequest, path: '/api/auth/login' };
      
      securityHeaders(reqWithAuthPath as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Expires', '0');
    });

    it('should use existing request ID if provided', () => {
      mockRequest.headers = { 'x-request-id': 'existing-request-id' };
      
      securityHeaders(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-request-id');
    });
  });

  describe('auditLogger', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log security-relevant requests', () => {
      const reqWithAuthPath = { 
        ...mockRequest, 
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'user-agent': 'test-agent' }
      };
      
      auditLogger(reqWithAuthPath as Request, mockResponse as Response, mockNext);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] POST /api/auth/login')
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not log non-security requests', () => {
      const reqWithSheetsPath = { 
        ...mockRequest, 
        path: '/api/sheets/Shots',
        method: 'GET'
      };
      
      auditLogger(reqWithSheetsPath as Request, mockResponse as Response, mockNext);
      
      expect(console.log).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should override res.json to log responses', () => {
      const reqWithAuthPath = { ...mockRequest, path: '/api/auth/login' };
      const originalJson = jest.fn();
      mockResponse.json = originalJson;
      
      auditLogger(reqWithAuthPath as Request, mockResponse as Response, mockNext);
      
      // Verify that res.json was overridden
      expect(mockResponse.json).not.toBe(originalJson);
      expect(typeof mockResponse.json).toBe('function');
    });

    it('should log failed authentication attempts', () => {
      const reqWithAuthPath = { ...mockRequest, path: '/api/auth/login' };
      const originalJson = jest.fn();
      mockResponse.json = originalJson;
      
      auditLogger(reqWithAuthPath as Request, mockResponse as Response, mockNext);
      
      // Simulate failed auth response
      const failedResponse = { success: false, error: 'Invalid credentials' };
      (mockResponse.json as jest.Mock)(failedResponse);
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] Failed auth attempt')
      );
    });

    it('should log API key operations', () => {
      const reqWithApiKeysPath = { 
        ...mockRequest, 
        path: '/api/apikeys',
        method: 'POST'
      };
      mockResponse.statusCode = 201;
      const originalJson = jest.fn();
      mockResponse.json = originalJson;
      
      auditLogger(reqWithApiKeysPath as Request, mockResponse as Response, mockNext);
      
      // Simulate API key creation response
      const successResponse = { success: true, data: { id: 'key_123' } };
      (mockResponse.json as jest.Mock)(successResponse);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] API key operation - Method: POST - Status: 201')
      );
    });
  });

  describe('Size parsing utility', () => {
    // Test the parseSize function indirectly through requestSizeLimiter
    it('should handle different size formats', () => {
      const testCases = [
        { input: '1kb', contentLength: '1024', shouldPass: true },
        { input: '1mb', contentLength: '1048576', shouldPass: true },
        { input: '1gb', contentLength: '1073741824', shouldPass: true },
        { input: '500b', contentLength: '500', shouldPass: true },
        { input: '1.5mb', contentLength: '1572864', shouldPass: true }
      ];

      testCases.forEach(({ input, contentLength, shouldPass }) => {
        mockRequest.headers = { 'content-length': contentLength };
        mockNext.mockClear();
        (mockResponse.status as jest.Mock).mockClear().mockReturnThis();
        
        const limiter = requestSizeLimiter(input);
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
        
        if (shouldPass) {
          expect(mockNext).toHaveBeenCalled();
        } else {
          expect(mockResponse.status).toHaveBeenCalledWith(413);
        }
      });
    });
  });
});