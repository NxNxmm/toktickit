import { Request, Response } from 'express';
import { RequestedPriority, TicketStatus } from '@prisma/client';
import { getPrisma } from '../prisma.js';
import fs from 'fs';
import path from 'path';

// ─── Helper: generate ticket number ─────────────────────────────────────────
async function generateTicketNumber(): Promise<string> {
    const count = await getPrisma().ticket.count();
    const padded = String(count + 1).padStart(5, '0');
    const year = new Date().getFullYear();
    return `TKT-${year}-${padded}`;
}

// ─── Helper: validate requester user ────────────────────────────────────────
async function validateRequester(requesterId: number) {
    return getPrisma().user.findUnique({
        where: { id: requesterId },
    });
}

// ─── POST /api/tickets ────────────────────────────────────────────────────────
export const createTicket = async (req: Request, res: Response) => {
    try {
        const rawRequesterId = req.headers['x-requester-id'];
        const requesterId = Number(rawRequesterId);

        if (!rawRequesterId || isNaN(requesterId)) {
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Requester ID header is missing or invalid',
            });
        }

        const requester = await validateRequester(requesterId);
        if (!requester || !requester.isActive || requester.role !== 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Requester is inactive or does not exist',
            });
        }

        const { categoryId, relatedSystemId, requestedPriority, summary, description } = req.body;

        const numCategoryId = Number(categoryId);
        const numRelatedSystemId = Number(relatedSystemId);

        if (!categoryId || isNaN(numCategoryId)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Category ID is required and must be a valid number',
            });
        }

        const category = await getPrisma().category.findUnique({ where: { id: numCategoryId } });
        if (!category) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Category does not exist',
            });
        }

        if (!relatedSystemId || isNaN(numRelatedSystemId)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Related System ID is required and must be a valid number',
            });
        }

        const relatedSystem = await getPrisma().related_system.findUnique({ where: { id: numRelatedSystemId } });
        if (!relatedSystem) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Related System does not exist',
            });
        }

        const validPriorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
        const priority: RequestedPriority = requestedPriority ? (requestedPriority as RequestedPriority) : 'MEDIUM';

        if (requestedPriority && !validPriorities.includes(priority)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid priority level. Allowed: LOW, MEDIUM, HIGH',
            });
        }

        const trimmedSummary = typeof summary === 'string' ? summary.trim() : '';
        const trimmedDescription = typeof description === 'string' ? description.trim() : '';

        if (!trimmedSummary || trimmedSummary.length < 5 || trimmedSummary.length > 150) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Summary must be between 5 and 150 characters',
            });
        }

        if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Description must be between 10 and 2000 characters',
            });
        }

        const ticketNumber = await generateTicketNumber();

        const newTicket = await getPrisma().ticket.create({
            data: {
                ticketNumber,
                submittedById: requesterId,
                categoryId: numCategoryId,
                relatedSystemId: numRelatedSystemId,
                requestedPriority: priority,
                itPriority: priority,
                summary: trimmedSummary,
                description: trimmedDescription,
                currentStatus: 'NEW',
                updatedAt: new Date(),
            },
            include: {
                category: true,
                related_system: true,
            },
        });

        // Process uploaded attachments if provided
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
            const attachmentsData = files.map((file) => ({
                ticketId: newTicket.id,
                originalFilename: file.originalname,
                storedFilename: file.filename,
                fileSizeBytes: file.size,
                contentType: file.mimetype,
                updatedAt: new Date(),
            }));

            await getPrisma().attachment.createMany({ data: attachmentsData });
        }

        const fullTicket = await getPrisma().ticket.findUnique({
            where: { id: newTicket.id },
            include: {
                category: true,
                related_system: true,
                attachment: true,
            },
        });

        const formattedTicket = fullTicket ? {
            ...fullTicket,
            ticketNo: fullTicket.ticketNumber,
            relatedSystem: fullTicket.related_system,
            attachments: fullTicket.attachment,
        } : null;

        return res.status(201).json(formattedTicket);
    } catch (error) {
        console.error('Error creating ticket:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error during ticket creation',
        });
    }
};

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
export const getTickets = async (req: Request, res: Response) => {
    try {
        const rawRequesterId = req.headers['x-requester-id'];
        const requesterId = Number(rawRequesterId);

        if (!rawRequesterId || isNaN(requesterId)) {
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Requester ID header is missing or invalid',
            });
        }

        const requester = await validateRequester(requesterId);
        if (!requester || !requester.isActive || requester.role !== 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Requester is inactive or does not exist',
            });
        }

        const {
            search,
            categoryId,
            requestedPriority,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = '1',
            pageSize = '10',
        } = req.query;

        const allowedSortBy = ['createdAt', 'ticketNumber', 'ticketNo', 'requestedPriority', 'updatedAt'];
        if (typeof sortBy !== 'string' || !allowedSortBy.includes(sortBy)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: `Invalid sortBy field. Allowed: ${allowedSortBy.join(', ')}`,
            });
        }
        const dbSortBy = sortBy === 'ticketNo' ? 'ticketNumber' : sortBy;

        const allowedSortOrder = ['asc', 'desc'];
        if (typeof sortOrder !== 'string' || !allowedSortOrder.includes(sortOrder.toLowerCase())) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid sortOrder. Allowed: asc, desc',
            });
        }

        const numPage = Number(page);
        if (isNaN(numPage) || !Number.isInteger(numPage) || numPage < 1) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Page must be a positive integer',
            });
        }

        const numPageSize = Number(pageSize);
        const allowedPageSizes = [5, 10, 20, 50];
        if (isNaN(numPageSize) || !allowedPageSizes.includes(numPageSize)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: `Invalid pageSize. Allowed: ${allowedPageSizes.join(', ')}`,
            });
        }

        const where: any = { submittedById: requesterId };

        if (typeof search === 'string' && search.trim() !== '') {
            const trimmedSearch = search.trim();
            where.OR = [
                { ticketNumber: { contains: trimmedSearch, mode: 'insensitive' } },
                { summary: { contains: trimmedSearch, mode: 'insensitive' } },
            ];
        }

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

        if (requestedPriority !== undefined && requestedPriority !== '') {
            const validPriorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
            if (typeof requestedPriority !== 'string' || !validPriorities.includes(requestedPriority as RequestedPriority)) {
                return res.status(400).json({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: `Invalid requestedPriority. Allowed: ${validPriorities.join(', ')}`,
                });
            }
            where.requestedPriority = requestedPriority as RequestedPriority;
        }

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
                    requestedPriority: true,
                    itPriority: true,
                    currentStatus: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
        ]);

        const formattedTickets = tickets.map((t) => ({
            ...t,
            ticketNo: t.ticketNumber,
            relatedSystem: t.related_system,
        }));

        const totalPages = Math.ceil(totalCount / numPageSize);

        return res.status(200).json({
            items: formattedTickets,
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
        console.error('Error fetching tickets:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while fetching tickets',
        });
    }
};

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
export const getTicketById = async (req: Request, res: Response) => {
    try {
        const rawRequesterId = req.headers['x-requester-id'];
        const requesterId = Number(rawRequesterId);

        if (!rawRequesterId || isNaN(requesterId)) {
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Requester ID header is missing or invalid',
            });
        }

        const requester = await validateRequester(requesterId);
        if (!requester || !requester.isActive || requester.role !== 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Requester is inactive or does not exist',
            });
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid ticket ID' });
        }

        const ticket = await getPrisma().ticket.findUnique({
            where: { id: ticketId },
            include: {
                user_ticket_submittedByIdTouser: { select: { id: true, name: true, email: true } },
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
            },
        });

        if (!ticket) {
            return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Ticket not found' });
        }

        if (ticket.submittedById !== requesterId) {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'You do not have permission to access this ticket',
            });
        }

        const formattedAttachments = (ticket.attachment || []).map((a) => ({
            ...a,
            originalName: a.originalFilename,
            fileSize: a.fileSizeBytes,
            mimeType: a.contentType,
        }));

        const formattedPublicComments = (ticket.public_comment || []).map((c) => ({
            ...c,
            author: c.user,
        }));

        const responsePayload = {
            ...ticket,
            ticketNo: ticket.ticketNumber,
            requesterId: ticket.submittedById,
            requester: ticket.user_ticket_submittedByIdTouser,
            relatedSystemId: ticket.relatedSystemId,
            relatedSystem: ticket.related_system,
            attachments: formattedAttachments,
            publicComments: formattedPublicComments,
        };

        return res.status(200).json(responsePayload);
    } catch (error) {
        console.error('Error fetching ticket by ID:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while fetching ticket',
        });
    }
};

