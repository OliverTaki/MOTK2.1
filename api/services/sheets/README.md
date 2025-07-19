# Google Sheets API Client

This module provides a comprehensive Google Sheets API client wrapper for the MOTK system, implementing authentication, CRUD operations, error handling, and connection management.

## Features

### Core Functionality
- **Authentication**: Supports both API key and service account authentication
- **Connection Management**: Built-in connection validation and retry logic
- **CRUD Operations**: Complete create, read, update, delete operations for sheets and cells
- **Conflict Detection**: Optimistic locking with conflict resolution for concurrent edits
- **Batch Operations**: Efficient batch updates with conflict handling
- **Project Initialization**: Automated creation of standardized project sheet structures

### Advanced Features
- **Retry Logic**: Exponential backoff for retryable errors (rate limits, network issues)
- **Error Handling**: Comprehensive error classification and handling
- **Sheet Management**: Create, validate, and manage multiple sheets
- **Metadata Operations**: Get spreadsheet info, row counts, and sheet existence checks
- **Column Mapping**: Excel-style column notation (A, B, C, ..., AA, AB, etc.)

## API Reference

### Core Interface: `ISheetsApiClient`

#### Project Management
```typescript
initializeProject(projectConfig: ProjectConfig): Promise<ProjectMeta>
```
Creates a new project with 9 standardized sheets (Shots, Assets, Tasks, ProjectMembers, Users, Pages, Fields, project_meta, Logs).

#### Data Operations
```typescript
getSheetData(sheetName: string, range?: string): Promise<SheetData>
updateCell(params: CellUpdateParams): Promise<UpdateResult>
batchUpdate(params: BatchUpdateParams): Promise<BatchResult>
```

#### Sheet Management
```typescript
createSheet(sheetName: string, headers: string[]): Promise<boolean>
getSheetNames(): Promise<string[]>
clearSheet(sheetName: string): Promise<boolean>
appendRows(sheetName: string, values: any[][]): Promise<UpdateResult>
```

#### Utility Methods
```typescript
validateConnection(): Promise<boolean>
getSpreadsheetInfo(): Promise<{ title: string; sheetCount: number; sheets: string[] }>
sheetExists(sheetName: string): Promise<boolean>
getRowCount(sheetName: string): Promise<number>
createMultipleSheets(sheetConfigs: Array<{ name: string; headers: string[] }>): Promise<{ created: string[]; failed: string[] }>
```

## Usage Examples

### Basic Setup
```typescript
import { SheetsApiClient } from './SheetsApiClient';

// With API key
const client = new SheetsApiClient('spreadsheet-id', 'api-key');

// With service account
const client = new SheetsApiClient('spreadsheet-id', undefined, '/path/to/service-account.json');

// Using environment variables
const client = new SheetsApiClient();
```

### Project Initialization
```typescript
const projectConfig = {
  project_id: 'my-animation-project',
  storage_provider: 'gdrive',
  originals_root_url: 'https://drive.google.com/drive/folders/originals',
  proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
  created_at: new Date()
};

const result = await client.initializeProject(projectConfig);
console.log(`Created ${result.sheets_created.length} sheets`);
```

### Cell Updates with Conflict Detection
```typescript
const updateParams = {
  sheetName: 'Shots',
  entityId: 'shot_001',
  fieldId: 'status',
  originalValue: 'in_progress',
  newValue: 'completed'
};

const result = await client.updateCell(updateParams);

if (result.conflict) {
  console.log('Conflict detected:', result.currentValue);
  // Handle conflict resolution
} else if (result.success) {
  console.log('Update successful');
}
```

### Batch Operations
```typescript
const batchParams = {
  updates: [
    {
      sheetName: 'Shots',
      entityId: 'shot_001',
      fieldId: 'status',
      originalValue: 'in_progress',
      newValue: 'completed'
    },
    {
      sheetName: 'Shots',
      entityId: 'shot_002',
      fieldId: 'priority',
      originalValue: 1,
      newValue: 2
    }
  ]
};

const result = await client.batchUpdate(batchParams);
console.log(`Updated ${result.totalUpdated} cells, ${result.conflicts.length} conflicts`);
```

## Error Handling

The client implements comprehensive error handling with automatic retry for transient errors:

### Retryable Errors
- Rate limit exceeded
- Quota exceeded
- Network timeouts
- Connection issues
- Service unavailable
- Bad gateway
- Gateway timeout

### Non-Retryable Errors
- Invalid credentials
- Permission denied
- Invalid spreadsheet ID
- Malformed requests

### Retry Configuration
- **Max Attempts**: 3
- **Base Delay**: 1000ms
- **Backoff Strategy**: Exponential (1s, 2s, 4s)

## Testing

The module includes comprehensive unit tests covering:

### Test Coverage
- **Authentication**: API key and service account setup
- **Connection Management**: Validation and error handling
- **CRUD Operations**: All sheet and cell operations
- **Conflict Detection**: Concurrent edit scenarios
- **Batch Operations**: Multiple updates and conflict handling
- **Project Initialization**: Complete project setup workflows
- **Error Handling**: Retry logic and error classification
- **Utility Methods**: Helper functions and metadata operations

### Running Tests
```bash
# Run all sheets API tests
npm test -- --testPathPattern="SheetsApiClient"

# Run specific test suites
npm test -- --testPathPattern="basic"
npm test -- --testPathPattern="comprehensive"
npm test -- --testPathPattern="extended"
```

## Configuration

### Environment Variables
```env
GOOGLE_SHEETS_API_KEY=your_api_key_here
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
```

### Authentication Options

#### API Key (Development)
- Free tier: 100 requests per 100 seconds per user
- Suitable for development and testing
- No server-side authentication required

#### Service Account (Production)
- Higher rate limits
- Server-to-server authentication
- Requires service account JSON file

## Sheet Structure

The client creates standardized sheets for MOTK projects:

### Core Entity Sheets
- **Shots**: shot_id, episode, scene, title, status, priority, due_date, timecode_fps, folder_label, folder_url, thumbnails, file_list, versions, notes
- **Assets**: asset_id, name, asset_type, status, overlap_sensitive, folder_label, folder_url, thumbnails, file_list, versions, notes
- **Tasks**: task_id, name, status, assignee_id, start_date, end_date, shot_id, folder_label, folder_url, notes

### Management Sheets
- **ProjectMembers**: member_id, user_id, role, department, permissions, joined_date, active
- **Users**: user_id, email, name, google_id, avatar_url, created_date, last_login
- **Pages**: page_id, name, type, config, shared, created_by, created_date, modified_date
- **Fields**: field_id, entity, field_name, type, editable, required, options

### System Sheets
- **project_meta**: project_id, storage_provider, originals_root_url, proxies_root_url, created_at
- **Logs**: log_id, timestamp, user_id, action, entity_type, entity_id, changes, ip_address

## Requirements Satisfied

This implementation satisfies the following requirements from the MOTK specification:

- **1.1**: Project initialization with standardized sheet structures
- **1.2**: Predefined columns with correct data types and sample data
- **8.1**: RESTful API endpoints for all CRUD operations
- **8.2**: Conflict handling with originalValue/newValue comparison

The Google Sheets API client wrapper is now complete and ready for integration with the broader MOTK system.