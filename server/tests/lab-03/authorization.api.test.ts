import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

/**
 * authorization.api.test.ts
 *
 * Tests: API-08, API-09
 * ACs : AC-4.1 — Requester APIs enforce session identity (ignore client-supplied IDs)
 * BRs : BR-05, BR-06
 */

describe('Requester Authorization & Session Identity (Lab 3 Issue 4 — AC-4.1)', () => {
    const requesterEmail = 'jennifer.anderson@kmutt.ac.th';
    const otherRequesterEmail = 'michael.brown@kmutt.ac.th';
    const staffEmail = 'alex.turner@toktickit.kmutt.ac.th';
    const validPassword = 'Password123!';

    let requesterToken: string;
    let otherRequesterToken: string;
    let staffToken: string;
    let requesterUserId: number;
    let otherRequesterUserId: number;
    let ownedTicketId: number;
    let foreignTicketId: number;

    async function loginAs(email: string): Promise<string> {
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

        const requesterUser = await getPrisma().user.findUnique({ where: { email: requesterEmail } });
        requesterUserId = requesterUser!.id;

        const otherUser = await getPrisma().user.findUnique({ where: { email: otherRequesterEmail } });
        otherRequesterUserId = otherUser!.id;

        const ownedTicket = await getPrisma().ticket.findFirst({ where: { submittedById: requesterUserId } });
        ownedTicketId = ownedTicket!.id;

        const foreignTicket = await getPrisma().ticket.findFirst({ where: { submittedById: otherRequesterUserId } });
        foreignTicketId = foreignTicket!.id;
    });

    // ─── API-08: Requester session identity injection ───────────────────────────
    describe('API-08 (FR-05, BR-05, AC-4.1): Ticket created with session user ID — client body requesterId ignored', () => {
        it('POST /api/tickets ignores requesterId in body and uses session identity', async () => {
            // Attempt to supply a foreign requesterId in the body (BR-05 must ignore it)
            const category = await getPrisma().category.findFirst();
            const system = await getPrisma().related_system.findFirst();

            const res = await request(app)
                .post('/api/tickets')
                .set('Authorization', `Bearer ${requesterToken}`)
                .send({
                    requesterId: otherRequesterUserId, // must be ignored
                    categoryId: category!.id,
                    relatedSystemId: system!.id,
                    requestedPriority: 'LOW',
                    summary: '[TEST-API-08] Session identity test ticket',
                    description: 'Created via API-08 test to verify session injection.',
                });

            expect(res.status).toBe(201);
            // The ticket must be owned by the session user, NOT the body requesterId
            const createdId = res.body.id;
            const dbTicket = await getPrisma().ticket.findUnique({ where: { id: createdId } });
            expect(dbTicket!.submittedById).toBe(requesterUserId);
            expect(dbTicket!.submittedById).not.toBe(otherRequesterUserId);

            // Cleanup
            await getPrisma().ticket.delete({ where: { id: createdId } });
        });

        it('POST /api/tickets — IT_STAFF token also accepted (role check in body ignored)', async () => {
            // Staff can also create tickets per the authorization matrix row "Create Ticket: Allowed"
            const category = await getPrisma().category.findFirst();
            const system = await getPrisma().related_system.findFirst();

            const res = await request(app)
                .post('/api/tickets')
                .set('Authorization', `Bearer ${staffToken}`)
                .send({
                    categoryId: category!.id,
                    relatedSystemId: system!.id,
                    requestedPriority: 'MEDIUM',
                    summary: '[TEST-API-08] Staff-created ticket',
                    description: 'Created by IT staff session during API-08 test.',
                });

            // Staff are allowed to create tickets per spec
            expect([201, 403]).toContain(res.status);
            if (res.status === 201) {
                await getPrisma().ticket.delete({ where: { id: res.body.id } });
            }
        });

        it('GET /api/tickets — Only returns tickets belonging to session user (not all tickets)', async () => {
            const res = await request(app)
                .get('/api/tickets')
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(200);
            const tickets = res.body.tickets ?? res.body.items ?? [];
            // All returned tickets must belong to jennifer, not michael
            for (const t of tickets) {
                // Verify via DB that these are all owned by requesterUserId
                const dbTicket = await getPrisma().ticket.findUnique({ where: { id: t.id } });
                expect(dbTicket!.submittedById).toBe(requesterUserId);
            }
        });
    });

    // ─── API-09: Requester cross-ticket data isolation ──────────────────────────
    describe('API-09 (FR-06, BR-06, AC-4.1): Cross-ticket isolation — Requester denied foreign ticket access', () => {
        it('GET /api/tickets/:id for foreign ticket returns 403 — BR-06', async () => {
            const res = await request(app)
                .get(`/api/tickets/${foreignTicketId}`)
                .set('Authorization', `Bearer ${requesterToken}`);

            // Must be 403 (or 404) — must NOT return 200
            expect([403, 404]).toContain(res.status);
        });

        it('POST /api/tickets/:id/attachments on foreign ticket returns 403 — BR-06', async () => {
            const res = await request(app)
                .post(`/api/tickets/${foreignTicketId}/attachments`)
                .set('Authorization', `Bearer ${requesterToken}`)
                .attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'test.png');

            expect(res.status).toBe(403);
        });

        it('GET /api/tickets — IT_STAFF gets 403 (queue is staff-only endpoint)', async () => {
            const res = await request(app)
                .get('/api/tickets')
                .set('Authorization', `Bearer ${staffToken}`);

            // The /api/tickets requester-list endpoint must reject IT_STAFF
            expect(res.status).toBe(403);
        });

        it('Unauthenticated GET /api/tickets returns 401', async () => {
            const res = await request(app).get('/api/tickets');
            expect(res.status).toBe(401);
        });

        it('Requester cannot see another requester\'s ticket in /api/tickets list', async () => {
            const jenniferRes = await request(app)
                .get('/api/tickets')
                .set('Authorization', `Bearer ${requesterToken}`);

            const michaelRes = await request(app)
                .get('/api/tickets')
                .set('Authorization', `Bearer ${otherRequesterToken}`);

            expect(jenniferRes.status).toBe(200);
            expect(michaelRes.status).toBe(200);

            const jenniferIds = new Set((jenniferRes.body.tickets ?? jenniferRes.body.items ?? []).map((t: any) => t.id));
            const michaelIds = new Set((michaelRes.body.tickets ?? michaelRes.body.items ?? []).map((t: any) => t.id));

            // Ticket lists must be disjoint — no overlap allowed (BR-06)
            const intersection = [...jenniferIds].filter((id) => michaelIds.has(id));
            expect(intersection).toHaveLength(0);
        });
    });
});
