import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { errorLogger, ErrorType } from '../../services/error/ErrorLogger';
import ErrorDialog from './ErrorDialog';

interface ErrorContextType {
  // Error state
  hasError: boolean;
  errorMessage: string | null;
  errorDetails: string | null;
  errorType: ErrorType | null;
  
  // Error actions
  setError: (message: string, details?: string, type?: ErrorType) => void;
  clearError: () => void;
  logError: (error: Error, context?: Record<string, any>, type?: ErrorType) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);

  const setError = useCallback((message: string, details?: string, type: ErrorType = 'unhandled_error') => {
    setHasError(true);
    setErrorMessage(message);
    setErrorDetails(details || null);
    setErrorType(type);
  }, []);

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage(null);
    setErrorDetails(null);
    setErrorType(null);
  }, []);

  const logError = useCallback((error: Error, context?: Record<string, any>, type: ErrorType = 'unhandled_error') => {
    // Log to centralized error logging service
    errorLogger.logError({
      error,
      context,
      type
    });

    // Set error state for UI
    setError(error.message, error.stack, type);
  }, [setError]);

  const value = {
    hasError,
    errorMessage,
    errorDetails,
    errorType,
    setError,
    clearError,
    logError
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ErrorDialog 
        open={hasError}
        message={errorMessage || 'An unexpected error occurred'}
        details={errorDetails}
        type={errorType || 'unhandled_error'}
        onClose={clearError}
      />
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export default ErrorProvider;