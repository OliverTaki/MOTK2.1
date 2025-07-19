import React, { useMemo, useState } from 'react';
import { GridColDef, GridRowModel } from '@mui/x-data-grid';
import { EntityTable, EntityTableProps } from './EntityTable';
import { Shot, EntityType, ENTITY_KIND, ShotStatus } from '@shared/types';
import { useEntityData, useUpdateEntity, useCreateEntity } from '../../hooks/useEntityData';
import { 
  StatusCellRenderer, 
  DateCellRenderer, 
  PriorityCellRenderer, 
  ThumbnailsCellRenderer,
  FileListCellRenderer,
  VersionsCellRenderer,
  NotesCellRenderer,
  UrlCellRenderer
} from './cell-renderers';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box } from '@mui/material';

interface ShotTableProps extends Omit<EntityTableProps<Shot>, 'entityType' | 'entityTypeName' | 'data' | 'columns' | 'loading' | 'error' | 'onRowUpdate'> {
  filters?: Record<string, any>;
  onShotClick?: (shot: Shot) => void;
}

export const ShotTable: React.FC<ShotTableProps> = ({ 
  filters = {}, 
  onShotClick,
  isReadOnly = false,
  ...props 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newShot, setNewShot] = useState<Partial<Shot>>({
    title: '',
    status: ShotStatus.NOT_STARTED,
  });

  // Fetch shot data
  const { data, isLoading, error } = useEntityData<Shot>({
    entityType: ENTITY_KIND.SHOT,
    filters,
  });

  // Mutations for updating and creating shots
  const updateShot = useUpdateEntity<Shot>(ENTITY_KIND.SHOT);
  const createShot = useCreateEntity<Shot>(ENTITY_KIND.SHOT);

  // Define columns for the shot table
  const columns = useMemo<GridColDef[]>(() => [
    { 
      field: 'shot_id', 
      headerName: 'ID', 
      width: 100,
      editable: false,
    },
    { 
      field: 'episode', 
      headerName: 'Episode', 
      width: 120,
      editable: !isReadOnly,
    },
    { 
      field: 'scene', 
      headerName: 'Scene', 
      width: 120,
      editable: !isReadOnly,
    },
    { 
      field: 'title', 
      headerName: 'Title', 
      width: 200,
      editable: !isReadOnly,
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      editable: !isReadOnly,
      type: 'singleSelect',
      valueOptions: Object.values(ShotStatus),
      renderCell: StatusCellRenderer,
    },
    { 
      field: 'priority', 
      headerName: 'Priority', 
      width: 120,
      editable: !isReadOnly,
      type: 'singleSelect',
      valueOptions: [
        { value: 1, label: 'High' },
        { value: 2, label: 'Medium' },
        { value: 3, label: 'Low' },
      ],
      renderCell: PriorityCellRenderer,
    },
    { 
      field: 'due_date', 
      headerName: 'Due Date', 
      width: 150,
      editable: !isReadOnly,
      type: 'date',
      renderCell: DateCellRenderer,
    },
    { 
      field: 'timecode_fps', 
      headerName: 'Timecode/FPS', 
      width: 150,
      editable: !isReadOnly,
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
      const updatedShot = await updateShot.mutateAsync({
        id: newRow.shot_id as string,
        data: newRow as Partial<Shot>,
      });
      return updatedShot;
    } catch (error) {
      console.error('Error updating shot:', error);
      return oldRow;
    }
  };

  // Handle row click
  const handleRowClick = (params: any) => {
    if (onShotClick) {
      onShotClick(params.row as Shot);
    }
  };

  // Handle adding a new shot
  const handleAddShot = () => {
    setIsAddDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setNewShot({
      title: '',
      status: ShotStatus.NOT_STARTED,
    });
  };

  // Handle creating a new shot
  const handleCreateShot = async () => {
    try {
      await createShot.mutateAsync(newShot);
      handleDialogClose();
    }
    catch (error) {
      console.error('Error creating shot:', error);
    }
  };

  // Handle input change in the add dialog
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewShot((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <EntityTable<Shot>
        entityType={ENTITY_KIND.SHOT}
        entityTypeName="Shot"
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        error={error?.message}
        onRowUpdate={handleRowUpdate}
        onAddEntity={isReadOnly ? undefined : handleAddShot}
        onRowClick={handleRowClick}
        isReadOnly={isReadOnly}
        {...props}
      />

      {/* Add Shot Dialog */}
      <Dialog open={isAddDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Add New Shot</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              name="episode"
              label="Episode"
              fullWidth
              value={newShot.episode || ''}
              onChange={handleInputChange}
            />
            <TextField
              name="scene"
              label="Scene"
              fullWidth
              value={newShot.scene || ''}
              onChange={handleInputChange}
            />
            <TextField
              name="title"
              label="Title"
              fullWidth
              required
              value={newShot.title || ''}
              onChange={handleInputChange}
            />
            <TextField
              name="status"
              label="Status"
              select
              fullWidth
              value={newShot.status || ShotStatus.NOT_STARTED}
              onChange={handleInputChange}
            >
              {Object.values(ShotStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              name="priority"
              label="Priority"
              select
              fullWidth
              value={newShot.priority || ''}
              onChange={handleInputChange}
            >
              <MenuItem value={1}>High</MenuItem>
              <MenuItem value={2}>Medium</MenuItem>
              <MenuItem value={3}>Low</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateShot} 
            variant="contained" 
            color="primary"
            disabled={!newShot.title}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShotTable;