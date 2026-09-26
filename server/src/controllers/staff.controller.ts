import { Request, Response } from 'express';
import { RequestedPriority, TicketStatus } from '@prisma/client';
import { getPrisma } from '../prisma.js';
import { TICKET_STATUSES, canTransition } from '../utils/statusTransitions.js';

// ─── Helpers: staff role guard & serialization ────────────────────────────────
function isStaffOrAdmin(role: string): boolean {
    return role === 'IT_STAFF' || role === 'ADMIN';
}

function staffForbidden(res: Response) {
    return res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access to staff ticket operations is restricted to IT Staff and Administrators',
    });
}

function invalidId(res: Response, message = 'Invalid ticket ID') {
    return res.status(400).json({ statusCode: 400, error: 'Bad Request', message });
}

function notFound(res: Response, message = 'Ticket not found') {
    return res.status(404).json({ statusCode: 404, error: 'Not Found', message });
}

// ─── Internal shape: full operational ticket fetch (includes Internal Notes) ──
async function findStaffTicketOrFail(ticketId: number) {
    return getPrisma().ticket.findUnique({
        where: { id: ticketId },
        include: {
            user_ticket_submittedByIdTouser: { select: { id: true, name: true, email: true } },
            user_ticket_ownerIdTouser: { select: { id: true, name: true, email: true } },
            category: { select: { id: true, name: true } },
            related_system: { select: { id: true, name: true } },
            attachment: {
                select: {
                    id: true,
                    originalFilename: true,
                    fileSizeBytes: true,
                    contentType: true,
                    isRemoved: true,
                    removedAt: true,
                    removalReason: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            },
            public_comment: {
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    user: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: 'asc' },
            },
            internal_note: {
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    user: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });
}

type StaffTicket = NonNullable<Awaited<ReturnType<typeof findStaffTicketOrFail>>>;

function formatStaffTicketDetail(t: StaffTicket) {
    const attachments = (t.attachment || []).map((a) => ({
        id: a.id,
        originalName: a.originalFilename,
        fileSize: a.fileSizeBytes,
        mimeType: a.contentType,
        isRemoved: a.isRemoved,
        removedAt: a.removedAt,
        removalReason: a.removalReason,
        createdAt: a.createdAt,
    }));

    const publicComments = (t.public_comment || []).map((c) => ({
        id: c.id,
        ticketId: t.id,
        author: { id: c.user.id, name: c.user.name, role: c.user.role },
        content: c.content,
        createdAt: c.createdAt,
    }));

    const internalNotes = (t.internal_note || []).map((n) => ({
        id: n.id,
        ticketId: t.id,
        author: { id: n.user.id, name: n.user.name, role: n.user.role },
        content: n.content,
        createdAt: n.createdAt,
    }));

    return {
        id: t.id,
        ticketNo: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        resolvedIndicated: t.resolvedIndicated,
        resolvedIndicatedAt: t.resolvedIndicatedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        category: t.category,
        relatedSystem: t.related_system,
        requester: t.user_ticket_submittedByIdTouser,
        owner: t.user_ticket_ownerIdTouser,
        attachments,
        publicComments,
        internalNotes,
    };
}

// ─── GET /api/staff/tickets ───────────────────────────────────────────────────
// AC-5.1: Returns all tickets across all requesters.
// AC-5.2: Supports search, filters (category, status, requestedPriority, itPriority, owner), sort, pagination.
// AC-5.3: Only IT_STAFF and ADMIN are allowed; REQUESTER receives 403 Forbidden.
export const getStaffTicketQueue = async (req: Request, res: Response) => {
    try {
        // requireAuth middleware guarantees req.user is set
        const user = req.user!;

        if (user.role === 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Access to the staff ticket queue is restricted to IT Staff and Administrators',
            });
        }

        const {
            search,
            categoryId,
            status,
            requestedPriority,
            itPriority,
            ownerId,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = '1',
            pageSize = '10',
        } = req.query;

        // ─── Validate sortBy ─────────────────────────────────────────────────
        const allowedSortBy = ['createdAt', 'updatedAt', 'ticketNumber', 'ticketNo', 'itPriority', 'requestedPriority', 'currentStatus'];
        if (typeof sortBy !== 'string' || !allowedSortBy.includes(sortBy)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: `Invalid sortBy field. Allowed: ${allowedSortBy.join(', ')}`,
            });
        }
        const dbSortBy = sortBy === 'ticketNo' ? 'ticketNumber' : sortBy;

        // ─── Validate sortOrder ──────────────────────────────────────────────
        const allowedSortOrder = ['asc', 'desc'];
        if (typeof sortOrder !== 'string' || !allowedSortOrder.includes(sortOrder.toLowerCase())) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid sortOrder. Allowed: asc, desc',
            });
        }

        // ─── Validate page ───────────────────────────────────────────────────
        const numPage = Number(page);
        if (isNaN(numPage) || !Number.isInteger(numPage) || numPage < 1) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Page must be a positive integer',
            });
        }

        // ─── Validate pageSize ───────────────────────────────────────────────
        const numPageSize = Number(pageSize);
        const allowedPageSizes = [10, 20, 50];
        if (isNaN(numPageSize) || !allowedPageSizes.includes(numPageSize)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: `Invalid pageSize. Allowed: ${allowedPageSizes.join(', ')}`,
            });
        }

        // ─── Build where clause ──────────────────────────────────────────────
        const where: any = {};

        // Substring search on ticketNumber or summary
        if (typeof search === 'string' && search.trim() !== '') {
            const trimmedSearch = search.trim();
            where.OR = [
                { ticketNumber: { contains: trimmedSearch, mode: 'insensitive' } },
                { summary: { contains: trimmedSearch, mode: 'insensitive' } },
            ];
        }

        // Category filter
        if (categoryId !== undefined && categoryId !== '') {
            const numCatId = Number(categoryId);
            if (isNaN(numCatId) || !Number.isInteger(numCatId) || numCatId < 1) {
                return res.status(400).json({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'Category ID must be a valid positive integer',
                });
            }
            where.categoryId = numCatId;
        }

        // Status filter
        if (status !== undefined && status !== '') {
            const validStatuses: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
            if (typeof status !== 'string' || !validStatuses.includes(status as TicketStatus)) {
                return res.status(400).json({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: `Invalid status. Allowed: ${validStatuses.join(', ')}`,
                });
            }
            where.currentStatus = status as TicketStatus;
        }

        // Requested priority filter
        if (requestedPriority !== undefined && requestedPriority !== '') {
            const validPriorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
            if (typeof requestedPriority !== 'string' || !validPriorities.includes(requestedPriority as RequestedPriority)) {
                return res.status(400).json({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: `Invalid requestedPriority. Allowed: ${validPriorities.join(', ')}`,
                });
            }
            where.requestedPriority = requestedPriority as RequestedPriority;
        }

        // IT priority filter
        if (itPriority !== undefined && itPriority !== '') {
            const validPriorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
            if (typeof itPriority !== 'string' || !validPriorities.includes(itPriority as RequestedPriority)) {
                return res.status(400).json({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: `Invalid itPriority. Allowed: ${validPriorities.join(', ')}`,
                });
            }
            where.itPriority = itPriority as RequestedPriority;
        }

        // Owner filter: integer ID or the string "unassigned"
        if (ownerId !== undefined && ownerId !== '') {
            if (ownerId === 'unassigned') {
                where.ownerId = null;
            } else {
                const numOwnerId = Number(ownerId);
                if (isNaN(numOwnerId) || !Number.isInteger(numOwnerId) || numOwnerId < 1) {
                    return res.status(400).json({
                        statusCode: 400,
                        error: 'Bad Request',
                        message: 'ownerId must be a positive integer or "unassigned"',
                    });
                }
                where.ownerId = numOwnerId;
            }
        }

        // ─── Execute query ───────────────────────────────────────────────────
        const [totalCount, tickets] = await Promise.all([
            getPrisma().ticket.count({ where }),
            getPrisma().ticket.findMany({
                where,
                orderBy: { [dbSortBy]: sortOrder.toLowerCase() as 'asc' | 'desc' },
                skip: (numPage - 1) * numPageSize,
                take: numPageSize,
                select: {
                    id: true,
                    ticketNumber: true,
                    summary: true,
                    category: { select: { id: true, name: true } },
                    related_system: { select: { id: true, name: true } },
                    user_ticket_submittedByIdTouser: { select: { id: true, name: true, email: true } },
                    user_ticket_ownerIdTouser: { select: { id: true, name: true, email: true } },
                    requestedPriority: true,
                    itPriority: true,
                    currentStatus: true,
                    resolvedIndicated: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
        ]);

        const formattedTickets = tickets.map((t) => ({
            id: t.id,
            ticketNo: t.ticketNumber,
            summary: t.summary,
            category: t.category,
            relatedSystem: t.related_system,
            requester: t.user_ticket_submittedByIdTouser,
            owner: t.user_ticket_ownerIdTouser,
            requestedPriority: t.requestedPriority,
            itPriority: t.itPriority,
            currentStatus: t.currentStatus,
            resolvedIndicated: t.resolvedIndicated,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));


        const totalPages = Math.ceil(totalCount / numPageSize);

        return res.status(200).json({
            tickets: formattedTickets,
            pagination: {
                page: numPage,
                pageSize: numPageSize,
                totalCount,
                totalPages,
                hasPrevious: numPage > 1,
                hasNext: numPage < totalPages,
            },
        });
    } catch (error) {
        console.error('Error fetching staff ticket queue:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while fetching staff ticket queue',
        });
    }
};

// ─── GET /api/staff/assignees ─────────────────────────────────────────────────
// UI support: active IT_STAFF and ADMIN users eligible for primary ticket
// ownership (BR-08). REQUESTER role receives 403 Forbidden.
export const getStaffAssignees = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        if (!isStaffOrAdmin(user.role)) {
            return staffForbidden(res);
        }

        const assignees = await getPrisma().user.findMany({
            where: { isActive: true, role: { in: ['IT_STAFF', 'ADMIN'] } },
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: 'asc' },
        });

        return res.status(200).json(assignees);
    } catch (error) {
        console.error('Error fetching staff assignees:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while fetching assignable staff',
        });
    }
};

