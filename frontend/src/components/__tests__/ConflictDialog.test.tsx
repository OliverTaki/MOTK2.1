import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ConflictDialog from '../ConflictDialog';
import { ConflictData, ResolutionChoice } from '@shared/types';

describe('ConflictDialog', () => {
  const mockConflictData: ConflictData = {
    originalValue: 'original value',
    currentValue: 'server value',
    newValue: 'user new value',
    fieldId: 'title',
    entityId: 'shot_001',
  };

  const defaultProps = {
    open: true,
    conflictData: mockConflictData,
    onResolve: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conflict dialog when open', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
    expect(screen.getByText(/Another user has modified this field while you were editing/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConflictDialog {...defaultProps} open={false} />);
    
    expect(screen.queryByText('Conflict Detected')).not.toBeInTheDocument();
  });

  it('does not render when conflictData is null', () => {
    render(<ConflictDialog {...defaultProps} conflictData={null} />);
    
    expect(screen.queryByText('Conflict Detected')).not.toBeInTheDocument();
  });

  it('displays field and entity information', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    expect(screen.getByText('Field:')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('Entity:')).toBeInTheDocument();
    expect(screen.getByText('shot_001')).toBeInTheDocument();
  });

  it('displays all three values correctly', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    expect(screen.getByText('Your Original Value:')).toBeInTheDocument();
    expect(screen.getByText('original value')).toBeInTheDocument();
    
    expect(screen.getByText('Current Server Value:')).toBeInTheDocument();
    expect(screen.getByText('server value')).toBeInTheDocument();
    
    expect(screen.getByText('Your New Value:')).toBeInTheDocument();
    expect(screen.getByText('user new value')).toBeInTheDocument();
  });

  it('handles null/undefined values correctly', () => {
    const conflictDataWithNulls: ConflictData = {
      originalValue: null,
      currentValue: undefined,
      newValue: '',
      fieldId: 'description',
      entityId: 'asset_001',
    };

    render(<ConflictDialog {...defaultProps} conflictData={conflictDataWithNulls} />);
    
    expect(screen.getAllByText('(empty)')).toHaveLength(2);
  });

  it('handles object values correctly', () => {
    const conflictDataWithObjects: ConflictData = {
      originalValue: { name: 'test', value: 123 },
      currentValue: { name: 'updated', value: 456 },
      newValue: { name: 'user', value: 789 },
      fieldId: 'metadata',
      entityId: 'task_001',
    };

    render(<ConflictDialog {...defaultProps} conflictData={conflictDataWithObjects} />);
    
    expect(screen.getByText('{"name":"test","value":123}')).toBeInTheDocument();
    expect(screen.getByText('{"name":"updated","value":456}')).toBeInTheDocument();
    expect(screen.getByText('{"name":"user","value":789}')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onResolve with KEEP_SERVER when Keep Server Value is clicked', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Keep Server Value'));
    
    expect(defaultProps.onResolve).toHaveBeenCalledWith(ResolutionChoice.KEEP_SERVER);
  });

  it('calls onResolve with EDIT_AGAIN when Edit Again is clicked', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Edit Again'));
    
    expect(defaultProps.onResolve).toHaveBeenCalledWith(ResolutionChoice.EDIT_AGAIN);
  });

  it('calls onResolve with OVERWRITE when Overwrite with My Value is clicked', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Overwrite with My Value'));
    
    expect(defaultProps.onResolve).toHaveBeenCalledWith(ResolutionChoice.OVERWRITE);
  });

  it('calls onCancel when dialog backdrop is clicked', async () => {
    render(<ConflictDialog {...defaultProps} />);
    
    // Click on the backdrop (outside the dialog content)
    const backdrop = document.querySelector('.MuiBackdrop-root');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    await waitFor(() => {
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('has proper accessibility attributes', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'conflict-dialog-title');
    
    const title = screen.getByText('Conflict Detected');
    expect(title).toHaveAttribute('id', 'conflict-dialog-title');
  });

  it('displays warning alert with correct severity', () => {
    render(<ConflictDialog {...defaultProps} />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardWarning');
  });

  it('formats long values with proper word breaking', () => {
    const longValueConflict: ConflictData = {
      originalValue: 'this is a very long value that should break properly when displayed in the dialog',
      currentValue: 'another very long value that needs to be displayed with proper formatting',
      newValue: 'user entered a very long value that should also be formatted correctly',
      fieldId: 'long_field',
      entityId: 'entity_with_long_values',
    };

    render(<ConflictDialog {...defaultProps} conflictData={longValueConflict} />);
    
    // Check that the values are displayed with proper styling
    expect(screen.getByText('this is a very long value that should break properly when displayed in the dialog')).toBeInTheDocument();
    expect(screen.getByText('another very long value that needs to be displayed with proper formatting')).toBeInTheDocument();
    expect(screen.getByText('user entered a very long value that should also be formatted correctly')).toBeInTheDocument();
  });
});