import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { EntityType, ProjectMember, User } from '../../../shared/types';

// Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserPermission {
  userId: string;
  projectId: string;
  permission: 'view' | 'edit' | 'admin';
}

/**
 * Authentication service for Google OAuth and JWT token management
 */
export class AuthService {
  private oauthClient: OAuth2Client;
  private redis: Redis;
  private readonly JWT_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY: number = 3600; // 1 hour
  private readonly REFRESH_TOKEN_EXPIRY: number = 2592000; // 30 days

  constructor() {
    // Initialize Google OAuth client
    this.oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Initialize Redis client for session management
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // JWT secret from environment or fallback
    this.JWT_SECRET = process.env.JWT_SECRET || 'motk-development-secret';
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthUrl(): string {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens and user profile
   */
  async handleCallback(code: string): Promise<{ tokens: AuthTokens; profile: UserProfile }> {
    try {
      // Exchange code for tokens
      const { tokens } = await this.oauthClient.getToken(code);
      
      // Set credentials to client
      this.oauthClient.setCredentials(tokens);
      
      // Get user profile
      const profile = await this.getUserProfile(tokens.access_token as string);
      
      // Generate JWT tokens
      const authTokens = await this.generateTokens(profile);
      
      return { tokens: authTokens, profile };
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Get user profile from Google
   */
  private async getUserProfile(accessToken: string): Promise<UserProfile> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(profile: UserProfile): Promise<AuthTokens> {
    // Create a unique session ID
    const sessionId = uuidv4();
    
    // Create token payload
    const payload: TokenPayload = {
      userId: profile.id,
      email: profile.email,
      sessionId
    };
    
    // Generate access token
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    });
    
    // Generate refresh token
    const refreshToken = jwt.sign({ sessionId }, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY
    });
    
    // Store session in Redis
    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify({ profile, refreshToken }),
      'EX',
      this.REFRESH_TOKEN_EXPIRY
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    };
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as { sessionId: string };
      const { sessionId } = decoded;
      
      // Get session from Redis
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (!sessionData) {
        return null;
      }
      
      const { profile } = JSON.parse(sessionData);
      
      // Generate new tokens
      return this.generateTokens(profile);
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Invalidate session (logout)
   */
  async logout(sessionId: string): Promise<boolean> {
    try {
      await this.redis.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Get user's permission level for a specific project
   * @param userId User ID
   * @param projectId Project ID
   * @returns Permission level or null if user has no access
   */
  async getUserProjectPermission(userId: string, projectId: string): Promise<string | null> {
    try {
      // In a real implementation, this would query the ProjectMembers sheet
      // For now, we'll use Redis to store and retrieve permissions
      const permissionKey = `permission:${userId}:${projectId}`;
      const permission = await this.redis.get(permissionKey);
      
      return permission;
    } catch (error) {
      console.error('Error getting user project permission:', error);
      return null;
    }
  }

  /**
   * Set user's permission level for a project
   * @param userId User ID
   * @param projectId Project ID
   * @param permission Permission level (view, edit, admin)
   */
  async setUserProjectPermission(
    userId: string, 
    projectId: string, 
    permission: 'view' | 'edit' | 'admin'
  ): Promise<boolean> {
    try {
      // In a real implementation, this would update the ProjectMembers sheet
      // For now, we'll use Redis to store permissions
      const permissionKey = `permission:${userId}:${projectId}`;
      await this.redis.set(permissionKey, permission);
      
      return true;
    } catch (error) {
      console.error('Error setting user project permission:', error);
      return false;
    }
  }

  /**
   * Remove user's permission for a project
   * @param userId User ID
   * @param projectId Project ID
   */
  async removeUserProjectPermission(userId: string, projectId: string): Promise<boolean> {
    try {
      const permissionKey = `permission:${userId}:${projectId}`;
      await this.redis.del(permissionKey);
      
      return true;
    } catch (error) {
      console.error('Error removing user project permission:', error);
      return false;
    }
  }

  /**
   * Check if user has access to a specific entity
   * @param userId User ID
   * @param projectId Project ID
   * @param entityType Entity type
   * @param entityId Entity ID
   */
  async checkEntityAccess(
    userId: string,
    projectId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<boolean> {
    try {
      // First check if user has project access
      const permission = await this.getUserProjectPermission(userId, projectId);
      
      if (!permission) {
        return false;
      }
      
      // In a real implementation, you might have entity-specific permissions
      // For now, we'll assume project-level permissions are sufficient
      return true;
    } catch (error) {
      console.error('Error checking entity access:', error);
      return false;
    }
  }

  /**
   * Get all project members with their permissions
   * @param projectId Project ID
   */
  async getProjectMembers(projectId: string): Promise<UserPermission[]> {
    try {
      // In a real implementation, this would query the ProjectMembers sheet
      // For now, we'll return a mock implementation
      const memberKeys = await this.redis.keys(`permission:*:${projectId}`);
      const members: UserPermission[] = [];
      
      for (const key of memberKeys) {
        const userId = key.split(':')[1];
        const permission = await this.redis.get(key);
        
        if (permission) {
          members.push({
            userId,
            projectId,
            permission: permission as 'view' | 'edit' | 'admin'
          });
        }
      }
      
      return members;
    } catch (error) {
      console.error('Error getting project members:', error);
      return [];
    }
  }
}

// Export singleton instance
export const authService = new AuthService();