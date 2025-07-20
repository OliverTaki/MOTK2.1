/* eslint‑disable @typescript-eslint/no‑explicit‑any */
import { google, sheets_v4 } from 'googleapis';

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

/* ------------------------------------------------------------------ */
/* Helper types                                                       */
/* ------------------------------------------------------------------ */

type SheetHeaders = Record<string, string[]>;

/* ------------------------------------------------------------------ */
/* Client                                                             */
/* ------------------------------------------------------------------ */

export class SheetsApiClient implements ISheetsApiClient {
  /* -------------------- fixed‑shape instance fields ---------------- */
  private sheets!: sheets_v4.Sheets;      // 初期化は ctor 内
  private readonly spreadsheetId: string;

  private readonly retryAttempts = 3;
  private readonly retryDelay   = 1_000; // ms

  /* ================================================================= */
  /* Constructor                                                       */
  /* ================================================================= */
  constructor(spreadsheetId?: string) {
    /* 0) ID --------------------------------------------------------- */
    this.spreadsheetId =
      spreadsheetId || process.env.GOOGLE_SHEETS_ID || '';

    /* 1) Service‑account JWT                                         */
      const credentials = JSON.parse(process.env.GSA_CREDENTIALS_JSON || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    /* 2) Sheets RPC stub                                              */
    this.sheets = google.sheets({ version: 'v4', auth: auth as any });
  }

  


  
  /* ================================================================== */
  /* Public high‑level helpers                                          */
  /* ================================================================== */

  /** @deprecated – kept for backward compatibility */
  async initializeProject(
    projectConfig: ProjectConfig,
  ): Promise<ProjectMeta> {
    const { SheetInitializationService } = await import(
      './SheetInitializationService'
    );
    return new SheetInitializationService(this).initSheets(projectConfig);
  }

  /* ------------------------------------------------------------------ */
  /* Core value API                                                     */
  /* ------------------------------------------------------------------ */

  async getSheetData(
    sheetName: string,
    range?: string,
  ): Promise<SheetData> {
    return this.executeWithRetry(async () => {


      const fullRange = range ? `${sheetName}!${range}` : sheetName;
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range:          fullRange,
        majorDimension: 'ROWS',
      });

      return {
        values: res.data.values ?? [],
        range:  res.data.range  ?? fullRange,
        majorDimension: 'ROWS',
      };
    }, `getSheetData(${sheetName})`);
  }

  /* ------------------------------------------------------------------ */
  /* Connection helpers (routes で使用)                                 */
  /* ------------------------------------------------------------------ */

  /** Quick ping: can we talk to the spreadsheet? */
  public async validateConnection(): Promise<boolean> {
    try {

      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        includeGridData: false,
      });
      return true;
    } catch (err) {
      console.error('[SheetsApi] validateConnection failed:', err);
      return false;
    }
  }

  /** True if the title exists */
  public async sheetExists(title: string): Promise<boolean> {
    const names = await this.getSheetNames();
    return names.includes(title);
  }

  /** Cheap row count */
  public async getRowCount(sheetName: string): Promise<number> {
    const data = await this.getSheetData(sheetName);
    return data.values.length;
  }

  /* ------------------------------------------------------------------ */
  /* Cell‑level update (optimistic concurrency)                         */
  /* ------------------------------------------------------------------ */

  async updateCell(params: CellUpdateParams): Promise<UpdateResult> {
    return this.executeWithRetry(async () => {


      /* 1) conflict check ------------------------------------------ */
      const data       = await this.getSheetData(params.sheetName);
      const currentVal = this.findCellValue(
        data,
        params.entityId,
        params.fieldId,
      );
      if (!params.force && currentVal !== params.originalValue) {
        return {
          success: false,
          conflict: true,
          currentValue: currentVal,
        };
      }

      /* 2) real update --------------------------------------------- */
      const cellRange = this.findCellRange(
        data,
        params.entityId,
        params.fieldId,
      );
      if (!cellRange)
        throw new Error(
          `Cell not found for ${params.entityId}/${params.fieldId}`,
        );

      const res = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${params.sheetName}!${cellRange}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[params.newValue]] },
      });

      return {
        success: true,
        conflict: false,
        updatedRange: res.data.updatedRange ?? undefined,
        updatedRows:  res.data.updatedRows  ?? undefined,
      };
    }, `updateCell(${params.sheetName})`);
  }

  /* ------------------------------------------------------------------ */
  /* Batch update                                                       */
  /* ------------------------------------------------------------------ */

  async batchUpdate(params: BatchUpdateParams): Promise<BatchResult> {
    const results: UpdateResult[]      = [];
    const conflicts: CellUpdateParams[] = [];
    let updated = 0;

    for (const u of params.updates) {
      try {
        const r = await this.updateCell(u);
        results.push(r);
        if (r.conflict) conflicts.push(u);
        else if (r.success) updated++;
      } catch {
        results.push({ success: false, conflict: false });
      }
    }
    return {
      success: conflicts.length === 0,
      results,
      totalUpdated: updated,
      conflicts,
    };
  }

  /* -------------------- createSheet & header helpers ---------------- */

  async createSheet(
    sheetName: string,
    headers: string[] = [],
  ): Promise<boolean> {
    return await this.executeWithRetry(async () => {

      if (await this.sheetExists(sheetName)) return true;

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });

      if (headers.length) await this.appendRows(sheetName, [headers]);
      return true;
    }, `createSheet(${sheetName})`);
  }

  /* ------------------------------------------------------------------ */
  /* Simple helpers                                                     */
  /* ------------------------------------------------------------------ */

  async getSheetNames(): Promise<string[]> {
    return this.executeWithRetry(async () => {

      const res = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      return (
        res.data.sheets?.map((s) => s.properties!.title as string) ?? []
      );
    }, 'getSheetNames');
  }

  async appendRows(
    sheet: string,
    rows: any[][],
  ): Promise<UpdateResult> {
    await this.ensureAuth();
    const res = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: sheet,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
    return {
      success: true,
      updatedRange: res.data.updates?.updatedRange ?? undefined,
      updatedRows:  res.data.updates?.updatedRows  ?? undefined,
    };
  }
  /* ------------------------------------------------------------------ */
  /* Retry wrapper                                                      */
  /* ------------------------------------------------------------------ */

  private async executeWithRetry<T>(
    op: () => Promise<T>,
    label: string,
  ): Promise<T> {
    let last!: Error;
    for (let i = 1; i <= this.retryAttempts; i++) {
      try {
        return await op();
      } catch (e: any) {
        last = e instanceof Error ? e : new Error(String(e));
        if (!this.isRetryable(last) || i === this.retryAttempts) {
          console.error(`[Sheets] ${label} failed after ${i} tries`, last);
          throw last;
        }
        const delay = this.retryDelay * 2 ** (i - 1);
        console.warn(`[Sheets] ${label} retry ${i} in ${delay} ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw last;
  }

  private isRetryable(err: Error): boolean {
    const txt = err.message.toLowerCase();
    return [
      'rate limit',
      'quota',
      'timeout',
      'network',
      'econnreset',
      'etimedout',
      'service unavailable',
      'bad gateway',
      'gateway timeout',
    ].some((p) => txt.includes(p));
  }

  /* ------------------------------------------------------------------ */
  /* Utility look‑ups                                                   */
  /* ------------------------------------------------------------------ */

  private findCellValue(
    data: SheetData,
    entityId: string,
    fieldId: string,
  ): any {
    const headers  = data.values[0] ?? [];
    const fieldIdx = headers.indexOf(fieldId);
    if (fieldIdx < 0) return null;

    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i][0] === entityId) return data.values[i][fieldIdx];
    }
    return null;
  }

  private findCellRange(
    data: SheetData,
    entityId: string,
    fieldId: string,
  ): string | null {
    const headers  = data.values[0] ?? [];
    const fieldIdx = headers.indexOf(fieldId);
    if (fieldIdx < 0) return null;

    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i][0] === entityId) {
        return `${this.colToLetter(fieldIdx)}${i + 1}`; // 1‑based
      }
    }
    return null;
  }

  private colToLetter(idx: number): string {
    let s = '';
    while (idx >= 0) {
      s = String.fromCharCode(65 + (idx % 26)) + s;
      idx = Math.floor(idx / 26) - 1;
    }
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* Spreadsheet‑level utilities                                        */
  /* ------------------------------------------------------------------ */

  async getSpreadsheetInfo(): Promise<{
    title: string;
    sheetCount: number;
    sheets: string[];
  }> {
    return this.executeWithRetry(async () => {

      const res = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const sheets =
        res.data.sheets?.map((s) => s.properties!.title as string) ?? [];

      return {
        title: res.data.properties?.title ?? 'Untitled',
        sheetCount: sheets.length,
        sheets,
      };
    }, 'getSpreadsheetInfo');
  }

  async clearSheet(sheet: string): Promise<boolean> {
    try {

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheet}!A2:Z`,
      });
      return true;
    } catch (e) {
      console.error(`clearSheet ${sheet} failed`, e);
      return false;
    }
  }

  async deleteRow(
    sheet: string,
    rowIndex: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {

      const meta = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const tab = meta.data.sheets?.find(
        (s) => s.properties?.title === sheet,
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
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'unknown' };
    }
  }

  async clearRange(range: string): Promise<{ success: boolean; error?: string }> {
    try {

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range,
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'unknown' };
    }
  }

  async updateRow(
    sheet: string,
    row: number,
    values: any[],
  ): Promise<UpdateResult> {
    try {

      const res = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheet}!${row}:${row}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values] },
      });
      return {
        success: true,
        updatedRange: res.data.updatedRange ?? undefined,
        updatedRows:  res.data.updatedRows  ?? undefined,
      };
    } catch {
      return { success: false, conflict: false };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Multi‑sheet helper                                                 */
  /* ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------ */
  /* Header presets (static)                                            */
  /* ------------------------------------------------------------------ */

  private static readonly HEADER_MAP: SheetHeaders = {
    Shots: [
      'shot_id', 'episode', 'scene', 'title', 'status', 'priority',
      'due_date', 'timecode_fps', 'folder_label', 'folder_url',
      'thumbnails', 'file_list', 'versions', 'notes',
    ],
    Assets: [
      'asset_id', 'name', 'asset_type', 'status', 'overlap_sensitive',
      'folder_label', 'folder_url', 'thumbnails', 'file_list',
      'versions', 'notes',
    ],
    Tasks: [
      'task_id', 'name', 'status', 'assignee_id', 'start_date',
      'end_date', 'shot_id', 'folder_label', 'folder_url', 'notes',
    ],
    ProjectMembers: [
      'member_id', 'user_id', 'role', 'department', 'permissions',
      'joined_date', 'active',
    ],
    Users: [
      'user_id', 'email', 'name', 'google_id', 'avatar_url',
      'created_date', 'last_login',
    ],
    Pages: [
      'page_id', 'name', 'type', 'config', 'shared', 'created_by',
      'created_date', 'modified_date',
    ],
    Fields: [
      'field_id', 'entity', 'field_name', 'type', 'editable',
      'required', 'options',
    ],
    project_meta: [
      'project_id', 'storage_provider', 'originals_root_url',
      'proxies_root_url', 'created_at',
    ],
    Logs: [
      'log_id', 'timestamp', 'user_id', 'action', 'entity_type',
      'entity_id', 'changes', 'ip_address',
    ],
  };

  /** 外部からプリセットが欲しい場合に */
  getSheetHeaders(name: string): string[] {
    return SheetsApiClient.HEADER_MAP[name] ?? [];
  }
}

/* ------------------------------------------------------------------ */
/* Singleton export                                                   */
/* ------------------------------------------------------------------ */
export const sheetsClient = new SheetsApiClient();
