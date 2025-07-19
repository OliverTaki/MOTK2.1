import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sheetsService, ConflictError, CellUpdateResult, BatchUpdateResult } from '../services/sheetsService';
import { queryKeys } from '../lib/queryClient';
import { CellUpdateParams } from '@shared/types';

// Hook for fetching sheet data
export const useSheetsData = (sheetName: string, range?: string) => {
  return useQuery({
    queryKey: queryKeys.sheets.sheetRange(sheetName, range),
    queryFn: () => sheetsService.getSheetData(sheetName, range),
    enabled: !!sheetName, // Only run query if sheetName is provided
  });
};

// Hook for updating a single cell with optimistic updates
export const useCellUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CellUpdateParams) => sheetsService.updateCell(params),
    
    // Optimistic update
    onMutate: async (params: CellUpdateParams) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.sheets.sheet(params.sheetName)
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(
        queryKeys.sheets.sheet(params.sheetName)
      );

      // Optimistically update the cache
      queryClient.setQueryData(
        queryKeys.sheets.sheet(params.sheetName),
        (old: any) => {
          if (!old?.values) return old;
          
          // Find and update the specific cell
          // This is a simplified implementation - in practice, you'd need
          // to map entityId/fieldId to specific row/column coordinates
          const newData = { ...old };
          // Implementation would depend on your sheet structure
          return newData;
        }
      );

      // Return context with previous data for rollback
      return { previousData, params };
    },

    // On error, rollback the optimistic update
    onError: (error, params, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.sheets.sheet(params.sheetName),
          context.previousData
        );
      }
    },

    // Always refetch after success or error to ensure consistency
    onSettled: (data, error, params) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sheets.sheet(params.sheetName)
      });
    },
  });
};

// Hook for batch updating multiple cells
export const useBatchCellUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { updates: CellUpdateParams[] }) => 
      sheetsService.batchUpdate(params),
    
    // Optimistic update for batch operations
    onMutate: async (params) => {
      const affectedSheets = new Set(params.updates.map(u => u.sheetName));
      const previousDataMap = new Map();

      // Cancel queries and snapshot data for all affected sheets
      for (const sheetName of affectedSheets) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.sheets.sheet(sheetName)
        });
        
        const previousData = queryClient.getQueryData(
          queryKeys.sheets.sheet(sheetName)
        );
        previousDataMap.set(sheetName, previousData);

        // Apply optimistic updates
        queryClient.setQueryData(
          queryKeys.sheets.sheet(sheetName),
          (old: any) => {
            if (!old?.values) return old;
            // Apply batch updates optimistically
            return old; // Simplified - would apply actual updates
          }
        );
      }

      return { previousDataMap, affectedSheets };
    },

    // Rollback on error
    onError: (error, params, context) => {
      if (context?.previousDataMap && context?.affectedSheets) {
        for (const sheetName of context.affectedSheets) {
          const previousData = context.previousDataMap.get(sheetName);
          if (previousData) {
            queryClient.setQueryData(
              queryKeys.sheets.sheet(sheetName),
              previousData
            );
          }
        }
      }
    },

    // Refetch affected sheets
    onSettled: (data, error, params, context) => {
      if (context?.affectedSheets) {
        for (const sheetName of context.affectedSheets) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.sheets.sheet(sheetName)
          });
        }
      }
    },
  });
};

// Hook for handling cell update with conflict resolution
export const useCellUpdateWithConflictResolution = () => {
  const cellUpdateMutation = useCellUpdate();

  const updateCellWithRetry = async (
    params: CellUpdateParams,
    onConflict?: (conflictData: any) => Promise<'overwrite' | 'edit_again' | 'keep_server'>
  ) => {
    try {
      return await cellUpdateMutation.mutateAsync(params);
    } catch (error) {
      if (error instanceof ConflictError && onConflict) {
        const resolution = await onConflict(error.conflictData);
        
        switch (resolution) {
          case 'overwrite':
            // Retry with force flag
            return await cellUpdateMutation.mutateAsync({
              ...params,
              force: true
            });
          case 'edit_again':
            // Return conflict data for user to edit again
            throw error;
          case 'keep_server':
            // Don't update, return server value
            return {
              success: true,
              updatedValue: error.conflictData?.currentValue
            };
          default:
            throw error;
        }
      }
      throw error;
    }
  };

  return {
    updateCell: updateCellWithRetry,
    isLoading: cellUpdateMutation.isPending,
    error: cellUpdateMutation.error,
  };
};