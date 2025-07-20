/* eslint‑disable @typescript-eslint/no‑explicit‑any */
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
  ProjectMeta,
} from './ISheetsApiClient';

export class SheetsApiClient implements ISheetsApiClient {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  private readonly retryAttempts = 3;
  private readonly retryDelayMs = 1_000;

  constructor(spreadsheetId?: string) {
    const id = spreadsheetId ?? process.env.GOOGLE_SHEETS_ID;
    if (!id) throw new Error('GOOGLE_SHEETS_ID is required');
    this.spreadsheetId = id;

    const credentials = process.env.GSA_CREDENTIALS_JSON
      ? JSON.parse(process.env.GSA_CREDENTIALS_JSON)
      : {
          client_email: process.env.GSA_EMAIL,
          private_key: (process.env.GSA_PRIVATE_KEY || '').replace(/\n/g, '\n')
        };

    const auth = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  // -------------------------------------------------------------------
  //  Retry wrapper with exponential back‑off
  // -------------------------------------------------------------------
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<T> {
    let lastErr: Error;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastErr = err instanceof Error ? err : new Error(err);
        const msg = lastErr.message.toLowerCase();
        const retryable = [
          'rate limit',
          'timeout',
          'network',
          'quota',
          'unavailable',
          'econnreset',
          'etimedout',
        ].some(p => msg.includes(p));

        if (retryable || attempt === this.retryAttempts) {
          console.error(`❌ [Sheets] ${label} failed:`, lastErr);
          throw lastErr;
        }

        const delay = this.retryDelayMs * 2 ** (attempt - 1);
        console.warn(`⚠️ [Sheets] ${label} retry #${attempt} in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastErr; // unreachable
  }

  // -------------------------------------------------------------------
  //  Project bootstrap
  // -------------------------------------------------------------------
  async initializeProject(cfg: ProjectConfig): Promise<ProjectMeta> {
    const { SheetInitializationService } = await import(
      './SheetInitializationService'
    );
    return new SheetInitializationService(this).initSheets(cfg);
  }

  // -------------------------------------------------------------------
  //  READ
  // -------------------------------------------------------------------
  async getSheetData(
    sheetName: string,
    range?: string
  ): Promise<SheetData> {
    return this.executeWithRetry(
      async () => {
        const fullRange = range ? `${sheetName}${range}` : sheetName;
        const res = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: fullRange,
          majorDimension: 'ROWS',
        });
        return {
          values: res.data.values ?? [],
          range: res.data.range ?? fullRange,
          majorDimension: 'ROWS',
        };
      },
      `getSheetData(${sheetName}${range ? `:${range}` : ''})`
    );
  }

  async getSheetNames(): Promise<string[]> {
    return this.executeWithRetry(
      async () => {
        const res = await this.sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId,
          includeGridData: false,
        });
        return (
          res.data.sheets?.map(s => s.properties.title) ?? []
        );
      },
      'getSheetNames'
    );
  }

  async sheetExists(sheetName: string): Promise<boolean> {
    const names = await this.getSheetNames();
    return names.includes(sheetName);
  }

  async getRowCount(sheetName: string): Promise<number> {
    const data = await this.getSheetData(sheetName);
    return data.values.length;
  }

  // -------------------------------------------------------------------
  //  WRITE: append, updateRow, clearSheet
  // -------------------------------------------------------------------
  async appendRows(
    sheetName: string,
    rows: any[][]
  ): Promise<UpdateResult> {
    return this.executeWithRetry(
      async () => {
        const res = await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: sheetName,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        return {
          success: true,
          updatedRange: res.data.updates?.updatedRange || undefined,
          updatedRows: res.data.updates?.updatedRows || undefined,
        };
      },
      `appendRows(${sheetName})`
    );
  }

  async clearSheet(sheetName: string): Promise<boolean> {
    return this.executeWithRetry(
      async () => {
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}A2:Z`,
        });
        return true;
      },
      `clearSheet(${sheetName})`
    );
  }

  async updateRow(
    sheetName: string,
    rowIndex: number,
    values: any[]
  ): Promise<UpdateResult> {
    return this.executeWithRetry(
      async () => {
        const range = `${sheetName}${rowIndex}:${rowIndex}`;
        const res = await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [values] },
        });
        return {
          success: true,
          updatedRange: res.data.updatedRange || undefined,
          updatedRows: res.data.updatedRows || undefined,
        };
      },
      `updateRow(${sheetName}:${rowIndex})`
    );
  }

  // -------------------------------------------------------------------
  //  Single‑cell update with conflict detection
  // -------------------------------------------------------------------
  async updateCell(
    params: CellUpdateParams
  ): Promise<UpdateResult> {
    return this.executeWithRetry(
      async () => {
        const sheetData = await this.getSheetData(params.sheetName);
        const current = this.findCellValue(
          sheetData,
          params.entityId,
          params.fieldId
        );

        if (params.force && current == params.originalValue) {
          return { success: false, conflict: true, currentValue: current };
        }

        const a1 = this.findCellRange(
          sheetData,
          params.entityId,
          params.fieldId
        );
        if (a1) throw new Error(`Cell not found`);

        const res = await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${params.sheetName}${a1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[params.newValue]] },
        });

        return {
          success: true,
          conflict: false,
          updatedRange: res.data.updatedRange,
          updatedRows: res.data.updatedRows,
        };
      },
      `updateCell(${params.sheetName}|${params.entityId}/${params.fieldId})`
    );
  }

  async batchUpdate(params: BatchUpdateParams): Promise<BatchResult> {
    const results: UpdateResult[] = [];
    const conflicts: CellUpdateParams[] = [];
    let updatedCount = 0;

    for (const u of params.updates) {
      const r = await this.updateCell(u);
      results.push(r);
      if (r.conflict) conflicts.push(u);
      else if (r.success) updatedCount++;
    }

    return {
      success: conflicts.length === 0,
      results,
      totalUpdated: updatedCount,
      conflicts,
    };
  }

  /**
   * Create a new sheet (if it doesn’t already exist) and optionally write headers.
   */
  public async createSheet(
    sheetName: string,
    headers: string[] = []
  ): Promise<boolean> {
    return this.executeWithRetry(async () => {
      // 1) Check if sheet already exists
      const names = await this.getSheetNames();
      if (names.includes(sheetName)) return true;

      // 2) Add sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            { addSheet: { properties: { title: sheetName } } }
          ]
        }
      });

      // 3) Add headers row if provided
      if (headers.length) {
        await this.appendRows(sheetName, [headers]);
      }
      return true;
    }, `createSheet(${sheetName})`);
  }

  async createMultipleSheets(
    sheetConfigs: { name: string; headers: string[] }[],
  ): Promise<{ created: string[]; failed: string[] }> {
    const created: string[] = [];
    const failed:  string[] = [];

    for (const c of sheetConfigs) {
      const ok = await this.createSheet(c.name, c.headers);
      (ok ? created : failed).push(c.name);
    }
    return { created, failed };
  }

  // -------------------------------------------------------------------
  //  Spreadsheet metadata & health
  // -------------------------------------------------------------------
  async getSpreadsheetInfo(): Promise<{
    title: string;
    sheetCount: number;
    sheets: string[];
  }> {
    return this.executeWithRetry(
      async () => {
        const res = await this.sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId,
          includeGridData: false,
        });
        const titles =
          res.data.sheets?.map(s => s.properties.title) ?? [];

        return {
          title: res.data.properties.title,
          sheetCount: titles.length,
          sheets: titles,
        };
      },
      'getSpreadsheetInfo'
    );
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.getSheetNames();
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------
  //  Helpers: findCellValue / findCellRange / colToLetter
  // -------------------------------------------------------------------
  private findCellValue(
    data: SheetData,
    entityId: string,
    fieldId: string
  ): any {
    const headers = data.values[0] ?? [];
    const col = headers.indexOf(fieldId);
    if (col < 0) return null;

    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i][0] === entityId) return data.values[i][col];
    }
    return null;
  }

  private findCellRange(
    data: SheetData,
    entityId: string,
    fieldId: string
  ): string | null {
    const headers = data.values[0] ?? [];
    const col = headers.indexOf(fieldId);
    if (col < 0) return null;

    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i][0] === entityId) {
        return `${this.colToLetter(col)}${i + 1}`;
      }
    }
    return null;
  }

  private colToLetter(i: number): string {
    let s = '';
    for (; i >= 0; i = Math.floor(i / 26) - 1) {
      s = String.fromCharCode(65 + (i % 26)) + s;
    }
    return s;
  }

  async deleteRow(
    sheetName: string,
    rowIndex: number,
  ): Promise<{ success: boolean; error?: string }> {
    return this.executeWithRetry(
      async () => {
        const meta = await this.sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId,
        });
        const tab = meta.data.sheets?.find(
          (s) => s.properties?.title === sheetName,
        );
        if (!tab?.properties)
          return { success: false, error: 'Sheet not found' };

        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: tab.properties.sheetId!,
                    dimension: 'ROWS',
                    startIndex: rowIndex - 1,
                    endIndex:   rowIndex,
                  },
                },
              },
            ],
          },
        });
        return { success: true };
      },
      `deleteRow(${sheetName}:${rowIndex})`
    );
  }

  async clearRange(range: string): Promise<{ success: boolean; error?: string }> {
    return this.executeWithRetry(
      async () => {
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range,
        });
        return { success: true };
      },
      `clearRange(${range})`
    );
  }
}