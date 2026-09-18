import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getPrisma } from '../prisma.js';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  requiresPasswordChange: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
      sessionId?: number;
    }
  }
}

/**
 * Helper to extract session token from Authorization header or toktickit_session cookie.
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)toktickit_session=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Hash raw token for secure database lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Resolves current session and attaches user to req.user if valid.
 */
export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const tokenHash = hashToken(token);
    const session = await getPrisma().session.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!session) {
      return next();
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      // Session expired, optionally clean up
      await getPrisma().session.delete({ where: { id: session.id } }).catch(() => { });
      return next();
    }

    // Check user active status
    if (!session.user || !session.user.isActive) {
      return next();
    }

    const requiresPasswordChange = Boolean(session.user.requiresPasswordChange);

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      requiresPasswordChange,
    };
    req.sessionToken = token;
    req.sessionId = session.id;

    return next();
  } catch (error) {
    console.error('Error authenticating session:', error);
    return next();
  }
}

/**
 * Middleware guarding endpoints that require authentication.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required to access this resource',
      timestamp: new Date().toISOString(),
    });
  }
  return next();
}

/**
 * Enforces First-Login Constraint per api-spec.md §1.1 / BR-02:
 * If requiresPasswordChange = true, calls outside of /api/auth/me, /api/auth/logout,
 * and /api/auth/change-password return HTTP 403 Forbidden with error code PASSWORD_CHANGE_REQUIRED.
 */
export function enforcePasswordChangePolicy(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next();
  }

  if (req.user.requiresPasswordChange) {
    const allowedEndpoints = [
      '/api/auth/me',
      '/api/auth/logout',
      '/api/auth/change-password',
      '/auth/me',
      '/auth/logout',
      '/auth/change-password',
    ];

    const currentPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    const isAllowed = allowedEndpoints.some((endpoint) => currentPath.endsWith(endpoint));

    if (!isAllowed) {
      return res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Password change is required before accessing application resources',
        code: 'PASSWORD_CHANGE_REQUIRED',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return next();
}
