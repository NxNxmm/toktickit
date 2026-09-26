import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPrisma } from '../prisma.js';
import { validatePassword } from '../utils/passwordPolicy.js';
import { hashToken, extractToken } from '../middleware/auth.middleware.js';

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'email and password are required',
        timestamp: new Date().toISOString(),
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await getPrisma().user.findUnique({
      where: { email: trimmedEmail },
    });

    // Return 401 for non-existent or inactive accounts (do not leak which - BR-04)
    if (!user || !user.isActive) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString(),
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      // Increment failed login counter
      await getPrisma().user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
          lastFailedLoginAt: new Date(),
        },
      });
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString(),
      });
    }

    // Reset failed login counter on success
    await getPrisma().user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lastFailedLoginAt: null },
    });

    // Generate secure session token (AC-3.1, api-spec.md §1.1)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await getPrisma().session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Set secure HTTP-only session cookie
    res.cookie('toktickit_session', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    const requiresPasswordChange = Boolean(user.requiresPasswordChange);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        requiresPasswordChange,
      },
      token: rawToken,
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error during login',
      timestamp: new Date().toISOString(),
    });
  }
};

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid session',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      requiresPasswordChange: req.user.requiresPasswordChange,
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error fetching user profile',
      timestamp: new Date().toISOString(),
    });
  }
};

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
export const logout = async (req: Request, res: Response) => {
  try {
    const rawToken = req.sessionToken || extractToken(req);

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await getPrisma().session.deleteMany({
        where: { tokenHash },
      }).catch(() => {});
    } else if (req.sessionId) {
      await getPrisma().session.delete({
        where: { id: req.sessionId },
      }).catch(() => {});
    }

    // Clear session cookie
    res.clearCookie('toktickit_session', { path: '/' });

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error during logout',
      timestamp: new Date().toISOString(),
    });
  }
};

// ─── POST /api/auth/change-password ──────────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Target user is derived strictly from the verified authenticated session (BR-05:
    // any client-supplied userId in the body is ignored).
    const targetUserId = req.user?.id;

    if (!targetUserId) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required to change password',
        timestamp: new Date().toISOString(),
      });
    }

    if (typeof currentPassword !== 'string' || !currentPassword) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'currentPassword is required',
        timestamp: new Date().toISOString(),
      });
    }

    if (typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'newPassword is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate password complexity per BR-03 and AC-3.4
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: validation.errors[0] || 'Password does not meet complexity requirements',
        details: validation.errors,
        timestamp: new Date().toISOString(),
      });
    }

    const user = await getPrisma().user.findUnique({
      where: { id: targetUserId },
    });

    if (!user || !user.isActive) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found or inactive',
        timestamp: new Date().toISOString(),
      });
    }

    const currentMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatch) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Current password is incorrect',
        timestamp: new Date().toISOString(),
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'New password must differ from the current password',
        timestamp: new Date().toISOString(),
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await getPrisma().user.update({
      where: { id: targetUserId },
      data: {
        passwordHash: newHash,
        requiresPasswordChange: false,
      },
    });

    return res.status(200).json({
      message: 'Password updated successfully',
      requiresPasswordChange: false,
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error during password change',
      timestamp: new Date().toISOString(),
    });
  }
};
