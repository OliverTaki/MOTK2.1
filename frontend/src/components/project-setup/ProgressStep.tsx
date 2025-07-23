import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ProjectConfig } from '@shared/types';
import { ProjectSetupData } from './ProjectSetupWizard';
import { initializeProject } from '../../services/projectService';

interface ProgressStepProps {
  data: ProjectSetupData;
  onComplete: (projectConfig: ProjectConfig) => void;
  onError: (error: string) => void;
  isInitializing: boolean;
  setIsInitializing: (initializing: boolean) => void;
}

interface InitializationStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  error?: string;
}

export const ProgressStep: React.FC<ProgressStepProps> = ({
  data,
  onComplete,
  onError,
  isInitializing,
  setIsInitializing
}) => {
  const [steps, setSteps] = useState<InitializationStep[]>([
    { id: 'validate', label: 'Validating configuration', status: 'pending' },
    { id: 'connect', label: 'Connecting to Google Sheets API', status: 'pending' },
    { id: 'create', label: 'Creating spreadsheet', status: 'pending' },
    { id: 'sheets', label: 'Initializing sheets', status: 'pending' },
    { id: 'sample', label: 'Adding sample data', status: 'pending' },
    { id: 'storage', label: 'Configuring storage', status: 'pending' },
    { id: 'finalize', label: 'Finalizing project setup', status: 'pending' }
  ]);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const updateStepStatus = (stepId: string, status: InitializationStep['status'], error?: string) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, error }
          : step
      )
    );
  };

  const simulateProgress = async () => {
    const stepDurations = [500, 1000, 1500, 2000, 1000, 800, 500]; // milliseconds
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStepIndex(i);
      
      // Mark current step as in-progress
      updateStepStatus(step.id, 'in-progress');
      
      // Simulate step duration
      await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      
      // Mark step as completed
      updateStepStatus(step.id, 'completed');
      
      // Update overall progress
      setOverallProgress(((i + 1) / steps.length) * 100);
    }
  };

  const performInitialization = async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);
      
      // Start progress simulation
      const progressPromise = simulateProgress();
      
      // Add timestamp to project ID to prevent duplicates in development mode
      const uniqueData = {
        ...data,
        project_id: `${data.project_id}-${Date.now()}`
      };
      
      // Perform actual initialization
      const result = await initializeProject(uniqueData);
      
      // Wait for progress simulation to complete
      await progressPromise;
      
      if (result.success && result.data) {
        setInitializationComplete(true);
        onComplete(result.data);
      } else {
        throw new Error(result.error || 'Failed to initialize project');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setInitializationError(errorMessage);
      onError(errorMessage);
      
      // Mark current step as error
      if (currentStepIndex < steps.length) {
        updateStepStatus(steps[currentStepIndex].id, 'error', errorMessage);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    // Start initialization when component mounts
    performInitialization();
  }, []); // Empty dependency array means this runs once on mount

  const getStepIcon = (step: InitializationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'in-progress':
        return <RefreshIcon color="primary" className="rotating" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStepColor = (step: InitializationStep) => {
    switch (step.status) {
      case 'completed':
        return 'success.main';
      case 'in-progress':
        return 'primary.main';
      case 'error':
        return 'error.main';
      default:
        return 'text.disabled';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {initializationComplete ? 'Project Initialized Successfully!' : 'Initializing Project...'}
      </Typography>
      
      {!initializationComplete && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please wait while we set up your project. This process may take a few minutes.
        </Typography>
      )}

      {initializationError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Initialization Failed:</strong> {initializationError}
          </Typography>
        </Alert>
      )}

      {initializationComplete && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Your project has been successfully initialized! You can now start managing your 
            shots, assets, and tasks.
          </Typography>
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Overall Progress
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={overallProgress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {Math.round(overallProgress)}% Complete
            </Typography>
          </Box>

          <List>
            {steps.map((step, index) => (
              <ListItem key={step.id} sx={{ py: 0.5 }}>
                <ListItemIcon>
                  {getStepIcon(step)}
                </ListItemIcon>
                <ListItemText
                  primary={step.label}
                  secondary={step.error}
                  sx={{ 
                    color: getStepColor(step),
                    '& .MuiListItemText-secondary': {
                      color: 'error.main'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {initializationComplete && (
        <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="body2" color="success.contrastText">
            <strong>Next Steps:</strong>
            <br />
            • Your Google Sheets document has been created with project ID: <strong>{data.project_id}</strong>
            <br />
            • Storage folders have been configured for your files
            <br />
            • You can now start adding shots, assets, and tasks to your project
            <br />
            • Access your project through the main dashboard
          </Typography>
        </Box>
      )}

      <style>
        {`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotating {
            animation: rotate 1s linear infinite;
          }
        `}
      </style>
    </Box>
  );
};