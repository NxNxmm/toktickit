import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { generateTicketNumber } from '../../src/utils/ticketNumber.js';

// Helper: create a small valid PNG buffer (1x1 pixel)
function createMinimalPngBuffer(): Buffer {
    // Minimal valid 1x1 PNG bytes
    return Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
        '2e00000000c49444154789c6260f8cfc000000002000172657273696f6e303' +
        '00000000049454e44ae426082',
        'hex'
    );
}

describe('Attachment Lifecycle API (Issue 6 - API-10 through API-15)', () => {
    let requester1Id: number;
    let requester2Id: number;
    let ticket1Id: number; // belongs to requester1
    let ticket2Id: number; // belongs to requester2

    // Seeded attachment IDs
    let activeAttachmentId: number;
    let removedAttachmentId: number;
    let r2AttachmentId: number; // requester2's attachment (for cross-requester tests)

    // Temp PNG test file path
    const testFilePath = path.join(process.cwd(), 'tests', 'fixtures', 'test-image.png');

    beforeAll(async () => {
        // Ensure test fixture directory and file exist
        const fixtureDir = path.dirname(testFilePath);
        if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
        fs.writeFileSync(testFilePath, createMinimalPngBuffer());

        const r1 = await getPrisma().requesterUser.findFirst({
            where: { isActive: true, email: 'jennifer.anderson@kmutt.ac.th' },
        });
        const r2 = await getPrisma().requesterUser.findFirst({
            where: { isActive: true, email: 'michael.brown@kmutt.ac.th' },
        });
        const cat = await getPrisma().category.findFirst({ where: { name: 'Software' } });
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

        // Ticket for requester1
        const t1 = await getPrisma().ticket.create({
            data: {
                ticketNo: await generateTicketNumber(),
                requesterId: requester1Id,
                categoryId: cat!.id,
                relatedSystemId: sys!.id,
                requestedPriority: 'MEDIUM',
                summary: 'Attachment lifecycle test ticket',
                description: 'This ticket is used for attachment lifecycle API testing.',
                currentStatus: 'NEW',
            },
        });
        ticket1Id = t1.id;

        // Ticket for requester2 (isolation tests)
        const t2 = await getPrisma().ticket.create({
            data: {
                ticketNo: await generateTicketNumber(),
                requesterId: requester2Id,
                categoryId: cat!.id,
                relatedSystemId: sys!.id,
                requestedPriority: 'LOW',
                summary: 'Requester 2 attachment ticket',
                description: 'Ticket for requester 2 used for cross-requester attachment isolation tests.',
                currentStatus: 'NEW',
            },
        });
        ticket2Id = t2.id;

        // Pre-seed an active attachment on ticket1 (for download / remove tests)
        const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Write a real file on disk so download can stream it
        const activeStoredName = 'test-active-attachment.png';
        fs.writeFileSync(path.join(uploadDir, activeStoredName), createMinimalPngBuffer());

        const activeAtt = await getPrisma().attachment.create({
            data: {
                ticketId: ticket1Id,
                originalName: 'battery-graph.png',
                storedFileName: activeStoredName,
                fileSize: 512,
                mimeType: 'image/png',
                isRemoved: false,
            },
        });
        activeAttachmentId = activeAtt.id;

        // Pre-seed a soft-removed attachment on ticket1
        const removedAtt = await getPrisma().attachment.create({
            data: {
                ticketId: ticket1Id,
                originalName: 'old-report.pdf',
                storedFileName: 'test-removed-attachment.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                isRemoved: true,
                removedAt: new Date(),
                removalReason: 'Outdated report, replaced with newer version',
            },
        });
        removedAttachmentId = removedAtt.id;

        // Pre-seed an active attachment on ticket2 (for cross-requester tests)
        const r2StoredName = 'test-r2-attachment.png';
        fs.writeFileSync(path.join(uploadDir, r2StoredName), createMinimalPngBuffer());

        const r2Att = await getPrisma().attachment.create({
            data: {
                ticketId: ticket2Id,
                originalName: 'r2-evidence.png',
                storedFileName: r2StoredName,
                fileSize: 512,
                mimeType: 'image/png',
                isRemoved: false,
            },
        });
        r2AttachmentId = r2Att.id;
    });

    // ─── Upload Attachment (API-10, API-11) ──────────────────────────────────

    it('uploads a valid file to an existing ticket (API-10)', async () => {
        const res = await request(app)
            .post(`/api/tickets/${ticket1Id}/attachments`)
            .set('X-Requester-Id', String(requester1Id))
            .attach('file', testFilePath);

        expect(res.status).toBe(201);
        expect(res.body.ticketId).toBe(ticket1Id);
        expect(res.body.originalName).toBe('test-image.png');
        expect(res.body.mimeType).toBe('image/png');
        expect(res.body.isRemoved).toBe(false);
        expect(res.body.id).toBeDefined();
    });

    it('returns 400 when ticket has 5 active attachments (API-11)', async () => {
        // ticket1 now has: 1 pre-seeded active + 1 just uploaded = 2
        // Upload 3 more to reach 5
        const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
        for (let i = 0; i < 3; i++) {
            const stored = `quota-test-${i}.png`;
            fs.writeFileSync(path.join(uploadDir, stored), createMinimalPngBuffer());
            await getPrisma().attachment.create({
                data: {
                    ticketId: ticket1Id,
                    originalName: `extra-${i}.png`,
                    storedFileName: stored,
                    fileSize: 100,
                    mimeType: 'image/png',
                    isRemoved: false,
                },
            });
        }

        // Now ticket1 has exactly 5 active attachments, next upload should fail
        const res = await request(app)
            .post(`/api/tickets/${ticket1Id}/attachments`)
            .set('X-Requester-Id', String(requester1Id))
            .attach('file', testFilePath);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/5 active attachments/i);
    });

    it('returns 403 when uploading to another requester\'s ticket', async () => {
        const res = await request(app)
            .post(`/api/tickets/${ticket2Id}/attachments`)
            .set('X-Requester-Id', String(requester1Id))
            .attach('file', testFilePath);
        expect(res.status).toBe(403);
    });

    it('returns 404 when uploading to a non-existent ticket', async () => {
        const res = await request(app)
            .post('/api/tickets/999999/attachments')
            .set('X-Requester-Id', String(requester1Id))
            .attach('file', testFilePath);
        expect(res.status).toBe(404);
    });

    // ─── Download Attachment (API-12) ────────────────────────────────────────

    it('streams the active attachment binary with correct headers (API-12)', async () => {
        const res = await request(app)
            .get(`/api/attachments/${activeAttachmentId}/download`)
            .set('X-Requester-Id', String(requester1Id));

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('image/png');
        expect(res.headers['content-disposition']).toContain('battery-graph.png');
        expect(res.body).toBeDefined();
    });

    // ─── Soft-Remove Attachment (API-13) ─────────────────────────────────────

    it('soft-removes an attachment with a valid reason (API-13)', async () => {
        const res = await request(app)
            .post(`/api/attachments/${activeAttachmentId}/remove`)
            .set('X-Requester-Id', String(requester1Id))
            .send({ reason: 'Wrong file version attached' });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(activeAttachmentId);
        expect(res.body.isRemoved).toBe(true);
        expect(res.body.removalReason).toBe('Wrong file version attached');
        expect(res.body.removedAt).toBeDefined();
    });

    it('returns 400 when removal reason is missing or too short (API-13)', async () => {
        // Seed a fresh active attachment to attempt bad removes on
        const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
        const newStored = 'test-remove-validation.png';
        fs.writeFileSync(path.join(uploadDir, newStored), createMinimalPngBuffer());
        const freshAtt = await getPrisma().attachment.create({
            data: {
                ticketId: ticket1Id,
                originalName: 'validation-test.png',
                storedFileName: newStored,
                fileSize: 512,
                mimeType: 'image/png',
                isRemoved: false,
            },
        });

        const resMissing = await request(app)
            .post(`/api/attachments/${freshAtt.id}/remove`)
            .set('X-Requester-Id', String(requester1Id))
            .send({});
        expect(resMissing.status).toBe(400);

        const resTooShort = await request(app)
            .post(`/api/attachments/${freshAtt.id}/remove`)
            .set('X-Requester-Id', String(requester1Id))
            .send({ reason: 'ab' });
        expect(resTooShort.status).toBe(400);
    });

    it('returns 400 when trying to remove an already-removed attachment', async () => {
        const res = await request(app)
            .post(`/api/attachments/${removedAttachmentId}/remove`)
            .set('X-Requester-Id', String(requester1Id))
            .send({ reason: 'Trying to remove again' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already removed/i);
    });

    // ─── Download Soft-Removed (API-14) ─────────────────────────────────────

    it('returns 410 Gone when attempting to download a soft-removed attachment (API-14)', async () => {
        // activeAttachmentId was just soft-removed in the test above
        const res = await request(app)
            .get(`/api/attachments/${activeAttachmentId}/download`)
            .set('X-Requester-Id', String(requester1Id));

        expect(res.status).toBe(410);
        expect(res.body.error).toBe('Gone');
        expect(res.body.message).toMatch(/soft-removed/i);
        expect(res.body.removalReason).toBe('Wrong file version attached');
    });

    // ─── Cross-Requester Isolation (API-15) ─────────────────────────────────

    it('returns 403 when requester1 tries to download requester2\'s attachment (API-15)', async () => {
        const res = await request(app)
            .get(`/api/attachments/${r2AttachmentId}/download`)
            .set('X-Requester-Id', String(requester1Id));
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Forbidden');
    });

    it('returns 403 when requester1 tries to soft-remove requester2\'s attachment (API-15)', async () => {
        const res = await request(app)
            .post(`/api/attachments/${r2AttachmentId}/remove`)
            .set('X-Requester-Id', String(requester1Id))
            .send({ reason: 'Attempting unauthorized removal' });
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Forbidden');
    });

    it('returns 404 when attachment does not exist', async () => {
        const resDl = await request(app)
            .get('/api/attachments/999999/download')
            .set('X-Requester-Id', String(requester1Id));
        expect(resDl.status).toBe(404);

        const resRm = await request(app)
            .post('/api/attachments/999999/remove')
            .set('X-Requester-Id', String(requester1Id))
            .send({ reason: 'Valid removal reason here' });
        expect(resRm.status).toBe(404);
    });
});
