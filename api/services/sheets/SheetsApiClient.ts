/* -------------------------------------------------------------------------- */
/*  Google Sheets client for MOTK (service‑account auth)                    */
/* -------------------------------------------------------------------------- */
import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth }         from 'google-auth-library';
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

  constructor(spreadsheetId?: string) {
    this.spreadsheetId = spreadsheetId
      || process.env.GOOGLE_SHEETS_ID;
    // build a GoogleAuth instance from your SERVICE ACCOUNT JSON pasted in .env
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GSA_EMAIL,
        // private key in env must have literal “\n” sequences, not raw newlines
        private_key: process.env.GSA_PRIVATE_KEY.replace(/\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /** retry helper with exponential backoff */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    label: string,
    attempts = 3,
    delay = 500
  ): Promise<T> {
    let last: any;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn();
      } catch (e: any) {
        last = e;
        const msg = e.message?.toLowerCase() || '';
        if (i === attempts
          || /rate limit|quota|timeout|network|econnreset|service unavailable/.test(msg)
        ) {
          console.error(`❌  [SheetsApi][${label}] failed on try #${i}`, e);
          throw e;
        }
        const backoff = delay * 2 ** (i - 1);
        console.warn(`⏳  [SheetsApi][${label}] retrying in ${backoff}ms (attempt ${i})`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
    throw last;
  }

  /** fire‑and‑forget “is the API reachable?” check */
  async validateConnection(): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        includeGridData: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  /** list sheet names */
  async getSheetNames(): Promise<string[]> {
    const res = await this.executeWithRetry(
      () => this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId }),
      'getSheetNames'
    );
    return res.data.sheets
      ?.map(s => s.properties?.title)
      .filter((t): t is string => t)
      ?? [];
  }

  /** does a sheet exist? */
  async sheetExists(name: string): Promise<boolean> {
    const names = await this.getSheetNames();
    return names.includes(name);
  }

  /**
   * Cheap row count (entire sheet)
   */
  async getRowCount(sheetName: string): Promise<number> {
    const data = await this.getSheetData(sheetName);
    return data.values.length;
  }

  /**
   * Get spreadsheet metadata: title, sheetCount, and list of sheet names
   */
  async getSpreadsheetInfo(): Promise<{
    title: string;
    sheetCount: number;
    sheets: string[];
  }> {
    const resp = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    const titles = resp.data.sheets
      ?.map(s => s.properties?.title)
      .filter((t): t is string => t)
      ?? [];
    return {
      title: resp.data.properties?.title ?? 'Untitled',
      sheetCount: titles.length,
      sheets: titles,
    };
  }





  /** get raw values */
  async getSheetData(sheetName: string, range?: string): Promise<SheetData> {
    const full = range ? `${sheetName}${range}` : sheetName;
    const res = await this.executeWithRetry(
      () => this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: full,
        majorDimension: 'ROWS'
      }),
      `getSheetData(${sheetName})`
    );
    return {
      values: res.data.values ?? [],
      range: res.data.range ?? full,
      majorDimension: 'ROWS'
    };
  }

  /** append rows */
  async appendRows(sheetName: string, rows: any[][]): Promise<UpdateResult> {
    const res = await this.executeWithRetry(
      () => this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      }),
      `appendRows(${sheetName})`
    );
    return {
      success: true,
      updatedRange: res.data.updates?.updatedRange ?? undefined,
      updatedRows:  res.data.updates?.updatedRows  ?? undefined
    };
  }

  /** clear everything but headers */
  async clearSheet(sheetName: string): Promise<boolean> {
    await this.executeWithRetry(
      () => this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}A2:Z`
      }),
      `clearSheet(${sheetName})`
    );
    return true;
  }

  /** update a single row */
  async updateRow(sheetName: string, rowIdx: number, vals: any[]): Promise<UpdateResult> {
    const res = await this.executeWithRetry(
      () => this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}${rowIdx}:${rowIdx}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [vals] }
      }),
      `updateRow(${sheetName},${rowIdx})`
    );
    return {
      success: true,
      updatedRange: res.data.updatedRange ?? undefined,
      updatedRows:  res.data.updatedRows  ?? undefined
    };
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
        if (!a1) throw new Error(`Cell not found`);

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
          res.data.sheets?.map(s => s.properties.title)
          .filter((t): t is string => t)
          ?? [];

        return {
          title: res.data.properties.title,
          sheetCount: titles.length,
          sheets: titles,
        };
      },
      'getSpreadsheetInfo'
    );
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
}