// ─── GET /api/staff/tickets/:id ───────────────────────────────────────────────
// AC-6.x / api-spec.md §4.2: Full operational ticket detail for IT_STAFF/ADMIN,
// including confidential internal notes. REQUESTER receives 403.
export const getStaffTicketDetail = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        if (!isStaffOrAdmin(user.role)) {
            return staffForbidden(res);
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId) || !Number.isInteger(ticketId)) {
            return invalidId(res);
        }

        const ticket = await findStaffTicketOrFail(ticketId);
        if (!ticket) {
            return notFound(res);
        }

        return res.status(200).json(formatStaffTicketDetail(ticket));
    } catch (error) {
        console.error('Error fetching staff ticket detail:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while fetching staff ticket detail',
        });
    }
};

// ─── PATCH /api/staff/tickets/:id/ownership ───────────────────────────────────
// AC-6.1 / BR-08: Claim unassigned tickets or reassign primary ownership to an
// active IT_STAFF / ADMIN. ownerId = null clears ownership (ticket unassigned).
export const updateTicketOwnership = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        if (!isStaffOrAdmin(user.role)) {
            return staffForbidden(res);
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId) || !Number.isInteger(ticketId)) {
            return invalidId(res);
        }

        const existing = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
        if (!existing) {
            return notFound(res);
        }

        const { ownerId } = req.body;

        if (ownerId !== null && ownerId !== undefined) {
            if (typeof ownerId !== 'number' || !Number.isInteger(ownerId)) {
                return res.status(400).json({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'ownerId must be an integer user ID or null to unassign',
                });
            }

            const target = await getPrisma().user.findUnique({ where: { id: ownerId } });
            if (!target || !target.isActive || (target.role !== 'IT_STAFF' && target.role !== 'ADMIN')) {
                return res.status(400).json({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'Owner must be an active IT Staff or Administrator',
                });
            }
        }

        await getPrisma().ticket.update({
            where: { id: ticketId },
            data: { ownerId: ownerId ?? null, updatedAt: new Date() },
        });

        const updated = await findStaffTicketOrFail(ticketId);
        return res.status(200).json(formatStaffTicketDetail(updated!));
    } catch (error) {
        console.error('Error updating ticket ownership:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while updating ticket ownership',
        });
    }
};

