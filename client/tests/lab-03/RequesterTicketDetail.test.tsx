import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TicketDetail } from '../../src/components/TicketDetail';
import * as api from '../../src/api';
import { RequesterProvider } from '../../src/context/RequesterContext';

const mockRequester = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@kmutt.ac.th',
  department: 'Computer Engineering',
  isActive: true,
};

const mockDetailWithComments: api.TicketDetail = {
  id: 101,
  ticketNo: 'TKT-2026-000101',
  summary: 'VPN disconnects unexpectedly during remote sessions',
  description: 'The connection drops every 10-15 minutes while using the KMUTT secure gateway.',
  currentStatus: 'IN_PROGRESS',
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
  resolvedIndicated: false,
  resolvedIndicatedAt: null,
  createdAt: '2026-09-04T10:00:00.000Z',
  updatedAt: '2026-09-04T10:30:00.000Z',
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 3,
  requester: {
    id: 1,
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@kmutt.ac.th',
  },
  category: {
    id: 2,
    name: 'Network',
  },
  relatedSystem: {
    id: 3,
    name: 'Campus VPN Gateway',
  },
  attachments: [],
  publicComments: [
    {
      id: 1,
      ticketId: 101,
      author: {
        id: 1,
        name: 'Jennifer Anderson',
        role: 'REQUESTER',
      },
      content: 'I noticed this happens mostly on the 4th floor.',
      createdAt: '2026-09-04T10:15:00.000Z',
    },
    {
      id: 2,
      ticketId: 101,
      author: {
        id: 5,
        name: 'Alex Turner',
        role: 'IT_STAFF',
      },
      content: 'We are investigating the access point on floor 4.',
      createdAt: '2026-09-04T10:25:00.000Z',
    },
  ],
};

describe('Requester TicketDetail - Public Comments & Resolve Indication (Lab 3 Issue 4)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_selected_requester', JSON.stringify(mockRequester));
    vi.restoreAllMocks();
  });

  it('renders Public Comments thread with author, role badge, and content (AC-4.2)', async () => {
    vi.spyOn(api, 'getTicketById').mockResolvedValue(mockDetailWithComments);

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000101')).toBeInTheDocument();
    });

    // Check comments feed header
    expect(screen.getByText(/Public Comments \(2\)/i)).toBeInTheDocument();

    // Check individual comments
    expect(screen.getByText('I noticed this happens mostly on the 4th floor.')).toBeInTheDocument();
    expect(screen.getByText('We are investigating the access point on floor 4.')).toBeInTheDocument();

    // Check author and role badges
    expect(screen.getAllByText('Jennifer Anderson').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Alex Turner')).toBeInTheDocument();
    expect(screen.getAllByText('Requester').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('IT Staff')).toBeInTheDocument();
  });

  it('validates comment input length (BR-16) and posts new comment (AC-4.2)', async () => {
    vi.spyOn(api, 'getTicketById').mockResolvedValue(mockDetailWithComments);
    const postSpy = vi.spyOn(api, 'postPublicComment').mockResolvedValue({
      id: 3,
      ticketId: 101,
      author: {
        id: 1,
        name: 'Jennifer Anderson',
        role: 'REQUESTER',
      },
      content: 'The connection seems stable now, thank you!',
      createdAt: new Date().toISOString(),
    });

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000101')).toBeInTheDocument();
    });

    const postBtn = screen.getByRole('button', { name: /Post Comment/i });
    const textarea = screen.getByPlaceholderText(/Type your comment here/i);

    // Initially empty -> button is disabled
    expect(postBtn).toBeDisabled();

    // 1 character -> still disabled (BR-16: min 2 chars)
    fireEvent.change(textarea, { target: { value: 'A' } });
    expect(postBtn).toBeDisabled();
    expect(screen.getByText(/minimum 2 characters required/i)).toBeInTheDocument();

    // Valid comment -> enabled
    fireEvent.change(textarea, { target: { value: 'The connection seems stable now, thank you!' } });
    expect(postBtn).toBeEnabled();

    // Click Post Comment
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(101, 'The connection seems stable now, thank you!', 1);
    });

    // Verify comment appears in the list and textarea is cleared
    await waitFor(() => {
      expect(screen.getByText('The connection seems stable now, thank you!')).toBeInTheDocument();
    });
    expect(textarea).toHaveValue('');
  });

  it('renders "Problem Appears Resolved" button and records indication upon confirmation (AC-4.3)', async () => {
    vi.spyOn(api, 'getTicketById').mockResolvedValue(mockDetailWithComments);
    const resolveSpy = vi.spyOn(api, 'postResolveIndication').mockResolvedValue({
      message: 'Resolution indication recorded',
      resolvedIndicated: true,
      resolvedIndicatedAt: '2026-09-04T11:00:00.000Z',
    });

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000101')).toBeInTheDocument();
    });

    // "Problem Appears Resolved" button should be visible
    const resolveBtn = screen.getByRole('button', { name: /Problem Appears Resolved/i });
    expect(resolveBtn).toBeInTheDocument();

    // Click button to open confirmation dialog
    fireEvent.click(resolveBtn);

    // Confirmation modal should appear with spec prompt
    expect(screen.getByText(/Signal that this problem appears resolved\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Formal ticket status will remain unchanged until verified by IT Staff/i)).toBeInTheDocument();

    // Click Confirm
    const confirmBtn = screen.getByRole('button', { name: /Yes, Problem Resolved/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(resolveSpy).toHaveBeenCalledWith(101, 1);
    });

    // Button should disappear and "Resolution Indicated" badge should appear
    await waitFor(() => {
      expect(screen.getByText(/Resolution Indicated/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Problem Appears Resolved/i })).not.toBeInTheDocument();
  });

  it('displays "Resolution Indicated" badge directly if ticket already has resolvedIndicated: true', async () => {
    const alreadyResolvedTicket = {
      ...mockDetailWithComments,
      resolvedIndicated: true,
      resolvedIndicatedAt: '2026-09-04T11:00:00.000Z',
    };
    vi.spyOn(api, 'getTicketById').mockResolvedValue(alreadyResolvedTicket);

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000101')).toBeInTheDocument();
    });

    expect(screen.getByText(/Resolution Indicated/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Problem Appears Resolved/i })).not.toBeInTheDocument();
  });
});
