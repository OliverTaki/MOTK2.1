import { useNotification } from '../../components/notifications';
import { errorLogger } from '../error';

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  timeout?: number;
  chunkSize?: number;
  maxRetries?: number;
}

export interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Hook for file uploads with progress tracking and notifications
 */
export const useFileUpload = () => {
  const { 
    showProgressNotification, 
    updateProgressNotification, 
    showSuccessNotification,
    showErrorNotification,
    dismissNotification
  } = useNotification();

  /**
   * Upload a single file with progress tracking
   */
  const uploadFile = async (
    file: File,
    url: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> => {
    const {
      onProgress,
      onSuccess,
      onError,
      headers = {},
      withCredentials = true,
      timeout = 30000,
      maxRetries = 3
    } = options;

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Show notification
    const notificationId = showProgressNotification(`Uploading ${file.name}`, {
      progress: 0
    });

    let retries = 0;

    try {
      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Create promise to handle the request
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            
            // Update notification
            updateProgressNotification(notificationId, progress);
            
            // Call progress callback if provided
            if (onProgress) {
              onProgress(progress);
            }
          }
        });

        // Set up completion handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            let response;
            try {
              response = JSON.parse(xhr.responseText);
            } catch (e) {
              response = xhr.responseText;
            }
            
            // Show success notification
            showSuccessNotification(`Successfully uploaded ${file.name}`, {
              autoHideDuration: 3000
            });
            
            // Call success callback if provided
            if (onSuccess) {
              onSuccess(response);
            }
            
            resolve({
              success: true,
              data: response
            });
          } else {
            let errorMessage = `Upload failed with status ${xhr.status}`;
            let errorResponse;
            
            try {
              errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error || errorResponse.message || errorMessage;
            } catch (e) {
              // Use default error message
            }
            
            const error = new Error(errorMessage);
            
            // Show error notification
            showErrorNotification(`Failed to upload ${file.name}: ${errorMessage}`, {
              autoHideDuration: 5000
            });
            
            // Call error callback if provided
            if (onError) {
              onError(error);
            }
            
            reject(error);
          }
        });

        // Set up error handler
        xhr.addEventListener('error', () => {
          const error = new Error('Network error during upload');
          
          // If we have retries left, retry the upload
          if (retries < maxRetries) {
            retries++;
            
            // Update notification
            updateProgressNotification(notificationId, 0);
            
            // Retry after delay
            setTimeout(() => {
              xhr.open('POST', url, true);
              setXhrHeaders(xhr);
              xhr.send(formData);
            }, 1000 * Math.pow(2, retries));
            
            return;
          }
          
          // Show error notification
          showErrorNotification(`Failed to upload ${file.name}: Network error`, {
            autoHideDuration: 5000
          });
          
          // Call error callback if provided
          if (onError) {
            onError(error);
          }
          
          reject(error);
        });

        // Set up timeout handler
        xhr.addEventListener('timeout', () => {
          const error = new Error('Upload timed out');
          
          // Show error notification
          showErrorNotification(`Upload of ${file.name} timed out`, {
            autoHideDuration: 5000
          });
          
          // Call error callback if provided
          if (onError) {
            onError(error);
          }
          
          reject(error);
        });

        // Set up abort handler
        xhr.addEventListener('abort', () => {
          const error = new Error('Upload aborted');
          
          // Dismiss progress notification
          dismissNotification(notificationId);
          
          // Call error callback if provided
          if (onError) {
            onError(error);
          }
          
          reject(error);
        });

        // Set timeout
        xhr.timeout = timeout;

        // Set withCredentials
        xhr.withCredentials = withCredentials;

        // Open request
        xhr.open('POST', url, true);
        
        // Set headers
        const setXhrHeaders = (xhr: XMLHttpRequest) => {
          // Set default headers
          if (!headers['Accept']) {
            xhr.setRequestHeader('Accept', 'application/json');
          }
          
          // Set custom headers
          Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        };
        
        setXhrHeaders(xhr);

        // Send request
        xhr.send(formData);
      });

      // Return upload promise
      return await uploadPromise;
    } catch (error) {
      // Log error
      errorLogger.logError({
        error: error as Error,
        type: 'storage_error',
        context: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          url
        }
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  };

  /**
   * Upload multiple files with progress tracking
   */
  const uploadFiles = async (
    files: File[],
    url: string,
    options: UploadOptions = {}
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      const result = await uploadFile(file, url, options);
      results.push(result);
    }
    
    return results;
  };

  /**
   * Abort an ongoing upload
   */
  const abortUpload = (xhr: XMLHttpRequest) => {
    if (xhr && xhr.readyState !== 4) {
      xhr.abort();
    }
  };

  return {
    uploadFile,
    uploadFiles,
    abortUpload
  };
};

export default useFileUpload;