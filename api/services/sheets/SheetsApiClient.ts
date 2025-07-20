import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import {
  ISheetsApiClient,
  SheetData,
  CellUpdateParams,
  UpdateResult,
  BatchUpdateParams,
  BatchResult,
  ProjectConfig,
  ProjectMeta
} from './ISheetsApiClient';

/**
 * Google Sheets API client implementation
 * Supports both service account and API key authentication with enhanced error handling
 */
export class SheetsApiClient implements ISheetsApiClient {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000; // Base delay in milliseconds

  constructor(spreadsheetId?: string, apiKey?: string, serviceAccountPath?: string) {
    this.spreadsheetId = spreadsheetId || process.env.GOOGLE_SHEETS_ID || '';
    
    if (serviceAccountPath) {
      // Use service account for production (free tier)
      const auth = new GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      this.sheets = google.sheets({ version: 'v4', auth: auth as any });
    } else {
      // Use API key for development (free tier)
      const auth = apiKey || process.env.GOOGLE_SHEETS_API_KEY || '';
      this.sheets = google.sheets({ version: 'v4', auth });
    }
  }

  /**
   * Initialize project with 9 standardized sheets
   * @deprecated Use SheetInitializationService.initSheets() instead for full functionality
   */
  async initializeProject(projectConfig: ProjectConfig): Promise<ProjectMeta> {
    // Import here to avoid circular dependency
    const { SheetInitializationService } = await import('./SheetInitializationService');
    const initService = new SheetInitializationService(this);
    return initService.initSheets(projectConfig);
  }

  /**
   * Get data from a sheet with retry logic
   */
  async getSheetData(sheetName: string, range?: string): Promise<SheetData> {
    return this.executeWithRetry(async () => {
      const fullRange = range ? `${sheetName}!${range}` : sheetName;
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: fullRange,
        majorDimension: 'ROWS'
      });

      return {
        values: response.data.values || [],
        range: response.data.range || fullRange,
        majorDimension: 'ROWS'
      };
    }, `getting sheet data for ${sheetName}`);
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === this.retryAttempts) {
          console.error(`Failed ${operationName} after ${attempt} attempts:`, lastError);
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`Attempt ${attempt} failed for ${operationName}, retrying in ${delay}ms:`, lastError.message);
        
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable (network issues, rate limits, etc.)
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'rate limit',
      'quota exceeded',
      'timeout',
      'network',
      'connection',
      'econnreset',
      'enotfound',
      'etimedout',
      'socket hang up',
      'internal error',
      'service unavailable',
      'bad gateway',
      'gateway timeout'
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate connection to Google Sheets API
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.getSheetNames();
      return true;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Update a single cell with conflict detection
   */
  async updateCell(params: CellUpdateParams): Promise<UpdateResult> {
    return this.executeWithRetry(async () => {
      // First, get current value for conflict detection
      const currentData = await this.getSheetData(params.sheetName);
      const currentValue = this.findCellValue(currentData, params.entityId, params.fieldId);

      // Check for conflicts unless force is true
      if (!params.force && currentValue !== params.originalValue) {
        return {
          success: false,
          conflict: true,
          currentValue: currentValue
        };
      }

      // Find the cell position and update
      const cellRange = this.findCellRange(currentData, params.entityId, params.fieldId);
      if (!cellRange) {
        throw new Error(`Cell not found for entity ${params.entityId}, field ${params.fieldId}`);
      }

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${params.sheetName}!${cellRange}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[params.newValue]]
        }
      });

      return {
        success: true,
        updatedRange: response.data.updatedRange || undefined,
        updatedRows: response.data.updatedRows || undefined,
        conflict: false
      };
    }, `updating cell for entity ${params.entityId}, field ${params.fieldId}`);
  }

  /**
   * Perform batch updates
   */
  async batchUpdate(params: BatchUpdateParams): Promise<BatchResult> {
    const results: UpdateResult[] = [];
    const conflicts: CellUpdateParams[] = [];
    let totalUpdated = 0;

    for (const update of params.updates) {
      try {
        const result = await this.updateCell(update);
        results.push(result);
        
        if (result.conflict) {
          conflicts.push(update);
        } else if (result.success) {
          totalUpdated++;
        }
      } catch (error) {
        results.push({
          success: false,
          conflict: false
        });
      }
    }

    return {
      success: conflicts.length === 0,
      results,
      totalUpdated,
      conflicts
    };
  }

  /**
   * Create a new sheet with retry logic
   */
  async createSheet(sheetName: string, headers: string[]): Promise<boolean>;
  async createSheet(config: { name: string; headers: string[] }): Promise<{ success: boolean; error?: string }>;
  async createSheet(
    sheetNameOrConfig: string | { name: string; headers: string[] }, 
    headers?: string[]
  ): Promise<boolean | { success: boolean; error?: string }> {
    // Handle overloaded signatures
    const isConfigObject = typeof sheetNameOrConfig === 'object';
    const sheetName = isConfigObject ? sheetNameOrConfig.name : sheetNameOrConfig;
    const sheetHeaders = isConfigObject ? sheetNameOrConfig.headers : (headers || []);

    try {
      const result = await this.executeWithRetry(async () => {
        // Check if sheet already exists
        const existingSheets = await this.getSheetNames();
        if (existingSheets.includes(sheetName)) {
          console.log(`Sheet ${sheetName} already exists`);
          return true;
        }

        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });

        // Add headers
        if (sheetHeaders.length > 0) {
          await this.appendRows(sheetName, [sheetHeaders]);
        }

        return true;
      }, `creating sheet ${sheetName}`);

      return isConfigObject ? { success: result } : result;
    } catch (error) {
      console.error(`Error creating sheet ${sheetName}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return isConfigObject ? { success: false, error: errorMessage } : false;
    }
  }

  /**
   * Get all sheet names with retry logic
   */
  async getSheetNames(): Promise<string[]> {
    return this.executeWithRetry(async () => {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return response.data.sheets?.map((sheet: any) => sheet.properties.title) || [];
    }, 'getting sheet names');
  }

  /**
   * Clear sheet data (keeping headers)
   */
  async clearSheet(sheetName: string): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:Z1000`
      });

      return true;

    } catch (error) {
      console.error(`Error clearing sheet ${sheetName}:`, error);
      return false;
    }
  }

  /**
   * Append rows to a sheet
   */
  async appendRows(sheetName: string, values: any[][]): Promise<UpdateResult> {
    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values
        }
      });

      return {
        success: true,
        updatedRange: response.data.updates?.updatedRange || undefined,
        updatedRows: response.data.updates?.updatedRows || undefined
      };

    } catch (error) {
      console.error(`Error appending rows to ${sheetName}:`, error);
      throw new Error(`Failed to append rows: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get headers for each sheet type
   */
  private getSheetHeaders(sheetName: string): string[] {
    const headers: { [key: string]: string[] } = {
      'Shots': [
        'shot_id', 'episode', 'scene', 'title', 'status', 'priority', 
        'due_date', 'timecode_fps', 'folder_label', 'folder_url', 
        'thumbnails', 'file_list', 'versions', 'notes'
      ],
      'Assets': [
        'asset_id', 'name', 'asset_type', 'status', 'overlap_sensitive',
        'folder_label', 'folder_url', 'thumbnails', 'file_list', 'versions', 'notes'
      ],
      'Tasks': [
        'task_id', 'name', 'status', 'assignee_id', 'start_date', 
        'end_date', 'shot_id', 'folder_label', 'folder_url', 'notes'
      ],
      'ProjectMembers': [
        'member_id', 'user_id', 'role', 'department', 'permissions', 
        'joined_date', 'active'
      ],
      'Users': [
        'user_id', 'email', 'name', 'google_id', 'avatar_url', 
        'created_date', 'last_login'
      ],
      'Pages': [
        'page_id', 'name', 'type', 'config', 'shared', 'created_by', 
        'created_date', 'modified_date'
      ],
      'Fields': [
        'field_id', 'entity', 'field_name', 'type', 'editable', 
        'required', 'options'
      ],
      'project_meta': [
        'project_id', 'storage_provider', 'originals_root_url', 
        'proxies_root_url', 'created_at'
      ],
      'Logs': [
        'log_id', 'timestamp', 'user_id', 'action', 'entity_type', 
        'entity_id', 'changes', 'ip_address'
      ]
    };

    return headers[sheetName] || [];
  }

  /**
   * Find cell value by entity and field IDs
   */
  private findCellValue(data: SheetData, entityId: string, fieldId: string): any {
    // Implementation depends on your data structure
    // This is a simplified version - you'll need to adapt based on your sheet layout
    const headers = data.values[0] || [];
    const fieldIndex = headers.indexOf(fieldId);
    
    if (fieldIndex === -1) return null;

    // Find row by entity ID (assuming first column contains entity IDs)
    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i][0] === entityId) {
        return data.values[i][fieldIndex];
      }
    }

    return null;
  }

  /**
   * Find cell range (A1 notation) by entity and field IDs
   */
  private findCellRange(data: SheetData, entityId: string, fieldId: string): string | null {
    const headers = data.values[0] || [];
    const fieldIndex = headers.indexOf(fieldId);
    
    if (fieldIndex === -1) return null;

    // Find row by entity ID
    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i][0] === entityId) {
        const column = this.columnIndexToLetter(fieldIndex);
        const row = i + 1; // 1-based indexing
        return `${column}${row}`;
      }
    }

    return null;
  }

  /**
   * Convert column index to Excel-style letter notation (A, B, C, ..., AA, AB, etc.)
   */
  private columnIndexToLetter(index: number): string {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  }

  /**
   * Get spreadsheet metadata including title and sheet count
   */
  async getSpreadsheetInfo(): Promise<{ title: string; sheetCount: number; sheets: string[] }> {
    return this.executeWithRetry(async () => {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheets = response.data.sheets?.map((sheet: any) => sheet.properties.title) || [];
      
      return {
        title: response.data.properties?.title || 'Unknown',
        sheetCount: sheets.length,
        sheets: sheets
      };
    }, 'getting spreadsheet info');
  }

  /**
   * Check if a specific sheet exists
   */
  async sheetExists(sheetName: string): Promise<boolean> {
    try {
      const sheets = await this.getSheetNames();
      return sheets.includes(sheetName);
    } catch (error) {
      console.error(`Error checking if sheet ${sheetName} exists:`, error);
      return false;
    }
  }

  /**
   * Get row count for a specific sheet
   */
  async getRowCount(sheetName: string): Promise<number> {
    try {
      const data = await this.getSheetData(sheetName);
      return data.values.length;
    } catch (error) {
      console.error(`Error getting row count for ${sheetName}:`, error);
      return 0;
    }
  }

  /**
   * Batch create multiple sheets at once
   */
  async createMultipleSheets(sheetConfigs: Array<{ name: string; headers: string[] }>): Promise<{ created: string[]; failed: string[] }> {
    const created: string[] = [];
    const failed: string[] = [];

    for (const config of sheetConfigs) {
      try {
        const success = await this.createSheet(config.name, config.headers);
        if (success) {
          created.push(config.name);
        } else {
          failed.push(config.name);
        }
      } catch (error) {
        console.error(`Failed to create sheet ${config.name}:`, error);
        failed.push(config.name);
      }
    }

    return { created, failed };
  }

  /**
   * Delete a row from a sheet
   */
  async deleteRow(sheetName: string, rowIndex: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Get sheet ID first
      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheet = sheetsResponse.data.sheets?.find(s => s.properties?.title === sheetName);
      if (!sheet || !sheet.properties) {
        return {
          success: false,
          error: `Sheet ${sheetName} not found`
        };
      }

      const sheetId = await sheetsClient.createSpreadsheetForProject(projectName);
      await redis.hset(`project:${sheetId}`, { sheetId, name, owner: userId });


      // Delete the row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // Convert to 0-based index
                endIndex: rowIndex
              }
            }
          }]
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting row:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Clear a range of cells in a sheet
   */
  async clearRange(range: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: range
      });

      return { success: true };
    } catch (error) {
      console.error('Error clearing range:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update a specific row in a sheet
   */
  async updateRow(sheetName: string, rowIndex: number, values: any[]): Promise<UpdateResult> {
    try {
      const range = `${sheetName}!${rowIndex}:${rowIndex}`;
      
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values]
        }
      });

      return {
        success: true,
        updatedRange: response.data.updatedRange || undefined,
        updatedRows: response.data.updatedRows || 0
      };
    } catch (error) {
      console.error('Error updating row:', error);
      return {
        success: false,
        conflict: false
      };
    }
  }

}