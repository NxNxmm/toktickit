import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

describe('Auth API Integration Tests (Lab 3 Issue 3 - AC-3.1 to AC-3.4)', () => {
  const activeRequesterEmail = 'jennifer.anderson@kmutt.ac.th';
  const inactiveUserEmail = 'robert.taylor@kmutt.ac.th';
  const staffWithPasswordChangeEmail = 'alex.turner@toktickit.kmutt.ac.th';
  const validPassword = 'Password123!';

  beforeEach(async () => {
    const hash = await bcrypt.hash(validPassword, 10);
    await getPrisma().user.updateMany({
      where: { email: staffWithPasswordChangeEmail },
      data: {
        passwordHash: hash,
        requiresPasswordChange: true,
      },
    });
  });

  afterAll(async () => {
    const hash = await bcrypt.hash(validPassword, 10);
    await getPrisma().user.updateMany({
      where: { email: staffWithPasswordChangeEmail },
      data: {
        passwordHash: hash,
        requiresPasswordChange: true,
      },
    });
  });

  // ─── API-01: Valid user login ───────────────────────────────────────────────
  it('API-01 (FR-01, BR-01, AC-3.1): Valid user login returns 200 with safe user object, token, and session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: activeRequesterEmail, password: validPassword });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');

    const user = res.body.user;
    expect(user.email).toBe(activeRequesterEmail);
    expect(user.name).toBe('Jennifer Anderson');
    expect(user.role).toBe('REQUESTER');
    expect(user.requiresPasswordChange).toBe(false);

    // Verify sensitive properties are omitted
    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('failedLoginAttempts');

    // Verify Set-Cookie header contains toktickit_session
    const rawCookies = res.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    expect(cookies.length).toBeGreaterThan(0);
    const sessionCookie = cookies.find((c: string) => c.includes('toktickit_session'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
  });

  // ─── API-02: Inactive account login ────────────────────────────────────────
  it('API-02 (BR-01, BR-04, AC-3.1): Inactive account login returns 401 with generic safe message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: inactiveUserEmail, password: validPassword });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.message).toBe('Invalid email or password');
  });

  // ─── API-03: Invalid credentials login ─────────────────────────────────────
  it('API-03 (BR-04, AC-3.1): Invalid credentials login returns 401 generic message', async () => {
    // Non-existent email
    const resUnknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent.user@kmutt.ac.th', password: validPassword });

    expect(resUnknown.status).toBe(401);
    expect(resUnknown.body.message).toBe('Invalid email or password');

    // Wrong password for existing user
    const resWrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email: activeRequesterEmail, password: 'WrongPassword999!' });

    expect(resWrongPass.status).toBe(401);
    expect(resWrongPass.body.message).toBe('Invalid email or password');
  });

  // ─── API-04: Current user retrieval (/me) ──────────────────────────────────
  it('API-04 (FR-03, AC-3.2): GET /api/auth/me returns authenticated profile matching session', async () => {
    // 1. Unauthenticated call fails with 401
    const unauthRes = await request(app).get('/api/auth/me');
    expect(unauthRes.status).toBe(401);

    // 2. Login to obtain token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: activeRequesterEmail, password: validPassword });
    const token = loginRes.body.token;

    // 3. Authenticated call with Bearer token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(activeRequesterEmail);
    expect(meRes.body.name).toBe('Jennifer Anderson');
    expect(meRes.body.role).toBe('REQUESTER');
    expect(meRes.body.requiresPasswordChange).toBe(false);

    // 4. Authenticated call with session cookie
    const cookies = loginRes.headers['set-cookie'];
    const cookieRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(cookieRes.status).toBe(200);
    expect(cookieRes.body.email).toBe(activeRequesterEmail);
  });

  // ─── API-05: Session termination (Logout) ──────────────────────────────────
  it('API-05 (FR-03, AC-3.2): POST /api/auth/logout invalidates session and clears cookie; subsequent /me returns 401', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: activeRequesterEmail, password: validPassword });
    const token = loginRes.body.token;

    // 2. Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out successfully');

    // 3. Subsequent /me call with same token must return 401
    const meAfterLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meAfterLogout.status).toBe(401);
  });

  // ─── API-06: Mandatory password change enforcement ─────────────────────────
  it('API-06 (FR-02, BR-02, AC-3.3): User with requiresPasswordChange=true is blocked from operational endpoints with 403 PASSWORD_CHANGE_REQUIRED', async () => {
    // 1. Login with user requiring password change (Alex Turner)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: staffWithPasswordChangeEmail, password: validPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.requiresPasswordChange).toBe(true);
    const token = loginRes.body.token;

    // 2. Accessing operational endpoint (e.g., /api/tickets) returns 403 PASSWORD_CHANGE_REQUIRED
    const ticketsRes = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${token}`);

    expect(ticketsRes.status).toBe(403);
    expect(ticketsRes.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

    // 3. Permitted endpoints (/api/auth/me, /api/auth/logout, /api/auth/change-password) remain accessible
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
  });

  // ─── API-07: Update password via change-password API ───────────────────────
  it('API-07 (FR-02, BR-03, AC-3.4): POST /api/auth/change-password enforces strong password rules and updates status', async () => {
    // 1. Login with Alex Turner
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: staffWithPasswordChangeEmail, password: validPassword });
    const token = loginRes.body.token;

    // 2. Reject weak new password (< 8 chars, or missing symbol/number/case)
    const weakPassRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: validPassword,
        newPassword: 'weak',
      });
    expect(weakPassRes.status).toBe(400);

    // 3. Reject incorrect current password
    const wrongCurrentRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'IncorrectOldPassword123!',
        newPassword: 'BrandNewSecurePass123!',
      });
    expect(wrongCurrentRes.status).toBe(400);

    // 4. Reject same new password as current password
    const samePassRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: validPassword,
        newPassword: validPassword,
      });
    expect(samePassRes.status).toBe(400);

    // 5. Successfully change password
    const newPass = 'UpdatedSecurePass2026!';
    const successRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: validPassword,
        newPassword: newPass,
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.requiresPasswordChange).toBe(false);

    // 6. Verify login works with the new password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: staffWithPasswordChangeEmail, password: newPass });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.user.requiresPasswordChange).toBe(false);

    // 7. Reset password back so other test runs remain idempotent
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${newLoginRes.body.token}`)
      .send({
        currentPassword: newPass,
        newPassword: validPassword,
      });
  });
});
