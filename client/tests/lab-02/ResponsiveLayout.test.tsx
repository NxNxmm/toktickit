import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MyTicketsList } from '../../src/components/MyTicketsList';
import * as api from '../../src/api';
import { RequesterProvider } from '../../src/context/RequesterContext';

const mockRequester = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@kmutt.ac.th',
  department: 'Computer Engineering',
  isActive: true,
};

const mockTicketsResponse: api.GetTicketsResponse = {
  items: [
    {
      id: 1,
      ticketNo: 'TKT-2026-000001',
      summary: 'Responsive testing ticket summary',
      category: { id: 1, name: 'Hardware' },
      relatedSystem: { id: 1, name: 'Corporate Laptop' },
      requestedPriority: 'HIGH',
      itPriority: null,
      currentStatus: 'NEW',
      createdAt: '2026-09-04T10:00:00.000Z',
      updatedAt: '2026-09-04T10:00:00.000Z',
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  },
};

describe('ResponsiveLayout & Viewport Adaptation (RESP-01, AC-15)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_selected_requester', JSON.stringify(mockRequester));
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, name: 'Hardware' }]),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    });
  });

  it('renders both desktop table and mobile card layout for responsive switching (RESP-01)', async () => {
    vi.spyOn(api, 'getTickets').mockResolvedValue(mockTicketsResponse);

    const { container } = render(
      <RequesterProvider>
        <MyTicketsList onCreateTicket={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001').length).toBe(2);
    });

    // Verify desktop table container has responsive hiding class (d-none d-lg-block)
    const desktopContainer = container.querySelector('.d-none.d-lg-block');
    expect(desktopContainer).toBeInTheDocument();
    expect(desktopContainer?.querySelector('table')).toBeInTheDocument();

    // Verify mobile cards container has responsive mobile-only display class (d-block d-lg-none)
    const mobileContainer = container.querySelector('.d-block.d-lg-none');
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer?.querySelectorAll('.card').length).toBeGreaterThan(0);
  });

  it('provides touch-friendly actionable buttons across responsive views (RESP-01, AC-15)', async () => {
    vi.spyOn(api, 'getTickets').mockResolvedValue(mockTicketsResponse);

    render(
      <RequesterProvider>
        <MyTicketsList onCreateTicket={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001').length).toBe(2);
    });

    // Check New Ticket button is present and styled as button
    const newTicketBtns = screen.getAllByRole('button', { name: /\+ new ticket/i });
    expect(newTicketBtns.length).toBeGreaterThan(0);
    newTicketBtns.forEach((btn) => {
      expect(btn).toHaveClass('btn');
      expect(btn).toHaveClass('text-white');
    });
  });
});
