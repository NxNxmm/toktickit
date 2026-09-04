import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.ticket.count();
    const nextSeq = (count + 1).toString().padStart(6, '0');
    return `TKT-${year}-${nextSeq}`;
}