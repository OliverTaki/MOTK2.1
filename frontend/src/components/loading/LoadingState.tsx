import React from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  fullPage = false,
  size = 'medium',
  overlay = false
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 60;
      default: return 40;
    }
  };

  const sizeValue = getSizeValue();

  if (overlay) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          zIndex: 1000,
        }}
      >
        <CircularProgress size={sizeValue} />
        {message && (
          <Typography 
            variant={size === 'small' ? 'body2' : 'body1'} 
            sx={{ mt: 2 }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  if (fullPage) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={sizeValue} />
        {message && (
          <Typography 
            variant="h6" 
            sx={{ mt: 2 }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        m: 2,
        backgroundColor: 'transparent',
      }}
    >
      <CircularProgress size={sizeValue} />
      {message && (
        <Typography 
          variant={size === 'small' ? 'body2' : 'body1'} 
          sx={{ mt: 2 }}
        >
          {message}
        </Typography>
      )}
    </Paper>
  );
};

export default LoadingState;