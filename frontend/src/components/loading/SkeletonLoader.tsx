import React from 'react';
import { Box, Skeleton, Card, CardContent, Grid, Paper } from '@mui/material';

type SkeletonType = 'table' | 'card' | 'list' | 'detail' | 'text' | 'custom';

interface SkeletonLoaderProps {
  type: SkeletonType;
  count?: number;
  height?: number | string;
  width?: number | string;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | false;
  children?: React.ReactNode;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type,
  count = 1,
  height,
  width,
  variant = 'rectangular',
  animation = 'pulse',
  children
}) => {
  const renderTableSkeleton = () => {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', mb: 1 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              variant="rectangular"
              width={`${100 / 5}%`}
              height={40}
              animation={animation}
              sx={{ mx: 0.5 }}
            />
          ))}
        </Box>
        
        {/* Rows */}
        {[...Array(count)].map((_, rowIndex) => (
          <Box key={`row-${rowIndex}`} sx={{ display: 'flex', mb: 1 }}>
            {[...Array(5)].map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant="rectangular"
                width={`${100 / 5}%`}
                height={30}
                animation={animation}
                sx={{ mx: 0.5 }}
              />
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  const renderCardSkeleton = () => {
    return (
      <Grid container spacing={2}>
        {[...Array(count)].map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={`card-${i}`}>
            <Card>
              <Skeleton
                variant="rectangular"
                height={140}
                animation={animation}
              />
              <CardContent>
                <Skeleton
                  variant="text"
                  height={30}
                  width="80%"
                  animation={animation}
                />
                <Skeleton
                  variant="text"
                  height={20}
                  animation={animation}
                />
                <Skeleton
                  variant="text"
                  height={20}
                  width="60%"
                  animation={animation}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderListSkeleton = () => {
    return (
      <Box sx={{ width: '100%' }}>
        {[...Array(count)].map((_, i) => (
          <Box key={`list-${i}`} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              animation={animation}
              sx={{ mr: 2 }}
            />
            <Box sx={{ width: '100%' }}>
              <Skeleton
                variant="text"
                height={24}
                width="60%"
                animation={animation}
              />
              <Skeleton
                variant="text"
                height={16}
                width="80%"
                animation={animation}
              />
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  const renderDetailSkeleton = () => {
    return (
      <Paper sx={{ p: 2 }}>
        <Skeleton
          variant="rectangular"
          height={200}
          animation={animation}
          sx={{ mb: 2 }}
        />
        <Skeleton
          variant="text"
          height={40}
          width="50%"
          animation={animation}
          sx={{ mb: 1 }}
        />
        <Skeleton
          variant="text"
          height={20}
          animation={animation}
          sx={{ mb: 1 }}
        />
        <Skeleton
          variant="text"
          height={20}
          animation={animation}
          sx={{ mb: 1 }}
        />
        <Skeleton
          variant="text"
          height={20}
          width="80%"
          animation={animation}
          sx={{ mb: 2 }}
        />
        
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Skeleton
              variant="rectangular"
              height={100}
              animation={animation}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton
              variant="rectangular"
              height={100}
              animation={animation}
            />
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderTextSkeleton = () => {
    return (
      <Box sx={{ width: width || '100%' }}>
        {[...Array(count)].map((_, i) => (
          <Skeleton
            key={`text-${i}`}
            variant="text"
            height={height || 20}
            width={i % 3 === 0 ? '100%' : i % 3 === 1 ? '80%' : '60%'}
            animation={animation}
            sx={{ mb: 1 }}
          />
        ))}
      </Box>
    );
  };

  const renderCustomSkeleton = () => {
    return children || (
      <Skeleton
        variant={variant}
        height={height}
        width={width}
        animation={animation}
      />
    );
  };

  switch (type) {
    case 'table':
      return renderTableSkeleton();
    case 'card':
      return renderCardSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'detail':
      return renderDetailSkeleton();
    case 'text':
      return renderTextSkeleton();
    case 'custom':
      return renderCustomSkeleton();
    default:
      return renderCustomSkeleton();
  }
};

export default SkeletonLoader;