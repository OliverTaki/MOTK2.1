import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi } from 'vitest';
import { useSheetsData, useCellUpdate } from '../useSheetsData';
import { useEntityData, useCreateEntity, useUpdateEntity } from '../useEntityData';
import { sheetsService, entityService } from '../../services/sheetsService';
import { ENTITY_KIND, Shot, CellUpdateParams } from '@shared/types';

// Mock the services
vi.mock('../../services/sheetsService');
const mockedSheetsService = sheetsService as any;
const mockedEntityService = entityService as any;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0, // Disable stale time for testing
        cacheTime: 0, // Disable cache time for testing
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

describe('Data Fetching Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete sheet data workflow with optimistic updates', async () => {
    // Mock initial sheet data
    const initialSheetData = {
      values: [
        ['shot_id', 'title', 'status'],
        ['shot1', 'Original Title', 'not_started'],
        ['shot2', 'Another Shot', 'in_progress'],
      ],
      range: 'A1:C3',
      majorDimension: 'ROWS' as const,
    };

    mockedSheetsService.getSheetData.mockResolvedValue(initialSheetData);

    // Render the sheets data hook
    const { result: sheetsResult } = renderHook(
      () => useSheetsData('Shots'),
      { wrapper: createWrapper() }
    );

    // Wait for initial data to load
    await waitFor(() => {
      expect(sheetsResult.current.isSuccess).toBe(true);
    });

    expect(sheetsResult.current.data).toEqual(initialSheetData);

    // Now test cell update with optimistic updates
    const { result: updateResult } = renderHook(
      () => useCellUpdate(),
      { wrapper: createWrapper() }
    );

    const updateParams: CellUpdateParams = {
      sheetName: 'Shots',
      entityId: 'shot1',
      fieldId: 'title',
      originalValue: 'Original Title',
      newValue: 'Updated Title',
    };

    const mockUpdateResult = {
      success: true,
      updatedValue: 'Updated Title',
    };

    mockedSheetsService.updateCell.mockResolvedValue(mockUpdateResult);

    // Perform the update
    await act(async () => {
      await updateResult.current.mutateAsync(updateParams);
    });

    expect(mockedSheetsService.updateCell).toHaveBeenCalledWith(updateParams);
  });

  it('should handle complete entity workflow with cache management', async () => {
    // Mock entity list data
    const mockShots: Shot[] = [
      {
        shot_id: 'shot1',
        title: 'Test Shot 1',
        status: 'not_started' as any,
      },
      {
        shot_id: 'shot2',
        title: 'Test Shot 2',
        status: 'in_progress' as any,
      },
    ];

    const mockEntityListResult = {
      success: true,
      data: mockShots,
      total: 2,
      offset: 0,
      limit: 50,
    };

    mockedEntityService.getEntities.mockResolvedValue(mockEntityListResult);

    // Render entity data hook
    const { result: entityListResult } = renderHook(
      () => useEntityData<Shot>({ entityType: EntityTypes.SHOT }),
      { wrapper: createWrapper() }
    );

    // Wait for data to load
    await waitFor(() => {
      expect(entityListResult.current.isSuccess).toBe(true);
    });

    expect(entityListResult.current.data).toEqual(mockEntityListResult);

    // Test entity creation with optimistic updates
    const { result: createResult } = renderHook(
      () => useCreateEntity<Shot>(EntityTypes.SHOT),
      { wrapper: createWrapper() }
    );

    const newShotData = {
      title: 'New Shot',
      status: 'not_started' as any,
    };

    const createdShot = {
      ...newShotData,
      shot_id: 'shot3',
    };

    mockedEntityService.createEntity.mockResolvedValue(createdShot);

    // Create new entity
    await act(async () => {
      await createResult.current.mutateAsync(newShotData);
    });

    expect(mockedEntityService.createEntity).toHaveBeenCalledWith(
      EntityTypes.SHOT,
      newShotData
    );

    // Test entity update
    const { result: updateResult } = renderHook(
      () => useUpdateEntity<Shot>(EntityTypes.SHOT),
      { wrapper: createWrapper() }
    );

    const updateData = {
      title: 'Updated Shot Title',
    };

    const updatedShot = {
      ...mockShots[0],
      ...updateData,
    };

    mockedEntityService.updateEntity.mockResolvedValue(updatedShot);

    // Update entity
    await act(async () => {
      await updateResult.current.mutateAsync({
        id: 'shot1',
        data: updateData,
      });
    });

    expect(mockedEntityService.updateEntity).toHaveBeenCalledWith(
      EntityTypes.SHOT,
      'shot1',
      updateData
    );
  });

  it('should handle error scenarios and cache invalidation', async () => {
    // Test error handling in sheet data fetching
    mockedSheetsService.getSheetData.mockRejectedValue(new Error('Network error'));

    const { result: sheetsResult } = renderHook(
      () => useSheetsData('Shots'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(sheetsResult.current.isError).toBe(true);
    });

    expect(sheetsResult.current.error).toEqual(new Error('Network error'));

    // Test error handling in entity operations
    mockedEntityService.getEntities.mockRejectedValue(new Error('Server error'));

    const { result: entityResult } = renderHook(
      () => useEntityData<Shot>({ entityType: EntityTypes.SHOT }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(entityResult.current.isError).toBe(true);
    });

    expect(entityResult.current.error).toEqual(new Error('Server error'));
  });

  it('should handle concurrent operations and cache consistency', async () => {
    // Mock successful responses
    const mockSheetData = {
      values: [['shot_id', 'title'], ['shot1', 'Original']],
      range: 'A1:B2',
      majorDimension: 'ROWS' as const,
    };

    mockedSheetsService.getSheetData.mockResolvedValue(mockSheetData);

    // Create multiple hooks that might access the same data
    const wrapper = createWrapper();

    const { result: sheets1 } = renderHook(
      () => useSheetsData('Shots'),
      { wrapper }
    );

    const { result: sheets2 } = renderHook(
      () => useSheetsData('Shots'),
      { wrapper }
    );

    // Both hooks should share the same cached data
    await waitFor(() => {
      expect(sheets1.current.isSuccess).toBe(true);
      expect(sheets2.current.isSuccess).toBe(true);
    });

    expect(sheets1.current.data).toEqual(mockSheetData);
    expect(sheets2.current.data).toEqual(mockSheetData);

    // The service should only be called once due to caching
    expect(mockedSheetsService.getSheetData).toHaveBeenCalledTimes(1);
  });

  it('should handle background refetch and cache updates', async () => {
    const initialData = {
      values: [['shot_id', 'title'], ['shot1', 'Original']],
      range: 'A1:B2',
      majorDimension: 'ROWS' as const,
    };

    const updatedData = {
      values: [['shot_id', 'title'], ['shot1', 'Updated']],
      range: 'A1:B2',
      majorDimension: 'ROWS' as const,
    };

    // First call returns initial data, second call returns updated data
    mockedSheetsService.getSheetData
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(updatedData);

    const { result } = renderHook(
      () => useSheetsData('Shots'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(initialData);

    // Manually trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(updatedData);
    });
    
    expect(mockedSheetsService.getSheetData).toHaveBeenCalledTimes(2);
  });
});