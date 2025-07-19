import axios from 'axios';
import { EntityType, FileReference, ProxyGenerationJob } from '@shared/types';

export interface FileUploadResult {
  file: FileReference;
  metadata: any;
  proxyJobId?: string;
}

export interface BatchUploadResult {
  uploaded: FileUploadResult[];
  errors?: Array<{
    fileName: string;
    error: string;
  }>;
}

export interface FileWithProxyStatus extends FileReference {
  proxyJobs: ProxyGenerationJob[];
  hasProxy: boolean;
}

export interface EntityFilesWithProxyStatus {
  thumbnails: FileWithProxyStatus[];
  file_list: FileWithProxyStatus[];
  versions: FileWithProxyStatus[];
}

export interface StorageStatus {
  initialized: boolean;
  provider: string | null;
  config: any;
}

export interface ProxyGenerationStatus {
  queueLength: number;
  isProcessing: boolean;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
}

/**
 * Frontend service for file management operations
 */
export class FileManagementService {
  private baseUrl = '/api/files';

  /**
   * Upload a single file
   */
  async uploadFile(
    entityType: EntityType,
    entityId: string,
    file: File,
    fieldName?: string,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = `${this.baseUrl}/upload/${entityType}/${entityId}${fieldName ? `?fieldName=${fieldName}` : ''}`;

    const response = await axios.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Upload failed');
    }

    return response.data.data;
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    entityType: EntityType,
    entityId: string,
    files: File[],
    fieldName?: string,
    onProgress?: (progress: number) => void
  ): Promise<BatchUploadResult> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const endpoint = `${this.baseUrl}/upload-multiple/${entityType}/${entityId}${fieldName ? `?fieldName=${fieldName}` : ''}`;

    const response = await axios.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Upload failed');
    }

    return response.data.data;
  }

  /**
   * Get file information with proxy status
   */
  async getFileInfo(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    fieldName?: string
  ): Promise<FileReference> {
    const endpoint = `${this.baseUrl}/${entityType}/${entityId}/${fileName}${fieldName ? `?fieldName=${fieldName}` : ''}`;
    
    const response = await axios.get(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get file info');
    }

    return response.data.data;
  }

  /**
   * List files in entity folder
   */
  async listFiles(
    entityType: EntityType,
    entityId: string,
    fieldName?: string
  ): Promise<FileReference[]> {
    const endpoint = `${this.baseUrl}/list/${entityType}/${entityId}${fieldName ? `?fieldName=${fieldName}` : ''}`;
    
    const response = await axios.get(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to list files');
    }

    return fieldName ? response.data.data.files : response.data.data;
  }

  /**
   * Get all entity files organized by field type
   */
  async getEntityFiles(
    entityType: EntityType,
    entityId: string
  ): Promise<{
    thumbnails: FileReference[];
    file_list: FileReference[];
    versions: FileReference[];
    totalCount: number;
  }> {
    const endpoint = `${this.baseUrl}/list/${entityType}/${entityId}`;
    
    const response = await axios.get(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get entity files');
    }

    return response.data.data;
  }

  /**
   * Delete a file
   */
  async deleteFile(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    fieldName?: string
  ): Promise<void> {
    const endpoint = `${this.baseUrl}/${entityType}/${entityId}/${fileName}${fieldName ? `?fieldName=${fieldName}` : ''}`;
    
    const response = await axios.delete(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete file');
    }
  }

  /**
   * Archive entity folder
   */
  async archiveEntity(
    entityType: EntityType,
    entityId: string,
    metadata?: any
  ): Promise<void> {
    const endpoint = `${this.baseUrl}/archive/${entityType}/${entityId}`;
    
    const response = await axios.post(endpoint, { metadata });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to archive entity');
    }
  }

  /**
   * Generate proxy for a file
   */
  async generateProxy(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    options?: {
      take?: string;
      version?: number;
      immediate?: boolean;
    }
  ): Promise<{
    jobId?: string;
    status: string;
    proxyInfo?: any;
  }> {
    const endpoint = `${this.baseUrl}/proxy/${entityType}/${entityId}/${fileName}`;
    
    const response = await axios.post(endpoint, options || {});
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate proxy');
    }

    return response.data.data;
  }

  /**
   * Get proxy generation job status
   */
  async getProxyJobStatus(jobId: string): Promise<ProxyGenerationJob> {
    const endpoint = `${this.baseUrl}/proxy/status/${jobId}`;
    
    const response = await axios.get(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get job status');
    }

    return response.data.data;
  }

  /**
   * Get proxy generation queue status
   */
  async getProxyQueueStatus(): Promise<ProxyGenerationStatus> {
    const endpoint = `${this.baseUrl}/proxy/queue/status`;
    
    const response = await axios.get(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get queue status');
    }

    return response.data.data;
  }

  /**
   * Get storage status
   */
  async getStorageStatus(): Promise<StorageStatus> {
    const endpoint = `${this.baseUrl}/storage/status`;
    
    const response = await axios.get(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get storage status');
    }

    return response.data.data;
  }

  /**
   * Test storage connectivity
   */
  async testStorageConnectivity(): Promise<{
    success: boolean;
    provider: string;
    error?: string;
  }> {
    const endpoint = `${this.baseUrl}/storage/test`;
    
    const response = await axios.post(endpoint);
    
    return response.data.data;
  }

  /**
   * Get file URL for access
   */
  getFileUrl(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    fieldName?: string,
    proxy: boolean = false
  ): string {
    return `${this.baseUrl}/url/${entityType}/${entityId}/${fileName}${fieldName ? `?fieldName=${fieldName}` : ''}${proxy ? '&proxy=true' : ''}`;
  }
}

// Export singleton instance
export const fileManagementService = new FileManagementService();