// ─── PATCH /api/staff/tickets/:id/priority ────────────────────────────────────
// AC-6.2 / BR-09: Calibrate operational IT Priority independently from the
// Requester's immutable requestedPriority.
export const updateTicketItPriority = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        if (!isStaffOrAdmin(user.role)) {
            return staffForbidden(res);
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId) || !Number.isInteger(ticketId)) {
            return invalidId(res);
        }

        const existing = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
        if (!existing) {
            return notFound(res);
        }

        const { itPriority } = req.body;
        const validPriorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        if (typeof itPriority !== 'string' || !validPriorities.includes(itPriority as RequestedPriority)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: `Invalid itPriority. Allowed: ${validPriorities.join(', ')}`,
            });
        }

        await getPrisma().ticket.update({
            where: { id: ticketId },
            data: { itPriority: itPriority as RequestedPriority, updatedAt: new Date() },
        });

        const updated = await findStaffTicketOrFail(ticketId);
        return res.status(200).json(formatStaffTicketDetail(updated!));
    } catch (error) {
        console.error('Error updating ticket IT priority:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while updating ticket IT priority',
        });
    }
};

// ─── PATCH /api/staff/tickets/:id/status ──────────────────────────────────────
// AC-6.2 / BR-12: Execute permitted status transitions per Section 6 matrix.
// Illegal jumps are rejected with HTTP 422 Unprocessable Entity.
export const updateTicketStatus = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        if (!isStaffOrAdmin(user.role)) {
            return staffForbidden(res);
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId) || !Number.isInteger(ticketId)) {
            return invalidId(res);
        }

        const existing = await getPrisma().ticket.findUnique({
            where: { id: ticketId },
            select: { id: true, currentStatus: true },
        });
        if (!existing) {
            return notFound(res);
        }

        const { status } = req.body;
        if (typeof status !== 'string' || !TICKET_STATUSES.includes(status as TicketStatus)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: `Invalid status. Allowed: ${TICKET_STATUSES.join(', ')}`,
            });
        }

        if (!canTransition(existing.currentStatus as TicketStatus, status as TicketStatus)) {
            return res.status(422).json({
                statusCode: 422,
                error: 'Unprocessable Entity',
                message: `Status transition from ${existing.currentStatus} to ${status} is not permitted by the status transition matrix`,
            });
        }

        await getPrisma().ticket.update({
            where: { id: ticketId },
            data: { currentStatus: status as TicketStatus, updatedAt: new Date() },
        });

        const updated = await findStaffTicketOrFail(ticketId);
        return res.status(200).json(formatStaffTicketDetail(updated!));
    } catch (error) {
        console.error('Error updating ticket status:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while updating ticket status',
        });
    }
};
