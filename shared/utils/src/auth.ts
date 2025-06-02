import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

export interface TokenPayload {
  sub: string; // user ID
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  businessId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateTokens(payload: TokenPayload, secret: string): TokenPair {
    const accessToken = jwt.sign(payload, secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'slotwise-auth-service',
      audience: 'slotwise-platform'
    });

    const refreshToken = jwt.sign(
      { sub: payload.sub, type: 'refresh' },
      secret,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
        issuer: 'slotwise-auth-service',
        audience: 'slotwise-platform'
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  static verifyToken(token: string, secret: string): TokenPayload {
    return jwt.verify(token, secret, {
      issuer: 'slotwise-auth-service',
      audience: 'slotwise-platform'
    }) as TokenPayload;
  }

  static generateSessionId(): string {
    return nanoid(32);
  }

  static generateResetToken(): string {
    return nanoid(64);
  }

  static generateVerificationToken(): string {
    return nanoid(32);
  }
}
