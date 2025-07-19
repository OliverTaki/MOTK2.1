import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Storage as StorageIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { ProjectSetupData } from './ProjectSetupWizard';

interface ReviewStepProps {
  data: ProjectSetupData;
  onError: (error: string) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  data,
  onError
}) => {
  useEffect(() => {
    // Clear any previous errors when component mounts
    onError('');
  }, [onError]);

  const getStorageProviderLabel = (provider: string) => {
    return provider === 'gdrive' ? 'Google Drive' : 'Box';
  };

  const getTemplateLabel = (template?: string) => {
    if (!template) return 'Default Template';
    
    const templates: { [key: string]: string } = {
      'animation': 'Animation Project',
      'live-action': 'Live Action Project',
      'commercial': 'Commercial Project',
      'documentary': 'Documentary Project'
    };
    
    return templates[template] || 'Custom Template';
  };

  const sheetsToBeCreated = [
    'Shots - Track individual shots and scenes',
    'Assets - Manage characters, props, and environments',
    'Tasks - Organize work assignments and deadlines',
    'ProjectMembers - Team member information and roles',
    'Users - User accounts and permissions',
    'Pages - Custom page configurations',
    'Fields - Field definitions and types',
    'project_meta - Project metadata and settings',
    'Logs - System activity and change logs'
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Configuration
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please review your project configuration before initialization. Once created, 
        some settings may be difficult to change.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Project Details
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Project ID
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {data.project_id}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Template
                </Typography>
                <Chip 
                  label={getTemplateLabel(data.template)} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Storage Configuration
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Provider
                </Typography>
                <Chip 
                  label={getStorageProviderLabel(data.storage_provider)} 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Originals Root
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {data.originals_root_url}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Proxies Root
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {data.proxies_root_url}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                <CloudUploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                What Will Be Created
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The following Google Sheets will be created in your account:
              </Typography>
              
              <List dense>
                {sheetsToBeCreated.map((sheet, index) => {
                  const [name, description] = sheet.split(' - ');
                  return (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <FolderIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={name}
                        secondary={description}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.contrastText">
              <strong>Before proceeding:</strong>
              <br />
              • Ensure you have access to create Google Sheets in your account
              <br />
              • Verify that the storage URLs are correct and accessible
              <br />
              • Make sure you have appropriate permissions for the storage folders
              <br />
              • The initialization process may take a few minutes to complete
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};