import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import ProjectSettings from '../ProjectSettings';
import theme from '../../../theme';
import * as projectService from '../../../services/projectService';

// Mock the project service
jest.mock('../../../services/projectService');
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

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
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Mock data
const mockProjectData = {
  success: true,
  data: {
    project_id: 'test-project',
    storage_provider: 'gdrive' as const,
    originals_root_url: 'https://drive.google.com/originals',
    proxies_root_url: 'https://drive.google.com/proxies',
    created_at: new Date('2024-01-01'),
    spreadsheet_title: 'Test Project Spreadsheet',
    total_sheets: 9,
    available_sheets: ['Shots', 'Assets', 'Tasks'],
  },
};

const mockStatusData = {
  success: true,
  data: {
    project_id: 'test-project',
    spreadsheet_title: 'Test Project Spreadsheet',
    sheets_configured: true,
    total_sheets: 9,
    required_sheets: 9,
    missing_sheets: [],
    sheet_statistics: {
      'Shots': 15,
      'Assets': 8,
      'Tasks': 23,
    },
    api_connection: true,
  },
};

describe('ProjectSettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectService.getProject.mockResolvedValue(mockProjectData);
    mockProjectService.getProjectStatus.mockResolvedValue(mockStatusData);
    mockProjectService.updateProject.mockResolvedValue({
      success: true,
      data: mockProjectData.data,
    });
  });

  it('renders project settings with project information', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Project Settings')).toBeInTheDocument();
    });

    // Check project information section
    expect(screen.getByDisplayValue('test-project')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Project Spreadsheet')).toBeInTheDocument();
    expect(screen.getByText('Project ID cannot be changed after creation')).toBeInTheDocument();
  });

  it('renders storage configuration form', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Storage Configuration')).toBeInTheDocument();
    });

    // Check storage form fields
    expect(screen.getByLabelText('Storage Provider')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://drive.google.com/originals')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://drive.google.com/proxies')).toBeInTheDocument();
  });

  it('displays project status information', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Project Status')).toBeInTheDocument();
    });

    // Check status indicators
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument(); // Sheets configured
    expect(screen.getByText('9 / 9')).toBeInTheDocument(); // Total sheets

    // Check sheet statistics
    expect(screen.getByText('15 records')).toBeInTheDocument(); // Shots
    expect(screen.getByText('8 records')).toBeInTheDocument(); // Assets
    expect(screen.getByText('23 records')).toBeInTheDocument(); // Tasks
  });

  it('handles form input changes', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Originals Root URL')).toBeInTheDocument();
    });

    // Change originals URL
    const originalsInput = screen.getByLabelText('Originals Root URL');
    fireEvent.change(originalsInput, { 
      target: { value: 'https://new-drive.google.com/originals' } 
    });

    expect(originalsInput).toHaveValue('https://new-drive.google.com/originals');
  });

  it('saves changes when save button is clicked', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Originals Root URL')).toBeInTheDocument();
    });

    // Change a field
    const originalsInput = screen.getByLabelText('Originals Root URL');
    fireEvent.change(originalsInput, { 
      target: { value: 'https://new-drive.google.com/originals' } 
    });

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockProjectService.updateProject).toHaveBeenCalledWith('test-project', {
        storage_provider: 'gdrive',
        originals_root_url: 'https://new-drive.google.com/originals',
        proxies_root_url: 'https://drive.google.com/proxies',
      });
    });
  });

  it('shows success message after saving', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Project settings saved successfully!')).toBeInTheDocument();
    });
  });

  it('handles storage provider change', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Storage Provider')).toBeInTheDocument();
    });

    // Change storage provider
    const providerSelect = screen.getByLabelText('Storage Provider');
    fireEvent.mouseDown(providerSelect);
    
    const boxOption = screen.getByText('Box');
    fireEvent.click(boxOption);

    // Verify the change
    expect(providerSelect).toHaveTextContent('Box');
  });

  it('refreshes status when refresh button is clicked', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    // Click refresh
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Should call getProjectStatus again
    await waitFor(() => {
      expect(mockProjectService.getProjectStatus).toHaveBeenCalledTimes(2);
    });
  });

  it('displays missing sheets warning', async () => {
    const statusWithMissingSheets = {
      ...mockStatusData,
      data: {
        ...mockStatusData.data,
        sheets_configured: false,
        total_sheets: 7,
        missing_sheets: ['Pages', 'Fields'],
      },
    };

    mockProjectService.getProjectStatus.mockResolvedValue(statusWithMissingSheets);

    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Missing Sheets:')).toBeInTheDocument();
      expect(screen.getByText('Pages')).toBeInTheDocument();
      expect(screen.getByText('Fields')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation dialog', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Delete Project')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: 'Delete Project' });
    fireEvent.click(deleteButton);

    // Check if dialog appears
    await waitFor(() => {
      expect(screen.getByText('This action cannot be undone!')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('closes delete dialog when cancel is clicked', async () => {
    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete Project' })).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: 'Delete Project' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('This action cannot be undone!')).not.toBeInTheDocument();
    });
  });

  it('displays loading state', () => {
    mockProjectService.getProject.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error state', async () => {
    mockProjectService.getProject.mockRejectedValue(new Error('Failed to load'));

    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load project settings/)).toBeInTheDocument();
    });
  });

  it('handles API connection failure status', async () => {
    const statusWithFailure = {
      ...mockStatusData,
      data: {
        ...mockStatusData.data,
        api_connection: false,
      },
    };

    mockProjectService.getProjectStatus.mockResolvedValue(statusWithFailure);

    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  it('disables save button while saving', async () => {
    // Mock a slow update
    mockProjectService.updateProject.mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <ProjectSettings projectId="test-project" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });
});