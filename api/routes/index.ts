import express from 'express';
import { authRateLimiter, uploadRateLimiter, apiKeyRateLimiter } from '../middleware/rateLimiting';

const router = express.Router();

// Auth routes with stricter rate limiting
router.use('/auth', authRateLimiter, require('./auth').default);

// Sheets routes
router.use('/sheets', require('./sheets').default);

// Files routes with upload rate limiting
router.use('/files', uploadRateLimiter, require('./files').default);

// Entities routes
router.use('/entities', require('./entities').default);

// Projects routes
router.use('/projects', require('./projects').default);

// Pages routes
router.use('/pages', require('./pages').default);

// Logs routes
router.use('/logs', require('./logs').default);

// API keys routes with strict rate limiting
router.use('/apikeys', apiKeyRateLimiter, require('./apikeys').default);

export { router };