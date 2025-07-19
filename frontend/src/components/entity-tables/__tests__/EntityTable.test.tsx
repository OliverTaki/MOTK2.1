import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { EntityTable } from '../EntityTable';
import { EntityType } from '@shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the conflict resolution hook
vi.mock('../../../hooks/useConflictResolution', () => ({
  useConflictResolution: () => ({
    updateCell: vi.fn().mockResolvedValue({ success: true }),
    isUpdating: false,
    error: null,
  }),
}));

describe('EntityTable', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockData = [
    { id: '1', name: 'Test Entity 1', status: 'active' },
    { id: '2', name: 'Test Entity 2', status: 'inactive' },
  ];

  const mockColumns = [
    { field: 'entity_id', headerName: 'ID', width: 100 },
    { field: 'name', headerName: 'Name', width: 200, editable: true },
    { field: 'status', headerName: 'Status', width: 150, editable: true },
  ];

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EntityTable
          entityType={EntityType.SHOT}
          entityTypeName="Entity"
          data={mockData}
          columns={mockColumns}
          loading={false}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table with data', () => {
    renderComponent();
    
    // Check if column headers are rendered
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check if data rows are rendered
    expect(screen.getByText('Test Entity 1')).toBeInTheDocument();
    expect(screen.getByText('Test Entity 2')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    renderComponent({ loading: true });
    
    // Check if loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorMessage = 'Failed to load data';
    renderComponent({ error: errorMessage });
    
    // Check if error message is shown
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders add button in toolbar when onAddEntity is provided', () => {
    const onAddEntity = vi.fn();
    renderComponent({ onAddEntity });
    
    // Check if add button is shown
    const addButton = screen.getByText('Add Entity');
    expect(addButton).toBeInTheDocument();
    
    // Click add button
    fireEvent.click(addButton);
    
    // Check if onAddEntity was called
    expect(onAddEntity).toHaveBeenCalledTimes(1);
  });

  it('does not render add button when isReadOnly is true', () => {
    const onAddEntity = vi.fn();
    renderComponent({ onAddEntity, isReadOnly: true });
    
    // Check that add button is not shown
    expect(screen.queryByText('Add Entity')).not.toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', async () => {
    const onRowClick = vi.fn();
    renderComponent({ onRowClick });
    
    // Find and click on a row
    const row = screen.getByText('Test Entity 1');
    fireEvent.click(row);
    
    // Wait for the click handler to be called
    await waitFor(() => {
      expect(onRowClick).toHaveBeenCalledTimes(1);
    });
  });
});