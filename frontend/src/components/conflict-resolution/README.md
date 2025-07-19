# Conflict Resolution System

This directory contains the conflict resolution UI components and services for the MOTK system. The conflict resolution system handles concurrent editing scenarios where multiple users modify the same data simultaneously.

## Components

### ConflictDialog
A modal dialog that presents conflict resolution options to users when a conflict is detected.

**Features:**
- Displays original, current server, and new user values
- Provides three resolution options: Overwrite, Edit Again, Keep Server Value
- Handles null/undefined values gracefully
- Supports object and array value display
- Accessible with proper ARIA attributes

**Usage:**
```tsx
import { ConflictDialog } from '../components';

<ConflictDialog
  open={isOpen}
  conflictData={conflictData}
  onResolve={(choice) => handleResolve(choice)}
  onCancel={() => handleCancel()}
/>
```

### ConflictResolutionProvider
A React context provider that wraps the conflict resolution functionality and provides it to child components.

**Features:**
- Manages conflict dialog state
- Handles error display with snackbars
- Provides updateCell and batchUpdate functions
- Integrates with the ConflictResolutionService

**Usage:**
```tsx
import { ConflictResolutionProvider, useConflictResolutionContext } from '../components';

function App() {
  return (
    <ConflictResolutionProvider>
      <YourComponents />
    </ConflictResolutionProvider>
  );
}

function YourComponent() {
  const { updateCell, isUpdating } = useConflictResolutionContext();
  // Use updateCell for conflict-aware updates
}
```

## Services

### ConflictResolutionService
A service class that handles conflict detection, retry logic, and resolution.

**Features:**
- Conflict detection using deep value comparison
- Exponential backoff retry logic for network errors
- Support for batch updates
- Three resolution strategies: overwrite, keep server, edit again

**Key Methods:**
- `detectConflict(originalValue, currentValue)` - Detects if values differ
- `updateCellWithConflictHandling(params, onConflict)` - Updates with conflict handling
- `batchUpdateWithConflictHandling(updates, onConflict)` - Batch updates with conflict handling

## Hooks

### useConflictResolution
A custom React hook that provides conflict resolution functionality.

**Returns:**
- `updateCell` - Function to update a single cell with conflict handling
- `batchUpdate` - Function to update multiple cells with conflict handling
- `isUpdating` - Boolean indicating if an update is in progress
- `error` - Current error message (if any)
- `isConflictDialogOpen` - Boolean indicating if conflict dialog is open
- `currentConflict` - Current conflict data
- `resolveConflict` - Function to resolve a conflict
- `dismissConflict` - Function to dismiss a conflict
- `clearError` - Function to clear the current error

## Conflict Resolution Flow

1. User attempts to update a cell
2. System sends update request with original value
3. If server detects conflict (original ≠ current), returns 409 status
4. ConflictDialog is displayed with three options:
   - **Overwrite**: Force update with user's value
   - **Edit Again**: Allow user to edit with current server value
   - **Keep Server**: Accept server value and discard user changes
5. System processes the user's choice and completes the update

## Error Handling

The system handles various error scenarios:

- **Network Errors**: Automatic retry with exponential backoff (up to 3 attempts)
- **Conflict Errors**: User-guided resolution through dialog
- **Validation Errors**: Immediate feedback to user
- **Server Errors**: Retry for 5xx errors, immediate failure for 4xx errors

## Testing

Comprehensive test suites are provided for all components:

- `ConflictDialog.test.tsx` - Tests dialog rendering and user interactions
- `ConflictResolutionProvider.test.tsx` - Tests provider functionality and context
- `useConflictResolution.test.tsx` - Tests hook behavior and state management
- `conflictResolution.test.ts` - Tests service logic and error handling

Run tests with:
```bash
npm test
```

## Integration Example

```tsx
import React from 'react';
import { ConflictResolutionProvider, useConflictResolutionContext } from './components';
import { CellUpdateParams } from '@shared/types';

function DataGrid() {
  const { updateCell, isUpdating } = useConflictResolutionContext();

  const handleCellEdit = async (entityId: string, fieldId: string, newValue: any, originalValue: any) => {
    const params: CellUpdateParams = {
      sheetName: 'Shots',
      entityId,
      fieldId,
      originalValue,
      newValue,
    };

    const result = await updateCell(params);
    
    if (result.success) {
      // Update local state
      console.log('Update successful');
    } else if (result.error === 'edit_again') {
      // User chose to edit again, show current server value
      console.log('Edit again with server value:', result.data?.currentValue);
    }
  };

  return (
    <div>
      {/* Your data grid component */}
      {isUpdating && <div>Updating...</div>}
    </div>
  );
}

function App() {
  return (
    <ConflictResolutionProvider>
      <DataGrid />
    </ConflictResolutionProvider>
  );
}
```

## Requirements Satisfied

This implementation satisfies the following requirements from the MOTK specification:

- **Requirement 2.1**: Stores original value for conflict detection
- **Requirement 2.2**: Performs optimistic UI updates
- **Requirement 2.3**: Presents conflict dialog with three resolution options
- **Requirement 2.4**: Allows concurrent edits without blocking
- **Requirement 2.5**: Implements retry logic with exponential backoff for network errors