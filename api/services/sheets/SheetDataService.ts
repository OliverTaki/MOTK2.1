import { ISheetsApiClient } from './ISheetsApiClient';

/**
 * Service for reading and transforming Google Sheets data
 */
export class SheetDataService {
  constructor(private sheetsClient: ISheetsApiClient) {}

  /**
   * Get all sheet data for a project
   */
  async getAllSheetData(): Promise<{
    shots: any[];
    assets: any[];
    tasks: any[];
    members: any[];
    users: any[];
    pages: any[];
    fields: any[];
    meta: any[];
    logs: any[];
  }> {
    try {
      // Read all sheets in parallel
      const [
        shotsData,
        assetsData,
        tasksData,
        membersData,
        usersData,
        pagesData,
        fieldsData,
        metaData,
        logsData
      ] = await Promise.all([
        this.getSheetData('Shots'),
        this.getSheetData('Assets'),
        this.getSheetData('Tasks'),
        this.getSheetData('ProjectMembers'),
        this.getSheetData('Users'),
        this.getSheetData('Pages'),
        this.getSheetData('Fields'),
        this.getSheetData('project_meta'),
        this.getSheetData('Logs')
      ]);

      return {
        shots: shotsData,
        assets: assetsData,
        tasks: tasksData,
        members: membersData,
        users: usersData,
        pages: pagesData,
        fields: fieldsData,
        meta: metaData,
        logs: logsData
      };
    } catch (error) {
      console.error('Error getting all sheet data:', error);
      throw new Error(`Failed to get sheet data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get data from a specific sheet
   */
  async getSheetData(sheetName: string): Promise<any[]> {
    try {
      const sheetData = await this.sheetsClient.getSheetData(sheetName);
      const rawData = sheetData.values;
      
      if (!rawData || rawData.length === 0) {
        return [];
      }

      // Handle different sheet structures
      if (sheetName === 'Fields' || sheetName === 'project_meta') {
        // These sheets have single header row
        return this.transformSingleHeaderData(rawData);
      } else {
        // These sheets have two-row header structure (field_id + field_name)
        return this.transformTwoRowHeaderData(rawData);
      }
    } catch (error) {
      console.error(`Error getting data from sheet ${sheetName}:`, error);
      throw new Error(`Failed to get data from ${sheetName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transform data with single header row (Fields, project_meta)
   */
  private transformSingleHeaderData(rawData: string[][]): any[] {
    if (rawData.length < 2) {
      return [];
    }

    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    return dataRows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  /**
   * Transform data with two-row header structure (field_id + field_name)
   */
  private transformTwoRowHeaderData(rawData: string[][]): any[] {
    if (rawData.length < 3) {
      console.log(`Sheet has less than 3 rows, returning empty array`);
      return [];
    }

    const fieldIds = rawData[0];      // field_001, field_002, etc.
    const fieldNames = rawData[1];    // shot_id, episode, etc.
    const dataRows = rawData.slice(2);

    console.log(`Raw data has ${dataRows.length} data rows`);
    console.log(`Field IDs: ${fieldIds.join(', ')}`);
    console.log(`Field names: ${fieldNames.join(', ')}`);

    // Filter out empty rows (rows where all cells are empty or just whitespace)
    const nonEmptyRows = dataRows.filter(row => {
      // Check if the row has any non-empty cells
      const hasNonEmptyCell = row.some(cell => cell && cell.trim() !== '');
      
      // Check if the row has a valid ID in the first column
      const hasValidId = row[0] && row[0].trim() !== '';
      
      return hasNonEmptyCell && hasValidId;
    });

    console.log(`Found ${nonEmptyRows.length} non-empty rows with valid IDs out of ${dataRows.length} total rows`);

    // If we have no valid rows, log the raw data for debugging
    if (nonEmptyRows.length === 0 && dataRows.length > 0) {
      console.log(`No valid rows found. First data row:`, JSON.stringify(dataRows[0]));
    }

    const result = nonEmptyRows.map(row => {
      const obj: any = {};
      fieldNames.forEach((fieldName, index) => {
        if (fieldName && fieldName.trim() !== '') {
          // Handle undefined or null values
          const value = index < row.length ? row[index] : '';
          obj[fieldName] = value !== undefined && value !== null ? value : '';
        }
      });
      return obj;
    });

    console.log(`Transformed ${result.length} rows`);
    if (result.length > 0) {
      console.log(`First transformed row:`, JSON.stringify(result[0]));
    }

    return result;
  }

  /**
   * Get field mappings from Fields sheet
   */
  async getFieldMappings(): Promise<{ [fieldId: string]: { fieldName: string; entity: string; type: string } }> {
    try {
      const fieldsData = await this.getSheetData('Fields');
      const mappings: { [fieldId: string]: { fieldName: string; entity: string; type: string } } = {};

      fieldsData.forEach((field: any) => {
        if (field.field_id && field.field_name) {
          mappings[field.field_id] = {
            fieldName: field.field_name,
            entity: field.entity || '',
            type: field.type || 'text'
          };
        }
      });

      return mappings;
    } catch (error) {
      console.error('Error getting field mappings:', error);
      return {};
    }
  }

  /**
   * Get project metadata
   */
  async getProjectMeta(): Promise<any> {
    try {
      const metaData = await this.getSheetData('project_meta');
      return metaData.length > 0 ? metaData[0] : null;
    } catch (error) {
      console.error('Error getting project metadata:', error);
      return null;
    }
  }
}