/**
 * Environment Configuration Management
 * Handles environment-specific settings for different deployment platforms
 */

export interface EnvironmentConfig {
  // Server Configuration
  port: number;
  nodeEnv: string;
  
  // Authentication
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // Google OAuth
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  
  // Storage
  originalsRootUrl: string;
  proxiesRootUrl: string;
  
  // Google Service Account (for storage)
  googleProjectId: string;
  googlePrivateKeyId: string;
  googlePrivateKey: string;
  googleClientEmail: string;
  googleClientId2: string; // Different from OAuth client ID
  
  // Database/Cache
  redisUrl?: string;
  
  // Deployment
  deploymentPlatform: 'local' | 'vercel' | 'railway' | 'render' | 'heroku';
  frontendUrl: string;
  apiUrl: string;
}

/**
 * Get environment configuration based on current environment
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const deploymentPlatform = detectDeploymentPlatform();
  
  // Base configuration
  const config: EnvironmentConfig = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv,
    
    // Authentication
    jwtSecret: process.env.JWT_SECRET || generateDefaultSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    
    // Google OAuth
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || getDefaultRedirectUri(deploymentPlatform),
    
    // Storage
    originalsRootUrl: process.env.ORIGINALS_ROOT_URL || 'https://drive.google.com/drive/folders/originals',
    proxiesRootUrl: process.env.PROXIES_ROOT_URL || 'https://drive.google.com/drive/folders/proxies',
    
    // Google Service Account
    googleProjectId: process.env.GOOGLE_PROJECT_ID || 'motk-development',
    googlePrivateKeyId: process.env.GOOGLE_PRIVATE_KEY_ID || '',
    googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
    googleClientId2: process.env.GOOGLE_SERVICE_CLIENT_ID || '',
    
    // Database/Cache
    redisUrl: process.env.REDIS_URL,
    
    // Deployment
    deploymentPlatform,
    frontendUrl: getFrontendUrl(deploymentPlatform),
    apiUrl: getApiUrl(deploymentPlatform)
  };
  
  // Platform-specific overrides
  switch (deploymentPlatform) {
    case 'vercel':
      return {
        ...config,
        // Vercel-specific configurations
        googleRedirectUri: config.googleRedirectUri || `${config.frontendUrl}/auth/callback`
      };
      
    case 'railway':
      return {
        ...config,
        // Railway-specific configurations
        redisUrl: config.redisUrl || process.env.REDISCLOUD_URL
      };
      
    case 'render':
      return {
        ...config,
        // Render-specific configurations
        redisUrl: config.redisUrl || process.env.REDIS_URL
      };
      
    case 'heroku':
      return {
        ...config,
        // Heroku-specific configurations
        redisUrl: config.redisUrl || process.env.REDIS_URL
      };
      
    default:
      return config;
  }
}

/**
 * Detect deployment platform based on environment variables
 */
function detectDeploymentPlatform(): EnvironmentConfig['deploymentPlatform'] {
  if (process.env.VERCEL) return 'vercel';
  if (process.env.RAILWAY_ENVIRONMENT) return 'railway';
  if (process.env.RENDER) return 'render';
  if (process.env.DYNO) return 'heroku';
  return 'local';
}

/**
 * Get default redirect URI based on platform
 */
function getDefaultRedirectUri(platform: string): string {
  switch (platform) {
    case 'vercel':
      return process.env.VERCEL_URL ? 
        `https://${process.env.VERCEL_URL}/auth/callback` : 
        'http://localhost:3000/auth/callback';
    case 'railway':
      return process.env.RAILWAY_STATIC_URL ? 
        `${process.env.RAILWAY_STATIC_URL}/auth/callback` : 
        'http://localhost:3000/auth/callback';
    case 'render':
      return process.env.RENDER_EXTERNAL_URL ? 
        `${process.env.RENDER_EXTERNAL_URL}/auth/callback` : 
        'http://localhost:3000/auth/callback';
    case 'heroku':
      return process.env.HEROKU_APP_NAME ? 
        `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/auth/callback` : 
        'http://localhost:3000/auth/callback';
    default:
      return 'http://localhost:3000/auth/callback';
  }
}

/**
 * Get frontend URL based on platform
 */
function getFrontendUrl(platform: string): string {
  switch (platform) {
    case 'vercel':
      return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    case 'railway':
      return process.env.RAILWAY_STATIC_URL || 'http://localhost:3000';
    case 'render':
      return process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
    case 'heroku':
      return process.env.HEROKU_APP_NAME ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com` : 'http://localhost:3000';
    default:
      return 'http://localhost:3000';
  }
}

/**
 * Get API URL based on platform
 */
function getApiUrl(platform: string): string {
  const frontendUrl = getFrontendUrl(platform);
  return `${frontendUrl}/api`;
}

/**
 * Generate a default JWT secret for development
 */
function generateDefaultSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  
  console.warn('Using default JWT secret for development. Set JWT_SECRET environment variable for production.');
  return 'motk-development-secret-key-change-in-production';
}

/**
 * Validate required environment variables
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];
  
  // Required in production
  if (config.nodeEnv === 'production') {
    if (!config.googleClientId) errors.push('GOOGLE_CLIENT_ID is required');
    if (!config.googleClientSecret) errors.push('GOOGLE_CLIENT_SECRET is required');
    if (!config.googleClientEmail) errors.push('GOOGLE_CLIENT_EMAIL is required');
    if (!config.googlePrivateKey) errors.push('GOOGLE_PRIVATE_KEY is required');
    if (config.jwtSecret === generateDefaultSecret()) errors.push('JWT_SECRET is required in production');
  }
  
  // Always required
  if (!config.googleProjectId) errors.push('GOOGLE_PROJECT_ID is required');
  
  if (errors.length > 0) {
    throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * Get configuration summary for debugging
 */
export function getConfigSummary(config: EnvironmentConfig): any {
  return {
    nodeEnv: config.nodeEnv,
    deploymentPlatform: config.deploymentPlatform,
    port: config.port,
    frontendUrl: config.frontendUrl,
    apiUrl: config.apiUrl,
    googleClientId: config.googleClientId ? 'configured' : 'missing',
    googleClientSecret: config.googleClientSecret ? 'configured' : 'missing',
    googleClientEmail: config.googleClientEmail ? 'configured' : 'missing',
    googlePrivateKey: config.googlePrivateKey ? 'configured' : 'missing',
    jwtSecret: config.jwtSecret !== generateDefaultSecret() ? 'configured' : 'using default',
    redisUrl: config.redisUrl ? 'configured' : 'not configured'
  };
}

// Export singleton instance
export const environmentConfig = getEnvironmentConfig();