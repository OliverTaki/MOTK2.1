import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useConflictResolution } from '../useConflictResolution';
import { CellUpdateParams, ResolutionChoice } from '@shared/types';
import ConflictResolutionService from '../../services/conflictResolution';

// Mock the ConflictResolutionService
vi.mock('../../services/conflictResolution', () => ({
  default: {
    updateCellWithConflictHandling: vi.fn(),
    batchUpdateWithConflictHandling: vi.fn(),
  },
}));

const mockConflictResolutionService = vi.mocked(ConflictResolutionService);

describe('useConflictResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useConflictResolution());

    expect(result.current.isConflictDialogOpen).toBe(false);
    expect(result.current.currentConflict).toBe(null);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('provides updateCell function', () => {
    const { result } = renderHook(() => useConflictResolution());

    expect(typeof result.current.updateCell).toBe('function');
  });

  it('provides batchUpdate function', () => {
    const { result } = renderHook(() => useConflictResolution());

    expect(typeof result.current.batchUpdate).toBe('function');
  });

  it('provides conflict resolution functions', () => {
    const { result } = renderHook(() => useConflictResolution());

    expect(typeof result.current.resolveConflict).toBe('function');
    expect(typeof result.current.dismissConflict).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  describe('updateCell', () => {
    const mockParams: CellUpdateParams = {
      sheetName: 'Shots',
      entityId: 'shot_001',
      fieldId: 'title',
      originalValue: 'original',
      newValue: 'updated',
    };

    it('calls ConflictResolutionService.updateCellWithConflictHandling', async () => {
      const mockResponse = { success: true, data: { value: 'updated' } };
      mockConflictResolutionService.updateCellWithConflictHandling.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useConflictResolution());

      let response;
      await act(async () => {
        response = await result.current.updateCell(mockParams);
      });

      expect(mockConflictResolutionService.updateCellWithConflictHandling).toHaveBeenCalledWith(
        mockParams,
        expect.any(Function)
      );
      expect(response).toEqual(mockResponse);
    });

    it('sets isUpdating to true during update', async () => {
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      mockConflictResolutionService.updateCellWithConflictHandling.mockReturnValue(updatePromise);

      const { result } = renderHook(() => useConflictResolution());

      act(() => {
        result.current.updateCell(mockParams);
      });

      expect(result.current.isUpdating).toBe(true);

      await act(async () => {
        resolveUpdate!({ success: true });
        await updatePromise;
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it('handles network errors correctly', async () => {
      const networkError = new Error('Network error') as any;
      networkError.isNetworkError = true;
      networkError.retryable = false;

      mockConflictResolutionService.updateCellWithConflictHandling.mockRejectedValue(networkError);

      const { result } = renderHook(() => useConflictResolution());

      let response;
      await act(async () => {
        response = await result.current.updateCell(mockParams);
      });

      expect(result.current.error).toBe('Network error occurred after multiple retries. Please check your connection.');
      expect(response).toEqual({
        success: false,
        error: 'Network error occurred after multiple retries. Please check your connection.',
      });
    });

    it('handles retryable network errors correctly', async () => {
      const networkError = new Error('Network error') as any;
      networkError.isNetworkError = true;
      networkError.retryable = true;

      mockConflictResolutionService.updateCellWithConflictHandling.mockRejectedValue(networkError);

      const { result } = renderHook(() => useConflictResolution());

      let response;
      await act(async () => {
        response = await result.current.updateCell(mockParams);
      });

      expect(result.current.error).toBe('Network error occurred. Please try again.');
    });

    it('handles edit_again response correctly', async () => {
      const editAgainResponse = {
        success: false,
        error: 'edit_again',
        data: { currentValue: 'server_value' },
      };

      mockConflictResolutionService.updateCellWithConflictHandling.mockResolvedValue(editAgainResponse);

      const { result } = renderHook(() => useConflictResolution());

      let response;
      await act(async () => {
        response = await result.current.updateCell(mockParams);
      });

      expect(response).toEqual(editAgainResponse);
      expect(result.current.error).toBe(null);
    });
  });

  describe('batchUpdate', () => {
    const mockUpdates: CellUpdateParams[] = [
      {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'original1',
        newValue: 'updated1',
      },
      {
        sheetName: 'Shots',
        entityId: 'shot_002',
        fieldId: 'title',
        originalValue: 'original2',
        newValue: 'updated2',
      },
    ];

    it('calls ConflictResolutionService.batchUpdateWithConflictHandling', async () => {
      const mockResponse = { success: true, data: [] };
      mockConflictResolutionService.batchUpdateWithConflictHandling.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useConflictResolution());

      let response;
      await act(async () => {
        response = await result.current.batchUpdate(mockUpdates);
      });

      expect(mockConflictResolutionService.batchUpdateWithConflictHandling).toHaveBeenCalledWith(
        mockUpdates,
        expect.any(Function)
      );
      expect(response).toEqual(mockResponse);
    });

    it('handles batch update errors', async () => {
      const error = new Error('Batch update failed');
      mockConflictResolutionService.batchUpdateWithConflictHandling.mockRejectedValue(error);

      const { result } = renderHook(() => useConflictResolution());

      let response;
      await act(async () => {
        response = await result.current.batchUpdate(mockUpdates);
      });

      expect(result.current.error).toBe('Batch update failed');
      expect(response).toEqual({
        success: false,
        error: 'Batch update failed',
        data: [],
      });
    });
  });

  describe('conflict resolution', () => {
    it('opens conflict dialog when conflict occurs', async () => {
      let conflictHandler: (conflictData: any) => Promise<ResolutionChoice>;
      
      mockConflictResolutionService.updateCellWithConflictHandling.mockImplementation(
        (params, onConflict) => {
          conflictHandler = onConflict!;
          return Promise.resolve({ success: true });
        }
      );

      const { result } = renderHook(() => useConflictResolution());

      const mockParams: CellUpdateParams = {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'original',
        newValue: 'updated',
      };

      await act(async () => {
        result.current.updateCell(mockParams);
      });

      const conflictData = {
        originalValue: 'original',
        currentValue: 'server_value',
        newValue: 'updated',
        fieldId: 'title',
        entityId: 'shot_001',
      };

      act(() => {
        conflictHandler!(conflictData);
      });

      expect(result.current.isConflictDialogOpen).toBe(true);
      expect(result.current.currentConflict).toEqual(conflictData);
    });

    it('resolves conflict when resolveConflict is called', async () => {
      let conflictHandler: (conflictData: any) => Promise<ResolutionChoice>;
      let conflictPromise: Promise<ResolutionChoice>;
      
      mockConflictResolutionService.updateCellWithConflictHandling.mockImplementation(
        (params, onConflict) => {
          conflictHandler = onConflict!;
          return Promise.resolve({ success: true });
        }
      );

      const { result } = renderHook(() => useConflictResolution());

      const mockParams: CellUpdateParams = {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'original',
        newValue: 'updated',
      };

      await act(async () => {
        result.current.updateCell(mockParams);
      });

      const conflictData = {
        originalValue: 'original',
        currentValue: 'server_value',
        newValue: 'updated',
        fieldId: 'title',
        entityId: 'shot_001',
      };

      act(() => {
        conflictPromise = conflictHandler!(conflictData);
      });

      expect(result.current.isConflictDialogOpen).toBe(true);

      let resolvedChoice: ResolutionChoice;
      conflictPromise.then((choice) => {
        resolvedChoice = choice;
      });

      act(() => {
        result.current.resolveConflict(ResolutionChoice.OVERWRITE);
      });

      await waitFor(() => {
        expect(resolvedChoice!).toBe(ResolutionChoice.OVERWRITE);
      });

      expect(result.current.isConflictDialogOpen).toBe(false);
      expect(result.current.currentConflict).toBe(null);
    });

    it('dismisses conflict when dismissConflict is called', async () => {
      let conflictHandler: (conflictData: any) => Promise<ResolutionChoice>;
      let conflictPromise: Promise<ResolutionChoice>;
      
      mockConflictResolutionService.updateCellWithConflictHandling.mockImplementation(
        (params, onConflict) => {
          conflictHandler = onConflict!;
          return Promise.resolve({ success: true });
        }
      );

      const { result } = renderHook(() => useConflictResolution());

      const mockParams: CellUpdateParams = {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'original',
        newValue: 'updated',
      };

      await act(async () => {
        result.current.updateCell(mockParams);
      });

      const conflictData = {
        originalValue: 'original',
        currentValue: 'server_value',
        newValue: 'updated',
        fieldId: 'title',
        entityId: 'shot_001',
      };

      act(() => {
        conflictPromise = conflictHandler!(conflictData);
      });

      expect(result.current.isConflictDialogOpen).toBe(true);

      let rejectedError: Error;
      conflictPromise.catch((error) => {
        rejectedError = error;
      });

      act(() => {
        result.current.dismissConflict();
      });

      await waitFor(() => {
        expect(rejectedError!.message).toBe('User cancelled conflict resolution');
      });

      expect(result.current.isConflictDialogOpen).toBe(false);
      expect(result.current.currentConflict).toBe(null);
    });
  });

  describe('error handling', () => {
    it('clears error when clearError is called', async () => {
      const error = new Error('Test error');
      mockConflictResolutionService.updateCellWithConflictHandling.mockRejectedValue(error);

      const { result } = renderHook(() => useConflictResolution());

      const mockParams: CellUpdateParams = {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'original',
        newValue: 'updated',
      };

      await act(async () => {
        await result.current.updateCell(mockParams);
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });
});