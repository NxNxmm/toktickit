import { Request, Response } from 'express';
import { getPrisma } from '../prisma.js';

export const getActiveRequesters = async (req: Request, res: Response) => {
    try {
        const requesters = await getPrisma().requesterUser.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                department: true,
            },
            orderBy: { name: 'asc' },
        });

        return res.status(200).json(requesters);
    } catch (error) {
        console.error('Error fetching active requesters:', error);
        return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Unable to fetch active requesters',
        });
    }
};
