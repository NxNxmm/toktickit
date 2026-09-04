import { Request, Response } from 'express';
import { getPrisma } from '../prisma.js';

export const getRelatedSystems = async (req: Request, res: Response) => {
    try {
        const systems = await getPrisma().relatedSystem.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                id: 'asc',
            },
        });
        return res.status(200).json(systems);
    } catch (error) {
        console.error('Error fetching related systems:', error);
        return res.status(500).json({ error: 'Failed to fetch related systems' });
    }
};
