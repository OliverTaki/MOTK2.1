import { CellUpdateParams, ConflictData, ResolutionChoice, ApiResponse } from '@shared/types';
import { apiRequest } from '../api/client';

export interface ConflictError extends Error {
  conflictData: ConflictData;
  status: number;
}

export interface NetworkError extends Error {
  isNetworkError: true;
  retryable: boolean;
}

export class ConflictResolutionService {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second

  /**
   * Detects if two values are different (conflict detection)
   */
  static detectConflict(originalValue: any, currentValue: any): boolean {
    // Handle null/undefined cases
    if (originalValue === null && currentValue === null) return false;
    if (originalValue === undefined && currentValue === undefined) return false;
    if (originalValue === null && currentValue === undefined) return false;
    if (originalValue === undefined && currentValue === null) return false;

    // Handle primitive types
    if (typeof originalValue !== 'object' && typeof currentValue !== 'object') {
      return originalValue !== currentValue;
    }

    // Handle objects/arrays - deep comparison
    return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
  }

  /**
   * Updates a cell with conflict detection and retry logic
   */
  static async updateCellWithConflictHandling(
    params: CellUpdateParams,
    onConflict?: (conflictData: ConflictData) => Promise<ResolutionChoice>
  ): Promise<ApiResponse<any>> {
    return this.executeWithRetry(async () => {
      const response = await apiRequest<any>('PUT', `/sheets/${params.sheetName}/cell`, params);
      
      // Check for conflict response (409 status)
      if (!response.success && response.error?.includes('conflict')) {
        const conflictData: ConflictData = {
          originalValue: params.originalValue,
          currentValue: response.data?.currentValue || null,
          newValue: params.newValue,
          fieldId: params.fieldId,
          entityId: params.entityId,
        };

        if (onConflict) {
          const resolution = await onConflict(conflictData);
          return this.handleConflictResolution(params, conflictData, resolution);
        } else {
          const error = new Error('Conflict detected') as ConflictError;
          error.conflictData = conflictData;
          error.status = 409;
          throw error;
        }
      }

      return response;
    });
  }

  /**
   * Handles the resolution choice from the user
   */
  private static async handleConflictResolution(
    originalParams: CellUpdateParams,
    conflictData: ConflictData,
    resolution: ResolutionChoice
  ): Promise<ApiResponse<any>> {
    switch (resolution) {
      case ResolutionChoice.OVERWRITE:
        // Force update with the user's value
        return apiRequest<any>('PUT', `/sheets/${originalParams.sheetName}/cell`, {
          ...originalParams,
          force: true,
        });

      case ResolutionChoice.KEEP_SERVER:
        // Return success with server value
        return {
          success: true,
          data: { value: conflictData.currentValue },
          message: 'Kept server value',
        };

      case ResolutionChoice.EDIT_AGAIN:
        // Return a special response indicating user wants to edit again
        return {
          success: false,
          error: 'edit_again',
          message: 'User chose to edit again',
          data: { currentValue: conflictData.currentValue },
        };

      default:
        throw new Error(`Unknown resolution choice: ${resolution}`);
    }
  }

  /**
   * Executes a function with exponential backoff retry logic
   */
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Don't retry conflict errors - they need user resolution
      if (this.isConflictError(error)) {
        throw error;
      }

      // Check if this is a retryable network error
      if (this.isRetryableError(error) && retryCount < this.MAX_RETRIES) {
        const delay = this.calculateBackoffDelay(retryCount);
        await this.sleep(delay);
        return this.executeWithRetry(operation, retryCount + 1);
      }

      // Convert to NetworkError if it's a network issue
      if (this.isNetworkError(error)) {
        const networkError = new Error(error.message) as NetworkError;
        networkError.isNetworkError = true;
        networkError.retryable = retryCount < this.MAX_RETRIES;
        throw networkError;
      }

      throw error;
    }
  }

  /**
   * Calculates exponential backoff delay with jitter
   */
  private static calculateBackoffDelay(retryCount: number): number {
    const exponentialDelay = this.BASE_DELAY * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return exponentialDelay + jitter;
  }

  /**
   * Sleep utility for delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Checks if an error is a conflict error
   */
  private static isConflictError(error: any): error is ConflictError {
    return error && error.status === 409 && error.conflictData;
  }

  /**
   * Checks if an error is retryable (network issues, timeouts, 5xx errors)
   */
  private static isRetryableError(error: any): boolean {
    if (!error.response) return true; // Network error, likely retryable
    
    const status = error.response.status;
    
    // Retry on server errors (5xx) and some client errors
    if (status >= 500) return true;
    if (status === 408) return true; // Request timeout
    if (status === 429) return true; // Rate limiting
    
    return false;
  }

  /**
   * Checks if an error is a network error
   */
  private static isNetworkError(error: any): boolean {
    return !error.response || error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED';
  }

  /**
   * Batch update cells with conflict handling
   */
  static async batchUpdateWithConflictHandling(
    updates: CellUpdateParams[],
    onConflict?: (conflictData: ConflictData) => Promise<ResolutionChoice>
  ): Promise<ApiResponse<any[]>> {
    const results: ApiResponse<any>[] = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateCellWithConflictHandling(update, onConflict);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          data: { entityId: update.entityId, fieldId: update.fieldId },
        });
      }
    }

    const hasErrors = results.some(r => !r.success);
    
    return {
      success: !hasErrors,
      data: results,
      error: hasErrors ? 'Some updates failed' : undefined,
    };
  }
}

export default ConflictResolutionService;