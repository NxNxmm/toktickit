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

const mockDetail: api.TicketDetail = {
  id: 101,
  ticketNo: 'TKT-2026-000101',
  summary: 'VPN disconnects unexpectedly during remote sessions',
  description: 'The connection drops every 10-15 minutes while using the KMUTT secure gateway. I have to re-enter credentials constantly.',
  currentStatus: 'NEW',
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
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
  attachments: [
    {
      id: 1,
      originalName: 'vpn_log.txt',
      fileSize: 1024,
      mimeType: 'text/plain',
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      createdAt: '2026-09-04T10:05:00.000Z',
    },
    {
      id: 2,
      originalName: 'error_screenshot.png',
      fileSize: 2048,
      mimeType: 'image/png',
      isRemoved: true,
      removedAt: '2026-09-04T10:20:00.000Z',
      removalReason: 'Accidentally uploaded duplicate screenshot',
      createdAt: '2026-09-04T10:10:00.000Z',
    },
  ],
};

describe('TicketDetail Component (Issue 6 - AC 1, AC 2, AC 5, UI-07)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_selected_requester', JSON.stringify(mockRequester));
    vi.restoreAllMocks();
  });

  it('renders read-only ticket details, badges, and problem statement', async () => {
    vi.spyOn(api, 'getTicketById').mockResolvedValue(mockDetail);

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    // Shows loading state initially
    expect(screen.getByText(/Loading ticket details/i)).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000101')).toBeInTheDocument();
    });

    // Verify summary, description, category, and related system
    expect(screen.getByText(mockDetail.summary)).toBeInTheDocument();
    expect(screen.getByText(mockDetail.description)).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Campus VPN Gateway')).toBeInTheDocument();

    // Verify status & priority badges
    expect(screen.getByText('NEW')).toBeInTheDocument();
    const highBadges = screen.getAllByText('HIGH');
    expect(highBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('displays attachments with active and removed states correctly', async () => {
    vi.spyOn(api, 'getTicketById').mockResolvedValue(mockDetail);

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('vpn_log.txt')).toBeInTheDocument();
    });

    // Active file has enabled Download and Remove buttons
    expect(screen.getByRole('button', { name: /⬇️ Download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();

    // Removed file displays originalName, "Removed" badge, and disabled Download button
    expect(screen.getByText('error_screenshot.png')).toBeInTheDocument();
    expect(screen.getByText(/🚫 Removed/i)).toBeInTheDocument();
    expect(screen.getByText(/Accidentally uploaded duplicate screenshot/i)).toBeInTheDocument();

    const disabledDownload = screen.getByRole('button', { name: /🔒 Download/i });
    expect(disabledDownload).toBeDisabled();
  });

  it('calls onBack when back button is clicked', async () => {
    vi.spyOn(api, 'getTicketById').mockResolvedValue(mockDetail);
    const mockOnBack = vi.fn();

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={mockOnBack} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000101')).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /Back to My Tickets/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('handles 403 Forbidden cross-requester access rejection with friendly message', async () => {
    const error403: any = new Error('Access denied: Active requester does not own this ticket.');
    error403.statusCode = 403;
    error403.errorData = { message: 'Access denied: Active requester does not own this ticket.' };
    vi.spyOn(api, 'getTicketById').mockRejectedValue(error403);

    render(
      <RequesterProvider>
        <TicketDetail ticketId={999} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
    expect(screen.getByText(/Active requester does not own this ticket/i)).toBeInTheDocument();
  });

  it('submits a removal reason when soft-removing an attachment', async () => {
    vi.spyOn(api, 'getTicketById').mockResolvedValue(mockDetail);
    const removeSpy = vi.spyOn(api, 'softRemoveAttachment').mockResolvedValue({
      id: 1,
      ticketId: 101,
      originalName: 'vpn_log.txt',
      isRemoved: true,
      removedAt: '2026-09-04T10:30:00.000Z',
      removalReason: 'Contains sensitive user credentials',
    });

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('vpn_log.txt')).toBeInTheDocument();
    });

    // Click remove button on active attachment
    const removeBtn = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(removeBtn);

    // Removal dialog should be open
    expect(screen.getByText(/Remove Attachment/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Explain why this attachment is being removed/i);
    fireEvent.change(textarea, { target: { value: 'Contains sensitive user credentials' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Removal/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(1, 'Contains sensitive user credentials', 1);
    });
  });
});
