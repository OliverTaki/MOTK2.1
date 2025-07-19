import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Backup as BackupIcon,
  CloudSync as SyncIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectConfig } from '@shared/types';
import { getProject, updateProject, getProjectStatus, ProjectStatus } from '../../services/projectService';

interface ProjectSettingsProps {
  projectId: string;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<ProjectConfig>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [projectSettings, setProjectSettings] = useState({
    notifications: {
      emailNotifications: true,
      deadlineReminders: true,
      statusUpdates: false,
    },
    security: {
      requireApproval: false,
      allowGuestAccess: false,
      enableAuditLog: true,
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionDays: 30,
    },
  });

  // Fetch project configuration
  const { data: projectData, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    onSuccess: (data) => {
      if (data.success && data.data) {
        setFormData({
          storage_provider: data.data.storage_provider,
          originals_root_url: data.data.originals_root_url,
          proxies_root_url: data.data.proxies_root_url,
        });
      }
    },
  });

  // Fetch project status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['project-status', projectId],
    queryFn: () => getProjectStatus(projectId),
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<ProjectConfig>) => updateProject(projectId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-status', projectId] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleInputChange = (field: keyof ProjectConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  const handleRefreshStatus = () => {
    queryClient.invalidateQueries({ queryKey: ['project-status', projectId] });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setProjectSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value,
      },
    }));
  };

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  if (projectLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (projectError || !projectData?.success) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load project settings: {projectError?.message || projectData?.error}
        </Alert>
      </Box>
    );
  }

  const project = projectData.data!;
  const status = statusData?.data as ProjectStatus | undefined;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Project Settings
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Configure your project storage, security, and management settings
      </Typography>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Project settings saved successfully!
        </Alert>
      )}

      {/* Enhanced Settings with Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="project settings tabs">
          <Tab icon={<InfoIcon />} label="General" />
          <Tab icon={<StorageIcon />} label="Storage" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<SecurityIcon />} label="Security" />
          <Tab icon={<BackupIcon />} label="Backup" />
          <Tab icon={<SyncIcon />} label="Status" />
        </Tabs>

        {/* General Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Project Information
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Project ID"
                    value={project.project_id}
                    disabled
                    margin="normal"
                    helperText="Project ID cannot be changed after creation"
                  />

                  <TextField
                    fullWidth
                    label="Spreadsheet Title"
                    value={project.spreadsheet_title || 'N/A'}
                    disabled
                    margin="normal"
                    helperText="Google Sheets document title"
                  />

                  <TextField
                    fullWidth
                    label="Created Date"
                    value={new Date(project.created_at).toLocaleString()}
                    disabled
                    margin="normal"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Project Statistics
                  </Typography>
                  
                  {status && (
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>API Connection</TableCell>
                            <TableCell>
                              <Chip 
                                label={status.api_connection ? 'Connected' : 'Disconnected'}
                                color={status.api_connection ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Sheets Configured</TableCell>
                            <TableCell>
                              <Chip 
                                label={status.sheets_configured ? 'Yes' : 'No'}
                                color={status.sheets_configured ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Total Sheets</TableCell>
                            <TableCell>{status.total_sheets} / {status.required_sheets}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Storage Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Storage Configuration
                  </Typography>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Storage Provider</InputLabel>
                    <Select
                      value={formData.storage_provider || ''}
                      onChange={(e) => handleInputChange('storage_provider', e.target.value)}
                      label="Storage Provider"
                    >
                      <MenuItem value="gdrive">Google Drive</MenuItem>
                      <MenuItem value="box">Box</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Originals Root URL"
                    value={formData.originals_root_url || ''}
                    onChange={(e) => handleInputChange('originals_root_url', e.target.value)}
                    margin="normal"
                    helperText="Base URL for original files storage"
                  />

                  <TextField
                    fullWidth
                    label="Proxies Root URL"
                    value={formData.proxies_root_url || ''}
                    onChange={(e) => handleInputChange('proxies_root_url', e.target.value)}
                    margin="normal"
                    helperText="Base URL for proxy files storage"
                  />

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={updateMutation.isLoading}
                    >
                      {updateMutation.isLoading ? 'Saving...' : 'Save Storage Settings'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Notification Settings
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.notifications.emailNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                      />
                    }
                    label="Email Notifications"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Receive email notifications for project updates
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.notifications.deadlineReminders}
                        onChange={(e) => handleSettingChange('notifications', 'deadlineReminders', e.target.checked)}
                      />
                    }
                    label="Deadline Reminders"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Get reminders for upcoming deadlines
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.notifications.statusUpdates}
                        onChange={(e) => handleSettingChange('notifications', 'statusUpdates', e.target.checked)}
                      />
                    }
                    label="Status Updates"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Receive notifications when item statuses change
                  </Typography>

                  <Box sx={{ mt: 3 }}>
                    <Button variant="contained" startIcon={<SaveIcon />}>
                      Save Notification Settings
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Settings
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.security.requireApproval}
                        onChange={(e) => handleSettingChange('security', 'requireApproval', e.target.checked)}
                      />
                    }
                    label="Require Approval for Changes"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    All changes must be approved by an admin
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.security.allowGuestAccess}
                        onChange={(e) => handleSettingChange('security', 'allowGuestAccess', e.target.checked)}
                      />
                    }
                    label="Allow Guest Access"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Allow users without Google accounts to view project
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.security.enableAuditLog}
                        onChange={(e) => handleSettingChange('security', 'enableAuditLog', e.target.checked)}
                      />
                    }
                    label="Enable Audit Log"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Track all changes and user actions
                  </Typography>

                  <Box sx={{ mt: 3 }}>
                    <Button variant="contained" startIcon={<SaveIcon />}>
                      Save Security Settings
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Backup Tab */}
        <TabPanel value={currentTab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Backup Settings
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.backup.autoBackup}
                        onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
                      />
                    }
                    label="Automatic Backup"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Automatically backup project data
                  </Typography>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Backup Frequency</InputLabel>
                    <Select
                      value={projectSettings.backup.backupFrequency}
                      onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
                      label="Backup Frequency"
                      disabled={!projectSettings.backup.autoBackup}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Retention Days"
                    type="number"
                    value={projectSettings.backup.retentionDays}
                    onChange={(e) => handleSettingChange('backup', 'retentionDays', parseInt(e.target.value))}
                    margin="normal"
                    helperText="Number of days to keep backups"
                  />

                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button variant="contained" startIcon={<SaveIcon />}>
                      Save Backup Settings
                    </Button>
                    <Button variant="outlined" startIcon={<BackupIcon />}>
                      Create Backup Now
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Backups
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No backups available yet. Enable automatic backup to start creating backups.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Status Tab */}
        <TabPanel value={currentTab} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Project Status
                    </Typography>
                    <Button
                      startIcon={<RefreshIcon />}
                      onClick={handleRefreshStatus}
                      disabled={statusLoading}
                      size="small"
                    >
                      Refresh Status
                    </Button>
                  </Box>

                  {statusLoading ? (
                    <CircularProgress size={24} />
                  ) : status ? (
                    <>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              API Connection
                            </Typography>
                            <Chip 
                              label={status.api_connection ? 'Connected' : 'Disconnected'}
                              color={status.api_connection ? 'success' : 'error'}
                              size="small"
                            />
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Sheets Configured
                            </Typography>
                            <Chip 
                              label={status.sheets_configured ? 'Yes' : 'No'}
                              color={status.sheets_configured ? 'success' : 'warning'}
                              size="small"
                            />
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Total Sheets
                            </Typography>
                            <Typography variant="h6">
                              {status.total_sheets} / {status.required_sheets}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Spreadsheet
                            </Typography>
                            <Typography variant="body1" noWrap>
                              {status.spreadsheet_title}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {status?.missing_sheets && status.missing_sheets.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Missing Sheets:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {status.missing_sheets.map((sheet) => (
                              <Chip key={sheet} label={sheet} size="small" color="warning" />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {status?.sheet_statistics && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Sheet Statistics:
                          </Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Sheet Name</TableCell>
                                  <TableCell align="right">Records</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(status.sheet_statistics).map(([sheet, count]) => (
                                  <TableRow key={sheet}>
                                    <TableCell>{sheet}</TableCell>
                                    <TableCell align="right">{count}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Alert severity="warning">
                      Unable to fetch project status
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Danger Zone */}
            <Grid item xs={12}>
              <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
                <CardContent>
                  <Typography variant="h6" color="error" gutterBottom>
                    Danger Zone
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    These actions are irreversible. Please be certain before proceeding.
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" gutterBottom>
                        Delete Project
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This will permanently delete all project data and cannot be undone.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Delete Project
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              This action cannot be undone!
            </Typography>
          </Alert>
          <Typography variant="body2">
            Are you sure you want to delete this project? This will:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="• Delete all project data from Google Sheets" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Remove all file references (files in storage will remain)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Cannot be recovered" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button 
            color="error" 
            variant="contained"
            onClick={() => {
              // TODO: Implement project deletion
              console.log('Delete project:', projectId);
              setShowDeleteDialog(false);
            }}
          >
            Delete Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectSettings;