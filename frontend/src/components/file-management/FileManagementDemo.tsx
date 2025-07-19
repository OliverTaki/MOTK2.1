import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  Container,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import QueueIcon from '@mui/icons-material/Queue';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import FileUpload from './FileUpload';
import ThumbnailGrid from './ThumbnailGrid';
import FileList from './FileList';
import VersionsDisplay from './VersionsDisplay';
import { useFileManagement } from '../../hooks/useFileManagement';
import { EntityType, ENTITY_KIND, FieldType, FileReference, VersionReference } from '@shared/types';



interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`file-management-tabpanel-${index}`}
      aria-labelledby={`file-management-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const FileManagementDemo: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedEntity] = useState<{ type: EntityType; id: string }>({
    type: 'shot',
    id: 'shot_001'
  });

  // Use the file management hook
  const {
    entityFiles,
    storageStatus,
    proxyQueueStatus,
    uploadProgress,
    isLoadingEntityFiles,
    isLoadingStorageStatus,
    isLoadingProxyQueue,
    isUploading,
    uploadFiles,
    deleteFile,
    generateProxy,
    testStorage,
    clearUploadProgress,
    getFileUrl
  } = useFileManagement({
    entityType: selectedEntity.type,
    entityId: selectedEntity.id
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFileUpload = async (files: File[]) => {
    try {
      await uploadFiles(files);
      console.log('Files uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleFileDelete = (deletedFile: any) => {
    deleteFile(deletedFile.name);
  };

  const handleGenerateProxy = (fileName: string) => {
    generateProxy({ fileName });
  };

  const handleTestStorage = () => {
    testStorage();
  };

  // Mock versions data for demo
  const mockVersions = entityFiles?.versions.length ? {
    latest: entityFiles.versions[0],
    versions: entityFiles.versions
  } : {
    latest: null,
    versions: []
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          File Management System Demo
        </Typography>
        <Typography variant="body1" paragraph>
          This demo showcases the integrated file management system with storage providers, 
          proxy generation, and comprehensive file operations.
        </Typography>

        {/* Entity Info */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current Entity: {selectedEntity.type.toUpperCase()} - {selectedEntity.id}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip icon={<FolderIcon />} label="ORIGINALS Folder" variant="outlined" />
            <Chip icon={<VideoLibraryIcon />} label="PROXIES Folder" variant="outlined" />
            <Chip 
              icon={<StorageIcon />} 
              label={storageStatus?.provider || 'Loading...'} 
              color={storageStatus?.initialized ? 'primary' : 'default'} 
            />
          </Box>
        </Paper>

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Upload Progress</Typography>
              <Button size="small" onClick={clearUploadProgress}>Clear</Button>
            </Box>
            {uploadProgress.map((progress) => (
              <Box key={progress.fileName} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{progress.fileName}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {progress.status === 'uploading' ? `${progress.progress}%` : progress.status}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progress.progress} 
                  color={progress.status === 'error' ? 'error' : 'primary'}
                />
                {progress.error && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                    {progress.error}
                  </Typography>
                )}
              </Box>
            ))}
          </Paper>
        )}

        {/* Status Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <StorageIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Storage</Typography>
                </Box>
                {isLoadingStorageStatus ? (
                  <CircularProgress size={20} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {storageStatus?.initialized ? (
                      <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    ) : (
                      <ErrorIcon color="error" sx={{ mr: 1, fontSize: 20 }} />
                    )}
                    <Typography variant="body2">
                      {storageStatus?.initialized ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <QueueIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Proxy Queue</Typography>
                </Box>
                {isLoadingProxyQueue ? (
                  <CircularProgress size={20} />
                ) : (
                  <>
                    <Typography variant="h4" color="primary">
                      {proxyQueueStatus?.queueLength || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Jobs pending
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ImageIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Files</Typography>
                </Box>
                {isLoadingEntityFiles ? (
                  <CircularProgress size={20} />
                ) : (
                  <>
                    <Typography variant="h4" color="primary">
                      {entityFiles?.totalCount || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total files
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <VideoLibraryIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Proxies</Typography>
                </Box>
                {isLoadingProxyQueue ? (
                  <CircularProgress size={20} />
                ) : (
                  <>
                    <Typography variant="h4" color="primary">
                      {proxyQueueStatus?.completedJobs || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Generated
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="file management tabs">
            <Tab label="File Upload" />
            <Tab label="Thumbnails" />
            <Tab label="File List" />
            <Tab label="Versions" />
            <Tab label="System Status" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            File Upload
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Upload files to the entity folder. Video files will automatically queue for proxy generation.
          </Typography>
          
          <FileUpload
            entityType={selectedEntity.type}
            entityId={selectedEntity.id}
            fieldName="thumbnails"
            fieldType={FieldType.THUMBNAILS}
            multiple={true}
            onUploadComplete={(files) => {
              const fileObjects = files.map(f => new File([new Blob()], f.name || 'unknown'));
              handleFileUpload(fileObjects);
            }}
            onUploadError={(error) => console.error('Upload error:', error)}
          />
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Automatic Features:</strong>
              <br />• Video files will be queued for proxy generation (1080p, 1 Mbps)
              <br />• Files are organized by field type (thumbnails, file_list, versions)
              <br />• Original filenames are preserved for fidelity
              <br />• Progress tracking with conflict resolution
            </Typography>
          </Alert>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Thumbnail Grid
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Visual grid display for images and videos with preview and management options.
          </Typography>
          
          {isLoadingEntityFiles ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ThumbnailGrid
              files={entityFiles?.thumbnails || []}
              entityType={selectedEntity.type}
              entityId={selectedEntity.id}
              fieldName="thumbnails"
              onFileDelete={handleFileDelete}
              cols={4}
              height={300}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            File List
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Detailed table view with sorting, filtering, and file management operations.
          </Typography>
          
          {isLoadingEntityFiles ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FileList
              files={entityFiles?.file_list || []}
              entityType={selectedEntity.type}
              entityId={selectedEntity.id}
              fieldName="file_list"
              onFileDelete={handleFileDelete}
              height={400}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Version Management
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Track file versions with latest version preview and history management.
          </Typography>
          
          {isLoadingEntityFiles ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <VersionsDisplay
              versions={mockVersions}
              entityType={selectedEntity.type}
              entityId={selectedEntity.id}
              fieldName="versions"
              onVersionDelete={handleFileDelete}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Storage Provider Status
                  </Typography>
                  {isLoadingStorageStatus ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          {storageStatus?.initialized ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <ErrorIcon color="error" />
                          )}
                        </ListItemIcon>
                        <ListItemText 
                          primary={`${storageStatus?.provider || 'Unknown'} ${storageStatus?.initialized ? 'Connected' : 'Disconnected'}`}
                          secondary={`Provider: ${storageStatus?.provider || 'unknown'}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <FolderIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="ORIGINALS Folder" 
                          secondary={storageStatus?.config?.originalsRootUrl || 'Not configured'} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <VideoLibraryIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="PROXIES Folder" 
                          secondary={storageStatus?.config?.proxiesRootUrl || 'Not configured'} 
                        />
                      </ListItem>
                    </List>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" variant="outlined" onClick={handleTestStorage}>
                    Test Connection
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Proxy Generation Queue
                  </Typography>
                  {isLoadingProxyQueue ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          {proxyQueueStatus?.isProcessing ? (
                            <CircularProgress size={20} />
                          ) : (
                            <QueueIcon color="action" />
                          )}
                        </ListItemIcon>
                        <ListItemText 
                          primary={`Queue Status: ${proxyQueueStatus?.isProcessing ? 'Processing' : 'Idle'}`}
                          secondary={`${proxyQueueStatus?.queueLength || 0} jobs pending`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Completed Jobs" 
                          secondary={`${proxyQueueStatus?.completedJobs || 0} total`} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Failed Jobs" 
                          secondary={`${proxyQueueStatus?.failedJobs || 0} total`} 
                        />
                      </ListItem>
                    </List>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" variant="outlined">
                    View Queue
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Integration Features
          </Typography>
          <Alert severity={storageStatus?.initialized ? 'success' : 'warning'} sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>{storageStatus?.initialized ? '✓' : '⚠'} Storage Integration:</strong> {storageStatus?.provider || 'Unknown'} provider {storageStatus?.initialized ? 'connected' : 'not connected'}
            </Typography>
          </Alert>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>✓ Proxy Generation:</strong> FFmpeg processing with 1080p, 1 Mbps output
            </Typography>
          </Alert>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>✓ File Management:</strong> Upload, delete, archive with progress tracking
            </Typography>
          </Alert>
          <Alert severity="success">
            <Typography variant="body2">
              <strong>✓ Real-time Status:</strong> Queue monitoring and storage connectivity
            </Typography>
          </Alert>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default FileManagementDemo;