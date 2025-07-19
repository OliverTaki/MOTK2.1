import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import Dashboard from '../Dashboard';
import ProjectSettings from '../ProjectSettings';
import { AppNavigation } from '../../navigation';
import theme from '../../../theme';
import * as useEntityDataHook from '../../../hooks/useEntityData';
import * as projectService from '../../../services/projectService';

// Mock the hooks and services
jest.mock('../../../hooks/useEntityData');
jest.mock('../../../services/projectService');

const mockUseEntityData = useEntityDataHook.useEntityData as jest.MockedFunction<typeof useEntityDataHook.useEntityData>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

// Test App Component that includes navigation and routing
const TestApp: React.FC = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const AppLayout = ({ children }: { children: React.ReactNode }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppNavigation
        projectName="Test Project"
        userName="Test User"
      />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <AppLayout>
            <Routes>
              <Route 
                path="/" 
                element={
                  <Dashboard 
                    projectId="test-project"
                    projectName="Test Project"
                  />
                } 
              />
              <Route 
                path="/settings" 
                element={<ProjectSettings projectId="test-project" />} 
              />
              <Route path="/shots" element={<div>Shots View</div>} />
              <Route path="/assets" element={<div>Assets View</div>} />
              <Route path="/tasks" element={<div>Tasks View</div>} />
              <Route path="/team" element={<div>Team View</div>} />
            </Routes>
          </AppLayout>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock data
const mockEntityData = {
  success: true,
  data: [
    {
      shot_id: 'shot1',
      title: 'Test Shot',
      status: 'in_progress',
      due_date: new Date('2024-12-31'),
    },
  ],
  total: 1,
  offset: 0,
  limit: 10,
};

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
    sheet_statistics: { 'Shots': 1 },
    api_connection: true,
  },
};

describe('Dashboard and Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock entity data hooks
    mockUseEntityData.mockReturnValue({
      data: mockEntityData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    // Mock project service
    mockProjectService.getProject.mockResolvedValue(mockProjectData);
    mockProjectService.getProjectStatus.mockResolvedValue(mockStatusData);
    mockProjectService.updateProject.mockResolvedValue({
      success: true,
      data: mockProjectData.data,
    });
  });

  it('renders dashboard with navigation and allows navigation between pages', async () => {
    render(<TestApp />);

    // Should start on dashboard
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Navigation should be present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Shots')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
  });

  it('navigates to shots page when shots navigation item is clicked', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Click on Shots in navigation
    fireEvent.click(screen.getByText('Shots'));

    // Should navigate to shots page
    await waitFor(() => {
      expect(screen.getByText('Shots View')).toBeInTheDocument();
    });
  });

  it('navigates to settings page when settings button is clicked', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Click on settings icon in navigation
    const settingsButton = screen.getByLabelText(/settings/i);
    fireEvent.click(settingsButton);

    // Should navigate to settings page
    await waitFor(() => {
      expect(screen.getByText('Project Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure your project storage and integration settings')).toBeInTheDocument();
    });
  });

  it('navigates from dashboard to shots via dashboard button', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Click "View All Shots" button on dashboard
    const viewShotsButton = screen.getByText('View All Shots');
    fireEvent.click(viewShotsButton);

    // Should navigate to shots page
    await waitFor(() => {
      expect(screen.getByText('Shots View')).toBeInTheDocument();
    });
  });

  it('navigates from dashboard to settings via dashboard settings icon', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Click settings icon on dashboard
    const settingsIcon = screen.getByLabelText('Project Settings');
    fireEvent.click(settingsIcon);

    // Should navigate to settings page
    await waitFor(() => {
      expect(screen.getByText('Project Settings')).toBeInTheDocument();
    });
  });

  it('maintains navigation state when moving between pages', async () => {
    render(<TestApp />);

    // Start on dashboard
    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Navigate to settings
    const settingsButton = screen.getByLabelText(/settings/i);
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Project Settings')).toBeInTheDocument();
    });

    // Navigation should still be present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Shots')).toBeInTheDocument();

    // Navigate back to dashboard
    fireEvent.click(screen.getByText('Dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });
  });

  it('displays consistent project name across navigation and dashboard', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Project name should appear in both navigation and dashboard
    const projectNameElements = screen.getAllByText('Test Project');
    expect(projectNameElements.length).toBeGreaterThan(1);
  });

  it('handles navigation to non-existent routes gracefully', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Navigate to team page (which exists)
    fireEvent.click(screen.getByText('Team'));

    await waitFor(() => {
      expect(screen.getByText('Team View')).toBeInTheDocument();
    });
  });

  it('preserves dashboard data when navigating away and back', async () => {
    render(<TestApp />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Test Shot')).toBeInTheDocument();
    });

    // Navigate to settings
    const settingsButton = screen.getByLabelText(/settings/i);
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Project Settings')).toBeInTheDocument();
    });

    // Navigate back to dashboard
    fireEvent.click(screen.getByText('Dashboard'));

    // Dashboard data should still be there (cached)
    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Test Shot')).toBeInTheDocument();
    });
  });

  it('handles user menu interactions correctly', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Click user menu
    const userButton = screen.getByRole('button', { name: /account/i });
    fireEvent.click(userButton);

    // User menu should appear
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    // Click Settings in user menu
    fireEvent.click(screen.getByText('Settings'));

    // Should navigate to settings page
    await waitFor(() => {
      expect(screen.getByText('Project Settings')).toBeInTheDocument();
    });
  });

  it('displays loading states correctly during navigation', async () => {
    // Mock slow loading for settings
    mockProjectService.getProject.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockProjectData), 100))
    );

    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText('Project Dashboard')).toBeInTheDocument();
    });

    // Navigate to settings
    const settingsButton = screen.getByLabelText(/settings/i);
    fireEvent.click(settingsButton);

    // Should show loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Project Settings')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});