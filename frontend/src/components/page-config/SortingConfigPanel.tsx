import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { EntityType } from '@shared/types';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Field {
  field_id: string;
  field_name: string;
  entity: string;
  type: string;
}

interface SortingConfigPanelProps {
  entityType: EntityType;
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
  onSortingChange: (sorting: { field: string; direction: 'asc' | 'desc' }) => void;
}

const SortingConfigPanel: React.FC<SortingConfigPanelProps> = ({
  entityType,
  sorting,
  onSortingChange
}) => {
  const [sortField, setSortField] = useState<string>(sorting.field);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(sorting.direction);

  // Fetch available fields for the entity type
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['fields', entityType],
    queryFn: async () => {
      const response = await axios.get(`/api/fields?entity=${entityType}`);
      return response.data.data as Field[];
    }
  });

  // Update local state when props change
  useEffect(() => {
    setSortField(sorting.field);
    setSortDirection(sorting.direction);
  }, [sorting]);

  // Handle sort field change
  const handleSortFieldChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newField = event.target.value as string;
    setSortField(newField);
    onSortingChange({
      field: newField,
      direction: sortDirection
    });
  };

  // Handle sort direction change
  const handleSortDirectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDirection = event.target.value as 'asc' | 'desc';
    setSortDirection(newDirection);
    onSortingChange({
      field: sortField,
      direction: newDirection
    });
  };

  if (isLoading) {
    return <Typography>Loading fields...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Sorting
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Set the default sorting for this page.
      </Typography>

      <Paper elevation={1} sx={{ p: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortField}
                onChange={handleSortFieldChange as any}
                label="Sort By"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {fieldsData?.map((field) => (
                  <MenuItem key={field.field_id} value={field.field_id}>
                    {field.field_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Sort Direction
              </Typography>
              <RadioGroup
                row
                value={sortDirection}
                onChange={handleSortDirectionChange}
              >
                <FormControlLabel
                  value="asc"
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center">
                      <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Ascending
                    </Box>
                  }
                />
                <FormControlLabel
                  value="desc"
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center">
                      <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Descending
                    </Box>
                  }
                />
              </RadioGroup>
            </Box>
          </Grid>
        </Grid>

        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">
            {sortField ? (
              <>
                Table will be sorted by <strong>{fieldsData?.find(f => f.field_id === sortField)?.field_name || sortField}</strong> in <strong>{sortDirection === 'asc' ? 'ascending' : 'descending'}</strong> order.
              </>
            ) : (
              'No sorting will be applied. Table will use default ordering.'
            )}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default SortingConfigPanel;