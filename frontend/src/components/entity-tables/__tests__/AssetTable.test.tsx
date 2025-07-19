import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AssetTable } from '../AssetTable';
import { Asset, EntityType, AssetStatus, AssetType } from '@shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
vi.mock('../../../hooks/useEntityData', () => ({
  useEntityData: vi.fn().mockImplementation(({ entityType }) => {
    if (entityType === 'asset') {
      return {
        data: { data: [
          { asset_id: 'asset1', name: 'Asset 1', asset_type: AssetType.PROP, status: AssetStatus.IN_PROGRESS, overlap_sensitive: false },
          { asset_id: 'asset2', name: 'Asset 2', asset_type: AssetType.CHARACTER, status: AssetStatus.COMPLETED, overlap_sensitive: true },
        ]},
        isLoading: false,
        error: null,
      };
    }
    return { data: null, isLoading: false, error: null };
  }),
  useUpdateEntity: vi.fn(() => ({
    mutateAsync: vi.fn().mockImplementation(async ({ id, data }) => data),
  })),
  useCreateEntity: vi.fn(() => ({
    mutateAsync: vi.fn().mockImplementation(async (data) => ({ ...data, asset_id: `new-asset-${Date.now()}` })),
  })),
}));

describe('AssetTable', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AssetTable {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table with asset data', () => {
    renderComponent();
    
    expect(screen.getByText('Asset 1')).toBeInTheDocument();
    expect(screen.getByText('Asset 2')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('opens and closes the add asset dialog', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Add Asset'));
    expect(screen.getByText('Add New Asset')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Add New Asset')).not.toBeInTheDocument());
  });

  it('creates a new asset', async () => {
    const { useCreateEntity } = await vi.importActual('../../../hooks/useEntityData');
    const mockCreateMutation = useCreateEntity();
    vi.mocked(mockCreateMutation.mutateAsync).mockResolvedValueOnce({
      asset_id: 'new-asset-123',
      name: 'New Asset',
      asset_type: AssetType.PROP,
      status: AssetStatus.NOT_STARTED,
      overlap_sensitive: false,
    });

    renderComponent();
    fireEvent.click(screen.getByText('Add Asset'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Asset' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        name: 'New Asset',
        asset_type: AssetType.PROP,
        status: AssetStatus.NOT_STARTED,
        overlap_sensitive: false,
      });
    });
  });

  it('updates an existing asset', async () => {
    const { useUpdateEntity } = await vi.importActual('../../../hooks/useEntityData');
    const mockUpdateMutation = useUpdateEntity();
    vi.mocked(mockUpdateMutation.mutateAsync).mockResolvedValueOnce({
      asset_id: 'asset1',
      name: 'Asset 1 Updated',
      status: AssetStatus.COMPLETED,
    });

    renderComponent();
    
    // Find the row and click to edit (assuming editable cells)
    const asset1NameCell = screen.getByRole('cell', { name: 'Asset 1' });
    fireEvent.doubleClick(asset1NameCell);

    const nameInput = screen.getByDisplayValue('Asset 1');
    fireEvent.change(nameInput, { target: { value: 'Asset 1 Updated' } });
    fireEvent.blur(nameInput); // Trigger save

    await waitFor(() => {
      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'asset1',
        data: expect.objectContaining({
          name: 'Asset 1 Updated',
        }),
      });
    });
  });
});