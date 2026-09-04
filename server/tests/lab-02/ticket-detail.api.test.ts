import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { generateTicketNumber } from '../../src/utils/ticketNumber.js';

describe('GET /api/tickets/:id (Issue 6 - API-08, API-09)', () => {
    let requester1Id: number;
    let requester2Id: number;
    let ticket1Id: number;
    let ticket2Id: number; // belongs to requester2

    beforeAll(async () => {
        const r1 = await getPrisma().requesterUser.findFirst({
            where: { isActive: true, email: 'jennifer.anderson@kmutt.ac.th' },
        });
        const r2 = await getPrisma().requesterUser.findFirst({
            where: { isActive: true, email: 'michael.brown@kmutt.ac.th' },
        });
        const cat = await getPrisma().category.findFirst({ where: { name: 'Hardware' } });
        const sys = await getPrisma().relatedSystem.findFirst();

        requester1Id = r1!.id;
        requester2Id = r2!.id;

        // Clean previous test data
        await getPrisma().attachment.deleteMany({
            where: {
                ticket: { requesterId: { in: [requester1Id, requester2Id] } },
            },
        });
        await getPrisma().ticket.deleteMany({
            where: { requesterId: { in: [requester1Id, requester2Id] } },
        });

        // Create a ticket for requester1 with one active and one soft-removed attachment
        const t1 = await getPrisma().ticket.create({
            data: {
                ticketNo: await generateTicketNumber(),
                requesterId: requester1Id,
                categoryId: cat!.id,
                relatedSystemId: sys!.id,
                requestedPriority: 'MEDIUM',
                summary: 'Detail view test ticket',
                description: 'A detailed description for the detail view test ticket.',
                currentStatus: 'NEW',
            },
        });
        ticket1Id = t1.id;

        // Active attachment
        await getPrisma().attachment.create({
            data: {
                ticketId: ticket1Id,
                originalName: 'active-file.pdf',
                storedFileName: 'uuid-active-file.pdf',
                fileSize: 102400,
                mimeType: 'application/pdf',
                isRemoved: false,
            },
        });

        // Soft-removed attachment
        await getPrisma().attachment.create({
            data: {
                ticketId: ticket1Id,
                originalName: 'removed-file.png',
                storedFileName: 'uuid-removed-file.png',
                fileSize: 51200,
                mimeType: 'image/png',
                isRemoved: true,
                removedAt: new Date(),
                removalReason: 'Wrong screenshot uploaded',
            },
        });

        // Create a ticket for requester2 (to test ownership isolation)
        const t2 = await getPrisma().ticket.create({
            data: {
                ticketNo: await generateTicketNumber(),
                requesterId: requester2Id,
                categoryId: cat!.id,
                relatedSystemId: sys!.id,
                requestedPriority: 'LOW',
                summary: 'Requester 2 own ticket',
                description: 'Description for requester 2 ticket testing ownership isolation.',
                currentStatus: 'NEW',
            },
        });
        ticket2Id = t2.id;
    });

    it('should return 401 if X-Requester-Id is missing or invalid', async () => {
        const resMissing = await request(app).get(`/api/tickets/${ticket1Id}`);
        expect(resMissing.status).toBe(401);

        const resInvalid = await request(app)
            .get(`/api/tickets/${ticket1Id}`)
            .set('X-Requester-Id', 'not-a-number');
        expect(resInvalid.status).toBe(401);
    });

    it('should return 403 if requester is inactive or does not exist', async () => {
        const inactive = await getPrisma().requesterUser.findFirst({ where: { isActive: false } });
        const resInactive = await request(app)
            .get(`/api/tickets/${ticket1Id}`)
            .set('X-Requester-Id', String(inactive!.id));
        expect(resInactive.status).toBe(403);

        const resNotFound = await request(app)
            .get(`/api/tickets/${ticket1Id}`)
            .set('X-Requester-Id', '999999');
        expect(resNotFound.status).toBe(403);
    });

    it('returns 404 when ticket does not exist (API-08)', async () => {
        const res = await request(app)
            .get('/api/tickets/999999')
            .set('X-Requester-Id', String(requester1Id));
        expect(res.status).toBe(404);
    });

    it('returns full ticket detail with attachments when owner requests it (API-08)', async () => {
        const res = await request(app)
            .get(`/api/tickets/${ticket1Id}`)
            .set('X-Requester-Id', String(requester1Id));

        expect(res.status).toBe(200);

        // Ticket fields
        expect(res.body.id).toBe(ticket1Id);
        expect(res.body.ticketNo).toMatch(/^TKT-\d{4}-\d{6}$/);
        expect(res.body.requesterId).toBe(requester1Id);
        expect(res.body.summary).toBe('Detail view test ticket');
        expect(res.body.currentStatus).toBe('NEW');

        // Nested relations
        expect(res.body.requester).toBeDefined();
        expect(res.body.requester.id).toBe(requester1Id);
        expect(res.body.requester.name).toBeDefined();
        expect(res.body.requester.email).toBeDefined();
        expect(res.body.category).toBeDefined();
        expect(res.body.relatedSystem).toBeDefined();

        // Attachments — both active and removed
        expect(Array.isArray(res.body.attachments)).toBe(true);
        expect(res.body.attachments.length).toBe(2);

        const activeAtts = res.body.attachments.filter((a: any) => !a.isRemoved);
        const removedAtts = res.body.attachments.filter((a: any) => a.isRemoved);

        expect(activeAtts.length).toBe(1);
        expect(activeAtts[0].originalName).toBe('active-file.pdf');
        expect(activeAtts[0].mimeType).toBe('application/pdf');
        expect(activeAtts[0].fileSize).toBe(102400);

        expect(removedAtts.length).toBe(1);
        expect(removedAtts[0].originalName).toBe('removed-file.png');
        expect(removedAtts[0].isRemoved).toBe(true);
        expect(removedAtts[0].removalReason).toBe('Wrong screenshot uploaded');
        expect(removedAtts[0].removedAt).toBeDefined();
    });

    it('returns 403 when requester tries to access another requester\'s ticket (API-09)', async () => {
        // requester1 tries to access requester2's ticket
        const res = await request(app)
            .get(`/api/tickets/${ticket2Id}`)
            .set('X-Requester-Id', String(requester1Id));
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Forbidden');

        // requester2 tries to access requester1's ticket
        const res2 = await request(app)
            .get(`/api/tickets/${ticket1Id}`)
            .set('X-Requester-Id', String(requester2Id));
        expect(res2.status).toBe(403);
        expect(res2.body.error).toBe('Forbidden');
    });
});
