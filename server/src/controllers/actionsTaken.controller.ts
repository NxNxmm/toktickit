import { Request, Response } from 'express';
import { getPrisma } from '../prisma.js';

// ─── Helper: staff/admin guard ────────────────────────────────────────────────
function isStaffOrAdmin(role: string): boolean {
    return role === 'IT_STAFF' || role === 'ADMIN';
}

// ─── Helper: build the standard ActionTaken response shape ───────────────────
function formatAction(action: any) {
    return {
        id: action.id,
        ticketId: action.ticketId,
        actionDateTime: action.actionDateTime,
        description: action.description,
        result: action.result,
        followUpRequired: action.followUpRequired,
        followUpNote: action.followUpNote ?? null,
        attachmentNotes: action.attachmentNotes ?? null,
        performedBy: action.user
            ? {
                  id: action.user.id,
                  name: action.user.name,
                  email: action.user.email,
                  role: action.user.role,
              }
            : null,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
    };
}

// ─── GET /api/tickets/:id/actions-taken ──────────────────────────────────────
// Allowed: REQUESTER (own ticket only), IT_STAFF, ADMIN
export const listActionsTaken = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
            });
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId) || ticketId < 1) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
            });
        }

        const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
            });
        }

        // REQUESTER may only view their own ticket's actions
        if (req.user.role === 'REQUESTER' && ticket.submittedById !== req.user.id) {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Access restricted to the ticket owner.' },
            });
        }

        if (req.user.role !== 'REQUESTER' && !isStaffOrAdmin(req.user.role)) {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Access restricted to IT Staff and Administrators.' },
            });
        }

        const actions = await getPrisma().action_taken.findMany({
            where: { ticketId },
            orderBy: [{ actionDateTime: 'desc' }, { createdAt: 'desc' }],
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        return res.status(200).json({
            ticketId,
            actionsTaken: actions.map(formatAction),
        });
    } catch (error) {
        console.error('Error listing actions taken:', error);
        return res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
        });
    }
};

// ─── POST /api/tickets/:id/actions-taken ─────────────────────────────────────
// Allowed: IT_STAFF, ADMIN only. REQUESTER → 403.
export const createActionTaken = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
            });
        }

        // REQUESTER is forbidden
        if (!isStaffOrAdmin(req.user.role)) {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Only IT Staff and Administrators can record actions taken.' },
            });
        }

        const ticketId = Number(req.params.id);
        if (isNaN(ticketId) || ticketId < 1) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket ID.' },
            });
        }

        const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
            });
        }

        // Actor identity strictly from session (BR-04: ignore any client-supplied performedById)
        const performer = await getPrisma().user.findUnique({ where: { id: req.user.id } });
        if (!performer || !performer.isActive) {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Your account is inactive and cannot perform this action.' },
            });
        }

        const { actionDateTime, description, result, followUpRequired, followUpNote, attachmentNotes } = req.body;

        // ── Field Validation ──────────────────────────────────────────────────
        const validationErrors: { field: string; message: string }[] = [];

        // actionDateTime: defaults to now() if omitted; must not be >5 min in the future
        let resolvedActionDateTime: Date;
        if (actionDateTime !== undefined && actionDateTime !== null) {
            const parsed = new Date(actionDateTime);
            if (isNaN(parsed.getTime())) {
                validationErrors.push({ field: 'actionDateTime', message: 'actionDateTime must be a valid ISO 8601 date-time string.' });
            } else {
                const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
                if (parsed > fiveMinutesFromNow) {
                    validationErrors.push({ field: 'actionDateTime', message: 'actionDateTime cannot be more than 5 minutes in the future.' });
                }
                resolvedActionDateTime = parsed;
            }
        } else {
            resolvedActionDateTime = new Date();
        }

        const trimmedDescription = typeof description === 'string' ? description.trim() : '';
        if (!trimmedDescription || trimmedDescription.length < 5 || trimmedDescription.length > 2000) {
            validationErrors.push({ field: 'description', message: 'Description must be between 5 and 2000 characters.' });
        }

        const trimmedResult = typeof result === 'string' ? result.trim() : '';
        if (!trimmedResult || trimmedResult.length < 3 || trimmedResult.length > 1000) {
            validationErrors.push({ field: 'result', message: 'Result must be between 3 and 1000 characters.' });
        }

        if (typeof followUpRequired !== 'boolean') {
            validationErrors.push({ field: 'followUpRequired', message: 'followUpRequired must be a boolean.' });
        }

        let resolvedFollowUpNote: string | null = null;
        if (followUpRequired === true) {
            const trimmedNote = typeof followUpNote === 'string' ? followUpNote.trim() : '';
            if (!trimmedNote || trimmedNote.length < 3 || trimmedNote.length > 1000) {
                validationErrors.push({ field: 'followUpNote', message: 'Follow-up note cannot be blank when follow-up is required (3–1000 characters).' });
            } else {
                resolvedFollowUpNote = trimmedNote;
            }
        }
        // If followUpRequired === false, strictly set followUpNote to null regardless of client input

        let resolvedAttachmentNotes: string | null = null;
        if (attachmentNotes !== undefined && attachmentNotes !== null) {
            const trimmedAttachment = typeof attachmentNotes === 'string' ? attachmentNotes.trim() : '';
            if (trimmedAttachment.length > 500) {
                validationErrors.push({ field: 'attachmentNotes', message: 'Attachment notes must not exceed 500 characters.' });
            } else if (trimmedAttachment.length > 0) {
                resolvedAttachmentNotes = trimmedAttachment;
            }
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed on one or more fields.',
                    details: validationErrors,
                },
            });
        }

        const newAction = await getPrisma().action_taken.create({
            data: {
                ticketId,
                performedById: performer.id,
                actionDateTime: resolvedActionDateTime!,
                description: trimmedDescription,
                result: trimmedResult,
                followUpRequired,
                followUpNote: resolvedFollowUpNote,
                attachmentNotes: resolvedAttachmentNotes,
                updatedAt: new Date(),
            },
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        return res.status(201).json(formatAction(newAction));
    } catch (error) {
        console.error('Error creating action taken:', error);
        return res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
        });
    }
};

