import axios from 'axios';
import { PageConfig, PageConfigData, PageType, EntityType } from '@shared/types';

/**
 * Service for managing page configurations
 * Handles saving, loading, and sharing page layouts
 */
export class PageConfigService {
  /**
   * Get all page configurations
   */
  async getAllPageConfigs(): Promise<PageConfig[]> {
    try {
      const response = await axios.get('/api/pages');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching page configurations:', error);
      throw error;
    }
  }

  /**
   * Get page configurations by entity type
   */
  async getPageConfigsByEntity(entityType: EntityType): Promise<PageConfig[]> {
    try {
      const response = await axios.get(`/api/pages?entity=${entityType}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching page configurations for entity ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific page configuration by ID
   */
  async getPageConfig(pageId: string): Promise<PageConfig> {
    try {
      const response = await axios.get(`/api/pages/${pageId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching page configuration ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new page configuration
   */
  async createPageConfig(pageConfig: Omit<PageConfig, 'page_id' | 'created_date' | 'modified_date'>): Promise<PageConfig> {
    try {
      const response = await axios.post('/api/pages', pageConfig);
      return response.data.data;
    } catch (error) {
      console.error('Error creating page configuration:', error);
      throw error;
    }
  }

  /**
   * Update an existing page configuration
   */
  async updatePageConfig(pageId: string, updates: Partial<PageConfig>): Promise<PageConfig> {
    try {
      const response = await axios.put(`/api/pages/${pageId}`, updates);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating page configuration ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a page configuration
   */
  async deletePageConfig(pageId: string): Promise<void> {
    try {
      await axios.delete(`/api/pages/${pageId}`);
    } catch (error) {
      console.error(`Error deleting page configuration ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Share a page configuration with team
   */
  async sharePageConfig(pageId: string, shared: boolean): Promise<PageConfig> {
    try {
      const response = await axios.put(`/api/pages/${pageId}/share`, { shared });
      return response.data.data;
    } catch (error) {
      console.error(`Error sharing page configuration ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Get default page configuration for an entity type
   */
  getDefaultPageConfig(entityType: EntityType, name: string = `Default ${entityType} view`): PageConfigData {
    // Default configurations based on entity type
    switch (entityType) {
      case 'shot':
        return {
          entity: entityType,
          fields: ['shot_id', 'title', 'status', 'priority', 'due_date'],
          fieldWidths: { shot_id: 100, title: 200, status: 120, priority: 80, due_date: 120 },
          filters: {},
          sorting: { field: 'priority', direction: 'desc' }
        };
      case 'asset':
        return {
          entity: entityType,
          fields: ['asset_id', 'name', 'asset_type', 'status'],
          fieldWidths: { asset_id: 100, name: 200, asset_type: 120, status: 120 },
          filters: {},
          sorting: { field: 'name', direction: 'asc' }
        };
      case 'task':
        return {
          entity: entityType,
          fields: ['task_id', 'name', 'status', 'assignee_id', 'start_date', 'end_date'],
          fieldWidths: { task_id: 100, name: 200, status: 120, assignee_id: 120, start_date: 120, end_date: 120 },
          filters: {},
          sorting: { field: 'start_date', direction: 'asc' }
        };
      case 'member':
        return {
          entity: entityType,
          fields: ['member_id', 'role', 'department', 'permissions', 'active'],
          fieldWidths: { member_id: 100, role: 150, department: 150, permissions: 120, active: 80 },
          filters: { active: true },
          sorting: { field: 'role', direction: 'asc' }
        };
      case 'user':
        return {
          entity: entityType,
          fields: ['user_id', 'name', 'email', 'last_login'],
          fieldWidths: { user_id: 100, name: 200, email: 200, last_login: 150 },
          filters: {},
          sorting: { field: 'name', direction: 'asc' }
        };
      default:
        return {
          entity: entityType,
          fields: [],
          fieldWidths: {},
          filters: {},
          sorting: { field: 'id', direction: 'asc' }
        };
    }
  }
}

export const pageConfigService = new PageConfigService();
export default pageConfigService;