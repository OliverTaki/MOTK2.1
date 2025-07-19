import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { TaskTable } from '../TaskTable';
import { Task, EntityType, TaskStatus, Shot, User } from '@shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
vi.mock('../../../hooks/useEntityData', () => ({
  useEntityData: vi.fn().mockImplementation(({ entityType }) => {
    if (entityType === 'task') {
      return {
        data: { data: [
          { task_id: 'task1', name: 'Task 1', status: TaskStatus.IN_PROGRESS, assignee_id: 'user1', start_date: new Date('2023-07-01'), end_date: new Date('2023-07-20') },
          { task_id: 'task2', name: 'Task 2', status: TaskStatus.COMPLETED, assignee_id: 'user2', start_date: new Date('2023-06-01'), end_date: new Date('2023-06-15') },
        ]},
        isLoading: false,
        error: null,
      };
    } else if (entityType === 'shot') {
      return {
        data: { data: [
          { shot_id: 'shot1', title: 'Shot A' },
          { shot_id: 'shot2', title: 'Shot B' },
        ]},
        isLoading: false,
        error: null,
      };
    } else if (entityType === 'user') {
      return {
        data: { data: [
          { user_id: 'user1', name: 'John Doe' },
          { user_id: 'user2', name: 'Jane Smith' },
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
    mutateAsync: vi.fn().mockImplementation(async (data) => ({ ...data, task_id: `new-task-${Date.now()}` })),
  })),
}));

describe('TaskTable', () => {
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
        <TaskTable {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table with task data', () => {
    renderComponent();
    
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('opens and closes the add task dialog', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Add Task'));
    expect(screen.getByText('Add New Task')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Add New Task')).not.toBeInTheDocument());
  });

  it('creates a new task', async () => {
    const { useCreateEntity } = await vi.importActual('../../../hooks/useEntityData');
    const mockCreateMutation = useCreateEntity();
    vi.mocked(mockCreateMutation.mutateAsync).mockResolvedValueOnce({
      task_id: 'new-task-123',
      name: 'New Task',
      status: TaskStatus.NOT_STARTED,
    });

    renderComponent();
    fireEvent.click(screen.getByText('Add Task'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Task' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        name: 'New Task',
        status: TaskStatus.NOT_STARTED,
      });
    });
  });

  it('updates an existing task', async () => {
    const { useUpdateEntity } = await vi.importActual('../../../hooks/useEntityData');
    const mockUpdateMutation = useUpdateEntity();
    vi.mocked(mockUpdateMutation.mutateAsync).mockResolvedValueOnce({
      task_id: 'task1',
      name: 'Task 1 Updated',
      status: TaskStatus.COMPLETED,
    });

    renderComponent();
    
    // Find the row and click to edit (assuming editable cells)
    const task1NameCell = screen.getByRole('cell', { name: 'Task 1' });
    fireEvent.doubleClick(task1NameCell);

    const nameInput = screen.getByDisplayValue('Task 1');
    fireEvent.change(nameInput, { target: { value: 'Task 1 Updated' } });
    fireEvent.blur(nameInput); // Trigger save

    await waitFor(() => {
      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'task1',
        data: expect.objectContaining({
          name: 'Task 1 Updated',
        }),
      });
    });
  });
});