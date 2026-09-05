import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
      summary: 'Screen flickers when opening apps',
      category: { id: 1, name: 'Hardware' },
      relatedSystem: { id: 1, name: 'Corporate Laptop' },
      requestedPriority: 'HIGH',
      itPriority: null,
      currentStatus: 'NEW',
      createdAt: '2026-09-04T10:00:00.000Z',
      updatedAt: '2026-09-04T10:00:00.000Z',
    },
    {
      id: 2,
      ticketNo: 'TKT-2026-000002',
      summary: 'Cannot connect to campus wifi',
      category: { id: 2, name: 'Network' },
      relatedSystem: { id: 2, name: 'Campus Wi-Fi' },
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      currentStatus: 'IN_PROGRESS',
      createdAt: '2026-09-04T11:00:00.000Z',
      updatedAt: '2026-09-04T11:30:00.000Z',
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 2,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  },
};

describe('MyTicketsList Component (Issue 5 - AC 1 to AC 6, UI-06)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_selected_requester', JSON.stringify(mockRequester));
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, name: 'Hardware' },
              { id: 2, name: 'Network' },
            ]),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    });
  });

  it('renders ticket table with tickets and pagination range', async () => {
    vi.spyOn(api, 'getTickets').mockResolvedValue(mockTicketsResponse);

    render(
      <RequesterProvider>
        <MyTicketsList onCreateTicket={vi.fn()} />
      </RequesterProvider>
    );

    expect(screen.getAllByText(/Loading tickets.../i)[0]).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('TKT-2026-000002').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('Screen flickers when opening apps')[0]).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.textContent?.trim() === 'Showing 1 to 2 of 2 tickets')
    ).toBeInTheDocument();
  });

  it('displays zero-ticket account empty state with call-to-action (AC 6, UI-06)', async () => {
    vi.spyOn(api, 'getTickets').mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        hasPrevious: false,
        hasNext: false,
      },
    });

    const handleCreateTicket = vi.fn();
    render(
      <RequesterProvider>
        <MyTicketsList onCreateTicket={handleCreateTicket} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/You haven't submitted any support tickets yet/i)
      ).toBeInTheDocument();
    });

    const ctaBtn = screen.getByRole('button', { name: /\+ create your first ticket/i });
    expect(ctaBtn).toBeInTheDocument();

    fireEvent.click(ctaBtn);
    expect(handleCreateTicket).toHaveBeenCalledTimes(1);
  });

  it('displays zero search match "No results found" when filters are active (AC 6, UI-06)', async () => {
    // Initial load returns empty when filtered
    vi.spyOn(api, 'getTickets').mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        hasPrevious: false,
        hasNext: false,
      },
    });

    render(
      <RequesterProvider>
        <MyTicketsList onCreateTicket={vi.fn()} />
      </RequesterProvider>
    );

    const searchInput = screen.getByPlaceholderText(/search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      expect(screen.getByText(/No tickets match your search filters/i)).toBeInTheDocument();
    });

    const clearBtn = screen.getByRole('button', { name: /clear all filters/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    expect(searchInput).toHaveValue('');
  });

  it('handles Clear Filters button interaction in toolbar (AC 3)', async () => {
    vi.spyOn(api, 'getTickets').mockResolvedValue(mockTicketsResponse);

    render(
      <RequesterProvider>
        <MyTicketsList onCreateTicket={vi.fn()} />
      </RequesterProvider>
    );

    const clearBtn = screen.getByRole('button', { name: /clear filters/i });
    expect(clearBtn).toBeDisabled();

    const prioritySelect = screen.getByLabelText(/priority/i);
    fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });

    expect(clearBtn).not.toBeDisabled();

    fireEvent.click(clearBtn);
    expect(prioritySelect).toHaveValue('');
    expect(clearBtn).toBeDisabled();
  });
});
