import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProjectSetupWizard } from '../ProjectSetupWizard';
import { ProjectConfig } from '@shared/types';
import theme from '../../../theme';
import * as projectService from '../../../services/projectService';

// Mock the project service
vi.mock('../../../services/projectService');
const mockProjectService = projectService as any;

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

describe('ProjectSetupWizard', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectService.initializeProject.mockResolvedValue({
      success: true,
      data: {
        project_id: 'test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
        created_at: new Date(),
        spreadsheet_title: 'test-project',
        sheets_created: ['Shots', 'Assets', 'Tasks'],
        total_sheets: 9
      }
    });
  });

  const renderWizard = (props = {}) => {
    return render(
      <TestWrapper>
        <ProjectSetupWizard
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
          {...props}
        />
      </TestWrapper>
    );
  };

  describe('Initial Render', () => {
    it('should render the wizard with correct title and first step', () => {
      renderWizard();
      
      expect(screen.getByText('Project Setup Wizard')).toBeInTheDocument();
      expect(screen.getByText('Set up your MOTK project with Google Sheets integration and file storage')).toBeInTheDocument();
      expect(screen.getByText('Project Configuration')).toBeInTheDocument();
      expect(screen.getByLabelText('Project ID')).toBeInTheDocument();
    });

    it('should show all stepper steps', () => {
      renderWizard();
      
      expect(screen.getByText('Project Configuration')).toBeInTheDocument();
      expect(screen.getByText('Storage Provider')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Initialize')).toBeInTheDocument();
    });

    it('should disable Next button initially', () => {
      renderWizard();
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should show Cancel button on first step', () => {
      renderWizard();
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Project Configuration Step', () => {
    it('should enable Next button when project ID is entered', async () => {
      const user = userEvent.setup();
      renderWizard();
      
      const projectIdInput = screen.getByLabelText('Project ID');
      const nextButton = screen.getByRole('button', { name: /next/i });
      
      await user.type(projectIdInput, 'test-project');
      
      expect(nextButton).toBeEnabled();
    });

    it('should show validation error for invalid project ID', async () => {
      const user = userEvent.setup();
      renderWizard();
      
      const projectIdInput = screen.getByLabelText('Project ID');
      
      await user.type(projectIdInput, 'ab'); // Too short
      
      expect(screen.getByText('Project ID must be at least 3 characters long')).toBeInTheDocument();
    });

    it('should show validation error for project ID with invalid characters', async () => {
      const user = userEvent.setup();
      renderWizard();
      
      const projectIdInput = screen.getByLabelText('Project ID');
      
      await user.type(projectIdInput, 'test project!'); // Invalid characters
      
      expect(screen.getByText('Project ID can only contain letters, numbers, underscores, and hyphens')).toBeInTheDocument();
    });

    it('should allow template selection', async () => {
      const user = userEvent.setup();
      renderWizard();
      
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'test-project');
      
      const templateSelect = screen.getByLabelText('Project Template');
      await user.click(templateSelect);
      
      const animationOption = screen.getByText('Animation Project');
      await user.click(animationOption);
      
      expect(screen.getByDisplayValue('animation')).toBeInTheDocument();
    });
  });

  describe('Storage Provider Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWizard();
      
      // Fill project configuration and go to next step
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'test-project');
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
    });

    it('should show storage provider selection', () => {
      expect(screen.getByText('Storage Provider Configuration')).toBeInTheDocument();
      expect(screen.getByLabelText('Google Drive')).toBeInTheDocument();
      expect(screen.getByLabelText('Box')).toBeInTheDocument();
    });

    it('should default to Google Drive', () => {
      const gdriveRadio = screen.getByLabelText('Google Drive');
      expect(gdriveRadio).toBeChecked();
    });

    it('should show appropriate instructions for Google Drive', () => {
      expect(screen.getByText('Google Drive Setup')).toBeInTheDocument();
      expect(screen.getByText(/Create two folders in your Google Drive/)).toBeInTheDocument();
    });

    it('should switch to Box instructions when Box is selected', async () => {
      const user = userEvent.setup();
      
      const boxRadio = screen.getByLabelText('Box');
      await user.click(boxRadio);
      
      expect(screen.getByText('Box Setup')).toBeInTheDocument();
      expect(screen.getByText(/Create two folders in your Box account/)).toBeInTheDocument();
    });

    it('should enable Next button when URLs are provided', async () => {
      const user = userEvent.setup();
      
      const originalsInput = screen.getByLabelText('Originals Root URL');
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      
      await user.type(originalsInput, 'https://drive.google.com/drive/folders/originals');
      await user.type(proxiesInput, 'https://drive.google.com/drive/folders/proxies');
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
    });
  });

  describe('Review Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWizard();
      
      // Fill project configuration
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'test-project');
      
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      // Fill storage configuration
      const originalsInput = screen.getByLabelText('Originals Root URL');
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      
      await user.type(originalsInput, 'https://drive.google.com/drive/folders/originals');
      await user.type(proxiesInput, 'https://drive.google.com/drive/folders/proxies');
      
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
    });

    it('should show review configuration', () => {
      expect(screen.getByText('Review Configuration')).toBeInTheDocument();
      expect(screen.getByText('test-project')).toBeInTheDocument();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('https://drive.google.com/drive/folders/originals')).toBeInTheDocument();
      expect(screen.getByText('https://drive.google.com/drive/folders/proxies')).toBeInTheDocument();
    });

    it('should show what will be created', () => {
      expect(screen.getByText('What Will Be Created')).toBeInTheDocument();
      expect(screen.getByText('Shots')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('should show Initialize Project button', () => {
      const initializeButton = screen.getByRole('button', { name: /initialize project/i });
      expect(initializeButton).toBeInTheDocument();
      expect(initializeButton).toBeEnabled();
    });
  });

  describe('Progress Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWizard();
      
      // Navigate through all steps
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'test-project');
      
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      const originalsInput = screen.getByLabelText('Originals Root URL');
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      
      await user.type(originalsInput, 'https://drive.google.com/drive/folders/originals');
      await user.type(proxiesInput, 'https://drive.google.com/drive/folders/proxies');
      
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      const initializeButton = screen.getByRole('button', { name: /initialize project/i });
      await user.click(initializeButton);
    });

    it('should show initialization progress', () => {
      expect(screen.getByText('Initializing Project...')).toBeInTheDocument();
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    });

    it('should show initialization steps', () => {
      expect(screen.getByText('Validating configuration')).toBeInTheDocument();
      expect(screen.getByText('Connecting to Google Sheets API')).toBeInTheDocument();
      expect(screen.getByText('Creating spreadsheet')).toBeInTheDocument();
      expect(screen.getByText('Initializing sheets')).toBeInTheDocument();
    });

    it('should call initializeProject service', () => {
      expect(mockProjectService.initializeProject).toHaveBeenCalledWith({
        project_id: 'test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
        template: ''
      });
    });

    it('should call onComplete when initialization succeeds', async () => {
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          project_id: 'test-project',
          storage_provider: 'gdrive',
          originals_root_url: 'https://drive.google.com/drive/folders/originals',
          proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
          created_at: expect.any(Date),
          spreadsheet_title: 'test-project',
          sheets_created: ['Shots', 'Assets', 'Tasks'],
          total_sheets: 9
        });
      }, { timeout: 10000 });
    });
  });

  describe('Error Handling', () => {
    it('should show error when initialization fails', async () => {
      mockProjectService.initializeProject.mockResolvedValue({
        success: false,
        error: 'Failed to connect to Google Sheets API'
      });

      const user = userEvent.setup();
      renderWizard();
      
      // Navigate through all steps quickly
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'test-project');
      
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      const originalsInput = screen.getByLabelText('Originals Root URL');
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      
      await user.type(originalsInput, 'https://drive.google.com/drive/folders/originals');
      await user.type(proxiesInput, 'https://drive.google.com/drive/folders/proxies');
      
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      const initializeButton = screen.getByRole('button', { name: /initialize project/i });
      await user.click(initializeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Initialization Failed/)).toBeInTheDocument();
        expect(screen.getByText('Failed to connect to Google Sheets API')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockProjectService.initializeProject.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      renderWizard();
      
      // Navigate through all steps quickly
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'test-project');
      
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      const originalsInput = screen.getByLabelText('Originals Root URL');
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      
      await user.type(originalsInput, 'https://drive.google.com/drive/folders/originals');
      await user.type(proxiesInput, 'https://drive.google.com/drive/folders/proxies');
      
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      const initializeButton = screen.getByRole('button', { name: /initialize project/i });
      await user.click(initializeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Initialization Failed/)).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should allow going back to previous steps', async () => {
      const user = userEvent.setup();
      renderWizard();
      
      // Go to second step
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'test-project');
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      expect(screen.getByText('Storage Provider Configuration')).toBeInTheDocument();
      
      // Go back to first step
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      
      expect(screen.getByText('Project Configuration')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-project')).toBeInTheDocument();
    });

    it('should call onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWizard();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});