import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  IconButton,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { EntityType, FieldType } from '@shared/types';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Field {
  field_id: string;
  field_name: string;
  entity: string;
  type: string;
  options?: string;
}

interface FilterValue {
  type: string;
  value: any;
}

interface FiltersConfigPanelProps {
  entityType: EntityType;
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
}

const FiltersConfigPanel: React.FC<FiltersConfigPanelProps> = ({
  entityType,
  filters,
  onFiltersChange
}) => {
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>(filters);
  const [selectedField, setSelectedField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<any>('');
  const [filterOperator, setFilterOperator] = useState<string>('equals');

  // Fetch available fields for the entity type
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['fields', entityType],
    queryFn: async () => {
      const response = await axios.get(`/api/fields?entity=${entityType}`);
      return response.data.data as Field[];
    }
  });

  // Update current filters when props change
  useEffect(() => {
    setCurrentFilters(filters);
  }, [filters]);

  // Get field type for the selected field
  const getFieldType = (fieldId: string): string => {
    if (!fieldsData) return '';
    const field = fieldsData.find(f => f.field_id === fieldId);
    return field?.type || '';
  };

  // Get field options for select fields
  const getFieldOptions = (fieldId: string): string[] => {
    if (!fieldsData) return [];
    const field = fieldsData.find(f => f.field_id === fieldId);
    if (field?.options) {
      return field.options.split(',');
    }
    return [];
  };

  // Add filter
  const handleAddFilter = () => {
    if (!selectedField || filterValue === '') return;

    const fieldType = getFieldType(selectedField);
    let processedValue = filterValue;

    // Process value based on field type
    switch (fieldType) {
      case FieldType.NUMBER:
        processedValue = Number(filterValue);
        break;
      case FieldType.CHECKBOX:
        processedValue = filterValue === 'true';
        break;
      case FieldType.DATE:
        // Keep as string for date comparison
        break;
      default:
        // Keep as string for text, select, etc.
        break;
    }

    // Create filter object based on operator
    let filterObject;
    switch (filterOperator) {
      case 'equals':
        filterObject = processedValue;
        break;
      case 'not_equals':
        filterObject = { $ne: processedValue };
        break;
      case 'contains':
        filterObject = { $regex: processedValue, $options: 'i' };
        break;
      case 'greater_than':
        filterObject = { $gt: processedValue };
        break;
      case 'less_than':
        filterObject = { $lt: processedValue };
        break;
      case 'in':
        // For multi-select values
        filterObject = { $in: Array.isArray(processedValue) ? processedValue : [processedValue] };
        break;
      default:
        filterObject = processedValue;
    }

    const updatedFilters = {
      ...currentFilters,
      [selectedField]: filterObject
    };

    setCurrentFilters(updatedFilters);
    onFiltersChange(updatedFilters);
    
    // Reset form
    setSelectedField('');
    setFilterValue('');
    setFilterOperator('equals');
  };

  // Remove filter
  const handleRemoveFilter = (fieldId: string) => {
    const updatedFilters = { ...currentFilters };
    delete updatedFilters[fieldId];
    
    setCurrentFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  // Get display value for filter
  const getFilterDisplayValue = (fieldId: string, value: any): string => {
    const fieldType = getFieldType(fieldId);
    
    if (value === null || value === undefined) {
      return 'null';
    }
    
    if (typeof value === 'object') {
      // Handle operator objects
      if (value.$ne !== undefined) return `≠ ${value.$ne}`;
      if (value.$gt !== undefined) return `> ${value.$gt}`;
      if (value.$lt !== undefined) return `< ${value.$lt}`;
      if (value.$regex !== undefined) return `contains "${value.$regex}"`;
      if (value.$in !== undefined) return `in [${value.$in.join(', ')}]`;
      
      return JSON.stringify(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    return String(value);
  };

  // Get field name from field ID
  const getFieldName = (fieldId: string): string => {
    if (!fieldsData) return fieldId;
    const field = fieldsData?.find(f => f.field_id === fieldId);
    return field?.field_name || fieldId;
  };

  // Render filter input based on field type
  const renderFilterInput = () => {
    if (!selectedField) return null;
    
    const fieldType = getFieldType(selectedField);
    
    switch (fieldType) {
      case FieldType.SELECT:
        const options = getFieldOptions(selectedField);
        return (
          <FormControl fullWidth margin="normal">
            <InputLabel>Value</InputLabel>
            <Select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              label="Value"
            >
              {options.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      
      case FieldType.CHECKBOX:
        return (
          <FormControl fullWidth margin="normal">
            <InputLabel>Value</InputLabel>
            <Select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              label="Value"
            >
              <MenuItem value="true">True</MenuItem>
              <MenuItem value="false">False</MenuItem>
            </Select>
          </FormControl>
        );
      
      case FieldType.NUMBER:
        return (
          <TextField
            label="Value"
            type="number"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            fullWidth
            margin="normal"
          />
        );
      
      case FieldType.DATE:
        return (
          <TextField
            label="Value"
            type="date"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        );
      
      default:
        return (
          <TextField
            label="Value"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            fullWidth
            margin="normal"
          />
        );
    }
  };

  // Render operator select based on field type
  const renderOperatorSelect = () => {
    if (!selectedField) return null;
    
    const fieldType = getFieldType(selectedField);
    
    let operators = [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' }
    ];
    
    switch (fieldType) {
      case FieldType.TEXT:
        operators = [
          ...operators,
          { value: 'contains', label: 'Contains' }
        ];
        break;
      
      case FieldType.NUMBER:
      case FieldType.DATE:
        operators = [
          ...operators,
          { value: 'greater_than', label: 'Greater Than' },
          { value: 'less_than', label: 'Less Than' }
        ];
        break;
      
      case FieldType.SELECT:
        operators = [
          ...operators,
          { value: 'in', label: 'In List' }
        ];
        break;
    }
    
    return (
      <FormControl fullWidth margin="normal">
        <InputLabel>Operator</InputLabel>
        <Select
          value={filterOperator}
          onChange={(e) => setFilterOperator(e.target.value)}
          label="Operator"
        >
          {operators.map(op => (
            <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  if (isLoading) {
    return <Typography>Loading fields...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Filters
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Add filters to limit the data displayed in the table.
      </Typography>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Add Filter
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Field</InputLabel>
              <Select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                label="Field"
              >
                <MenuItem value="">
                  <em>Select a field</em>
                </MenuItem>
                {fieldsData?.map((field) => (
                  <MenuItem key={field.field_id} value={field.field_id}>
                    {field.field_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            {renderOperatorSelect()}
          </Grid>
          <Grid item xs={12} md={3}>
            {renderFilterInput()}
          </Grid>
          <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddFilter}
              disabled={!selectedField || filterValue === ''}
              sx={{ mt: 2 }}
              fullWidth
            >
              Add
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Active Filters
        </Typography>
        {Object.keys(currentFilters).length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No filters applied. Data will not be filtered.
          </Typography>
        ) : (
          <List dense>
            {Object.entries(currentFilters).map(([fieldId, value]) => (
              <ListItem key={fieldId}>
                <ListItemText
                  primary={getFieldName(fieldId)}
                  secondary={getFilterDisplayValue(fieldId, value)}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFilter(fieldId)}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default FiltersConfigPanel;