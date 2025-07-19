import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { ConflictResolutionProvider, useConflictResolutionContext } from './ConflictResolutionProvider';
import { CellUpdateParams } from '@shared/types';

const ConflictResolutionDemo: React.FC = () => {
  const { updateCell, isUpdating } = useConflictResolutionContext();
  const [fieldValue, setFieldValue] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [result, setResult] = useState<string>('');

  const handleSimulateConflict = async () => {
    const params: CellUpdateParams = {
      sheetName: 'Shots',
      entityId: 'shot_001',
      fieldId: 'title',
      originalValue: originalValue,
      newValue: fieldValue,
    };

    try {
      const response = await updateCell(params);
      if (response.success) {
        setResult('Update successful!');
      } else {
        setResult(`Update failed: ${response.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Conflict Resolution Demo
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This demo shows how the conflict resolution system works. 
        Try updating a field to see the conflict dialog in action.
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Original Value"
          value={originalValue}
          onChange={(e) => setOriginalValue(e.target.value)}
          placeholder="Enter the original value"
          fullWidth
        />
        
        <TextField
          label="New Value"
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          placeholder="Enter your new value"
          fullWidth
        />

        <Button
          variant="contained"
          onClick={handleSimulateConflict}
          disabled={isUpdating || !fieldValue || !originalValue}
          sx={{ alignSelf: 'flex-start' }}
        >
          {isUpdating ? 'Updating...' : 'Simulate Update'}
        </Button>

        {result && (
          <Alert severity={result.includes('successful') ? 'success' : 'error'}>
            {result}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

const ConflictResolutionExample: React.FC = () => {
  return (
    <ConflictResolutionProvider>
      <ConflictResolutionDemo />
    </ConflictResolutionProvider>
  );
};

export default ConflictResolutionExample;