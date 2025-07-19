import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { NotificationProvider } from '../../../components/notifications';
import { useFileUpload } from '../FileUploadService';

// Mock XMLHttpRequest
const xhrMock = {
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  upload: {
    addEventListener: jest.fn()
  },
  addEventListener: jest.fn(),
  readyState: 1,
  status: 200,
  responseText: JSON.stringify({ success: true }),
  abort: jest.fn()
};

// Mock errorLogger
jest.mock('../../error', () => ({
  errorLogger: {
    logError: jest.fn()
  }
}));

describe('FileUploadService', () => {
  let originalXHR: typeof XMLHttpRequest;
  
  beforeEach(() => {
    originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = jest.fn(() => xhrMock as unknown as XMLHttpRequest) as any;
    
    // Reset mock functions
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    window.XMLHttpRequest = originalXHR;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NotificationProvider>{children}</NotificationProvider>
  );

  it('initializes the hook correctly', () => {
    const { result } = renderHook(() => useFileUpload(), { wrapper });
    
    expect(result.current.uploadFile).toBeDefined();
    expect(result.current.uploadFiles).toBeDefined();
    expect(result.current.abortUpload).toBeDefined();
  });

  it('uploads a file with progress tracking', async () => {
    // Mock successful upload
    const loadListener = jest.fn();
    const progressListener = jest.fn();
    
    xhrMock.addEventListener.mockImplementation((event, callback) => {
      if (event === 'load') {
        loadListener.mockImplementation(() => callback());
      }
    });
    
    xhrMock.upload.addEventListener.mockImplementation((event, callback) => {
      if (event === 'progress') {
        progressListener.mockImplementation((progressEvent) => callback(progressEvent));
      }
    });
    
    const { result } = renderHook(() => useFileUpload(), { wrapper });
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const onProgress = jest.fn();
    const onSuccess = jest.fn();
    
    // Start upload
    const uploadPromise = result.current.uploadFile(file, '/api/upload', {
      onProgress,
      onSuccess
    });
    
    // Simulate progress events
    act(() => {
      progressListener({
        lengthComputable: true,
        loaded: 50,
        total: 100
      });
    });
    
    // Check progress callback
    expect(onProgress).toHaveBeenCalledWith(50);
    
    // Simulate upload completion
    act(() => {
      loadListener();
    });
    
    // Wait for upload to complete
    const uploadResult = await uploadPromise;
    
    // Check result
    expect(uploadResult.success).toBe(true);
    expect(uploadResult.data).toEqual({ success: true });
    
    // Check success callback
    expect(onSuccess).toHaveBeenCalledWith({ success: true });
    
    // Check XHR setup
    expect(xhrMock.open).toHaveBeenCalledWith('POST', '/api/upload', true);
    expect(xhrMock.send).toHaveBeenCalled();
    expect(xhrMock.setRequestHeader).toHaveBeenCalledWith('Accept', 'application/json');
  });

  it('handles upload errors', async () => {
    // Mock failed upload
    const errorListener = jest.fn();
    
    xhrMock.addEventListener.mockImplementation((event, callback) => {
      if (event === 'error') {
        errorListener.mockImplementation(() => callback());
      }
    });
    
    const { result } = renderHook(() => useFileUpload(), { wrapper });
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const onError = jest.fn();
    
    // Start upload
    const uploadPromise = result.current.uploadFile(file, '/api/upload', {
      onError,
      maxRetries: 0 // Disable retries for this test
    });
    
    // Simulate error
    act(() => {
      errorListener();
    });
    
    // Wait for upload to complete
    const uploadResult = await uploadPromise;
    
    // Check result
    expect(uploadResult.success).toBe(false);
    expect(uploadResult.error).toBe('Network error during upload');
    
    // Check error callback
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0][0].message).toBe('Network error during upload');
  });

  it('aborts an ongoing upload', () => {
    const { result } = renderHook(() => useFileUpload(), { wrapper });
    
    // Create mock XHR
    const mockXhr = {
      readyState: 1,
      abort: jest.fn()
    } as unknown as XMLHttpRequest;
    
    // Abort upload
    result.current.abortUpload(mockXhr);
    
    // Check that abort was called
    expect(mockXhr.abort).toHaveBeenCalled();
  });

  it('uploads multiple files sequentially', async () => {
    // Mock successful upload
    const loadListener = jest.fn();
    
    xhrMock.addEventListener.mockImplementation((event, callback) => {
      if (event === 'load') {
        loadListener.mockImplementation(() => callback());
      }
    });
    
    const { result } = renderHook(() => useFileUpload(), { wrapper });
    
    const files = [
      new File(['content 1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content 2'], 'file2.txt', { type: 'text/plain' })
    ];
    
    // Start upload
    const uploadPromise = result.current.uploadFiles(files, '/api/upload');
    
    // Simulate upload completion for both files
    act(() => {
      loadListener();
      loadListener();
    });
    
    // Wait for uploads to complete
    const uploadResults = await uploadPromise;
    
    // Check results
    expect(uploadResults.length).toBe(2);
    expect(uploadResults[0].success).toBe(true);
    expect(uploadResults[1].success).toBe(true);
    
    // Check XHR setup - should be called twice
    expect(xhrMock.open).toHaveBeenCalledTimes(2);
    expect(xhrMock.send).toHaveBeenCalledTimes(2);
  });
});