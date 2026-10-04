import { Request, Response } from 'express';
import { TicketStatus, RequestedPriority } from '@prisma/client';
import { getPrisma } from '../prisma.js';
import { TICKET_STATUSES, canTransition } from '../utils/statusTransitions.js';

// ─── PATCH /api/tickets/:id/workflow ─────────────────────────────────────────
// Handles optimistic concurrency (version), status transitions, resolution gate,
// and Requester advisory resolution indication.
//
// Business Rule Evaluation Order (strict):
//   Step 1: 401 — authentication
//   Step 2: 403 — role + ownership for advisory
//   Step 3: 400 — schema validation (missing version, invalid status string)
//   Step 4: 409 — optimistic concurrency conflict
//   Step 5: 422 — semantic domain rules (invalid transition, resolution gate)
export const updateTicketWorkflow = async (req: Request, res: Response) => {
    try {
        // ── Step 1: Authentication ─────────────────────────────────────────────
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

        const { status, itPriority, resolutionNote, isRequesterAdvisory, version } = req.body;
        const role = req.user.role;

        // ── Step 2: Role guard ────────────────────────────────────────────────
        if (role === 'REQUESTER') {
            // REQUESTER may ONLY submit an advisory resolution indication (isRequesterAdvisory: true)
            // on their own ticket — they cannot set any status transitions
            if (!isRequesterAdvisory) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Requesters cannot set ticket status. Only advisory resolution indications are permitted.',
                    },
                });
            }
            if (status !== undefined && status !== null) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Requesters cannot set ticket status to Resolved or Closed.',
                    },
                });
            }
        }

        // ── Step 3: Payload schema validation ─────────────────────────────────
        // For staff/admin performing a status transition, version is required
        if (!isRequesterAdvisory || role !== 'REQUESTER') {
            if (version === undefined || version === null) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Version number is required for optimistic concurrency control.',
                    },
                });
            }
            if (typeof version !== 'number' || !Number.isInteger(version)) {
                return res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: 'Version must be a positive integer.' },
                });
            }
        }

        if (status !== undefined && status !== null) {
            if (typeof status !== 'string' || !TICKET_STATUSES.includes(status as TicketStatus)) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: `Invalid status value. Allowed: ${TICKET_STATUSES.join(', ')}`,
                    },
                });
            }
        }

        // ── Fetch current ticket ───────────────────────────────────────────────
        const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } });
        }

        // ── Step 2 cont: Requester ownership check for advisory ───────────────
        if (role === 'REQUESTER' && isRequesterAdvisory) {
            if (ticket.submittedById !== req.user.id) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You can only submit an advisory resolution on your own ticket.',
                    },
                });
            }
            // Process advisory indication only (no version / transition needed)
            const updated = await getPrisma().ticket.update({
                where: { id: ticketId },
                data: {
                    resolvedIndicated: true,
                    resolvedIndicatedAt: new Date(),
                    updatedAt: new Date(),
                    version: { increment: 1 },
                },
            });
            return res.status(200).json({
                id: updated.id,
                status: updated.currentStatus,
                version: updated.version,
                resolvedIndicated: updated.resolvedIndicated,
                resolvedIndicatedAt: updated.resolvedIndicatedAt,
                updatedAt: updated.updatedAt,
                message: 'Advisory resolution indication recorded.',
            });
        }

        // ── Step 4: Optimistic concurrency check ──────────────────────────────
        if (ticket.version !== version) {
            return res.status(409).json({
                error: {
                    code: 'CONCURRENCY_CONFLICT',
                    message: 'The ticket was updated by another user. Please refresh and review latest changes.',
                    currentVersion: ticket.version,
                    submittedVersion: version,
                },
            });
        }

        // ── Step 5: Semantic domain rules ─────────────────────────────────────
        if (status !== undefined && status !== null) {
            // 5a: Transition matrix check
            if (!canTransition(ticket.currentStatus as TicketStatus, status as TicketStatus)) {
                return res.status(422).json({
                    error: {
                        code: 'INVALID_STATUS_TRANSITION',
                        message: `Status transition from ${ticket.currentStatus} to ${status} is not permitted by the status transition matrix.`,
                    },
                });
            }

            // 5b: Resolution gate — RESOLVED or CLOSED requires ≥1 ActionTaken record
            if (status === 'RESOLVED' || status === 'CLOSED') {
                const actionCount = await getPrisma().action_taken.count({ where: { ticketId } });
                if (actionCount === 0) {
                    return res.status(422).json({
                        error: {
                            code: 'RESOLUTION_REQUIRES_ACTION_TAKEN',
                            message:
                                'A ticket cannot be resolved or closed without at least one recorded Action Taken documenting the work performed.',
                        },
                    });
                }
            }
        }

        // ── Apply updates ─────────────────────────────────────────────────────
        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
            version: { increment: 1 },
        };

        if (status !== undefined && status !== null) {
            updateData.currentStatus = status as TicketStatus;
        }

        if (itPriority !== undefined && itPriority !== null) {
            const validPriorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
            if (!validPriorities.includes(itPriority as RequestedPriority)) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: `Invalid itPriority. Allowed: ${validPriorities.join(', ')}`,
                    },
                });
            }
            updateData.itPriority = itPriority as RequestedPriority;
        }

        const updated = await getPrisma().ticket.update({
            where: { id: ticketId },
            data: updateData as any,
        });

        return res.status(200).json({
            id: updated.id,
            status: updated.currentStatus,
            version: updated.version,
            updatedAt: updated.updatedAt,
            message: 'Ticket status successfully updated.',
        });
    } catch (error) {
        console.error('Error updating ticket workflow:', error);
        return res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
        });
    }
};
