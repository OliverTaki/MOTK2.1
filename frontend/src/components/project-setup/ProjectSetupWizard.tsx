import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
} from '@mui/material';
import { ProjectConfig } from '@shared/types';
import { ProjectConfigurationStep } from './ProjectConfigurationStep';
import { StorageProviderStep } from './StorageProviderStep';
import { ReviewStep } from './ReviewStep';
import { ProgressStep } from './ProgressStep';

export interface ProjectSetupData {
  project_id: string;
  storage_provider: 'gdrive' | 'box';
  originals_root_url: string;
  proxies_root_url: string;
  template?: string;
}

const steps = [
  'Project Configuration',
  'Storage Provider',
  'Review',
  'Initialize'
];

interface ProjectSetupWizardProps {
  onComplete: (projectConfig: ProjectConfig) => void;
  onCancel?: () => void;
}

export const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [setupData, setSetupData] = useState<Partial<ProjectSetupData>>({});
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleNext = () => {
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepDataChange = (stepData: Partial<ProjectSetupData>) => {
    setSetupData(prev => ({ ...prev, ...stepData }));
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleInitializationComplete = (projectConfig: ProjectConfig) => {
    onComplete(projectConfig);
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Project Configuration
        return !!(setupData.project_id?.trim());
      case 1: // Storage Provider
        return !!(
          setupData.storage_provider &&
          setupData.originals_root_url?.trim() &&
          setupData.proxies_root_url?.trim()
        );
      case 2: // Review
        return true; // Review step is always valid if we got here
      case 3: // Initialize
        return true; // Initialize step handles its own validation
      default:
        return false;
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <ProjectConfigurationStep
            data={setupData}
            onChange={handleStepDataChange}
            onError={handleError}
          />
        );
      case 1:
        return (
          <StorageProviderStep
            data={setupData}
            onChange={handleStepDataChange}
            onError={handleError}
          />
        );
      case 2:
        return (
          <ReviewStep
            data={setupData as ProjectSetupData}
            onError={handleError}
          />
        );
      case 3:
        return (
          <ProgressStep
            data={setupData as ProjectSetupData}
            onComplete={handleInitializationComplete}
            onError={handleError}
            isInitializing={isInitializing}
            setIsInitializing={setIsInitializing}
          />
        );
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Project Setup Wizard
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Set up your MOTK project with Google Sheets integration and file storage
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ minHeight: 400 }}>
          {getStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          {onCancel && activeStep === 0 && (
            <Button
              color="inherit"
              onClick={onCancel}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
          )}
          
          <Button
            color="inherit"
            disabled={activeStep === 0 || isInitializing}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          
          <Box sx={{ flex: '1 1 auto' }} />
          
          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepValid(activeStep) || isInitializing}
            >
              {activeStep === steps.length - 2 ? 'Initialize Project' : 'Next'}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};