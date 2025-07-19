import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Collapse,
  IconButton,
  Alert,
  AlertTitle
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import LockIcon from '@mui/icons-material/Lock';
import StorageIcon from '@mui/icons-material/Storage';
import { ErrorType } from '../../services/error/ErrorLogger';

interface ErrorDialogProps {
  open: boolean;
  message: string;
  details?: string | null;
  type: ErrorType;
  onClose: () => void;
  onRetry?: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  open,
  message,
  details,
  type,
  onClose,
  onRetry
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const getErrorIcon = () => {
    switch (type) {
      case 'network_error':
        return <WifiOffIcon fontSize="large" color="error" />;
      case 'auth_error':
        return <LockIcon fontSize="large" color="error" />;
      case 'storage_error':
        return <StorageIcon fontSize="large" color="error" />;
      case 'validation_error':
        return <WarningAmberIcon fontSize="large" color="warning" />;
      default:
        return <ErrorOutlineIcon fontSize="large" color="error" />;
    }
  };

  const getErrorTitle = () => {
    switch (type) {
      case 'network_error':
        return 'Network Error';
      case 'api_error':
        return 'API Error';
      case 'auth_error':
        return 'Authentication Error';
      case 'storage_error':
        return 'Storage Error';
      case 'conflict_error':
        return 'Conflict Error';
      case 'validation_error':
        return 'Validation Error';
      case 'react_error_boundary':
        return 'Application Error';
      default:
        return 'Error';
    }
  };

  const getRecoverySuggestion = () => {
    switch (type) {
      case 'network_error':
        return 'Please check your internet connection and try again.';
      case 'api_error':
        return 'The server encountered an issue processing your request. Please try again later.';
      case 'auth_error':
        return 'Your session may have expired. Please try logging in again.';
      case 'storage_error':
        return 'There was an issue with file storage. Please check your storage provider settings.';
      case 'conflict_error':
        return 'Another user has made changes to the same data. Please refresh and try again.';
      case 'validation_error':
        return 'Please check your input and try again.';
      default:
        return 'Please try again or contact support if the issue persists.';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="error-dialog-title"
    >
      <DialogTitle id="error-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getErrorIcon()}
        {getErrorTitle()}
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error Message</AlertTitle>
          {message}
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {getRecoverySuggestion()}
        </Typography>

        {details && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Technical Details</Typography>
              <IconButton size="small" onClick={toggleDetails} sx={{ ml: 1 }}>
                {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={showDetails}>
              <Box 
                sx={{ 
                  bgcolor: 'grey.100', 
                  p: 2, 
                  borderRadius: 1, 
                  maxHeight: 200, 
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {details}
              </Box>
            </Collapse>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        
        {onRetry && (
          <Button onClick={onRetry} variant="contained" color="primary">
            Retry
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ErrorDialog;