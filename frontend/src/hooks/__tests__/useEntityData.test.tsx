import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi } from 'vitest';
import { 
  useEntityData, 
  useEntity, 
  useCreateEntity, 
  useUpdateEntity, 
  useDeleteEntity,
  usePrefetchEntity 
} from '../useEntityData';
import { entityService } from '../../services/sheetsService';
import { ENTITY_KIND, Shot, Asset, EntityQueryParams } from '@shared/types';

// Mock the entity service
vi.mock('../../services/sheetsService');
const mockedEntityService = entityService as any;

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

// Mock data
const mockShot: Shot = {
  shot_id: 'shot1',
  title: 'Test Shot',
  status: 'not_started' as any,
  episode: 'E01',
  scene: 'S01',
};

const mockAsset: Asset = {
  asset_id: 'asset1',
  name: 'Test Asset',
  asset_type: 'character' as any,
  status: 'not_started' as any,
};

describe('useEntityData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch entity list successfully', async () => {
    const mockResult = {
      success: true,
      data: [mockShot],
      total: 1,
      offset: 0,
      limit: 50,
    };

    mockedEntityService.getEntities.mockResolvedValue(mockResult);

    const params: EntityQueryParams = {
      entityType: EntityTypes.SHOT,
      limit: 50,
    };

    const { result } = renderHook(
      () => useEntityData<Shot>(params),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResult);
    expect(mockedEntityService.getEntities).toHaveBeenCalledWith(params);
  });

  it('should handle fetch errors', async () => {
    mockedEntityService.getEntities.mockRejectedValue(new Error('Fetch failed'));

    const params: EntityQueryParams = {
      entityType: EntityTypes.SHOT,
    };

    const { result } = renderHook(
      () => useEntityData<Shot>(params),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Fetch failed'));
  });

  it('should not fetch when entityType is empty', () => {
    const params: EntityQueryParams = {
      entityType: '' as EntityType,
    };

    const { result } = renderHook(
      () => useEntityData<Shot>(params),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockedEntityService.getEntities).not.toHaveBeenCalled();
  });
});

describe('useEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single entity successfully', async () => {
    mockedEntityService.getEntity.mockResolvedValue(mockShot);

    const { result } = renderHook(
      () => useEntity<Shot>(EntityTypes.SHOT, 'shot1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockShot);
    expect(mockedEntityService.getEntity).toHaveBeenCalledWith(EntityTypes.SHOT, 'shot1');
  });

  it('should handle single entity fetch errors', async () => {
    mockedEntityService.getEntity.mockRejectedValue(new Error('Entity not found'));

    const { result } = renderHook(
      () => useEntity<Shot>(EntityTypes.SHOT, 'shot1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Entity not found'));
  });
});

describe('useCreateEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create entity successfully', async () => {
    const newShotData = {
      title: 'New Shot',
      status: 'not_started' as any,
    };

    const createdShot = {
      ...newShotData,
      shot_id: 'shot2',
    };

    mockedEntityService.createEntity.mockResolvedValue(createdShot);

    const { result } = renderHook(
      () => useCreateEntity<Shot>(EntityTypes.SHOT),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync(newShotData);

    expect(mockedEntityService.createEntity).toHaveBeenCalledWith(EntityTypes.SHOT, newShotData);
  });

  it('should handle create errors', async () => {
    const newShotData = {
      title: 'New Shot',
      status: 'not_started' as any,
    };

    mockedEntityService.createEntity.mockRejectedValue(new Error('Create failed'));

    const { result } = renderHook(
      () => useCreateEntity<Shot>(EntityTypes.SHOT),
      { wrapper: createWrapper() }
    );

    await expect(result.current.mutateAsync(newShotData)).rejects.toThrow('Create failed');
  });
});

describe('useUpdateEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update entity successfully', async () => {
    const updateData = {
      title: 'Updated Shot',
    };

    const updatedShot = {
      ...mockShot,
      ...updateData,
    };

    mockedEntityService.updateEntity.mockResolvedValue(updatedShot);

    const { result } = renderHook(
      () => useUpdateEntity<Shot>(EntityTypes.SHOT),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({ id: 'shot1', data: updateData });

    expect(mockedEntityService.updateEntity).toHaveBeenCalledWith(
      EntityTypes.SHOT, 
      'shot1', 
      updateData
    );
  });

  it('should handle update errors', async () => {
    const updateData = {
      title: 'Updated Shot',
    };

    mockedEntityService.updateEntity.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(
      () => useUpdateEntity<Shot>(EntityTypes.SHOT),
      { wrapper: createWrapper() }
    );

    await expect(
      result.current.mutateAsync({ id: 'shot1', data: updateData })
    ).rejects.toThrow('Update failed');
  });
});

describe('useDeleteEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete entity successfully', async () => {
    mockedEntityService.deleteEntity.mockResolvedValue();

    const { result } = renderHook(
      () => useDeleteEntity(EntityTypes.SHOT),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync('shot1');

    expect(mockedEntityService.deleteEntity).toHaveBeenCalledWith(EntityTypes.SHOT, 'shot1');
  });

  it('should handle delete errors', async () => {
    mockedEntityService.deleteEntity.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(
      () => useDeleteEntity(EntityTypes.SHOT),
      { wrapper: createWrapper() }
    );

    await expect(result.current.mutateAsync('shot1')).rejects.toThrow('Delete failed');
  });
});

describe('usePrefetchEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prefetch entity data', () => {
    mockedEntityService.getEntity.mockResolvedValue(mockShot);

    const { result } = renderHook(
      () => usePrefetchEntity(),
      { wrapper: createWrapper() }
    );

    result.current.prefetchEntity(EntityTypes.SHOT, 'shot1');

    // Prefetch is async, so we just verify the service was called
    expect(mockedEntityService.getEntity).toHaveBeenCalledWith(EntityTypes.SHOT, 'shot1');
  });

  it('should prefetch entity list', () => {
    const mockResult = {
      success: true,
      data: [mockShot],
      total: 1,
      offset: 0,
      limit: 50,
    };

    mockedEntityService.getEntities.mockResolvedValue(mockResult);

    const { result } = renderHook(
      () => usePrefetchEntity(),
      { wrapper: createWrapper() }
    );

    const params: EntityQueryParams = {
      entityType: EntityTypes.SHOT,
      limit: 50,
    };

    result.current.prefetchEntityList(params);

    expect(mockedEntityService.getEntities).toHaveBeenCalledWith(params);
  });
});