import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { getPrisma } from '../prisma.js';
import { validatePassword } from '../utils/passwordPolicy.js';

const roles: UserRole[] = [UserRole.REQUESTER, UserRole.IT_STAFF, UserRole.ADMIN];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationDetail = {
  field: string;
  message: string;
};

class AdminUserRequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly error: string,
    message: string,
    readonly details: ValidationDetail[] = []
  ) {
    super(message);
  }
}

type AdminUserRecord = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: Date;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  requiresPasswordChange: true,
  createdAt: true,
} as const;

function errorResponse(
  res: Response,
  statusCode: number,
  error: string,
  message: string,
  details: ValidationDetail[] = []
) {
  return res.status(statusCode).json({
    statusCode,
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
}

function adminForbidden(res: Response) {
  return errorResponse(
    res,
    403,
    'Forbidden',
    'Administrator access is required to manage user accounts'
  );
}

function validationError(res: Response, message: string, details: ValidationDetail[]) {
  return errorResponse(res, 400, 'Bad Request', message, details);
}

function conflictResponse(res: Response) {
  return errorResponse(
    res,
    409,
    'Conflict',
    'A user account with this email address already exists.',
    [{ field: 'email', message: 'Email address already in use' }]
  );
}

function parseUserId(value: string | undefined): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function serializeUser(user: AdminUserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    requiresPasswordChange: user.requiresPasswordChange,
    createdAt: user.createdAt,
  };
}

function isValidRole(value: unknown): value is UserRole {
  return typeof value === 'string' && roles.includes(value as UserRole);
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002';
}

function isAdminRequest(req: Request, res: Response): boolean {
  if (req.user?.role !== 'ADMIN') {
    adminForbidden(res);
    return false;
  }
  return true;
}

function validateName(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Full name is required';
  }
  if (value.trim().length > 100) {
    return 'Full name must be 100 characters or fewer';
  }
  return null;
}

function validateEmail(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Email address is required';
  }
  const email = normalizeEmail(value);
  if (email.length > 254 || !emailPattern.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

function validateInitialPassword(
  value: unknown,
  field: 'initialPassword' | 'newInitialPassword'
): ValidationDetail[] {
  if (typeof value !== 'string' || value.length === 0) {
    return [{ field, message: 'Initial password is required' }];
  }
  const result = validatePassword(value);
  return result.errors.map((message) => ({ field, message }));
}

export const getAdminUsers = async (req: Request, res: Response) => {
  if (!isAdminRequest(req, res)) return;

  try {
    const searchValue = req.query.search;
    const roleValue = req.query.role;
    const details: ValidationDetail[] = [];

    if (searchValue !== undefined && typeof searchValue !== 'string') {
      details.push({ field: 'search', message: 'Search must be a string' });
    }

    if (roleValue !== undefined && roleValue !== '' && !isValidRole(roleValue)) {
      details.push({ field: 'role', message: 'Role must be REQUESTER, IT_STAFF, or ADMIN' });
    }

    if (details.length > 0) {
      return validationError(res, 'Invalid user directory query', details);
    }

    const search = typeof searchValue === 'string' ? searchValue.trim() : '';
    const role = typeof roleValue === 'string' && roleValue !== '' ? (roleValue as UserRole) : undefined;
    const where: Prisma.userWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const users = await getPrisma().user.findMany({
      where,
      select: userSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return res.status(200).json(users.map(serializeUser));
  } catch (error) {
    console.error('Error fetching administrator users:', error);
    return errorResponse(res, 500, 'Internal Server Error', 'Internal server error while fetching users');
  }
};

export const createAdminUser = async (req: Request, res: Response) => {
  if (!isAdminRequest(req, res)) return;

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const details: ValidationDetail[] = [];
  const nameError = validateName(body.name);
  const emailError = validateEmail(body.email);
  const roleError = isValidRole(body.role) ? null : 'Role must be REQUESTER, IT_STAFF, or ADMIN';
  const passwordDetails = validateInitialPassword(body.initialPassword, 'initialPassword');

  if (nameError) details.push({ field: 'name', message: nameError });
  if (emailError) details.push({ field: 'email', message: emailError });
  if (roleError) details.push({ field: 'role', message: roleError });
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    details.push({ field: 'isActive', message: 'isActive must be a boolean' });
  }
  details.push(...passwordDetails);

  if (details.length > 0) {
    return validationError(res, 'Validation failed on user creation', details);
  }

  const email = normalizeEmail(body.email);

  try {
    const existing = await getPrisma().user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existing) {
      return conflictResponse(res);
    }

    const passwordHash = await bcrypt.hash(body.initialPassword, 10);
    const user = await getPrisma().user.create({
      data: {
        name: body.name.trim(),
        email,
        role: body.role as UserRole,
        isActive: body.isActive === undefined ? true : body.isActive,
        passwordHash,
        requiresPasswordChange: true,
        updatedAt: new Date(),
      },
      select: userSelect,
    });

    return res.status(201).json(serializeUser(user));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflictResponse(res);
    }
    console.error('Error creating administrator user:', error);
    return errorResponse(res, 500, 'Internal Server Error', 'Internal server error while creating user');
  }
};

export const updateAdminUser = async (req: Request, res: Response) => {
  if (!isAdminRequest(req, res)) return;

  const userId = parseUserId(req.params.id);
  if (userId === null) {
    return validationError(res, 'Invalid user ID', [{ field: 'id', message: 'User ID must be a positive integer' }]);
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasEmail = Object.prototype.hasOwnProperty.call(body, 'email');
  const hasRole = Object.prototype.hasOwnProperty.call(body, 'role');
  const hasIsActive = Object.prototype.hasOwnProperty.call(body, 'isActive');

  if (!hasName && !hasEmail && !hasRole && !hasIsActive) {
    return validationError(res, 'At least one user field must be provided', [
      { field: 'user', message: 'Provide name, email, role, or isActive' },
    ]);
  }

  const details: ValidationDetail[] = [];
  if (hasName) {
    const nameError = validateName(body.name);
    if (nameError) details.push({ field: 'name', message: nameError });
  }
  if (hasEmail) {
    const emailError = validateEmail(body.email);
    if (emailError) details.push({ field: 'email', message: emailError });
  }
  if (hasRole && !isValidRole(body.role)) {
    details.push({ field: 'role', message: 'Role must be REQUESTER, IT_STAFF, or ADMIN' });
  }
  if (hasIsActive && typeof body.isActive !== 'boolean') {
    details.push({ field: 'isActive', message: 'isActive must be a boolean' });
  }

  if (details.length > 0) {
    return validationError(res, 'Validation failed on user update', details);
  }

  try {
    const updated = await getPrisma().$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(917364821)`;

      const target = await transaction.user.findUnique({ where: { id: userId } });
      if (!target) {
        throw new AdminUserRequestError(404, 'Not Found', 'User not found');
      }

      const nextRole = hasRole ? (body.role as UserRole) : target.role;
      const nextIsActive = hasIsActive ? body.isActive : target.isActive;

      if (target.id === req.user!.id && nextIsActive === false) {
        throw new AdminUserRequestError(
          422,
          'Unprocessable Entity',
          'You cannot deactivate your own account',
          [{ field: 'isActive', message: 'Self-deactivation is not permitted' }]
        );
      }

      if (target.role === UserRole.ADMIN && target.isActive && (nextRole !== UserRole.ADMIN || !nextIsActive)) {
        const activeAdminCount = await transaction.user.count({
          where: { role: UserRole.ADMIN, isActive: true },
        });
        if (activeAdminCount <= 1) {
          throw new AdminUserRequestError(
            422,
            'Unprocessable Entity',
            'Cannot deactivate or demote the last active Administrator',
            [{ field: nextRole !== UserRole.ADMIN ? 'role' : 'isActive', message: 'At least one active Administrator is required' }]
          );
        }
      }

      const email = hasEmail ? normalizeEmail(body.email) : undefined;
      if (email) {
        const existing = await transaction.user.findFirst({
          where: {
            id: { not: userId },
            email: { equals: email, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (existing) {
          throw new AdminUserRequestError(409, 'Conflict', 'A user account with this email address already exists.', [
            { field: 'email', message: 'Email address already in use' },
          ]);
        }
      }

      const data: {
        name?: string;
        email?: string;
        role?: UserRole;
        isActive?: boolean;
        updatedAt: Date;
      } = { updatedAt: new Date() };

      if (hasName) data.name = body.name.trim();
      if (hasEmail) data.email = email;
      if (hasRole) data.role = body.role as UserRole;
      if (hasIsActive) data.isActive = body.isActive;

      return transaction.user.update({
        where: { id: userId },
        data,
        select: userSelect,
      });
    });

    return res.status(200).json(serializeUser(updated));
  } catch (error) {
    if (error instanceof AdminUserRequestError) {
      return errorResponse(res, error.statusCode, error.error, error.message, error.details);
    }
    if (isUniqueConstraintError(error)) {
      return conflictResponse(res);
    }
    console.error('Error updating administrator user:', error);
    return errorResponse(res, 500, 'Internal Server Error', 'Internal server error while updating user');
  }
};

export const resetAdminUserPassword = async (req: Request, res: Response) => {
  if (!isAdminRequest(req, res)) return;

  const userId = parseUserId(req.params.id);
  if (userId === null) {
    return validationError(res, 'Invalid user ID', [{ field: 'id', message: 'User ID must be a positive integer' }]);
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const passwordDetails = validateInitialPassword(body.newInitialPassword, 'newInitialPassword');
  if (passwordDetails.length > 0) {
    return validationError(res, 'Validation failed on password reset', passwordDetails);
  }

  try {
    const target = await getPrisma().user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) {
      return errorResponse(res, 404, 'Not Found', 'User not found');
    }

    const passwordHash = await bcrypt.hash(body.newInitialPassword, 10);
    await getPrisma().user.update({
      where: { id: userId },
      data: {
        passwordHash,
        requiresPasswordChange: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: 'Initial password reset successfully',
      requiresPasswordChange: true,
    });
  } catch (error) {
    console.error('Error resetting administrator user password:', error);
    return errorResponse(res, 500, 'Internal Server Error', 'Internal server error while resetting password');
  }
};
