import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StaffTicketDetail } from '../../src/components/StaffTicketDetail';
import * as api from '../../src/api';
import type { User } from '../../src/api';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 5, name: 'Alex Turner', email: 'alex.turner@toktickit.kmutt.ac.th', role: 'IT_STAFF', requiresPasswordChange: false } as User,
    token: 'staff-token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    setUser: vi.fn(),
  }),
}));

const assignees: api.StaffAssignee[] = [
  { id: 5, name: 'Alex Turner', email: 'alex.turner@toktickit.kmutt.ac.th', role: 'IT_STAFF' },
  { id: 6, name: 'Jessica Miller', email: 'jessica.miller@toktickit.kmutt.ac.th', role: 'IT_STAFF' },
  { id: 9, name: 'System Admin', email: 'admin@toktickit.kmutt.ac.th', role: 'ADMIN' },
];

const baseTicket: api.StaffTicketDetail = {
  id: 101,
  ticketNo: 'TKT-2026-000101',
  summary: 'Campus Wi-Fi drops in CB2',
  description: 'Wi-Fi connection drops every 5–10 minutes in room 401.',
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
  currentStatus: 'OPEN',
  resolvedIndicated: false,
  resolvedIndicatedAt: null,
  createdAt: '2026-09-04T10:00:00.000Z',
  updatedAt: '2026-09-04T10:30:00.000Z',
  category: { id: 4, name: 'Network' },
  relatedSystem: { id: 2, name: 'Campus Wi-Fi' },
  requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@kmutt.ac.th' },
  owner: null,
  attachments: [],
  publicComments: [
    {
      id: 10,
      ticketId: 101,
      author: { id: 1, name: 'Jennifer Anderson', role: 'REQUESTER' },
      content: 'Added a screenshot of the disconnect dialog.',
      createdAt: '2026-09-04T10:15:00.000Z',
    },
  ],
  internalNotes: [
    {
      id: 3,
      ticketId: 101,
      author: { id: 5, name: 'Alex Turner', role: 'IT_STAFF' },
      content: 'Network engineer rebooted the CB2 AP switch at 09:00.',
      createdAt: '2026-09-04T10:20:00.000Z',
    },
  ],
};

function mockStaffDetail(overrides: Partial<api.StaffTicketDetail> = {}) {
  const ticket = { ...baseTicket, ...overrides };
  vi.spyOn(api, 'getStaffTicketDetail').mockResolvedValue(ticket);
  vi.spyOn(api, 'getStaffAssignees').mockResolvedValue(assignees);
  return ticket;
}

describe('UI-05: Staff ticket detail operational controls (FR-10, FR-11, AC-6.1, AC-6.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the read-only requester section and header badges', async () => {
    mockStaffDetail();

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000101')).toBeInTheDocument();
    });

    expect(screen.getAllByText('OPEN').length).toBeGreaterThan(0);
    expect(screen.getByText('Campus Wi-Fi drops in CB2')).toBeInTheDocument();
    expect(screen.getByText(/Wi-Fi connection drops every 5–10 minutes in room 401/i)).toBeInTheDocument();
    expect(screen.getAllByText('Jennifer Anderson').length).toBeGreaterThan(0);
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('renders owner dropdown listing active IT Staff and Admins (AC-6.1)', async () => {
    mockStaffDetail();

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-owner-select')).toBeInTheDocument();
    });

    const ownerSelect = screen.getByTestId('ticket-owner-select') as HTMLSelectElement;
    expect(ownerSelect).toHaveValue('');

    const names = Array.from(ownerSelect.options).map((o) => o.text);
    expect(names).toContain('Alex Turner (IT Staff)');
    expect(names).toContain('Jessica Miller (IT Staff)');
    expect(names).toContain('System Admin (Admin)');
    expect(names).toContain('Unassigned');

    // Claim quick-action shown when the ticket is unassigned
    expect(screen.getByTestId('claim-ticket-btn')).toBeInTheDocument();
  });

  it('claiming an unassigned ticket calls updateTicketOwnership with the current user id (AC-6.1)', async () => {
    mockStaffDetail();
    const updateSpy = vi.spyOn(api, 'updateTicketOwnership').mockResolvedValue({
      ...baseTicket,
      owner: { id: 5, name: 'Alex Turner', email: 'alex.turner@toktickit.kmutt.ac.th' },
    });

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('claim-ticket-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('claim-ticket-btn'));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(101, 5);
    });
  });

  it('reassigning ownership applies the selected assignee id (AC-6.1)', async () => {
    mockStaffDetail();
    const updateSpy = vi.spyOn(api, 'updateTicketOwnership').mockResolvedValue({
      ...baseTicket,
      owner: { id: 6, name: 'Jessica Miller', email: 'jessica.miller@toktickit.kmutt.ac.th' },
    });

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-owner-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('ticket-owner-select'), { target: { value: '6' } });
    fireEvent.click(screen.getByTestId('apply-owner-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(101, 6);
    });
  });

  it('renders IT Priority selector with the four priority levels (AC-6.2)', async () => {
    mockStaffDetail();

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-it-priority-select')).toBeInTheDocument();
    });

    const prioritySelect = screen.getByTestId('ticket-it-priority-select') as HTMLSelectElement;
    expect(prioritySelect).toHaveValue('HIGH');
    expect(Array.from(prioritySelect.options).map((o) => o.value)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
  });

  it('changing IT priority applies updateTicketItPriority (AC-6.2)', async () => {
    mockStaffDetail();
    const updateSpy = vi.spyOn(api, 'updateTicketItPriority').mockResolvedValue({
      ...baseTicket,
      itPriority: 'URGENT',
    });

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-it-priority-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('ticket-it-priority-select'), { target: { value: 'URGENT' } });
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(101, 'URGENT');
    });
  });

  it('status dropdown offers only permitted transitions from OPEN (AC-6.2, BR-12)', async () => {
    mockStaffDetail({ currentStatus: 'OPEN' });

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-status-select')).toBeInTheDocument();
    });

    const statusSelect = screen.getByTestId('ticket-status-select') as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map((o) => o.value);
    // OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED only
    expect(options).toContain('IN_PROGRESS');
    expect(options).toContain('WAITING_FOR_REQUESTER');
    expect(options).toContain('CANCELLED');
    expect(options).not.toContain('NEW');
    expect(options).not.toContain('RESOLVED');
    expect(options).not.toContain('CLOSED');
    expect(options).not.toContain('REOPENED');
    expect(options).not.toContain('OPEN');
  });

  it('changing status applies the permitted transition (AC-6.2)', async () => {
    mockStaffDetail({ currentStatus: 'OPEN' });
    const updateSpy = vi.spyOn(api, 'updateTicketStatus').mockResolvedValue({
      ...baseTicket,
      currentStatus: 'IN_PROGRESS',
    });

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-status-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('ticket-status-select'), { target: { value: 'IN_PROGRESS' } });
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(101, 'IN_PROGRESS');
    });
  });
});

