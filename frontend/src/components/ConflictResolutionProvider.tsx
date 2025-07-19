import React, { createContext, useContext, ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';
import ConflictDialog from './ConflictDialog';
import { useConflictResolution } from '../hooks/useConflictResolution';
import { CellUpdateParams, ApiResponse } from '@shared/types';

interface ConflictResolutionContextType {
  updateCell: (params: CellUpdateParams) => Promise<ApiResponse<any>>;
  batchUpdate: (updates: CellUpdateParams[]) => Promise<ApiResponse<any[]>>;
  isUpdating: boolean;
  clearError: () => void;
}

const ConflictResolutionContext = createContext<ConflictResolutionContextType | null>(null);

interface ConflictResolutionProviderProps {
  children: ReactNode;
}

export const ConflictResolutionProvider: React.FC<ConflictResolutionProviderProps> = ({
  children,
}) => {
  const {
    isConflictDialogOpen,
    currentConflict,
    isUpdating,
    error,
    updateCell,
    batchUpdate,
    resolveConflict,
    dismissConflict,
    clearError,
  } = useConflictResolution();

  const contextValue: ConflictResolutionContextType = {
    updateCell,
    batchUpdate,
    isUpdating,
    clearError,
  };

  return (
    <ConflictResolutionContext.Provider value={contextValue}>
      {children}
      
      {/* Conflict Resolution Dialog */}
      <ConflictDialog
        open={isConflictDialogOpen}
        conflictData={currentConflict}
        onResolve={resolveConflict}
        onCancel={dismissConflict}
      />

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={clearError} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </ConflictResolutionContext.Provider>
  );
};

export const useConflictResolutionContext = (): ConflictResolutionContextType => {
  const context = useContext(ConflictResolutionContext);
  if (!context) {
    throw new Error(
      'useConflictResolutionContext must be used within a ConflictResolutionProvider'
    );
  }
  return context;
};

export default ConflictResolutionProvider;