// Project Setup Components
export * from './project-setup';

// Dashboard Components
export * from './dashboard';

// Navigation Components
export * from './navigation';

// Layout Components
export * from './layout';

// Conflict Resolution Components
export { default as ConflictDialog } from './ConflictDialog';
export { 
  default as ConflictResolutionProvider, 
  useConflictResolutionContext 
} from './ConflictResolutionProvider';
export { default as ConflictResolutionExample } from './ConflictResolutionExample';

// Services
export { default as ConflictResolutionService } from '../services/conflictResolution';

// Hooks
export { default as useConflictResolution } from '../hooks/useConflictResolution';