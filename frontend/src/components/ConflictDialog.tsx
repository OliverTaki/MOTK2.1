import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Divider,
} from '@mui/material';
import { ConflictData, ResolutionChoice } from '@shared/types';

interface ConflictDialogProps {
  open: boolean;
  conflictData: ConflictData | null;
  onResolve: (choice: ResolutionChoice) => void;
  onCancel: () => void;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({
  open,
  conflictData,
  onResolve,
  onCancel,
}) => {
  if (!conflictData) return null;

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const handleResolve = (choice: ResolutionChoice) => {
    onResolve(choice);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      aria-labelledby="conflict-dialog-title"
    >
      <DialogTitle id="conflict-dialog-title">
        Conflict Detected
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Another user has modified this field while you were editing. 
          Please choose how to resolve this conflict.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Field: <strong>{conflictData.fieldId}</strong>
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Entity: <strong>{conflictData.entityId}</strong>
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Your Original Value:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                p: 1, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}
            >
              {formatValue(conflictData.originalValue)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="error.main">
              Current Server Value:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                p: 1, 
                bgcolor: 'error.50', 
                borderRadius: 1,
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}
            >
              {formatValue(conflictData.currentValue)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="primary.main">
              Your New Value:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                p: 1, 
                bgcolor: 'primary.50', 
                borderRadius: 1,
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}
            >
              {formatValue(conflictData.newValue)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onCancel}
          variant="outlined"
          color="inherit"
        >
          Cancel
        </Button>
        
        <Button
          onClick={() => handleResolve(ResolutionChoice.KEEP_SERVER)}
          variant="outlined"
          color="error"
        >
          Keep Server Value
        </Button>
        
        <Button
          onClick={() => handleResolve(ResolutionChoice.EDIT_AGAIN)}
          variant="outlined"
          color="warning"
        >
          Edit Again
        </Button>
        
        <Button
          onClick={() => handleResolve(ResolutionChoice.OVERWRITE)}
          variant="contained"
          color="primary"
        >
          Overwrite with My Value
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictDialog;