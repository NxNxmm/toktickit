import { Request, Response } from 'express';
import { getPrisma } from '../prisma.js';

// ─── Helper: resolve ticket with ownership check ─────────────────────────────
// Returns the ticket or a discriminated error response payload.
type TicketAccessResult =
    | { ok: true; ticket: { id: number; submittedById: number; currentStatus: string; resolvedIndicated: boolean | null; resolvedIndicatedAt: Date | null } }
    | { ok: false; status: 401 | 403 | 404; error: string; message: string };

async function resolveTicketAccess(
    req: Request,
    ticketId: number,
    ownershipRequired: boolean,
): Promise<TicketAccessResult> {
    if (!req.user) {
        return { ok: false, status: 401, error: 'Unauthorized', message: 'Authentication required to access this resource' };
    }

    const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
        select: {
            id: true,
            submittedById: true,
            currentStatus: true,
            resolvedIndicated: true,
            resolvedIndicatedAt: true,
        },
    });

    if (!ticket) {
        return { ok: false, status: 404, error: 'Not Found', message: 'Ticket not found' };
    }

    // Requesters can only access their own tickets
    if (req.user.role === 'REQUESTER' && ticket.submittedById !== req.user.id) {
        return { ok: false, status: 403, error: 'Forbidden', message: 'You do not have permission to access this ticket' };
    }

    // Endpoints that require ownership (REQUESTER role must be owner)
    if (ownershipRequired && req.user.role !== 'REQUESTER') {
        return { ok: false, status: 403, error: 'Forbidden', message: 'Only the ticket owner (requester) may perform this action' };
    }

    return { ok: true, ticket };
}

// ─── GET /api/tickets/:id/comments ───────────────────────────────────────────
// AC-4.2: Requesters (owner-only), IT_STAFF, ADMIN can view public comments.
export const getPublicComments = async (req: Request, res: Response) => {
    try {
        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid ticket ID' });
        }

        const access = await resolveTicketAccess(req, ticketId, false);
        if (!access.ok) {
            return res.status(access.status).json({
                statusCode: access.status,
                error: access.error,
                message: access.message,
            });
        }

        const comments = await getPrisma().public_comment.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                ticketId: true,
                content: true,
                createdAt: true,
                user: { select: { id: true, name: true, role: true } },
            },
        });

        const formatted = comments.map((c) => ({
            id: c.id,
            ticketId: c.ticketId,
            author: { id: c.user.id, name: c.user.name, role: c.user.role },
            content: c.content,
            createdAt: c.createdAt,
        }));

        return res.status(200).json(formatted);
    } catch (error) {
        console.error('Error fetching public comments:', error);
        return res.status(500).json({ statusCode: 500, error: 'Internal Server Error', message: 'Internal server error fetching comments' });
    }
};

// ─── POST /api/tickets/:id/comments ──────────────────────────────────────────
// AC-4.2: Requesters (owner-only), IT_STAFF, ADMIN can post public comments.
// BR-16: Content trimmed, must be 2–2000 characters.
// BR-17: Author ID/timestamp stamped from session — client-supplied data ignored.
export const postPublicComment = async (req: Request, res: Response) => {
    try {
        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid ticket ID' });
        }

        const access = await resolveTicketAccess(req, ticketId, false);
        if (!access.ok) {
            return res.status(access.status).json({
                statusCode: access.status,
                error: access.error,
                message: access.message,
            });
        }

        const { content } = req.body;
        const trimmedContent = typeof content === 'string' ? content.trim() : '';

        if (!trimmedContent || trimmedContent.length < 2 || trimmedContent.length > 2000) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Comment content must be between 2 and 2000 characters',
            });
        }

        // Author is strictly derived from session (BR-17) — any client-supplied authorId is ignored
        const comment = await getPrisma().public_comment.create({
            data: {
                ticketId,
                authorId: req.user!.id,
                content: trimmedContent,
            },
            select: {
                id: true,
                ticketId: true,
                content: true,
                createdAt: true,
                user: { select: { id: true, name: true, role: true } },
            },
        });

        return res.status(201).json({
            id: comment.id,
            ticketId: comment.ticketId,
            author: { id: comment.user.id, name: comment.user.name, role: comment.user.role },
            content: comment.content,
            createdAt: comment.createdAt,
        });
    } catch (error) {
        console.error('Error posting public comment:', error);
        return res.status(500).json({ statusCode: 500, error: 'Internal Server Error', message: 'Internal server error posting comment' });
    }
};

// ─── POST /api/tickets/:id/resolve-indication ────────────────────────────────
// AC-4.3: Only the owning REQUESTER may signal resolution indication.
// BR-13: Does NOT change formal ticket status to RESOLVED or CLOSED.
export const postResolveIndication = async (req: Request, res: Response) => {
    try {
        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid ticket ID' });
        }

        if (!req.user) {
            return res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: 'Authentication required' });
        }

        // AC-4.3: Only REQUESTER may use this endpoint — IT_STAFF and ADMIN get 403
        if (req.user.role !== 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Only the ticket owner (requester) may indicate problem resolution',
            });
        }

        const access = await resolveTicketAccess(req, ticketId, false);
        if (!access.ok) {
            return res.status(access.status).json({
                statusCode: access.status,
                error: access.error,
                message: access.message,
            });
        }

        const now = new Date();

        // Set resolvedIndicated without altering currentStatus (BR-13)
        await getPrisma().ticket.update({
            where: { id: ticketId },
            data: {
                resolvedIndicated: true,
                resolvedIndicatedAt: now,
                updatedAt: now,
            },
        });

        return res.status(200).json({
            message: 'Resolution indication recorded',
            resolvedIndicated: true,
            resolvedIndicatedAt: now.toISOString(),
        });
    } catch (error) {
        console.error('Error recording resolve indication:', error);
        return res.status(500).json({ statusCode: 500, error: 'Internal Server Error', message: 'Internal server error recording indication' });
    }
};

// ─── GET /api/tickets/:id/notes ──────────────────────────────────────────────
// AC-4.4 / BR-15: Strictly 403 Forbidden for REQUESTER role.
export const getInternalNotes = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: 'Authentication required' });
        }

        // AC-4.4: REQUESTERs are strictly denied — return 403 immediately
        if (req.user.role === 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Access to internal notes is restricted to IT Staff and Administrators',
            });
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid ticket ID' });
        }

        const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
        if (!ticket) {
            return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Ticket not found' });
        }

        const notes = await getPrisma().internal_note.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                ticketId: true,
                content: true,
                createdAt: true,
                user: { select: { id: true, name: true, role: true } },
            },
        });

        const formatted = notes.map((n) => ({
            id: n.id,
            ticketId: n.ticketId,
            author: { id: n.user.id, name: n.user.name, role: n.user.role },
            content: n.content,
            createdAt: n.createdAt,
        }));

        return res.status(200).json(formatted);
    } catch (error) {
        console.error('Error fetching internal notes:', error);
        return res.status(500).json({ statusCode: 500, error: 'Internal Server Error', message: 'Internal server error fetching notes' });
    }
};

// ─── POST /api/tickets/:id/notes ─────────────────────────────────────────────
// AC-4.4 / BR-15 / FR-13: IT_STAFF and ADMIN only; strictly 403 for REQUESTER.
// BR-16: Content trimmed, must be 2–2000 characters.
// BR-17: Author ID/timestamp stamped from session.
export const postInternalNote = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: 'Authentication required' });
        }

        // AC-4.4: REQUESTERs are strictly denied — return 403 immediately
        if (req.user.role === 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Access to internal notes is restricted to IT Staff and Administrators',
            });
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid ticket ID' });
        }

        const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
        if (!ticket) {
            return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Ticket not found' });
        }

        const { content } = req.body;
        const trimmedContent = typeof content === 'string' ? content.trim() : '';

        if (!trimmedContent || trimmedContent.length < 2 || trimmedContent.length > 2000) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Note content must be between 2 and 2000 characters',
            });
        }

        // Author strictly from session (BR-17)
        const note = await getPrisma().internal_note.create({
            data: {
                ticketId,
                authorId: req.user.id,
                content: trimmedContent,
            },
            select: {
                id: true,
                ticketId: true,
                content: true,
                createdAt: true,
                user: { select: { id: true, name: true, role: true } },
            },
        });

        return res.status(201).json({
            id: note.id,
            ticketId: note.ticketId,
            author: { id: note.user.id, name: note.user.name, role: note.user.role },
            content: note.content,
            createdAt: note.createdAt,
        });
    } catch (error) {
        console.error('Error posting internal note:', error);
        return res.status(500).json({ statusCode: 500, error: 'Internal Server Error', message: 'Internal server error posting note' });
    }
};
