import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const KNOWN_PASSWORD = 'KnownPassword123!';
const CREATED_PASSWORD = 'CreatedPassword456!';
const RESET_PASSWORD = 'ResetPassword789!';
const WEAK_PASSWORD = 'weak';
const RUN_ID = randomUUID();
const TEST_EMAIL_SUFFIX = `.${RUN_ID}.users-admin.test`;

type CreateTestUserOptions = {
  label: string;
  name: string;
  role: UserRole;
  password?: string;
  isActive?: boolean;
  requiresPasswordChange?: boolean;
  failedLoginAttempts?: number;
  lastFailedLoginAt?: Date | null;
};

type AdminState = {
  id: number;
  isActive: boolean;
};

type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: string;
};

function testEmail(label: string): string {
  return `${label}@${TEST_EMAIL_SUFFIX.slice(1)}`;
}

async function createTestUser(options: CreateTestUserOptions) {
  return getPrisma().user.create({
    data: {
      name: options.name,
      email: testEmail(options.label),
      role: options.role,
      isActive: options.isActive ?? true,
      passwordHash: await bcrypt.hash(options.password ?? KNOWN_PASSWORD, 10),
      requiresPasswordChange: options.requiresPasswordChange ?? false,
      failedLoginAttempts: options.failedLoginAttempts ?? 0,
      lastFailedLoginAt: options.lastFailedLoginAt ?? null,
      updatedAt: new Date(),
    },
  });
}

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
type LoginExpectation = Pick<
  TestUser,
  'id' | 'name' | 'email' | 'role' | 'requiresPasswordChange'
>;

async function loginAs(
  user: LoginExpectation,
  password: string = KNOWN_PASSWORD
): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password });

  expect(response.status).toBe(200);
  expect(response.body.user).toMatchObject({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    requiresPasswordChange: user.requiresPasswordChange,
  });
  expect(response.body.user).not.toHaveProperty('passwordHash');
  expect(response.body.user).not.toHaveProperty('failedLoginAttempts');
  expect(typeof response.body.token).toBe('string');
  expect(response.body.token.length).toBeGreaterThan(0);

  return response.body.token as string;
}

async function restoreAdminStates(states: AdminState[]): Promise<void> {
  if (states.length === 0) return;

  const prisma = getPrisma();
  await prisma.$transaction(
    states.map((state) =>
      prisma.user.update({
        where: { id: state.id },
        data: { isActive: state.isActive },
      })
    )
  );
}

