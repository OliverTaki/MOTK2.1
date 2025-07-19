import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import Dashboard from '../Dashboard';
import theme from '../../../theme';
import { EntityType, ShotStatus, AssetStatus, TaskStatus } from '@shared/types';
import * as useEntityDataHook from '../../../hooks/useEntityData';

// Mock the useEntityData hook
vi.mock('../../../hooks/useEntityData');
const mockUseEntityData = useEntityDataHook.useEntityData as MockedFunction<typeof useEntityDataHook.useEntityData>;

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock data
const mockShotsData = {
  success: true,
  data: [
    {
      shot_id: 'shot1',
      title: 'Opening Scene',
      status: ShotStatus.IN_PROGRESS,
      due_date: new Date('2024-12-31'),
      episode: '1',
      scene: '1',
    },
    {
      shot_id: 'shot2',
      title: 'Action Sequence',
      status: ShotStatus.COMPLETED,
      due_date: new Date('2024-11-15'),
      episode: '1',
      scene: '2',
    },
    {
      shot_id: 'shot3',
      title: 'Overdue Shot',
      status: ShotStatus.IN_PROGRESS,
      due_date: new Date('2024-01-01'), // Past date
      episode: '1',
      scene: '3',
    },
  ],
  total: 3,
  offset: 0,
  limit: 10,
};

const mockAssetsData = {
  success: true,
  data: [
    {
      asset_id: 'asset1',
      name: 'Main Character',
      asset_type: 'character',
      status: AssetStatus.COMPLETED,
    },
    {
      asset_id: 'asset2',
      name: 'Background Building',
      asset_type: 'environment',
      status: AssetStatus.IN_PROGRESS,
    },
    {
      asset_id: 'asset3',
      name: 'Review Asset',
      asset_type: 'prop',
      status: AssetStatus.REVIEW,
    },
  ],
  total: 3,
  offset: 0,
  limit: 10,
};

const mockTasksData = {
  success: true,
  data: [
    {
      task_id: 'task1',
      name: 'Animation Task',
      status: TaskStatus.IN_PROGRESS,
      end_date: new Date('2024-12-25'),
      assignee_id: 'user1',
    },
    {
      task_id: 'task2',
      name: 'Completed Task',
      status: TaskStatus.COMPLETED,
      end_date: new Date('2024-11-20'),
      assignee_id: 'user2',
    },
    {
      task_id: 'task3',
      name: 'Blocked Task',
      status: TaskStatus.BLOCKED,
      end_date: new Date('2024-12-20'),
      assignee_id: 'user3',
    },
  ],
  total: 3,
  offset: 0,
  limit: 10,
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders dashboard with project name and statistics', async () => {
    // Mock the hook calls
    mockUseEntityData
      .mockReturnValueOnce({
        data: mockShotsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockAssetsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockTasksData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Check project name
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Project Dashboard')).toBeInTheDocument();

    // Check statistics cards
    expect(screen.getByText('Shots')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();

    // Check shot statistics
    const totalShotsElements = screen.getAllByText('3');
    expect(totalShotsElements.length).toBeGreaterThan(0); // Total shots
    expect(screen.getAllByText('1 Complete').length).toBeGreaterThan(0);
    expect(screen.getByText('2 In Progress')).toBeInTheDocument();
    expect(screen.getAllByText('2 Overdue').length).toBeGreaterThan(0); // Fixed: should be 2 overdue based on mock data (2 shots with past due dates)

    // Check asset statistics - use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('1 Complete').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 In Progress').length).toBeGreaterThan(0);

    // Check project overview section
    expect(screen.getByText('Project Overview')).toBeInTheDocument();
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);

    // Check quick actions section
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Create New Shot')).toBeInTheDocument();
    expect(screen.getByText('Create New Asset')).toBeInTheDocument();
    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(screen.getByText('View Schedule')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    mockUseEntityData
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Should show loading indicators
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('navigates to correct pages when buttons are clicked', async () => {
    mockUseEntityData
      .mockReturnValueOnce({
        data: mockShotsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockAssetsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockTasksData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Click on "View All Shots" button
    const viewShotsButton = screen.getByText('View All Shots');
    fireEvent.click(viewShotsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/shots');

    // Click on "View All Assets" button
    const viewAssetsButton = screen.getByText('View All Assets');
    fireEvent.click(viewAssetsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/assets');

    // Click on "View All Tasks" button
    const viewTasksButton = screen.getByText('View All Tasks');
    fireEvent.click(viewTasksButton);
    expect(mockNavigate).toHaveBeenCalledWith('/tasks');

    // Click on settings icon
    const settingsButton = screen.getByLabelText('Project Settings');
    fireEvent.click(settingsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('displays upcoming deadlines correctly', async () => {
    mockUseEntityData
      .mockReturnValueOnce({
        data: mockShotsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockAssetsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockTasksData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Check upcoming deadlines section
    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
    const openingSceneElements = screen.getAllByText('Opening Scene');
    expect(openingSceneElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Animation Task')).toBeInTheDocument();
  });

  it('displays attention needed items correctly', async () => {
    mockUseEntityData
      .mockReturnValueOnce({
        data: mockShotsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockAssetsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockTasksData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Check attention needed section
    expect(screen.getByText('Attention Needed')).toBeInTheDocument();
    expect(screen.getAllByText('Overdue Shot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blocked Task').length).toBeGreaterThan(0);
    expect(screen.getByText('Review Asset')).toBeInTheDocument();
  });

  it('displays recent activity correctly', async () => {
    mockUseEntityData
      .mockReturnValueOnce({
        data: mockShotsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockAssetsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockTasksData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Check recent activity section
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Action Sequence')).toBeInTheDocument();
    expect(screen.getByText('Completed Task')).toBeInTheDocument();
    expect(screen.getByText('Main Character')).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', async () => {
    mockUseEntityData
      .mockReturnValueOnce({
        data: mockShotsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockAssetsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockTasksData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Check progress calculation (1 completed out of 3 total = 33%)
    expect(screen.getByText('33% Complete')).toBeInTheDocument();
  });

  it('handles empty data gracefully', async () => {
    mockUseEntityData
      .mockReturnValueOnce({
        data: { success: true, data: [], total: 0, offset: 0, limit: 10 },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: { success: true, data: [], total: 0, offset: 0, limit: 10 },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: { success: true, data: [], total: 0, offset: 0, limit: 10 },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Should show zero counts
    const zeroTexts = screen.getAllByText('0');
    expect(zeroTexts.length).toBeGreaterThan(0);

    // Should show empty state messages
    expect(screen.getByText('No upcoming deadlines')).toBeInTheDocument();
    expect(screen.getByText('No items need attention')).toBeInTheDocument();
  });

  it('calls useEntityData with correct parameters', () => {
    mockUseEntityData
      .mockReturnValueOnce({
        data: mockShotsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockAssetsData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: mockTasksData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

    render(
      <TestWrapper>
        <Dashboard projectId="test-project" projectName="Test Project" />
      </TestWrapper>
    );

    // Verify hook calls
    expect(mockUseEntityData).toHaveBeenCalledWith({
      entityType: EntityType.SHOT,
      limit: 10,
      sort: { field: 'due_date', direction: 'asc' }
    });

    expect(mockUseEntityData).toHaveBeenCalledWith({
      entityType: EntityType.ASSET,
      limit: 10,
      sort: { field: 'status', direction: 'asc' }
    });

    expect(mockUseEntityData).toHaveBeenCalledWith({
      entityType: EntityType.TASK,
      limit: 10,
      sort: { field: 'end_date', direction: 'asc' }
    });
  });
});