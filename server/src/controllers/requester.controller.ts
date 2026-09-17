import { Request, Response } from 'express';
import { getPrisma } from '../prisma.js';

export const getActiveRequesters = async (req: Request, res: Response) => {
    try {
        const requesters = await getPrisma().user.findMany({
            where: { isActive: true, role: 'REQUESTER' },
            select: {
                id: true,
                name: true,
                email: true,
            },
            orderBy: { name: 'asc' },
        });

        const formatted = requesters.map((r) => ({
            ...r,
            department: 'General',
        }));

        return res.status(200).json(formatted);
    } catch (error) {
        console.error('Error fetching active requesters:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Unable to fetch active requesters',
        });
    }
};
