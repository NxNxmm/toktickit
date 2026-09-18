import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../prisma.js';

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'email and password are required',
            });
        }

        const user = await getPrisma().user.findUnique({
            where: { email: email.trim().toLowerCase() },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                mustChangePassword: true,
                passwordHash: true,
                failedLoginAttempts: true,
            },
        });

        // Return 401 for non-existent or inactive accounts (do not leak which)
        if (!user || !user.isActive) {
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Invalid email or password',
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            // Increment failed login counter
            await getPrisma().user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: user.failedLoginAttempts + 1,
                    lastFailedLoginAt: new Date(),
                },
            });
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Invalid email or password',
            });
        }

        // Reset failed login counter on success
        await getPrisma().user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lastFailedLoginAt: null },
        });

        // Omit passwordHash from response
        const { passwordHash: _omit, failedLoginAttempts: _fa, ...userPayload } = user;

        return res.status(200).json({
            user: {
                ...userPayload,
                requiresPasswordChange: user.mustChangePassword,
            },
            mustChangePassword: user.mustChangePassword,
            requiresPasswordChange: user.mustChangePassword,
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error during login',
        });
    }
};

// ─── PATCH /api/auth/change-password ────────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        const numUserId = Number(userId);
        if (!userId || isNaN(numUserId)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'userId is required and must be a valid number',
            });
        }

        if (typeof currentPassword !== 'string' || !currentPassword) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'currentPassword is required',
            });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'newPassword must be at least 8 characters',
            });
        }

        const user = await getPrisma().user.findUnique({
            where: { id: numUserId },
            select: { id: true, passwordHash: true, isActive: true },
        });

        if (!user || !user.isActive) {
            return res.status(404).json({
                statusCode: 404,
                error: 'Not Found',
                message: 'User not found or inactive',
            });
        }

        const currentMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!currentMatch) {
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Current password is incorrect',
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'New password must differ from the current password',
            });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await getPrisma().user.update({
            where: { id: numUserId },
            data: {
                passwordHash: newHash,
                mustChangePassword: false,
            },
        });

        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error during password change',
        });
    }
};