describe('UI-06: Public Comments vs Internal Notes visual distinction (FR-13, AC-6.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows Public Comments tab first with soft green comment cards', async () => {
    mockStaffDetail();

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('public-comment-card')).toBeInTheDocument();
    });

    // Soft green theme (AC-6.4): pale-green card background with green accent border
    const commentCard = screen.getByTestId('public-comment-card');
    expect(commentCard.style.backgroundColor).toContain('--color-pale-green');
    expect(commentCard.style.borderLeft).toContain('rgb(11, 122, 70)');

    // Comment author identity & content rendered
    expect(screen.getAllByText('Jennifer Anderson').length).toBeGreaterThan(0);
    expect(screen.getByText('Added a screenshot of the disconnect dialog.')).toBeInTheDocument();
  });

  it('Internal Notes tab carries a gold banner, lock icon, and soft gold note cards (AC-6.4)', async () => {
    mockStaffDetail();

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Public Comments \(1\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-internal-notes'));

    // Banner with the exact ui-spec message
    await waitFor(() => {
      expect(
        screen.getByText(/Private Operational Notes — Strictly visible to IT Staff and Administrators/i)
      ).toBeInTheDocument();
    });

    // Lock icon in the header / banner
    expect(screen.getByTestId('internal-notes-banner')).toBeInTheDocument();

    // Internal note cards use the soft gold theme (--color-note-bg / --color-note-gold) + lock icon
    const noteCard = screen.getByTestId('internal-note-card');
    expect(noteCard.style.backgroundColor).toContain('--color-note-bg');
    expect(noteCard.style.borderLeft).toContain('--color-note-gold');
    expect(noteCard.textContent).toContain('🔒');
    expect(screen.getByText(/Network engineer rebooted the CB2 AP switch at 09:00/i)).toBeInTheDocument();

    // Add Internal Note form is exposed
    expect(screen.getByTestId('tab-internal-notes')).toBeInTheDocument();
    expect(screen.getAllByText(/Add Internal Note/i).length).toBeGreaterThan(0);
  });

  it('switching tabs toggles between the green comments feed and gold notes feed', async () => {
    mockStaffDetail();

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('public-comment-card')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('internal-note-card')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-internal-notes'));
    await waitFor(() => {
      expect(screen.getByTestId('internal-note-card')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('public-comment-card')).not.toBeInTheDocument();
  });

  it('submitting an internal note appends it to the gold feed (AC-6.3)', async () => {
    mockStaffDetail();
    const postSpy = vi.spyOn(api, 'postInternalNote').mockResolvedValue({
      id: 99,
      ticketId: 101,
      author: { id: 5, name: 'Alex Turner', role: 'IT_STAFF' },
      content: 'AP switch replaced permanently.',
      createdAt: '2026-09-05T08:00:00.000Z',
    });

    render(<StaffTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-internal-notes')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('tab-internal-notes'));

    const textarea = await screen.findByTestId('staff-note-content-input');
    fireEvent.change(textarea, { target: { value: 'AP switch replaced permanently.' } });
    fireEvent.click(screen.getByTestId('staff-post-note-btn'));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(101, 'AP switch replaced permanently.');
    });
    expect(await screen.findByText(/AP switch replaced permanently\./i)).toBeInTheDocument();
  });
});