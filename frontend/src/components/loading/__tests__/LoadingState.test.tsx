import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingState from '../LoadingState';

describe('LoadingState', () => {
  it('renders with default props', () => {
    render(<LoadingState />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingState message="Custom loading message" />);
    
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  it('renders as full page', () => {
    const { container } = render(<LoadingState fullPage />);
    
    // Check for full page styling
    const loadingElement = container.firstChild;
    expect(loadingElement).toHaveStyle('min-height: 100vh');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingState size="small" />);
    
    // Small size should have a smaller CircularProgress
    let progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    
    rerender(<LoadingState size="large" />);
    
    // Large size should have a larger CircularProgress
    progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
  });

  it('renders as overlay', () => {
    const { container } = render(<LoadingState overlay />);
    
    // Check for overlay styling
    const loadingElement = container.firstChild;
    expect(loadingElement).toHaveStyle('position: absolute');
    expect(loadingElement).toHaveStyle('z-index: 1000');
    expect(loadingElement).toHaveStyle('background-color: rgba(255, 255, 255, 0.7)');
  });
});