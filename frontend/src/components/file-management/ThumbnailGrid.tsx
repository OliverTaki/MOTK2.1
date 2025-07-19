import React, { useState } from 'react';
import { 
  Box, 
  ImageList, 
  ImageListItem, 
  IconButton, 
  Typography, 
  Dialog, 
  DialogContent, 
  DialogActions, 
  Button,
  Tooltip,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { FileReference } from '@shared/types';
import axios from 'axios';

interface ThumbnailGridProps {
  files: FileReference[];
  entityType: string;
  entityId: string;
  fieldName?: string;
  onFileDelete?: (deletedFile: FileReference) => void;
  readOnly?: boolean;
  cols?: number;
  height?: number | string;
}

const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  files,
  entityType,
  entityId,
  fieldName,
  onFileDelete,
  readOnly = false,
  cols = 4,
  height = 200
}) => {
  const [selectedFile, setSelectedFile] = useState<FileReference | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file preview
  const handlePreview = (file: FileReference) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  // Close preview dialog
  const handleClosePreview = () => {
    setPreviewOpen(false);
  };

  // Handle file deletion
  const handleDelete = async (file: FileReference, event: React.MouseEvent) => {
    event.stopPropagation();
    
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

  // Check if file is an image
  const isImage = (file: FileReference) => {
    return file.mimeType.startsWith('image/');
  };

  // Check if file is a video
  const isVideo = (file: FileReference) => {
    return file.mimeType.startsWith('video/');
  };

  // Render file preview content
  const renderPreviewContent = () => {
    if (!selectedFile) return null;
    
    if (isImage(selectedFile)) {
      return (
        <img
          src={selectedFile.url}
          alt={selectedFile.name}
          style={{ maxWidth: '100%', maxHeight: '80vh' }}
        />
      );
    } else if (isVideo(selectedFile)) {
      return (
        <video
          src={selectedFile.url}
          controls
          style={{ maxWidth: '100%', maxHeight: '80vh' }}
        >
          Your browser does not support the video tag.
        </video>
      );
    } else {
      return (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography variant="body1">
            Preview not available for this file type.
          </Typography>
          <Button
            href={selectedFile.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Download File
          </Button>
        </Box>
      );
    }
  };

  // Render thumbnail for a file
  const renderThumbnail = (file: FileReference) => {
    if (isImage(file)) {
      return (
        <img
          src={file.url}
          alt={file.name}
          loading="lazy"
          style={{
            objectFit: 'cover',
            height: '100%',
            width: '100%'
          }}
        />
      );
    } else if (isVideo(file)) {
      return (
        <Box
          sx={{
            position: 'relative',
            height: '100%',
            width: '100%',
            backgroundColor: 'black'
          }}
        >
          <PlayCircleOutlineIcon
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 48,
              color: 'white'
            }}
          />
        </Box>
      );
    } else {
      // For other file types, show file extension
      const extension = file.name.split('.').pop()?.toUpperCase() || '';
      return (
        <Box
          sx={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.200',
            color: 'text.secondary'
          }}
        >
          <Typography variant="body2">{extension}</Typography>
        </Box>
      );
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {files.length > 0 ? (
        <ImageList cols={cols} gap={8} sx={{ height, overflow: 'auto', m: 0 }}>
          {files.map((file) => (
            <ImageListItem
              key={file.id}
              sx={{
                cursor: 'pointer',
                '&:hover .thumbnail-actions': {
                  opacity: 1
                }
              }}
              onClick={() => handlePreview(file)}
            >
              {renderThumbnail(file)}
              
              {/* Overlay with actions */}
              <Box
                className="thumbnail-actions"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  p: 1
                }}
              >
                <Tooltip title="Preview">
                  <IconButton
                    size="small"
                    sx={{ color: 'white', mr: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(file);
                    }}
                  >
                    <ZoomInIcon />
                  </IconButton>
                </Tooltip>
                
                {!readOnly && (
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      sx={{ color: 'white' }}
                      onClick={(e) => handleDelete(file, e)}
                      disabled={isDeleting === file.id}
                    >
                      {isDeleting === file.id ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <DeleteIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              
              {/* File name tooltip */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  p: 0.5,
                  fontSize: '0.75rem',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                {file.name}
              </Box>
            </ImageListItem>
          ))}
        </ImageList>
      ) : (
        <Box
          sx={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1
          }}
        >
          <Typography variant="body2" color="textSecondary">
            No thumbnails available
          </Typography>
        </Box>
      )}
      
      {/* Error message */}
      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
      
      {/* Preview dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, textAlign: 'center' }}>
          {renderPreviewContent()}
        </DialogContent>
        <DialogActions>
          {selectedFile && (
            <Button
              href={selectedFile.url}
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
            >
              Open Original
            </Button>
          )}
          <Button onClick={handleClosePreview} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThumbnailGrid;