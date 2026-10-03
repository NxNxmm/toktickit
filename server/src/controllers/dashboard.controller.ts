import { Request, Response } from 'express';
import { getPrisma } from '../prisma.js';

// ─── GET /api/dashboard/requester ────────────────────────────────────────────
// Allowed: REQUESTER only. Scoped strictly to req.user.id.
export const getRequesterDashboard = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
            });
        }

        if (req.user.role !== 'REQUESTER') {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Access restricted to Requester accounts.' },
            });
        }

        const userId = req.user.id;

        // Rolling window boundaries (UTC)
        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 86_400_000);
        const thirtyDaysAgo = new Date(now - 30 * 86_400_000);

        const openStatuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER'] as const;

        const [totalOpen, waitingForRequester, recentlyUpdated, recentlyResolved, recentTickets] =
            await Promise.all([
                // totalOpen: NEW | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER
                getPrisma().ticket.count({
                    where: { submittedById: userId, currentStatus: { in: [...openStatuses] } },
                }),
                // waitingForRequester
                getPrisma().ticket.count({
                    where: { submittedById: userId, currentStatus: 'WAITING_FOR_REQUESTER' },
                }),
                // recentlyUpdated: any status updated in last 7 days (rolling)
                getPrisma().ticket.count({
                    where: { submittedById: userId, updatedAt: { gte: sevenDaysAgo } },
                }),
                // recentlyResolved: RESOLVED (strictly excludes CLOSED) updated in last 30 days (rolling)
                getPrisma().ticket.count({
                    where: { submittedById: userId, currentStatus: 'RESOLVED', updatedAt: { gte: thirtyDaysAgo } },
                }),
                // Recent 5 tickets ordered by updatedAt DESC
                getPrisma().ticket.findMany({
                    where: { submittedById: userId },
                    orderBy: { updatedAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        ticketNumber: true,
                        summary: true,
                        currentStatus: true,
                        requestedPriority: true,
                        updatedAt: true,
                    },
                }),
            ]);

        return res.status(200).json({
            metrics: {
                totalOpen,
                waitingForRequester,
                recentlyUpdated,
                recentlyResolved,
            },
            recentTickets: recentTickets.map((t) => ({
                id: t.id,
                ticketNumber: t.ticketNumber,
                title: t.summary,
                status: t.currentStatus,
                requestedPriority: t.requestedPriority,
                updatedAt: t.updatedAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching requester dashboard:', error);
        return res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
        });
    }
};

// ─── GET /api/dashboard/staff ─────────────────────────────────────────────────
// Allowed: IT_STAFF, ADMIN
export const getStaffDashboard = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
            });
        }

        if (req.user.role !== 'IT_STAFF' && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Access restricted to IT Staff and Administrator accounts.' },
            });
        }

        const userId = req.user.id;

        // myAssigned: explicitly excludes RESOLVED, CLOSED, CANCELLED
        const myAssignedStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] as const;

        const [newTickets, openTickets, inProgressTickets, waitingForRequesterTickets, myAssignedTickets, recentTickets] =
            await Promise.all([
                getPrisma().ticket.count({ where: { currentStatus: 'NEW' } }),
                getPrisma().ticket.count({ where: { currentStatus: 'OPEN' } }),
                getPrisma().ticket.count({ where: { currentStatus: 'IN_PROGRESS' } }),
                getPrisma().ticket.count({ where: { currentStatus: 'WAITING_FOR_REQUESTER' } }),
                getPrisma().ticket.count({
                    where: { ownerId: userId, currentStatus: { in: [...myAssignedStatuses] } },
                }),
                // Recent 10 tickets by updatedAt DESC for the staff queue view
                getPrisma().ticket.findMany({
                    orderBy: { updatedAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        ticketNumber: true,
                        summary: true,
                        currentStatus: true,
                        itPriority: true,
                        updatedAt: true,
                        user_ticket_ownerIdTouser: { select: { id: true, name: true } },
                        user_ticket_submittedByIdTouser: { select: { id: true, name: true } },
                    },
                }),
            ]);

        return res.status(200).json({
            metrics: {
                newTickets,
                openTickets,
                inProgressTickets,
                waitingForRequesterTickets,
                myAssignedTickets,
            },
            recentTickets: recentTickets.map((t) => ({
                id: t.id,
                ticketNumber: t.ticketNumber,
                title: t.summary,
                status: t.currentStatus,
                itPriority: t.itPriority,
                assignedStaff: t.user_ticket_ownerIdTouser
                    ? { id: t.user_ticket_ownerIdTouser.id, name: t.user_ticket_ownerIdTouser.name }
                    : null,
                requester: t.user_ticket_submittedByIdTouser
                    ? { id: t.user_ticket_submittedByIdTouser.id, name: t.user_ticket_submittedByIdTouser.name }
                    : null,
                updatedAt: t.updatedAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching staff dashboard:', error);
        return res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
        });
    }
};

// ─── GET /api/dashboard/admin ─────────────────────────────────────────────────
// Allowed: ADMIN only
export const getAdminDashboard = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
            });
        }

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Access restricted to Administrator accounts.' },
            });
        }

        const userId = req.user.id;
        const myAssignedStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] as const;

        const [
            newTickets,
            openTickets,
            inProgressTickets,
            waitingForRequesterTickets,
            myAssignedTickets,
            activeRequesters,
            activeStaff,
            activeAdmins,
            totalUsers,
        ] = await Promise.all([
            getPrisma().ticket.count({ where: { currentStatus: 'NEW' } }),
            getPrisma().ticket.count({ where: { currentStatus: 'OPEN' } }),
            getPrisma().ticket.count({ where: { currentStatus: 'IN_PROGRESS' } }),
            getPrisma().ticket.count({ where: { currentStatus: 'WAITING_FOR_REQUESTER' } }),
            getPrisma().ticket.count({
                where: { ownerId: userId, currentStatus: { in: [...myAssignedStatuses] } },
            }),
            getPrisma().user.count({ where: { role: 'REQUESTER', isActive: true } }),
            getPrisma().user.count({ where: { role: 'IT_STAFF', isActive: true } }),
            getPrisma().user.count({ where: { role: 'ADMIN', isActive: true } }),
            getPrisma().user.count(),
        ]);

        return res.status(200).json({
            operational: {
                newTickets,
                openTickets,
                inProgressTickets,
                waitingForRequesterTickets,
                myAssignedTickets,
            },
            userStats: {
                activeRequesters,
                activeStaff,
                activeAdmins,
                totalUsers,
            },
        });
    } catch (error) {
        console.error('Error fetching admin dashboard:', error);
        return res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
        });
    }
};
