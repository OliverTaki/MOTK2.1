import { fileUploadService } from './FileUploadService';
import { storageManager } from '../storage/StorageManager';
import { storageInitializationService } from '../storage/StorageInitializationService';
import { proxyGenerationService } from '../proxy/ProxyGenerationService';
import { EntityType, FileInfo, FieldType, ProxyGenerationJob } from '../../../shared/types';

/**
 * File Management Integration Service - Orchestrates file operations across all components
 */
export class FileManagementIntegrationService {
  
  /**
   * Initialize file management system
   */
  async initialize(): Promise<void> {
    // Initialize storage if not already done
    if (!storageInitializationService.isInitialized()) {
      await storageInitializationService.initializeDefaultStorage();
    }
  }

  /**
   * Upload file with automatic proxy generation for videos
   */
  async uploadFileWithProxyGeneration(
    entityType: EntityType,
    entityId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    fieldName?: string,
    generateProxy: boolean = true
  ): Promise<{
    fileInfo: FileInfo;
    proxyJobId?: string;
  }> {
    // Ensure system is initialized
    await this.initialize();

    // Upload the original file
    const fileInfo = await fileUploadService.uploadFile(
      entityType,
      entityId,
      fileBuffer,
      originalName,
      mimeType,
      fieldName
    );

    let proxyJobId: string | undefined;

    // Generate proxy for video files if requested
    if (generateProxy && mimeType.startsWith('video/')) {
      try {
        proxyJobId = await proxyGenerationService.queueProxyGeneration(
          entityType,
          entityId,
          fileInfo
        );
        console.log(`Proxy generation queued for ${originalName}, job ID: ${proxyJobId}`);
      } catch (error) {
        console.warn(`Failed to queue proxy generation for ${originalName}:`, error);
        // Don't fail the upload if proxy generation fails
      }
    }

    return {
      fileInfo,
      proxyJobId
    };
  }

