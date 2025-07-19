/**
 * Interface for Google Sheets API client operations
 * Designed to work with both Express.js and Google Cloud Functions
 */

export interface SheetData {
  values: any[][];
  range: string;
  majorDimension: 'ROWS' | 'COLUMNS';
}

export interface CellUpdateParams {
  sheetName: string;
  entityId: string;
  fieldId: string;
  originalValue: any;
  newValue: any;
  force?: boolean;
}

export interface UpdateResult {
  success: boolean;
  updatedRange?: string;
  updatedRows?: number;
  conflict?: boolean;
  currentValue?: any;
}

export interface BatchUpdateParams {
  updates: CellUpdateParams[];
}

export interface BatchResult {
  success: boolean;
  results: UpdateResult[];
  totalUpdated: number;
  conflicts: CellUpdateParams[];
}

export interface ProjectConfig {
  project_id: string;
  storage_provider: 'gdrive' | 'box';
  originals_root_url: string;
  proxies_root_url: string;
  created_at: Date;
}

export interface ProjectMeta {
  project_id: string;
  sheets_created: string[];
  storage_configured: boolean;
  created_at: Date;
}

/**
 * Main interface for Google Sheets API operations
 */
export interface ISheetsApiClient {
  /**
   * Initialize a new project with standardized sheet structure
   */
  initializeProject(projectConfig: ProjectConfig): Promise<ProjectMeta>;

  /**
   * Get data from a specific sheet and range
   */
  getSheetData(sheetName: string, range?: string): Promise<SheetData>;

  /**
   * Update a single cell with conflict detection
   */
  updateCell(params: CellUpdateParams): Promise<UpdateResult>;

  /**
   * Perform batch updates with conflict detection
   */
  batchUpdate(params: BatchUpdateParams): Promise<BatchResult>;

  /**
   * Create a new sheet in the spreadsheet
   */
  createSheet(sheetName: string, headers: string[]): Promise<boolean>;

  /**
   * Get all sheet names in the spreadsheet
   */
  getSheetNames(): Promise<string[]>;

  /**
   * Clear all data from a sheet (keeping headers)
   */
  clearSheet(sheetName: string): Promise<boolean>;

  /**
   * Append rows to a sheet
   */
  appendRows(sheetName: string, values: any[][]): Promise<UpdateResult>;

  /**
   * Validate connection to Google Sheets API
   */
  validateConnection(): Promise<boolean>;

  /**
   * Get spreadsheet metadata including title and sheet count
   */
  getSpreadsheetInfo(): Promise<{ title: string; sheetCount: number; sheets: string[] }>;

  /**
   * Check if a specific sheet exists
   */
  sheetExists(sheetName: string): Promise<boolean>;

  /**
   * Get row count for a specific sheet
   */
  getRowCount(sheetName: string): Promise<number>;

  /**
   * Batch create multiple sheets at once
   */
  createMultipleSheets(sheetConfigs: Array<{ name: string; headers: string[] }>): Promise<{ created: string[]; failed: string[] }>;

  /**
   * Update a specific row in a sheet
   */
  updateRow(sheetName: string, rowIndex: number, values: any[]): Promise<UpdateResult>;

  /**
   * Delete a specific row from a sheet
   */
  deleteRow(sheetName: string, rowIndex: number): Promise<{ success: boolean; error?: string }>;

  /**
   * Clear a specific range in a sheet
   */
  clearRange(range: string): Promise<{ success: boolean; error?: string }>;
}