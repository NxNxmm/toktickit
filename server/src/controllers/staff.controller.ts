import { Request, Response } from 'express';
import { RequestedPriority, TicketStatus } from '@prisma/client';
import { getPrisma } from '../prisma.js';

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
