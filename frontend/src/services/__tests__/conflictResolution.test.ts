import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ConflictResolutionService from '../conflictResolution';
import { CellUpdateParams, ResolutionChoice, ConflictData } from '@shared/types';
import * as apiClient from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiClient.apiRequest);

describe('ConflictResolutionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('detectConflict', () => {
    it('returns false for identical primitive values', () => {
      expect(ConflictResolutionService.detectConflict('test', 'test')).toBe(false);
      expect(ConflictResolutionService.detectConflict(123, 123)).toBe(false);
      expect(ConflictResolutionService.detectConflict(true, true)).toBe(false);
    });

    it('returns true for different primitive values', () => {
      expect(ConflictResolutionService.detectConflict('test', 'different')).toBe(true);
      expect(ConflictResolutionService.detectConflict(123, 456)).toBe(true);
      expect(ConflictResolutionService.detectConflict(true, false)).toBe(true);
    });

    it('handles null and undefined correctly', () => {
      expect(ConflictResolutionService.detectConflict(null, null)).toBe(false);
      expect(ConflictResolutionService.detectConflict(undefined, undefined)).toBe(false);
      expect(ConflictResolutionService.detectConflict(null, undefined)).toBe(false);
      expect(ConflictResolutionService.detectConflict(undefined, null)).toBe(false);
      expect(ConflictResolutionService.detectConflict(null, 'value')).toBe(true);
      expect(ConflictResolutionService.detectConflict('value', null)).toBe(true);
    });

    it('compares objects correctly', () => {
      const obj1 = { name: 'test', value: 123 };
      const obj2 = { name: 'test', value: 123 };
      const obj3 = { name: 'different', value: 123 };

      expect(ConflictResolutionService.detectConflict(obj1, obj2)).toBe(false);
      expect(ConflictResolutionService.detectConflict(obj1, obj3)).toBe(true);
    });

    it('compares arrays correctly', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      const arr3 = [1, 2, 4];

      expect(ConflictResolutionService.detectConflict(arr1, arr2)).toBe(false);
      expect(ConflictResolutionService.detectConflict(arr1, arr3)).toBe(true);
    });
  });

  describe('updateCellWithConflictHandling', () => {
    const mockParams: CellUpdateParams = {
      sheetName: 'Shots',
      entityId: 'shot_001',
      fieldId: 'title',
      originalValue: 'original',
      newValue: 'updated',
    };

    it('returns successful response when no conflict', async () => {
      const mockResponse = {
        success: true,
        data: { value: 'updated' },
      };

      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const result = await ConflictResolutionService.updateCellWithConflictHandling(mockParams);

      expect(result).toEqual(mockResponse);
      expect(mockApiRequest).toHaveBeenCalledWith('PUT', '/sheets/Shots/cell', mockParams);
    });

    it('handles conflict without onConflict callback', async () => {
      const mockResponse = {
        success: false,
        error: 'conflict detected',
        data: { currentValue: 'server_value' },
      };

      mockApiRequest.mockResolvedValueOnce(mockResponse);

      await expect(
        ConflictResolutionService.updateCellWithConflictHandling(mockParams)
      ).rejects.toThrow('Conflict detected');
    });

    it('handles conflict with onConflict callback - OVERWRITE', async () => {
      const mockConflictResponse = {
        success: false,
        error: 'conflict detected',
        data: { currentValue: 'server_value' },
      };

      const mockForceResponse = {
        success: true,
        data: { value: 'updated' },
      };

      mockApiRequest
        .mockResolvedValueOnce(mockConflictResponse)
        .mockResolvedValueOnce(mockForceResponse);

      const onConflict = vi.fn().mockResolvedValue(ResolutionChoice.OVERWRITE);

      const result = await ConflictResolutionService.updateCellWithConflictHandling(
        mockParams,
        onConflict
      );

      expect(onConflict).toHaveBeenCalledWith({
        originalValue: 'original',
        currentValue: 'server_value',
        newValue: 'updated',
        fieldId: 'title',
        entityId: 'shot_001',
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(2);
      expect(mockApiRequest).toHaveBeenLastCalledWith('PUT', '/sheets/Shots/cell', {
        ...mockParams,
        force: true,
      });

      expect(result).toEqual(mockForceResponse);
    });

    it('handles conflict with onConflict callback - KEEP_SERVER', async () => {
      const mockConflictResponse = {
        success: false,
        error: 'conflict detected',
        data: { currentValue: 'server_value' },
      };

      mockApiRequest.mockResolvedValueOnce(mockConflictResponse);

      const onConflict = vi.fn().mockResolvedValue(ResolutionChoice.KEEP_SERVER);

      const result = await ConflictResolutionService.updateCellWithConflictHandling(
        mockParams,
        onConflict
      );

      expect(result).toEqual({
        success: true,
        data: { value: 'server_value' },
        message: 'Kept server value',
      });
    });

    it('handles conflict with onConflict callback - EDIT_AGAIN', async () => {
      const mockConflictResponse = {
        success: false,
        error: 'conflict detected',
        data: { currentValue: 'server_value' },
      };

      mockApiRequest.mockResolvedValueOnce(mockConflictResponse);

      const onConflict = vi.fn().mockResolvedValue(ResolutionChoice.EDIT_AGAIN);

      const result = await ConflictResolutionService.updateCellWithConflictHandling(
        mockParams,
        onConflict
      );

      expect(result).toEqual({
        success: false,
        error: 'edit_again',
        message: 'User chose to edit again',
        data: { currentValue: 'server_value' },
      });
    });
  });

  describe('retry logic', () => {
    const mockParams: CellUpdateParams = {
      sheetName: 'Shots',
      entityId: 'shot_001',
      fieldId: 'title',
      originalValue: 'original',
      newValue: 'updated',
    };

    it('retries on network errors with exponential backoff', async () => {
      const networkError = new Error('Network Error');
      const successResponse = {
        success: true,
        data: { value: 'updated' },
      };

      mockApiRequest
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const startTime = Date.now();
      const resultPromise = ConflictResolutionService.updateCellWithConflictHandling(mockParams);

      // Fast-forward timers to simulate delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toEqual(successResponse);
      expect(mockApiRequest).toHaveBeenCalledTimes(3);
    });

    it('stops retrying after max attempts', async () => {
      const networkError = new Error('Network Error');

      mockApiRequest.mockRejectedValue(networkError);

      const resultPromise = ConflictResolutionService.updateCellWithConflictHandling(mockParams);

      // Fast-forward timers to simulate delays
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow('Network Error');
      expect(mockApiRequest).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('does not retry on conflict errors', async () => {
      const conflictResponse = {
        success: false,
        error: 'conflict detected',
        data: { currentValue: 'server_value' },
      };

      mockApiRequest.mockResolvedValueOnce(conflictResponse);

      await expect(
        ConflictResolutionService.updateCellWithConflictHandling(mockParams)
      ).rejects.toThrow('Conflict detected');

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    it('does not retry on 4xx client errors (except specific ones)', async () => {
      const clientError = {
        response: { status: 400 },
        message: 'Bad Request',
      };

      mockApiRequest.mockRejectedValueOnce(clientError);

      await expect(
        ConflictResolutionService.updateCellWithConflictHandling(mockParams)
      ).rejects.toMatchObject(clientError);

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx server errors', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };

      const successResponse = {
        success: true,
        data: { value: 'updated' },
      };

      mockApiRequest
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(successResponse);

      const resultPromise = ConflictResolutionService.updateCellWithConflictHandling(mockParams);

      // Fast-forward timers
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toEqual(successResponse);
      expect(mockApiRequest).toHaveBeenCalledTimes(2);
    });

    it('retries on timeout errors (408)', async () => {
      const timeoutError = {
        response: { status: 408 },
        message: 'Request Timeout',
      };

      const successResponse = {
        success: true,
        data: { value: 'updated' },
      };

      mockApiRequest
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(successResponse);

      const resultPromise = ConflictResolutionService.updateCellWithConflictHandling(mockParams);

      // Fast-forward timers
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toEqual(successResponse);
      expect(mockApiRequest).toHaveBeenCalledTimes(2);
    });

    it('retries on rate limiting errors (429)', async () => {
      const rateLimitError = {
        response: { status: 429 },
        message: 'Too Many Requests',
      };

      const successResponse = {
        success: true,
        data: { value: 'updated' },
      };

      mockApiRequest
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      const resultPromise = ConflictResolutionService.updateCellWithConflictHandling(mockParams);

      // Fast-forward timers
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toEqual(successResponse);
      expect(mockApiRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchUpdateWithConflictHandling', () => {
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

    it('processes all updates successfully', async () => {
      const mockResponses = [
        { success: true, data: { value: 'updated1' } },
        { success: true, data: { value: 'updated2' } },
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);

      const result = await ConflictResolutionService.batchUpdateWithConflictHandling(mockUpdates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponses);
      expect(mockApiRequest).toHaveBeenCalledTimes(2);
    });

    it('handles partial failures', async () => {
      const mockResponses = [
        { success: true, data: { value: 'updated1' } },
      ];

      const error = new Error('Update failed');

      mockApiRequest
        .mockResolvedValueOnce(mockResponses[0])
        .mockRejectedValueOnce(error);

      const result = await ConflictResolutionService.batchUpdateWithConflictHandling(mockUpdates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Some updates failed');
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual(mockResponses[0]);
      expect(result.data![1].success).toBe(false);
    }, 10000);
  });
});