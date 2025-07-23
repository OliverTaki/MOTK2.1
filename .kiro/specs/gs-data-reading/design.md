# Google Sheets Data Reading Design

## Overview

This design document outlines the architecture for reading and displaying Google Sheets data in the MOTK frontend application. The system will provide a seamless interface between the created Google Sheets templates and the user interface, enabling users to view and interact with their project data.

## Architecture

### High-Level Architecture

```
Frontend (React) ←→ API Server (Express) ←→ Google Sheets API ←→ Google Sheets
     ↓                    ↓                      ↓
  Data Display      Data Processing        Data Storage
  User Interaction   Caching Layer        Source of Truth
```

### Component Structure

1. **Frontend Layer**
   - Project Selection Component
   - Data Display Components (Tables)
   - Loading States & Error Handling
   - Conflict Resolution Dialogs

2. **API Layer**
   - Sheet Data Endpoints
   - Caching Middleware
   - Error Handling
   - Rate Limiting

3. **Google Sheets Integration**
   - SheetsApiClient (existing)
   - Data Transformation
   - Batch Operations

## Components and Interfaces

### Frontend Components

#### ProjectSelector Component
```typescript
interface ProjectSelectorProps {
  onProjectSelect: (projectId: string) => void;
  selectedProject?: string;
}

interface Project {
  project_id: string;
  created_at: string;
  storage_provider: string;
}
```

#### DataTable Component
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition[];
  loading: boolean;
  error?: string;
  onRefresh: () => void;
}

interface ColumnDefinition {
  fieldId: string;        // field_001, field_002, etc.
  fieldName: string;      // shot_id, title, status, etc.
  displayName: string;    // Human-readable name for UI
  width?: number;
  sortable?: boolean;
  formatter?: (value: any) => string;
}

// Example column structure:
// {
//   fieldId: 'field_001',
//   fieldName: 'shot_id', 
//   displayName: 'Shot ID',
//   width: 100
// }
```

#### ConflictDialog Component
```typescript
interface ConflictDialogProps {
  isOpen: boolean;
  originalValue: any;
  currentValue: any;
  newValue: any;
  onResolve: (resolution: 'overwrite' | 'keep_server') => void;
  onCancel: () => void;
}
```

### API Endpoints

#### GET /api/projects
```typescript
// List all available projects
Response: {
  success: boolean;
  data: Project[];
}
```

#### GET /api/projects/:projectId/data
```typescript
// Get all sheet data for a project
Response: {
  success: boolean;
  data: {
    shots: Shot[];
    assets: Asset[];
    tasks: Task[];
    members: ProjectMember[];
    users: User[];
    pages: PageConfig[];
    fields: FieldDefinition[];
    meta: ProjectMeta;
    logs: LogEntry[];
  };
  lastModified: string;
}
```

#### GET /api/projects/:projectId/sheets/:sheetName
```typescript
// Get specific sheet data
Response: {
  success: boolean;
  data: any[];
  lastModified: string;
}
```

### Data Models

#### Sheet Data Types
```typescript
interface Shot {
  shot_id: string;
  episode?: string;
  scene?: string;
  title: string;
  status: ShotStatus;
  priority?: number;
  due_date?: string;
  timecode_fps?: string;
  folder_label?: string;
  folder_url?: string;
  thumbnails?: string;
  file_list?: string;
  versions?: string;
  notes?: string;
}

interface Asset {
  asset_id: string;
  name: string;
  asset_type: AssetType;
  status?: AssetStatus;
  overlap_sensitive?: boolean;
  folder_label?: string;
  folder_url?: string;
  thumbnails?: string;
  file_list?: string;
  versions?: string;
  notes?: string;
}

