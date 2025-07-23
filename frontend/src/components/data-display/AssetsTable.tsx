import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEntityData } from '../../hooks/useEntityData';
import { DataTable, ColumnDefinition } from './DataTable';
import { Asset, ENTITY_KIND } from '@shared/types';

interface AssetsTableProps {
  limit?: number;
}

export const AssetsTable: React.FC<AssetsTableProps> = ({ limit = 50 }) => {
  const navigate = useNavigate();
  
  const { 
    data: assetsData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useEntityData<Asset>({
    entityType: ENTITY_KIND.ASSET,
    limit,
    sort: { field: 'asset_id', direction: 'asc' }
  });

  const columns: ColumnDefinition[] = [
    { 
      fieldId: 'field_001', 
      fieldName: 'asset_id', 
      displayName: 'Asset ID', 
      sortable: true 
    },
    { 
      fieldId: 'field_002', 
      fieldName: 'name', 
      displayName: 'Name', 
      sortable: true 
    },
    { 
      fieldId: 'field_003', 
      fieldName: 'asset_type', 
      displayName: 'Type', 
      sortable: true 
    },
    { 
      fieldId: 'field_004', 
      fieldName: 'status', 
      displayName: 'Status', 
      sortable: true 
    }
  ];

  const handleRowClick = (asset: Asset) => {
    navigate(`/assets/detail?id=${asset.asset_id}`);
  };

  const handleCreateAsset = () => {
    navigate('/assets/detail?action=create');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Assets
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateAsset}
          >
            New Asset
          </Button>
        </Box>
      </Box>

      <DataTable<Asset>
        data={assetsData?.data || []}
        columns={columns}
        loading={isLoading}
        error={isError ? (error as Error)?.message || 'Failed to load assets' : null}
        onRefresh={() => refetch()}
        onRowClick={handleRowClick}
        emptyMessage="No assets found. Create a new asset to get started."
      />
    </Box>
  );
};