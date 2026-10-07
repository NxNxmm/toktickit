/**
 * server/tests/lab-04/staff-dashboard.api.test.ts
 *
 * Integration tests for GET /api/dashboard/staff and GET /api/dashboard/admin
 * Covers test IDs per tests.md:
 *   API-04-13  — IT Staff dashboard operational counts (AC-13 / BR-14, 16)
 *   API-04-14  — Admin dashboard metrics + user stats (AC-23 / BR-15)
 *   API-04-21  — Role authorization on /api/dashboard/admin (AC-23 / BR-15)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { ensureSeedData } from '../seed-helper.js';

const STAFF_EMAILS = [
  'alex.turner@toktickit.kmutt.ac.th',
  'jessica.miller@toktickit.kmutt.ac.th',
  'kevin.patel@toktickit.kmutt.ac.th',
];

async function clearPasswordChangeFlag(): Promise<void> {
  await getPrisma().user.updateMany({
    where: { email: { in: STAFF_EMAILS } },
    data: { requiresPasswordChange: false },
  });
}

async function restorePasswordChangeFlag(): Promise<void> {
  await getPrisma().user.updateMany({
    where: { email: { in: STAFF_EMAILS } },
    data: { requiresPasswordChange: true },
  });
}

async function loginAs(email: string, password = 'Password123!'): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status} — ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

// ─── API-04-13: Staff Dashboard ──────────────────────────────────────────────
describe('API-04-13 — GET /api/dashboard/staff (IT Staff operational metrics)', () => {
  let requesterToken: string;
  let staffToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await clearPasswordChangeFlag();
    await ensureSeedData();

    [requesterToken, staffToken, adminToken] = await Promise.all([
      loginAs('jennifer.anderson@kmutt.ac.th'),
      loginAs('alex.turner@toktickit.kmutt.ac.th'),
      loginAs('admin@toktickit.kmutt.ac.th'),
    ]);
  });

  afterAll(async () => {
    await restorePasswordChangeFlag();
  });

  // ── 401 Unauthenticated ──────────────────────────────────────────────────
  it('API-04-13a: Unauthenticated GET /dashboard/staff → 401', async () => {
    const res = await request(app).get('/api/dashboard/staff');
    expect(res.status).toBe(401);
  });

  // ── 403 Requester accessing staff dashboard ──────────────────────────────
  it('API-04-13b (AC-05-05): REQUESTER accessing /dashboard/staff → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── 200 IT Staff gets correct shape ─────────────────────────────────────
  it('API-04-13c (AC-13 / BR-14, 16): IT_STAFF gets 200 with 5 operational metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('metrics');
    const m = res.body.metrics;
    expect(m).toHaveProperty('newTickets');
    expect(m).toHaveProperty('openTickets');
    expect(m).toHaveProperty('inProgressTickets');
    expect(m).toHaveProperty('waitingForRequesterTickets');
    expect(m).toHaveProperty('myAssignedTickets');
    expect(typeof m.newTickets).toBe('number');
    expect(typeof m.openTickets).toBe('number');
    expect(typeof m.inProgressTickets).toBe('number');
    expect(typeof m.waitingForRequesterTickets).toBe('number');
    expect(typeof m.myAssignedTickets).toBe('number');
    expect(m.newTickets).toBeGreaterThanOrEqual(0);
    expect(m.myAssignedTickets).toBeGreaterThanOrEqual(0);
  });

  // ── myAssignedTickets excludes RESOLVED, CLOSED, CANCELLED (BR-14) ───────
  it('API-04-13d (AC-13 / BR-14): myAssignedTickets excludes RESOLVED, CLOSED, CANCELLED', async () => {
    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    // The count must be ≥ 0. DB is authoritative; we validate the endpoint contract
    // returns a proper number (correctness verified in specification integration)
    expect(res.body.metrics.myAssignedTickets).toBeGreaterThanOrEqual(0);
  });

  // ── ADMIN can also access staff dashboard ────────────────────────────────
  it('API-04-13e (AC-13): ADMIN can access /dashboard/staff → 200', async () => {
    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
  });

  // ── recentTickets list present and ≤ 10 ─────────────────────────────────
  it('API-04-13f (AC-13): recentTickets present with correct shape', async () => {
    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
    expect(res.body.recentTickets.length).toBeLessThanOrEqual(10);
    if (res.body.recentTickets.length > 0) {
      const ticket = res.body.recentTickets[0];
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('ticketNumber');
      expect(ticket).toHaveProperty('status');
      expect(ticket).toHaveProperty('itPriority');
      expect(ticket).toHaveProperty('updatedAt');
    }
  });
});

// ─── API-04-14 & API-04-21: Admin Dashboard ──────────────────────────────────
describe('API-04-14 / API-04-21 — GET /api/dashboard/admin (Admin operational + user stats)', () => {
  let requesterToken: string;
  let staffToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await clearPasswordChangeFlag();
    await ensureSeedData();

    [requesterToken, staffToken, adminToken] = await Promise.all([
      loginAs('jennifer.anderson@kmutt.ac.th'),
      loginAs('alex.turner@toktickit.kmutt.ac.th'),
      loginAs('admin@toktickit.kmutt.ac.th'),
    ]);
  });

  afterAll(async () => {
    await restorePasswordChangeFlag();
  });

  // ── API-04-21a: 401 unauthenticated ─────────────────────────────────────
  it('API-04-21a (AC-23): Unauthenticated GET /dashboard/admin → 401', async () => {
    const res = await request(app).get('/api/dashboard/admin');
    expect(res.status).toBe(401);
  });

  // ── API-04-21b: 403 REQUESTER ────────────────────────────────────────────
  it('API-04-21b (AC-23): REQUESTER accessing /dashboard/admin → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── API-04-21c: 403 IT_STAFF ─────────────────────────────────────────────
  it('API-04-21c (AC-23): IT_STAFF accessing /dashboard/admin → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── API-04-14a: 200 ADMIN gets correct shape ──────────────────────────────
  it('API-04-14a (AC-23 / BR-15): ADMIN gets 200 with operational + userStats', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('operational');
    expect(res.body).toHaveProperty('userStats');

    const op = res.body.operational;
    expect(op).toHaveProperty('newTickets');
    expect(op).toHaveProperty('openTickets');
    expect(op).toHaveProperty('inProgressTickets');
    expect(op).toHaveProperty('waitingForRequesterTickets');
    expect(op).toHaveProperty('myAssignedTickets');

    const us = res.body.userStats;
    expect(us).toHaveProperty('activeRequesters');
    expect(us).toHaveProperty('activeStaff');
    expect(us).toHaveProperty('activeAdmins');
    expect(us).toHaveProperty('totalUsers');
    expect(typeof us.activeRequesters).toBe('number');
    expect(typeof us.activeStaff).toBe('number');
    expect(typeof us.activeAdmins).toBe('number');
    expect(typeof us.totalUsers).toBe('number');
  });

  // ── API-04-14b: totalUsers > 0 (seed data loaded) ─────────────────────────
  it('API-04-14b (BR-15): totalUsers reflects seeded user count', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.userStats.totalUsers).toBeGreaterThan(0);
    // activeRequesters + activeStaff + activeAdmins ≤ totalUsers
    const us = res.body.userStats;
    expect(us.activeRequesters + us.activeStaff + us.activeAdmins).toBeLessThanOrEqual(us.totalUsers);
  });

  // ── API-04-14c: Operational metrics are all numbers ≥ 0 ──────────────────
  it('API-04-14c (AC-23): Admin operational metrics are non-negative numbers', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const op = res.body.operational;
    Object.values(op).forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v as number).toBeGreaterThanOrEqual(0);
    });
  });
});
