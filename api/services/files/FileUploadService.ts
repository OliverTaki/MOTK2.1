import { storageManager } from '../storage/StorageManager';
import { EntityType, FileInfo, FieldType } from '../../../shared/types';

/**
 * File Upload Service - Handles file upload operations and metadata tracking
 */
export class FileUploadService {
  /**
   * Upload a file to an entity folder
   */
  async uploadFile(
    entityType: EntityType,
    entityId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    fieldName?: string
  ): Promise<FileInfo> {
    // Ensure storage manager is initialized
    if (!storageManager.isInitialized()) {
      throw new Error('Storage manager not initialized');
    }

    // Validate entity type
    this.validateEntityType(entityType);

    // Validate field name if provided
    if (fieldName) {
      this.validateFieldName(fieldName);
    }

    // Ensure entity folder exists
    await this.ensureEntityFolder(entityType, entityId);

    // Upload the file
    const fileInfo = await storageManager.uploadFile(
      entityType,
      entityId,
      fileBuffer,
      mimeType,
      originalName,
      fieldName
    );

    return fileInfo;
  }

  /**
   * Delete a file from an entity folder
   */
  async deleteFile(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    fieldName?: string
  ): Promise<void> {
    // Ensure storage manager is initialized
    if (!storageManager.isInitialized()) {
      throw new Error('Storage manager not initialized');
    }

    // Validate entity type
    this.validateEntityType(entityType);

    // Check if file exists before attempting deletion
    const exists = await storageManager.fileExists(entityType, entityId, fileName, fieldName);
    if (!exists) {
      throw new Error(`File not found: ${fileName}`);
    }

    // Delete the file
    await storageManager.deleteFile(entityType, entityId, fileName, fieldName);
  }

  /**
   * Get file information
   */
  async getFileInfo(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    fieldName?: string
  ): Promise<FileInfo> {
    // Ensure storage manager is initialized
    if (!storageManager.isInitialized()) {
      throw new Error('Storage manager not initialized');
    }

    // Validate entity type
    this.validateEntityType(entityType);

    return await storageManager.getFileInfo(entityType, entityId, fileName, fieldName);
  }

  /**
   * List files in an entity folder
   */
  async listFiles(
    entityType: EntityType,
    entityId: string,
    fieldName?: string
  ): Promise<FileInfo[]> {
    // Ensure storage manager is initialized
    if (!storageManager.isInitialized()) {
      throw new Error('Storage manager not initialized');
    }

    // Validate entity type
    this.validateEntityType(entityType);

    return await storageManager.listEntityFiles(entityType, entityId, fieldName);
  }

  /**
   * Get file URL for access
   */
  getFileUrl(
    entityType: EntityType,
    entityId: string,
    fileName: string,
    fieldName?: string,
    isProxy: boolean = false
  ): string {
    // Ensure storage manager is initialized
    if (!storageManager.isInitialized()) {
      throw new Error('Storage manager not initialized');
    }

    let filePath: string;
    if (fieldName === 'versions') {
      filePath = `${entityType}_${entityId}/${fieldName}/${fileName}`;
    } else {
      filePath = `${entityType}_${entityId}/${fileName}`;
    }

    return storageManager.generateFileUrl(filePath, isProxy);
  }

  /**
   * Get files organized by field type for an entity
   */
  async getEntityFiles(entityType: EntityType, entityId: string): Promise<{
    thumbnails: FileInfo[];
    file_list: FileInfo[];
    versions: FileInfo[];
  }> {
    const [thumbnails, file_list, versions] = await Promise.all([
      this.listFiles(entityType, entityId), // Default folder for thumbnails and file_list
      this.listFiles(entityType, entityId), // Same as thumbnails for now
      this.listFiles(entityType, entityId, 'versions') // Versions subfolder
    ]);

    return {
      thumbnails,
      file_list,
      versions
    };
  }

  /**
   * Move entity folder to deleted archive
   */
  async archiveEntityFolder(
    entityType: EntityType,
    entityId: string,
    metadata?: any
  ): Promise<void> {
    // Ensure storage manager is initialized
    if (!storageManager.isInitialized()) {
      throw new Error('Storage manager not initialized');
    }

    // Validate entity type
    this.validateEntityType(entityType);

    await storageManager.moveToDeleted(entityType, entityId, metadata);
  }

  /**
   * Validate file upload constraints
   */
  validateFileUpload(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    fieldType?: FieldType
  ): void {
    // Check file size (max 100MB for free storage)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileBuffer.length > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file name
    if (!originalName || originalName.trim().length === 0) {
      throw new Error('File name is required');
    }

    // Check for invalid characters in filename
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(originalName)) {
      throw new Error('File name contains invalid characters');
    }

    // Validate MIME type based on field type
    if (fieldType) {
      this.validateMimeTypeForField(fieldType, mimeType);
    }
  }

  /**
   * Generate file metadata for tracking
   */
  generateFileMetadata(
    fileInfo: FileInfo,
    entityType: EntityType,
    entityId: string,
    fieldName?: string
  ): any {
    return {
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimeType,
      entityType,
      entityId,
      fieldName,
      uploadedAt: new Date().toISOString(),
      url: fileInfo.url,
      path: fileInfo.path
    };
  }

  // Private helper methods
  private validateEntityType(entityType: EntityType): void {
    const validTypes: EntityType[] = ['shot', 'asset', 'task', 'member', 'user'];
    if (!validTypes.includes(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }
  }

  private validateFieldName(fieldName: string): void {
    const validFieldNames = ['thumbnails', 'file_list', 'versions'];
    if (!validFieldNames.includes(fieldName)) {
      throw new Error(`Invalid field name: ${fieldName}`);
    }
  }

  private validateMimeTypeForField(fieldType: FieldType, mimeType: string): void {
    switch (fieldType) {
      case FieldType.THUMBNAILS:
        // Allow images and videos for thumbnails
        if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
          throw new Error('Thumbnails field only accepts image and video files');
        }
        break;
      case FieldType.VERSIONS:
        // Allow any file type for versions
        break;
      case FieldType.FILE_LIST:
        // Allow any file type for file list
        break;
      default:
        // No specific validation for other field types
        break;
    }
  }

  private async ensureEntityFolder(entityType: EntityType, entityId: string): Promise<void> {
    // Check if entity folder exists, create if it doesn't
    const folderPath = `${entityType}_${entityId}`;
    const exists = await storageManager.folderExists(folderPath);
    
    if (!exists) {
      await storageManager.createEntityFolder(entityType, entityId);
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();