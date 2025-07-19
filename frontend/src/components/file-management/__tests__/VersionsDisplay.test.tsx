import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import VersionsDisplay from '../VersionsDisplay';
import { FileReference, VersionReference } from '@shared/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VersionsDisplay Component', () => {
  const mockFiles: FileReference[] = [
    {
      id: 'file-1',
      name: 'document_v3.pdf',
      size: 1024 * 1024, // 1MB
      mimeType: 'application/pdf',
      path: '/shot-123/versions/document_v3.pdf',
      url: 'http://example.com/document_v3.pdf',
      createdAt: new Date('2023-01-03'),
      modifiedAt: new Date('2023-01-03')
    },
    {
      id: 'file-2',
      name: 'document_v2.pdf',
      size: 900 * 1024, // 900KB
      mimeType: 'application/pdf',
      path: '/shot-123/versions/document_v2.pdf',
      url: 'http://example.com/document_v2.pdf',
      createdAt: new Date('2023-01-02'),
      modifiedAt: new Date('2023-01-02')
    },
    {
      id: 'file-3',
      name: 'document_v1.pdf',
      size: 800 * 1024, // 800KB
      mimeType: 'application/pdf',
      path: '/shot-123/versions/document_v1.pdf',
      url: 'http://example.com/document_v1.pdf',
      createdAt: new Date('2023-01-01'),
      modifiedAt: new Date('2023-01-01')
    }
  ];

  const mockVersions: VersionReference = {
    latest: mockFiles[0],
    versions: mockFiles
  };

  const defaultProps = {
    versions: mockVersions,
    entityType: 'shot',
    entityId: 'shot-123',
    fieldName: 'versions',
    onVersionDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders latest version correctly', () => {
    render(<VersionsDisplay {...defaultProps} />);
    
    // Check if latest version info is displayed
    expect(screen.getByText('Latest Version')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('document_v3.pdf')).toBeInTheDocument();
    expect(screen.getByText(/1 MB/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 3, 2023/)).toBeInTheDocument();
    
    // Check if buttons are present
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history \(3\)/i })).toBeInTheDocument();
  });

  it('shows empty state when no versions', () => {
    render(
      <VersionsDisplay
        {...defaultProps}
        versions={{ latest: null, versions: [] }}
      />
    );
    
    expect(screen.getByText('No versions available')).toBeInTheDocument();
    expect(screen.queryByText('Latest Version')).not.toBeInTheDocument();
    
    // History button should be disabled
    const historyButton = screen.getByRole('button', { name: /history \(0\)/i });
    expect(historyButton).toBeDisabled();
  });

  it('opens version history dialog', () => {
    render(<VersionsDisplay {...defaultProps} />);
    
    // Click history button
    const historyButton = screen.getByRole('button', { name: /history \(3\)/i });
    fireEvent.click(historyButton);
    
    // Check if dialog is open
    expect(screen.getByText('Version History')).toBeInTheDocument();
    
    // Check if all versions are listed
    expect(screen.getAllByText(/document_v\d\.pdf/).length).toBe(4); // 3 in list + 1 in preview
    
    // Check if latest version is marked
    expect(screen.getByText('Latest')).toBeInTheDocument();
    
    // Close dialog
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Check if dialog is closed
    expect(screen.queryByText('Version History')).not.toBeInTheDocument();
  });

  it('deletes a version successfully', async () => {
    // Mock successful delete response
    mockedAxios.delete.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'File deleted successfully'
      }
    });
    
    render(<VersionsDisplay {...defaultProps} />);
    
    // Open history dialog
    const historyButton = screen.getByRole('button', { name: /history \(3\)/i });
    fireEvent.click(historyButton);
    
    // Find and click delete button for second version
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[1]); // Second version in the list
    
    // Check if axios was called correctly
    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/api/files/${defaultProps.entityType}/${defaultProps.entityId}/document_v2.pdf?fieldName=${defaultProps.fieldName}`
      );
      
      expect(defaultProps.onVersionDelete).toHaveBeenCalledWith(mockFiles[1]);
    });
  });

  it('handles delete errors', async () => {
    // Mock error response
    mockedAxios.delete.mockRejectedValueOnce(new Error('Delete failed'));
    
    render(<VersionsDisplay {...defaultProps} />);
    
    // Open history dialog
    const historyButton = screen.getByRole('button', { name: /history \(3\)/i });
    fireEvent.click(historyButton);
    
    // Find and click delete button for second version
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[1]); // Second version in the list
    
    // Check if error is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to delete version')).toBeInTheDocument();
    });
  });

  it('respects readOnly prop', () => {
    render(<VersionsDisplay {...defaultProps} readOnly={true} />);
    
    // Open history dialog
    const historyButton = screen.getByRole('button', { name: /history \(3\)/i });
    fireEvent.click(historyButton);
    
    // Check that delete buttons are not present
    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBe(0);
  });

  it('renders image preview correctly', () => {
    const imageVersions: VersionReference = {
      latest: {
        ...mockFiles[0],
        name: 'image.jpg',
        mimeType: 'image/jpeg',
        path: '/shot-123/versions/image.jpg',
        url: 'http://example.com/image.jpg'
      },
      versions: [
        {
          ...mockFiles[0],
          name: 'image.jpg',
          mimeType: 'image/jpeg',
          path: '/shot-123/versions/image.jpg',
          url: 'http://example.com/image.jpg'
        }
      ]
    };
    
    render(
      <VersionsDisplay
        {...defaultProps}
        versions={imageVersions}
      />
    );
    
    // Check if image is rendered
    const image = document.querySelector('img');
    expect(image).toHaveAttribute('src', 'http://example.com/image.jpg');
  });

  it('renders video preview correctly', () => {
    const videoVersions: VersionReference = {
      latest: {
        ...mockFiles[0],
        name: 'video.mp4',
        mimeType: 'video/mp4',
        path: '/shot-123/versions/video.mp4',
        url: 'http://example.com/video.mp4'
      },
      versions: [
        {
          ...mockFiles[0],
          name: 'video.mp4',
          mimeType: 'video/mp4',
          path: '/shot-123/versions/video.mp4',
          url: 'http://example.com/video.mp4'
        }
      ]
    };
    
    render(
      <VersionsDisplay
        {...defaultProps}
        versions={videoVersions}
      />
    );
    
    // Check if video is rendered
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('src', 'http://example.com/video.mp4');
  });
});