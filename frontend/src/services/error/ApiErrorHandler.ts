import { errorLogger } from './ErrorLogger';

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  data?: any;
  isApiError: boolean;
}

export class ApiErrorHandler {
  /**
   * Handles API errors and transforms them into standardized ApiError objects
   */
  static handleApiError(error: any): ApiError {
    let apiError: ApiError;

    if (error.isApiError) {
      // Already processed
      return error;
    }

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      apiError = new Error(
        error.response.data?.message || 
        error.response.data?.error || 
        `API Error: ${error.response.status} ${error.response.statusText}`
      ) as ApiError;
      
      apiError.status = error.response.status;
      apiError.statusText = error.response.statusText;
      apiError.data = error.response.data;
      apiError.isApiError = true;
    } else if (error.request) {
      // The request was made but no response was received
      apiError = new Error('Network error: No response received from server') as ApiError;
      apiError.isApiError = true;
    } else {
      // Something happened in setting up the request that triggered an Error
      apiError = new Error(`Request error: ${error.message}`) as ApiError;
      apiError.isApiError = true;
    }

    // Log the error
    this.logApiError(apiError);

    return apiError;
  }

  /**
   * Logs API errors to the centralized error logging system
   */
  static logApiError(error: ApiError): void {
    const errorType = this.determineErrorType(error);
    
    errorLogger.logError({
      error,
      type: errorType,
      context: {
        status: error.status,
        statusText: error.statusText,
        data: error.data
      }
    });
  }

  /**
   * Determines the error type based on the API error
   */
  static determineErrorType(error: ApiError): 'api_error' | 'network_error' | 'auth_error' | 'validation_error' {
    if (!error.status) {
      return 'network_error';
    }

    if (error.status === 401 || error.status === 403) {
      return 'auth_error';
    }

    if (error.status === 400 || error.status === 422) {
      return 'validation_error';
    }

    return 'api_error';
  }

  /**
   * Gets a user-friendly error message based on the API error
   */
  static getUserFriendlyMessage(error: ApiError): string {
    if (!error.status) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    switch (error.status) {
      case 400:
        return 'The request contains invalid data. Please check your input and try again.';
      case 401:
        return 'You need to be logged in to perform this action.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'There was a conflict with the current state of the resource.';
      case 422:
        return 'The server could not process your request. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Checks if the error is retryable
   */
  static isRetryableError(error: ApiError): boolean {
    if (!error.status) {
      // Network errors are generally retryable
      return true;
    }

    // Server errors (5xx) are generally retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Rate limiting (429) is retryable after a delay
    if (error.status === 429) {
      return true;
    }

    // All other status codes are not retryable
    return false;
  }
}

export default ApiErrorHandler;