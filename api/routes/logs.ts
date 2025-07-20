import express from 'express';
import { authenticateToken as authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * Error logging endpoint
 * POST /api/logs/error
 */
router.post(
  '/error',
  authMiddleware,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
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
        // In production, log to a proper logging service
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

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error logging client errors:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to log errors'
      });
    }
  }
);

export default router;