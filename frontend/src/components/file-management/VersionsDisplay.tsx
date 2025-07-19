import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { VersionReference, FileReference } from '@shared/types';
import { format } from 'date-fns';
import axios from 'axios';

interface VersionsDisplayProps {
  versions: VersionReference;
  entityType: string;
  entityId: string;
  fieldName: string;
  onVersionDelete?: (deletedFile: FileReference) => void;
  readOnly?: boolean;
}

const VersionsDisplay: React.FC<VersionsDisplayProps> = ({
  versions,
  entityType,
  entityId,
  fieldName,
  onVersionDelete,
  readOnly = false
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle version deletion
  const handleDelete = async (file: FileReference) => {
    if (readOnly) return;
    
    try {
      setIsDeleting(file.id);
      setError(null);
      
      const endpoint = `/api/files/${entityType}/${entityId}/${file.name}?fieldName=${fieldName}`;
      
      const response = await axios.delete(endpoint);
      
      if (response.data.success) {
        if (onVersionDelete) {
          onVersionDelete(file);
        }
        
        // Close history dialog if all versions are deleted
        if (versions.versions.length <= 1) {
          setHistoryOpen(false);
        }
      } else {
        throw new Error(response.data.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setIsDeleting(null);
    }
  };

  // Check if file is an image
  const isImage = (file: FileReference) => {
    return file.mimeType.startsWith('image/');
  };

  // Check if file is a video
  const isVideo = (file: FileReference) => {
    return file.mimeType.startsWith('video/');
  };

  // Render preview for latest version
  const renderLatestVersionPreview = () => {
    if (!versions.latest) {
      return (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1
          }}
        >
          <Typography variant="body2" color="textSecondary">
            No versions available
          </Typography>
        </Box>
      );
    }

    const file = versions.latest;

    if (isImage(file)) {
      return (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: 1
          }}
        >
          <img
            src={file.url}
            alt={file.name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        </Box>
      );
    } else if (isVideo(file)) {
      return (
        <Box
          sx={{
            height: 200,
            position: 'relative',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <video
            src={file.url}
            controls
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          >
            Your browser does not support the video tag.
          </video>
        </Box>
      );
    } else {
      // For other file types, show generic preview
      return (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1
          }}
        >
          <InsertDriveFileIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography
            variant="body2"
            sx={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              px: 2
            }}
          >
            {file.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {formatFileSize(file.size)}
          </Typography>
        </Box>
      );
    }
  };

  // Get file icon based on mime type
  const getFileIcon = (file: FileReference) => {
    if (isImage(file)) {
      return <ImageIcon fontSize="small" />;
    } else if (isVideo(file)) {
      return <PlayArrowIcon fontSize="small" />;
    } else {
      return <InsertDriveFileIcon fontSize="small" />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Latest version preview */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        {renderLatestVersionPreview()}
        
        <Box sx={{ p: 2 }}>
          {versions.latest ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">
                  Latest Version
                </Typography>
                <Chip
                  size="small"
                  label={`v${versions.versions.length}`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              <Typography
                variant="body2"
                sx={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {versions.latest.name}
              </Typography>
              
              <Typography variant="caption" color="textSecondary" display="block">
                {formatFileSize(versions.latest.size)} • {format(new Date(versions.latest.createdAt), 'MMM d, yyyy')}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No versions available
            </Typography>
          )}
        </Box>
        
        <Divider />
        
        <Box sx={{ display: 'flex', p: 1 }}>
          {versions.latest && (
            <Button
              href={versions.latest.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              startIcon={<DownloadIcon />}
              size="small"
              sx={{ mr: 1 }}
            >
              Download
            </Button>
          )}
          
          <Button
            startIcon={<HistoryIcon />}
            size="small"
            onClick={() => setHistoryOpen(true)}
            disabled={!versions.latest || versions.versions.length <= 1}
          >
            History ({versions.versions.length})
          </Button>
        </Box>
      </Paper>
      
      {/* Error message */}
      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
      
      {/* Version history dialog */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Version History</DialogTitle>
        <DialogContent dividers>
          <List dense>
            {versions.versions.map((file, index) => (
              <ListItem key={file.id} divider={index < versions.versions.length - 1}>
                <Box sx={{ mr: 2, color: 'primary.main' }}>
                  {getFileIcon(file)}
                </Box>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: '70%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          mr: 1
                        }}
                      >
                        {file.name}
                      </Typography>
                      {file.id === versions.latest?.id && (
                        <Chip
                          size="small"
                          label="Latest"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 20 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="textSecondary">
                      {formatFileSize(file.size)} • {format(new Date(file.createdAt), 'MMM d, yyyy h:mm a')}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Download">
                    <IconButton
                      edge="end"
                      size="small"
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      sx={{ mr: 1 }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  {!readOnly && (
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDelete(file)}
                        disabled={isDeleting === file.id || versions.versions.length <= 1}
                      >
                        {isDeleting === file.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VersionsDisplay;