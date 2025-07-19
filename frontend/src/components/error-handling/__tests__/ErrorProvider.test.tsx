import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorProvider, useError } from '../ErrorProvider';
import { ErrorType } from '../../../services/error/ErrorLogger';

// Mock the errorLogger
jest.mock('../../../services/error/ErrorLogger', () => ({
  errorLogger: {
    logError: jest.fn()
  },
  ErrorType: {
    'api_error': 'api_error',
    'network_error': 'network_error',
    'auth_error': 'auth_error',
    'validation_error': 'validation_error',
    'unhandled_error': 'unhandled_error'
  }
}));

// Test component that uses the error context
const TestComponent = () => {
  const { setError, clearError, logError, hasError, errorMessage } = useError();
  
  const triggerError = (type: ErrorType) => {
    setError('Test error message', 'Error details', type);
  };
  
  const triggerLogError = () => {
    const error = new Error('Logged error');
    logError(error, { additionalInfo: 'test' }, 'api_error');
  };
  
  return (
    <div>
      <div data-testid="error-status">
        {hasError ? 'Has Error' : 'No Error'}
      </div>
      {errorMessage && (
        <div data-testid="error-message">{errorMessage}</div>
      )}
      <button onClick={() => triggerError('network_error')}>Trigger Network Error</button>
      <button onClick={() => triggerError('auth_error')}>Trigger Auth Error</button>
      <button onClick={() => triggerError('validation_error')}>Trigger Validation Error</button>
      <button onClick={() => triggerLogError()}>Log Error</button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
};

describe('ErrorProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides error context to children', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    expect(screen.getByTestId('error-status')).toHaveTextContent('No Error');
  });

  it('sets and displays errors', async () => {
    const user = userEvent.setup();
    
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    // Trigger an error
    await user.click(screen.getByText('Trigger Network Error'));
    
    // Check that the error state is updated
    expect(screen.getByTestId('error-status')).toHaveTextContent('Has Error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error message');
    
    // Check that the error dialog is displayed
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  it('clears errors', async () => {
    const user = userEvent.setup();
    
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    // Trigger an error
    await user.click(screen.getByText('Trigger Network Error'));
    
    // Check that the error is displayed
    expect(screen.getByTestId('error-status')).toHaveTextContent('Has Error');
    
    // Clear the error
    await user.click(screen.getByText('Clear Error'));
    
    // Check that the error is cleared
    expect(screen.getByTestId('error-status')).toHaveTextContent('No Error');
    
    // Check that the error dialog is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('logs errors to the error logger', async () => {
    const user = userEvent.setup();
    const { errorLogger } = require('../../../services/error/ErrorLogger');
    
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    // Log an error
    await user.click(screen.getByText('Log Error'));
    
    // Check that the error was logged
    expect(errorLogger.logError).toHaveBeenCalledTimes(1);
    expect(errorLogger.logError).toHaveBeenCalledWith({
      error: expect.any(Error),
      context: { additionalInfo: 'test' },
      type: 'api_error'
    });
    
    // Check that the error state is updated
    expect(screen.getByTestId('error-status')).toHaveTextContent('Has Error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Logged error');
  });

  it('displays different error types correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    // Test network error
    await user.click(screen.getByText('Trigger Network Error'));
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    
    // Close the dialog
    await user.click(screen.getByText('Close'));
    
    // Test auth error
    await user.click(screen.getByText('Trigger Auth Error'));
    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText(/session may have expired/i)).toBeInTheDocument();
    
    // Close the dialog
    await user.click(screen.getByText('Close'));
    
    // Test validation error
    await user.click(screen.getByText('Trigger Validation Error'));
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
    expect(screen.getByText(/check your input/i)).toBeInTheDocument();
  });
});