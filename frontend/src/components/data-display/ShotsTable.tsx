import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEntityData } from '../../hooks/useEntityData';
import { DataTable, ColumnDefinition } from './DataTable';
import { Shot, ENTITY_KIND } from '@shared/types';

interface ShotsTableProps {
  limit?: number;
}

export const ShotsTable: React.FC<ShotsTableProps> = ({ limit = 50 }) => {
  const navigate = useNavigate();
  
  const { 
    data: shotsData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useEntityData<Shot>({
    entityType: ENTITY_KIND.SHOT,
    limit,
    sort: { field: 'shot_id', direction: 'asc' }
  });
  
  // デバッグ用のログ出力
  console.log('ShotsTable - API Response:', { 
    shotsData, 
    isLoading, 
    isError, 
    error,
    dataLength: shotsData?.data?.length || 0
  });
  
  // データの詳細をログ出力
  if (shotsData?.data) {
    console.log('Shots data details:', JSON.stringify(shotsData.data, null, 2));
  }

  const columns: ColumnDefinition[] = [
    { 
      fieldId: 'field_001', 
      fieldName: 'shot_id', 
      displayName: 'Shot ID', 
      sortable: true 
    },
    { 
      fieldId: 'field_002', 
      fieldName: 'title', 
      displayName: 'Title', 
      sortable: true 
    },
    { 
      fieldId: 'field_003', 
      fieldName: 'status', 
      displayName: 'Status', 
      sortable: true 
    },
    { 
      fieldId: 'field_004', 
      fieldName: 'priority', 
      displayName: 'Priority', 
      sortable: true,
      formatter: (value) => value ? `${value}` : '-'
    },
    { 
      fieldId: 'field_005', 
      fieldName: 'due_date', 
      displayName: 'Due Date', 
      sortable: true 
    }
  ];

  const handleRowClick = (shot: Shot) => {
    navigate(`/shots/detail?id=${shot.shot_id}`);
  };

  const handleCreateShot = () => {
    navigate('/shots/detail?action=create');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Shots
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
            onClick={handleCreateShot}
          >
            New Shot
          </Button>
        </Box>
      </Box>

      <DataTable<Shot>
        data={shotsData?.data || []}
        columns={columns}
        loading={isLoading}
        error={isError ? (error as Error)?.message || 'Failed to load shots' : null}
        onRefresh={() => refetch()}
        onRowClick={handleRowClick}
        emptyMessage="No shots found. Create a new shot to get started."
      />
    </Box>
  );
};