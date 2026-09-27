import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { generateTicketNumber } from '../../src/utils/ticketNumber.js';

/**
 * staff-ticket-detail.api.test.ts
 *
 * Tests: API-16, API-17, API-18 (plus staff detail & assignee endpoints for Issue 6)
 * ACs : AC-6.1, AC-6.2, AC-6.3
 * BRs : BR-08, BR-09, BR-12, BR-15
 */

const TEST_PREFIX = '[STAFF-DETAIL-TEST]';

const STAFF_EMAIL = 'alex.turner@toktickit.kmutt.ac.th';
const STAFF2_EMAIL = 'jessica.miller@toktickit.kmutt.ac.th';
const INACTIVE_STAFF_EMAIL = 'rachel.green@toktickit.kmutt.ac.th';
const ADMIN_EMAIL = 'admin@toktickit.kmutt.ac.th';
const REQUESTER_EMAIL = 'jennifer.anderson@kmutt.ac.th';
const VALID_PASSWORD = 'Password123!';

describe('Staff Ticket Detail Operations (Issue 6 — AC-6.1, AC-6.2, AC-6.3)', () => {
    let staffToken: string;
    let staff2Token: string;
    let adminToken: string;
    let requesterToken: string;

    let staffId: number;
    let requesterId: number;
    let inactiveStaffId: number;

    let categoryId: number;
    let relatedSystemId: number;

    const createdTicketIds: number[] = [];

    let ownershipTicketId: number; // NEW, unassigned
    let priorityTicketId: number;  // NEW, unassigned, HIGH // MEDIUM
    let statusTicketId: number;    // NEW, unassigned

    beforeAll(async () => {
        const staffUser = await getPrisma().user.findUnique({ where: { email: STAFF_EMAIL } });
        const staff2User = await getPrisma().user.findUnique({ where: { email: STAFF2_EMAIL } });
        const adminUser = await getPrisma().user.findUnique({ where: { email: ADMIN_EMAIL } });
        const requesterUser = await getPrisma().user.findUnique({ where: { email: REQUESTER_EMAIL } });
        const inactiveStaffUser = await getPrisma().user.findUnique({ where: { email: INACTIVE_STAFF_EMAIL } });

        staffId = staffUser!.id;
        requesterId = requesterUser!.id;
        inactiveStaffId = inactiveStaffUser!.id;

        // Seeded IT Staff have requiresPasswordChange = true (BR-02); clear flags
        await getPrisma().user.updateMany({
            where: { email: staffUser!.email },
            data: { requiresPasswordChange: false },
        });
        await getPrisma().user.updateMany({
            where: { email: staff2User!.email },
            data: { requiresPasswordChange: false },
        });
        await getPrisma().user.updateMany({
            where: { email: adminUser!.email },
            data: { requiresPasswordChange: false },
        });

        staffToken = (await request(app).post('/api/auth/login').send({ email: STAFF_EMAIL, password: VALID_PASSWORD })).body.token;
        staff2Token = (await request(app).post('/api/auth/login').send({ email: STAFF2_EMAIL, password: VALID_PASSWORD })).body.token;
        adminToken = (await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: VALID_PASSWORD })).body.token;
        requesterToken = (await request(app).post('/api/auth/login').send({ email: REQUESTER_EMAIL, password: VALID_PASSWORD })).body.token;

        const cat = await getPrisma().category.findFirst({ where: { name: 'Network' } });
        const sys = await getPrisma().related_system.findFirst();
        categoryId = cat!.id;
        relatedSystemId = sys!.id;

        let r = await getPrisma().user.findUnique({ where: { email: REQUESTER_EMAIL } });

        const t1 = await getPrisma().ticket.create({
            data: {
                ticketNumber: await generateTicketNumber(),
                submittedById: r!.id,
                categoryId,
                relatedSystemId,
                requestedPriority: 'MEDIUM',
                itPriority: 'MEDIUM',
                summary: `${TEST_PREFIX} Ownership workflow ticket`,
                description: 'Ownership claim and reassignment test ticket.',
                currentStatus: 'NEW',
                ownerId: null,
                updatedAt: new Date(),
            },
        });
        ownershipTicketId = t1.id;
        createdTicketIds.push(t1.id);

        const t2 = await getPrisma().ticket.create({
            data: {
                ticketNumber: await generateTicketNumber(),
                submittedById: r!.id,
                categoryId,
                relatedSystemId,
                requestedPriority: 'HIGH',
                itPriority: 'MEDIUM',
                summary: `${TEST_PREFIX} IT priority calibration ticket`,
                description: 'IT priority modification test ticket.',
                currentStatus: 'NEW',
                ownerId: null,
                updatedAt: new Date(),
            },
        });
        priorityTicketId = t2.id;
        createdTicketIds.push(t2.id);

        const t3 = await getPrisma().ticket.create({
            data: {
                ticketNumber: await generateTicketNumber(),
                submittedById: r!.id,
                categoryId,
                relatedSystemId,
                requestedPriority: 'LOW',
                itPriority: 'LOW',
                summary: `${TEST_PREFIX} Status transition ticket`,
                description: 'Status transition matrix test ticket.',
                currentStatus: 'NEW',
                ownerId: null,
                updatedAt: new Date(),
            },
        });
        statusTicketId = t3.id;
        createdTicketIds.push(t3.id);
    });

    afterAll(async () => {
        await getPrisma().internal_note.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await getPrisma().public_comment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await getPrisma().attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await getPrisma().ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    });

    // ─── GET /api/staff/tickets/:id — full operational detail ─────────────────
    describe('Staff Ticket Detail (api-spec.md §4.2, AC-6.3)', () => {
        it('returns full operational detail including internalNotes for IT_STAFF — HTTP 200', async () => {
            const res = await request(app)
                .get(`/api/staff/tickets/${ownershipTicketId}`)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(ownershipTicketId);
            expect(res.body.ticketNo).toBeDefined();
            expect(res.body.summary).toContain(TEST_PREFIX);
            expect(res.body.requester.email).toBe(REQUESTER_EMAIL);
            expect(res.body.owner).toBeNull();
            expect(Array.isArray(res.body.attachments)).toBe(true);
            expect(Array.isArray(res.body.publicComments)).toBe(true);
            expect(Array.isArray(res.body.internalNotes)).toBe(true);
        });

        it('returns 403 Forbidden when REQUESTER tries to access staff detail', async () => {
            const res = await request(app)
                .get(`/api/staff/tickets/${ownershipTicketId}`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden');
        });

        it('returns 404 for a non-existent ticket', async () => {
            const res = await request(app)
                .get('/api/staff/tickets/99999999')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(404);
        });
    });

    // ─── GET /api/staff/assignees — ownership candidate list (BR-08) ──────────
    describe('Staff Assignees (BR-08, AC-6.1 UI support)', () => {
        it('returns only active IT_STAFF and ADMIN users — HTTP 200', async () => {
            const res = await request(app)
                .get('/api/staff/assignees')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(4); // 3 active staff + 1 admin
            const roles = new Set(res.body.map((u: any) => u.role));
            expect(roles.has('REQUESTER')).toBe(false);
            expect(roles.has('IT_STAFF')).toBe(true);
            expect(roles.has('ADMIN')).toBe(true);
            // No inactive users (e.g. Rachel Green must be absent)
            expect(res.body.find((u: any) => u.id === inactiveStaffId)).toBeUndefined();
            // Must not include requesters
            expect(res.body.find((u: any) => u.id === requesterId)).toBeUndefined();
        });

        it('returns 403 Forbidden for REQUESTER', async () => {
            const res = await request(app)
                .get('/api/staff/assignees')
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(403);
        });
    });

    // ─── API-16: Claim / Reassign Ownership (FR-10, BR-08, AC-6.1) ────────────
    describe('API-16 (AC-6.1): Claim & reassign ticket ownership', () => {
        it('IT Staff can claim an unassigned ticket — HTTP 200, owner set to staff', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${ownershipTicketId}/ownership`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: staffId });

            expect(res.status).toBe(200);
            expect(res.body.owner).not.toBeNull();
            expect(res.body.owner.id).toBe(staffId);
            expect(res.body.owner.role).toBeUndefined(); // owner payload is name/email/id only
        });

        it('IT Staff can reassign ownership to another active IT Staff member — HTTP 200', async () => {
            const staff2 = await getPrisma().user.findUnique({ where: { email: STAFF2_EMAIL } });
            const res = await request(app)
                .patch(`/api/staff/tickets/${ownershipTicketId}/ownership`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: staff2!.id });

            expect(res.status).toBe(200);
            expect(res.body.owner.id).toBe(staff2!.id);
        });

        it('Passing ownerId = null returns the ticket to unassigned — HTTP 200', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${ownershipTicketId}/ownership`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: null });

            expect(res.status).toBe(200);
            expect(res.body.owner).toBeNull();
        });

        it('Rejects a REQUESTER as ownership target — HTTP 400 (BR-08)', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${ownershipTicketId}/ownership`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: requesterId });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('active IT Staff or Administrator');
        });

        it('Rejects an inactive IT Staff member as ownership target — HTTP 400 (BR-08)', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${ownershipTicketId}/ownership`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: inactiveStaffId });

            expect(res.status).toBe(400);
        });

        it('Rejects a non-integer ownerId — HTTP 400', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${ownershipTicketId}/ownership`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: 'abc' });

            expect(res.status).toBe(400);
        });

        it('Returns 403 Forbidden when REQUESTER attempts to assign ownership — AC-6.1', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${ownershipTicketId}/ownership`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({ ownerId: staffId });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden');
        });
    });

    // ─── API-17: IT Priority Calibration (FR-11, BR-09, AC-6.2) ───────────────
    describe('API-17 (AC-6.2): Update IT Priority', () => {
        it('updates itPriority while preserving requestedPriority — HTTP 200', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${priorityTicketId}/priority`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ itPriority: 'URGENT' });

            expect(res.status).toBe(200);
            expect(res.body.itPriority).toBe('URGENT');
            // BR-09: requestedPriority must remain untouched
            expect(res.body.requestedPriority).toBe('HIGH');
        });

        it('rejects an invalid itPriority value — HTTP 400', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${priorityTicketId}/priority`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ itPriority: 'CRITICAL' });

            expect(res.status).toBe(400);
        });

        it('returns 403 Forbidden when REQUESTER attempts IT priority update — AC-6.2', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${priorityTicketId}/priority`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({ itPriority: 'HIGH' });

            expect(res.status).toBe(403);
        });
    });

    // ─── API-18: Permitted Status Transitions (FR-12, BR-12, AC-6.2) ─────────
    describe('API-18 (AC-6.2): Permitted status transitions per matrix', () => {
        it('allows valid transition NEW -> OPEN — HTTP 200', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${statusTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'OPEN' });

            expect(res.status).toBe(200);
            expect(res.body.currentStatus).toBe('OPEN');
        });

        it('allows valid transition OPEN -> IN_PROGRESS — HTTP 200', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${statusTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'IN_PROGRESS' });

            expect(res.status).toBe(200);
            expect(res.body.currentStatus).toBe('IN_PROGRESS');
        });

        it('allows valid transition IN_PROGRESS -> RESOLVED — HTTP 200', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${statusTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'RESOLVED' });

            expect(res.status).toBe(200);
            expect(res.body.currentStatus).toBe('RESOLVED');
        });

        it('rejects illegal jump NEW -> CLOSED — HTTP 422 (BR-12)', async () => {
            // Reset a dedicated ticket to NEW, then attempt the illegal jump
            const reset = await getPrisma().ticket.update({
                where: { id: statusTicketId },
                data: { currentStatus: 'NEW', updatedAt: new Date() },
            });
            expect(reset.currentStatus).toBe('NEW');

            const res = await request(app)
                .patch(`/api/staff/tickets/${statusTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'CLOSED' });

            expect(res.status).toBe(422);
            expect(res.body.error).toBe('Unprocessable Entity');
        });

        it('rejects transition from terminal CANCELLED — HTTP 422', async () => {
            await getPrisma().ticket.update({
                where: { id: statusTicketId },
                data: { currentStatus: 'NEW', updatedAt: new Date() },
            });

            // NEW -> CANCELLED is permitted
            const cancelling = await request(app)
                .patch(`/api/staff/tickets/${statusTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'CANCELLED' });
            expect(cancelling.status).toBe(200);

            // From terminal CANCELLED, REOPEN / any status must fail (422)
            const terminal = await request(app)
                .patch(`/api/staff/tickets/${statusTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'OPEN' });

            expect(terminal.status).toBe(422);
        });

        it('rejects an unknown status value — HTTP 400', async () => {
            await getPrisma().ticket.update({
                where: { id: statusTicketId },
                data: { currentStatus: 'NEW', updatedAt: new Date() },
            });

            const res = await request(app)
                .patch(`/api/staff/tickets/${statusTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'DEFERRED' });

            expect(res.status).toBe(400);
        });

        it('returns 403 Forbidden when REQUESTER attempts status transition — AC-6.2', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${statusTicketId}/status`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({ status: 'OPEN' });

            expect(res.status).toBe(403);
        });
    });
});