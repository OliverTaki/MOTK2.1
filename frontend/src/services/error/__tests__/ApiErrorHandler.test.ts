import { ApiErrorHandler, ApiError } from '../ApiErrorHandler';
import { errorLogger } from '../ErrorLogger';

// Mock the errorLogger
jest.mock('../ErrorLogger', () => ({
  errorLogger: {
    logError: jest.fn()
  }
}));

describe('ApiErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles axios response errors', () => {
    const axiosError = {
      response: {
        status: 500,
        statusText: 'Internal Server Error',
        data: {
          message: 'Server error message'
        }
      }
    };
    
    const apiError = ApiErrorHandler.handleApiError(axiosError);
    
    expect(apiError).toBeInstanceOf(Error);
    expect(apiError.isApiError).toBe(true);
    expect(apiError.status).toBe(500);
    expect(apiError.statusText).toBe('Internal Server Error');
    expect(apiError.message).toBe('Server error message');
    expect(apiError.data).toEqual({ message: 'Server error message' });
    
    // Check that the error was logged
    expect(errorLogger.logError).toHaveBeenCalledWith({
      error: apiError,
      type: 'api_error',
      context: {
        status: 500,
        statusText: 'Internal Server Error',
        data: { message: 'Server error message' }
      }
    });
  });

  it('handles axios request errors (network errors)', () => {
    const axiosError = {
      request: {},
      message: 'Network Error'
    };
    
    const apiError = ApiErrorHandler.handleApiError(axiosError);
    
    expect(apiError).toBeInstanceOf(Error);
    expect(apiError.isApiError).toBe(true);
    expect(apiError.message).toBe('Network error: No response received from server');
    
    // Check that the error was logged
    expect(errorLogger.logError).toHaveBeenCalledWith({
      error: apiError,
      type: 'network_error',
      context: {
        status: undefined,
        statusText: undefined,
        data: undefined
      }
    });
  });

  it('handles other axios errors', () => {
    const axiosError = {
      message: 'Something went wrong'
    };
    
    const apiError = ApiErrorHandler.handleApiError(axiosError);
    
    expect(apiError).toBeInstanceOf(Error);
    expect(apiError.isApiError).toBe(true);
    expect(apiError.message).toBe('Request error: Something went wrong');
    
    // Check that the error was logged
    expect(errorLogger.logError).toHaveBeenCalledWith({
      error: apiError,
      type: 'network_error',
      context: {
        status: undefined,
        statusText: undefined,
        data: undefined
      }
    });
  });

  it('returns the error if it is already an ApiError', () => {
    const existingApiError = new Error('Already processed') as ApiError;
    existingApiError.isApiError = true;
    existingApiError.status = 400;
    
    const apiError = ApiErrorHandler.handleApiError(existingApiError);
    
    expect(apiError).toBe(existingApiError);
    expect(errorLogger.logError).not.toHaveBeenCalled();
  });

  it('determines error types correctly', () => {
    // Network error
    const networkError = new Error() as ApiError;
    expect(ApiErrorHandler.determineErrorType(networkError)).toBe('network_error');
    
    // Auth error - 401
    const authError401 = new Error() as ApiError;
    authError401.status = 401;
    expect(ApiErrorHandler.determineErrorType(authError401)).toBe('auth_error');
    
    // Auth error - 403
    const authError403 = new Error() as ApiError;
    authError403.status = 403;
    expect(ApiErrorHandler.determineErrorType(authError403)).toBe('auth_error');
    
    // Validation error - 400
    const validationError400 = new Error() as ApiError;
    validationError400.status = 400;
    expect(ApiErrorHandler.determineErrorType(validationError400)).toBe('validation_error');
    
    // Validation error - 422
    const validationError422 = new Error() as ApiError;
    validationError422.status = 422;
    expect(ApiErrorHandler.determineErrorType(validationError422)).toBe('validation_error');
    
    // API error - other status codes
    const apiError = new Error() as ApiError;
    apiError.status = 500;
    expect(ApiErrorHandler.determineErrorType(apiError)).toBe('api_error');
  });

  it('provides user-friendly error messages', () => {
    // Network error
    const networkError = new Error() as ApiError;
    expect(ApiErrorHandler.getUserFriendlyMessage(networkError))
      .toContain('check your internet connection');
    
    // 400 Bad Request
    const badRequestError = new Error() as ApiError;
    badRequestError.status = 400;
    expect(ApiErrorHandler.getUserFriendlyMessage(badRequestError))
      .toContain('invalid data');
    
    // 401 Unauthorized
    const unauthorizedError = new Error() as ApiError;
    unauthorizedError.status = 401;
    expect(ApiErrorHandler.getUserFriendlyMessage(unauthorizedError))
      .toContain('logged in');
    
    // 403 Forbidden
    const forbiddenError = new Error() as ApiError;
    forbiddenError.status = 403;
    expect(ApiErrorHandler.getUserFriendlyMessage(forbiddenError))
      .toContain('permission');
    
    // 404 Not Found
    const notFoundError = new Error() as ApiError;
    notFoundError.status = 404;
    expect(ApiErrorHandler.getUserFriendlyMessage(notFoundError))
      .toContain('not found');
    
    // 409 Conflict
    const conflictError = new Error() as ApiError;
    conflictError.status = 409;
    expect(ApiErrorHandler.getUserFriendlyMessage(conflictError))
      .toContain('conflict');
    
    // 422 Unprocessable Entity
    const unprocessableError = new Error() as ApiError;
    unprocessableError.status = 422;
    expect(ApiErrorHandler.getUserFriendlyMessage(unprocessableError))
      .toContain('check your input');
    
    // 429 Too Many Requests
    const tooManyRequestsError = new Error() as ApiError;
    tooManyRequestsError.status = 429;
    expect(ApiErrorHandler.getUserFriendlyMessage(tooManyRequestsError))
      .toContain('Too many requests');
    
    // 500 Internal Server Error
    const serverError = new Error() as ApiError;
    serverError.status = 500;
    expect(ApiErrorHandler.getUserFriendlyMessage(serverError))
      .toContain('internal server error');
    
    // 503 Service Unavailable
    const unavailableError = new Error() as ApiError;
    unavailableError.status = 503;
    expect(ApiErrorHandler.getUserFriendlyMessage(unavailableError))
      .toContain('temporarily unavailable');
    
    // Custom message
    const customError = new Error('Custom error message') as ApiError;
    customError.status = 418; // I'm a teapot
    expect(ApiErrorHandler.getUserFriendlyMessage(customError))
      .toBe('Custom error message');
  });

  it('identifies retryable errors correctly', () => {
    // Network error
    const networkError = new Error() as ApiError;
    expect(ApiErrorHandler.isRetryableError(networkError)).toBe(true);
    
    // 500 Internal Server Error
    const serverError = new Error() as ApiError;
    serverError.status = 500;
    expect(ApiErrorHandler.isRetryableError(serverError)).toBe(true);
    
    // 503 Service Unavailable
    const unavailableError = new Error() as ApiError;
    unavailableError.status = 503;
    expect(ApiErrorHandler.isRetryableError(unavailableError)).toBe(true);
    
    // 429 Too Many Requests
    const tooManyRequestsError = new Error() as ApiError;
    tooManyRequestsError.status = 429;
    expect(ApiErrorHandler.isRetryableError(tooManyRequestsError)).toBe(true);
    
    // 400 Bad Request - not retryable
    const badRequestError = new Error() as ApiError;
    badRequestError.status = 400;
    expect(ApiErrorHandler.isRetryableError(badRequestError)).toBe(false);
    
    // 404 Not Found - not retryable
    const notFoundError = new Error() as ApiError;
    notFoundError.status = 404;
    expect(ApiErrorHandler.isRetryableError(notFoundError)).toBe(false);
  });
});