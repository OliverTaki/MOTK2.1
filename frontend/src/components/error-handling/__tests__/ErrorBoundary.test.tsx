import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error when the 'shouldThrow' prop is true
const ErrorThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock error logger
const mockErrorLogger = {
  logError: jest.fn()
};

describe('ErrorBoundary', () => {
  // Suppress console errors during tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalConsoleError;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when an error occurs', () => {
    // We need to spy on console.error and suppress it for this test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    
    render(
      <ErrorBoundary errorLogger={mockErrorLogger}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Check that the fallback UI is rendered
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We've encountered an unexpected error/)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    
    // Check that the error is displayed
    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    
    // Check that the error was logged
    expect(mockErrorLogger.logError).toHaveBeenCalledTimes(1);
    expect(mockErrorLogger.logError).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(Error),
      errorInfo: expect.any(Object),
      type: 'react_error_boundary'
    }));
    
    spy.mockRestore();
  });

  it('renders custom fallback UI when provided', () => {
    render(
      <ErrorBoundary 
        fallback={<div data-testid="custom-fallback">Custom fallback</div>}
      >
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('resets the error state when the "Try Again" button is clicked', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();
    
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ErrorBoundary onReset={onReset}>
        {shouldThrow ? <ErrorThrowingComponent shouldThrow /> : <div>No error</div>}
      </ErrorBoundary>
    );
    
    const { rerender } = render(<TestComponent shouldThrow={true} />);
    
    // Check that the error UI is shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Click the "Try Again" button
    await user.click(screen.getByText('Try Again'));
    
    // Check that onReset was called
    expect(onReset).toHaveBeenCalledTimes(1);
    
    // Rerender with shouldThrow=false to simulate a successful recovery
    rerender(<TestComponent shouldThrow={false} />);
    
    // Check that the normal UI is shown
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});