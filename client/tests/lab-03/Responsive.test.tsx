import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { StaffQueue } from '../../src/components/StaffQueue';
import * as api from '../../src/api';

const mockTicket: api.StaffTicketListItem = {
  id: 1,
  ticketNo: 'TKT-2026-000001',
  summary: 'Responsive Staff Queue ticket summary',
  category: { id: 4, name: 'Network' },
  relatedSystem: { id: 2, name: 'Campus Wi-Fi' },
  requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@kmutt.ac.th' },
  owner: null,
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
  currentStatus: 'NEW',
  resolvedIndicated: false,
  createdAt: '2026-09-04T10:00:00.000Z',
  updatedAt: '2026-09-04T10:00:00.000Z',
};

function mockCategoriesFetch() {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/categories')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 4, name: 'Network' }]),
      } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
  });
}

describe('RESP-01: Staff Queue responsive layout (AC-5.4, AC-9.1)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockCategoriesFetch();
    vi.spyOn(api, 'getStaffTickets').mockResolvedValue({
      tickets: [mockTicket],
      pagination: { page: 1, pageSize: 10, totalCount: 1, totalPages: 1, hasPrevious: false, hasNext: false },
    });
  });

  it('renders a full Data Table on desktop (>= 992px) via d-none d-lg-block container', async () => {
    const { container } = render(<StaffQueue onViewTicket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001').length).toBe(2);
    });

    // Desktop container is hidden below lg and contains the full table
    const desktopContainer = container.querySelector('.d-none.d-lg-block');
    expect(desktopContainer).toBeInTheDocument();
    expect(desktopContainer?.querySelector('table')).toBeInTheDocument();

    // Desktop table renders all required columns (ui-spec §3.4)
    const table = desktopContainer!.querySelector('table')!;
    const headers = Array.from(table.querySelectorAll('th')).map((th) => th.textContent?.trim());
    expect(headers.join(' ')).toMatch(/Ticket No/);
    expect(headers.join(' ')).toMatch(/Summary/);
    expect(headers.join(' ')).toMatch(/Category/);
    expect(headers.join(' ')).toMatch(/Requester/);
    expect(headers.join(' ')).toMatch(/Owner/);
    expect(headers.join(' ')).toMatch(/Req\. Pri/);
    expect(headers.join(' ')).toMatch(/IT Pri/);
    expect(headers.join(' ')).toMatch(/Status/);
    expect(headers.join(' ')).toMatch(/Created/);
  });

  it('renders stacked Cards on mobile (< 768px) via d-lg-none container, still fully actionable', async () => {
    const { container } = render(<StaffQueue onViewTicket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001').length).toBe(2);
    });

    // Mobile container is shown below lg and uses stacked cards (not a table)
    const mobileContainer = container.querySelector('.d-lg-none');
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer?.querySelector('table')).toBeNull();

    // Card shows ticket number, summary, category, requester, owner, and badges
    const cardNumber = screen.getAllByText('TKT-2026-000001');
    expect(cardNumber.length).toBe(2);
    expect(screen.getAllByText('Responsive Staff Queue ticket summary').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Network').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jennifer Anderson').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unassigned/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('NEW').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
  });

  it('card click navigates to ticket detail (AC-5.4)', async () => {
    const onViewTicket = vi.fn();
    render(<StaffQueue onViewTicket={onViewTicket} />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001').length).toBe(2);
    });

    fireEvent.click(screen.getAllByText('TKT-2026-000001')[1]);
    expect(onViewTicket).toHaveBeenCalledWith(1);
  });

  it('mobile cards wrap and shrink so they fit a 375px viewport (AC-9.1)', async () => {
    const { container } = render(<StaffQueue onViewTicket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001').length).toBe(2);
    });

    const mobileContainer = container.querySelector('.d-lg-none') as HTMLElement;
    expect(mobileContainer.querySelector('.d-flex.flex-wrap.justify-content-between')).toBeInTheDocument();

    const shrinkableGrids = Array.from(mobileContainer.querySelectorAll<HTMLElement>('div')).filter((element) =>
      element.style.gridTemplateColumns.includes('minmax(0')
    );
    expect(shrinkableGrids.length).toBeGreaterThan(0);

    const overflowingMinWidths = Array.from(mobileContainer.querySelectorAll<HTMLElement>('*')).filter((element) => {
      const declared = element.style.minWidth;
      return declared !== '' && Number.parseInt(declared, 10) >= 375;
    });
    expect(overflowingMinWidths).toHaveLength(0);

    const summary = Array.from(mobileContainer.querySelectorAll<HTMLElement>('div')).find(
      (element) => element.style.overflowWrap === 'anywhere'
    );
    expect(summary).toBeInTheDocument();
  });
});