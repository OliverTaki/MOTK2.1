import React, { useMemo, useState, useEffect } from 'react';
import { GridColDef, GridRowModel } from '@mui/x-data-grid';
import { EntityTable, EntityTableProps } from './EntityTable';
import { Task, EntityType, ENTITY_KIND, TaskStatus, Shot, User } from '@shared/types';
import { useEntityData, useUpdateEntity, useCreateEntity } from '../../hooks/useEntityData';
import { 
  StatusCellRenderer, 
  DateCellRenderer,
  NotesCellRenderer,
  UrlCellRenderer
} from './cell-renderers';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box } from '@mui/material';

interface TaskTableProps extends Omit<EntityTableProps<Task>, 'entityType' | 'entityTypeName' | 'data' | 'columns' | 'loading' | 'error' | 'onRowUpdate'> {
  filters?: Record<string, any>;
  onTaskClick?: (task: Task) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({ 
  filters = {}, 
  onTaskClick,
  isReadOnly = false,
  ...props 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    name: '',
    status: TaskStatus.NOT_STARTED,
  });
  const [shots, setShots] = useState<Shot[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Fetch task data
  const { data, isLoading, error } = useEntityData<Task>({
    entityType: ENTITY_KIND.TASK,
    filters,
  });

  // Fetch shots and users for linking
  const { data: shotsData } = useEntityData<Shot>({
    entityType: ENTITY_KIND.SHOT,
  });

  const { data: usersData } = useEntityData<User>({
    entityType: ENTITY_KIND.USER,
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (shotsData?.data) {
      setShots(shotsData.data);
    }
  }, [shotsData]);

  useEffect(() => {
    if (usersData?.data) {
      setUsers(usersData.data);
    }
  }, [usersData]);

  // Mutations for updating and creating tasks
  const updateTask = useUpdateEntity<Task>(ENTITY_KIND.TASK);
  const createTask = useCreateEntity<Task>(ENTITY_KIND.TASK);

  // Define columns for the task table
  const columns = useMemo<GridColDef[]>(() => [
    { 
      field: 'task_id', 
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
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      editable: !isReadOnly,
      type: 'singleSelect',
      valueOptions: Object.values(TaskStatus),
      renderCell: StatusCellRenderer,
    },
    { 
      field: 'assignee_id', 
      headerName: 'Assignee', 
      width: 150,
      editable: !isReadOnly,
      type: 'singleSelect',
      valueOptions: users.map(user => ({ value: user.user_id, label: user.name })),
      valueFormatter: (params) => {
        const userId = params.value as string;
        const user = users.find(u => u.user_id === userId);
        return user ? user.name : userId;
      },
    },
    { 
      field: 'start_date', 
      headerName: 'Start Date', 
      width: 150,
      editable: !isReadOnly,
      type: 'date',
      renderCell: DateCellRenderer,
    },
    { 
      field: 'end_date', 
      headerName: 'End Date', 
      width: 150,
      editable: !isReadOnly,
      type: 'date',
      renderCell: DateCellRenderer,
    },
    { 
      field: 'shot_id', 
      headerName: 'Shot', 
      width: 150,
      editable: !isReadOnly,
      type: 'singleSelect',
      valueOptions: shots.map(shot => ({ value: shot.shot_id, label: shot.title })),
      valueFormatter: (params) => {
        const shotId = params.value as string;
        const shot = shots.find(s => s.shot_id === shotId);
        return shot ? shot.title : shotId;
      },
    },
    { 
      field: 'folder_url', 
      headerName: 'Folder', 
      width: 150,
      editable: false,
      renderCell: UrlCellRenderer,
    },
    { 
      field: 'notes', 
      headerName: 'Notes', 
      width: 200,
      editable: !isReadOnly,
      renderCell: NotesCellRenderer,
    },
  ], [isReadOnly, shots, users]);

  // Handle row updates
  const handleRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const updatedTask = await updateTask.mutateAsync({
        id: newRow.task_id as string,
        data: newRow as Partial<Task>,
      });
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      return oldRow;
    }
  };

  // Handle row click
  const handleRowClick = (params: any) => {
    if (onTaskClick) {
      onTaskClick(params.row as Task);
    }
  };

  // Handle adding a new task
  const handleAddTask = () => {
    setIsAddDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setNewTask({
      name: '',
      status: TaskStatus.NOT_STARTED,
    });
  };

  // Handle creating a new task
  const handleCreateTask = async () => {
    try {
      await createTask.mutateAsync(newTask);
      handleDialogClose();
    }
    catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // Handle input change in the add dialog
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  // Handle date change in the add dialog
  const handleDateChange = (name: string, value: string | null) => {
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <EntityTable<Task>
        entityType={ENTITY_KIND.TASK}
        entityTypeName="Task"
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        error={error?.message}
        onRowUpdate={handleRowUpdate}
        onAddEntity={isReadOnly ? undefined : handleAddTask}
        onRowClick={handleRowClick}
        isReadOnly={isReadOnly}
        {...props}
      />

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              name="name"
              label="Name"
              fullWidth
              required
              value={newTask.name || ''}
              onChange={handleInputChange}
            />
            <TextField
              name="status"
              label="Status"
              select
              fullWidth
              value={newTask.status || TaskStatus.NOT_STARTED}
              onChange={handleInputChange}
            >
              {Object.values(TaskStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              name="assignee_id"
              label="Assignee"
              select
              fullWidth
              value={newTask.assignee_id || ''}
              onChange={handleInputChange}
            >
              <MenuItem value="">None</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.user_id} value={user.user_id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              name="shot_id"
              label="Shot"
              select
              fullWidth
              value={newTask.shot_id || ''}
              onChange={handleInputChange}
            >
              <MenuItem value="">None</MenuItem>
              {shots.map((shot) => (
                <MenuItem key={shot.shot_id} value={shot.shot_id}>
                  {shot.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              name="start_date"
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newTask.start_date || ''}
              onChange={handleInputChange}
            />
            <TextField
              name="end_date"
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newTask.end_date || ''}
              onChange={handleInputChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateTask} 
            variant="contained" 
            color="primary"
            disabled={!newTask.name}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskTable;