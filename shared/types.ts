/**
 * Shared type definitions for MOTK system – V4
 * Added `lastLoginAt` camelCase alias for auth service.
 */

// =============================
// Entity & status definitions
// =============================

export type EntityType = 'shot' | 'asset' | 'task' | 'member' | 'user';

export const ENTITY_KIND = {
  SHOT: 'shot',
  ASSET: 'asset',
  TASK: 'task',
  MEMBER: 'member',
  USER: 'user',
} as const;

// Back‑compat aliases (deprecated)
export const EntityType = ENTITY_KIND;
export const EntityTypes = ENTITY_KIND;

export enum ShotStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  APPROVED = 'approved',
  COMPLETED = 'completed',
}

export enum AssetStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  APPROVED = 'approved',
  COMPLETED = 'completed',
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  REVIEW = 'review',
  COMPLETED = 'completed',
}

export enum AssetType {
  CHARACTER = 'character',
  PROP = 'prop',
  ENVIRONMENT = 'environment',
  EFFECT = 'effect',
  OTHER = 'other',
}

// =============================
// Field & page type definitions
// =============================

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
  LINK_USER = 'link_user',
}

// =============================
// Authentication & user types
// =============================

export interface User {
  id: string;
  /** alias used in backend validators */
  user_id?: string;
  email: string;
  name?: string;
  role?: string;            // added for authorization middleware
  picture?: string;
  verified_email?: boolean;
  locale?: string;
  google_id?: string;
  avatar_url?: string;
  // legacy camelCase timestamps
  createdAt?: Date;
  lastLoginAt?: Date;
  // preferred snake_case timestamps
  created_date?: Date;
  last_login?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: string | number;
  tokenType: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string | number;
  googleClientId: string;
  googleClientSecret: string;
  redirectUri: string;
}

// =============================
// Generic API response wrapper
// =============================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =============================
// Storage‑related types (unchanged)
// =============================

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

export interface ProjectConfig {
  project_id: string;
  storage_provider: 'gdrive' | 'box';
  originals_root_url: string;
  proxies_root_url: string;
  created_at: Date;
}

export interface CellUpdateParams {
  sheetName: string;
  entityId: string;
  fieldId: string;
  originalValue: any;
  newValue: any;
  force?: boolean;
}

export enum ResolutionChoice {
  OVERWRITE = 'overwrite',
  EDIT_AGAIN = 'edit_again',
  KEEP_SERVER = 'keep_server',
}

export interface ConflictData {
  originalValue: any;
  currentValue: any;
  newValue: any;
  fieldId: string;
  entityId: string;
}

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

export enum ProxyJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

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

export interface ProxyGenerationOptions {
  resolution: string;
  bitrate: string;
  format: string;
  codec: string;
}

export interface ProxyInfo {
  originalFileInfo: FileInfo;
  proxyFileInfo: FileInfo;
  proxyFileName: string;
  generatedAt: Date;
}

// =============================
// Core entity models (unchanged)
// =============================

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

export type EntityData = Shot | Asset | Task | ProjectMember | User;

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

export enum PageType {
  TABLE = 'table',
  OVERVIEW = 'overview',
  SHOT_DETAIL = 'shot_detail',
  ASSET_DETAIL = 'asset_detail',
  TASK_DETAIL = 'task_detail',
  SCHEDULE = 'schedule',
  CHAT = 'chat',
  FORUM = 'forum',
  MEMBER_DETAIL = 'member_detail',
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
