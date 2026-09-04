import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.ticket.count();
    let seq = count + 1;
    let ticketNo = `TKT-${year}-${seq.toString().padStart(6, '0')}`;
    while (await prisma.ticket.findUnique({ where: { ticketNo } })) {
        seq++;
        ticketNo = `TKT-${year}-${seq.toString().padStart(6, '0')}`;
    }
    return ticketNo;
}