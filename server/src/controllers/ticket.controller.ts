import { Request, Response } from 'express';
import { Priority } from '@prisma/client';
import { getPrisma } from '../prisma.js';
import { generateTicketNumber } from '../utils/ticketNumber.js';

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

        const requester = await getPrisma().requesterUser.findUnique({
            where: { id: requesterId },
        });

        if (!requester || !requester.isActive) {
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

        const category = await getPrisma().category.findUnique({
            where: { id: numCategoryId },
        });

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

        const relatedSystem = await getPrisma().relatedSystem.findUnique({
            where: { id: numRelatedSystemId },
        });

        if (!relatedSystem) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Related System does not exist',
            });
        }

        const validPriorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const priority: Priority = requestedPriority ? (requestedPriority as Priority) : 'MEDIUM';

        if (requestedPriority && !validPriorities.includes(priority)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid priority level. Allowed: LOW, MEDIUM, HIGH, URGENT',
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

        const ticketNo = await generateTicketNumber();

        const newTicket = await getPrisma().ticket.create({
            data: {
                ticketNo,
                requesterId,
                categoryId: numCategoryId,
                relatedSystemId: numRelatedSystemId,
                requestedPriority: priority,
                summary: trimmedSummary,
                description: trimmedDescription,
                currentStatus: 'NEW',
            },
            include: {
                category: true,
                relatedSystem: true,
            },
        });

        // Process uploaded attachments if provided
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
            const attachmentsData = files.map((file) => ({
                ticketId: newTicket.id,
                originalName: file.originalname,
                storedFileName: file.filename,
                fileSize: file.size,
                mimeType: file.mimetype,
            }));

            await getPrisma().attachment.createMany({
                data: attachmentsData,
            });
        }

        const fullTicket = await getPrisma().ticket.findUnique({
            where: { id: newTicket.id },
            include: {
                category: true,
                relatedSystem: true,
                attachments: true,
            },
        });

        return res.status(201).json(fullTicket);
    } catch (error) {
        console.error('Error creating ticket:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Internal server error during ticket creation',
        });
    }
};