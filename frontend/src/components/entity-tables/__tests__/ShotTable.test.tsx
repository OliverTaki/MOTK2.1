import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ShotTable } from '../ShotTable';
import { Shot, EntityType, ShotStatus } from '@shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
vi.mock('../../../hooks/useEntityData', () => ({
  useEntityData: vi.fn().mockImplementation(({ entityType }) => {
    if (entityType === 'shot') {
      return {
        data: { data: [
          { shot_id: 'shot1', title: 'Shot 1', status: ShotStatus.IN_PROGRESS, priority: 1, due_date: new Date('2023-07-20') },
          { shot_id: 'shot2', title: 'Shot 2', status: ShotStatus.COMPLETED, priority: 3, due_date: new Date('2023-07-15') },
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
    mutateAsync: vi.fn().mockImplementation(async (data) => ({ ...data, shot_id: `new-shot-${Date.now()}` })),
  })),
}));

describe('ShotTable', () => {
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
        <ShotTable {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table with shot data', () => {
    renderComponent();
    
    expect(screen.getByText('Shot 1')).toBeInTheDocument();
    expect(screen.getByText('Shot 2')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('opens and closes the add shot dialog', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Add Shot'));
    expect(screen.getByText('Add New Shot')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Add New Shot')).not.toBeInTheDocument());
  });

  it('creates a new shot', async () => {
    const { useCreateEntity } = await vi.importActual('../../../hooks/useEntityData');
    const mockCreateMutation = useCreateEntity();
    vi.mocked(mockCreateMutation.mutateAsync).mockResolvedValueOnce({
      shot_id: 'new-shot-123',
      title: 'New Shot',
      status: ShotStatus.NOT_STARTED,
    });

    renderComponent();
    fireEvent.click(screen.getByText('Add Shot'));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Shot' } });
    fireEvent.blur(screen.getByLabelText('Title')); // Trigger save

    await waitFor(() => {
      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        title: 'New Shot',
        status: ShotStatus.NOT_STARTED,
      });
    });
  });

  it('updates an existing shot', async () => {
    const { useUpdateEntity } = await vi.importActual('../../../hooks/useEntityData');
    const mockUpdateMutation = useUpdateEntity();
    vi.mocked(mockUpdateMutation.mutateAsync).mockResolvedValueOnce({
      shot_id: 'shot1',
      title: 'Shot 1 Updated',
      status: ShotStatus.COMPLETED,
    });

    renderComponent();
    
    // Find the row and click to edit (assuming editable cells)
    const shot1TitleCell = screen.getByRole('cell', { name: 'Shot 1' });
    fireEvent.doubleClick(shot1TitleCell);

    const titleInput = screen.getByDisplayValue('Shot 1');
    fireEvent.change(titleInput, { target: { value: 'Shot 1 Updated' } });
    fireEvent.blur(titleInput); // Trigger save

    await waitFor(() => {
      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'shot1',
        data: expect.objectContaining({
          title: 'Shot 1 Updated',
        }),
      });
    });
  });
});