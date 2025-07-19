import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProjectSetupWizard } from '../ProjectSetupWizard';
import { ProjectConfig } from '@shared/types';
import theme from '../../../theme';
import { apiRequest } from '../../../api/client';

// Mock the API client
vi.mock('../../../api/client');
const mockApiRequest = apiRequest as any;

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

describe('ProjectSetupWizard Integration Tests', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    mockApiRequest.mockResolvedValue({
      success: true,
      data: {
        project_id: 'integration-test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals123',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies456',
        created_at: new Date('2024-01-01T00:00:00Z'),
        spreadsheet_title: 'integration-test-project',
        sheets_created: [
          'Shots', 'Assets', 'Tasks', 'ProjectMembers', 
          'Users', 'Pages', 'Fields', 'project_meta', 'Logs'
        ],
        total_sheets: 9
      }
    });
  });

  const renderWizard = () => {
    return render(
      <TestWrapper>
        <ProjectSetupWizard
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      </TestWrapper>
    );
  };

  describe('Complete Project Setup Workflow', () => {
    it('should complete the entire project setup workflow successfully', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Step 1: Project Configuration
      expect(screen.getByText('Project Configuration')).toBeInTheDocument();
      
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'integration-test-project');
      
      // Select animation template
      const templateSelect = screen.getByLabelText('Project Template');
      await user.click(templateSelect);
      const animationOption = screen.getByText('Animation Project');
      await user.click(animationOption);
      
      // Go to next step
      let nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
      await user.click(nextButton);

      // Step 2: Storage Provider Configuration
      expect(screen.getByText('Storage Provider Configuration')).toBeInTheDocument();
      
      // Google Drive should be selected by default
      const gdriveRadio = screen.getByLabelText('Google Drive');
      expect(gdriveRadio).toBeChecked();
      
      // Fill in storage URLs
      const originalsInput = screen.getByLabelText('Originals Root URL');
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      
      await user.type(originalsInput, 'https://drive.google.com/drive/folders/originals123');
      await user.type(proxiesInput, 'https://drive.google.com/drive/folders/proxies456');
      
      // Go to next step
      nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
      await user.click(nextButton);

      // Step 3: Review Configuration
      expect(screen.getByText('Review Configuration')).toBeInTheDocument();
      
      // Verify all configuration is displayed correctly
      expect(screen.getByText('integration-test-project')).toBeInTheDocument();
      expect(screen.getByText('Animation Project')).toBeInTheDocument();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('https://drive.google.com/drive/folders/originals123')).toBeInTheDocument();
      expect(screen.getByText('https://drive.google.com/drive/folders/proxies456')).toBeInTheDocument();
      
      // Verify sheets to be created are listed
      expect(screen.getByText('Shots')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      
      // Initialize project
      const initializeButton = screen.getByRole('button', { name: /initialize project/i });
      expect(initializeButton).toBeEnabled();
      await user.click(initializeButton);

      // Step 4: Progress and Initialization
      expect(screen.getByText('Initializing Project...')).toBeInTheDocument();
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      
      // Verify initialization steps are shown
      expect(screen.getByText('Validating configuration')).toBeInTheDocument();
      expect(screen.getByText('Connecting to Google Sheets API')).toBeInTheDocument();
      expect(screen.getByText('Creating spreadsheet')).toBeInTheDocument();
      expect(screen.getByText('Initializing sheets')).toBeInTheDocument();
      expect(screen.getByText('Adding sample data')).toBeInTheDocument();
      expect(screen.getByText('Configuring storage')).toBeInTheDocument();
      expect(screen.getByText('Finalizing project setup')).toBeInTheDocument();

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.getByText('Project Initialized Successfully!')).toBeInTheDocument();
      }, { timeout: 15000 });

      // Verify API was called with correct parameters
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/projects/init', {
        project_id: 'integration-test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals123',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies456',
        template: 'animation'
      });

      // Verify onComplete was called with correct data
      expect(mockOnComplete).toHaveBeenCalledWith({
        project_id: 'integration-test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals123',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies456',
        created_at: new Date('2024-01-01T00:00:00Z'),
        spreadsheet_title: 'integration-test-project',
        sheets_created: [
          'Shots', 'Assets', 'Tasks', 'ProjectMembers', 
          'Users', 'Pages', 'Fields', 'project_meta', 'Logs'
        ],
        total_sheets: 9
      });

      // Verify success message and next steps are shown
      expect(screen.getByText(/Your project has been successfully initialized/)).toBeInTheDocument();
      expect(screen.getByText(/Next Steps/)).toBeInTheDocument();
      expect(screen.getByText(/integration-test-project/)).toBeInTheDocument();
    }, 20000);

    it('should handle Box storage provider workflow', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Step 1: Project Configuration
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'box-test-project');
      
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 2: Select Box as storage provider
      const boxRadio = screen.getByLabelText('Box');
      await user.click(boxRadio);
      
      // Verify Box instructions are shown
      expect(screen.getByText('Box Setup')).toBeInTheDocument();
      expect(screen.getByText(/Create two folders in your Box account/)).toBeInTheDocument();
      
      // Fill in Box URLs
      const originalsInput = screen.getByLabelText('Originals Root URL');
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      
      await user.type(originalsInput, 'https://company.box.com/folder/originals789');
      await user.type(proxiesInput, 'https://company.box.com/folder/proxies012');
      
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 3: Review should show Box configuration
      expect(screen.getByText('Box')).toBeInTheDocument();
      expect(screen.getByText('https://company.box.com/folder/originals789')).toBeInTheDocument();
      expect(screen.getByText('https://company.box.com/folder/proxies012')).toBeInTheDocument();
      
      const initializeButton = screen.getByRole('button', { name: /initialize project/i });
      await user.click(initializeButton);

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Project Initialized Successfully!')).toBeInTheDocument();
      }, { timeout: 15000 });

      // Verify API was called with Box configuration
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/projects/init', {
        project_id: 'box-test-project',
        storage_provider: 'box',
        originals_root_url: 'https://company.box.com/folder/originals789',
        proxies_root_url: 'https://company.box.com/folder/proxies012',
        template: ''
      });
    }, 20000);

    it('should handle initialization failure gracefully', async () => {
      // Mock API failure
      mockApiRequest.mockResolvedValue({
        success: false,
        error: 'Google Sheets API quota exceeded',
        message: 'Please try again later'
      });

      const user = userEvent.setup();
      renderWizard();

      // Complete setup quickly
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'failing-project');
      
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

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Initialization Failed/)).toBeInTheDocument();
        expect(screen.getByText('Google Sheets API quota exceeded')).toBeInTheDocument();
      }, { timeout: 15000 });

      // Verify onComplete was not called
      expect(mockOnComplete).not.toHaveBeenCalled();
    }, 20000);

    it('should allow navigation back and forth between steps', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Step 1: Fill project configuration
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'navigation-test');
      
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 2: Fill storage configuration
      const originalsInput = screen.getByLabelText('Originals Root URL');
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      
      await user.type(originalsInput, 'https://drive.google.com/drive/folders/originals');
      await user.type(proxiesInput, 'https://drive.google.com/drive/folders/proxies');
      
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 3: Review - go back to storage
      let backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      
      expect(screen.getByText('Storage Provider Configuration')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://drive.google.com/drive/folders/originals')).toBeInTheDocument();
      
      // Go back to project configuration
      backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      
      expect(screen.getByText('Project Configuration')).toBeInTheDocument();
      expect(screen.getByDisplayValue('navigation-test')).toBeInTheDocument();
      
      // Navigate forward again
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      expect(screen.getByText('Storage Provider Configuration')).toBeInTheDocument();
      
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      expect(screen.getByText('Review Configuration')).toBeInTheDocument();
      expect(screen.getByText('navigation-test')).toBeInTheDocument();
    });
  });

  describe('Validation and Error Handling', () => {
    it('should prevent progression with invalid data', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Try to proceed without project ID
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
      
      // Enter invalid project ID
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'ab'); // Too short
      
      expect(screen.getByText('Project ID must be at least 3 characters long')).toBeInTheDocument();
      expect(nextButton).toBeDisabled();
      
      // Fix project ID
      await user.clear(projectIdInput);
      await user.type(projectIdInput, 'valid-project-id');
      
      expect(nextButton).toBeEnabled();
      await user.click(nextButton);
      
      // Try to proceed without storage URLs
      const nextButton2 = screen.getByRole('button', { name: /next/i });
      expect(nextButton2).toBeDisabled();
      
      // Fill only one URL
      const originalsInput = screen.getByLabelText('Originals Root URL');
      await user.type(originalsInput, 'https://drive.google.com/drive/folders/originals');
      
      expect(nextButton2).toBeDisabled();
      
      // Fill both URLs
      const proxiesInput = screen.getByLabelText('Proxies Root URL');
      await user.type(proxiesInput, 'https://drive.google.com/drive/folders/proxies');
      
      expect(nextButton2).toBeEnabled();
    });

    it('should show appropriate error messages for invalid URLs', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Navigate to storage step
      const projectIdInput = screen.getByLabelText('Project ID');
      await user.type(projectIdInput, 'test-project');
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Enter invalid URL
      const originalsInput = screen.getByLabelText('Originals Root URL');
      await user.type(originalsInput, 'invalid-url');
      
      expect(screen.getByText('Please enter a valid URL or folder ID')).toBeInTheDocument();
      expect(screen.getByText('Please check your storage URLs')).toBeInTheDocument();
    });
  });
});