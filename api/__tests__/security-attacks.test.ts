import request from 'supertest';
import express from 'express';
import { securityMiddleware } from '../middleware/security';
import { sanitizeRequest } from '../middleware/sanitization';
import { validateRequest, ValidationSchemas } from '../middleware/validation';
import { defaultRateLimiter, authRateLimiter } from '../middleware/rateLimiting';

describe('Security Attack Vector Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    
    // Apply security middleware
    securityMiddleware.applySecurity(app);
    app.use(express.json({ limit: '10mb' }));
    app.use(sanitizeRequest);
    app.use(securityMiddleware.securityHeaders);
    app.use(securityMiddleware.auditLogger);
    
    // Test routes
    app.post('/api/test/validation', 
      validateRequest(ValidationSchemas.entity.create.shot),
      (req, res) => {
        res.json({ success: true, data: req.body });
      }
    );
    
    app.post('/api/test/sanitization', (req, res) => {
      res.json({ success: true, data: req.body });
    });
    
    app.get('/api/test/rate-limit', defaultRateLimiter, (req, res) => {
      res.json({ success: true, message: 'Rate limit test' });
    });
    
    app.post('/api/test/auth-rate-limit', authRateLimiter, (req, res) => {
      res.json({ success: true, message: 'Auth rate limit test' });
    });
    
    app.post('/api/test/size-limit', 
      securityMiddleware.requestSizeLimiter('1mb'),
      (req, res) => {
        res.json({ success: true, message: 'Size limit test' });
      }
    );
  });

  describe('XSS (Cross-Site Scripting) Protection', () => {
    it('should sanitize script tags in request body', async () => {
      const maliciousPayload = {
        title: '<script>alert("XSS")</script>Malicious Title',
        status: 'not_started'
      };

      const response = await request(app)
        .post('/api/test/sanitization')
        .send(maliciousPayload)
        .expect(200);

      expect(response.body.data.title).not.toContain('<script>');
      expect(response.body.data.title).toContain('&lt;script&gt;');
    });

    it('should sanitize HTML entities in nested objects', async () => {
      const maliciousPayload = {
        title: 'Normal Title',
        status: 'not_started',
        metadata: {
          description: '<img src="x" onerror="alert(1)">',
          tags: ['<script>evil()</script>', 'normal-tag']
        }
      };

      const response = await request(app)
        .post('/api/test/sanitization')
        .send(maliciousPayload)
        .expect(200);

      expect(response.body.data.metadata.description).not.toContain('<img');
      expect(response.body.data.metadata.tags[0]).not.toContain('<script>');
    });

    it('should handle various XSS payloads', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>',
        "';alert('XSS');//",
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/test/sanitization')
          .send({ title: payload, status: 'not_started' })
          .expect(200);

        // Should not contain dangerous characters
        expect(response.body.data.title).not.toContain('<script');
        expect(response.body.data.title).not.toContain('javascript:');
        expect(response.body.data.title).toContain('blocked:'); // Should be replaced
        expect(response.body.data.title).not.toContain('<img');
        expect(response.body.data.title).not.toContain('<svg');
        expect(response.body.data.title).not.toContain('<iframe');
      }
    });
  });

  describe('Prototype Pollution Protection', () => {
    it('should prevent __proto__ pollution', async () => {
      const maliciousPayload = {
        title: 'Normal Title',
        status: 'not_started',
        __proto__: {
          polluted: true
        }
      };

      const response = await request(app)
        .post('/api/test/sanitization')
        .send(maliciousPayload)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('__proto__');
      expect(response.body.data.polluted).toBeUndefined();
    });

    it('should prevent constructor pollution', async () => {
      const maliciousPayload = {
        title: 'Normal Title',
        status: 'not_started',
        constructor: {
          prototype: {
            polluted: true
          }
        }
      };

      const response = await request(app)
        .post('/api/test/sanitization')
        .send(maliciousPayload)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('constructor');
    });

    it('should prevent prototype pollution via nested objects', async () => {
      const maliciousPayload = {
        title: 'Normal Title',
        status: 'not_started',
        metadata: {
          __proto__: {
            polluted: true
          }
        }
      };

      const response = await request(app)
        .post('/api/test/sanitization')
        .send(maliciousPayload)
        .expect(200);

      expect(response.body.data.metadata).not.toHaveProperty('__proto__');
    });
  });

  describe('SQL Injection Protection (Input Validation)', () => {
    it('should reject SQL injection attempts in string fields', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/test/validation')
          .send({ title: payload, status: 'not_started' })
          .expect(200); // Should pass validation but be sanitized

        // Should be sanitized
        expect(response.body.data.title).not.toContain('DROP TABLE');
        expect(response.body.data.title).not.toContain('UNION SELECT');
        expect(response.body.data.title).not.toContain('INSERT INTO');
      }
    });
  });

  describe('NoSQL Injection Protection', () => {
    it('should handle NoSQL injection attempts', async () => {
      const noSqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'function() { return true; }' }
      ];

      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .post('/api/test/sanitization')
          .send({ title: payload, status: 'not_started' })
          .expect(200);

        // Should convert object to string and sanitize
        expect(typeof response.body.data.title).toBe('string');
      }
    });
  });

  describe('Rate Limiting Protection', () => {
    it('should enforce rate limits for rapid requests', async () => {
      const requests = Array(15).fill(null).map(() => 
        request(app).get('/api/test/rate-limit')
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should have stricter limits for auth endpoints', async () => {
      const requests = Array(15).fill(null).map(() => 
        request(app).post('/api/test/auth-rate-limit').send({})
      );

      const responses = await Promise.all(requests);
      
      // Should have more rate limited responses for auth endpoints
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Request Size Limiting', () => {
    it('should reject oversized requests', async () => {
      // Create a large payload (over 1MB)
      const largePayload = {
        title: 'A'.repeat(1024 * 1024 + 1), // 1MB + 1 byte
        status: 'not_started'
      };

      const response = await request(app)
        .post('/api/test/size-limit')
        .send(largePayload)
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request too large');
    });

    it('should allow normal-sized requests', async () => {
      const normalPayload = {
        title: 'Normal sized title',
        status: 'not_started'
      };

      const response = await request(app)
        .post('/api/test/size-limit')
        .send(normalPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Header Injection Protection', () => {
    it('should sanitize headers to prevent injection', async () => {
      const response = await request(app)
        .get('/api/test/rate-limit')
        .set('X-Custom-Header', 'normal-value\r\nInjected-Header: malicious')
        .expect(200);

      // Should not contain injected headers in response
      expect(response.headers['injected-header']).toBeUndefined();
    });
  });

  describe('Path Traversal Protection', () => {
    it('should handle path traversal attempts in parameters', async () => {
      // This would be handled by route validation in real scenarios
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const attempt of pathTraversalAttempts) {
        const response = await request(app)
          .post('/api/test/sanitization')
          .send({ title: attempt, status: 'not_started' })
          .expect(200);

        // Should be sanitized
        expect(response.body.data.title).not.toContain('../');
        expect(response.body.data.title).not.toContain('..\\');
      }
    });
  });

  describe('Command Injection Protection', () => {
    it('should sanitize command injection attempts', async () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '&& rm -rf /',
        '`whoami`',
        '$(id)',
        '; ping google.com'
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post('/api/test/sanitization')
          .send({ title: payload, status: 'not_started' })
          .expect(200);

        // Should be sanitized
        expect(response.body.data.title).not.toContain('ls -la');
        expect(response.body.data.title).not.toContain('cat /etc/passwd');
        expect(response.body.data.title).not.toContain('rm -rf');
        expect(response.body.data.title).not.toContain('whoami');
        expect(response.body.data.title).not.toContain('ping');
      }
    });
  });

  describe('LDAP Injection Protection', () => {
    it('should sanitize LDAP injection attempts', async () => {
      const ldapInjectionPayloads = [
        '*)(uid=*',
        '*)(|(uid=*))',
        '*)(&(uid=*)',
        '*))%00'
      ];

      for (const payload of ldapInjectionPayloads) {
        const response = await request(app)
          .post('/api/test/sanitization')
          .send({ title: payload, status: 'not_started' })
          .expect(200);

        // Should be sanitized (parentheses should be escaped)
        expect(response.body.data.title).not.toContain('*)(uid=*');
        expect(response.body.data.title).not.toContain('|(uid=*)');
      }
    });
  });

  describe('XML/XXE Injection Protection', () => {
    it('should handle XML injection attempts', async () => {
      const xmlPayloads = [
        '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
        '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>'
      ];

      for (const payload of xmlPayloads) {
        const response = await request(app)
          .post('/api/test/sanitization')
          .send({ title: payload, status: 'not_started' })
          .expect(200);

        // Should be sanitized
        expect(response.body.data.title).not.toContain('<!DOCTYPE');
        expect(response.body.data.title).not.toContain('<!ENTITY');
        expect(response.body.data.title).not.toContain('SYSTEM');
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/test/rate-limit')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('1.0.0');
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should remove server information headers', async () => {
      const response = await request(app)
        .get('/api/test/rate-limit')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Content Type Validation', () => {
    it('should handle invalid content types gracefully', async () => {
      const response = await request(app)
        .post('/api/test/sanitization')
        .set('Content-Type', 'application/xml')
        .send('<xml>test</xml>')
        .expect(400); // Should fail due to invalid JSON

      expect(response.status).toBe(400);
    });
  });
});