// ─── PATCH /api/tickets/:id/actions-taken/:actionId ─────────────────────────
// Allowed: IT_STAFF, ADMIN only. Last-Write-Wins semantics.
export const updateActionTaken = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
            });
        }

        if (!isStaffOrAdmin(req.user.role)) {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Only IT Staff and Administrators can update actions taken.' },
            });
        }

        const ticketId = Number(req.params.id);
        const actionId = Number(req.params.actionId);

        if (isNaN(ticketId) || ticketId < 1 || isNaN(actionId) || actionId < 1) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket or action ID.' },
            });
        }

        // Check ticket exists
        const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } });
        }

        // Check action exists and belongs to the ticket
        const existingAction = await getPrisma().action_taken.findFirst({
            where: { id: actionId, ticketId },
        });
        if (!existingAction) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Action Taken record not found.' } });
        }

        // Check actor is active
        const performer = await getPrisma().user.findUnique({ where: { id: req.user.id } });
        if (!performer || !performer.isActive) {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Your account is inactive and cannot perform this action.' },
            });
        }

        const { actionDateTime, description, result, followUpRequired, followUpNote, attachmentNotes } = req.body;

        // ── Validation ────────────────────────────────────────────────────────
        const validationErrors: { field: string; message: string }[] = [];

        let resolvedActionDateTime: Date = existingAction.actionDateTime;
        if (actionDateTime !== undefined && actionDateTime !== null) {
            const parsed = new Date(actionDateTime);
            if (isNaN(parsed.getTime())) {
                validationErrors.push({ field: 'actionDateTime', message: 'actionDateTime must be a valid ISO 8601 date-time string.' });
            } else {
                const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
                if (parsed > fiveMinutesFromNow) {
                    validationErrors.push({ field: 'actionDateTime', message: 'actionDateTime cannot be more than 5 minutes in the future.' });
                }
                resolvedActionDateTime = parsed;
            }
        }

        const trimmedDescription = typeof description === 'string' ? description.trim() : '';
        if (!trimmedDescription || trimmedDescription.length < 5 || trimmedDescription.length > 2000) {
            validationErrors.push({ field: 'description', message: 'Description must be between 5 and 2000 characters.' });
        }

        const trimmedResult = typeof result === 'string' ? result.trim() : '';
        if (!trimmedResult || trimmedResult.length < 3 || trimmedResult.length > 1000) {
            validationErrors.push({ field: 'result', message: 'Result must be between 3 and 1000 characters.' });
        }

        if (typeof followUpRequired !== 'boolean') {
            validationErrors.push({ field: 'followUpRequired', message: 'followUpRequired must be a boolean.' });
        }

        let resolvedFollowUpNote: string | null = null;
        if (followUpRequired === true) {
            const trimmedNote = typeof followUpNote === 'string' ? followUpNote.trim() : '';
            if (!trimmedNote || trimmedNote.length < 3 || trimmedNote.length > 1000) {
                validationErrors.push({ field: 'followUpNote', message: 'Follow-up note cannot be blank when follow-up is required (3–1000 characters).' });
            } else {
                resolvedFollowUpNote = trimmedNote;
            }
        }

        let resolvedAttachmentNotes: string | null = null;
        if (attachmentNotes !== undefined && attachmentNotes !== null) {
            const trimmedAttachment = typeof attachmentNotes === 'string' ? attachmentNotes.trim() : '';
            if (trimmedAttachment.length > 500) {
                validationErrors.push({ field: 'attachmentNotes', message: 'Attachment notes must not exceed 500 characters.' });
            } else if (trimmedAttachment.length > 0) {
                resolvedAttachmentNotes = trimmedAttachment;
            }
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed on one or more fields.',
                    details: validationErrors,
                },
            });
        }

        const updatedAction = await getPrisma().action_taken.update({
            where: { id: actionId },
            data: {
                actionDateTime: resolvedActionDateTime,
                description: trimmedDescription,
                result: trimmedResult,
                followUpRequired,
                followUpNote: resolvedFollowUpNote,
                attachmentNotes: resolvedAttachmentNotes,
                updatedAt: new Date(),
            },
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        return res.status(200).json(formatAction(updatedAction));
    } catch (error) {
        console.error('Error updating action taken:', error);
        return res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
        });
    }
};