// ─── POST /api/tickets/:id/attachments ──────────────────────────────────────
export const uploadAttachmentToTicket = async (req: Request, res: Response) => {
    try {
        const rawRequesterId = req.headers['x-requester-id'];
        const requesterId = Number(rawRequesterId);

        if (!rawRequesterId || isNaN(requesterId)) {
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Requester ID header is missing or invalid',
            });
        }

        const requester = await validateRequester(requesterId);
        if (!requester || !requester.isActive || requester.role !== 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Requester is inactive or does not exist',
            });
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid ticket ID' });
        }

        const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Ticket not found' });
        }

        if (ticket.submittedById !== requesterId) {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'You do not have permission to upload to this ticket',
            });
        }

        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'No file was uploaded' });
        }

        const activeCount = await getPrisma().attachment.count({ where: { ticketId, isRemoved: false } });
        if (activeCount >= 5) {
            fs.unlink(file.path, () => {});
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Ticket already has 5 active attachments. Remove one before uploading more.',
            });
        }

        const attachment = await getPrisma().attachment.create({
            data: {
                ticketId,
                originalFilename: file.originalname,
                storedFilename: file.filename,
                fileSizeBytes: file.size,
                contentType: file.mimetype,
                updatedAt: new Date(),
            },
        });

        return res.status(201).json({
            ...attachment,
            originalName: attachment.originalFilename,
            fileSize: attachment.fileSizeBytes,
            mimeType: attachment.contentType,
        });
    } catch (error) {
        console.error('Error uploading attachment:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while uploading attachment',
        });
    }
};

