import { EntityType, FolderInfo, FileInfo, StorageConfig, EntityFolderStructure } from '../../../shared/types';

/**
 * Abstract interface for storage providers (Google Drive, Box, etc.)
 */
export interface IStorageProvider {
  /**
   * Initialize the storage provider with configuration
   */
  initialize(config: StorageConfig): Promise<void>;

  /**
   * Create folder structure for an entity (ORIGINALS and PROXIES)
   */
  createEntityFolder(entityType: EntityType, entityId: string): Promise<EntityFolderStructure>;

  /**
   * Create a folder at the specified path
   */
  createFolder(path: string, parentId?: string): Promise<FolderInfo>;

  /**
   * Move entity folder to deleted archive with metadata
   */
  moveToDeleted(entityType: EntityType, entityId: string, metadata?: any): Promise<void>;

  /**
   * Generate URL for accessing a file
   */
  generateFileUrl(path: string, isProxy: boolean): string;

  /**
   * Generate URL for accessing a folder
   */
  generateFolderUrl(path: string, isProxy: boolean): string;

  /**
   * Check if a folder exists
   */
  folderExists(path: string): Promise<boolean>;

  /**
   * List contents of a folder
   */
  listFolder(path: string): Promise<(FolderInfo | FileInfo)[]>;

  /**
   * Get folder information
   */
  getFolderInfo(path: string): Promise<FolderInfo>;

  /**
   * Upload a file to the specified path
   */
  uploadFile(filePath: string, fileBuffer: Buffer, mimeType: string, originalName: string): Promise<FileInfo>;

  /**
   * Delete a file at the specified path
   */
  deleteFile(filePath: string): Promise<void>;

  /**
   * Get file information
   */
  getFileInfo(filePath: string): Promise<FileInfo>;

  /**
   * Check if a file exists
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Get storage provider type
   */
  getProviderType(): 'gdrive' | 'box';
}