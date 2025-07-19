import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProjectConfigurationStep } from '../ProjectConfigurationStep';
import theme from '../../../theme';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

describe('ProjectConfigurationStep', () => {
  const mockOnChange = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (data = {}) => {
    return render(
      <TestWrapper>
        <ProjectConfigurationStep
          data={data}
          onChange={mockOnChange}
          onError={mockOnError}
        />
      </TestWrapper>
    );
  };

  it('should render project configuration form', () => {
    renderComponent();
    
    expect(screen.getByText('Project Configuration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('my-animation-project')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should validate project ID input', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const projectIdInput = screen.getByPlaceholderText('my-animation-project');
    
    // Test too short
    await user.type(projectIdInput, 'ab');
    expect(screen.getByText('Project ID must be at least 3 characters long')).toBeInTheDocument();
    
    // Test invalid characters
    await user.clear(projectIdInput);
    await user.type(projectIdInput, 'test project!');
    expect(screen.getByText('Project ID can only contain letters, numbers, underscores, and hyphens')).toBeInTheDocument();
    
    // Test valid input
    await user.clear(projectIdInput);
    await user.type(projectIdInput, 'valid-project-123');
    expect(mockOnChange).toHaveBeenCalledWith({
      project_id: 'valid-project-123',
      template: ''
    });
  });

  it('should handle template selection', async () => {
    const user = userEvent.setup();
    renderComponent({ project_id: 'test-project' });
    
    const templateSelect = screen.getByLabelText('Project Template');
    await user.click(templateSelect);
    
    const animationOption = screen.getByText('Animation Project');
    await user.click(animationOption);
    
    expect(mockOnChange).toHaveBeenCalledWith({
      project_id: 'test-project',
      template: 'animation'
    });
  });
});