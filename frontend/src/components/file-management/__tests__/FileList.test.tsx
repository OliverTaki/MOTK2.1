import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import FileList from '../FileList';
import { FileReference } from '@shared/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FileList Component', () => {
  const mockFiles: FileReference[] = [
    {
      id: 'file-1',
      name: 'document1.pdf',
      size: 1024 * 1024, // 1MB
      mimeType: 'application/pdf',
      path: '/shot-123/document1.pdf',
      url: 'http://example.com/document1.pdf',
      createdAt: new Date('2023-01-01'),
      modifiedAt: new Date('2023-01-01')
    },
    {
      id: 'file-2',
      name: 'spreadsheet.xlsx',
      size: 512 * 1024, // 512KB
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/shot-123/spreadsheet.xlsx',
      url: 'http://example.com/spreadsheet.xlsx',
      createdAt: new Date('2023-01-02'),
      modifiedAt: new Date('2023-01-02')
    },
    {
      id: 'file-3',
      name: 'image.jpg',
      size: 2 * 1024 * 1024, // 2MB
      mimeType: 'image/jpeg',
      path: '/shot-123/image.jpg',
      url: 'http://example.com/image.jpg',
      createdAt: new Date('2023-01-03'),
      modifiedAt: new Date('2023-01-03')
    }
  ];

  const defaultProps = {
    files: mockFiles,
    entityType: 'shot',
    entityId: 'shot-123',
    fieldName: 'file_list',
    onFileDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file list correctly', () => {
    render(<FileList {...defaultProps} />);
    
    // Check if all file names are displayed
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('spreadsheet.xlsx')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
    
    // Check if file sizes are displayed correctly
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    expect(screen.getByText('512 KB')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
    
    // Check if file types are displayed
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('XLSX')).toBeInTheDocument();
    expect(screen.getByText('JPEG')).toBeInTheDocument();
    
    // Check if dates are displayed
    expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2023')).toBeInTheDocument();
    expect(screen.getByText('Jan 3, 2023')).toBeInTheDocument();
  });

  it('shows empty state when no files', () => {
    render(<FileList {...defaultProps} files={[]} />);
    expect(screen.getByText('No files available')).toBeInTheDocument();
  });

  it('filters files by search term', () => {
    render(<FileList {...defaultProps} />);
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'pdf' } });
    
    // Check if only PDF file is displayed
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.queryByText('spreadsheet.xlsx')).not.toBeInTheDocument();
    expect(screen.queryByText('image.jpg')).not.toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // Check if all files are displayed again
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('spreadsheet.xlsx')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
  });

  it('sorts files by different criteria', () => {
    render(<FileList {...defaultProps} />);
    
    // Get all table rows (excluding header)
    const getRows = () => screen.getAllByRole('row').slice(1);
    
    // Default sort is by date (newest first)
    let rows = getRows();
    expect(rows[0]).toHaveTextContent('image.jpg');
    expect(rows[1]).toHaveTextContent('spreadsheet.xlsx');
    expect(rows[2]).toHaveTextContent('document1.pdf');
    
    // Sort by name
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    // Check if sorted alphabetically
    rows = getRows();
    expect(rows[0]).toHaveTextContent('document1.pdf');
    expect(rows[1]).toHaveTextContent('image.jpg');
    expect(rows[2]).toHaveTextContent('spreadsheet.xlsx');
    
    // Sort by size
    const sizeHeader = screen.getByText('Size');
    fireEvent.click(sizeHeader);
    
    // Check if sorted by size (ascending)
    rows = getRows();
    expect(rows[0]).toHaveTextContent('spreadsheet.xlsx'); // 512KB
    expect(rows[1]).toHaveTextContent('document1.pdf'); // 1MB
    expect(rows[2]).toHaveTextContent('image.jpg'); // 2MB
    
    // Reverse sort by size
    fireEvent.click(sizeHeader);
    
    // Check if sorted by size (descending)
    rows = getRows();
    expect(rows[0]).toHaveTextContent('image.jpg'); // 2MB
    expect(rows[1]).toHaveTextContent('document1.pdf'); // 1MB
    expect(rows[2]).toHaveTextContent('spreadsheet.xlsx'); // 512KB
  });

  it('deletes a file successfully', async () => {
    // Mock successful delete response
    mockedAxios.delete.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'File deleted successfully'
      }
    });
    
    render(<FileList {...defaultProps} />);
    
    // Find and click delete button for first file
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    // Check if axios was called correctly
    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/api/files/${defaultProps.entityType}/${defaultProps.entityId}/document1.pdf?fieldName=${defaultProps.fieldName}`
      );
      
      expect(defaultProps.onFileDelete).toHaveBeenCalledWith(mockFiles[0]);
    });
  });

  it('handles delete errors', async () => {
    // Mock error response
    mockedAxios.delete.mockRejectedValueOnce(new Error('Delete failed'));
    
    render(<FileList {...defaultProps} />);
    
    // Find and click delete button for first file
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    // Check if error is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to delete file')).toBeInTheDocument();
    });
  });

  it('respects readOnly prop', () => {
    render(<FileList {...defaultProps} readOnly={true} />);
    
    // Check that delete buttons are not present
    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBe(0);
  });

  it('opens file options menu', () => {
    render(<FileList {...defaultProps} />);
    
    // Find and click more options button for first file
    const moreButtons = screen.getAllByRole('button', { name: /more options/i });
    fireEvent.click(moreButtons[0]);
    
    // Check if menu is open
    expect(screen.getByText('Open in new tab')).toBeInTheDocument();
    expect(screen.getByText('Copy URL')).toBeInTheDocument();
    
    // Close menu by clicking outside
    fireEvent.click(document.body);
    
    // Check if menu is closed
    expect(screen.queryByText('Open in new tab')).not.toBeInTheDocument();
  });
});