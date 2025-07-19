import React from 'react';
import { Box, LinearProgress, Typography, AlertColor } from '@mui/material';

interface NotificationProgressProps {
  value: number;
  color?: AlertColor;
}

const NotificationProgress: React.FC<NotificationProgressProps> = ({ value, color = 'info' }) => {
  return (
    <Box sx={{ width: '100%', mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={value} 
            color={color}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }}
          />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="white">{`${Math.round(value)}%`}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NotificationProgress;