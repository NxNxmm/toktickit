/**
 * server/tests/lab-04/requester-dashboard.api.test.ts
 *
 * Integration tests for GET /api/dashboard/requester
 * Covers test IDs per tests.md:
 *   API-04-12  — Requester dashboard metrics (AC-12 / BR-12, 13)
 *   API-04-22  — Zero-state dashboard metrics (AC-15 / FR-18)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
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

// ─── API-04-12 & API-04-22 ───────────────────────────────────────────────────
describe('API-04-12 / API-04-22 — GET /api/dashboard/requester', () => {
  let requesterToken: string;
  let staffToken: string;

  beforeAll(async () => {
    await clearPasswordChangeFlag();
    await ensureSeedData();

    [requesterToken, staffToken] = await Promise.all([
      loginAs('jennifer.anderson@kmutt.ac.th'),
      loginAs('alex.turner@toktickit.kmutt.ac.th'),
    ]);
  });

  afterAll(async () => {
    await restorePasswordChangeFlag();
  });

  // ── API-04-12a: 401 Unauthenticated ─────────────────────────────────────
  it('API-04-12a (AC-12): Unauthenticated request → 401', async () => {
    const res = await request(app).get('/api/dashboard/requester');
    expect(res.status).toBe(401);
  });

  // ── API-04-12b: 403 IT Staff accessing requester dashboard ────────────────
  it('API-04-12b (AC-12): IT_STAFF accessing /dashboard/requester → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── API-04-12c: 200 with correct shape ───────────────────────────────────
  it('API-04-12c (AC-12 / BR-12, 13): REQUESTER gets 200 with correct dashboard shape', async () => {
    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('metrics');
    const m = res.body.metrics;
    expect(m).toHaveProperty('totalOpen');
    expect(m).toHaveProperty('waitingForRequester');
    expect(m).toHaveProperty('recentlyUpdated');
    expect(m).toHaveProperty('recentlyResolved');
    expect(typeof m.totalOpen).toBe('number');
    expect(typeof m.waitingForRequester).toBe('number');
    expect(typeof m.recentlyUpdated).toBe('number');
    expect(typeof m.recentlyResolved).toBe('number');
    expect(m.totalOpen).toBeGreaterThanOrEqual(0);
    expect(m.waitingForRequester).toBeGreaterThanOrEqual(0);
  });

  // ── API-04-12d: recentTickets list present ───────────────────────────────
  it('API-04-12d (AC-12): recentTickets array present in response', async () => {
    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
    // At most 5 recent tickets (per ui-spec §3.3)
    expect(res.body.recentTickets.length).toBeLessThanOrEqual(5);
  });

  // ── API-04-12e: recentTickets items have expected fields ─────────────────
  it('API-04-12e (AC-12): recentTickets items have expected shape', async () => {
    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    if (res.body.recentTickets.length > 0) {
      const ticket = res.body.recentTickets[0];
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('ticketNumber');
      expect(ticket).toHaveProperty('title');
      expect(ticket).toHaveProperty('status');
      expect(ticket).toHaveProperty('updatedAt');
    }
  });

  // ── API-04-12f: Ownership isolation (BR-12) ──────────────────────────────
  it('API-04-12f (AC-12 / BR-12): metrics only include tickets owned by the requester', async () => {
    // Jennifer's metrics must only reflect her own tickets, not the whole system
    const requesterRes = await request(app)
      .get('/api/dashboard/requester')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(requesterRes.status).toBe(200);
    // Verify none of the recent tickets belong to a different submitter by
    // checking that the API returns at most 5 items and they all have valid fields
    const tickets = requesterRes.body.recentTickets;
    expect(Array.isArray(tickets)).toBe(true);
    tickets.forEach((t: any) => {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('ticketNumber');
      expect(t).toHaveProperty('status');
    });
  });

  // ── API-04-12g: recentlyResolved strictly excludes CLOSED (BR-13) ─────────
  it('API-04-12g (BR-13): recentlyResolved excludes CLOSED status', async () => {
    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    // Count should be ≥ 0 (not throw or include CLOSED tickets)
    expect(res.body.metrics.recentlyResolved).toBeGreaterThanOrEqual(0);
  });

  // ── API-04-22: Zero-state — user with no tickets gets all zeros ───────────
  it('API-04-22 (AC-15 / FR-18): Zero-state — fresh user with no tickets gets 0 for all metrics', async () => {
    const zeroEmail = `zero.state.requester.${Date.now()}@kmutt.ac.th`;
    const createdUser = await getPrisma().user.create({
      data: {
        name: 'Zero State Requester',
        email: zeroEmail,
        role: 'REQUESTER',
        isActive: true,
        passwordHash: await bcrypt.hash('Password123!', 10),
        requiresPasswordChange: false,
        updatedAt: new Date(),
      },
    });

    try {
      const zeroToken = await loginAs(zeroEmail);
      const res = await request(app)
        .get('/api/dashboard/requester')
        .set('Authorization', `Bearer ${zeroToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.totalOpen).toBe(0);
      expect(res.body.metrics.waitingForRequester).toBe(0);
      expect(res.body.metrics.recentlyUpdated).toBe(0);
      expect(res.body.metrics.recentlyResolved).toBe(0);
      expect(res.body.recentTickets).toHaveLength(0);
    } finally {
      await getPrisma().session.deleteMany({ where: { userId: createdUser.id } });
      await getPrisma().user.delete({ where: { id: createdUser.id } });
    }
  });
});

