import React, { useMemo, useState } from 'react';
import { GridColDef, GridRowModel } from '@mui/x-data-grid';
import { EntityTable, EntityTableProps } from './EntityTable';
import { Asset, EntityType, ENTITY_KIND, AssetStatus, AssetType } from '@shared/types';
import { useEntityData, useUpdateEntity, useCreateEntity } from '../../hooks/useEntityData';
import { 
  StatusCellRenderer, 
  CheckboxCellRenderer,
  ThumbnailsCellRenderer,
  FileListCellRenderer,
  VersionsCellRenderer,
  NotesCellRenderer,
  UrlCellRenderer
} from './cell-renderers';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box, FormControlLabel, Checkbox } from '@mui/material';

interface AssetTableProps extends Omit<EntityTableProps<Asset>, 'entityType' | 'entityTypeName' | 'data' | 'columns' | 'loading' | 'error' | 'onRowUpdate'> {
  filters?: Record<string, any>;
  onAssetClick?: (asset: Asset) => void;
}

export const AssetTable: React.FC<AssetTableProps> = ({ 
  filters = {}, 
  onAssetClick,
  isReadOnly = false,
  ...props 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    name: '',
    asset_type: AssetType.PROP,
    status: AssetStatus.NOT_STARTED,
    overlap_sensitive: false,
  });

  // Fetch asset data
  const { data, isLoading, error } = useEntityData<Asset>({
    entityType: ENTITY_KIND.ASSET,
    filters,
  });

  // Mutations for updating and creating assets
  const updateAsset = useUpdateEntity<Asset>(ENTITY_KIND.ASSET);
  const createAsset = useCreateEntity<Asset>(ENTITY_KIND.ASSET);

  // Define columns for the asset table
  const columns = useMemo<GridColDef[]>(() => [
    { 
      field: 'asset_id', 
      headerName: 'ID', 
      width: 100,
      editable: false,
    },
    { 
      field: 'name', 
      headerName: 'Name', 
      width: 200,
      editable: !isReadOnly,
    },
    { 
      field: 'asset_type', 
      headerName: 'Type', 
      width: 150,
      editable: !isReadOnly,
      type: 'singleSelect',
      valueOptions: Object.values(AssetType),
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      editable: !isReadOnly,
      type: 'singleSelect',
      valueOptions: Object.values(AssetStatus),
      renderCell: StatusCellRenderer,
    },
    { 
      field: 'overlap_sensitive', 
      headerName: 'Overlap Sensitive', 
      width: 150,
      editable: !isReadOnly,
      type: 'boolean',
      renderCell: CheckboxCellRenderer,
    },
    { 
      field: 'folder_url', 
      headerName: 'Folder', 
      width: 150,
      editable: false,
      renderCell: UrlCellRenderer,
    },
    { 
      field: 'thumbnails', 
      headerName: 'Thumbnails', 
      width: 200,
      editable: false,
      renderCell: ThumbnailsCellRenderer,
    },
    { 
      field: 'file_list', 
      headerName: 'Files', 
      width: 120,
      editable: false,
      renderCell: FileListCellRenderer,
    },
    { 
      field: 'versions', 
      headerName: 'Versions', 
      width: 150,
      editable: false,
      renderCell: VersionsCellRenderer,
    },
    { 
      field: 'notes', 
      headerName: 'Notes', 
      width: 200,
      editable: !isReadOnly,
      renderCell: NotesCellRenderer,
    },
  ], [isReadOnly]);

  // Handle row updates
  const handleRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const updatedAsset = await updateAsset.mutateAsync({
        id: newRow.asset_id as string,
        data: newRow as Partial<Asset>,
      });
      return updatedAsset;
    } catch (error) {
      console.error('Error updating asset:', error);
      return oldRow;
    }
  };

  // Handle row click
  const handleRowClick = (params: any) => {
    if (onAssetClick) {
      onAssetClick(params.row as Asset);
    }
  };

  // Handle adding a new asset
  const handleAddAsset = () => {
    setIsAddDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setNewAsset({
      name: '',
      asset_type: AssetType.PROP,
      status: AssetStatus.NOT_STARTED,
      overlap_sensitive: false,
    });
  };

  // Handle creating a new asset
  const handleCreateAsset = async () => {
    try {
      await createAsset.mutateAsync(newAsset);
      handleDialogClose();
    }
    catch (error) {
      console.error('Error creating asset:', error);
    }
  };

  // Handle input change in the add dialog
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setNewAsset((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  return (
    <>
      <EntityTable<Asset>
        entityType={ENTITY_KIND.ASSET}
        entityTypeName="Asset"
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        error={error?.message}
        onRowUpdate={handleRowUpdate}
        onAddEntity={isReadOnly ? undefined : handleAddAsset}
        onRowClick={handleRowClick}
        isReadOnly={isReadOnly}
        {...props}
      />

      {/* Add Asset Dialog */}
      <Dialog open={isAddDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Add New Asset</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              name="name"
              label="Name"
              fullWidth
              required
              value={newAsset.name || ''}
              onChange={handleInputChange}
            />
            <TextField
              name="asset_type"
              label="Asset Type"
              select
              fullWidth
              value={newAsset.asset_type || AssetType.PROP}
              onChange={handleInputChange}
            >
              {Object.values(AssetType).map((type) => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              name="status"
              label="Status"
              select
              fullWidth
              value={newAsset.status || AssetStatus.NOT_STARTED}
              onChange={handleInputChange}
            >
              {Object.values(AssetStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  name="overlap_sensitive"
                  checked={newAsset.overlap_sensitive || false}
                  onChange={handleInputChange}
                />
              }
              label="Overlap Sensitive"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateAsset} 
            variant="contained" 
            color="primary"
            disabled={!newAsset.name}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssetTable;