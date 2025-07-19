import { useState, useCallback } from 'react';
import { CellUpdateParams, ConflictData, ResolutionChoice, ApiResponse } from '@shared/types';
import ConflictResolutionService, { ConflictError, NetworkError } from '../services/conflictResolution';

interface UseConflictResolutionReturn {
  // State
  isConflictDialogOpen: boolean;
  currentConflict: ConflictData | null;
  isUpdating: boolean;
  error: string | null;

  // Actions
  updateCell: (params: CellUpdateParams) => Promise<ApiResponse<any>>;
  batchUpdate: (updates: CellUpdateParams[]) => Promise<ApiResponse<any[]>>;
  resolveConflict: (choice: ResolutionChoice) => void;
  dismissConflict: () => void;
  clearError: () => void;
}

export const useConflictResolution = (): UseConflictResolutionReturn => {
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<ConflictData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] = useState<{
    params: CellUpdateParams;
    conflictData: ConflictData;
    resolve: (choice: ResolutionChoice) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const handleConflict = useCallback((conflictData: ConflictData): Promise<ResolutionChoice> => {
    return new Promise((resolve, reject) => {
      setCurrentConflict(conflictData);
      setIsConflictDialogOpen(true);
      setPendingResolution({
        params: {
          sheetName: '',
          entityId: conflictData.entityId,
          fieldId: conflictData.fieldId,
          originalValue: conflictData.originalValue,
          newValue: conflictData.newValue,
        },
        conflictData,
        resolve,
        reject,
      });
    });
  }, []);

  const resolveConflict = useCallback((choice: ResolutionChoice) => {
    if (pendingResolution) {
      pendingResolution.resolve(choice);
      setPendingResolution(null);
    }
    setIsConflictDialogOpen(false);
    setCurrentConflict(null);
  }, [pendingResolution]);

  const dismissConflict = useCallback(() => {
    if (pendingResolution) {
      pendingResolution.reject(new Error('User cancelled conflict resolution'));
      setPendingResolution(null);
    }
    setIsConflictDialogOpen(false);
    setCurrentConflict(null);
  }, [pendingResolution]);

  const updateCell = useCallback(async (params: CellUpdateParams): Promise<ApiResponse<any>> => {
    setIsUpdating(true);
    setError(null);

    try {
      const result = await ConflictResolutionService.updateCellWithConflictHandling(
        params,
        handleConflict
      );

      if (!result.success && result.error === 'edit_again') {
        // User chose to edit again, return the current server value
        return result;
      }

      return result;
    } catch (error) {
      let errorMessage = 'An unexpected error occurred';

      if (error instanceof Error) {
        if ('isNetworkError' in error && (error as NetworkError).isNetworkError) {
          const networkError = error as NetworkError;
          errorMessage = networkError.retryable 
            ? 'Network error occurred. Please try again.'
            : 'Network error occurred after multiple retries. Please check your connection.';
        } else if ('conflictData' in error && (error as ConflictError).conflictData) {
          // This shouldn't happen as conflicts are handled by the dialog
          errorMessage = 'Conflict resolution failed';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUpdating(false);
    }
  }, [handleConflict]);

  const batchUpdate = useCallback(async (updates: CellUpdateParams[]): Promise<ApiResponse<any[]>> => {
    setIsUpdating(true);
    setError(null);

    try {
      const result = await ConflictResolutionService.batchUpdateWithConflictHandling(
        updates,
        handleConflict
      );

      return result;
    } catch (error) {
      let errorMessage = 'Batch update failed';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        data: [],
      };
    } finally {
      setIsUpdating(false);
    }
  }, [handleConflict]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isConflictDialogOpen,
    currentConflict,
    isUpdating,
    error,

    // Actions
    updateCell,
    batchUpdate,
    resolveConflict,
    dismissConflict,
    clearError,
  };
};

export default useConflictResolution;