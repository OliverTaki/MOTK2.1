import jwt, { Secret } from 'jsonwebtoken';
import { google } from 'googleapis';
import { User, AuthTokens, AuthConfig } from '../../../shared/types';

/**
 * Authentication Service - Handles Google OAuth and JWT token management
 */
export class AuthenticationService {
  private oauth2Client: any;
  private jwtSecret: string;
  private jwtExpiresIn: string | number = '24h'; // ← union 型に修正

  constructor(config: AuthConfig) {
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'default-secret-key';
    this.jwtExpiresIn = config.jwtExpiresIn ?? '24h'; // ← union 型でエラー解消

    // Initialize Google OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId || process.env.GOOGLE_CLIENT_ID,
      config.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET,
      config.redirectUri || process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generate Google OAuth authorization URL
   */
  generateAuthUrl(scopes: string[] = ['profile', 'email']): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      return {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        tokenType: tokens.token_type || 'Bearer'
      };
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user profile from Google
   */
  async getUserProfile(accessToken: string): Promise<User> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();

      if (!data.id || !data.email) {
        throw new Error('Invalid user profile data from Google');
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name || '',
        picture: data.picture || '',
        verified_email: data.verified_email || false,
        locale: data.locale || 'en',
        createdAt: new Date(),
        lastLoginAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate JWT token for user
   */
  generateJwtToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000)
    };

    // jwt.sign の secret を Secret 型にキャスト
    return jwt.sign(payload, this.jwtSecret as Secret, {
      expiresIn: this.jwtExpiresIn as any, // ← 型警告を回避
    });
  }

  /**
   * Verify JWT token
   */
  verifyJwtToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || refreshToken,
        expiryDate: credentials.expiry_date,
        tokenType: credentials.token_type || 'Bearer'
      };
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate session and refresh if needed
   */
  async validateSession(sessionData: any): Promise<{ valid: boolean; user?: User; newTokens?: AuthTokens }> {
    try {
      // Verify JWT token
      const decoded = this.verifyJwtToken(sessionData.jwtToken);
      
      // Check if access token is expired
      if (sessionData.tokens?.expiryDate && Date.now() >= sessionData.tokens.expiryDate) {
        if (sessionData.tokens.refreshToken) {
          // Refresh the access token
          const newTokens = await this.refreshAccessToken(sessionData.tokens.refreshToken);
          
          // Get updated user profile
          const user = await this.getUserProfile(newTokens.accessToken);
          
          return {
            valid: true,
            user,
            newTokens
          };
        } else {
          return { valid: false };
        }
      }

      // Session is valid, get user profile
      const user = await this.getUserProfile(sessionData.tokens.accessToken);
      
      return {
        valid: true,
        user
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Revoke Google tokens
   */
  async revokeTokens(accessToken: string): Promise<void> {
    try {
      await this.oauth2Client.revokeToken(accessToken);
    } catch (error) {
      console.error('Failed to revoke tokens:', error);
      // Don't throw error as this is cleanup
    }
  }

  /**
   * Create complete authentication session
   */
  async createAuthSession(code: string): Promise<{
    user: User;
    jwtToken: string;
    tokens: AuthTokens;
  }> {
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);
    
    // Get user profile
    const user = await this.getUserProfile(tokens.accessToken);
    
    // Generate JWT token
    const jwtToken = this.generateJwtToken(user);
    
    return {
      user,
      jwtToken,
      tokens
    };
  }

  /**
   * Get authentication configuration for client
   */
  getClientConfig(): {
    googleClientId: string;
    authUrl: string;
    scopes: string[];
  } {
    return {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      authUrl: this.generateAuthUrl(),
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive']
    };
  }
}

// Export singleton instance with default configuration
const defaultConfig: AuthConfig = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtExpiresIn: '24h'
};

export const authenticationService = new AuthenticationService(defaultConfig);