import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ThumbnailGrid from '../ThumbnailGrid';
import { FileReference } from '@shared/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ThumbnailGrid Component', () => {
  const mockFiles: FileReference[] = [
    {
      id: 'file-1',
      name: 'image1.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
      path: '/shot-123/image1.jpg',
      url: 'http://example.com/image1.jpg',
      createdAt: new Date('2023-01-01'),
      modifiedAt: new Date('2023-01-01')
    },
    {
      id: 'file-2',
      name: 'video1.mp4',
      size: 2048,
      mimeType: 'video/mp4',
      path: '/shot-123/video1.mp4',
      url: 'http://example.com/video1.mp4',
      createdAt: new Date('2023-01-02'),
      modifiedAt: new Date('2023-01-02')
    },
    {
      id: 'file-3',
      name: 'document.pdf',
      size: 512,
      mimeType: 'application/pdf',
      path: '/shot-123/document.pdf',
      url: 'http://example.com/document.pdf',
      createdAt: new Date('2023-01-03'),
      modifiedAt: new Date('2023-01-03')
    }
  ];

  const defaultProps = {
    files: mockFiles,
    entityType: 'shot',
    entityId: 'shot-123',
    fieldName: 'thumbnails',
    onFileDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders thumbnails correctly', () => {
    render(<ThumbnailGrid {...defaultProps} />);
    
    // Check if all file names are displayed
    expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    expect(screen.getByText('video1.mp4')).toBeInTheDocument();
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    
    // Check if image is rendered
    const images = document.querySelectorAll('img');
    expect(images.length).toBe(1); // Only one image file
    expect(images[0]).toHaveAttribute('src', 'http://example.com/image1.jpg');
    
    // Check if video has play icon
    const playIcons = document.querySelectorAll('svg[data-testid="PlayCircleOutlineIcon"]');
    expect(playIcons.length).toBe(1);
    
    // Check if PDF shows extension
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('shows empty state when no files', () => {
    render(<ThumbnailGrid {...defaultProps} files={[]} />);
    expect(screen.getByText('No thumbnails available')).toBeInTheDocument();
  });

  it('opens preview dialog when thumbnail is clicked', () => {
    render(<ThumbnailGrid {...defaultProps} />);
    
    // Click on the first thumbnail
    fireEvent.click(screen.getByText('image1.jpg'));
    
    // Check if dialog is open with image
    const previewImage = document.querySelector('img[src="http://example.com/image1.jpg"]');
    expect(previewImage).toBeInTheDocument();
    
    // Check if dialog has close button
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    
    // Close dialog
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    
    // Check if dialog is closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deletes a file successfully', async () => {
    // Mock successful delete response
    mockedAxios.delete.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'File deleted successfully'
      }
    });
    
    render(<ThumbnailGrid {...defaultProps} />);
    
    // Find delete button for first file (need to hover to see actions)
    const firstThumbnail = screen.getByText('image1.jpg').closest('.MuiImageListItem-root');
    if (firstThumbnail) {
      // Simulate hover
      fireEvent.mouseEnter(firstThumbnail);
      
      // Find and click delete button
      const deleteButtons = document.querySelectorAll('svg[data-testid="DeleteIcon"]');
      fireEvent.click(deleteButtons[0]);
      
      // Check if axios was called correctly
      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(
          `/api/files/${defaultProps.entityType}/${defaultProps.entityId}/image1.jpg?fieldName=${defaultProps.fieldName}`
        );
        
        expect(defaultProps.onFileDelete).toHaveBeenCalledWith(mockFiles[0]);
      });
    }
  });

  it('handles delete errors', async () => {
    // Mock error response
    mockedAxios.delete.mockRejectedValueOnce(new Error('Delete failed'));
    
    render(<ThumbnailGrid {...defaultProps} />);
    
    // Find delete button for first file (need to hover to see actions)
    const firstThumbnail = screen.getByText('image1.jpg').closest('.MuiImageListItem-root');
    if (firstThumbnail) {
      // Simulate hover
      fireEvent.mouseEnter(firstThumbnail);
      
      // Find and click delete button
      const deleteButtons = document.querySelectorAll('svg[data-testid="DeleteIcon"]');
      fireEvent.click(deleteButtons[0]);
      
      // Check if error is displayed
      await waitFor(() => {
        expect(screen.getByText('Delete failed')).toBeInTheDocument();
      });
    }
  });

  it('respects readOnly prop', () => {
    render(<ThumbnailGrid {...defaultProps} readOnly={true} />);
    
    // Find first thumbnail
    const firstThumbnail = screen.getByText('image1.jpg').closest('.MuiImageListItem-root');
    if (firstThumbnail) {
      // Simulate hover
      fireEvent.mouseEnter(firstThumbnail);
      
      // Check that delete button is not present
      const deleteButtons = document.querySelectorAll('svg[data-testid="DeleteIcon"]');
      expect(deleteButtons.length).toBe(0);
    }
  });
});