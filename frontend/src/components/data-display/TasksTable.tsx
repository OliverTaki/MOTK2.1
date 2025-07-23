import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEntityData } from '../../hooks/useEntityData';
import { DataTable, ColumnDefinition } from './DataTable';
import { Task, ENTITY_KIND } from '@shared/types';

interface TasksTableProps {
  limit?: number;
}

export const TasksTable: React.FC<TasksTableProps> = ({ limit = 50 }) => {
  const navigate = useNavigate();
  
  const { 
    data: tasksData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useEntityData<Task>({
    entityType: ENTITY_KIND.TASK,
    limit,
    sort: { field: 'task_id', direction: 'asc' }
  });

  const columns: ColumnDefinition[] = [
    { 
      fieldId: 'field_001', 
      fieldName: 'task_id', 
      displayName: 'Task ID', 
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
      fieldName: 'status', 
      displayName: 'Status', 
      sortable: true 
    },
    { 
      fieldId: 'field_004', 
      fieldName: 'assignee_id', 
      displayName: 'Assignee', 
      sortable: true 
    },
    { 
      fieldId: 'field_005', 
      fieldName: 'start_date', 
      displayName: 'Start Date', 
      sortable: true 
    },
    { 
      fieldId: 'field_006', 
      fieldName: 'end_date', 
      displayName: 'End Date', 
      sortable: true 
    }
  ];

  const handleRowClick = (task: Task) => {
    navigate(`/tasks/detail?id=${task.task_id}`);
  };

  const handleCreateTask = () => {
    navigate('/tasks/detail?action=create');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Tasks
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
            onClick={handleCreateTask}
          >
            New Task
          </Button>
        </Box>
      </Box>

      <DataTable<Task>
        data={tasksData?.data || []}
        columns={columns}
        loading={isLoading}
        error={isError ? (error as Error)?.message || 'Failed to load tasks' : null}
        onRefresh={() => refetch()}
        onRowClick={handleRowClick}
        emptyMessage="No tasks found. Create a new task to get started."
      />
    </Box>
  );
};