import jwt from 'jsonwebtoken';
import { config } from '../config';

export function generateAccessToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId },
    config.jwt.secret as string,
    { expiresIn: config.jwt.expiresIn as any }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId },
    config.jwt.refreshSecret as string,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  );
}

export function verifyAccessToken(token: string): any {
  return jwt.verify(token, config.jwt.secret);
}

export function verifyRefreshToken(token: string): any {
  return jwt.verify(token, config.jwt.refreshSecret);
}
