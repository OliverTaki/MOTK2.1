import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { entityService } from '../services/sheetsService';
import { queryKeys } from '../lib/queryClient';
import { EntityType, EntityData, EntityQueryParams } from '@shared/types';

// Hook for fetching a list of entities with caching
export const useEntityData = <T extends EntityData>(params: EntityQueryParams) => {
  return useQuery({
    queryKey: queryKeys.entities.list(params.entityType, params),
    queryFn: () => entityService.getEntities<T>(params),
    enabled: !!params.entityType,
  });
};

// Hook for fetching a single entity
export const useEntity = <T extends EntityData>(entityType: EntityType, id: string) => {
  return useQuery({
    queryKey: queryKeys.entities.detail(entityType, id),
    queryFn: () => entityService.getEntity<T>(entityType, id),
    enabled: !!entityType && !!id,
  });
};

// Hook for infinite scrolling/pagination of entities
export const useInfiniteEntityData = <T extends EntityData>(
  entityType: EntityType,
  baseParams: Omit<EntityQueryParams, 'offset' | 'entityType'> = {}
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.entities.list(entityType, baseParams),
    queryFn: ({ pageParam = 0 }) => 
      entityService.getEntities<T>({
        ...baseParams,
        entityType,
        offset: pageParam,
        limit: baseParams.limit || 50,
      }),
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((sum, page) => sum + page.data.length, 0);
      return totalFetched < lastPage.total ? totalFetched : undefined;
    },
    enabled: !!entityType,
  });
};

// Hook for creating entities with optimistic updates
export const useCreateEntity = <T extends EntityData>(entityType: EntityType) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<T>) => entityService.createEntity<T>(entityType, data),
    
    // Optimistic update
    onMutate: async (newEntity) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.entities.type(entityType)
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(
        queryKeys.entities.list(entityType, {})
      );

      // Optimistically add the new entity to all relevant lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.entities.type(entityType) },
        (old: any) => {
          if (!old?.data) return old;
          
          // Create temporary entity with optimistic ID
          const optimisticEntity = {
            ...newEntity,
            [`${entityType}_id`]: `temp_${Date.now()}`,
          } as T;

          return {
            ...old,
            data: [optimisticEntity, ...old.data],
            total: old.total + 1,
          };
        }
      );

      return { previousData };
    },

    // On success, update cache with real entity data
    onSuccess: (newEntity, variables, context) => {
      // Remove optimistic entity and add real one
      queryClient.setQueriesData(
        { queryKey: queryKeys.entities.type(entityType) },
        (old: any) => {
          if (!old?.data) return old;
          
          // Remove any temporary entities and add the real one
          const filteredData = old.data.filter((entity: any) => 
            !entity[`${entityType}_id`]?.startsWith('temp_')
          );

          return {
            ...old,
            data: [newEntity, ...filteredData],
          };
        }
      );

      // Cache the individual entity
      queryClient.setQueryData(
        queryKeys.entities.detail(entityType, newEntity[`${entityType}_id` as keyof T] as string),
        newEntity
      );
    },

    // On error, rollback optimistic update
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.entities.list(entityType, {}),
          context.previousData
        );
      }
    },

    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.type(entityType)
      });
    },
  });
};

// Hook for updating entities with optimistic updates
export const useUpdateEntity = <T extends EntityData>(entityType: EntityType) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => 
      entityService.updateEntity<T>(entityType, id, data),
    
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.entities.detail(entityType, id)
      });

      // Snapshot the previous value
      const previousEntity = queryClient.getQueryData(
        queryKeys.entities.detail(entityType, id)
      );

      // Optimistically update the entity
      queryClient.setQueryData(
        queryKeys.entities.detail(entityType, id),
        (old: T | undefined) => old ? { ...old, ...data } : undefined
      );

      // Update entity in all lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.entities.type(entityType) },
        (old: any) => {
          if (!old?.data) return old;
          
          return {
            ...old,
            data: old.data.map((entity: T) => 
              entity[`${entityType}_id` as keyof T] === id 
                ? { ...entity, ...data }
                : entity
            ),
          };
        }
      );

      return { previousEntity, id };
    },

    // On success, update with server response
    onSuccess: (updatedEntity, { id }) => {
      queryClient.setQueryData(
        queryKeys.entities.detail(entityType, id),
        updatedEntity
      );
    },

    // On error, rollback optimistic update
    onError: (error, { id }, context) => {
      if (context?.previousEntity) {
        queryClient.setQueryData(
          queryKeys.entities.detail(entityType, id),
          context.previousEntity
        );
      }
    },

    // Refetch to ensure consistency
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.detail(entityType, id)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.type(entityType)
      });
    },
  });
};

// Hook for deleting entities
export const useDeleteEntity = (entityType: EntityType) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => entityService.deleteEntity(entityType, id),
    
    // Optimistic update
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.entities.type(entityType)
      });

      // Snapshot the previous data
      const previousData = queryClient.getQueryData(
        queryKeys.entities.list(entityType, {})
      );

      // Optimistically remove the entity
      queryClient.setQueriesData(
        { queryKey: queryKeys.entities.type(entityType) },
        (old: any) => {
          if (!old?.data) return old;
          
          return {
            ...old,
            data: old.data.filter((entity: any) => 
              entity[`${entityType}_id`] !== id
            ),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      // Remove individual entity cache
      queryClient.removeQueries({
        queryKey: queryKeys.entities.detail(entityType, id)
      });

      return { previousData, id };
    },

    // On error, rollback optimistic update
    onError: (error, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.entities.list(entityType, {}),
          context.previousData
        );
      }
    },

    // Refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.type(entityType)
      });
    },
  });
};

// Utility hook for prefetching entity data
export const usePrefetchEntity = () => {
  const queryClient = useQueryClient();

  const prefetchEntity = (entityType: EntityType, id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.entities.detail(entityType, id),
      queryFn: () => entityService.getEntity(entityType, id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  const prefetchEntityList = (params: EntityQueryParams) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.entities.list(params.entityType, params),
      queryFn: () => entityService.getEntities(params),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  return { prefetchEntity, prefetchEntityList };
};