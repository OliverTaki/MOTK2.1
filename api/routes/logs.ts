import express from 'express';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * Error logging endpoint
 * POST /api/logs/error
 */
router.post('/error', authenticate, async (req, res) => {
  try {
    const { errors } = req.body;
    
    if (!Array.isArray(errors)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request format. Expected array of errors.' 
      });
    }

    // Log errors to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Client-side errors:', errors);
    } else {
      // In production, we would log to a proper logging service
      // This could be implemented with Winston, Pino, or a third-party service
      
      // For now, just log to console
      console.error('Client-side errors:', 
        errors.map(e => ({
          type: e.type,
          message: e.error?.message,
          timestamp: e.timestamp,
          userInfo: e.userInfo
        }))
      );
      
      // TODO: Implement proper error logging to a database or service
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging client errors:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to log errors' 
    });
  }
});

export default router;