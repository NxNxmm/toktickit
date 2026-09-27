import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

/**
 * comments-notes.api.test.ts
 *
 * Tests: API-10, API-11, API-12, API-19
 * ACs : AC-4.2, AC-4.3, AC-4.4
 * BRs : BR-13, BR-14, BR-15, BR-16, BR-17
 */

describe('Public Comments, Resolve Indication & Internal Notes (Lab 3 Issue 4)', () => {
    const requesterEmail = 'jennifer.anderson@kmutt.ac.th';
    const otherRequesterEmail = 'michael.brown@kmutt.ac.th';
    const staffEmail = 'alex.turner@toktickit.kmutt.ac.th';
    const validPassword = 'Password123!';

    let requesterToken: string;
    let otherRequesterToken: string;
    let staffToken: string;
    let ownedTicketId: number;
    let foreignTicketId: number; // owned by otherRequester

    // ── Helpers ──
    async function loginAs(email: string): Promise<string> {
        // Reset requiresPasswordChange for staff so they can pass the password policy guard
        if (email === staffEmail) {
            await getPrisma().user.updateMany({
                where: { email: staffEmail },
                data: { requiresPasswordChange: false },
            });
        }
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password: validPassword });
        return res.body.token as string;
    }

    beforeAll(async () => {
        requesterToken = await loginAs(requesterEmail);
        otherRequesterToken = await loginAs(otherRequesterEmail);
        staffToken = await loginAs(staffEmail);

        // Find a ticket belonging to jennifer.anderson
        const requesterUser = await getPrisma().user.findUnique({ where: { email: requesterEmail } });
        const ownedTicket = await getPrisma().ticket.findFirst({ where: { submittedById: requesterUser!.id } });
        ownedTicketId = ownedTicket!.id;

        // Find a ticket belonging to michael.brown (foreign to jennifer)
        const otherUser = await getPrisma().user.findUnique({ where: { email: otherRequesterEmail } });
        const foreignTicket = await getPrisma().ticket.findFirst({ where: { submittedById: otherUser!.id } });
        foreignTicketId = foreignTicket!.id;
    });

    afterAll(async () => {
        // Clean up any comments/notes created during tests
        await getPrisma().public_comment.deleteMany({
            where: { content: { startsWith: '[TEST]' } },
        });
        await getPrisma().internal_note.deleteMany({
            where: { content: { startsWith: '[TEST]' } },
        });
    });

    // ─── API-10: Post and Get Public Comments ───────────────────────────────────
    describe('API-10 (FR-07, BR-14, AC-4.2): Public Comments — post and retrieve', () => {
        it('Requester owner can POST a public comment on their ticket — HTTP 201', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/comments`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({ content: '[TEST] Requester comment via API-10' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.content).toBe('[TEST] Requester comment via API-10');
            expect(res.body).toHaveProperty('author');
            expect(res.body.author.role).toBe('REQUESTER');
            expect(res.body).toHaveProperty('createdAt');
            expect(res.body.ticketId).toBe(ownedTicketId);
        });

        it('IT Staff can POST a public comment — HTTP 201', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/comments`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ content: '[TEST] Staff public comment via API-10' });

            expect(res.status).toBe(201);
            expect(res.body.author.role).toBe('IT_STAFF');
        });

        it('GET public comments returns comment list — HTTP 200', async () => {
            const res = await request(app)
                .get(`/api/tickets/${ownedTicketId}/comments`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // Each comment must have author, content, createdAt, ticketId
            const comment = res.body[0];
            expect(comment).toHaveProperty('author');
            expect(comment).toHaveProperty('content');
            expect(comment).toHaveProperty('createdAt');
        });

        it('Requester on foreign ticket gets 403 when trying to post comment — BR-06', async () => {
            const res = await request(app)
                .post(`/api/tickets/${foreignTicketId}/comments`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({ content: '[TEST] Should be rejected' });

            expect(res.status).toBe(403);
        });

        it('Empty content rejected with 400 — BR-16', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/comments`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({ content: '' });

            expect(res.status).toBe(400);
        });

        it('Content > 2000 chars rejected with 400 — BR-16', async () => {
            const longContent = 'A'.repeat(2001);
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/comments`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({ content: longContent });

            expect(res.status).toBe(400);
        });

        it('Unauthenticated request returns 401', async () => {
            const res = await request(app)
                .get(`/api/tickets/${ownedTicketId}/comments`);

            expect(res.status).toBe(401);
        });
    });

    // ─── API-11: Problem Appears Resolved Indication ────────────────────────────
    describe('API-11 (FR-08, BR-13, AC-4.3): Problem Appears Resolved — resolve indication', () => {
        it('Requester owner can POST resolve-indication — HTTP 200, formal status unchanged', async () => {
            // Get the ticket's current status before
            const ticketBefore = await getPrisma().ticket.findUnique({
                where: { id: ownedTicketId },
                select: { currentStatus: true },
            });
            const statusBefore = ticketBefore!.currentStatus;

            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/resolve-indication`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(200);
            expect(res.body.resolvedIndicated).toBe(true);
            expect(res.body).toHaveProperty('resolvedIndicatedAt');
            expect(res.body.message).toContain('indication');

            // Verify formal status did NOT change (BR-13)
            const ticketAfter = await getPrisma().ticket.findUnique({
                where: { id: ownedTicketId },
                select: { currentStatus: true, resolvedIndicated: true, resolvedIndicatedAt: true },
            });
            expect(ticketAfter!.currentStatus).toBe(statusBefore);
            expect(ticketAfter!.resolvedIndicated).toBe(true);
            expect(ticketAfter!.resolvedIndicatedAt).not.toBeNull();
        });

        it('IT Staff attempting resolve-indication returns 403 — AC-4.3 (REQUESTER-only)', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/resolve-indication`)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(403);
        });

        it('Requester on foreign ticket gets 403 — BR-06', async () => {
            const res = await request(app)
                .post(`/api/tickets/${foreignTicketId}/resolve-indication`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(403);
        });

        it('Unauthenticated request returns 401', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/resolve-indication`);

            expect(res.status).toBe(401);
        });
    });

    // ─── API-12: Requester Denied Internal Notes ────────────────────────────────
    describe('API-12 (FR-13, BR-15, AC-4.4): Internal Notes — strictly 403 for REQUESTER', () => {
        it('REQUESTER calling GET /notes receives 403 Forbidden — AC-4.4', async () => {
            const res = await request(app)
                .get(`/api/tickets/${ownedTicketId}/notes`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden');
        });

        it('REQUESTER calling POST /notes receives 403 Forbidden — AC-4.4', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/notes`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({ content: '[TEST] Requester internal note attempt' });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden');
        });

        it('Ticket detail response served to REQUESTER omits internalNotes — BR-15', async () => {
            const res = await request(app)
                .get(`/api/tickets/${ownedTicketId}`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(200);
            // Internal notes must be absent from the requester-visible ticket payload
            expect(res.body).not.toHaveProperty('internalNotes');
        });

        it('Unauthenticated request to /notes returns 401', async () => {
            const res = await request(app)
                .get(`/api/tickets/${ownedTicketId}/notes`);

            expect(res.status).toBe(401);
        });
    });

    // ─── API-19: Create and Retrieve Internal Notes (Staff) ─────────────────────
    describe('API-19 (FR-13, BR-15, AC-6.3): Internal Notes — IT Staff can create and retrieve', () => {
        it('IT Staff can POST an internal note — HTTP 201', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/notes`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ content: '[TEST] Staff internal note via API-19' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.content).toBe('[TEST] Staff internal note via API-19');
            expect(res.body.author.role).toBe('IT_STAFF');
            expect(res.body).toHaveProperty('createdAt');
            expect(res.body.ticketId).toBe(ownedTicketId);
        });

        it('IT Staff can GET internal notes — HTTP 200', async () => {
            const res = await request(app)
                .get(`/api/tickets/${ownedTicketId}/notes`)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('Empty note content rejected with 400 — BR-16', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/notes`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ content: '   ' });

            expect(res.status).toBe(400);
        });

        it('Author identity stamped from session (BR-17) — client-supplied authorId ignored', async () => {
            const res = await request(app)
                .post(`/api/tickets/${ownedTicketId}/notes`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ content: '[TEST] Author identity check', authorId: 9999 });

            expect(res.status).toBe(201);
            // The author id in response must be the real staff user, not 9999
            expect(res.body.author.id).not.toBe(9999);
        });
    });
});
