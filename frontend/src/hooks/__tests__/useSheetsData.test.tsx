import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi } from 'vitest';
import { useSheetsData, useCellUpdate, useBatchCellUpdate, useCellUpdateWithConflictResolution } from '../useSheetsData';
import { sheetsService, ConflictError } from '../../services/sheetsService';
import { CellUpdateParams } from '@shared/types';

// Mock the sheets service
vi.mock('../../services/sheetsService');
const mockedSheetsService = sheetsService as any;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSheetsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch sheet data successfully', async () => {
    const mockSheetData = {
      values: [['Header1', 'Header2'], ['Value1', 'Value2']],
      range: 'A1:B2',
      majorDimension: 'ROWS' as const,
    };

    mockedSheetsService.getSheetData.mockResolvedValue(mockSheetData);

    const { result } = renderHook(
      () => useSheetsData('TestSheet'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSheetData);
    expect(mockedSheetsService.getSheetData).toHaveBeenCalledWith('TestSheet', undefined);
  });

  it('should fetch sheet data with range', async () => {
    const mockSheetData = {
      values: [['Value1', 'Value2']],
      range: 'A1:B1',
      majorDimension: 'ROWS' as const,
    };

    mockedSheetsService.getSheetData.mockResolvedValue(mockSheetData);

    const { result } = renderHook(
      () => useSheetsData('TestSheet', 'A1:B1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSheetData);
    expect(mockedSheetsService.getSheetData).toHaveBeenCalledWith('TestSheet', 'A1:B1');
  });

  it('should handle fetch errors', async () => {
    mockedSheetsService.getSheetData.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useSheetsData('TestSheet'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Network error'));
  });

  it('should not fetch when sheetName is empty', () => {
    const { result } = renderHook(
      () => useSheetsData(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockedSheetsService.getSheetData).not.toHaveBeenCalled();
  });
});

describe('useCellUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update cell successfully', async () => {
    const mockResult = {
      success: true,
      updatedValue: 'New Value',
    };

    mockedSheetsService.updateCell.mockResolvedValue(mockResult);

    const { result } = renderHook(
      () => useCellUpdate(),
      { wrapper: createWrapper() }
    );

    const updateParams: CellUpdateParams = {
      sheetName: 'TestSheet',
      entityId: 'entity1',
      fieldId: 'field1',
      originalValue: 'Old Value',
      newValue: 'New Value',
    };

    await result.current.mutateAsync(updateParams);

    expect(mockedSheetsService.updateCell).toHaveBeenCalledWith(updateParams);
  });

  it('should handle update errors', async () => {
    mockedSheetsService.updateCell.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(
      () => useCellUpdate(),
      { wrapper: createWrapper() }
    );

    const updateParams: CellUpdateParams = {
      sheetName: 'TestSheet',
      entityId: 'entity1',
      fieldId: 'field1',
      originalValue: 'Old Value',
      newValue: 'New Value',
    };

    await expect(result.current.mutateAsync(updateParams)).rejects.toThrow('Update failed');
  });
});

describe('useBatchCellUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should batch update cells successfully', async () => {
    const mockResult = {
      success: true,
      results: [
        { success: true, updatedValue: 'Value1' },
        { success: true, updatedValue: 'Value2' },
      ],
    };

    mockedSheetsService.batchUpdate.mockResolvedValue(mockResult);

    const { result } = renderHook(
      () => useBatchCellUpdate(),
      { wrapper: createWrapper() }
    );

    const batchParams = {
      updates: [
        {
          sheetName: 'TestSheet',
          entityId: 'entity1',
          fieldId: 'field1',
          originalValue: 'Old1',
          newValue: 'New1',
        },
        {
          sheetName: 'TestSheet',
          entityId: 'entity2',
          fieldId: 'field2',
          originalValue: 'Old2',
          newValue: 'New2',
        },
      ],
    };

    await result.current.mutateAsync(batchParams);

    expect(mockedSheetsService.batchUpdate).toHaveBeenCalledWith(batchParams);
  });
});

describe('useCellUpdateWithConflictResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle successful update without conflict', async () => {
    const mockResult = {
      success: true,
      updatedValue: 'New Value',
    };

    mockedSheetsService.updateCell.mockResolvedValue(mockResult);

    const { result } = renderHook(
      () => useCellUpdateWithConflictResolution(),
      { wrapper: createWrapper() }
    );

    const updateParams: CellUpdateParams = {
      sheetName: 'TestSheet',
      entityId: 'entity1',
      fieldId: 'field1',
      originalValue: 'Old Value',
      newValue: 'New Value',
    };

    const updateResult = await result.current.updateCell(updateParams);

    expect(updateResult).toEqual(mockResult);
    expect(mockedSheetsService.updateCell).toHaveBeenCalledWith(updateParams);
  });

  it('should handle conflict with overwrite resolution', async () => {
    const conflictError = new ConflictError('Conflict detected', {
      currentValue: 'Server Value',
      originalValue: 'Old Value',
    });

    const mockSuccessResult = {
      success: true,
      updatedValue: 'New Value',
    };

    mockedSheetsService.updateCell
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce(mockSuccessResult);

    const { result } = renderHook(
      () => useCellUpdateWithConflictResolution(),
      { wrapper: createWrapper() }
    );

    const updateParams: CellUpdateParams = {
      sheetName: 'TestSheet',
      entityId: 'entity1',
      fieldId: 'field1',
      originalValue: 'Old Value',
      newValue: 'New Value',
    };

    const onConflict = vi.fn().mockResolvedValue('overwrite');

    const updateResult = await result.current.updateCell(updateParams, onConflict);

    expect(onConflict).toHaveBeenCalledWith(conflictError.conflictData);
    expect(mockedSheetsService.updateCell).toHaveBeenCalledTimes(2);
    expect(mockedSheetsService.updateCell).toHaveBeenLastCalledWith({
      ...updateParams,
      force: true,
    });
    expect(updateResult).toEqual(mockSuccessResult);
  });

  it('should handle conflict with keep_server resolution', async () => {
    const conflictError = new ConflictError('Conflict detected', {
      currentValue: 'Server Value',
      originalValue: 'Old Value',
    });

    mockedSheetsService.updateCell.mockRejectedValueOnce(conflictError);

    const { result } = renderHook(
      () => useCellUpdateWithConflictResolution(),
      { wrapper: createWrapper() }
    );

    const updateParams: CellUpdateParams = {
      sheetName: 'TestSheet',
      entityId: 'entity1',
      fieldId: 'field1',
      originalValue: 'Old Value',
      newValue: 'New Value',
    };

    const onConflict = vi.fn().mockResolvedValue('keep_server');

    const updateResult = await result.current.updateCell(updateParams, onConflict);

    expect(onConflict).toHaveBeenCalledWith(conflictError.conflictData);
    expect(mockedSheetsService.updateCell).toHaveBeenCalledTimes(1);
    expect(updateResult).toEqual({
      success: true,
      updatedValue: conflictError.conflictData?.currentValue,
    });
  });

  it('should handle conflict with edit_again resolution', async () => {
    const conflictError = new ConflictError('Conflict detected', {
      currentValue: 'Server Value',
      originalValue: 'Old Value',
    });

    mockedSheetsService.updateCell.mockRejectedValueOnce(conflictError);

    const { result } = renderHook(
      () => useCellUpdateWithConflictResolution(),
      { wrapper: createWrapper() }
    );

    const updateParams: CellUpdateParams = {
      sheetName: 'TestSheet',
      entityId: 'entity1',
      fieldId: 'field1',
      originalValue: 'Old Value',
      newValue: 'New Value',
    };

    const onConflict = vi.fn().mockResolvedValue('edit_again');

    try {
      await result.current.updateCell(updateParams, onConflict);
      expect.fail('Expected error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictError);
      // The error should be the same instance that was thrown
      expect(error).toBe(conflictError);
    }

    expect(onConflict).toHaveBeenCalledWith(conflictError.conflictData);
    expect(mockedSheetsService.updateCell).toHaveBeenCalledTimes(1);
  });
});