/**
 * MOTK System - Main entry point
 * 
 * This file serves as the main entry point for the MOTK system.
 * It re-exports components and utilities from the API and shared directories.
 */

// Re-export shared types
export * from '../shared/types';

// Export API server
export { default as server } from '../api/server';

// This file will be expanded as more functionality is implemented