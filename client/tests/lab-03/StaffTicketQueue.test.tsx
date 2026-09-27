import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StaffQueue } from '../../src/components/StaffQueue';
import * as api from '../../src/api';

const mockTickets: api.StaffTicketListItem[] = [
  {
    id: 101,
    ticketNo: 'TKT-2026-000101',
    summary: 'Campus Wi-Fi drops in CB2',
    category: { id: 4, name: 'Network' },
    relatedSystem: { id: 2, name: 'Campus Wi-Fi' },
    requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@kmutt.ac.th' },
    owner: { id: 5, name: 'Alex Turner', email: 'alex.turner@toktickit.kmutt.ac.th' },
    requestedPriority: 'HIGH',
    itPriority: 'URGENT',
    currentStatus: 'IN_PROGRESS',
    resolvedIndicated: false,
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:30:00.000Z',
  },
  {
    id: 102,
    ticketNo: 'TKT-2026-000102',
    summary: 'Printer offline in Room 202',
    category: { id: 2, name: 'Hardware' },
    relatedSystem: { id: 6, name: 'Printer' },
    requester: { id: 2, name: 'Michael Brown', email: 'michael.brown@kmutt.ac.th' },
    owner: null,
    requestedPriority: 'LOW',
    itPriority: 'LOW',
    currentStatus: 'NEW',
    resolvedIndicated: false,
    createdAt: '2026-09-04T11:00:00.000Z',
    updatedAt: '2026-09-04T11:00:00.000Z',
  },
];

function mockCategoriesFetch() {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/categories')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 2, name: 'Hardware' },
            { id: 4, name: 'Network' },
          ]),
      } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
  });
}

describe('UI-04: IT Staff Ticket Queue table & empty state (FR-09, AC-5.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockCategoriesFetch();
  });

  it('renders ticket rows with ticket no, summary, badges, requester and owner (AC-5.4)', async () => {
    vi.spyOn(api, 'getStaffTickets').mockResolvedValue({
      tickets: mockTickets,
      pagination: { page: 1, pageSize: 10, totalCount: 2, totalPages: 1, hasPrevious: false, hasNext: false },
    });

    render(<StaffQueue onViewTicket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('IT Staff Ticket Queue')).toBeInTheDocument();
    });

    // Ticket No (rendered in both the desktop table and mobile cards)
    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000101').length).toBe(2);
    });
    expect(screen.getAllByText('TKT-2026-000102').length).toBe(2);

    // Summaries
    expect(screen.getAllByText('Campus Wi-Fi drops in CB2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Printer offline in Room 202').length).toBeGreaterThan(0);

    // Badges: status and priorities
    expect(screen.getAllByText('IN PROGRESS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NEW').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('URGENT').length).toBeGreaterThan(0);

    // Requester & owner names
    expect(screen.getAllByText('Jennifer Anderson').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alex Turner').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Michael Brown').length).toBeGreaterThan(0);
    // Unassigned owner indicator
    expect(screen.getAllByText(/Unassigned/i).length).toBeGreaterThan(0);

    // Total count in header
    expect(screen.getByText('(2 total)')).toBeInTheDocument();
  });

  it('clicking a ticket row invokes onViewTicket with the ticket id (AC-5.4)', async () => {
    vi.spyOn(api, 'getStaffTickets').mockResolvedValue({
      tickets: mockTickets,
      pagination: { page: 1, pageSize: 10, totalCount: 2, totalPages: 1, hasPrevious: false, hasNext: false },
    });

    const onViewTicket = vi.fn();
    render(<StaffQueue onViewTicket={onViewTicket} />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000101').length).toBe(2);
    });

    fireEvent.click(screen.getAllByText('TKT-2026-000101')[0]);
    expect(onViewTicket).toHaveBeenCalledWith(101);
  });

  it('renders a clean empty state when no tickets match (AC-5.4 / ui-spec §4)', async () => {
    vi.spyOn(api, 'getStaffTickets').mockResolvedValue({
      tickets: [],
      pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false },
    });

    render(<StaffQueue onViewTicket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('No tickets found').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('TKT-2026-000101')).not.toBeInTheDocument();
  });

  it('renders pagination controls when there is more than one page (BR-18)', async () => {
    vi.spyOn(api, 'getStaffTickets').mockResolvedValue({
      tickets: mockTickets.slice(0, 1),
      pagination: { page: 1, pageSize: 10, totalCount: 25, totalPages: 3, hasPrevious: false, hasNext: true },
    });

    render(<StaffQueue onViewTicket={vi.fn()} />);

    // Text is rendered as multiple text nodes around the en-dash, so match by textContent
    await waitFor(() => {
      const info = screen.getByText((_content: string, node: Element | null) => {
        return node !== null && node.textContent === 'Showing 1–10 of 25 tickets';
      });
      expect(info).toBeInTheDocument();
    });

    // Page-size selector offers 10 / 20 / 50
    const pageSizeSelect = screen.getByDisplayValue('10 per page');
    expect(pageSizeSelect).toBeInTheDocument();
    expect(screen.getByText('20 per page')).toBeInTheDocument();
    expect(screen.getByText('50 per page')).toBeInTheDocument();
  });

  it('exposes the filter dropdowns required by ui-spec §3.4 (Category, Status, Req/IT Priority, Owner)', async () => {
    vi.spyOn(api, 'getStaffTickets').mockResolvedValue({
      tickets: [],
      pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false },
    });

    const { container } = render(<StaffQueue onViewTicket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('All Categories').length).toBeGreaterThan(0);
    });

    // Each filter dropdown renders its expected placeholder option
    const categorySelect = container.querySelector('#filter-category');
    const statusSelect = container.querySelector('#filter-status');
    const reqPrioritySelect = container.querySelector('#filter-req-priority');
    const itPrioritySelect = container.querySelector('#filter-it-priority');
    const ownerSelect = container.querySelector('#filter-owner');

    expect(categorySelect).toBeInTheDocument();
    expect(statusSelect).toBeInTheDocument();
    expect(reqPrioritySelect).toBeInTheDocument();
    expect(itPrioritySelect).toBeInTheDocument();
    expect(ownerSelect).toBeInTheDocument();

    // All four priority values are offered (LOW, MEDIUM, HIGH, URGENT)
    const urgentOptions = container.querySelectorAll('#filter-req-priority option[value="URGENT"], #filter-it-priority option[value="URGENT"]');
    expect(urgentOptions.length).toBe(2);
    const allPriorities = container.querySelectorAll('#filter-req-priority option, #filter-it-priority option');
    expect(allPriorities.length).toBeGreaterThanOrEqual(10); // 2 selects × (All + 4 values)

    // "Unassigned" owner option exists
    const unassignedOption = container.querySelector('#filter-owner option[value="unassigned"]');
    expect(unassignedOption).toBeInTheDocument();

    // Search bar
    expect(screen.getByPlaceholderText(/Search by Ticket No or Summary/i)).toBeInTheDocument();
  });
});