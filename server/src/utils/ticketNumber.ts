import { getPrisma } from '../prisma.js';

export async function generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await getPrisma().ticket.count();
    let seq = count + 1;
    let ticketNumber = `TKT-${year}-${seq.toString().padStart(6, '0')}`;
    while (await getPrisma().ticket.findUnique({ where: { ticketNumber } })) {
        seq++;
        ticketNumber = `TKT-${year}-${seq.toString().padStart(6, '0')}`;
    }
    return ticketNumber;
}