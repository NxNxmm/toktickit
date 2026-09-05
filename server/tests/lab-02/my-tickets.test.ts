import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { generateTicketNumber } from '../../src/utils/ticketNumber.js';

describe('GET /api/tickets (Issue 5 - AC 1, AC 2, AC 3, AC 4)', () => {
    let requester1Id: number;
    let requester2Id: number;
    let category1Id: number;
    let category2Id: number;
    let relatedSystemId: number;

    beforeAll(async () => {
        // Find existing seed data - use Sarah and David so we do not conflict with other test suites running in parallel
        const r1 = await getPrisma().requesterUser.findFirst({ where: { isActive: true, email: 'sarah.johnson@kmutt.ac.th' } });
        const r2 = await getPrisma().requesterUser.findFirst({ where: { isActive: true, email: 'david.lee@kmutt.ac.th' } });
        const cat1 = await getPrisma().category.findFirst({ where: { name: 'Hardware' } });
        const cat2 = await getPrisma().category.findFirst({ where: { name: 'Software' } });
        const sys = await getPrisma().relatedSystem.findFirst();

        requester1Id = r1!.id;
        requester2Id = r2!.id;
        category1Id = cat1!.id;
        category2Id = cat2!.id;
        relatedSystemId = sys!.id;

        // Clean up tickets for requester 1 and 2 before testing
        await getPrisma().attachment.deleteMany({
            where: {
                ticket: {
                    requesterId: { in: [requester1Id, requester2Id] },
                },
            },
        });
        await getPrisma().ticket.deleteMany({
            where: {
                requesterId: { in: [requester1Id, requester2Id] },
            },
        });

        // Seed 12 tickets for Requester 1
        for (let i = 1; i <= 12; i++) {
            const ticketNo = await generateTicketNumber();
            await getPrisma().ticket.create({
                data: {
                    ticketNo,
                    requesterId: requester1Id,
                    categoryId: i % 2 === 0 ? category1Id : category2Id,
                    relatedSystemId,
                    requestedPriority: i === 1 ? 'URGENT' : i <= 4 ? 'HIGH' : i <= 8 ? 'MEDIUM' : 'LOW',
                    summary: i === 5 ? 'Unique Keyword Issue Printer' : `Ticket summary test ${i}`,
                    description: `Detailed description for test ticket ${i} with sufficient length.`,
                    currentStatus: i === 1 ? 'RESOLVED' : i === 2 ? 'IN_PROGRESS' : 'NEW',
                },
            });
        }

        // Seed 2 tickets for Requester 2 (to test ownership isolation)
        for (let i = 1; i <= 2; i++) {
            const ticketNo = await generateTicketNumber();
            await getPrisma().ticket.create({
                data: {
                    ticketNo,
                    requesterId: requester2Id,
                    categoryId: category1Id,
                    relatedSystemId,
                    requestedPriority: 'LOW',
                    summary: `Requester 2 ticket ${i}`,
                    description: `Description for requester 2 ticket ${i} with sufficient length.`,
                    currentStatus: 'NEW',
                },
            });
        }
    });

    it('should return 401 if X-Requester-Id is missing or invalid', async () => {
        const resMissing = await request(app).get('/api/tickets');
        expect(resMissing.status).toBe(401);

        const resInvalid = await request(app).get('/api/tickets').set('X-Requester-Id', 'abc');
        expect(resInvalid.status).toBe(401);
    });

    it('should return 403 if requester is inactive or not found', async () => {
        const inactiveUser = await getPrisma().requesterUser.findFirst({ where: { isActive: false } });
        const resInactive = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(inactiveUser!.id));
        expect(resInactive.status).toBe(403);

        const resNotFound = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', '999999');
        expect(resNotFound.status).toBe(403);
    });

    it('strictly returns only tickets owned by the active X-Requester-Id (AC 1)', async () => {
        const res1 = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ pageSize: 50 });

        expect(res1.status).toBe(200);
        expect(res1.body.pagination.totalCount).toBe(12);
        for (const item of res1.body.items) {
            expect(item.summary).not.toContain('Requester 2');
        }

        const res2 = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester2Id));

        expect(res2.status).toBe(200);
        expect(res2.body.pagination.totalCount).toBe(2);
        for (const item of res2.body.items) {
            expect(item.summary).toContain('Requester 2');
        }
    });

    it('filters results by substring match on Ticket Number and Summary (AC 2)', async () => {
        // Search by summary keyword
        const resKeyword = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ search: 'Unique Keyword' });

        expect(resKeyword.status).toBe(200);
        expect(resKeyword.body.items.length).toBe(1);
        expect(resKeyword.body.items[0].summary).toContain('Unique Keyword Issue Printer');

        // Search case-insensitively
        const resCase = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ search: 'unique keyword' });
        expect(resCase.status).toBe(200);
        expect(resCase.body.items.length).toBe(1);

        // Search by Ticket Number substring
        const sampleTicketNo = resKeyword.body.items[0].ticketNo;
        const subTicketNo = sampleTicketNo.slice(4, 11); // e.g. "2026-00"
        const resTicketNo = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ search: subTicketNo });

        expect(resTicketNo.status).toBe(200);
        expect(resTicketNo.body.items.length).toBeGreaterThanOrEqual(1);
        expect(resTicketNo.body.items.some((t: any) => t.ticketNo === sampleTicketNo)).toBe(true);
    });

    it('filters by Category, Priority, and Status (AC 3)', async () => {
        // Filter by Priority
        const resPriority = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ requestedPriority: 'URGENT' });

        expect(resPriority.status).toBe(200);
        expect(resPriority.body.pagination.totalCount).toBe(1);
        expect(resPriority.body.items[0].requestedPriority).toBe('URGENT');

        // Filter by Status
        const resStatus = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ status: 'RESOLVED' });

        expect(resStatus.status).toBe(200);
        expect(resStatus.body.pagination.totalCount).toBe(1);
        expect(resStatus.body.items[0].currentStatus).toBe('RESOLVED');

        // Filter by Category
        const resCat = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ categoryId: category1Id });

        expect(resCat.status).toBe(200);
        for (const item of resCat.body.items) {
            expect(item.category.id).toBe(category1Id);
        }
    });

    it('supports pagination with page sizes 10, 20, 50 and accurate item ranges (AC 4)', async () => {
        // Default page size (10)
        const resPage1 = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ page: 1, pageSize: 10 });

        expect(resPage1.status).toBe(200);
        expect(resPage1.body.items.length).toBe(10);
        expect(resPage1.body.pagination).toEqual({
            page: 1,
            pageSize: 10,
            totalCount: 12,
            totalPages: 2,
            hasPrevious: false,
            hasNext: true,
        });

        // Page 2
        const resPage2 = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ page: 2, pageSize: 10 });

        expect(resPage2.status).toBe(200);
        expect(resPage2.body.items.length).toBe(2);
        expect(resPage2.body.pagination).toEqual({
            page: 2,
            pageSize: 10,
            totalCount: 12,
            totalPages: 2,
            hasPrevious: true,
            hasNext: false,
        });

        // Page size 20
        const resPageSize20 = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ pageSize: 20 });

        expect(resPageSize20.status).toBe(200);
        expect(resPageSize20.body.items.length).toBe(12);
        expect(resPageSize20.body.pagination.totalPages).toBe(1);
    });

    it('returns 400 for invalid query parameters', async () => {
        const testCases = [
            { query: { sortBy: 'invalidColumn' }, message: /sortBy/i },
            { query: { sortOrder: 'sideways' }, message: /sortOrder/i },
            { query: { page: '0' }, message: /page/i },
            { query: { page: '-5' }, message: /page/i },
            { query: { pageSize: '15' }, message: /pageSize/i },
            { query: { requestedPriority: 'INVALID' }, message: /requestedPriority/i },
            { query: { status: 'INVALID' }, message: /status/i },
            { query: { categoryId: 'invalid' }, message: /category/i },
        ];

        for (const tc of testCases) {
            const res = await request(app)
                .get('/api/tickets')
                .set('X-Requester-Id', String(requester1Id))
                .query(tc.query);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(tc.message);
        }
    });

    it('supports sorting by ticketNo and createdAt', async () => {
        const resAsc = await request(app)
            .get('/api/tickets')
            .set('X-Requester-Id', String(requester1Id))
            .query({ sortBy: 'createdAt', sortOrder: 'asc', pageSize: 10 });

        expect(resAsc.status).toBe(200);
        const dates = resAsc.body.items.map((t: any) => new Date(t.createdAt).getTime());
        for (let i = 1; i < dates.length; i++) {
            expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
        }
    });
});
