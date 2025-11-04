import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { logWarn } from '../utils/logger';
import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Middleware to require Bearer token authentication
 */
export function requireBearerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logWarn('Missing Authorization header', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logWarn('Invalid Authorization header format', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected: Bearer <token>',
    });
    return;
  }

  const token = parts[1];
  const expectedToken = config.security.sendMenuBearer;

  if (!constantTimeCompare(token, expectedToken)) {
    logWarn('Invalid bearer token', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid bearer token',
    });
    return;
  }

  // Token is valid, proceed to next middleware
  next();
}
