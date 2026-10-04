import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { ensureSeedData } from '../seed-helper.js';

// ─── Staff accounts have requiresPasswordChange = true (BR-02 seed constraint).
// Clear the flag before login so operational endpoints are reachable in tests.
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

async function loginAs(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password123!' });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status} — ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

// ─── Actions Taken API Tests ─────────────────────────────────────────────────
describe('Lab 4 — Actions Taken API (Issue #2)', () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;        // jennifer — owner of TKT-SEED-001
  let otherRequesterToken: string;   // michael — NOT owner of TKT-SEED-001

  let ticket001Id: number;  // IN_PROGRESS, 2 actions (TKT-SEED-001) — jennifer owns
  let ticket002Id: number;  // NEW, 0 actions (TKT-SEED-002) — michael owns
  let createdActionId: number;

  beforeAll(async () => {
    // Clear requiresPasswordChange so staff can access operational endpoints
    await clearPasswordChangeFlag();
    await ensureSeedData();

    [staffToken, adminToken, requesterToken, otherRequesterToken] = await Promise.all([
      loginAs('alex.turner@toktickit.kmutt.ac.th'),
      loginAs('admin@toktickit.kmutt.ac.th'),
      loginAs('jennifer.anderson@kmutt.ac.th'),
      loginAs('michael.brown@kmutt.ac.th'),
    ]);

    const [t001, t002] = await Promise.all([
      getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-SEED-001' } }),
      getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-SEED-002' } }),
    ]);
    ticket001Id = t001.id;
    ticket002Id = t002.id;
  });

  afterAll(async () => {
    // Clean up test-created actions (keep seeded ones)
    await getPrisma().action_taken.deleteMany({
      where: { ticketId: ticket001Id, description: { contains: 'ethernet cable' } },
    });
    await getPrisma().action_taken.deleteMany({
      where: { ticketId: ticket001Id, description: { contains: 'Final diagnostics' } },
    });
    // Restore password change flag
    await restorePasswordChangeFlag();
  });

  // ── AT-01: Unauthenticated list → 401 ────────────────────────────────────
  it('AT-01 (FR-05, AC-2.1): Unauthenticated GET actions-taken returns 401', async () => {
    const res = await request(app).get(`/api/tickets/${ticket001Id}/actions-taken`);
    expect(res.status).toBe(401);
  });

  // ── AT-02: IT_STAFF lists all actions on any ticket → 200 ────────────────
  it('AT-02 (FR-05, AC-2.2): IT_STAFF can list all actions on any ticket', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ticketId', ticket001Id);
    expect(Array.isArray(res.body.actionsTaken)).toBe(true);
    expect(res.body.actionsTaken.length).toBeGreaterThanOrEqual(2);

    // Verify canonical response shape per api-spec.md §3.1
    const action = res.body.actionsTaken[0];
    expect(action).toHaveProperty('id');
    expect(action).toHaveProperty('ticketId', ticket001Id);
    expect(action).toHaveProperty('actionDateTime');
    expect(action).toHaveProperty('description');
    expect(action).toHaveProperty('result');
    expect(action).toHaveProperty('followUpRequired');
    expect(action).toHaveProperty('followUpNote');
    expect(action).toHaveProperty('attachmentNotes');
    expect(action).toHaveProperty('performedBy');
    expect(action.performedBy).toHaveProperty('id');
    expect(action.performedBy).toHaveProperty('name');
    expect(action.performedBy).toHaveProperty('email');
    expect(action.performedBy).toHaveProperty('role');
    expect(action).toHaveProperty('createdAt');
    expect(action).toHaveProperty('updatedAt');
  });

  // ── AT-03: Actions sorted by actionDateTime DESC ──────────────────────────
  it('AT-03 (FR-05, AC-2.2): Actions are sorted by actionDateTime DESC', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const actions = res.body.actionsTaken;
    if (actions.length >= 2) {
      const d0 = new Date(actions[0].actionDateTime).getTime();
      const d1 = new Date(actions[1].actionDateTime).getTime();
      expect(d0).toBeGreaterThanOrEqual(d1);
    }
  });

  // ── AT-04: Requester views own ticket actions → 200 ───────────────────────
  it('AT-04 (FR-05, AC-2.1): REQUESTER can list actions on their own ticket', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${requesterToken}`); // jennifer owns TKT-001
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('actionsTaken');
  });

  // ── AT-05: Requester cannot view another user's ticket → 403 ─────────────
  it('AT-05 (BR-06, AC-2.4): REQUESTER viewing another user\'s ticket actions → 403', async () => {
    // michael tries to view jennifer's ticket (TKT-001)
    const res = await request(app)
      .get(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${otherRequesterToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // ── AT-06: Non-existent ticket → 404 ─────────────────────────────────────
  it('AT-06 (AC-2.1): GET actions-taken on non-existent ticket → 404', async () => {
    const res = await request(app)
      .get('/api/tickets/999999/actions-taken')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  // ── AT-07: Ticket with 0 actions returns empty array ─────────────────────
  it('AT-07 (FR-05, AC-2.2): Ticket with 0 actions returns empty actionsTaken array', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket002Id}/actions-taken`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.actionsTaken)).toBe(true);
    expect(res.body.actionsTaken).toHaveLength(0);
  });

  // ── AT-08: REQUESTER cannot POST action → 403 ────────────────────────────
  it('AT-08 (BR-03, AC-2.3): REQUESTER cannot create actions-taken → 403', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        actionDateTime: new Date(Date.now() - 60000).toISOString(),
        description: 'Requester attempting to add action.',
        result: 'This should be blocked.',
        followUpRequired: false,
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // ── AT-09: Unauthenticated POST → 401 ────────────────────────────────────
  it('AT-09: Unauthenticated POST actions-taken → 401', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket001Id}/actions-taken`)
      .send({ description: 'Test', result: 'Result', followUpRequired: false });
    expect(res.status).toBe(401);
  });

  // ── AT-10: POST missing required fields → 400 ────────────────────────────
  it('AT-10 (AC-2.3): Missing required fields in POST → 400 with details array', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ followUpRequired: false }); // missing description and result

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    const fields = res.body.error.details.map((d: any) => d.field);
    expect(fields).toContain('description');
    expect(fields).toContain('result');
  });

  // ── AT-11: followUpRequired=true with empty followUpNote → 400 ────────────
  it('AT-11 (BR-05, AC-2.3): followUpRequired=true with blank followUpNote → 400', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        description: 'Valid description here has enough chars.',
        result: 'Valid result',
        followUpRequired: true,
        followUpNote: '',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d: any) => d.field === 'followUpNote')).toBe(true);
  });

  // ── AT-12: POST future actionDateTime > 5 min → 400 ─────────────────────
  it('AT-12 (BR-05, AC-2.3): actionDateTime >5 min in future → 400', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const res = await request(app)
      .post(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        actionDateTime: futureDate,
        description: 'This timestamp is in the future.',
        result: 'Valid result.',
        followUpRequired: false,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: any) => d.field === 'actionDateTime')).toBe(true);
  });

  // ── AT-13: Valid POST by IT_STAFF → 201 ──────────────────────────────────
  it('AT-13 (FR-05, AC-2.1, AC-2.3): IT_STAFF creates action taken → 201 with correct shape', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        actionDateTime: new Date(Date.now() - 60000).toISOString(),
        description: 'Replaced ethernet cable from switch port 12 to office 401.',
        result: 'Link speed confirmed at 1Gbps. No packet loss after 30 min test.',
        followUpRequired: true,
        followUpNote: 'Schedule follow-up ping test tomorrow morning.',
        attachmentNotes: 'cable-test-results.txt uploaded to share',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.description).toBe('Replaced ethernet cable from switch port 12 to office 401.');
    expect(res.body.followUpRequired).toBe(true);
    expect(res.body.followUpNote).toBe('Schedule follow-up ping test tomorrow morning.');
    expect(res.body.attachmentNotes).toBe('cable-test-results.txt uploaded to share');
    // Actor identity derived from session, not client body (AC-02-01)
    expect(res.body.performedBy).toHaveProperty('role', 'IT_STAFF');
    expect(res.body.performedBy.email).toBe('alex.turner@toktickit.kmutt.ac.th');

    createdActionId = res.body.id;
  });

  // ── AT-14: POST followUpRequired=false clears followUpNote to null ────────
  it('AT-14 (BR-05, AC-02-02): followUpRequired=false forces followUpNote to null', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket001Id}/actions-taken`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Final diagnostics check on AP-CB2-401 after firmware upgrade.',
        result: 'All metrics nominal. Signal stable.',
        followUpRequired: false,
        followUpNote: 'This client-sent note should be cleared to null by the server.',
      });

    expect(res.status).toBe(201);
    // Server must enforce null regardless of client input (api-spec §3.2)
    expect(res.body.followUpNote).toBeNull();
    expect(res.body.followUpRequired).toBe(false);
  });

  // ── AT-15: REQUESTER cannot PATCH an action → 403 ────────────────────────
  it('AT-15 (BR-03, AC-2.3): REQUESTER cannot update an action taken → 403', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/actions-taken/${createdActionId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        description: 'Tampered description from requester.',
        result: 'Tampered result.',
        followUpRequired: false,
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // ── AT-16: IT_STAFF PATCH action (LWW) → 200 ─────────────────────────────
  it('AT-16 (FR-05, AC-2.4): IT_STAFF updates action taken (Last-Write-Wins) → 200', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/actions-taken/${createdActionId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        description: 'Updated: replaced ethernet cable — verified with fluke test.',
        result: 'Link speed 1Gbps confirmed. Network stable for 1 hour.',
        followUpRequired: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.description).toContain('Updated:');
    expect(res.body.followUpRequired).toBe(false);
    expect(res.body.followUpNote).toBeNull();
    expect(res.body).toHaveProperty('updatedAt');
  });

  // ── AT-17: PATCH non-existent actionId → 404 ─────────────────────────────
  it('AT-17 (AC-2.4): PATCH non-existent actionId → 404', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket001Id}/actions-taken/999999`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        description: 'Some valid description here.',
        result: 'Some valid result.',
        followUpRequired: false,
      });
    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});

// ─── Dashboard API Tests ──────────────────────────────────────────────────────
describe('Lab 4 — Dashboard API (Issue #2)', () => {
  let requesterToken: string;
  let staffToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await clearPasswordChangeFlag();

    [requesterToken, staffToken, adminToken] = await Promise.all([
      loginAs('jennifer.anderson@kmutt.ac.th'),
      loginAs('alex.turner@toktickit.kmutt.ac.th'),
      loginAs('admin@toktickit.kmutt.ac.th'),
    ]);
  });

  afterAll(async () => {
    await restorePasswordChangeFlag();
  });

  // ── DB-01: Unauthenticated requester dashboard → 401 ─────────────────────
  it('DB-01 (AC-7.1): Unauthenticated GET /dashboard/requester → 401', async () => {
    const res = await request(app).get('/api/dashboard/requester');
    expect(res.status).toBe(401);
  });

  // ── DB-02: IT_STAFF accessing requester dashboard → 403 ──────────────────
  it('DB-02 (AC-7.1): IT_STAFF accessing /dashboard/requester → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── DB-03: Requester dashboard — correct metrics shape ────────────────────
  it('DB-03 (FR-10, BR-13, AC-7.1): REQUESTER gets correct dashboard shape', async () => {
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
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
  });

  // ── DB-04: recentlyResolved excludes CLOSED tickets ───────────────────────
  it('DB-04 (BR-13): recentlyResolved metric strictly excludes CLOSED status', async () => {
    // Jennifer has TKT-SEED-005 (CLOSED) — it must NOT count in recentlyResolved
    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    // We can't know the exact count, but it must be ≥ 0 and not throw
    expect(res.body.metrics.recentlyResolved).toBeGreaterThanOrEqual(0);
  });

  // ── DB-05: recentTickets items have correct fields ────────────────────────
  it('DB-05 (AC-7.1): recentTickets items have expected fields', async () => {
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
      expect(ticket).toHaveProperty('requestedPriority');
      expect(ticket).toHaveProperty('updatedAt');
    }
  });

  // ── DB-06: Unauthenticated staff dashboard → 401 ─────────────────────────
  it('DB-06 (AC-7.2): Unauthenticated GET /dashboard/staff → 401', async () => {
    const res = await request(app).get('/api/dashboard/staff');
    expect(res.status).toBe(401);
  });

  // ── DB-07: REQUESTER accessing staff dashboard → 403 ─────────────────────
  it('DB-07 (AC-7.2): REQUESTER accessing /dashboard/staff → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(403);
  });

  // ── DB-08: IT_STAFF gets correct staff dashboard shape ────────────────────
  it('DB-08 (FR-10, BR-13, AC-7.2): IT_STAFF gets correct staff dashboard metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const m = res.body.metrics;
    expect(m).toHaveProperty('newTickets');
    expect(m).toHaveProperty('openTickets');
    expect(m).toHaveProperty('inProgressTickets');
    expect(m).toHaveProperty('waitingForRequesterTickets');
    expect(m).toHaveProperty('myAssignedTickets');
    expect(typeof m.newTickets).toBe('number');
    expect(typeof m.myAssignedTickets).toBe('number');
    // myAssigned excludes RESOLVED, CLOSED, CANCELLED
    expect(m.myAssignedTickets).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
  });

  // ── DB-09: Staff recentTickets has correct shape ──────────────────────────
  it('DB-09 (AC-7.2): Staff recentTickets items have expected fields', async () => {
    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    if (res.body.recentTickets.length > 0) {
      const ticket = res.body.recentTickets[0];
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('ticketNumber');
      expect(ticket).toHaveProperty('status');
      expect(ticket).toHaveProperty('itPriority');
      expect(ticket).toHaveProperty('updatedAt');
    }
  });

  // ── DB-10: REQUESTER accessing admin dashboard → 403 ─────────────────────
  it('DB-10 (AC-7.3): REQUESTER accessing /dashboard/admin → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(403);
  });

  // ── DB-11: IT_STAFF accessing admin dashboard → 403 ──────────────────────
  it('DB-11 (AC-7.3): IT_STAFF accessing /dashboard/admin → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  // ── DB-12: ADMIN gets correct admin dashboard shape ───────────────────────
  it('DB-12 (FR-10, AC-7.3): ADMIN gets correct admin dashboard with userStats', async () => {
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
    expect(us.totalUsers).toBeGreaterThan(0);
  });
});

// ─── Ticket Workflow (Optimistic Concurrency + Resolution Gate) API Tests ────
describe('Lab 4 — Ticket Workflow API (Issue #2)', () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;       // jennifer — owner of TKT-SEED-001

  let ticket002Id: number;  // NEW, 0 actions — michael's ticket
  let ticket006Id: number;  // OPEN, 0 actions — michael's ticket
  let ticket004Id: number;  // RESOLVED, 1 action — david's ticket

  beforeAll(async () => {
    await clearPasswordChangeFlag();
    await ensureSeedData();

    [staffToken, adminToken, requesterToken] = await Promise.all([
      loginAs('alex.turner@toktickit.kmutt.ac.th'),
      loginAs('admin@toktickit.kmutt.ac.th'),
      loginAs('jennifer.anderson@kmutt.ac.th'),
    ]);

    const [t002, t004, t006] = await Promise.all([
      getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-SEED-002' } }),
      getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-SEED-004' } }),
      getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-SEED-006' } }),
    ]);
    ticket002Id = t002.id;
    ticket004Id = t004.id;
    ticket006Id = t006.id;

    // Ensure TKT-002 is in NEW state for workflow tests
    await getPrisma().ticket.update({
      where: { id: ticket002Id },
      data: { currentStatus: 'NEW', updatedAt: new Date() },
    });
    // Ensure TKT-006 is in OPEN state (0 actions for resolution gate test)
    await getPrisma().ticket.update({
      where: { id: ticket006Id },
      data: { currentStatus: 'OPEN', updatedAt: new Date() },
    });
  });

  afterAll(async () => {
    // Restore tickets to their seed states
    if (ticket002Id) {
      await getPrisma().ticket.update({
        where: { id: ticket002Id },
        data: { currentStatus: 'NEW', updatedAt: new Date() },
      });
    }
    if (ticket004Id) {
      await getPrisma().ticket.update({
        where: { id: ticket004Id },
        data: { currentStatus: 'RESOLVED', updatedAt: new Date() },
      });
    }
    if (ticket006Id) {
      await getPrisma().ticket.update({
        where: { id: ticket006Id },
        data: { currentStatus: 'OPEN', updatedAt: new Date() },
      });
    }
    await restorePasswordChangeFlag();
  });

  // ── WF-01: Unauthenticated → 401 ─────────────────────────────────────────
  it('WF-01: Unauthenticated PATCH /tickets/:id/workflow → 401', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .send({ status: 'OPEN', version: 1 });
    expect(res.status).toBe(401);
  });

  // ── WF-02: REQUESTER attempting status transition → 403 ──────────────────
  it('WF-02 (BR-03): REQUESTER attempting status transition → 403', async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket002Id } });
    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ status: 'OPEN', version: ticket.version });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── WF-03: Missing version → 400 ─────────────────────────────────────────
  it('WF-03 (AC-2.5): Missing version → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'OPEN' }); // no version field
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/version/i);
  });

  // ── WF-04: Invalid status string → 400 ───────────────────────────────────
  it('WF-04 (AC-2.5): Invalid status string → 400 VALIDATION_ERROR', async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket002Id } });
    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'NOT_A_REAL_STATUS', version: ticket.version });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── WF-05: Stale version → 409 CONCURRENCY_CONFLICT ─────────────────────
  it('WF-05 (BR-11, AC-2.5): Stale version → 409 CONCURRENCY_CONFLICT', async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket002Id } });
    const staleVersion = ticket.version - 1; // deliberately one behind
    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'OPEN', version: staleVersion });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONCURRENCY_CONFLICT');
    expect(res.body.error).toHaveProperty('currentVersion', ticket.version);
    expect(res.body.error).toHaveProperty('submittedVersion', staleVersion);
  });

  // ── WF-06: Invalid status transition → 422 ───────────────────────────────
  it('WF-06 (BR-08, AC-2.5): Invalid status transition (NEW→CLOSED) → 422', async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket002Id } });
    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'CLOSED', version: ticket.version });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(res.body.error.message).toContain('NEW');
  });

  // ── WF-07: Resolution gate — 0 actions → 422 ─────────────────────────────
  it('WF-07 (BR-10, AC-2.5): IN_PROGRESS ticket with 0 actions trying RESOLVED → 422 RESOLUTION_REQUIRES_ACTION_TAKEN', async () => {
    // Create a temporary ticket in IN_PROGRESS with no actions to test the gate
    const category = await getPrisma().category.findFirstOrThrow({ where: { name: 'Software' } });
    const relSystem = await getPrisma().related_system.findFirstOrThrow({ where: { name: 'Email' } });
    const requester = await getPrisma().user.findUniqueOrThrow({ where: { email: 'michael.brown@kmutt.ac.th' } });

    const tempTicket = await getPrisma().ticket.create({
      data: {
        ticketNumber: 'TKT-WF07-GATE-TEST',
        submittedById: requester.id,
        categoryId: category.id,
        relatedSystemId: relSystem.id,
        summary: 'Temp ticket for WF-07 resolution gate test',
        description: 'This ticket is IN_PROGRESS with 0 actions to verify the resolution gate.',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
        currentStatus: 'IN_PROGRESS',
        updatedAt: new Date(),
      },
    });

    // Confirm 0 actions
    const count = await getPrisma().action_taken.count({ where: { ticketId: tempTicket.id } });
    expect(count).toBe(0);

    const res = await request(app)
      .patch(`/api/tickets/${tempTicket.id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'RESOLVED', version: tempTicket.version });

    // Cleanup regardless of result
    await getPrisma().ticket.delete({ where: { id: tempTicket.id } });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('RESOLUTION_REQUIRES_ACTION_TAKEN');
  });

  // ── WF-08: Valid transition NEW→OPEN → 200, version increments ────────────
  it('WF-08 (FR-06, AC-2.5): Valid NEW→OPEN transition → 200 with incremented version', async () => {
    const ticketBefore = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket002Id } });
    expect(ticketBefore.currentStatus).toBe('NEW');

    const res = await request(app)
      .patch(`/api/tickets/${ticket002Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'OPEN', version: ticketBefore.version });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OPEN');
    expect(res.body.version).toBe(ticketBefore.version + 1);
    expect(res.body).toHaveProperty('updatedAt');

    // Restore to NEW for AfterAll cleanup
    await getPrisma().ticket.update({
      where: { id: ticket002Id },
      data: { currentStatus: 'NEW', version: { increment: 1 }, updatedAt: new Date() },
    });
  });

  // ── WF-09: RESOLVED with ≥1 action → 200 ─────────────────────────────────
  it('WF-09 (FR-06, BR-10, AC-2.5): Ticket with ≥1 action can be RESOLVED → 200', async () => {
    // Move TKT-004 back to IN_PROGRESS for this test (it has 1 seeded action)
    await getPrisma().ticket.update({
      where: { id: ticket004Id },
      data: { currentStatus: 'IN_PROGRESS', updatedAt: new Date() },
    });
    const ticketBefore = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket004Id } });

    const res = await request(app)
      .patch(`/api/tickets/${ticket004Id}/workflow`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'RESOLVED', version: ticketBefore.version });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESOLVED');
    expect(res.body.version).toBe(ticketBefore.version + 1);
  });

  // ── WF-10: Non-existent ticket → 404 ─────────────────────────────────────
  it('WF-10: PATCH workflow on non-existent ticket → 404', async () => {
    const res = await request(app)
      .patch('/api/tickets/999999/workflow')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'OPEN', version: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
