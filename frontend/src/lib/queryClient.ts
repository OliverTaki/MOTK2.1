import { QueryClient } from '@tanstack/react-query';

// Create a query client with optimized caching and background refetch settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Refetch on window focus for real-time collaboration
      refetchOnWindowFocus: true,
      // Refetch on reconnect to get latest data
      refetchOnReconnect: true,
      // Background refetch interval for active queries (30 seconds)
      refetchInterval: 30 * 1000,
      // Only refetch in background when window is focused
      refetchIntervalInBackground: false,
      // Retry failed requests up to 3 times with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Sheets data queries
  sheets: {
    all: ['sheets'] as const,
    sheet: (sheetName: string) => ['sheets', sheetName] as const,
    sheetRange: (sheetName: string, range?: string) => 
      ['sheets', sheetName, range] as const,
  },
  
  // Entity queries
  entities: {
    all: ['entities'] as const,
    type: (entityType: string) => ['entities', entityType] as const,
    list: (entityType: string, params?: any) => 
      ['entities', entityType, 'list', params] as const,
    detail: (entityType: string, id: string) => 
      ['entities', entityType, 'detail', id] as const,
  },
  
  // Project queries
  projects: {
    all: ['projects'] as const,
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
    config: (projectId: string) => ['projects', 'config', projectId] as const,
  },
  
  // File queries
  files: {
    all: ['files'] as const,
    entity: (entityId: string) => ['files', 'entity', entityId] as const,
    file: (entityId: string, fileName: string) => 
      ['files', 'entity', entityId, fileName] as const,
  },
} as const;