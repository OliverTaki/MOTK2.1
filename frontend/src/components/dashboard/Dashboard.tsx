import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Movie as ShotIcon,
  Inventory as AssetIcon,
  Assignment as TaskIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEntityData } from '../../hooks/useEntityData';
import { EntityType, ENTITY_KIND, Shot, Asset, Task, ShotStatus, AssetStatus, TaskStatus } from '@shared/types';

interface DashboardProps {
  projectId: string;
  projectName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ projectId, projectName }) => {
  const navigate = useNavigate();

  // Fetch recent data for dashboard overview
  const { data: shotsData, isLoading: shotsLoading } = useEntityData<Shot>({
    entityType: ENTITY_KIND.SHOT,
    limit: 10,
    sort: { field: 'due_date', direction: 'asc' }
  });

  const { data: assetsData, isLoading: assetsLoading } = useEntityData<Asset>({
    entityType: ENTITY_KIND.ASSET,
    limit: 10,
    sort: { field: 'status', direction: 'asc' }
  });

  const { data: tasksData, isLoading: tasksLoading } = useEntityData<Task>({
    entityType: ENTITY_KIND.TASK,
    limit: 10,
    sort: { field: 'end_date', direction: 'asc' }
  });

  // Calculate statistics
  const shotStats = React.useMemo(() => {
    if (!shotsData?.data) return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    
    const shots = shotsData.data;
    const now = new Date();
    
    return {
      total: shots.length,
      completed: shots.filter(s => s.status === ShotStatus.COMPLETED).length,
      inProgress: shots.filter(s => s.status === ShotStatus.IN_PROGRESS).length,
      overdue: shots.filter(s => s.due_date && new Date(s.due_date) < now && s.status !== ShotStatus.COMPLETED).length,
    };
  }, [shotsData]);

  const assetStats = React.useMemo(() => {
    if (!assetsData?.data) return { total: 0, completed: 0, inProgress: 0 };
    
    const assets = assetsData.data;
    
    return {
      total: assets.length,
      completed: assets.filter(a => a.status === AssetStatus.COMPLETED).length,
      inProgress: assets.filter(a => a.status === AssetStatus.IN_PROGRESS).length,
    };
  }, [assetsData]);

  const taskStats = React.useMemo(() => {
    if (!tasksData?.data) return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    
    const tasks = tasksData.data;
    const now = new Date();
    
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      overdue: tasks.filter(t => t.end_date && new Date(t.end_date) < now && t.status !== TaskStatus.COMPLETED).length,
    };
  }, [tasksData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'review': return 'warning';
      case 'not_started': return 'default';
      case 'blocked': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString();
  };

  const formatRelativeDate = (date: Date | string | undefined) => {
    if (!date) return 'No date';
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  // Enhanced project overview data
  const projectOverview = React.useMemo(() => {
    const totalItems = shotStats.total + assetStats.total + taskStats.total;
    const completedItems = shotStats.completed + assetStats.completed + taskStats.completed;
    const inProgressItems = shotStats.inProgress + assetStats.inProgress + taskStats.inProgress;
    const overdueItems = shotStats.overdue + taskStats.overdue;
    
    return {
      totalItems,
      completedItems,
      inProgressItems,
      overdueItems,
      completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  }, [shotStats, assetStats, taskStats]);

  // Quick actions for common tasks
  const quickActions = [
    {
      label: 'Create New Shot',
      action: () => navigate('/shots/table?action=create'),
      icon: <ShotIcon />,
      color: 'primary' as const,
    },
    {
      label: 'Create New Asset',
      action: () => navigate('/assets/table?action=create'),
      icon: <AssetIcon />,
      color: 'secondary' as const,
    },
    {
      label: 'Create New Task',
      action: () => navigate('/tasks/table?action=create'),
      icon: <TaskIcon />,
      color: 'info' as const,
    },
    {
      label: 'View Schedule',
      action: () => navigate('/tasks/schedule'),
      icon: <ScheduleIcon />,
      color: 'success' as const,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {projectName}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Project Dashboard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Project Settings">
            <IconButton onClick={() => navigate('/settings')}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Quick Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShotIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Shots</Typography>
              </Box>
              <Typography variant="h4" component="div" gutterBottom>
                {shotStats.total}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${shotStats.completed} Complete`} size="small" color="success" />
                <Chip label={`${shotStats.inProgress} In Progress`} size="small" color="primary" />
                {shotStats.overdue > 0 && (
                  <Chip label={`${shotStats.overdue} Overdue`} size="small" color="error" />
                )}
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/shots')}
              >
                View All Shots
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssetIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Assets</Typography>
              </Box>
              <Typography variant="h4" component="div" gutterBottom>
                {assetStats.total}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${assetStats.completed} Complete`} size="small" color="success" />
                <Chip label={`${assetStats.inProgress} In Progress`} size="small" color="primary" />
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/assets')}
              >
                View All Assets
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TaskIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Tasks</Typography>
              </Box>
              <Typography variant="h4" component="div" gutterBottom>
                {taskStats.total}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${taskStats.completed} Complete`} size="small" color="success" />
                <Chip label={`${taskStats.inProgress} In Progress`} size="small" color="primary" />
                {taskStats.overdue > 0 && (
                  <Chip label={`${taskStats.overdue} Overdue`} size="small" color="error" />
                )}
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/tasks')}
              >
                View All Tasks
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Progress</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Overall Completion
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={shotStats.total > 0 ? (shotStats.completed / shotStats.total) * 100 : 0}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2">
                {shotStats.total > 0 ? Math.round((shotStats.completed / shotStats.total) * 100) : 0}% Complete
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Project Overview Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {projectOverview.totalItems}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Items
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {projectOverview.completedItems}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {projectOverview.inProgressItems}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="error.main">
                      {projectOverview.overdueItems}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overdue
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Overall Project Completion: {projectOverview.completionRate}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={projectOverview.completionRate}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outlined"
                    color={action.color}
                    startIcon={action.icon}
                    onClick={action.action}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity and Upcoming Items */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1 }} />
                Upcoming Deadlines
              </Typography>
              {shotsLoading || tasksLoading ? (
                <LinearProgress />
              ) : (
                <List>
                  {/* Upcoming shots */}
                  {shotsData?.data
                    ?.filter(shot => shot.due_date && shot.status !== ShotStatus.COMPLETED)
                    ?.slice(0, 5)
                    ?.map((shot) => (
                      <ListItem key={shot.shot_id} divider>
                        <ListItemIcon>
                          <ShotIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={shot.title}
                          secondary={`Due: ${formatDate(shot.due_date)}`}
                        />
                        <Chip 
                          label={shot.status} 
                          size="small" 
                          color={getStatusColor(shot.status) as any}
                        />
                      </ListItem>
                    ))}
                  
                  {/* Upcoming tasks */}
                  {tasksData?.data
                    ?.filter(task => task.status === TaskStatus.COMPLETED)
                    ?.slice(0, 2)
                    ?.map((task) => (
                      <ListItem key={task.task_id} divider>
                        <ListItemIcon>
                          <TaskIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={task.name}
                          secondary="Task completed"
                        />
                        <Chip 
                          label={task.status} 
                          size="small" 
                          color={getStatusColor(task.status) as any}
                        />
                      </ListItem>
                    ))}

                  {/* Recently completed assets */}
                  {assetsData?.data
                    ?.filter(asset => asset.status === AssetStatus.COMPLETED)
                    ?.slice(0, 0)
                    ?.map((asset) => (
                      <ListItem key={asset.asset_id} divider>
                        <ListItemIcon>
                          <AssetIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={asset.name}
                          secondary="Asset completed"
                        />
                        <Chip label="Completed" size="small" color="success" />
                      </ListItem>
                    ))}

                  {(!shotsData?.data?.some(s => s.status === ShotStatus.COMPLETED) && 
                    !tasksData?.data?.some(t => t.status === TaskStatus.COMPLETED) &&
                    !assetsData?.data?.some(a => a.status === AssetStatus.COMPLETED)) && (
                    <ListItem>
                      <ListItemText 
                        primary="No recent activity"
                        secondary="Start working on items to see activity here"
                      />
                    </ListItem>
                  )}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;