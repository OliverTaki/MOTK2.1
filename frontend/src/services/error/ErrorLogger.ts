import { ErrorInfo } from 'react';

export interface ErrorLogEntry {
  error: Error;
  errorInfo?: ErrorInfo;
  componentStack?: string;
  context?: Record<string, any>;
  type: ErrorType;
  timestamp?: Date;
  userInfo?: {
    userId?: string;
    username?: string;
  };
  sessionInfo?: {
    sessionId?: string;
    userAgent?: string;
  };
  appInfo?: {
    version?: string;
    environment?: string;
  };
}

export type ErrorType = 
  | 'react_error_boundary' 
  | 'api_error' 
  | 'network_error' 
  | 'auth_error'
  | 'storage_error'
  | 'conflict_error'
  | 'validation_error'
  | 'unhandled_error';

export interface ErrorLoggerOptions {
  appVersion?: string;
  environment?: string;
  userId?: string;
  username?: string;
  sessionId?: string;
  apiEndpoint?: string;
  consoleOutput?: boolean;
  maxRetries?: number;
}

/**
 * ErrorLogger service for centralized error logging and reporting
 */
export class ErrorLogger {
  private options: ErrorLoggerOptions;
  private errorQueue: ErrorLogEntry[] = [];
  private isProcessingQueue = false;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(options: ErrorLoggerOptions = {}) {
    this.options = {
      appVersion: options.appVersion || import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: options.environment || import.meta.env.MODE || 'development',
      userId: options.userId,
      username: options.username,
      sessionId: options.sessionId || this.generateSessionId(),
      apiEndpoint: options.apiEndpoint || '/api/logs/error',
      consoleOutput: options.consoleOutput ?? true,
      maxRetries: options.maxRetries || 3
    };

    // Set up automatic flushing of error queue
    this.startFlushInterval();

    // Add unhandled error listeners
    this.setupGlobalErrorHandlers();
  }

  /**
   * Log an error to the centralized error logging system
   */
  public logError(entry: Omit<ErrorLogEntry, 'timestamp'>): void {
    const fullEntry: ErrorLogEntry = {
      ...entry,
      timestamp: new Date(),
      userInfo: {
        userId: this.options.userId,
        username: this.options.username
      },
      sessionInfo: {
        sessionId: this.options.sessionId,
        userAgent: navigator.userAgent
      },
      appInfo: {
        version: this.options.appVersion,
        environment: this.options.environment
      }
    };

    // Add to queue for batch processing
    this.errorQueue.push(fullEntry);

    // Output to console if enabled
    if (this.options.consoleOutput) {
      console.error(
        `[ErrorLogger] ${entry.type}:`,
        entry.error,
        entry.errorInfo || '',
        entry.context || ''
      );
    }

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processErrorQueue();
    }
  }

  /**
   * Update logger options
   */
  public updateOptions(options: Partial<ErrorLoggerOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }

  /**
   * Set user information for error logging
   */
  public setUserInfo(userId: string, username?: string): void {
    this.options.userId = userId;
    this.options.username = username;
  }

  /**
   * Clear user information
   */
  public clearUserInfo(): void {
    this.options.userId = undefined;
    this.options.username = undefined;
  }

  /**
   * Process the error queue and send to backend
   */
  private async processErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0 || this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Take a batch of errors (up to 10)
      const batch = this.errorQueue.splice(0, 10);
      
      if (batch.length > 0) {
        await this.sendErrorsToServer(batch);
      }
    } catch (error) {
      console.error('[ErrorLogger] Failed to send errors to server:', error);
    } finally {
      this.isProcessingQueue = false;
      
      // If there are more errors, process them
      if (this.errorQueue.length > 0) {
        setTimeout(() => this.processErrorQueue(), 1000);
      }
    }
  }

  /**
   * Send errors to the backend API
   */
  private async sendErrorsToServer(errors: ErrorLogEntry[]): Promise<void> {
    // Skip in development mode unless explicitly configured
    if (this.options.environment === 'development' && !this.options.apiEndpoint) {
      return;
    }

    let retries = 0;
    const maxRetries = this.options.maxRetries || 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(this.options.apiEndpoint!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            errors: errors.map(error => ({
              ...error,
              error: {
                name: error.error.name,
                message: error.error.message,
                stack: error.error.stack
              }
            }))
          })
        });

        if (response.ok) {
          return;
        }

        // If server error, retry
        if (response.status >= 500) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
          continue;
        }

        // Client error, don't retry
        console.error(`[ErrorLogger] Failed to send errors: ${response.status} ${response.statusText}`);
        return;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error('[ErrorLogger] Max retries reached for sending errors');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Set up interval to flush error queue periodically
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      if (this.errorQueue.length > 0 && !this.isProcessingQueue) {
        this.processErrorQueue();
      }
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Stop the flush interval
   */
  public stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Set up global error handlers for unhandled errors
   */
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.logError({
        error: event.error || new Error(event.message),
        type: 'unhandled_error',
        context: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      let error: Error;
      
      if (event.reason instanceof Error) {
        error = event.reason;
      } else {
        error = new Error(
          typeof event.reason === 'string' 
            ? event.reason 
            : 'Unhandled Promise rejection'
        );
      }

      this.logError({
        error,
        type: 'unhandled_error',
        context: {
          reason: event.reason
        }
      });
    });
  }
}

// Create a singleton instance
export const errorLogger = new ErrorLogger();

export default errorLogger;