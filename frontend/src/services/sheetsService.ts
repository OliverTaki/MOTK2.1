import { apiRequest } from '../api/client';
import { ApiResponse, CellUpdateParams, EntityType, EntityData, EntityQueryParams, EntityListResult } from '@shared/types';

// Sheet data types
export interface SheetData {
  values: any[][];
  range: string;
  majorDimension: 'ROWS' | 'COLUMNS';
}

export interface CellUpdateResult {
  success: boolean;
  updatedValue: any;
  conflicts?: any;
}

export interface BatchUpdateParams {
  updates: CellUpdateParams[];
}

export interface BatchUpdateResult {
  success: boolean;
  results: CellUpdateResult[];
  conflicts?: any[];
}

// Sheets API service functions
export const sheetsService = {
  // Get sheet data
  getSheetData: async (sheetName: string, range?: string): Promise<SheetData> => {
    const url = range 
      ? `/sheets/${sheetName}?range=${encodeURIComponent(range)}`
      : `/sheets/${sheetName}`;
    
    const response = await apiRequest<SheetData>('GET', url);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch sheet data');
    }
    
    return response.data;
  },

  // Update single cell with conflict detection
  updateCell: async (params: CellUpdateParams): Promise<CellUpdateResult> => {
    const response = await apiRequest<CellUpdateResult>('PUT', `/sheets/${params.sheetName}/cell`, params);
    
    if (!response.success) {
      // Handle conflict errors (409 status)
      if (response.error === 'Conflict detected') {
        throw new ConflictError(response.message || 'Cell was modified by another user', response.data);
      }
      throw new Error(response.error || 'Failed to update cell');
    }
    
    return response.data!;
  },

  // Batch update multiple cells
  batchUpdate: async (params: BatchUpdateParams): Promise<BatchUpdateResult> => {
    const response = await apiRequest<BatchUpdateResult>('POST', '/sheets/batch', params);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to batch update cells');
    }
    
    return response.data;
  },
};

// Entity API service functions
export const entityService = {
  // Get list of entities
  getEntities: async <T extends EntityData>(params: EntityQueryParams): Promise<EntityListResult<T>> => {
    const queryParams = new URLSearchParams();
    
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }
    if (params.sort) {
      queryParams.append('sort', JSON.stringify(params.sort));
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.offset) {
      queryParams.append('offset', params.offset.toString());
    }
    
    const url = `/entities/${params.entityType}?${queryParams.toString()}`;
    const response = await apiRequest<EntityListResult<T>>('GET', url);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch entities');
    }
    
    return response.data;
  },

  // Get single entity
  getEntity: async <T extends EntityData>(entityType: EntityType, id: string): Promise<T> => {
    const response = await apiRequest<T>('GET', `/entities/${entityType}/${id}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch entity');
    }
    
    return response.data;
  },

  // Create new entity
  createEntity: async <T extends EntityData>(entityType: EntityType, data: Partial<T>): Promise<T> => {
    const response = await apiRequest<T>('POST', `/entities/${entityType}`, data);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create entity');
    }
    
    return response.data;
  },

  // Update entity
  updateEntity: async <T extends EntityData>(entityType: EntityType, id: string, data: Partial<T>): Promise<T> => {
    const response = await apiRequest<T>('PUT', `/entities/${entityType}/${id}`, data);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update entity');
    }
    
    return response.data;
  },

  // Delete entity
  deleteEntity: async (entityType: EntityType, id: string): Promise<void> => {
    const response = await apiRequest<void>('DELETE', `/entities/${entityType}/${id}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete entity');
    }
  },
};

// Custom error class for conflict handling
export class ConflictError extends Error {
  public conflictData: any;
  
  constructor(message: string, conflictData?: any) {
    super(message);
    this.name = 'ConflictError';
    this.conflictData = conflictData;
  }
}