import { describe, it, expect } from 'vitest';
import { generateTicketNumber } from '../../../src/utils/ticketNumber.js';

describe('UNIT-01: Ticket Number Generator (BR-01, AC-01)', () => {
    it('should generate a ticket number matching pattern TKT-YYYY-XXXXXX', async () => {
        const ticketNo = await generateTicketNumber();
        const currentYear = new Date().getFullYear();
        const pattern = new RegExp(`^TKT-${currentYear}-\\d{6}$`);

        expect(ticketNo).toMatch(pattern);
    });

    it('should format sequential digits with 6-digit zero padding', async () => {
        const ticketNo = await generateTicketNumber();
        const parts = ticketNo.split('-');

        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe('TKT');
        expect(parts[1]).toBe(String(new Date().getFullYear()));
        expect(parts[2]).toHaveLength(6);
        expect(Number(parts[2])).toBeGreaterThanOrEqual(1);
    });
});
