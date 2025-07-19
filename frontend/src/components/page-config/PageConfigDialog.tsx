import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { PageConfig, PageConfigData, PageType, EntityType } from '@shared/types';
import { usePageConfig } from '../../hooks/usePageConfig';
import FieldsConfigPanel from './FieldsConfigPanel';
import FiltersConfigPanel from './FiltersConfigPanel';
import SortingConfigPanel from './SortingConfigPanel';

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
      id={`page-config-tabpanel-${index}`}
      aria-labelledby={`page-config-tab-${index}`}
      {...other}
      style={{ padding: '16px 0' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface PageConfigDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  userId: string;
  initialPageId?: string;
}

export const PageConfigDialog: React.FC<PageConfigDialogProps> = ({
  open,
  onClose,
  entityType,
  userId,
  initialPageId
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [pageName, setPageName] = useState('');
  const [pageType, setPageType] = useState<PageType>(PageType.TABLE);
  const [isShared, setIsShared] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(initialPageId);

  const {
    pageConfigs,
    currentPageId,
    currentConfig,
    isConfigModified,
    isLoading,
    error,
    selectPageConfig,
    updateCurrentConfig,
    savePageConfig,
    deletePageConfig,
    sharePageConfig,
    resetToDefault,
    isCreating,
    isUpdating,
    isDeleting
  } = usePageConfig(entityType, initialPageId);

  // Update local state when page config changes
  useEffect(() => {
    if (pageConfigs && selectedPageId) {
      const selectedConfig = pageConfigs.find(config => config.page_id === selectedPageId);
      if (selectedConfig) {
        setPageName(selectedConfig.name);
        setPageType(selectedConfig.type as PageType);
        setIsShared(selectedConfig.shared);
      }
    }
  }, [pageConfigs, selectedPageId]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle page selection change
  const handlePageChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const pageId = event.target.value as string;
    setSelectedPageId(pageId);
    selectPageConfig(pageId);
  };

  // Handle save
  const handleSave = () => {
    if (!currentConfig) return;
    
    savePageConfig(pageName, pageType, isShared, userId);
    onClose();
  };

  // Handle delete
  const handleDelete = () => {
    if (currentPageId) {
      deletePageConfig();
      onClose();
    }
  };

  // Handle share toggle
  const handleShareToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const shared = event.target.checked;
    setIsShared(shared);
    
    if (currentPageId) {
      sharePageConfig(shared);
    }
  };

  // Handle reset to default
  const handleReset = () => {
    resetToDefault();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">
            Error loading page configurations. Please try again later.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {currentPageId ? 'Edit Page Configuration' : 'Create New Page Configuration'}
      </DialogTitle>
      <DialogContent>
        <Box mb={3}>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Page Name"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="page-type-label">Page Type</InputLabel>
              <Select
                labelId="page-type-label"
                value={pageType}
                onChange={(e) => setPageType(e.target.value as PageType)}
                label="Page Type"
              >
                <MenuItem value={PageType.TABLE}>Table</MenuItem>
                <MenuItem value={PageType.OVERVIEW}>Overview</MenuItem>
                <MenuItem value={PageType.SHOT_DETAIL}>Shot Detail</MenuItem>
                <MenuItem value={PageType.ASSET_DETAIL}>Asset Detail</MenuItem>
                <MenuItem value={PageType.TASK_DETAIL}>Task Detail</MenuItem>
                <MenuItem value={PageType.SCHEDULE}>Schedule</MenuItem>
                <MenuItem value={PageType.CHAT}>Chat</MenuItem>
                <MenuItem value={PageType.FORUM}>Forum</MenuItem>
                <MenuItem value={PageType.MEMBER_DETAIL}>Member Detail</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={isShared}
                  onChange={handleShareToggle}
                  color="primary"
                />
              }
              label="Share with team"
            />

            {pageConfigs && pageConfigs.length > 0 && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="load-page-label">Load Saved Page</InputLabel>
                <Select
                  labelId="load-page-label"
                  value={selectedPageId || ''}
                  onChange={handlePageChange as any}
                  label="Load Saved Page"
                >
                  <MenuItem value="">
                    <em>Select a saved page</em>
                  </MenuItem>
                  {pageConfigs.map((config) => (
                    <MenuItem key={config.page_id} value={config.page_id}>
                      {config.name} {config.shared ? '(Shared)' : '(Private)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="page configuration tabs">
            <Tab label="Fields" id="page-config-tab-0" />
            <Tab label="Filters" id="page-config-tab-1" />
            <Tab label="Sorting" id="page-config-tab-2" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <FieldsConfigPanel
            entityType={entityType}
            fields={currentConfig?.fields || []}
            fieldWidths={currentConfig?.fieldWidths || {}}
            onFieldsChange={(fields, fieldWidths) => 
              updateCurrentConfig({ fields, fieldWidths })}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <FiltersConfigPanel
            entityType={entityType}
            filters={currentConfig?.filters || {}}
            onFiltersChange={(filters) => updateCurrentConfig({ filters })}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <SortingConfigPanel
            entityType={entityType}
            sorting={currentConfig?.sorting || { field: '', direction: 'asc' }}
            onSortingChange={(sorting) => updateCurrentConfig({ sorting })}
          />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} color="secondary">
          Reset to Default
        </Button>
        <Box flexGrow={1} />
        {currentPageId && (
          <Button 
            onClick={handleDelete} 
            color="error" 
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          disabled={!pageName || isCreating || isUpdating}
        >
          {isCreating || isUpdating ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PageConfigDialog;