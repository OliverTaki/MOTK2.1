# Design Document: Default Project Change

## Overview

This design document outlines the approach for changing the default project in the frontend from "demo-project" to the user's actual Google Sheets project. The current implementation uses a hardcoded default project, which requires users to manually switch to their actual project. The new implementation will automatically load the user's project and persist the selection between sessions.

## Architecture

The solution will leverage the existing project selection mechanism but enhance it with:

1. **Project Persistence**: Store the selected project ID in localStorage to maintain selection between sessions
2. **Automatic Project Loading**: Fetch available projects on application startup and select the appropriate one
3. **Fallback Mechanism**: Handle cases where no projects exist or when errors occur during loading

## Components and Interfaces

### Modified Components

1. **App.tsx**
   - Add localStorage integration for project persistence
   - Implement project loading logic in useEffect
   - Handle loading states and errors appropriately

2. **ProjectSelector.tsx**
   - Enhance to support multiple projects if available
   - Add UI for project switching
   - Integrate with localStorage for persistence

### New Interfaces

```typescript
interface ProjectSelectionState {
  selectedProjectId: string | null;
  availableProjects: ProjectConfig[];
  isLoading: boolean;
  error: string | null;
}

interface ProjectStorageData {
  selectedProjectId: string;
  lastUsedAt: string; // ISO date string
}
```

## Data Models

The existing `ProjectConfig` interface will be used:

```typescript
interface ProjectConfig {
  project_id: string;
  storage_provider: string;
  originals_root_url: string;
  proxies_root_url: string;
  created_at: Date;
}
```

## Data Flow

1. On application startup:
   - Check localStorage for previously selected project ID
   - Fetch available projects from the API
   - If a previously selected project exists and is available, select it
   - If no previously selected project exists or it's not available, select the most recently used project
   - If no projects are available, show the project setup wizard

2. When user selects a project:
   - Update the application state with the selected project
   - Store the selection in localStorage with timestamp
   - Update UI components to reflect the selected project

## Error Handling

1. **Project Loading Errors**:
   - Display error message in the UI
   - Provide retry option
   - Offer fallback to project setup wizard

2. **Project Not Found**:
   - If the previously selected project is not found, select another available project
   - If no projects are available, show the project setup wizard

3. **localStorage Unavailable**:
   - Gracefully degrade to API-only project loading
   - Do not block application functionality

## Testing Strategy

1. **Unit Tests**:
   - Test localStorage integration
   - Test project selection logic
   - Test error handling scenarios

2. **Integration Tests**:
   - Test project loading flow
   - Test project switching
   - Test persistence between sessions

3. **Edge Cases**:
   - Test behavior when localStorage is unavailable
   - Test behavior when API returns errors
   - Test behavior with multiple projects
   - Test behavior with no projects