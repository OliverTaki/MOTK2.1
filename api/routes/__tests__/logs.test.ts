import request from 'supertest';
import express from 'express';
import logsRouter from '../logs';

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Mock authenticated user
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User'
    };
    next();
  }
}));

describe('Logs API Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/logs/error', () => {
    it('accepts valid error logs', async () => {
      const response = await request(app)
        .post('/api/logs/error')
        .send({
          errors: [
            {
              error: {
                name: 'Error',
                message: 'Test error',
                stack: 'Error: Test error\n    at function (file.js:1:1)'
              },
              type: 'api_error',
              timestamp: new Date().toISOString(),
              userInfo: {
                userId: 'user123',
                username: 'testuser'
              }
            }
          ]
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(console.error).toHaveBeenCalled();
    });

    it('rejects invalid request format', async () => {
      const response = await request(app)
        .post('/api/logs/error')
        .send({
          errors: 'not an array'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid request format. Expected array of errors.'
      });
    });

    it('handles multiple error logs', async () => {
      const response = await request(app)
        .post('/api/logs/error')
        .send({
          errors: [
            {
              error: {
                name: 'Error',
                message: 'Test error 1',
                stack: 'Error: Test error 1\n    at function (file.js:1:1)'
              },
              type: 'api_error',
              timestamp: new Date().toISOString()
            },
            {
              error: {
                name: 'TypeError',
                message: 'Test error 2',
                stack: 'TypeError: Test error 2\n    at function (file.js:2:2)'
              },
              type: 'unhandled_error',
              timestamp: new Date().toISOString()
            }
          ]
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(console.error).toHaveBeenCalled();
    });

    it('handles server errors', async () => {
      // Mock console.error to throw an error
      (console.error as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Simulated server error');
      });
      
      const response = await request(app)
        .post('/api/logs/error')
        .send({
          errors: [
            {
              error: {
                name: 'Error',
                message: 'Test error',
                stack: 'Error: Test error\n    at function (file.js:1:1)'
              },
              type: 'api_error',
              timestamp: new Date().toISOString()
            }
          ]
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to log errors'
      });
    });
  });
});