import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import FileUpload from '../FileUpload';
import { EntityType, FieldType } from '@shared/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FileUpload Component', () => {
  const defaultProps = {
    entityType: EntityType.SHOT,
    entityId: 'shot-123',
    fieldName: 'thumbnails',
    fieldType: FieldType.THUMBNAILS,
    onUploadComplete: jest.fn(),
    onUploadError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component correctly', () => {
    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText(/Drag & Drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/Accepts images and videos only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
  });

  it('handles file selection via input', async () => {
    render(<FileUpload {...defaultProps} />);
    
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /Drag & Drop files here/i });
    
    // Mock file input change
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    
    // Trigger file selection
    fireEvent.click(input);
    
    // Find the hidden input and simulate file selection
    const hiddenInput = document.querySelector('input[type="file"]');
    if (hiddenInput) {
      fireEvent.change(hiddenInput, { target: { files: [file] } });
    }
    
    // Check if file is displayed
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload/i })).not.toBeDisabled();
    });
  });

  it('uploads a file successfully', async () => {
    // Mock successful response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          file: {
            id: 'file-123',
            name: 'test.jpg',
            size: 1024,
            mimeType: 'image/jpeg',
            url: 'http://example.com/test.jpg',
            path: '/shot-123/test.jpg',
            createdAt: '2023-01-01T00:00:00.000Z',
            modifiedAt: '2023-01-01T00:00:00.000Z'
          }
        }
      }
    });
    
    render(<FileUpload {...defaultProps} />);
    
    // Setup file selection
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    Object.defineProperty(hiddenInput, 'files', {
      value: [file]
    });
    
    // Find the hidden input and simulate file selection
    const input = document.querySelector('input[type="file"]');
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);
    
    // Check if axios was called correctly
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/files/upload/${defaultProps.entityType}/${defaultProps.entityId}?fieldName=${defaultProps.fieldName}`,
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: expect.any(Function)
        })
      );
      
      expect(defaultProps.onUploadComplete).toHaveBeenCalled();
    });
  });

  it('handles upload errors', async () => {
    // Mock error response
    mockedAxios.post.mockRejectedValueOnce(new Error('Upload failed'));
    
    render(<FileUpload {...defaultProps} />);
    
    // Setup file selection
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    Object.defineProperty(hiddenInput, 'files', {
      value: [file]
    });
    
    // Find the hidden input and simulate file selection
    const input = document.querySelector('input[type="file"]');
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);
    
    // Check if error is displayed
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
      expect(defaultProps.onUploadError).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('allows removing selected files', async () => {
    render(<FileUpload {...defaultProps} />);
    
    // Setup file selection
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    Object.defineProperty(hiddenInput, 'files', {
      value: [file]
    });
    
    // Find the hidden input and simulate file selection
    const input = document.querySelector('input[type="file"]');
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Check if file is displayed
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
    
    // Click remove button
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    
    // Check if file is removed
    await waitFor(() => {
      expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
    });
  });
});