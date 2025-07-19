import React from 'react';
import { 
  Box, 
  LinearProgress, 
  Typography, 
  Paper, 
  CircularProgress,
  Button,
  Fade
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

interface ProgressIndicatorProps {
  value: number;
  message?: string;
  detail?: string;
  variant?: 'linear' | 'circular';
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error';
  onCancel?: () => void;
  indeterminate?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  message,
  detail,
  variant = 'linear',
  showPercentage = true,
  size = 'medium',
  color = 'primary',
  onCancel,
  indeterminate = false
}) => {
  const normalizedValue = Math.min(100, Math.max(0, value));
  
  const getCircularSize = () => {
    switch (size) {
      case 'small': return 40;
      case 'large': return 80;
      default: return 60;
    }
  };

  const getLinearHeight = () => {
    switch (size) {
      case 'small': return 4;
      case 'large': return 10;
      default: return 6;
    }
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        maxWidth: variant === 'circular' ? 300 : 500,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {message && (
        <Typography 
          variant={size === 'small' ? 'body2' : size === 'large' ? 'h6' : 'body1'} 
          gutterBottom
          align="center"
        >
          {message}
        </Typography>
      )}
      
      <Box sx={{ width: '100%', mt: 1, mb: 1 }}>
        {variant === 'circular' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <CircularProgress
              variant={indeterminate ? 'indeterminate' : 'determinate'}
              value={normalizedValue}
              size={getCircularSize()}
              color={color}
            />
            {showPercentage && !indeterminate && (
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant={size === 'small' ? 'caption' : 'body2'}
                  component="div"
                  color="text.secondary"
                >
                  {`${Math.round(normalizedValue)}%`}
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ width: '100%', position: 'relative' }}>
            <LinearProgress
              variant={indeterminate ? 'indeterminate' : 'determinate'}
              value={normalizedValue}
              color={color}
              sx={{ 
                height: getLinearHeight(),
                borderRadius: getLinearHeight() / 2
              }}
            />
            {showPercentage && !indeterminate && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 1
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {`${Math.round(normalizedValue)}%`}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
      
      {detail && (
        <Fade in={!!detail}>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            align="center"
            sx={{ mt: 1 }}
          >
            {detail}
          </Typography>
        </Fade>
      )}
      
      {onCancel && (
        <Button
          startIcon={<CancelIcon />}
          color="inherit"
          size="small"
          onClick={onCancel}
          sx={{ mt: 2 }}
        >
          Cancel
        </Button>
      )}
    </Paper>
  );
};

export default ProgressIndicator;