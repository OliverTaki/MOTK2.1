import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  TextField,
  InputAdornment,
  TableSortLabel,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { FileReference } from '@shared/types';
import axios from 'axios';
import { format } from 'date-fns';

interface FileListProps {
  files: FileReference[];
  entityType: string;
  entityId: string;
  fieldName?: string;
  onFileDelete?: (deletedFile: FileReference) => void;
  readOnly?: boolean;
  height?: number | string;
}

type SortField = 'name' | 'size' | 'createdAt' | 'mimeType';
type SortDirection = 'asc' | 'desc';

const FileList: React.FC<FileListProps> = ({
  files,
  entityType,
  entityId,
  fieldName,
  onFileDelete,
  readOnly = false,
  height = 400
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = useState<FileReference | null>(null);

  // Handle file deletion
  const handleDelete = async (file: FileReference) => {
    if (readOnly) return;
    
    try {
      setIsDeleting(file.id);
      setError(null);
      
      const endpoint = `/api/files/${entityType}/${entityId}/${file.name}${fieldName ? `?fieldName=${fieldName}` : ''}`;
      
      const response = await axios.delete(endpoint);
      
      if (response.data.success) {
        if (onFileDelete) {
          onFileDelete(file);
        }
      } else {
        throw new Error(response.data.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle sort change
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format file type
  const formatFileType = (mimeType: string) => {
    const parts = mimeType.split('/');
    return parts[1]?.toUpperCase() || mimeType;
  };

  // Open file menu
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, file: FileReference) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  // Close file menu
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setSelectedFile(null);
  };

  // Copy file URL to clipboard
  const handleCopyUrl = () => {
    if (selectedFile) {
      navigator.clipboard.writeText(selectedFile.url);
      handleCloseMenu();
    }
  };

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    // Filter files by search term
    let result = files;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = files.filter(file => 
        file.name.toLowerCase().includes(term) || 
        formatFileType(file.mimeType).toLowerCase().includes(term)
      );
    }
    
    // Sort files
    result = [...result].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'mimeType':
          comparison = a.mimeType.localeCompare(b.mimeType);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [files, searchTerm, sortField, sortDirection]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Search and filter */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {/* File list table */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          height, 
          maxHeight: height,
          overflow: 'auto'
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortDirection : 'asc'}
                  onClick={() => handleSortChange('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'mimeType'}
                  direction={sortField === 'mimeType' ? sortDirection : 'asc'}
                  onClick={() => handleSortChange('mimeType')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'size'}
                  direction={sortField === 'size' ? sortDirection : 'asc'}
                  onClick={() => handleSortChange('size')}
                >
                  Size
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'createdAt'}
                  direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                  onClick={() => handleSortChange('createdAt')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedFiles.length > 0 ? (
              filteredAndSortedFiles.map((file) => (
                <TableRow key={file.id} hover>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {file.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatFileType(file.mimeType)}</TableCell>
                  <TableCell align="right">{formatFileSize(file.size)}</TableCell>
                  <TableCell>
                    {format(new Date(file.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="More options">
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenMenu(e, file)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {!readOnly && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(file)}
                            disabled={isDeleting === file.id}
                          >
                            {isDeleting === file.id ? (
                              <CircularProgress size={20} />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                    {searchTerm ? 'No files match your search' : 'No files available'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Error message */}
      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
      
      {/* File options menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem
          onClick={() => {
            if (selectedFile) {
              window.open(selectedFile.url, '_blank');
            }
            handleCloseMenu();
          }}
        >
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open in new tab</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCopyUrl}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy URL</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FileList;