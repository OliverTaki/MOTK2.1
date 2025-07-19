import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  DataGrid, 
  GridColDef, 
  GridRowModel, 
  GridRowId, 
  GridValueGetterParams,
  GridRenderCellParams,
  GridValueFormatterParams,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarDensitySelector,
  GridToolbarColumnsButton,
  GridRowParams,
  GridEventListener,
  GridRowEditStopReasons,
  MuiEvent
} from '@mui/x-data-grid';
import { Box, Button, CircularProgress, Typography, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { EntityType, EntityData, CellUpdateParams, PageConfigData } from '@shared/types';
import { useConflictResolution } from '../../hooks/useConflictResolution';
import { PageConfigButton } from '../page-config';

// Custom toolbar with add button and page configuration
interface EntityTableToolbarProps {
  onAddEntity?: () => void;
  entityTypeName: string;
  entityType: EntityType;
  userId: string;
  currentPageId?: string;
  onPageConfigChange?: (pageId: string) => void;
}

function EntityTableToolbar({ 
  onAddEntity, 
  entityTypeName, 
  entityType,
  userId,
  currentPageId,
  onPageConfigChange
}: EntityTableToolbarProps) {
  return (
    <GridToolbarContainer>
      {onAddEntity && (
        <Button 
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={onAddEntity}
          sx={{ mr: 2 }}
        >
          Add {entityTypeName}
        </Button>
      )}
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
      <Box sx={{ ml: 2 }}>
        <PageConfigButton 
          entityType={entityType}
          userId={userId}
          currentPageId={currentPageId}
          variant="button"
          label="Configure View"
        />
      </Box>
    </GridToolbarContainer>
  );
}

export interface EntityTableProps<T extends EntityData> {
  entityType: EntityType;
  entityTypeName: string;
  data: T[];
  columns: GridColDef[];
  loading: boolean;
  error?: string | null;
  onRowUpdate?: (newRow: GridRowModel, oldRow: GridRowModel) => Promise<GridRowModel>;
  onAddEntity?: () => void;
  onRowClick?: (params: GridRowParams) => void;
  getRowId?: (row: T) => GridRowId;
  isReadOnly?: boolean;
  pageConfig?: PageConfigData;
  currentPageId?: string;
  userId?: string;
  onPageConfigChange?: (pageId: string) => void;
}

export function EntityTable<T extends EntityData>({
  entityType,
  entityTypeName,
  data,
  columns: providedColumns,
  loading,
  error,
  onRowUpdate,
  onAddEntity,
  onRowClick,
  getRowId = (row: T) => {
    // Try to get the entity-specific ID first
    const entityIdKey = `${entityType}_id` as keyof T;
    if (row[entityIdKey] !== undefined) {
      return row[entityIdKey] as GridRowId;
    }
    // Fall back to 'id' if available
    if ('id' in row) {
      return (row as any).id as GridRowId;
    }
    // Last resort, stringify the row
    return JSON.stringify(row) as GridRowId;
  },
  isReadOnly = false,
  pageConfig,
  currentPageId,
  userId = 'current_user',
  onPageConfigChange
}: EntityTableProps<T>) {
  const { updateCell, isUpdating } = useConflictResolution();
  const [editRowsModel, setEditRowsModel] = useState({});
  
  // Apply page configuration to columns
  const columns = useMemo(() => {
    if (!pageConfig) return providedColumns;
    
    // Filter columns based on pageConfig.fields
    let configuredColumns = [...providedColumns];
    
    if (pageConfig.fields && pageConfig.fields.length > 0) {
      // Only include columns that are in the fields list
      configuredColumns = configuredColumns.filter(col => 
        pageConfig.fields!.includes(col.field)
      );
      
      // Sort columns according to the fields order
      configuredColumns.sort((a, b) => {
        const aIndex = pageConfig.fields!.indexOf(a.field);
        const bIndex = pageConfig.fields!.indexOf(b.field);
        return aIndex - bIndex;
      });
    }
    
    // Apply column widths
    if (pageConfig.fieldWidths) {
      configuredColumns = configuredColumns.map(col => ({
        ...col,
        width: pageConfig.fieldWidths![col.field] || col.width
      }));
    }
    
    return configuredColumns;
  }, [providedColumns, pageConfig]);

  // Handle row edit stop event
  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  // Process row updates with optimistic updates and conflict handling
  const processRowUpdate = useCallback(
    async (newRow: GridRowModel, oldRow: GridRowModel) => {
      if (onRowUpdate) {
        try {
          return await onRowUpdate(newRow, oldRow);
        } catch (error) {
          console.error('Error updating row:', error);
          throw error;
        }
      }

      // Default implementation if no custom handler provided
      const updatedFields: Record<string, any> = {};
      const updatePromises: Promise<any>[] = [];

      // Find changed fields
      Object.keys(newRow).forEach((key) => {
        if (newRow[key] !== oldRow[key]) {
          updatedFields[key] = newRow[key];

          // Create update params for each changed field
          const updateParams: CellUpdateParams = {
            sheetName: entityType + 's', // Assuming sheet names are plural of entity types
            entityId: newRow[`${entityType}_id`],
            fieldId: key,
            originalValue: oldRow[key],
            newValue: newRow[key],
          };

          // Add to update promises
          updatePromises.push(updateCell(updateParams));
        }
      });

      if (updatePromises.length === 0) {
        return oldRow; // No changes
      }

      try {
        // Wait for all updates to complete
        await Promise.all(updatePromises);
        return newRow;
      } catch (error) {
        console.error('Error updating row:', error);
        throw error;
      }
    },
    [entityType, onRowUpdate, updateCell]
  );

  // Apply sorting from page configuration
  const initialState = useMemo(() => {
    const state: any = {
      pagination: {
        paginationModel: { page: 0, pageSize: 25 },
      }
    };
    
    // Apply sorting if defined in page config
    if (pageConfig?.sorting && pageConfig.sorting.field) {
      state.sorting = {
        sortModel: [
          {
            field: pageConfig.sorting.field,
            sort: pageConfig.sorting.direction
          }
        ]
      };
    }
    
    // Apply filters if defined in page config
    if (pageConfig?.filters && Object.keys(pageConfig.filters).length > 0) {
      const filterModel: any = {
        items: Object.entries(pageConfig.filters).map(([field, value]) => {
          // Handle different filter types
          if (typeof value === 'object' && value !== null) {
            if (value.$ne !== undefined) {
              return { field, operator: 'notEquals', value: value.$ne };
            }
            if (value.$gt !== undefined) {
              return { field, operator: 'greaterThan', value: value.$gt };
            }
            if (value.$lt !== undefined) {
              return { field, operator: 'lessThan', value: value.$lt };
            }
            if (value.$regex !== undefined) {
              return { field, operator: 'contains', value: value.$regex };
            }
            if (value.$in !== undefined) {
              return { field, operator: 'in', value: value.$in };
            }
          }
          
          // Default equals operator
          return { field, operator: 'equals', value };
        })
      };
      
      state.filter = filterModel;
    }
    
    return state;
  }, [pageConfig]);

  // Custom toolbar with entity type name and page configuration
  const CustomToolbar = useCallback(
    () => (
      <EntityTableToolbar 
        onAddEntity={onAddEntity} 
        entityTypeName={entityTypeName}
        entityType={entityType}
        userId={userId}
        currentPageId={currentPageId}
        onPageConfigChange={onPageConfigChange}
      />
    ),
    [onAddEntity, entityTypeName, entityType, userId, currentPageId, onPageConfigChange]
  );

  // Render loading or error states
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={data}
        columns={columns}
        getRowId={getRowId}
        loading={loading || isUpdating}
        processRowUpdate={isReadOnly ? undefined : processRowUpdate}
        onRowEditStop={handleRowEditStop}
        onRowClick={onRowClick}
        editMode="row"
        slots={{
          toolbar: CustomToolbar,
        }}
        initialState={initialState}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-cell--editing': {
            bgcolor: 'rgb(255,215,115, 0.19)',
            color: '#1a3e72',
          },
          '& .Mui-error': {
            bgcolor: (theme) => `rgb(126,10,15, ${theme.palette.mode === 'dark' ? 0 : 0.1})`,
            color: (theme) => (theme.palette.mode === 'dark' ? '#ff4343' : '#750f0f'),
          },
        }}
      />
    </Box>
  );
}

export default EntityTable;