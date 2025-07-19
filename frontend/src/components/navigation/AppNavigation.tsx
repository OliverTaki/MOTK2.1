import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Movie as ShotIcon,
  Inventory as AssetIcon,
  Assignment as TaskIcon,
  People as TeamIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Schedule as ScheduleIcon,
  Chat as ChatIcon,
  Forum as ForumIcon,
  ViewList as TableIcon,
  Info as OverviewIcon,
  InfoOutlined as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface AppNavigationProps {
  projectName?: string;
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavigationItem[];
}

const AppNavigation: React.FC<AppNavigationProps> = ({
  projectName = 'MOTK Project',
  userName = 'User',
  userAvatar,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [navMenuAnchor, setNavMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

  // Navigation items supporting multiple page types as per requirement 6.1
  // Supporting page types: table, overview, shot_detail, asset_detail, task_detail, schedule, chat, forum, member_detail
  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      path: '/',
      icon: <DashboardIcon />,
    },
    {
      label: 'Shots',
      path: '/shots',
      icon: <ShotIcon />,
      badge: 0, // TODO: Add actual count from data
      children: [
        {
          label: 'All Shots',
          path: '/shots',
          icon: <ShotIcon />,
        },
        {
          label: 'Table View',
          path: '/shots/table',
          icon: <TableIcon />,
        },
        {
          label: 'Overview',
          path: '/shots/overview',
          icon: <OverviewIcon />,
        },
        {
          label: 'Shot Details',
          path: '/shots/detail',
          icon: <InfoIcon />,
        },
      ],
    },
    {
      label: 'Assets',
      path: '/assets',
      icon: <AssetIcon />,
      badge: 0, // TODO: Add actual count from data
      children: [
        {
          label: 'All Assets',
          path: '/assets',
          icon: <AssetIcon />,
        },
        {
          label: 'Table View',
          path: '/assets/table',
          icon: <TableIcon />,
        },
        {
          label: 'Overview',
          path: '/assets/overview',
          icon: <OverviewIcon />,
        },
        {
          label: 'Asset Details',
          path: '/assets/detail',
          icon: <InfoIcon />,
        },
      ],
    },
    {
      label: 'Tasks',
      path: '/tasks',
      icon: <TaskIcon />,
      badge: 0, // TODO: Add actual count from data
      children: [
        {
          label: 'All Tasks',
          path: '/tasks',
          icon: <TaskIcon />,
        },
        {
          label: 'Table View',
          path: '/tasks/table',
          icon: <TableIcon />,
        },
        {
          label: 'Schedule View',
          path: '/tasks/schedule',
          icon: <ScheduleIcon />,
        },
        {
          label: 'Task Details',
          path: '/tasks/detail',
          icon: <InfoIcon />,
        },
      ],
    },
    {
      label: 'Team',
      path: '/team',
      icon: <TeamIcon />,
      children: [
        {
          label: 'All Team',
          path: '/team',
          icon: <TeamIcon />,
        },
        {
          label: 'Members',
          path: '/team/members',
          icon: <TeamIcon />,
        },
        {
          label: 'Member Details',
          path: '/team/member-detail',
          icon: <InfoIcon />,
        },
        {
          label: 'Chat',
          path: '/team/chat',
          icon: <ChatIcon />,
        },
        {
          label: 'Forum',
          path: '/team/forum',
          icon: <ForumIcon />,
        },
      ],
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    if (onLogout) {
      onLogout();
    }
  };

  const isCurrentPath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleExpanded = (itemPath: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemPath)) {
      newExpanded.delete(itemPath);
    } else {
      newExpanded.add(itemPath);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavMenuOpen = (event: React.MouseEvent<HTMLElement>, itemPath: string) => {
    setNavMenuAnchor(prev => ({
      ...prev,
      [itemPath]: event.currentTarget,
    }));
  };

  const handleNavMenuClose = (itemPath: string) => {
    setNavMenuAnchor(prev => ({
      ...prev,
      [itemPath]: null,
    }));
  };

  // Desktop Navigation
  const DesktopNavigation = () => (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {/* Logo/Project Name */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 0, mr: 4, cursor: 'pointer' }}
          onClick={() => handleNavigate('/')}
        >
          {projectName}
        </Typography>

        {/* Navigation Items */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {navigationItems.map((item) => (
            <React.Fragment key={item.path}>
              <Button
                color="inherit"
                onClick={(e) => {
                  if (item.children && item.children.length > 0) {
                    // For items with children, navigate to the main path
                    handleNavigate(item.path);
                  } else {
                    handleNavigate(item.path);
                  }
                }}
                onMouseEnter={(e) => {
                  if (item.children && item.children.length > 0) {
                    handleNavMenuOpen(e, item.path);
                  }
                }}
                sx={{
                  backgroundColor: isCurrentPath(item.path) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
                startIcon={
                  item.badge && item.badge > 0 ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )
                }
                endIcon={item.children && item.children.length > 0 ? <ExpandMoreIcon /> : undefined}
              >
                {item.label}
              </Button>
              
              {/* Dropdown Menu for Desktop */}
              {item.children && item.children.length > 0 && (
                <Menu
                  anchorEl={navMenuAnchor[item.path]}
                  open={Boolean(navMenuAnchor[item.path])}
                  onClose={() => handleNavMenuClose(item.path)}
                  MenuListProps={{
                    onMouseLeave: () => handleNavMenuClose(item.path),
                  }}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                >
                  <MenuItem onClick={() => { handleNavMenuClose(item.path); handleNavigate(item.path); }}>
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={`All ${item.label}`} />
                  </MenuItem>
                  <Divider />
                  {item.children.map((child) => (
                    <MenuItem
                      key={child.path}
                      onClick={() => { handleNavMenuClose(item.path); handleNavigate(child.path); }}
                      selected={isCurrentPath(child.path)}
                    >
                      <ListItemIcon>
                        {child.icon}
                      </ListItemIcon>
                      <ListItemText primary={child.label} />
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </React.Fragment>
          ))}
        </Box>

        {/* Right side actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton color="inherit" aria-label="notifications">
            <Badge badgeContent={0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit" onClick={() => handleNavigate('/help')} aria-label="help">
            <HelpIcon />
          </IconButton>

          <IconButton color="inherit" onClick={() => handleNavigate('/settings')} aria-label="settings">
            <SettingsIcon />
          </IconButton>

          {/* User Menu */}
          <IconButton
            color="inherit"
            onClick={handleUserMenuOpen}
            sx={{ ml: 1 }}
            aria-label="account"
          >
            {userAvatar ? (
              <Avatar src={userAvatar} sx={{ width: 32, height: 32 }} />
            ) : (
              <AccountIcon />
            )}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );

  // Mobile Navigation
  const MobileNavigation = () => (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileDrawerOpen(true)}
            sx={{ mr: 2 }}
            aria-label="menu"
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {projectName}
          </Typography>

          <IconButton color="inherit" aria-label="notifications">
            <Badge badgeContent={0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton
            color="inherit"
            onClick={handleUserMenuOpen}
            aria-label="account"
          >
            {userAvatar ? (
              <Avatar src={userAvatar} sx={{ width: 32, height: 32 }} />
            ) : (
              <AccountIcon />
            )}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {projectName}
          </Typography>
        </Box>
        <Divider />
        
        <List>
          {navigationItems.map((item) => (
            <React.Fragment key={item.path}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={isCurrentPath(item.path)}
                  onClick={() => {
                    if (item.children && item.children.length > 0) {
                      toggleExpanded(item.path);
                    } else {
                      handleNavigate(item.path);
                    }
                  }}
                >
                  <ListItemIcon>
                    {item.badge && item.badge > 0 ? (
                      <Badge badgeContent={item.badge} color="error">
                        {item.icon}
                      </Badge>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                  {item.children && item.children.length > 0 && (
                    <IconButton size="small">
                      {expandedItems.has(item.path) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )}
                </ListItemButton>
              </ListItem>
              
              {/* Submenu items */}
              {item.children && expandedItems.has(item.path) && (
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItem key={child.path} disablePadding>
                      <ListItemButton
                        selected={isCurrentPath(child.path)}
                        onClick={() => handleNavigate(child.path)}
                        sx={{ pl: 4 }}
                      >
                        <ListItemIcon>
                          {child.icon}
                        </ListItemIcon>
                        <ListItemText primary={child.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </React.Fragment>
          ))}
        </List>

        <Divider />

        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/settings')}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
          
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/help')}>
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText primary="Help" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );

  // User Menu
  const UserMenu = () => (
    <Menu
      anchorEl={userMenuAnchor}
      open={Boolean(userMenuAnchor)}
      onClose={handleUserMenuClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem disabled>
        <Typography variant="body2" color="text.secondary">
          {userName}
        </Typography>
      </MenuItem>
      <Divider />
      <MenuItem onClick={() => { handleUserMenuClose(); handleNavigate('/profile'); }}>
        <ListItemIcon>
          <AccountIcon fontSize="small" />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={() => { handleUserMenuClose(); handleNavigate('/settings'); }}>
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        Settings
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );

  return (
    <>
      {isMobile ? <MobileNavigation /> : <DesktopNavigation />}
      <UserMenu />
    </>
  );
};

export default AppNavigation;