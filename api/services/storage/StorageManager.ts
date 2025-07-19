import { IStorageProvider } from './IStorageProvider';
import { GoogleDriveProvider } from './GoogleDriveProvider';
import { BoxProvider } from './BoxProvider';
import { StorageConfig, EntityType, EntityFolderStructure, FolderInfo, FileInfo } from '../../../shared/types';

/**
 * Storage Manager - Unified interface for storage operations
 * Manages storage provider instances and provides high-level storage operations
 */
export class StorageManager {
  private provider: IStorageProvider | null = null;
  private config: StorageConfig | null = null;

  /**
   * Initialize storage manager with configuration
   */
  async initialize(config: StorageConfig): Promise<void> {
    this.config = config;
    
    // Create appropriate provider based on config
    switch (config.provider) {
      case 'gdrive':
        this.provider = new GoogleDriveProvider();
        break;
      case 'box':
        this.provider = new BoxProvider();
        break;
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }

    // Initialize the provider
    await this.provider.initialize(config);
  }

  /**
   * Create folder structure for an entity (ORIGINALS and PROXIES)
   */
  async createEntityFolder(entityType: EntityType, entityId: string): Promise<EntityFolderStructure> {
    this.ensureInitialized();
    return await this.provider!.createEntityFolder(entityType, entityId);
  }

  /**
   * Create a folder at the specified path
   */
  async createFolder(path: string, parentId?: string): Promise<FolderInfo> {
    this.ensureInitialized();
    return await this.provider!.createFolder(path, parentId);
  }

  /**
   * Move entity folder to deleted archive with metadata
   */
  async moveToDeleted(entityType: EntityType, entityId: string, metadata?: any): Promise<void> {
    this.ensureInitialized();
    await this.provider!.moveToDeleted(entityType, entityId, metadata);
  }

  /**
   * Generate URL for accessing a file
   */
  generateFileUrl(path: string, isProxy: boolean = false): string {
    this.ensureInitialized();
    return this.provider!.generateFileUrl(path, isProxy);
  }

  /**
   * Generate URL for accessing a folder
   */
  generateFolderUrl(path: string, isProxy: boolean = false): string {
    this.ensureInitialized();
    return this.provider!.generateFolderUrl(path, isProxy);
  }

  /**
   * Check if a folder exists
   */
  async folderExists(path: string): Promise<boolean> {
    this.ensureInitialized();
    return await this.provider!.folderExists(path);
  }

  /**
   * List contents of a folder
   */
  async listFolder(path: string): Promise<(FolderInfo | FileInfo)[]> {
    this.ensureInitialized();
    return await this.provider!.listFolder(path);
  }

  /**
   * Get folder information
   */
  async getFolderInfo(path: string): Promise<FolderInfo> {
    this.ensureInitialized();
    return await this.provider!.getFolderInfo(path);
  }

  /**
   * Get storage provider type
   */
  getProviderType(): 'gdrive' | 'box' {
    this.ensureInitialized();
    return this.provider!.getProviderType();
  }

  /**
   * Upload a file to an entity folder
   */
  async uploadFile(entityType: EntityType, entityId: string, fileBuffer: Buffer, mimeType: string, originalName: string, fieldName?: string): Promise<FileInfo> {
    this.ensureInitialized();
    
    // Determine the file path based on field type
    let filePath: string;
    if (fieldName === 'versions') {
      // For versions field, store in field-named sub-folder
      filePath = `${entityType}_${entityId}/${fieldName}/${originalName}`;
    } else {
      // For thumbnails and file_list, store directly in entity folder
      filePath = `${entityType}_${entityId}/${originalName}`;
    }
    
    return await this.provider!.uploadFile(filePath, fileBuffer, mimeType, originalName);
  }

  /**
   * Delete a file from an entity folder
   */
  async deleteFile(entityType: EntityType, entityId: string, fileName: string, fieldName?: string): Promise<void> {
    this.ensureInitialized();
    
    let filePath: string;
    if (fieldName === 'versions') {
      filePath = `${entityType}_${entityId}/${fieldName}/${fileName}`;
    } else {
      filePath = `${entityType}_${entityId}/${fileName}`;
    }
    
    await this.provider!.deleteFile(filePath);
  }

  /**
   * Get file information
   */
  async getFileInfo(entityType: EntityType, entityId: string, fileName: string, fieldName?: string): Promise<FileInfo> {
    this.ensureInitialized();
    
    let filePath: string;
    if (fieldName === 'versions') {
      filePath = `${entityType}_${entityId}/${fieldName}/${fileName}`;
    } else {
      filePath = `${entityType}_${entityId}/${fileName}`;
    }
    
    return await this.provider!.getFileInfo(filePath);
  }

  /**
   * Check if a file exists
   */
  async fileExists(entityType: EntityType, entityId: string, fileName: string, fieldName?: string): Promise<boolean> {
    this.ensureInitialized();
    
    let filePath: string;
    if (fieldName === 'versions') {
      filePath = `${entityType}_${entityId}/${fieldName}/${fileName}`;
    } else {
      filePath = `${entityType}_${entityId}/${fileName}`;
    }
    
    return await this.provider!.fileExists(filePath);
  }

