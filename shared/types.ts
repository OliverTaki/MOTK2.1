/**
 * Shared type definitions for MOTK system
 */

// Entity Types
export type EntityType = 'shot' | 'asset' | 'task' | 'member' | 'user';

export const ENTITY_KIND = {
  SHOT: 'shot' as const,
  ASSET: 'asset' as const,
  TASK: 'task' as const,
  MEMBER: 'member' as const,
  USER: 'user' as const
} as const;

// Backward compatibility aliases - will be removed in future versions
export const EntityType = ENTITY_KIND;
export const EntityTypes = ENTITY_KIND;

// Status Types
export enum ShotStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  APPROVED = 'approved',
  COMPLETED = 'completed'
}

export enum AssetStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  APPROVED = 'approved',
  COMPLETED = 'completed'
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  REVIEW = 'review',
  COMPLETED = 'completed'
}

export enum AssetType {
  CHARACTER = 'character',
  PROP = 'prop',
  ENVIRONMENT = 'environment',
  EFFECT = 'effect',
  OTHER = 'other'
}

// Field Types
export enum FieldType {
  TEXT = 'text',
  SELECT = 'select',
  NUMBER = 'number',
  DATE = 'date',
  CHECKBOX = 'checkbox',
  URL = 'url',
  THUMBNAILS = 'thumbnails',
  FILE_LIST = 'file_list',
  VERSIONS = 'versions',
  LINK_SHOT = 'link_shot',
  LINK_ASSET = 'link_asset',
  LINK_TASK = 'link_task',
  LINK_MEMBER = 'link_member',
  LINK_USER = 'link_user'
}

  export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    /** トークン失効日時 (ISO 文字列か epoch 秒) */
    expiryDate: string | number;
    /** トークン種別。通常 "Bearer" 固定 */
    tokenType: string;
  }

  export interface AuthConfig {            // ← 追加
    jwtSecret: string;
    jwtExpiresIn: string | number; // '1h' など
  }

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// File Reference Types
export interface FileReference {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  url: string;
  createdAt: Date;
}

export interface VersionReference {
  latest: FileReference | null;
  versions: FileReference[];
}

// Project Configuration
export interface ProjectConfig {
  project_id: string;
  storage_provider: 'gdrive' | 'box';
  originals_root_url: string;
  proxies_root_url: string;
  created_at: Date;
}

// Cell Update Parameters
export interface CellUpdateParams {
  sheetName: string;
  entityId: string;
  fieldId: string;
  originalValue: any;
  newValue: any;
  force?: boolean;
}

// Conflict Resolution
export enum ResolutionChoice {
  OVERWRITE = 'overwrite',
  EDIT_AGAIN = 'edit_again',
  KEEP_SERVER = 'keep_server'
}

export interface ConflictData {
  originalValue: any;
  currentValue: any;
  newValue: any;
  fieldId: string;
  entityId: string;
}

// Storage Provider Types
export interface FolderInfo {
  id: string;
  name: string;
  path: string;
  url: string;
  parentId?: string;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  url: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface StorageConfig {
  provider: 'gdrive' | 'box';
  originalsRootUrl: string;
  proxiesRootUrl: string;
  credentials?: any;
}

export interface EntityFolderStructure {
  entityType: EntityType;
  entityId: string;
  originalsPath: string;
  proxiesPath: string;
  originalsUrl: string;
  proxiesUrl: string;
}

// Proxy Generation Types
export interface ProxyGenerationJob {
  id: string;
  entityType: EntityType;
  entityId: string;
  originalFileInfo: FileInfo;
  proxyFileName: string;
  status: ProxyJobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress?: number;
}

export enum ProxyJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ProxyGenerationOptions {
  resolution: string; // e.g., '1920x1080'
  bitrate: string; // e.g., '1M'
  format: string; // e.g., 'mp4'
  codec: string; // e.g., 'libx264'
}

export interface ProxyInfo {
  originalFileInfo: FileInfo;
  proxyFileInfo: FileInfo;
  proxyFileName: string;
  generatedAt: Date;
}

// Entity Interfaces
export interface Shot {
  shot_id: string;
  episode?: string;
  scene?: string;
  title: string;
  status: ShotStatus;
  priority?: number;
  due_date?: Date;
  timecode_fps?: string;
  folder_label?: string;
  folder_url?: string;
  thumbnails?: FileReference[];
  file_list?: FileReference[];
  versions?: VersionReference;
  notes?: string;
}

export interface Asset {
  asset_id: string;
  name: string;
  asset_type: AssetType;
  status?: AssetStatus;
  overlap_sensitive?: boolean;
  folder_label?: string;
  folder_url?: string;
  thumbnails?: FileReference[];
  file_list?: FileReference[];
  versions?: VersionReference;
  notes?: string;
}

export interface Task {
  task_id: string;
  name: string;
  status: TaskStatus;
  assignee_id?: string;
  start_date?: Date;
  end_date?: Date;
  shot_id?: string;
  folder_label?: string;
  folder_url?: string;
  notes?: string;
}

export interface ProjectMember {
  member_id: string;
  user_id: string;
  role: string;
  department: string;
  permissions: 'edit' | 'view' | 'admin';
  joined_date: Date;
  active: boolean;
}

export interface User {
  user_id: string;
  id: string;   
  email: string;
  name: string;
  google_id: string;
  avatar_url?: string;
  created_date: Date;
  last_login?: Date;
}

// Entity Data Type Union
export type EntityData = Shot | Asset | Task | ProjectMember | User;

// Entity Query Parameters
export interface EntityQueryParams {
  entityType: EntityType;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

// Page Configuration Types
export enum PageType {
  TABLE = 'table',
  OVERVIEW = 'overview',
  SHOT_DETAIL = 'shot_detail',
  ASSET_DETAIL = 'asset_detail',
  TASK_DETAIL = 'task_detail',
  SCHEDULE = 'schedule',
  CHAT = 'chat',
  FORUM = 'forum',
  MEMBER_DETAIL = 'member_detail'
}

export interface PageConfig {
  page_id: string;
  name: string;
  type: PageType;
  config: PageConfigData;
  shared: boolean;
  created_by: string;
  created_date: Date;
  modified_date: Date;
}

export interface PageConfigData {
  entity?: EntityType;
  fields?: string[];
  fieldWidths?: Record<string, number>;
  filters?: Record<string, any>;
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// Entity Operation Results
export interface EntityOperationResult<T = EntityData> {
  success: boolean;
  data?: T;
  error?: string;
  conflicts?: ConflictData[];
}

export interface EntityListResult<T = EntityData> {
  success: boolean;
  data: T[];
  total: number;
  offset: number;
  limit: number;
  error?: string;
}