/**
 * server/tests/lab-04/ticket-workflow.api.test.ts
 *
 * Integration tests for PATCH /api/tickets/:id/workflow
 * Covers test IDs per tests.md:
 *   API-04-07  — IT Staff resolves a ticket with ≥1 ActionTaken (AC-07 / BR-08, 09)
 *   API-04-08  — Requester advisory "Problem Appears Resolved" (AC-08 / BR-10)
 *   API-04-09  — Requester cannot set status RESOLVED or CLOSED (AC-09 / BR-09)
 *   API-04-10  — Stale version → 409 Conflict (AC-10 / BR-11)
 *   API-04-11  — Invalid transition NEW → CLOSED → 422 (AC-11 / BR-08)
 *   API-04-16  — Resolve ticket with 0 Actions Taken → 422 (AC-07b / BR-09.1)
 *   API-04-23  — Full transition matrix exhaustive check (AC-11 / BR-08)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { ensureSeedData } from '../seed-helper.js';

// ─── Staff emails used across tests ──────────────────────────────────────────
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

// ─── Ticket Workflow API Tests ────────────────────────────────────────────────

describe('Lab 4 — Ticket Workflow API (Issue #4)', () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;       // jennifer — owner of TKT-SEED-001 (IN_PROGRESS, 2 actions)
  let otherRequesterToken: string;  // michael — owns TKT-SEED-002 (NEW, 0 actions)

  // Seed ticket IDs
  let ticket001Id: number;  // IN_PROGRESS, 2 actions — jennifer owns
  let ticket002Id: number;  // NEW, 0 actions — michael owns
  let ticket004Id: number;  // RESOLVED, 1 action — david owns

  // Workflow-specific test tickets (isolated per test)
  let wfTicketId: number;   // fresh ticket for concurrency / transition tests

  beforeAll(async () => {
    await clearPasswordChangeFlag();
    await ensureSeedData();

    [staffToken, adminToken, requesterToken, otherRequesterToken] = await Promise.all([
      loginAs('alex.turner@toktickit.kmutt.ac.th'),
      loginAs('admin@toktickit.kmutt.ac.th'),
      loginAs('jennifer.anderson@kmutt.ac.th'),
      loginAs('michael.brown@kmutt.ac.th'),
    ]);

    const [t001, t002, t004] = await Promise.all([
      getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-SEED-001' } }),
      getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-SEED-002' } }),
      getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-SEED-004' } }),
    ]);

    ticket001Id = t001.id;
    ticket002Id = t002.id;
    ticket004Id = t004.id;

    // Reset seed tickets to known states for workflow tests
    await getPrisma().ticket.update({
      where: { id: ticket001Id },
      data: { currentStatus: 'IN_PROGRESS', version: 1 },
    });
    await getPrisma().ticket.update({
      where: { id: ticket002Id },
      data: { currentStatus: 'NEW', version: 1 },
    });
    await getPrisma().ticket.update({
      where: { id: ticket004Id },
      data: { currentStatus: 'RESOLVED', version: 1 },
    });

    // Create an isolated fresh OPEN ticket with 0 actions for concurrency / transition tests
    const jennifer = await getPrisma().user.findUniqueOrThrow({
      where: { email: 'jennifer.anderson@kmutt.ac.th' },
    });
    const catNetwork = await getPrisma().category.findFirstOrThrow({ where: { name: 'Network' } });
    const sysWifi = await getPrisma().related_system.findFirstOrThrow({
      where: { name: 'Campus Wi-Fi' },
    });

    const wfTicket = await getPrisma().ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}`,
        submittedById: jennifer.id,
        categoryId: catNetwork.id,
        relatedSystemId: sysWifi.id,
        summary: 'Workflow test ticket',
        description: 'Created for Issue #4 workflow API tests',
        requestedPriority: 'MEDIUM',
        itPriority: 'MEDIUM',
        currentStatus: 'OPEN',
        version: 1,
        updatedAt: new Date(),
      },
    });
    wfTicketId = wfTicket.id;
  });

  afterAll(async () => {
    // Remove isolated workflow test tickets (not seed tickets)
    await getPrisma().action_taken.deleteMany({
      where: {
        ticket: { ticketNumber: { startsWith: 'TKT-WF-' } },
      },
    });
    await getPrisma().ticket.deleteMany({
      where: { ticketNumber: { startsWith: 'TKT-WF-' } },
    });
    // Restore seed statuses
    await getPrisma().ticket.update({
      where: { id: ticket001Id },
      data: { currentStatus: 'IN_PROGRESS', version: 1 },
    });
    await getPrisma().ticket.update({
      where: { id: ticket002Id },
      data: { currentStatus: 'NEW', version: 1 },
    });
    await getPrisma().ticket.update({
      where: { id: ticket004Id },
      data: { currentStatus: 'RESOLVED', version: 1 },
    });
    await restorePasswordChangeFlag();
  });

  // ── Step 1: Authentication guard ─────────────────────────────────────────────
  it('WF-00: Unauthenticated request returns 401', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/workflow`)
      .send({ status: 'RESOLVED', version: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error === 'Unauthorized' || res.body.error?.code === 'UNAUTHORIZED').toBe(true);
  });

  // ── API-04-09: Requester cannot set ticket status to RESOLVED or CLOSED ──────
  it('API-04-09 (AC-09 / BR-09): Requester attempting status transition → 403', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/workflow`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ status: 'RESOLVED', version: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/Requesters cannot set ticket status/i);
  });

  it('API-04-09b: Requester attempting CLOSED transition → 403', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket004Id}/workflow`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ status: 'CLOSED', version: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── Validation: missing version → 400 ───────────────────────────────────────
  it('WF-01 (BR-11): Missing version field returns 400', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'RESOLVED' }); // no version

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/version/i);
  });

  it('WF-02 (BR-11): Invalid status string returns 400', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'INVALID_STATUS', version: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── API-04-10: Stale version → 409 Conflict ──────────────────────────────────
  it('API-04-10 (AC-10 / BR-11): Stale version returns 409 Conflict', async () => {
    const current = await getPrisma().ticket.findUniqueOrThrow({ where: { id: wfTicketId } });
    const staleVersion = current.version + 99; // deliberately wrong

    const res = await request(app)
      .patch(`/api/tickets/${wfTicketId}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'IN_PROGRESS', version: staleVersion });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONCURRENCY_CONFLICT');
    expect(res.body.error).toHaveProperty('currentVersion', current.version);
    expect(res.body.error).toHaveProperty('submittedVersion', staleVersion);

    // Ticket state must NOT have changed
    const unchanged = await getPrisma().ticket.findUniqueOrThrow({ where: { id: wfTicketId } });
    expect(unchanged.version).toBe(current.version);
    expect(unchanged.currentStatus).toBe(current.currentStatus);
  });

  // ── API-04-11: Invalid transition → 422 INVALID_STATUS_TRANSITION ─────────────
  it('API-04-11 (AC-11 / BR-08): Disallowed transition NEW → CLOSED returns 422', async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket002Id } });
    expect(ticket.currentStatus).toBe('NEW');

    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'CLOSED', version: ticket.version });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(res.body.error.message).toMatch(/not permitted/i);
  });

  it('API-04-11b: Disallowed transition NEW → RESOLVED returns 422', async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket002Id } });
    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'RESOLVED', version: ticket.version });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('API-04-11c: CANCELLED → IN_PROGRESS is disallowed (terminal state)', async () => {
    const wf = await getPrisma().ticket.update({
      where: { id: wfTicketId },
      data: { currentStatus: 'CANCELLED', version: { increment: 1 } },
    });

    const res = await request(app)
      .patch(`/api/tickets/${wfTicketId}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'IN_PROGRESS', version: wf.version });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    // Restore
    await getPrisma().ticket.update({
      where: { id: wfTicketId },
      data: { currentStatus: 'OPEN', version: 1 },
    });
  });

  // ── API-04-16: Resolution gate — 0 Actions Taken → 422 ───────────────────────
  it('API-04-16 (AC-07b / BR-09.1): RESOLVED with 0 Actions Taken returns 422', async () => {
    await getPrisma().ticket.update({
      where: { id: wfTicketId },
      data: { currentStatus: 'IN_PROGRESS', version: 1 },
    });

    const res = await request(app)
      .patch(`/api/tickets/${wfTicketId}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'RESOLVED', version: 1 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('RESOLUTION_REQUIRES_ACTION_TAKEN');
    expect(res.body.error.message).toMatch(/action taken/i);

    // Restore
    await getPrisma().ticket.update({
      where: { id: wfTicketId },
      data: { currentStatus: 'OPEN', version: 1 },
    });
  });

  // ── API-04-08: Requester advisory "Problem Appears Resolved" ──────────────────
  it('API-04-08 (AC-08 / BR-10): Requester submits advisory → 200, status unchanged', async () => {
    const before = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket001Id } });

    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/workflow`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ isRequesterAdvisory: true });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.message).toMatch(/advisory/i);

    // Status must remain unchanged (IN_PROGRESS)
    const after = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket001Id } });
    expect(after.currentStatus).toBe(before.currentStatus);
    expect(after.resolvedIndicated).toBe(true);

    // Comment logged per BR-10
    const comment = await getPrisma().public_comment.findFirst({
      where: {
        ticketId: ticket001Id,
        content: '[Requester Feedback: Problem Appears Resolved]',
      },
    });
    expect(comment).not.toBeNull();

    // Reset
    await getPrisma().public_comment.deleteMany({
      where: { ticketId: ticket001Id, content: '[Requester Feedback: Problem Appears Resolved]' },
    });
    await getPrisma().ticket.update({
      where: { id: ticket001Id },
      data: { resolvedIndicated: false, resolvedIndicatedAt: null, version: 1 },
    });
  });

  it('API-04-08b: Requester advisory on unowned ticket → 403', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/workflow`)
      .set('Authorization', `Bearer ${otherRequesterToken}`)
      .send({ isRequesterAdvisory: true });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── API-04-07: IT Staff resolves ticket with ≥1 ActionTaken ──────────────────
  it('API-04-07 (AC-07 / BR-08, 09): IT Staff RESOLVED with ≥1 Action Taken → 200', async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket001Id } });
    const actionCount = await getPrisma().action_taken.count({ where: { ticketId: ticket001Id } });
    expect(actionCount).toBeGreaterThanOrEqual(1);

    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'RESOLVED', version: ticket.version });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESOLVED');
    expect(res.body.version).toBeGreaterThan(ticket.version);
    expect(res.body).toHaveProperty('updatedAt');
    expect(res.body.message).toMatch(/successfully/i);

    const updated = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket001Id } });
    expect(updated.currentStatus).toBe('RESOLVED');
    expect(updated.version).toBe(ticket.version + 1);

    // Restore
    await getPrisma().ticket.update({
      where: { id: ticket001Id },
      data: { currentStatus: 'IN_PROGRESS', version: 1 },
    });
  });

  it('API-04-07b: Admin can also resolve with ≥1 Action Taken → 200', async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket001Id } });

    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/workflow`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED', version: ticket.version });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESOLVED');

    // Restore
    await getPrisma().ticket.update({
      where: { id: ticket001Id },
      data: { currentStatus: 'IN_PROGRESS', version: 1 },
    });
  });

  // ── API-04-23: Full transition matrix validation ──────────────────────────────
  describe('API-04-23 (AC-11 / BR-08): Exhaustive transition matrix — all 17 permitted transitions', () => {
    const PERMITTED: Array<{ from: string; to: string }> = [
      { from: 'NEW', to: 'OPEN' },
      { from: 'NEW', to: 'CANCELLED' },
      { from: 'OPEN', to: 'IN_PROGRESS' },
      { from: 'OPEN', to: 'WAITING_FOR_REQUESTER' },
      { from: 'OPEN', to: 'CANCELLED' },
      { from: 'IN_PROGRESS', to: 'WAITING_FOR_REQUESTER' },
      { from: 'IN_PROGRESS', to: 'RESOLVED' },
      { from: 'IN_PROGRESS', to: 'CANCELLED' },
      { from: 'WAITING_FOR_REQUESTER', to: 'IN_PROGRESS' },
      { from: 'WAITING_FOR_REQUESTER', to: 'RESOLVED' },
      { from: 'WAITING_FOR_REQUESTER', to: 'CANCELLED' },
      { from: 'RESOLVED', to: 'CLOSED' },
      { from: 'RESOLVED', to: 'REOPENED' },
      { from: 'CLOSED', to: 'REOPENED' },
      { from: 'REOPENED', to: 'IN_PROGRESS' },
      { from: 'REOPENED', to: 'RESOLVED' },
      { from: 'REOPENED', to: 'CANCELLED' },
    ];

    const FORBIDDEN_EXAMPLES: Array<{ from: string; to: string }> = [
      { from: 'NEW', to: 'CLOSED' },
      { from: 'NEW', to: 'RESOLVED' },
      { from: 'NEW', to: 'IN_PROGRESS' },
      { from: 'OPEN', to: 'RESOLVED' },
      { from: 'OPEN', to: 'CLOSED' },
      { from: 'OPEN', to: 'REOPENED' },
      { from: 'CANCELLED', to: 'OPEN' },
      { from: 'CANCELLED', to: 'IN_PROGRESS' },
      { from: 'CANCELLED', to: 'RESOLVED' },
    ];

    it('All 17 permitted transitions are accepted (HTTP 200)', async () => {
      const jennifer = await getPrisma().user.findUniqueOrThrow({
        where: { email: 'jennifer.anderson@kmutt.ac.th' },
      });
      const cat = await getPrisma().category.findFirstOrThrow({ where: { name: 'Network' } });
      const sys = await getPrisma().related_system.findFirstOrThrow({ where: { name: 'Campus Wi-Fi' } });
      const alex = await getPrisma().user.findUniqueOrThrow({
        where: { email: 'alex.turner@toktickit.kmutt.ac.th' },
      });

      const matrixTicket = await getPrisma().ticket.create({
        data: {
          ticketNumber: `TKT-MATRIX-${Date.now()}`,
          submittedById: jennifer.id,
          categoryId: cat.id,
          relatedSystemId: sys.id,
          summary: 'Matrix test ticket',
          description: 'For transition matrix exhaustive test',
          requestedPriority: 'LOW',
          itPriority: 'LOW',
          currentStatus: 'NEW',
          version: 1,
          updatedAt: new Date(),
        },
      });

      // Add 1 action to satisfy resolution gate
      await getPrisma().action_taken.create({
        data: {
          ticketId: matrixTicket.id,
          performedById: alex.id,
          actionDateTime: new Date(),
          description: 'Matrix test action',
          result: 'Matrix test result',
          followUpRequired: false,
          followUpNote: null,
          updatedAt: new Date(),
        },
      });

      for (const { from, to } of PERMITTED) {
        await getPrisma().ticket.update({
          where: { id: matrixTicket.id },
          data: { currentStatus: from as any, version: 1 },
        });

        const res = await request(app)
          .patch(`/api/tickets/${matrixTicket.id}/workflow`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ status: to, version: 1 });

        expect(
          res.status,
          `Expected 200 for ${from} → ${to}, got ${res.status}: ${JSON.stringify(res.body)}`
        ).toBe(200);
        expect(res.body.status).toBe(to);
      }

      // Cleanup
      await getPrisma().action_taken.deleteMany({ where: { ticketId: matrixTicket.id } });
      await getPrisma().ticket.delete({ where: { id: matrixTicket.id } });
    });

    it('Forbidden transitions return 422 INVALID_STATUS_TRANSITION', async () => {
      const jennifer = await getPrisma().user.findUniqueOrThrow({
        where: { email: 'jennifer.anderson@kmutt.ac.th' },
      });
      const cat = await getPrisma().category.findFirstOrThrow({ where: { name: 'Network' } });
      const sys = await getPrisma().related_system.findFirstOrThrow({ where: { name: 'Campus Wi-Fi' } });

      const forbidTicket = await getPrisma().ticket.create({
        data: {
          ticketNumber: `TKT-FORBID-${Date.now()}`,
          submittedById: jennifer.id,
          categoryId: cat.id,
          relatedSystemId: sys.id,
          summary: 'Forbidden transition test',
          description: 'Test forbidden transitions',
          requestedPriority: 'LOW',
          itPriority: 'LOW',
          currentStatus: 'NEW',
          version: 1,
          updatedAt: new Date(),
        },
      });

      for (const { from, to } of FORBIDDEN_EXAMPLES) {
        await getPrisma().ticket.update({
          where: { id: forbidTicket.id },
          data: { currentStatus: from as any, version: 1 },
        });

        const res = await request(app)
          .patch(`/api/tickets/${forbidTicket.id}/workflow`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ status: to, version: 1 });

        expect(
          res.status,
          `Expected 422 for ${from} → ${to}, got ${res.status}: ${JSON.stringify(res.body)}`
        ).toBe(422);
        expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      }

      await getPrisma().ticket.delete({ where: { id: forbidTicket.id } });
    });
  });

  // ── 404: Non-existent ticket ──────────────────────────────────────────────────
  it('WF-99: Non-existent ticket returns 404', async () => {
    const res = await request(app)
      .patch('/api/tickets/999999/workflow')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'OPEN', version: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
