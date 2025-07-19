import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
} from '@mui/material';
import { ProjectSetupData } from './ProjectSetupWizard';

interface ProjectConfigurationStepProps {
  data: Partial<ProjectSetupData>;
  onChange: (data: Partial<ProjectSetupData>) => void;
  onError: (error: string) => void;
}

export const ProjectConfigurationStep: React.FC<ProjectConfigurationStepProps> = ({
  data,
  onChange,
  onError
}) => {
  const [projectId, setProjectId] = useState(data.project_id || '');
  const [template, setTemplate] = useState(data.template || '');
  const [projectIdError, setProjectIdError] = useState('');

  useEffect(() => {
    // Clear any previous errors when component mounts
    onError('');
  }, [onError]);

  const validateProjectId = (value: string): boolean => {
    if (!value.trim()) {
      setProjectIdError('Project ID is required');
      return false;
    }
    
    // Project ID should be alphanumeric with underscores and hyphens
    const projectIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!projectIdRegex.test(value)) {
      setProjectIdError('Project ID can only contain letters, numbers, underscores, and hyphens');
      return false;
    }
    
    if (value.length < 3) {
      setProjectIdError('Project ID must be at least 3 characters long');
      return false;
    }
    
    if (value.length > 50) {
      setProjectIdError('Project ID must be less than 50 characters');
      return false;
    }
    
    setProjectIdError('');
    return true;
  };

  const handleProjectIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setProjectId(value);
    
    const isValid = validateProjectId(value);
    
    onChange({
      project_id: value,
      template
    });
    
    if (!isValid) {
      onError(projectIdError);
    } else {
      onError('');
    }
  };

  const handleTemplateChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as string;
    setTemplate(value);
    
    onChange({
      project_id: projectId,
      template: value
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Project Configuration
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your project settings. The project ID will be used to identify your project
        and create the Google Sheets document.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          fullWidth
          label="Project ID"
          value={projectId}
          onChange={handleProjectIdChange}
          error={!!projectIdError}
          helperText={projectIdError || 'Unique identifier for your project (e.g., my-animation-project)'}
          required
          placeholder="my-animation-project"
        />

        <Divider />

        <FormControl fullWidth>
          <InputLabel id="template-select-label">Project Template</InputLabel>
          <Select
            labelId="template-select-label"
            value={template}
            label="Project Template"
            onChange={handleTemplateChange}
          >
            <MenuItem value="">
              <em>Default Template</em>
            </MenuItem>
            <MenuItem value="animation">Animation Project</MenuItem>
            <MenuItem value="live-action">Live Action Project</MenuItem>
            <MenuItem value="commercial">Commercial Project</MenuItem>
            <MenuItem value="documentary">Documentary Project</MenuItem>
          </Select>
          <FormHelperText>
            Choose a template to pre-populate your project with sample data and configurations
          </FormHelperText>
        </FormControl>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            <strong>What happens next:</strong>
            <br />
            • A new Google Sheets document will be created with your project ID as the title
            <br />
            • 9 standardized sheets will be set up (Shots, Assets, Tasks, etc.)
            <br />
            • Sample data will be added based on your selected template
            <br />
            • Storage folders will be configured for your files
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};