import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolutionProvider, useConflictResolutionContext } from '../ConflictResolutionProvider';
import { CellUpdateParams } from '@shared/types';
import ConflictResolutionService from '../../services/conflictResolution';

// Mock the ConflictResolutionService
vi.mock('../../services/conflictResolution', () => ({
  default: {
    updateCellWithConflictHandling: vi.fn(),
    batchUpdateWithConflictHandling: vi.fn(),
  },
}));

const mockConflictResolutionService = vi.mocked(ConflictResolutionService);

// Test component that uses the context
const TestComponent: React.FC = () => {
  const { updateCell, batchUpdate, isUpdating, clearError } = useConflictResolutionContext();

  const handleUpdateCell = () => {
    const params: CellUpdateParams = {
      sheetName: 'Shots',
      entityId: 'shot_001',
      fieldId: 'title',
      originalValue: 'original',
      newValue: 'updated',
    };
    updateCell(params);
  };

  const handleBatchUpdate = () => {
    const updates: CellUpdateParams[] = [
      {
        sheetName: 'Shots',
        entityId: 'shot_001',
        fieldId: 'title',
        originalValue: 'original1',
        newValue: 'updated1',
      },
    ];
    batchUpdate(updates);
  };

  return (
    <div>
      <button onClick={handleUpdateCell}>Update Cell</button>
      <button onClick={handleBatchUpdate}>Batch Update</button>
      <button onClick={clearError}>Clear Error</button>
      <div data-testid="updating-status">{isUpdating ? 'Updating' : 'Not Updating'}</div>
    </div>
  );
};

describe('ConflictResolutionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides context to child components', () => {
    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    expect(screen.getByText('Update Cell')).toBeInTheDocument();
    expect(screen.getByText('Batch Update')).toBeInTheDocument();
    expect(screen.getByText('Clear Error')).toBeInTheDocument();
    expect(screen.getByTestId('updating-status')).toHaveTextContent('Not Updating');
  });

  it('throws error when useConflictResolutionContext is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useConflictResolutionContext must be used within a ConflictResolutionProvider');

    consoleSpy.mockRestore();
  });

  it('calls updateCell through context', async () => {
    const mockResponse = { success: true, data: { value: 'updated' } };
    mockConflictResolutionService.updateCellWithConflictHandling.mockResolvedValue(mockResponse);

    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    fireEvent.click(screen.getByText('Update Cell'));

    await waitFor(() => {
      expect(mockConflictResolutionService.updateCellWithConflictHandling).toHaveBeenCalledWith(
        {
          sheetName: 'Shots',
          entityId: 'shot_001',
          fieldId: 'title',
          originalValue: 'original',
          newValue: 'updated',
        },
        expect.any(Function)
      );
    });
  });

  it('calls batchUpdate through context', async () => {
    const mockResponse = { success: true, data: [] };
    mockConflictResolutionService.batchUpdateWithConflictHandling.mockResolvedValue(mockResponse);

    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    fireEvent.click(screen.getByText('Batch Update'));

    await waitFor(() => {
      expect(mockConflictResolutionService.batchUpdateWithConflictHandling).toHaveBeenCalledWith(
        [
          {
            sheetName: 'Shots',
            entityId: 'shot_001',
            fieldId: 'title',
            originalValue: 'original1',
            newValue: 'updated1',
          },
        ],
        expect.any(Function)
      );
    });
  });

  it('shows conflict dialog when conflict occurs', async () => {
    let conflictHandler: (conflictData: any) => Promise<any>;
    
    mockConflictResolutionService.updateCellWithConflictHandling.mockImplementation(
      (params, onConflict) => {
        conflictHandler = onConflict!;
        return Promise.resolve({ success: true });
      }
    );

    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    fireEvent.click(screen.getByText('Update Cell'));

    await waitFor(() => {
      expect(mockConflictResolutionService.updateCellWithConflictHandling).toHaveBeenCalled();
    });

    const conflictData = {
      originalValue: 'original',
      currentValue: 'server_value',
      newValue: 'updated',
      fieldId: 'title',
      entityId: 'shot_001',
    };

    // Trigger conflict
    conflictHandler!(conflictData);

    await waitFor(() => {
      expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
    });

    expect(screen.getByText(/Another user has modified this field while you were editing/)).toBeInTheDocument();
    expect(screen.getByText('original')).toBeInTheDocument();
    expect(screen.getByText('server_value')).toBeInTheDocument();
    expect(screen.getByText('updated')).toBeInTheDocument();
  });

  it('shows error snackbar when error occurs', async () => {
    const error = new Error('Test error');
    mockConflictResolutionService.updateCellWithConflictHandling.mockRejectedValue(error);

    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    fireEvent.click(screen.getByText('Update Cell'));

    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    // Check that it's an error alert
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-filledError');
  });

  it('clears error when clearError is called', async () => {
    const error = new Error('Test error');
    mockConflictResolutionService.updateCellWithConflictHandling.mockRejectedValue(error);

    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    fireEvent.click(screen.getByText('Update Cell'));

    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear Error'));

    await waitFor(() => {
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  it('auto-hides error snackbar after timeout', async () => {
    vi.useFakeTimers();
    
    const error = new Error('Test error');
    mockConflictResolutionService.updateCellWithConflictHandling.mockRejectedValue(error);

    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    fireEvent.click(screen.getByText('Update Cell'));

    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    // Fast-forward 6 seconds (autoHideDuration)
    vi.advanceTimersByTime(6000);

    await waitFor(() => {
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('shows updating status correctly', async () => {
    let resolveUpdate: (value: any) => void;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });

    mockConflictResolutionService.updateCellWithConflictHandling.mockReturnValue(updatePromise);

    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    expect(screen.getByTestId('updating-status')).toHaveTextContent('Not Updating');

    fireEvent.click(screen.getByText('Update Cell'));

    await waitFor(() => {
      expect(screen.getByTestId('updating-status')).toHaveTextContent('Updating');
    });

    resolveUpdate!({ success: true });
    await updatePromise;

    await waitFor(() => {
      expect(screen.getByTestId('updating-status')).toHaveTextContent('Not Updating');
    });
  });

  it('handles conflict dialog cancellation', async () => {
    let conflictHandler: (conflictData: any) => Promise<any>;
    
    mockConflictResolutionService.updateCellWithConflictHandling.mockImplementation(
      (params, onConflict) => {
        conflictHandler = onConflict!;
        return Promise.resolve({ success: true });
      }
    );

    render(
      <ConflictResolutionProvider>
        <TestComponent />
      </ConflictResolutionProvider>
    );

    fireEvent.click(screen.getByText('Update Cell'));

    await waitFor(() => {
      expect(mockConflictResolutionService.updateCellWithConflictHandling).toHaveBeenCalled();
    });

    const conflictData = {
      originalValue: 'original',
      currentValue: 'server_value',
      newValue: 'updated',
      fieldId: 'title',
      entityId: 'shot_001',
    };

    // Trigger conflict
    conflictHandler!(conflictData);

    await waitFor(() => {
      expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
    });

    // Cancel the dialog
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Conflict Detected')).not.toBeInTheDocument();
    });
  });
});