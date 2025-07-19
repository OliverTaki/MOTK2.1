import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressIndicator from '../ProgressIndicator';

describe('ProgressIndicator', () => {
  it('renders linear progress by default', () => {
    render(<ProgressIndicator value={50} />);
    
    // Should have a linear progress bar
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    
    // Should show percentage
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders circular progress when specified', () => {
    render(<ProgressIndicator value={75} variant="circular" />);
    
    // Should have a circular progress
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    
    // Should show percentage
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays message and detail text', () => {
    render(
      <ProgressIndicator 
        value={30} 
        message="Uploading file" 
        detail="3 of 10 MB uploaded"
      />
    );
    
    expect(screen.getByText('Uploading file')).toBeInTheDocument();
    expect(screen.getByText('3 of 10 MB uploaded')).toBeInTheDocument();
  });

  it('can hide percentage display', () => {
    render(<ProgressIndicator value={40} showPercentage={false} />);
    
    // Should not show percentage
    expect(screen.queryByText('40%')).not.toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<ProgressIndicator value={60} size="small" />);
    
    // Small size
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    
    rerender(<ProgressIndicator value={60} size="large" />);
    
    // Large size
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders with different colors', () => {
    const { rerender } = render(<ProgressIndicator value={60} color="primary" />);
    
    // Primary color
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    
    rerender(<ProgressIndicator value={60} color="error" />);
    
    // Error color
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const handleCancel = jest.fn();
    const user = userEvent.setup();
    
    render(<ProgressIndicator value={80} onCancel={handleCancel} />);
    
    // Cancel button should be present
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
    
    // Click cancel button
    await user.click(cancelButton);
    
    // onCancel should be called
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('renders indeterminate progress', () => {
    render(<ProgressIndicator value={0} indeterminate />);
    
    // Should have an indeterminate progress bar
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).not.toHaveAttribute('aria-valuenow');
    
    // Should not show percentage for indeterminate progress
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('normalizes values to be between 0 and 100', () => {
    const { rerender } = render(<ProgressIndicator value={-10} />);
    
    // Negative values should be normalized to 0
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
    
    rerender(<ProgressIndicator value={150} />);
    
    // Values over 100 should be normalized to 100
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});