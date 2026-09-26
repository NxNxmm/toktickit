import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { generateTicketNumber } from '../../src/utils/ticketNumber.js';

const TEST_SUMMARY_PREFIX = '[STAFF-QUEUE-TEST]';

// Seeded IT_STAFF account (see server/prisma/seed.ts). Hardcoded by email because
// the dev DB may contain leftover IT_STAFF users from earlier sprints whose
// password differs from the seed password "Password123!".
const STAFF_EMAIL = 'alex.turner@toktickit.kmutt.ac.th';
const ADMIN_EMAIL = 'admin@toktickit.kmutt.ac.th';

describe('GET /api/staff/tickets (Issue 5 — AC-5.1, AC-5.2, AC-5.3)', () => {
    let staffToken: string;
    let adminToken: string;
    let requesterToken: string;
    let staffId: number;
    let requesterId: number;

    let categoryId: number;
    let relatedSystemId: number;
    let ticket1Id: number;
    let ticket2Id: number;

    beforeAll(async () => {
        // ─── Fetch seeded users ──────────────────────────────────────────────
        const staffUser = await getPrisma().user.findUnique({
            where: { email: STAFF_EMAIL },
        });
        const adminUser = await getPrisma().user.findUnique({
            where: { email: ADMIN_EMAIL },
        });
        const requesterUser = await getPrisma().user.findFirst({
            where: { isActive: true, role: 'REQUESTER', email: 'jennifer.anderson@kmutt.ac.th' },
        });

        staffId = staffUser!.id;
        requesterId = requesterUser!.id;

        // Seeded IT Staff have requiresPasswordChange = true (BR-02); clear the
        // flag so operational endpoints are reachable during the tests.
        await getPrisma().user.updateMany({
            where: { email: staffUser!.email },
            data: { requiresPasswordChange: false },
        });

        // ─── Login ───────────────────────────────────────────────────────────
        const staffLogin = await request(app).post('/api/auth/login').send({ email: staffUser!.email, password: 'Password123!' });
        staffToken = staffLogin.body.token;

        const adminLogin = await request(app).post('/api/auth/login').send({ email: adminUser!.email, password: 'Password123!' });
        adminToken = adminLogin.body.token;

        const requesterLogin = await request(app).post('/api/auth/login').send({ email: requesterUser!.email, password: 'Password123!' });
        requesterToken = requesterLogin.body.token;

        // ─── Reference data ──────────────────────────────────────────────────
        const cat = await getPrisma().category.findFirst({ where: { name: 'Network' } });
        const sys = await getPrisma().related_system.findFirst();
        categoryId = cat!.id;
        relatedSystemId = sys!.id;

        // ─── Create test tickets for Jennifer (requester) ────────────────────
        // Uses a dedicated summary prefix so cleanup is targeted and the seeded
        // production tickets / other Lab-03 suites are left untouched.
        const r = await getPrisma().user.findUnique({
            where: { email: 'jennifer.anderson@kmutt.ac.th' },
        });

        const t1 = await getPrisma().ticket.create({
            data: {
                ticketNumber: await generateTicketNumber(),
                submittedById: r!.id,
                categoryId,
                relatedSystemId,
                requestedPriority: 'HIGH',
                itPriority: 'HIGH',
                summary: `${TEST_SUMMARY_PREFIX} Campus Wi-Fi drops in CB2`,
                description: 'Wi-Fi drops every 5 minutes.',
                currentStatus: 'IN_PROGRESS',
                ownerId: staffId,
                updatedAt: new Date(),
            },
        });
        ticket1Id = t1.id;

        const t2 = await getPrisma().ticket.create({
            data: {
                ticketNumber: await generateTicketNumber(),
                submittedById: r!.id,
                categoryId,
                relatedSystemId,
                requestedPriority: 'LOW',
                itPriority: 'LOW',
                summary: `${TEST_SUMMARY_PREFIX} Printer offline in Room 202`,
                description: 'Cannot print from any workstation.',
                currentStatus: 'NEW',
                ownerId: null,
                updatedAt: new Date(),
            },
        });
        ticket2Id = t2.id;
    });

    afterAll(async () => {
        // Remove only the tickets created by this suite (and their dependents).
        await getPrisma().internal_note.deleteMany({ where: { ticketId: { in: [ticket1Id, ticket2Id] } } });
        await getPrisma().public_comment.deleteMany({ where: { ticketId: { in: [ticket1Id, ticket2Id] } } });
        await getPrisma().attachment.deleteMany({ where: { ticketId: { in: [ticket1Id, ticket2Id] } } });
        await getPrisma().ticket.deleteMany({ where: { id: { in: [ticket1Id, ticket2Id] } } });
    });

    // ─── AC-5.1: IT_STAFF can access the global queue ────────────────────────
    it('returns 200 and a paginated list of all tickets for IT_STAFF (AC-5.1)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets?page=1&pageSize=10')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.tickets)).toBe(true);
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.pageSize).toBe(10);
        expect(res.body.pagination.totalCount).toBeGreaterThanOrEqual(2);
        // Tickets include requester and owner info
        const t = res.body.tickets[0];
        expect(t.id).toBeDefined();
        expect(t.ticketNo).toBeDefined();
        expect(t.summary).toBeDefined();
        expect(t.requester).toBeDefined();
        expect(t.category).toBeDefined();
        expect(t.currentStatus).toBeDefined();
    });

    it('returns 200 for ADMIN (AC-5.1)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets?page=1&pageSize=10')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.tickets)).toBe(true);
    });

    // ─── AC-5.2: Search, filter, sort, pagination ────────────────────────────
    it('filters by search term (Ticket No / Summary substring) (AC-5.2)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets?search=Wi-Fi&page=1&pageSize=10')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        const found = res.body.tickets.find((t: any) => t.id === ticket1Id);
        expect(found).toBeDefined();
        // ticket2 (Printer) should NOT appear in Wi-Fi search
        const notFound = res.body.tickets.find((t: any) => t.id === ticket2Id);
        expect(notFound).toBeUndefined();
    });

    it('filters by categoryId (AC-5.2)', async () => {
        const res = await request(app)
            .get(`/api/staff/tickets?categoryId=${categoryId}&page=1&pageSize=10`)
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.tickets.every((t: any) => t.category.id === categoryId)).toBe(true);
    });

    it('filters by status (AC-5.2)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets?status=NEW&page=1&pageSize=10')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.tickets.every((t: any) => t.currentStatus === 'NEW')).toBe(true);
    });

    it('filters by requestedPriority (AC-5.2)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets?requestedPriority=HIGH&page=1&pageSize=10')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.tickets.every((t: any) => t.requestedPriority === 'HIGH')).toBe(true);
    });

    it('filters by ownerId=unassigned returns unassigned tickets (AC-5.2)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets?ownerId=unassigned&page=1&pageSize=10')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.tickets.every((t: any) => t.owner === null)).toBe(true);
        const unassigned = res.body.tickets.find((t: any) => t.id === ticket2Id);
        expect(unassigned).toBeDefined();
    });

    it('filters by ownerId returns tickets owned by that staff member (AC-5.2)', async () => {
        const res = await request(app)
            .get(`/api/staff/tickets?ownerId=${staffId}&page=1&pageSize=10`)
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.tickets.every((t: any) => t.owner?.id === staffId)).toBe(true);
    });

    it('supports sorting by createdAt asc (AC-5.2)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets?sortBy=createdAt&sortOrder=asc&page=1&pageSize=50')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        const dates = res.body.tickets.map((t: any) => new Date(t.createdAt).getTime());
        for (let i = 1; i < dates.length; i++) {
            expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
        }
    });

    it('supports pagination pageSize=20 (AC-5.2)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets?page=1&pageSize=20')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.pagination.pageSize).toBe(20);
        expect(res.body.tickets.length).toBeLessThanOrEqual(20);
    });

    // ─── AC-5.3: REQUESTER receives 403, unauthenticated receives 401 ────────
    it('returns 403 Forbidden when Requester attempts access (AC-5.3)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets')
            .set('Authorization', `Bearer ${requesterToken}`);
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Forbidden');
    });

    it('returns 401 Unauthorized when not authenticated (AC-5.3)', async () => {
        const res = await request(app).get('/api/staff/tickets');
        expect(res.status).toBe(401);
    });

    it('returns 401 when X-Requester-Id header is sent without Bearer token (AC-5.3)', async () => {
        const res = await request(app)
            .get('/api/staff/tickets')
            .set('X-Requester-Id', String(requesterId));
        expect(res.status).toBe(401);
    });
});