  /**
   * Upload multiple files with batch proxy generation
   */
  async uploadMultipleFilesWithProxyGeneration(
    entityType: EntityType,
    entityId: string,
    files: Array<{
      buffer: Buffer;
      originalName: string;
      mimeType: string;
    }>,
    fieldName?: string,
    generateProxies: boolean = true
  ): Promise<{
    uploadResults: Array<{
      fileInfo: FileInfo;
      proxyJobId?: string;
    }>;
    errors: Array<{
      fileName: string;
      error: string;
    }>;
  }> {
    // Ensure system is initialized
    await this.initialize();

    const uploadResults: Array<{
      fileInfo: FileInfo;
      proxyJobId?: string;
    }> = [];
    const errors: Array<{
      fileName: string;
      error: string;
    }> = [];

    // Process each file
    for (const file of files) {
      try {
        const result = await this.uploadFileWithProxyGeneration(
          entityType,
          entityId,
          file.buffer,
          file.originalName,
          file.mimeType,
          fieldName,
          generateProxies
        );
        uploadResults.push(result);
      } catch (error) {
        errors.push({
          fileName: file.originalName,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    return {
      uploadResults,
      errors
    };
  }

  /**
   * Get comprehensive file information including proxy status
   */
  async getFileInfoWithProxyStatus(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    fieldName?: string
  ): Promise<{
    fileInfo: FileInfo;
    proxyJobs: ProxyGenerationJob[];
    hasProxy: boolean;
  }> {
    // Get basic file info
    const fileInfo = await fileUploadService.getFileInfo(
      entityType,
      entityId,
      fileName,
      fieldName
    );

    // Get proxy generation jobs for this entity
    const proxyJobs = proxyGenerationService.getEntityJobs(entityType, entityId);
    
    // Filter jobs for this specific file
    const fileProxyJobs = proxyJobs.filter(job => 
      job.originalFileInfo.name === fileName
    );

    // Check if proxy exists
    const hasProxy = fileProxyJobs.some(job => 
      job.status === 'completed'
    );

    return {
      fileInfo,
      proxyJobs: fileProxyJobs,
      hasProxy
    };
  }

  /**
   * Get all files for an entity with proxy status
   */
  async getEntityFilesWithProxyStatus(
    entityType: EntityType,
    entityId: string
  ): Promise<{
    thumbnails: Array<FileInfo & { proxyJobs: ProxyGenerationJob[]; hasProxy: boolean }>;
    file_list: Array<FileInfo & { proxyJobs: ProxyGenerationJob[]; hasProxy: boolean }>;
    versions: Array<FileInfo & { proxyJobs: ProxyGenerationJob[]; hasProxy: boolean }>;
  }> {
    // Get entity files
    const entityFiles = await fileUploadService.getEntityFiles(entityType, entityId);
    
    // Get all proxy jobs for this entity
    const allProxyJobs = proxyGenerationService.getEntityJobs(entityType, entityId);

    // Helper function to add proxy status to files
    const addProxyStatus = (files: FileInfo[]) => {
      return files.map(file => {
        const proxyJobs = allProxyJobs.filter(job => 
          job.originalFileInfo.name === file.name
        );
        const hasProxy = proxyJobs.some(job => job.status === 'completed');
        
        return {
          ...file,
          proxyJobs,
          hasProxy
        };
      });
    };

    return {
      thumbnails: addProxyStatus(entityFiles.thumbnails),
      file_list: addProxyStatus(entityFiles.file_list),
      versions: addProxyStatus(entityFiles.versions)
    };
  }

  /**
   * Delete file and associated proxies
   */
  async deleteFileWithProxies(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    fieldName?: string
  ): Promise<void> {
    // Delete the original file
    await fileUploadService.deleteFile(entityType, entityId, fileName, fieldName);

    // Cancel any pending proxy generation jobs for this file
    const proxyJobs = proxyGenerationService.getEntityJobs(entityType, entityId);
    const fileProxyJobs = proxyJobs.filter(job => 
      job.originalFileInfo.name === fileName && 
      job.status === 'pending'
    );

    for (const job of fileProxyJobs) {
      proxyGenerationService.cancelJob(job.id);
    }

    // TODO: Delete proxy files from storage
    // This would require implementing proxy file deletion in the storage manager
    console.log(`Deleted file ${fileName} and cancelled ${fileProxyJobs.length} proxy jobs`);
  }

  /**
   * Archive entity folder and all associated files/proxies
   */
  async archiveEntityWithFiles(
    entityType: EntityType,
    entityId: string,
    metadata?: any
  ): Promise<void> {
    // Get all proxy jobs for this entity before archiving
    const proxyJobs = proxyGenerationService.getEntityJobs(entityType, entityId);
    
    // Cancel pending proxy jobs
    const pendingJobs = proxyJobs.filter(job => job.status === 'pending');
    for (const job of pendingJobs) {
      proxyGenerationService.cancelJob(job.id);
    }

    // Archive the entity folder
    await fileUploadService.archiveEntityFolder(entityType, entityId, {
      ...metadata,
      cancelledProxyJobs: pendingJobs.length,
      totalProxyJobs: proxyJobs.length,
      archivedAt: new Date().toISOString()
    });

    console.log(`Archived entity ${entityType}_${entityId} with ${proxyJobs.length} proxy jobs`);
  }

  /**
   * Get storage provider status
   */
  getStorageStatus(): {
    initialized: boolean;
    provider: string | null;
    config: any;
  } {
    const config = storageInitializationService.getStorageConfig();
    
    return {
      initialized: storageInitializationService.isInitialized(),
      provider: config?.provider || null,
      config: config ? {
        provider: config.provider,
        originalsRootUrl: config.originalsRootUrl,
        proxiesRootUrl: config.proxiesRootUrl
      } : null
    };
  }

  /**
   * Test storage connectivity
   */
  async testStorageConnectivity(): Promise<{
    success: boolean;
    provider: string;
    error?: string;
  }> {
    try {
      await this.initialize();
      
      const config = storageInitializationService.getStorageConfig();
      if (!config) {
        throw new Error('Storage not configured');
      }

      // Test basic folder operations
      const testFolderExists = await storageManager.folderExists('test');
      
      return {
        success: true,
        provider: config.provider
      };
    } catch (error) {
      return {
        success: false,
        provider: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const fileManagementIntegrationService = new FileManagementIntegrationService();