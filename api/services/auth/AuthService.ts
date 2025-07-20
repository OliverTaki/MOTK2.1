import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { EntityType, User } from '../../../shared/types';

// ------------------------------
// Additional local interfaces
// ------------------------------

/** Google user‑info payload (subset) */
interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

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
  private readonly ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
  private readonly REFRESH_TOKEN_EXPIRY = 2592000; // 30 days

  constructor() {
    this.oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.JWT_SECRET = process.env.JWT_SECRET || 'motk-development-secret';
  }

  // ------------------------------------------------------------------
  // OAuth flow
  // ------------------------------------------------------------------

  getAuthUrl(): string {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      prompt: 'consent',
    });
  }

  async handleCallback(code: string): Promise<{ tokens: AuthTokens; profile: UserProfile }> {
    const { tokens } = await this.oauthClient.getToken(code);
    this.oauthClient.setCredentials(tokens);

    const profile = await this.getUserProfile(tokens.access_token as string);
    const authTokens = await this.generateTokens(profile);
    return { tokens: authTokens, profile };
  }

  // ------------------------------------------------------------------
  // Google user‑info
  // ------------------------------------------------------------------

  private async getUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    // ▸ TS18046 対応: 明示的な型キャスト
    const data = (await response.json()) as GoogleUser;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  // ------------------------------------------------------------------
  // JWT tokens & sessions
  // ------------------------------------------------------------------

  private async generateTokens(profile: UserProfile): Promise<AuthTokens> {
    const sessionId = uuidv4();

    const payload: TokenPayload = {
      userId: profile.id,
      email: profile.email,
      sessionId,
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ sessionId }, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify({ profile, refreshToken }),
      'EX',
      this.REFRESH_TOKEN_EXPIRY
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    };
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const { sessionId } = jwt.verify(refreshToken, this.JWT_SECRET) as { sessionId: string };
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (!sessionData) return null;

      const { profile } = JSON.parse(sessionData);
      return this.generateTokens(profile);
    } catch (err) {
      console.error('Token refresh error:', err);
      return null;
    }
  }

  async logout(sessionId: string): Promise<boolean> {
    await this.redis.del(`session:${sessionId}`);
    return true;
  }

  // ------------------------------------------------------------------
  // Permission helpers (Redis‑backed stub)
  // ------------------------------------------------------------------

  async getUserProjectPermission(userId: string, projectId: string): Promise<string | null> {
    return this.redis.get(`permission:${userId}:${projectId}`);
  }

  async setUserProjectPermission(
    userId: string,
    projectId: string,
    permission: 'view' | 'edit' | 'admin'
  ): Promise<boolean> {
    await this.redis.set(`permission:${userId}:${projectId}`, permission);
    return true;
  }

  async removeUserProjectPermission(userId: string, projectId: string): Promise<boolean> {
    await this.redis.del(`permission:${userId}:${projectId}`);
    return true;
  }

  async checkEntityAccess(
    userId: string,
    projectId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<boolean> {
    const perm = await this.getUserProjectPermission(userId, projectId);
    return Boolean(perm); // naive: project access ⇒ entity access
  }
}

export const authService = new AuthService();
