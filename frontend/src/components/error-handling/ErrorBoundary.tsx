import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { ErrorLogger } from '../../services/error/ErrorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  errorLogger?: ErrorLogger;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our error logging service
    const { errorLogger } = this.props;
    
    if (errorLogger) {
      errorLogger.logError({
        error,
        errorInfo,
        componentStack: errorInfo.componentStack,
        type: 'react_error_boundary'
      });
    } else {
      // Fallback to console if no logger provided
      console.error('Uncaught error in component:', error, errorInfo);
    }

    this.setState({
      errorInfo
    });
  }

  handleReset = (): void => {
    const { onReset } = this.props;
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (onReset) {
      onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            m: 2, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
          
          <Typography variant="h5" component="h2" gutterBottom>
            Something went wrong
          </Typography>
          
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            We've encountered an unexpected error. The development team has been notified.
          </Typography>
          
          {error && (
            <Box 
              sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1, 
                width: '100%',
                mb: 3,
                overflow: 'auto',
                maxHeight: 200
              }}
            >
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                {error.toString()}
              </Typography>
            </Box>
          )}
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={this.handleReset}
          >
            Try Again
          </Button>
        </Paper>
      );
    }

    return children;
  }
}

export default ErrorBoundary;