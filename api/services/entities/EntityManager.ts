import { 
  EntityType, 
  ENTITY_KIND,
  EntityData, 
  Shot, 
  Asset, 
  Task, 
  ProjectMember, 
  User,
  EntityQueryParams,
  EntityOperationResult,
  EntityListResult,
  ConflictData,
  CellUpdateParams
} from '../../../shared/types';
import { SheetsApiClient } from '../sheets/SheetsApiClient';
import { StorageManager } from '../storage/StorageManager';

/**
 * EntityManager handles CRUD operations for all entity types
 * Manages foreign key relationships and provides querying capabilities
 */
export class EntityManager {
  private sheetsClient: SheetsApiClient;
  private storageManager: StorageManager;

  constructor(sheetsClient: SheetsApiClient, storageManager: StorageManager) {
    this.sheetsClient = sheetsClient;
    this.storageManager = storageManager;
  }

  /**
   * Create a new entity
   */
  async createEntity<T extends EntityData>(
    entityType: EntityType, 
    data: Partial<T>
  ): Promise<EntityOperationResult<T>> {
    try {
      // Generate ID if not provided
      const entityId = this.generateEntityId(entityType, data);
      const completeData = { ...data, [this.getIdField(entityType)]: entityId } as unknown as T;

      // Validate entity data
      const validationResult = this.validateEntityData(entityType, completeData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Convert entity to sheet row
      const sheetName = this.getSheetName(entityType);
      const rowData = this.entityToRowData(entityType, completeData);

      // Append to sheet
      const appendResult = await this.sheetsClient.appendRows(sheetName, [rowData]);
      
      if (!appendResult.success) {
        return {
          success: false,
          error: 'Failed to create entity'
        };
      }

      // Create storage folder if needed
      if (this.entityNeedsStorage(entityType)) {
        await this.storageManager.createEntityFolder(entityType, entityId);
      }

      return {
        success: true,
        data: completeData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Read entity by ID
   */
  async getEntity<T extends EntityData>(
    entityType: EntityType, 
    entityId: string
  ): Promise<EntityOperationResult<T>> {
    try {
      const sheetName = this.getSheetName(entityType);
      const sheetData = await this.sheetsClient.getSheetData(sheetName);
      
      if (!sheetData.values || sheetData.values.length === 0) {
        return {
          success: false,
          error: 'Entity not found'
        };
      }

      const headers = sheetData.values[0];
      const idField = this.getIdField(entityType);
      const idColumnIndex = headers.indexOf(idField);
      
      if (idColumnIndex === -1) {
        return {
          success: false,
          error: `ID field ${idField} not found in sheet`
        };
      }

      // Find entity row
      const entityRow = sheetData.values.slice(1).find(row => row[idColumnIndex] === entityId);
      
      if (!entityRow) {
        return {
          success: false,
          error: 'Entity not found'
        };
      }

      const entity = this.rowDataToEntity<T>(entityType, headers, entityRow);
      
      return {
        success: true,
        data: entity
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update entity
   */
  async updateEntity<T extends EntityData>(
    entityType: EntityType,
    entityId: string,
    updates: Partial<T>,
    force: boolean = false
  ): Promise<EntityOperationResult<T>> {
    try {
      // Get current entity data
      const currentResult = await this.getEntity<T>(entityType, entityId);
      if (!currentResult.success || !currentResult.data) {
        return {
          success: false,
          error: 'Entity not found'
        };
      }

      const currentData = currentResult.data;
      const updatedData = { ...currentData, ...updates } as T;

      // Validate updated data
      const validationResult = this.validateEntityData(entityType, updatedData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Update individual fields
      const sheetName = this.getSheetName(entityType);
      const conflicts: ConflictData[] = [];
      
      for (const [fieldId, newValue] of Object.entries(updates)) {
        const originalValue = (currentData as any)[fieldId];
        
        const updateParams: CellUpdateParams = {
          sheetName,
          entityId,
          fieldId,
          originalValue,
          newValue,
          force
        };

        const updateResult = await this.sheetsClient.updateCell(updateParams);
        
        if (!updateResult.success) {
          if (updateResult.conflict) {
            conflicts.push({
              originalValue,
              currentValue: updateResult.currentValue,
              newValue,
              fieldId,
              entityId
            });
          } else {
            return {
              success: false,
              error: 'Failed to update entity'
            };
          }
        }
      }

      if (conflicts.length > 0 && !force) {
        return {
          success: false,
          error: 'Update conflicts detected',
          conflicts
        };
      }

      return {
        success: true,
        data: updatedData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete entity
   */
  async deleteEntity(entityType: EntityType, entityId: string): Promise<EntityOperationResult<void>> {
    try {
      // Check if entity exists and get its data
      const entityResult = await this.getEntity(entityType, entityId);
      if (!entityResult.success) {
        return {
          success: false,
          error: 'Entity not found'
        };
      }

      // Check foreign key constraints
      const constraintViolations = await this.checkForeignKeyConstraints(entityType, entityId);
      if (constraintViolations.length > 0) {
        return {
          success: false,
          error: `Cannot delete entity: ${constraintViolations.join(', ')}`
        };
      }

      // Move storage folder to deleted if entity has storage
      if (this.entityNeedsStorage(entityType)) {
        await this.storageManager.moveToDeleted(entityType, entityId);
      }

      // Delete from sheet (mark as deleted or remove row)
      const sheetName = this.getSheetName(entityType);
      const sheetData = await this.sheetsClient.getSheetData(sheetName);
      
      if (sheetData.values && sheetData.values.length > 0) {
        const headers = sheetData.values[0];
        const idField = this.getIdField(entityType);
        const idColumnIndex = headers.indexOf(idField);
        
        if (idColumnIndex !== -1) {
          const rowIndex = sheetData.values.slice(1).findIndex(row => row[idColumnIndex] === entityId);
          if (rowIndex !== -1) {
            // Delete the row (rowIndex + 2 because of 0-based index + header row)
            await this.sheetsClient.deleteRow(sheetName, rowIndex + 2);
          }
        }
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Query entities with filtering and sorting
   */
  async queryEntities<T extends EntityData>(
    params: EntityQueryParams
  ): Promise<EntityListResult<T>> {
    try {
      const sheetName = this.getSheetName(params.entityType);
      const sheetData = await this.sheetsClient.getSheetData(sheetName);
      
      if (!sheetData.values || sheetData.values.length === 0) {
        return {
          success: true,
          data: [],
          total: 0,
          offset: params.offset || 0,
          limit: params.limit || 100
        };
      }

      const headers = sheetData.values[0];
      let entities = sheetData.values.slice(1).map(row => 
        this.rowDataToEntity<T>(params.entityType, headers, row)
      );

      // Apply filters
      if (params.filters) {
        entities = entities.filter(entity => {
          return Object.entries(params.filters!).every(([field, value]) => {
            const entityValue = (entity as any)[field];
            if (Array.isArray(value)) {
              return value.includes(entityValue);
            }
            return entityValue === value;
          });
        });
      }

      // Apply sorting
      if (params.sort) {
        entities.sort((a, b) => {
          const aValue = (a as any)[params.sort!.field];
          const bValue = (b as any)[params.sort!.field];
          
          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;
          
          return params.sort!.direction === 'desc' ? -comparison : comparison;
        });
      }

      const total = entities.length;
      const offset = params.offset || 0;
      const limit = params.limit || 100;
      
      // Apply pagination
      const paginatedEntities = entities.slice(offset, offset + limit);

      return {
        success: true,
        data: paginatedEntities,
        total,
        offset,
        limit
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        total: 0,
        offset: params.offset || 0,
        limit: params.limit || 100,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Link entities (manage foreign key relationships)
   */
  async linkEntities(
    sourceEntityType: EntityType,
    sourceEntityId: string,
    targetEntityType: EntityType,
    targetEntityId: string,
    linkField: string
  ): Promise<EntityOperationResult<void>> {
    try {
      // Verify target entity exists
      const targetResult = await this.getEntity(targetEntityType, targetEntityId);
      if (!targetResult.success) {
        return {
          success: false,
          error: 'Target entity not found'
        };
      }

      // Update source entity with link
      const updateResult = await this.updateEntity(
        sourceEntityType,
        sourceEntityId,
        { [linkField]: targetEntityId } as any
      );

      return {
        success: updateResult.success,
        error: updateResult.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Private helper methods

  private generateEntityId(entityType: EntityType, data: Partial<EntityData>): string {
    const idField = this.getIdField(entityType);
    if ((data as any)[idField]) {
      return (data as any)[idField];
    }
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${entityType}_${timestamp}_${random}`;
  }

  private getIdField(entityType: EntityType): string {
    const idFields = {
      [ENTITY_KIND.SHOT]: 'shot_id',
      [ENTITY_KIND.ASSET]: 'asset_id',
      [ENTITY_KIND.TASK]: 'task_id',
      [ENTITY_KIND.MEMBER]: 'member_id',
      [ENTITY_KIND.USER]: 'user_id'
    };
    return idFields[entityType];
  }

  private getSheetName(entityType: EntityType): string {
    const sheetNames = {
      [ENTITY_KIND.SHOT]: 'Shots',
      [ENTITY_KIND.ASSET]: 'Assets',
      [ENTITY_KIND.TASK]: 'Tasks',
      [ENTITY_KIND.MEMBER]: 'ProjectMembers',
      [ENTITY_KIND.USER]: 'Users'
    };
    return sheetNames[entityType];
  }

  private entityNeedsStorage(entityType: EntityType): boolean {
    return entityType === ENTITY_KIND.SHOT || 
           entityType === ENTITY_KIND.ASSET || 
           entityType === ENTITY_KIND.TASK;
  }

  private validateEntityData(entityType: EntityType, data: EntityData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation based on entity type
    switch (entityType) {
      case ENTITY_KIND.SHOT:
        const shot = data as Shot;
        if (!shot.shot_id) errors.push('shot_id is required');
        if (!shot.title) errors.push('title is required');
        break;
        
      case ENTITY_KIND.ASSET:
        const asset = data as Asset;
        if (!asset.asset_id) errors.push('asset_id is required');
        if (!asset.name) errors.push('name is required');
        break;
        
      case ENTITY_KIND.TASK:
        const task = data as Task;
        if (!task.task_id) errors.push('task_id is required');
        if (!task.name) errors.push('name is required');
        break;
        
      case ENTITY_KIND.MEMBER:
        const member = data as ProjectMember;
        if (!member.member_id) errors.push('member_id is required');
        if (!member.user_id) errors.push('user_id is required');
        break;
        
      case ENTITY_KIND.USER:
        const user = data as User;
        if (!user.user_id) errors.push('user_id is required');
        if (!user.email) errors.push('email is required');
        if (!user.name) errors.push('name is required');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private entityToRowData(entityType: EntityType, entity: EntityData): any[] {
    // Get sheet headers to determine column order
    const headers = this.getEntityHeaders(entityType);
    return headers.map(header => (entity as any)[header] || '');
  }

  private rowDataToEntity<T extends EntityData>(
    entityType: EntityType, 
    headers: string[], 
    row: any[]
  ): T {
    const entity: any = {};
    headers.forEach((header, index) => {
      let value = row[index] || null;
      
      // Type conversion based on field type
      if (header.includes('date') && value) {
        value = new Date(value);
      } else if (header === 'priority' && value) {
        value = parseInt(value, 10);
      } else if (header === 'overlap_sensitive' || header === 'active') {
        value = value === 'true' || value === true;
      } else if (header.includes('thumbnails') || header.includes('file_list')) {
        value = value ? JSON.parse(value) : [];
      } else if (header === 'versions') {
        value = value ? JSON.parse(value) : { latest: null, versions: [] };
      }
      
      entity[header] = value;
    });
    
    return entity as T;
  }

  private getEntityHeaders(entityType: EntityType): string[] {
    const headers = {
      [ENTITY_KIND.SHOT]: [
        'shot_id', 'episode', 'scene', 'title', 'status', 'priority', 
        'due_date', 'timecode_fps', 'folder_label', 'folder_url', 
        'thumbnails', 'file_list', 'versions', 'notes'
      ],
      [ENTITY_KIND.ASSET]: [
        'asset_id', 'name', 'asset_type', 'status', 'overlap_sensitive',
        'folder_label', 'folder_url', 'thumbnails', 'file_list', 'versions', 'notes'
      ],
      [ENTITY_KIND.TASK]: [
        'task_id', 'name', 'status', 'assignee_id', 'start_date', 
        'end_date', 'shot_id', 'folder_label', 'folder_url', 'notes'
      ],
      [ENTITY_KIND.MEMBER]: [
        'member_id', 'user_id', 'role', 'department', 'permissions', 
        'joined_date', 'active'
      ],
      [ENTITY_KIND.USER]: [
        'user_id', 'email', 'name', 'google_id', 'avatar_url', 
        'created_date', 'last_login'
      ]
    };
    return headers[entityType];
  }

  private async checkForeignKeyConstraints(entityType: EntityType, entityId: string): Promise<string[]> {
    const violations: string[] = [];
    
    try {
      // Check if entity is referenced by other entities
      switch (entityType) {
        case ENTITY_KIND.USER:
          // Check if user is referenced in ProjectMembers
          const memberQuery = await this.queryEntities({
            entityType: ENTITY_KIND.MEMBER,
            filters: { user_id: entityId }
          });
          if (memberQuery.data.length > 0) {
            violations.push('User is referenced by project members');
          }
          break;
          
        case ENTITY_KIND.SHOT:
          // Check if shot is referenced in Tasks
          const taskQuery = await this.queryEntities({
            entityType: ENTITY_KIND.TASK,
            filters: { shot_id: entityId }
          });
          if (taskQuery.data.length > 0) {
            violations.push('Shot is referenced by tasks');
          }
          break;
          
        case ENTITY_KIND.MEMBER:
          // Check if member is referenced in Tasks as assignee
          const assignedTaskQuery = await this.queryEntities({
            entityType: ENTITY_KIND.TASK,
            filters: { assignee_id: entityId }
          });
          if (assignedTaskQuery.data.length > 0) {
            violations.push('Member is assigned to tasks');
          }
          break;
      }
    } catch (error) {
      // If we can't check constraints, allow deletion but log warning
      console.warn('Could not check foreign key constraints:', error);
    }
    
    return violations;
  }
}