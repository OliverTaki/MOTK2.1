import React from 'react';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { 
  Chip, 
  Box, 
  Typography, 
  Link, 
  Checkbox, 
  Tooltip,
  ImageList,
  ImageListItem
} from '@mui/material';
import { 
  ShotStatus, 
  AssetStatus, 
  TaskStatus, 
  FileReference, 
  VersionReference 
} from '@shared/types';
import { format } from 'date-fns';

// Status cell renderer with color-coded chips
export const StatusCellRenderer = (params: GridRenderCellParams) => {
  const value = params.value as ShotStatus | AssetStatus | TaskStatus;
  
  if (!value) return null;
  
  const statusColors: Record<string, { color: string; backgroundColor: string }> = {
    not_started: { color: '#555', backgroundColor: '#eee' },
    in_progress: { color: '#fff', backgroundColor: '#2196f3' },
    review: { color: '#fff', backgroundColor: '#ff9800' },
    blocked: { color: '#fff', backgroundColor: '#f44336' },
    approved: { color: '#fff', backgroundColor: '#4caf50' },
    completed: { color: '#fff', backgroundColor: '#4caf50' },
  };
  
  const statusLabels: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    review: 'Review',
    blocked: 'Blocked',
    approved: 'Approved',
    completed: 'Completed',
  };
  
  const style = statusColors[value] || { color: '#555', backgroundColor: '#eee' };
  const label = statusLabels[value] || value;
  
  return (
    <Chip 
      label={label} 
      size="small" 
      sx={{ 
        color: style.color, 
        backgroundColor: style.backgroundColor,
        fontWeight: 500
      }} 
    />
  );
};

// Date cell renderer
export const DateCellRenderer = (params: GridRenderCellParams) => {
  const value = params.value;
  
  if (!value) return null;
  
  try {
    const date = new Date(value);
    return <Typography>{format(date, 'MMM d, yyyy')}</Typography>;
  } catch (error) {
    return <Typography>{String(value)}</Typography>;
  }
};

// URL cell renderer
export const UrlCellRenderer = (params: GridRenderCellParams) => {
  const value = params.value as string;
  
  if (!value) return null;
  
  return (
    <Link 
      href={value} 
      target="_blank" 
      rel="noopener noreferrer"
      underline="hover"
      sx={{ 
        display: 'block',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}
    >
      {new URL(value).hostname}
    </Link>
  );
};

// Checkbox cell renderer
export const CheckboxCellRenderer = (params: GridRenderCellParams) => {
  const value = Boolean(params.value);
  
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Checkbox checked={value} disabled />
    </Box>
  );
};

// Thumbnails cell renderer
export const ThumbnailsCellRenderer = (params: GridRenderCellParams) => {
  const files = params.value as FileReference[] | undefined;
  
  if (!files || files.length === 0) return null;
  
  // Show up to 3 thumbnails
  const displayFiles = files.slice(0, 3);
  const remainingCount = Math.max(0, files.length - 3);
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <ImageList sx={{ width: 150, height: 60, m: 0 }} cols={3} rowHeight={60}>
        {displayFiles.map((file) => (
          <ImageListItem key={file.id}>
            <img
              src={file.url}
              alt={file.name}
              loading="lazy"
              style={{ objectFit: 'cover', height: '100%', width: '100%' }}
            />
          </ImageListItem>
        ))}
      </ImageList>
      {remainingCount > 0 && (
        <Typography variant="caption" sx={{ ml: 1 }}>
          +{remainingCount} more
        </Typography>
      )}
    </Box>
  );
};

// File list cell renderer
export const FileListCellRenderer = (params: GridRenderCellParams) => {
  const files = params.value as FileReference[] | undefined;
  
  if (!files || files.length === 0) return null;
  
  return (
    <Tooltip title={`${files.length} files`}>
      <Typography>
        {files.length} file{files.length !== 1 ? 's' : ''}
      </Typography>
    </Tooltip>
  );
};

// Versions cell renderer
export const VersionsCellRenderer = (params: GridRenderCellParams) => {
  const versions = params.value as VersionReference | undefined;
  
  if (!versions || !versions.latest) return null;
  
  return (
    <Tooltip title={`${versions.versions.length} versions - Latest: ${versions.latest.name}`}>
      <Typography>
        v{versions.versions.length} - {versions.latest.name}
      </Typography>
    </Tooltip>
  );
};

// Priority cell renderer
export const PriorityCellRenderer = (params: GridRenderCellParams) => {
  const value = params.value as number;
  
  if (value === undefined || value === null) return null;
  
  const priorityColors: Record<number, string> = {
    1: '#f44336', // High - Red
    2: '#ff9800', // Medium - Orange
    3: '#4caf50', // Low - Green
  };
  
  const priorityLabels: Record<number, string> = {
    1: 'High',
    2: 'Medium',
    3: 'Low',
  };
  
  const color = priorityColors[value] || '#757575';
  const label = priorityLabels[value] || `Priority ${value}`;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: color,
          mr: 1,
        }}
      />
      <Typography>{label}</Typography>
    </Box>
  );
};

// Notes cell renderer
export const NotesCellRenderer = (params: GridRenderCellParams) => {
  const value = params.value as string;
  
  if (!value) return null;
  
  return (
    <Tooltip title={value}>
      <Typography
        sx={{
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Tooltip>
  );
};