import { google, drive_v3 } from 'googleapis';
import { IStorageProvider } from './IStorageProvider';
import { EntityType, FolderInfo, FileInfo, StorageConfig, EntityFolderStructure } from '../../../shared/types';

/**
 * Google Drive storage provider implementation
 */
export class GoogleDriveProvider implements IStorageProvider {
  private drive: drive_v3.Drive | null = null;
  private config: StorageConfig | null = null;
  private originalsRootId: string | null = null;
  private proxiesRootId: string | null = null;

  async initialize(config: StorageConfig): Promise<void> {
    this.config = config;
    
    // Initialize Google Drive API client
    const auth = new google.auth.GoogleAuth({
      credentials: config.credentials,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    this.drive = google.drive({ version: 'v3', auth });

    // Get or create root folders
    await this.ensureRootFolders();
  }

  async createEntityFolder(entityType: EntityType, entityId: string): Promise<EntityFolderStructure> {
    if (!this.drive || !this.config) {
      throw new Error('Storage provider not initialized');
    }

    const entityFolderName = `${entityType}_${entityId}`;
    
    // Create folder in ORIGINALS
    await this.createFolder(entityFolderName, this.originalsRootId!);
    
    // Create corresponding folder in PROXIES (flat structure)
    await this.createFolder(entityFolderName, this.proxiesRootId!);

    return {
      entityType,
      entityId,
      originalsPath: `ORIGINALS/${entityFolderName}`,
      proxiesPath: `PROXIES/${entityFolderName}`,
      originalsUrl: this.generateFolderUrl(`ORIGINALS/${entityFolderName}`, false),
      proxiesUrl: this.generateFolderUrl(`PROXIES/${entityFolderName}`, true)
    };
  }

  async createFolder(name: string, parentId?: string): Promise<FolderInfo> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const folderMetadata: drive_v3.Schema$File = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    };

    const response = await this.drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name, parents, webViewLink'
    });

    const folder = response.data;
    if (!folder.id || !folder.name) {
      throw new Error('Failed to create folder');
    }

    return {
      id: folder.id,
      name: folder.name,
      path: await this.getFolderPath(folder.id),
      url: folder.webViewLink || '',
      parentId: folder.parents?.[0]
    };
  }

  async moveToDeleted(entityType: EntityType, entityId: string, metadata?: any): Promise<void> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const entityFolderName = `${entityType}_${entityId}`;
    
    // Find the entity folder in ORIGINALS
    const originalsFolder = await this.findFolder(entityFolderName, this.originalsRootId!);
    if (originalsFolder) {
      // Create deleted folder if it doesn't exist
      const deletedFolder = await this.ensureDeletedFolder();
      
      // Move folder to deleted
      await this.drive.files.update({
        fileId: originalsFolder.id,
        addParents: deletedFolder.id,
        removeParents: this.originalsRootId!,
        fields: 'id, parents'
      });

      // Create info.txt with metadata
      if (metadata) {
        await this.createInfoFile(deletedFolder.id, entityFolderName, metadata);
      }
    }

    // Also move proxies folder
    const proxiesFolder = await this.findFolder(entityFolderName, this.proxiesRootId!);
    if (proxiesFolder) {
      await this.drive.files.delete({
        fileId: proxiesFolder.id
      });
    }
  }

  generateFileUrl(path: string, isProxy: boolean): string {
    const rootUrl = isProxy ? this.config!.proxiesRootUrl : this.config!.originalsRootUrl;
    return `${rootUrl}/${path}`;
  }

  generateFolderUrl(path: string, isProxy: boolean): string {
    const rootUrl = isProxy ? this.config!.proxiesRootUrl : this.config!.originalsRootUrl;
    return `${rootUrl}/${path}`;
  }

  async folderExists(path: string): Promise<boolean> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    try {
      const pathParts = path.split('/');
      let currentParentId = this.originalsRootId!;
      
      for (const part of pathParts) {
        if (part === 'ORIGINALS') continue;
        if (part === 'PROXIES') {
          currentParentId = this.proxiesRootId!;
          continue;
        }
        
        const folder = await this.findFolder(part, currentParentId);
        if (!folder) return false;
        currentParentId = folder.id;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  async listFolder(path: string): Promise<(FolderInfo | FileInfo)[]> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const folderId = await this.getFolderIdByPath(path);
    if (!folderId) {
      throw new Error(`Folder not found: ${path}`);
    }

    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents)'
    });

    const items: (FolderInfo | FileInfo)[] = [];
    
    for (const file of response.data.files || []) {
      if (!file.id || !file.name) continue;

      if (file.mimeType === 'application/vnd.google-apps.folder') {
        items.push({
          id: file.id,
          name: file.name,
          path: `${path}/${file.name}`,
          url: file.webViewLink || '',
          parentId: file.parents?.[0]
        });
      } else {
        items.push({
          id: file.id,
          name: file.name,
          size: parseInt(file.size || '0'),
          mimeType: file.mimeType || 'application/octet-stream',
          path: `${path}/${file.name}`,
          url: file.webViewLink || '',
          createdAt: new Date(file.createdTime || Date.now()),
          modifiedAt: new Date(file.modifiedTime || Date.now())
        });
      }
    }

    return items;
  }

  async getFolderInfo(path: string): Promise<FolderInfo> {
    const folderId = await this.getFolderIdByPath(path);
    if (!folderId) {
      throw new Error(`Folder not found: ${path}`);
    }

    const response = await this.drive!.files.get({
      fileId: folderId,
      fields: 'id, name, parents, webViewLink'
    });

    const folder = response.data;
    return {
      id: folder.id!,
      name: folder.name!,
      path,
      url: folder.webViewLink || '',
      parentId: folder.parents?.[0]
    };
  }

  async uploadFile(filePath: string, fileBuffer: Buffer, mimeType: string, originalName: string): Promise<FileInfo> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    // Parse the file path to determine parent folder
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop()!;
    const folderPath = pathParts.join('/');
    
    // Get or create the parent folder
    const parentFolderId = await this.ensureFolderPath(folderPath);
    
    // Upload the file
    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId]
      },
      media: {
        mimeType,
        body: fileBuffer
      },
      fields: 'id, name, size, mimeType, createdTime, modifiedTime, webViewLink'
    });

    const file = response.data;
    if (!file.id || !file.name) {
      throw new Error('Failed to upload file');
    }

    return {
      id: file.id,
      name: file.name,
      size: parseInt(file.size || '0'),
      mimeType: file.mimeType || mimeType,
      path: filePath,
      url: file.webViewLink || this.generateFileUrl(filePath, false),
      createdAt: new Date(file.createdTime || Date.now()),
      modifiedAt: new Date(file.modifiedTime || Date.now())
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const fileId = await this.getFileIdByPath(filePath);
    if (!fileId) {
      throw new Error(`File not found: ${filePath}`);
    }

    await this.drive.files.delete({
      fileId
    });
  }

  async getFileInfo(filePath: string): Promise<FileInfo> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const fileId = await this.getFileIdByPath(filePath);
    if (!fileId) {
      throw new Error(`File not found: ${filePath}`);
    }

    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, size, mimeType, createdTime, modifiedTime, webViewLink'
    });

    const file = response.data;
    return {
      id: file.id!,
      name: file.name!,
      size: parseInt(file.size || '0'),
      mimeType: file.mimeType || 'application/octet-stream',
      path: filePath,
      url: file.webViewLink || this.generateFileUrl(filePath, false),
      createdAt: new Date(file.createdTime || Date.now()),
      modifiedAt: new Date(file.modifiedTime || Date.now())
    };
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fileId = await this.getFileIdByPath(filePath);
      return fileId !== null;
    } catch {
      return false;
    }
  }

  getProviderType(): 'gdrive' | 'box' {
    return 'gdrive';
  }

  // Private helper methods
  private async ensureRootFolders(): Promise<void> {
    if (!this.drive) return;

    // Find or create ORIGINALS folder
    this.originalsRootId = await this.findOrCreateRootFolder('ORIGINALS');
    
    // Find or create PROXIES folder
    this.proxiesRootId = await this.findOrCreateRootFolder('PROXIES');
  }

  private async findOrCreateRootFolder(name: string): Promise<string> {
    if (!this.drive) throw new Error('Drive client not initialized');

    // Try to find existing folder
    const response = await this.drive.files.list({
      q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create new folder
    const folder = await this.createFolder(name);
    return folder.id;
  }

  private async findFolder(name: string, parentId: string): Promise<FolderInfo | null> {
    if (!this.drive) return null;

    const response = await this.drive.files.list({
      q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, parents, webViewLink)'
    });

    const files = response.data.files;
    if (!files || files.length === 0) return null;

    const file = files[0];
    return {
      id: file.id!,
      name: file.name!,
      path: await this.getFolderPath(file.id!),
      url: file.webViewLink || '',
      parentId: file.parents?.[0]
    };
  }

  private async ensureDeletedFolder(): Promise<FolderInfo> {
    const deletedFolder = await this.findFolder('deleted', this.originalsRootId!);
    if (deletedFolder) return deletedFolder;

    return await this.createFolder('deleted', this.originalsRootId!);
  }

  private async createInfoFile(parentId: string, entityName: string, metadata: any): Promise<void> {
    if (!this.drive) return;

    const infoContent = JSON.stringify({
      entityName,
      deletedAt: new Date().toISOString(),
      metadata
    }, null, 2);

    await this.drive.files.create({
      requestBody: {
        name: `${entityName}_info.txt`,
        parents: [parentId]
      },
      media: {
        mimeType: 'text/plain',
        body: infoContent
      }
    });
  }

  private async getFolderPath(folderId: string): Promise<string> {
    if (!this.drive) return '';

    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'name, parents'
      });

      const file = response.data;
      if (!file || !file.name) return '';
      
      if (!file.parents || file.parents.length === 0) {
        return file.name;
      }

      const parentPath = await this.getFolderPath(file.parents[0]);
      return parentPath ? `${parentPath}/${file.name}` : file.name;
    } catch (error) {
      console.warn(`Failed to get folder path for ${folderId}:`, error);
      return '';
    }
  }

  private async getFolderIdByPath(path: string): Promise<string | null> {
    const pathParts = path.split('/').filter(part => part.length > 0);
    let currentParentId = this.originalsRootId!;
    
    for (const part of pathParts) {
      if (part === 'ORIGINALS') continue;
      if (part === 'PROXIES') {
        currentParentId = this.proxiesRootId!;
        continue;
      }
      
      let folder = await this.findFolder(part, currentParentId);
      if (!folder) return null;
      currentParentId = folder.id;
    }
    
    return currentParentId;
  }

  private async ensureFolderPath(folderPath: string): Promise<string> {
    if (!folderPath) return this.originalsRootId!;
    
    const pathParts = folderPath.split('/').filter(part => part.length > 0);
    let currentParentId = this.originalsRootId!;
    
    for (const part of pathParts) {
      if (part === 'ORIGINALS') continue;
      if (part === 'PROXIES') {
        currentParentId = this.proxiesRootId!;
        continue;
      }
      
      let folder = await this.findFolder(part, currentParentId);
      if (!folder) {
        folder = await this.createFolder(part, currentParentId);
      }
      currentParentId = folder.id;
    }
    
    return currentParentId;
  }

  private async getFileIdByPath(filePath: string): Promise<string | null> {
    if (!this.drive) return null;

    const pathParts = filePath.split('/');
    const fileName = pathParts.pop()!;
    const folderPath = pathParts.join('/');
    
    const parentFolderId = await this.getFolderIdByPath(folderPath);
    if (!parentFolderId) return null;

    const response = await this.drive.files.list({
      q: `name='${fileName}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)'
    });

    const files = response.data.files;
    if (!files || files.length === 0) return null;

    return files[0].id!;
  }
}