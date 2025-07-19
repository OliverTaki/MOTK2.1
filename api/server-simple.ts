import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MOTK API Server',
    version: '1.0.0',
    status: 'running',
    message: 'Welcome to the Motion Toolkit API',
    endpoints: {
      health: '/health',
      test: '/api/test',
      entities: {
        assets: '/api/entities/asset',
        shots: '/api/entities/shot',
        tasks: '/api/entities/task'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'MOTK API is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Basic API routes for testing
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Mock entities endpoints
app.get('/api/entities/asset', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Assets retrieved successfully'
  });
});

app.get('/api/entities/shot', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Shots retrieved successfully'
  });
});

app.get('/api/entities/task', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Tasks retrieved successfully'
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 MOTK API server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  });
}

export default app;