// ─── GET /api/attachments/:id/download ──────────────────────────────────────
export const downloadAttachment = async (req: Request, res: Response) => {
    try {
        const rawRequesterId = req.headers['x-requester-id'];
        const requesterId = Number(rawRequesterId);

        if (!rawRequesterId || isNaN(requesterId)) {
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Requester ID header is missing or invalid',
            });
        }

        const requester = await validateRequester(requesterId);
        if (!requester || !requester.isActive || requester.role !== 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Requester is inactive or does not exist',
            });
        }

        const attachmentId = Number(req.params.id);
        if (isNaN(attachmentId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid attachment ID' });
        }

        const attachment = await getPrisma().attachment.findUnique({
            where: { id: attachmentId },
            include: { ticket: { select: { submittedById: true } } },
        });

        if (!attachment) {
            return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Attachment not found' });
        }

        if (attachment.ticket.submittedById !== requesterId) {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'You do not have permission to access this attachment',
            });
        }

        if (attachment.isRemoved) {
            return res.status(410).json({
                statusCode: 410,
                error: 'Gone',
                message: 'This attachment has been soft-removed and is no longer available for download.',
                removalReason: attachment.removalReason,
                removedAt: attachment.removedAt,
            });
        }

        const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
        const filePath = path.join(uploadDir, attachment.storedFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'File not found on server' });
        }

        res.setHeader('Content-Type', attachment.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalFilename}"`);
        return res.sendFile(filePath);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while downloading attachment',
        });
    }
};

// ─── DELETE /api/attachments/:id ─────────────────────────────────────────────
export const removeAttachment = async (req: Request, res: Response) => {
    try {
        const rawRequesterId = req.headers['x-requester-id'];
        const requesterId = Number(rawRequesterId);

        if (!rawRequesterId || isNaN(requesterId)) {
            return res.status(401).json({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Requester ID header is missing or invalid',
            });
        }

        const requester = await validateRequester(requesterId);
        if (!requester || !requester.isActive || requester.role !== 'REQUESTER') {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Requester is inactive or does not exist',
            });
        }

        const attachmentId = Number(req.params.id);
        if (isNaN(attachmentId)) {
            return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid attachment ID' });
        }

        const attachment = await getPrisma().attachment.findUnique({
            where: { id: attachmentId },
            include: { ticket: { select: { submittedById: true, id: true } } },
        });

        if (!attachment) {
            return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Attachment not found' });
        }

        if (attachment.ticket.submittedById !== requesterId) {
            return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'You do not have permission to remove this attachment',
            });
        }

        if (attachment.isRemoved) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Attachment is already removed',
            });
        }

        const { reason } = req.body;
        const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
        if (!trimmedReason || trimmedReason.length < 3 || trimmedReason.length > 250) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Removal reason must be between 3 and 250 characters',
            });
        }

        const updated = await getPrisma().attachment.update({
            where: { id: attachmentId },
            data: { isRemoved: true, removedAt: new Date(), removalReason: trimmedReason },
            select: {
                id: true,
                ticketId: true,
                originalFilename: true,
                isRemoved: true,
                removedAt: true,
                removalReason: true,
            },
        });

        return res.status(200).json({
            ...updated,
            originalName: updated.originalFilename,
        });
    } catch (error) {
        console.error('Error removing attachment:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error while removing attachment',
        });
    }
};