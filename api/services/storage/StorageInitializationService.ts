import { storageManager } from './StorageManager';
import { StorageConfig } from '../../../shared/types';

/**
 * Storage Initialization Service - Handles storage provider initialization
 */
export class StorageInitializationService {
  private initialized: boolean = false;

  /**
   * Initialize storage with project configuration
   */
  async initializeStorage(config: StorageConfig): Promise<void> {
    if (this.initialized) {
      console.log('Storage already initialized, skipping...');
      return;
    }

    try {
      await storageManager.initialize(config);
      this.initialized = true;
      console.log(`Storage initialized with provider: ${config.provider}`);
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw new Error(`Storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize storage with default configuration for development
   */
  async initializeDefaultStorage(): Promise<void> {
    const defaultConfig: StorageConfig = {
      provider: 'gdrive',
      originalsRootUrl: process.env.ORIGINALS_ROOT_URL || 'https://drive.google.com/drive/folders/originals',
      proxiesRootUrl: process.env.PROXIES_ROOT_URL || 'https://drive.google.com/drive/folders/proxies',
      credentials: {
        // In production, these would come from environment variables or secure storage
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID || 'motk-development',
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || '',
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
        client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
      }
    };

    await this.initializeStorage(defaultConfig);
  }

  /**
   * Check if storage is initialized
   */
  isInitialized(): boolean {
    return this.initialized && storageManager.isInitialized();
  }

  /**
   * Get current storage configuration
   */
  getStorageConfig(): StorageConfig | null {
    return storageManager.getConfig();
  }

  /**
   * Reset initialization status (for testing)
   */
  reset(): void {
    this.initialized = false;
  }
}

// Export singleton instance
export const storageInitializationService = new StorageInitializationService();