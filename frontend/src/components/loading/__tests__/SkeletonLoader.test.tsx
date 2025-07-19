import React from 'react';
import { render, screen } from '@testing-library/react';
import SkeletonLoader from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders table skeleton', () => {
    const { container } = render(<SkeletonLoader type="table" count={3} />);
    
    // Header row + 3 data rows
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    
    // 5 columns per row, 4 rows (1 header + 3 data)
    expect(skeletons.length).toBe(5 * 4);
  });

  it('renders card skeleton', () => {
    const { container } = render(<SkeletonLoader type="card" count={2} />);
    
    // Each card has 4 skeletons (image + 3 text lines)
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(4 * 2);
  });

  it('renders list skeleton', () => {
    const { container } = render(<SkeletonLoader type="list" count={3} />);
    
    // Each list item has 3 skeletons (avatar + 2 text lines)
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(3 * 3);
  });

  it('renders detail skeleton', () => {
    const { container } = render(<SkeletonLoader type="detail" />);
    
    // Detail view has multiple skeletons
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it('renders text skeleton', () => {
    const { container } = render(<SkeletonLoader type="text" count={4} />);
    
    // Should have 4 text skeletons
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(4);
  });

  it('renders custom skeleton', () => {
    const { container } = render(
      <SkeletonLoader 
        type="custom" 
        height={100} 
        width={200} 
        variant="circular" 
      />
    );
    
    const skeleton = container.querySelector('.MuiSkeleton-root');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('MuiSkeleton-circular');
  });

  it('renders custom skeleton with children', () => {
    render(
      <SkeletonLoader type="custom">
        <div data-testid="custom-child">Custom skeleton content</div>
      </SkeletonLoader>
    );
    
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    expect(screen.getByText('Custom skeleton content')).toBeInTheDocument();
  });

  it('applies animation prop correctly', () => {
    const { container, rerender } = render(
      <SkeletonLoader type="text" count={1} animation="pulse" />
    );
    
    let skeleton = container.querySelector('.MuiSkeleton-root');
    expect(skeleton).toHaveClass('MuiSkeleton-pulse');
    
    rerender(<SkeletonLoader type="text" count={1} animation="wave" />);
    
    skeleton = container.querySelector('.MuiSkeleton-root');
    expect(skeleton).toHaveClass('MuiSkeleton-wave');
    
    rerender(<SkeletonLoader type="text" count={1} animation={false} />);
    
    skeleton = container.querySelector('.MuiSkeleton-root');
    expect(skeleton).not.toHaveClass('MuiSkeleton-pulse');
    expect(skeleton).not.toHaveClass('MuiSkeleton-wave');
  });
});