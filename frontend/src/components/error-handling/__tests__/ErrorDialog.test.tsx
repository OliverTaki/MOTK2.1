import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorDialog from '../ErrorDialog';
import { ErrorType } from '../../../services/error/ErrorLogger';

describe('ErrorDialog', () => {
  const defaultProps = {
    open: true,
    message: 'Test error message',
    type: 'unhandled_error' as ErrorType,
    onClose: jest.fn(),
    onRetry: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with basic error information', () => {
    render(<ErrorDialog {...defaultProps} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText(/Please try again or contact support/)).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ErrorDialog {...defaultProps} open={false} />);
    
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
    expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ErrorDialog {...defaultProps} />);
    
    await user.click(screen.getByText('Close'));
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry when Retry button is clicked', async () => {
    const user = userEvent.setup();
    render(<ErrorDialog {...defaultProps} />);
    
    await user.click(screen.getByText('Retry'));
    
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('displays technical details when available', async () => {
    const user = userEvent.setup();
    render(
      <ErrorDialog 
        {...defaultProps} 
        details="Stack trace information"
      />
    );
    
    // Technical details section should be present
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    // Details should be hidden initially
    expect(screen.queryByText('Stack trace information')).not.toBeInTheDocument();
    
    // Click to expand details
    await user.click(screen.getByText('Technical Details').nextSibling as HTMLElement);
    
    // Details should now be visible
    expect(screen.getByText('Stack trace information')).toBeInTheDocument();
  });

  it('displays different error types with appropriate icons and messages', () => {
    // Test network error
    const { rerender } = render(
      <ErrorDialog 
        {...defaultProps} 
        type="network_error"
      />
    );
    
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText(/check your internet connection/)).toBeInTheDocument();
    
    // Test auth error
    rerender(
      <ErrorDialog 
        {...defaultProps} 
        type="auth_error"
      />
    );
    
    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText(/session may have expired/)).toBeInTheDocument();
    
    // Test API error
    rerender(
      <ErrorDialog 
        {...defaultProps} 
        type="api_error"
      />
    );
    
    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByText(/server encountered an issue/)).toBeInTheDocument();
    
    // Test validation error
    rerender(
      <ErrorDialog 
        {...defaultProps} 
        type="validation_error"
      />
    );
    
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
    expect(screen.getByText(/check your input/)).toBeInTheDocument();
  });
});