interface Task {
  task_id: string;
  name: string;
  status: TaskStatus;
  assignee_id?: string;
  start_date?: string;
  end_date?: string;
  shot_id?: string;
  folder_label?: string;
  folder_url?: string;
  notes?: string;
}
```

## Data Flow

### 1. Project Selection Flow
```
User selects project → ProjectSelector → API call → Update state → Load project data
```

### 2. Data Loading Flow
```
Component mount → Check cache → API request → Load Fields mapping → Transform data → Update UI → Cache result
```

### 3. Field Name Resolution Flow
```
Load sheet data → Get field definitions → Map field_ids to field_names → Create display headers → Render table
```

### 3. Conflict Resolution Flow
```
User edits data → Submit change → Conflict detected → Show dialog → User chooses → Apply resolution
```

## Error Handling

### Error Types and Responses

1. **Network Errors**
   - Display: "Connection lost. Showing cached data."
   - Action: Retry with exponential backoff

2. **Authentication Errors**
   - Display: "Authentication expired. Please refresh."
   - Action: Redirect to auth flow

3. **API Rate Limits**
   - Display: "Too many requests. Please wait."
   - Action: Automatic retry after delay

4. **Sheet Not Found**
   - Display: "Project data not found. Please recreate project."
   - Action: Redirect to project setup

5. **Data Corruption**
   - Display: "Data format error. Contact support."
   - Action: Show raw data option

### Error Recovery Strategies

```typescript
interface ErrorRecovery {
  retryCount: number;
  maxRetries: number;
  backoffDelay: number;
  fallbackToCache: boolean;
  userNotification: string;
}
```

## Testing Strategy

### Unit Tests
- Component rendering with different data states
- API endpoint response handling
- Data transformation functions
- Error handling scenarios

### Integration Tests
- End-to-end project selection and data loading
- Google Sheets API integration
- Caching behavior
- Conflict resolution workflow

### Performance Tests
- Large dataset loading (1000+ rows)
- Concurrent user scenarios
- Cache effectiveness
- API response times

## Caching Strategy

### Cache Layers

1. **Browser Cache** (5 minutes)
   - Recent API responses
   - User preferences

2. **API Server Cache** (1 minute)
   - Sheet data responses
   - Transformed data objects

3. **Conditional Requests**
   - ETag headers
   - Last-Modified timestamps

### Cache Invalidation

```typescript
interface CacheStrategy {
  key: string;
  ttl: number;
  invalidateOn: string[];
  refreshStrategy: 'lazy' | 'eager' | 'background';
}
```

## Performance Optimizations

### Data Loading Optimizations

1. **Lazy Loading**
   - Load only visible data initially
   - Load additional data on scroll/demand

2. **Batch Requests**
   - Combine multiple sheet requests
   - Reduce API call overhead

3. **Data Pagination**
   - Limit initial data load
   - Implement virtual scrolling for large datasets

4. **Background Refresh**
   - Update data in background
   - Notify user of changes

### UI Performance

1. **Virtual Scrolling**
   - Render only visible rows
   - Handle large datasets efficiently

2. **Memoization**
   - Cache computed values
   - Prevent unnecessary re-renders

3. **Debounced Updates**
   - Batch user interactions
   - Reduce API calls

## Security Considerations

### Data Access Control
- Validate user permissions for each project
- Implement row-level security where needed
- Audit data access logs

### API Security
- Rate limiting per user
- Input validation and sanitization
- CORS configuration

### Data Privacy
- No sensitive data in client-side cache
- Secure transmission (HTTPS)
- Compliance with data protection regulations

## Monitoring and Logging

### Metrics to Track
- API response times
- Cache hit rates
- Error frequencies
- User engagement patterns

### Logging Strategy
- API request/response logs
- Error tracking with context
- Performance metrics
- User action audit trail

## Deployment Considerations

### Environment Configuration
- Different cache TTLs per environment
- API rate limits per environment
- Error reporting configuration

### Scalability
- Horizontal scaling of API servers
- Database connection pooling
- CDN for static assets

### Monitoring
- Health checks for all services
- Alerting for critical errors
- Performance monitoring dashboards