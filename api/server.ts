import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { router as apiRouter } from './routes';
import { setupSwagger } from './swagger';
import { securityMiddleware } from './middleware/security';
import { sanitizeRequest } from './middleware/sanitization';
import { performanceMonitor } from './services/monitoring/PerformanceMonitor';
import { cacheService } from './services/cache/CacheService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Apply security middleware first
securityMiddleware.applySecurity(app);

// Security headers and audit logging
app.use(securityMiddleware.securityHeaders);
app.use(securityMiddleware.auditLogger);

// IP security and request size limiting
app.use(securityMiddleware.ipSecurityMiddleware);
app.use(securityMiddleware.requestSizeLimiter('50mb')); // Allow larger uploads

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request sanitization
app.use(sanitizeRequest);

// Performance monitoring
app.use(performanceMonitor.middleware());


// Apply tiered rate limiting
app.use(securityMiddleware.tieredRateLimiter);

// API Routes
app.use('/api', apiRouter);

// Set up Swagger documentation
setupSwagger(app);

// Health check endpoint with performance metrics
app.get('/health', (req, res) => {
  const health = performanceMonitor.getHealthStatus();
  res.status(health.status === 'critical' ? 503 : 200).json({
    status: health.status,
    message: 'MOTK API is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    issues: health.issues
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`MOTK API server running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}

console.log(
  'GSA_PRIVATE_KEY:',
  process.env.GSA_PRIVATE_KEY?.slice(0, 20) + '…'
);


export default app;