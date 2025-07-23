import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  Box,
  Typography,
  CircularProgress,
  Button,
  Alert,
  Chip
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { EntityData } from '@shared/types';

export interface ColumnDefinition {
  fieldId: string;        // field_001, field_002, etc.
  fieldName: string;      // shot_id, title, status, etc.
  displayName: string;    // Human-readable name for UI
  width?: number;
  sortable?: boolean;
  formatter?: (value: any) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition[];
  loading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends EntityData>({
  data,
  columns,
  loading,
  error,
  onRefresh,
  onRowClick,
  emptyMessage = 'No data available'
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (fieldName: string) => {
    const isAsc = sortField === fieldName && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(fieldName);
  };

  const sortedData = React.useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortField as keyof T];
      const bValue = b[sortField as keyof T];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const formatCellValue = (row: T, column: ColumnDefinition) => {
    const value = row[column.fieldName as keyof T];
    
    if (column.formatter) {
      return column.formatter(value);
    }

    if (value === null || value === undefined) {
      return '-';
    }

    // Format dates
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(value).toLocaleDateString();
    }

    // Format status values
    if (column.fieldName === 'status') {
      return (
        <Chip 
          label={String(value)} 
          size="small" 
          color={getStatusColor(String(value))}
        />
      );
    }

    return String(value);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'complete':
        return 'success';
      case 'in_progress':
      case 'in progress':
        return 'primary';
      case 'review':
        return 'warning';
      case 'not_started':
      case 'not started':
        return 'default';
      case 'blocked':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="error" 
          action={
            onRefresh && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={onRefresh}
                startIcon={<RefreshIcon />}
              >
                Retry
              </Button>
            )
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
        {onRefresh && (
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={onRefresh}
            sx={{ mt: 2 }}
          >
            Refresh
          </Button>
        )}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="data table">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell 
                key={column.fieldId}
                style={{ width: column.width }}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={sortField === column.fieldName}
                    direction={sortField === column.fieldName ? sortDirection : 'asc'}
                    onClick={() => handleSort(column.fieldName)}
                  >
                    {column.displayName}
                  </TableSortLabel>
                ) : (
                  column.displayName
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow 
              key={index}
              hover
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((column) => (
                <TableCell key={`${index}-${column.fieldId}`}>
                  {formatCellValue(row, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}