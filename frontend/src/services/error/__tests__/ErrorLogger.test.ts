import { ErrorLogger, ErrorLogEntry } from '../ErrorLogger';

describe('ErrorLogger', () => {
  // Mock fetch for testing API calls
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;
  
  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    global.fetch = mockFetch;
    
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('creates an instance with default options', () => {
    const logger = new ErrorLogger();
    
    expect(logger).toBeInstanceOf(ErrorLogger);
  });

  it('logs errors to console when consoleOutput is true', () => {
    const logger = new ErrorLogger({ consoleOutput: true });
    const error = new Error('Test error');
    
    logger.logError({
      error,
      type: 'unhandled_error'
    });
    
    expect(console.error).toHaveBeenCalledWith(
      '[ErrorLogger] unhandled_error:',
      error,
      '',
      ''
    );
  });

  it('does not log to console when consoleOutput is false', () => {
    const logger = new ErrorLogger({ consoleOutput: false });
    const error = new Error('Test error');
    
    logger.logError({
      error,
      type: 'unhandled_error'
    });
    
    expect(console.error).not.toHaveBeenCalled();
  });

  it('sends errors to the server', async () => {
    const logger = new ErrorLogger({
      apiEndpoint: '/api/logs/error',
      environment: 'production'
    });
    
    const error = new Error('Test error');
    
    logger.logError({
      error,
      type: 'api_error',
      context: { additionalInfo: 'test' }
    });
    
    // Wait for the async queue processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/logs/error',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.any(String)
      })
    );
    
    // Check that the error was properly formatted in the request body
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.errors).toBeInstanceOf(Array);
    expect(requestBody.errors[0]).toMatchObject({
      type: 'api_error',
      context: { additionalInfo: 'test' },
      error: {
        name: 'Error',
        message: 'Test error'
      }
    });
  });

  it('retries failed server requests', async () => {
    // Mock fetch to fail on first call, succeed on second
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    
    const logger = new ErrorLogger({
      apiEndpoint: '/api/logs/error',
      environment: 'production',
      maxRetries: 3
    });
    
    logger.logError({
      error: new Error('Test error'),
      type: 'network_error'
    });
    
    // Wait for retry logic
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Should have been called twice (initial + 1 retry)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('updates user information', () => {
    const logger = new ErrorLogger();
    
    logger.setUserInfo('user123', 'testuser');
    
    const error = new Error('Test error');
    
    logger.logError({
      error,
      type: 'auth_error'
    });
    
    // Wait for the async queue processing
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(mockFetch).toHaveBeenCalled();
        
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(requestBody.errors[0].userInfo).toEqual({
          userId: 'user123',
          username: 'testuser'
        });
        
        resolve();
      }, 100);
    });
  });

  it('clears user information', () => {
    const logger = new ErrorLogger();
    
    logger.setUserInfo('user123', 'testuser');
    logger.clearUserInfo();
    
    const error = new Error('Test error');
    
    logger.logError({
      error,
      type: 'auth_error'
    });
    
    // Wait for the async queue processing
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(mockFetch).toHaveBeenCalled();
        
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(requestBody.errors[0].userInfo).toEqual({
          userId: undefined,
          username: undefined
        });
        
        resolve();
      }, 100);
    });
  });

  it('handles global unhandled errors', () => {
    const logger = new ErrorLogger();
    
    // Spy on logError method
    const logErrorSpy = jest.spyOn(logger, 'logError');
    
    // Simulate an unhandled error
    const errorEvent = new ErrorEvent('error', {
      error: new Error('Unhandled error'),
      message: 'Unhandled error',
      filename: 'test.js',
      lineno: 10,
      colno: 20
    });
    
    // Dispatch the error event
    window.dispatchEvent(errorEvent);
    
    expect(logErrorSpy).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(Error),
      type: 'unhandled_error',
      context: expect.objectContaining({
        message: 'Unhandled error',
        filename: 'test.js',
        lineno: 10,
        colno: 20
      })
    }));
  });

  it('handles unhandled promise rejections', () => {
    const logger = new ErrorLogger();
    
    // Spy on logError method
    const logErrorSpy = jest.spyOn(logger, 'logError');
    
    // Simulate an unhandled promise rejection
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.reject(new Error('Promise rejection')),
      reason: new Error('Promise rejection')
    });
    
    // Dispatch the rejection event
    window.dispatchEvent(rejectionEvent);
    
    expect(logErrorSpy).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(Error),
      type: 'unhandled_error',
      context: expect.objectContaining({
        reason: expect.any(Error)
      })
    }));
  });
});