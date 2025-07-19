import React, { useState, useCallback, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Paper, 
  Alert, 
  IconButton,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import { EntityType, FieldType } from '@shared/types';
import axios from 'axios';

interface FileUploadProps {
  entityType: EntityType;
  entityId: string;
  fieldName?: string;
  fieldType?: FieldType;
  multiple?: boolean;
  onUploadComplete?: (files: any[]) => void;
  onUploadError?: (error: string) => void;
  acceptedFileTypes?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  entityType,
  entityId,
  fieldName,
  fieldType,
  multiple = false,
  onUploadComplete,
  onUploadError,
  acceptedFileTypes
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setError(null);
  }, []);

  // Handle drop event
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const { files } = e.dataTransfer;
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  // Handle click on upload area
  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Remove selected file
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Upload files
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      const formData = new FormData();
      
      if (multiple) {
        // Multiple file upload
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
        
        const endpoint = `/api/files/upload-multiple/${entityType}/${entityId}${fieldName ? `?fieldName=${fieldName}` : ''}`;
        
        const response = await axios.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(percentCompleted);
          }
        });
        
        if (response.data.success) {
          if (onUploadComplete) {
            onUploadComplete(response.data.data.uploaded);
          }
          setSelectedFiles([]);
        } else {
          throw new Error(response.data.error || 'Upload failed');
        }
      } else {
        // Single file upload
        formData.append('file', selectedFiles[0]);
        
        const endpoint = `/api/files/upload/${entityType}/${entityId}${fieldName ? `?fieldName=${fieldName}` : ''}`;
        
        const response = await axios.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(percentCompleted);
          }
        });
        
        if (response.data.success) {
          if (onUploadComplete) {
            onUploadComplete([response.data.data]);
          }
          setSelectedFiles([]);
        } else {
          throw new Error(response.data.error || 'Upload failed');
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'File upload failed';
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFiles, entityType, entityId, fieldName, multiple, onUploadComplete, onUploadError]);

  // Get accepted file types based on field type
  const getAcceptedFileTypes = () => {
    if (acceptedFileTypes) return acceptedFileTypes;
    
    if (fieldType === FieldType.THUMBNAILS) {
      return 'image/*,video/*';
    }
    
    return undefined; // Accept all file types
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        accept={getAcceptedFileTypes()}
      />
      
      {/* Drag and drop area */}
      <Paper
        sx={{
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          backgroundColor: isDragging ? 'rgba(25, 118, 210, 0.04)' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          mb: 2
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {isDragging ? 'Drop files here' : 'Drag & Drop files here'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          or click to browse
        </Typography>
        {fieldType === FieldType.THUMBNAILS && (
          <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 1 }}>
            Accepts images and videos only
          </Typography>
        )}
      </Paper>
      
      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Files ({selectedFiles.length})
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: '200px', overflow: 'auto' }}>
            {selectedFiles.map((file, index) => (
              <Box
                key={`${file.name}-${index}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  borderBottom: index < selectedFiles.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '250px'
                    }}
                  >
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                </Box>
                <Tooltip title="Remove">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Paper>
        </Box>
      )}
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Upload button and progress */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0}
          startIcon={isUploading ? undefined : <CloudUploadIcon />}
          sx={{ mr: 2 }}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
        
        {isUploading && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress
              variant="determinate"
              value={uploadProgress}
              size={24}
              sx={{ mr: 1 }}
            />
            <Typography variant="body2" color="textSecondary">
              {uploadProgress}%
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default FileUpload;