describe.sequential('Administrator User Management API (Issue 7)', () => {
  let admin: TestUser;
  let secondAdmin: TestUser;
  let requester: TestUser;
  let staff: TestUser;
  let searchableRequester: TestUser;
  let inactiveStaff: TestUser;
  let updateTarget: TestUser;
  let duplicateSource: TestUser;
  let duplicateTarget: TestUser;
  let resetTarget: TestUser;
  let adminToken = '';
  let secondAdminToken = '';
  let requesterToken = '';
  let staffToken = '';
  let adminStatesToRestore: AdminState[] = [];

  beforeAll(async () => {
    admin = await createTestUser({
      label: 'administrator',
      name: 'Directory Administrator',
      role: UserRole.ADMIN,
    });
    secondAdmin = await createTestUser({
      label: 'second-administrator',
      name: 'Second Directory Administrator',
      role: UserRole.ADMIN,
    });
    requester = await createTestUser({
      label: 'requester',
      name: 'Access Requester',
      role: UserRole.REQUESTER,
    });
    staff = await createTestUser({
      label: 'staff',
      name: 'Access Staff',
      role: UserRole.IT_STAFF,
      requiresPasswordChange: true,
    });
    searchableRequester = await createTestUser({
      label: 'searchable',
      name: 'Case Search Requester',
      role: UserRole.REQUESTER,
    });
    inactiveStaff = await createTestUser({
      label: 'inactive-staff',
      name: 'Dormant Directory Staff',
      role: UserRole.IT_STAFF,
      isActive: false,
    });
    updateTarget = await createTestUser({
      label: 'update-source',
      name: 'Update Source Requester',
      role: UserRole.REQUESTER,
    });
    duplicateSource = await createTestUser({
      label: 'duplicate-source',
      name: 'Duplicate Source Requester',
      role: UserRole.REQUESTER,
    });
    duplicateTarget = await createTestUser({
      label: 'duplicate-target',
      name: 'Duplicate Target Requester',
      role: UserRole.REQUESTER,
    });
    resetTarget = await createTestUser({
      label: 'reset-target',
      name: 'Reset Password Requester',
      role: UserRole.REQUESTER,
      failedLoginAttempts: 4,
      lastFailedLoginAt: new Date('2026-01-02T03:04:05.000Z'),
    });

    staff = await getPrisma().user.update({
      where: { id: staff.id },
      data: { requiresPasswordChange: false },
    });

    adminToken = await loginAs(admin);
    secondAdminToken = await loginAs(secondAdmin);
    requesterToken = await loginAs(requester);
    staffToken = await loginAs(staff);
  });

  afterAll(async () => {
    const prisma = getPrisma();

    try {
      if (adminStatesToRestore.length > 0) {
        await restoreAdminStates(adminStatesToRestore);
      }
    } finally {
      const testUsers = await prisma.user.findMany({
        where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
        select: { id: true },
      });
      const testUserIds = testUsers.map((user) => user.id);

      if (testUserIds.length > 0) {
        await prisma.session.deleteMany({
          where: { userId: { in: testUserIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: testUserIds } },
        });
      }
    }
  });

  it('returns 401 for anonymous user-directory access', async () => {
    const response = await request(app).get('/api/admin/users');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('returns 403 for a REQUESTER', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  it('returns 403 for IT_STAFF after clearing the password-change requirement', async () => {
    expect(staff.requiresPasswordChange).toBe(false);

    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    expect(response.body.code).not.toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('returns 403 for every user-management mutation by non-admin roles', async () => {
    const responses = await Promise.all([
      request(app).post('/api/admin/users').set('Authorization', `Bearer ${requesterToken}`).send({}),
      request(app).patch(`/api/admin/users/${admin.id}`).set('Authorization', `Bearer ${requesterToken}`).send({ isActive: false }),
      request(app).post(`/api/admin/users/${admin.id}/reset-password`).set('Authorization', `Bearer ${requesterToken}`).send({ newInitialPassword: RESET_PASSWORD }),
      request(app).post('/api/admin/users').set('Authorization', `Bearer ${staffToken}`).send({}),
      request(app).patch(`/api/admin/users/${admin.id}`).set('Authorization', `Bearer ${staffToken}`).send({ isActive: false }),
      request(app).post(`/api/admin/users/${admin.id}/reset-password`).set('Authorization', `Bearer ${staffToken}`).send({ newInitialPassword: RESET_PASSWORD }),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    }
  });

  it('returns a safe user list without password or login-failure fields', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    const users = response.body as ApiUser[];
    for (const user of users) {
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('failedLoginAttempts');
    }

    expect(users.some((user) => user.id === searchableRequester.id)).toBe(true);
  });

  it('searches names and emails case-insensitively', async () => {
    const nameResponse = await request(app)
      .get('/api/admin/users')
      .query({ search: 'cAsE sEaRcH' })
      .set('Authorization', `Bearer ${adminToken}`);
    const emailResponse = await request(app)
      .get('/api/admin/users')
      .query({ search: searchableRequester.email.toUpperCase() })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(nameResponse.status).toBe(200);
    expect(emailResponse.status).toBe(200);
    expect(
      (nameResponse.body as ApiUser[]).some(
        (user) => user.id === searchableRequester.id
      )
    ).toBe(true);
    expect(
      (emailResponse.body as ApiUser[]).some(
        (user) => user.id === searchableRequester.id
      )
    ).toBe(true);
  });

  it('filters by role and includes inactive users', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .query({ role: UserRole.IT_STAFF })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const users = response.body as ApiUser[];
    expect(users.every((user) => user.role === UserRole.IT_STAFF)).toBe(true);
    expect(users.some((user) => user.id === staff.id)).toBe(true);
    expect(users.some((user) => user.id === inactiveStaff.id)).toBe(true);
    expect(
      users.find((user) => user.id === inactiveStaff.id)?.isActive
    ).toBe(false);
    expect(users.some((user) => user.id === requester.id)).toBe(false);
  });

  it('creates a normalized active user with a forced password change and bcrypt hash', async () => {
    const expectedName = 'Created Directory Operator';
    const expectedEmail = testEmail('created');
    const response = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `  ${expectedName}  `,
        email: `  ${expectedEmail.toUpperCase()}  `,
        role: UserRole.IT_STAFF,
        initialPassword: CREATED_PASSWORD,
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe(expectedName);
    expect(response.body.email).toBe(expectedEmail);
    expect(response.body.role).toBe(UserRole.IT_STAFF);
    expect(response.body.isActive).toBe(true);
    expect(response.body.requiresPasswordChange).toBe(true);
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('failedLoginAttempts');

    const storedUser = await getPrisma().user.findUniqueOrThrow({
      where: { email: expectedEmail },
    });
    expect(storedUser.name).toBe(expectedName);
    expect(storedUser.email).toBe(expectedEmail);
    expect(storedUser.role).toBe(UserRole.IT_STAFF);
    expect(storedUser.isActive).toBe(true);
    expect(storedUser.requiresPasswordChange).toBe(true);
    expect(storedUser.failedLoginAttempts).toBe(0);
    expect(storedUser.passwordHash).not.toBe(CREATED_PASSWORD);
    expect(await bcrypt.compare(CREATED_PASSWORD, storedUser.passwordHash)).toBe(
      true
    );

    const createdToken = await loginAs(storedUser, CREATED_PASSWORD);
    expect(createdToken.length).toBeGreaterThan(0);
  });

  it('returns 409 for a mixed-case duplicate email on create', async () => {
    const response = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Create Requester',
        email: updateTarget.email.toUpperCase(),
        role: UserRole.REQUESTER,
        initialPassword: CREATED_PASSWORD,
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');

    const matches = await getPrisma().user.findMany({
      where: {
        email: { equals: updateTarget.email, mode: 'insensitive' },
      },
      select: { id: true },
    });
    expect(matches).toEqual([{ id: updateTarget.id }]);
  });

  it('persists normalized user updates', async () => {
    const expectedName = 'Updated Directory User';
    const expectedEmail = testEmail('updated-target');
    const response = await request(app)
      .patch(`/api/admin/users/${updateTarget.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `  ${expectedName}  `,
        email: expectedEmail.toUpperCase(),
        role: UserRole.IT_STAFF,
        isActive: false,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: updateTarget.id,
      name: expectedName,
      email: expectedEmail,
      role: UserRole.IT_STAFF,
      isActive: false,
      requiresPasswordChange: false,
    });
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('failedLoginAttempts');

    const storedUser = await getPrisma().user.findUniqueOrThrow({
      where: { id: updateTarget.id },
    });
    expect(storedUser.name).toBe(expectedName);
    expect(storedUser.email).toBe(expectedEmail);
    expect(storedUser.role).toBe(UserRole.IT_STAFF);
    expect(storedUser.isActive).toBe(false);
  });

  it('returns 409 for a mixed-case duplicate email on update', async () => {
    const response = await request(app)
      .patch(`/api/admin/users/${duplicateSource.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: duplicateTarget.email.toUpperCase() });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');

    const storedUser = await getPrisma().user.findUniqueOrThrow({
      where: { id: duplicateSource.id },
    });
    expect(storedUser.email).toBe(duplicateSource.email);
    expect(storedUser.name).toBe(duplicateSource.name);
    expect(storedUser.role).toBe(duplicateSource.role);
    expect(storedUser.isActive).toBe(duplicateSource.isActive);
  });

  it('returns 422 when an administrator tries to deactivate their own account', async () => {
    const response = await request(app)
      .patch(`/api/admin/users/${admin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Unprocessable Entity');
    expect(response.body.message).toBe('You cannot deactivate your own account');

    const storedAdmin = await getPrisma().user.findUniqueOrThrow({
      where: { id: admin.id },
    });
    expect(storedAdmin.isActive).toBe(true);
    expect(storedAdmin.role).toBe(UserRole.ADMIN);
  });

  it('returns 422 when the last active administrator would be demoted', async () => {
    adminStatesToRestore = await getPrisma().user.findMany({
      where: {
        role: UserRole.ADMIN,
        id: { notIn: [admin.id, secondAdmin.id] },
      },
      select: { id: true, isActive: true },
    });
    const activeAdminIds = adminStatesToRestore
      .filter((state) => state.isActive)
      .map((state) => state.id);

    try {
      if (activeAdminIds.length > 0) {
        await getPrisma().user.updateMany({
          where: { id: { in: activeAdminIds } },
          data: { isActive: false },
        });
      }
      await getPrisma().user.update({
        where: { id: secondAdmin.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .patch(`/api/admin/users/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.REQUESTER });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Unprocessable Entity');
      expect(response.body.message).toBe(
        'Cannot deactivate or demote the last active Administrator'
      );

      const storedAdmin = await getPrisma().user.findUniqueOrThrow({
        where: { id: admin.id },
      });
      expect(storedAdmin.role).toBe(UserRole.ADMIN);
      expect(storedAdmin.isActive).toBe(true);
    } finally {
      await restoreAdminStates(adminStatesToRestore);
      await getPrisma().user.update({
        where: { id: admin.id },
        data: { role: UserRole.ADMIN, isActive: true },
      });
      await getPrisma().user.update({
        where: { id: secondAdmin.id },
        data: { role: UserRole.ADMIN, isActive: true },
      });
      adminStatesToRestore = [];
    }
  });

  it('keeps an active Administrator when concurrent demotions race', async () => {
    adminStatesToRestore = await getPrisma().user.findMany({
      where: {
        role: UserRole.ADMIN,
        id: { notIn: [admin.id, secondAdmin.id] },
      },
      select: { id: true, isActive: true },
    });
    const externalAdminIds = adminStatesToRestore
      .filter((state) => state.isActive)
      .map((state) => state.id);

    try {
      if (externalAdminIds.length > 0) {
        await getPrisma().user.updateMany({
          where: { id: { in: externalAdminIds } },
          data: { isActive: false },
        });
      }
      await getPrisma().user.updateMany({
        where: { id: { in: [admin.id, secondAdmin.id] } },
        data: { role: UserRole.ADMIN, isActive: true },
      });

      const responses = await Promise.all([
        request(app)
          .patch(`/api/admin/users/${secondAdmin.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: UserRole.REQUESTER }),
        request(app)
          .patch(`/api/admin/users/${admin.id}`)
          .set('Authorization', `Bearer ${secondAdminToken}`)
          .send({ role: UserRole.REQUESTER }),
      ]);
      const statuses = responses.map((response) => response.status);

      expect(statuses).toContain(200);
      expect(statuses.every((status) => [200, 403, 422].includes(status))).toBe(true);
      const activeAdminCount = await getPrisma().user.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });
      expect(activeAdminCount).toBeGreaterThanOrEqual(1);
    } finally {
      await restoreAdminStates(adminStatesToRestore);
      await getPrisma().user.updateMany({
        where: { id: { in: [admin.id, secondAdmin.id] } },
        data: { role: UserRole.ADMIN, isActive: true },
      });
      adminStatesToRestore = [];
    }
  });

  it('returns 400 for a weak password reset and preserves the existing state', async () => {
    const before = await getPrisma().user.findUniqueOrThrow({
      where: { id: resetTarget.id },
    });
    const response = await request(app)
      .post(`/api/admin/users/${resetTarget.id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newInitialPassword: WEAK_PASSWORD });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'newInitialPassword' }),
      ])
    );

    const after = await getPrisma().user.findUniqueOrThrow({
      where: { id: resetTarget.id },
    });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.requiresPasswordChange).toBe(false);
    expect(after.failedLoginAttempts).toBe(4);
    expect(after.lastFailedLoginAt).toEqual(before.lastFailedLoginAt);
  });

  it('resets a password, requires a change, and clears failure counters', async () => {
    const response = await request(app)
      .post(`/api/admin/users/${resetTarget.id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newInitialPassword: RESET_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Initial password reset successfully');
    expect(response.body.requiresPasswordChange).toBe(true);

    const storedUser = await getPrisma().user.findUniqueOrThrow({
      where: { id: resetTarget.id },
    });
    expect(storedUser.requiresPasswordChange).toBe(true);
    expect(storedUser.failedLoginAttempts).toBe(0);
    expect(storedUser.lastFailedLoginAt).toBeNull();
    expect(storedUser.passwordHash).not.toBe(resetTarget.passwordHash);
    expect(await bcrypt.compare(RESET_PASSWORD, storedUser.passwordHash)).toBe(
      true
    );
    expect(await bcrypt.compare(KNOWN_PASSWORD, storedUser.passwordHash)).toBe(
      false
    );

    const resetToken = await loginAs(storedUser, RESET_PASSWORD);
    expect(resetToken.length).toBeGreaterThan(0);
  });
});