  /**
   * List files in an entity folder
   */
  async listEntityFiles(entityType: EntityType, entityId: string, fieldName?: string): Promise<FileInfo[]> {
    this.ensureInitialized();
    
    let folderPath: string;
    if (fieldName === 'versions') {
      folderPath = `${entityType}_${entityId}/${fieldName}`;
    } else {
      folderPath = `${entityType}_${entityId}`;
    }
    
    const contents = await this.provider!.listFolder(folderPath);
    return contents.filter(item => 'mimeType' in item) as FileInfo[];
  }

  /**
   * Get current storage configuration
   */
  getConfig(): StorageConfig | null {
    return this.config;
  }

  /**
   * Check if storage manager is initialized
   */
  isInitialized(): boolean {
    return this.provider !== null && this.config !== null;
  }

  /**
   * Generate entity folder name based on type and ID
   */
  static generateEntityFolderName(entityType: EntityType, entityId: string): string {
    return `${entityType}_${entityId}`;
  }

  /**
   * Parse entity folder name to extract type and ID
   */
  static parseEntityFolderName(folderName: string): { entityType: EntityType; entityId: string } | null {
    const parts = folderName.split('_');
    if (parts.length < 2) return null;

    const entityType = parts[0] as EntityType;
    const entityId = parts.slice(1).join('_');

    // Validate entity type
    const validTypes: EntityType[] = ['shot', 'asset', 'task', 'member', 'user'];
    if (!validTypes.includes(entityType)) return null;

    return { entityType, entityId };
  }

  /**
   * Build proxy file name based on entity ID and original filename
   */
  static buildProxyFileName(entityId: string, originalFileName: string, take?: string, version?: number): string {
    const parts = originalFileName.split('.');
    const extension = parts.length > 1 ? parts.pop() : 'mp4';
    let proxyName = `${entityId}`;
    
    if (take) {
      proxyName += `_${take}`;
    }
    
    if (version !== undefined) {
      proxyName += `_v${version.toString().padStart(2, '0')}`;
    }
    
    proxyName += `_proxy.${extension}`;
    
    return proxyName;
  }

  /**
   * Parse proxy file name to extract entity ID, take, and version
   */
  static parseProxyFileName(fileName: string): {
    entityId: string;
    take?: string;
    version?: number;
    extension: string;
  } | null {
    // Must end with _proxy.ext to be valid
    if (!fileName.includes('_proxy.')) return null;

    // Split by _proxy. to separate the main part from extension
    const parts = fileName.split('_proxy.');
    if (parts.length !== 2) return null;

    const mainPart = parts[0];
    const extension = parts[1];

    // Now parse the main part for entityId, take, and version
    // Pattern: entityId[_take][_vNN]
    
    // First check for version pattern _vNN at the end
    const versionMatch = mainPart.match(/^(.+)_v(\d+)$/);
    let basePartWithoutVersion: string;
    let version: number | undefined;

    if (versionMatch) {
      basePartWithoutVersion = versionMatch[1];
      version = parseInt(versionMatch[2], 10);
    } else {
      basePartWithoutVersion = mainPart;
      version = undefined;
    }

    // Now check if there's a take (anything after the last underscore that's not part of a compound entityId)
    // For simplicity, we'll assume entityId doesn't contain underscores unless it's a compound ID
    // We need to be smart about this - if the remaining part looks like a standard entity pattern, keep it as entityId
    
    // Split the base part and check the last segment
    const segments = basePartWithoutVersion.split('_');
    
    if (segments.length === 1) {
      // Just entityId, no take
      return {
        entityId: segments[0],
        extension
      };
    }

    // For compound IDs like "shot_001", we need to determine where entityId ends and take begins
    // Heuristic: if it looks like a standard entity pattern (type_id), treat it as entityId
    // Otherwise, assume the last part is a take
    
    if (segments.length === 2) {
      // Could be "shot_001" (entityId) or "entityId_take"
      // Check if first part is a valid entity type
      const validTypes = ['shot', 'asset', 'task', 'member', 'user'];
      if (validTypes.includes(segments[0])) {
        // This is likely "shot_001" format
        return {
          entityId: basePartWithoutVersion,
          version,
          extension
        };
      } else {
        // This is likely "entityId_take" format
        return {
          entityId: segments[0],
          take: segments[1],
          version,
          extension
        };
      }
    }

    // For more complex cases, assume last segment is take unless it looks like part of ID
    const entityId = segments.slice(0, -1).join('_');
    const take = segments[segments.length - 1];

    return {
      entityId,
      take,
      version,
      extension
    };
  }

  /**
   * Ensure storage manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.provider || !this.config) {
      throw new Error('Storage manager not initialized. Call initialize() first.');
    }
  }
}

// Export singleton instance for global use
export const storageManager = new StorageManager();