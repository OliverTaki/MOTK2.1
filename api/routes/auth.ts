import express from 'express';
import { authenticationService } from '../services/auth/AuthenticationService';
import { authenticateToken, validateSession } from '../middleware/auth';

const router = express.Router();

/**
 * Get authentication configuration for client
 */
router.get('/config', (req, res) => {
  try {
    const config = authenticationService.getClientConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get auth config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get auth config'
    });
  }
});

/**
 * Get Google OAuth authorization URL
 */
router.get('/google/url', (req, res) => {
  try {
    const scopes = req.query.scopes ? 
      (req.query.scopes as string).split(',') : 
      ['profile', 'email', 'https://www.googleapis.com/auth/drive'];
    
    const authUrl = authenticationService.generateAuthUrl(scopes);
    
    res.json({
      success: true,
      data: {
        authUrl,
        scopes
      }
    });
  } catch (error) {
    console.error('Generate auth URL error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate auth URL'
    });
  }
});

/**
 * Handle Google OAuth callback
 */
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    // Create authentication session
    const session = await authenticationService.createAuthSession(code);
    
    return res.json({
      success: true,
      data: {
        user: session.user,
        jwtToken: session.jwtToken,
        tokens: {
          accessToken: session.tokens.accessToken,
          expiryDate: session.tokens.expiryDate,
          tokenType: session.tokens.tokenType
          // Don't send refresh token to client for security
        }
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
});

/**
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const newTokens = await authenticationService.refreshAccessToken(refreshToken);
    
    return res.json({
      success: true,
      data: {
        tokens: {
          accessToken: newTokens.accessToken,
          expiryDate: newTokens.expiryDate,
          tokenType: newTokens.tokenType
        }
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

/**
 * Validate current session
 */
router.post('/validate', validateSession, (req, res) => {
  try {
    const response: any = {
      success: true,
      data: {
        valid: true,
        user: req.user
      },
      message: 'Session is valid'
    };

    // Include new tokens if they were refreshed
    if (res.locals.newTokens) {
      response.data.newTokens = {
        accessToken: res.locals.newTokens.accessToken,
        expiryDate: res.locals.newTokens.expiryDate,
        tokenType: res.locals.newTokens.tokenType
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Session validation failed'
    });
  }
});

/**
 * Get current user profile
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user profile'
    });
  }
});

/**
 * Logout - revoke tokens
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (accessToken) {
      // Revoke Google tokens
      await authenticationService.revokeTokens(accessToken);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Don't fail logout even if token revocation fails
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

/**
 * Health check for authentication service
 */
router.get('/health', (req, res) => {
  try {
    const config = authenticationService.getClientConfig();
    const isConfigured = !!(config.googleClientId && process.env.GOOGLE_CLIENT_SECRET);
    
    res.json({
      success: true,
      data: {
        configured: isConfigured,
        googleClientId: config.googleClientId ? 'configured' : 'missing',
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing',
        jwtSecret: process.env.JWT_SECRET ? 'configured' : 'using default',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'using default'
      }
    });
  } catch (error) {
    console.error('Auth health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

export default router;