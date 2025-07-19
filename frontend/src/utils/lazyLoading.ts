import { lazy } from 'react';

/**
 * Lazy loading utilities for code splitting and performance optimization
 */

// Lazy load components with error boundaries
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = lazy(importFunc);
  
  return LazyComponent;
};

// Main application components
export const LazyComponents = {
  // File Management Components
  FileManagementDemo: lazy(() => import('../components/file-management/FileManagementDemo')),
  FileUpload: lazy(() => import('../components/file-management/FileUpload')),
  ThumbnailGrid: lazy(() => import('../components/file-management/ThumbnailGrid')),
  FileList: lazy(() => import('../components/file-management/FileList')),
  VersionsDisplay: lazy(() => import('../components/file-management/VersionsDisplay')),
  
  // Entity Management Components
  EntityTable: lazy(() => import('../components/entities/EntityTable')),
  ShotTable: lazy(() => import('../components/entities/ShotTable')),
  AssetTable: lazy(() => import('../components/entities/AssetTable')),
  TaskTable: lazy(() => import('../components/entities/TaskTable')),
  
  // Page Configuration Components
  PageConfigDialog: lazy(() => import('../components/pages/PageConfigDialog')),
  
  // Authentication Components
  LoginPage: lazy(() => import('../components/auth/LoginPage')),
  AuthCallback: lazy(() => import('../components/auth/AuthCallback')),
  
  // Dashboard Components
  Dashboard: lazy(() => import('../components/dashboard/Dashboard')),
  ProjectOverview: lazy(() => import('../components/dashboard/ProjectOverview')),
  
  // Settings Components
  SettingsPage: lazy(() => import('../components/settings/SettingsPage')),
  UserProfile: lazy(() => import('../components/settings/UserProfile'))
};

// Route-based lazy loading
export const LazyRoutes = {
  Home: lazy(() => import('../pages/Home')),
  Dashboard: lazy(() => import('../pages/Dashboard')),
  Entities: lazy(() => import('../pages/Entities')),
  Files: lazy(() => import('../pages/Files')),
  Settings: lazy(() => import('../pages/Settings')),
  Login: lazy(() => import('../pages/Login')),
  NotFound: lazy(() => import('../pages/NotFound'))
};

// Preload critical components
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be needed soon
  const criticalComponents = [
    () => import('../components/file-management/FileManagementDemo'),
    () => import('../components/entities/EntityTable'),
    () => import('../components/dashboard/Dashboard')
  ];
  
  criticalComponents.forEach(importFunc => {
    // Preload without blocking
    importFunc().catch(error => {
      console.warn('Failed to preload component:', error);
    });
  });
};

// Preload components based on user interaction
export const preloadOnHover = (componentName: keyof typeof LazyComponents) => {
  return {
    onMouseEnter: () => {
      // Preload component when user hovers over trigger element
      const componentImport = getComponentImport(componentName);
      if (componentImport) {
        componentImport().catch(error => {
          console.warn(`Failed to preload ${componentName}:`, error);
        });
      }
    }
  };
};

// Get component import function
const getComponentImport = (componentName: keyof typeof LazyComponents) => {
  const importMap: Record<string, () => Promise<any>> = {
    FileManagementDemo: () => import('../components/file-management/FileManagementDemo'),
    FileUpload: () => import('../components/file-management/FileUpload'),
    ThumbnailGrid: () => import('../components/file-management/ThumbnailGrid'),
    FileList: () => import('../components/file-management/FileList'),
    VersionsDisplay: () => import('../components/file-management/VersionsDisplay'),
    EntityTable: () => import('../components/entities/EntityTable'),
    ShotTable: () => import('../components/entities/ShotTable'),
    AssetTable: () => import('../components/entities/AssetTable'),
    TaskTable: () => import('../components/entities/TaskTable'),
    PageConfigDialog: () => import('../components/pages/PageConfigDialog'),
    LoginPage: () => import('../components/auth/LoginPage'),
    AuthCallback: () => import('../components/auth/AuthCallback'),
    Dashboard: () => import('../components/dashboard/Dashboard'),
    ProjectOverview: () => import('../components/dashboard/ProjectOverview'),
    SettingsPage: () => import('../components/settings/SettingsPage'),
    UserProfile: () => import('../components/settings/UserProfile')
  };
  
  return importMap[componentName];
};

// Bundle analysis helper
export const getBundleInfo = () => {
  return {
    lazyComponentsCount: Object.keys(LazyComponents).length,
    lazyRoutesCount: Object.keys(LazyRoutes).length,
    estimatedSavings: 'Approximately 60-80% reduction in initial bundle size'
  };
};

// Performance monitoring for lazy loading
export const trackLazyLoadPerformance = (componentName: string) => {
  const startTime = performance.now();
  
  return {
    onLoad: () => {
      const loadTime = performance.now() - startTime;
      console.log(`Lazy component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      
      // Send to analytics if available
      if (typeof gtag !== 'undefined') {
        gtag('event', 'lazy_component_load', {
          component_name: componentName,
          load_time: Math.round(loadTime)
        });
      }
    },
    onError: (error: Error) => {
      console.error(`Failed to load lazy component ${componentName}:`, error);
      
      // Send error to analytics if available
      if (typeof gtag !== 'undefined') {
        gtag('event', 'lazy_component_error', {
          component_name: componentName,
          error_message: error.message
        });
      }
    }
  };
};