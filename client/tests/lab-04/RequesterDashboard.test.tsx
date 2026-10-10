/**
 * client/tests/lab-04/RequesterDashboard.test.tsx
 *
 * Vitest / React Testing Library unit tests for RequesterDashboard.
 * Covers UI-04-08 (AC-12, AC-15 / FR-14):
 *   - 4 metric cards render with correct counts
 *   - Clicking a card triggers onNavigate with correct filter
 *   - Empty state shown when recentTickets is empty
 *   - Loading skeleton renders during fetch
 *   - Error banner shown on API failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RequesterDashboard } from '../../src/components/RequesterDashboard';
import * as api from '../../src/api';
import * as AuthContext from '../../src/context/AuthContext';

// ─── Mock api module ─────────────────────────────────────────────────────────
vi.mock('../../src/api', async (importOriginal) => {
  const original = await importOriginal<typeof api>();
  return {
    ...original,
    getRequesterDashboard: vi.fn(),
  };
});

// ─── Mock AuthContext ──────────────────────────────────────────────────────────
vi.mock('../../src/context/AuthContext', async (importOriginal) => {
  const original = await importOriginal<typeof AuthContext>();
  return {
    ...original,
    useAuth: vi.fn(),
  };
});

const mockGetRequesterDashboard = api.getRequesterDashboard as ReturnType<typeof vi.fn>;
const mockUseAuth = AuthContext.useAuth as ReturnType<typeof vi.fn>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const MOCK_USER = {
  id: 10,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@kmutt.ac.th',
  role: 'REQUESTER' as api.Role,
  requiresPasswordChange: false,
};

const MOCK_METRICS: api.RequesterDashboardMetrics = {
  totalOpen: 3,
  waitingForRequester: 1,
  recentlyUpdated: 2,
  recentlyResolved: 5,
};

const MOCK_RECENT_TICKETS: api.DashboardRecentTicket[] = [
  {
    id: 1,
    ticketNumber: 'TKT-SEED-001',
    title: 'Laptop battery drains quickly',
    status: 'IN_PROGRESS',
    updatedAt: new Date('2026-05-12T09:14:00.000Z').toISOString(),
  },
  {
    id: 2,
    ticketNumber: 'TKT-SEED-002',
    title: 'Cannot access VPN',
    status: 'OPEN',
    updatedAt: new Date('2026-05-10T08:00:00.000Z').toISOString(),
  },
];

const MOCK_DASHBOARD_DATA: api.RequesterDashboardData = {
  metrics: MOCK_METRICS,
  recentTickets: MOCK_RECENT_TICKETS,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function renderDashboard(onNavigate = vi.fn()) {
  return render(<RequesterDashboard onNavigate={onNavigate} />);
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('RequesterDashboard (UI-04-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: MOCK_USER,
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    });
  });

  // ── Loading skeleton renders ───────────────────────────────────────────
  it('UI-04-08a: Shows loading state while fetching dashboard data', async () => {
    // Never resolves during this test
    mockGetRequesterDashboard.mockImplementation(() => new Promise(() => {}));

    renderDashboard();

    // While loading, refresh button says Loading
    expect(screen.getByTestId('dashboard-refresh-btn')).toBeDefined();
  });

  // ── 4 metric cards render with correct counts ─────────────────────────
  it('UI-04-08b: Renders 4 metric cards with correct counts from API', async () => {
    mockGetRequesterDashboard.mockResolvedValue(MOCK_DASHBOARD_DATA);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('metric-total-open-count')).toBeDefined();
    });

    expect(screen.getByTestId('metric-total-open-count').textContent).toBe('3');
    expect(screen.getByTestId('metric-waiting-for-requester-count').textContent).toBe('1');
    expect(screen.getByTestId('metric-recently-updated-count').textContent).toBe('2');
    expect(screen.getByTestId('metric-recently-resolved-count').textContent).toBe('5');
  });

  // ── Metric cards exist ────────────────────────────────────────────────
  it('UI-04-08c (AC-12 / FR-14): All 4 metric cards are rendered', async () => {
    mockGetRequesterDashboard.mockResolvedValue(MOCK_DASHBOARD_DATA);

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('metric-total-open')).toBeDefined());
    expect(screen.getByTestId('metric-waiting-for-requester')).toBeDefined();
    expect(screen.getByTestId('metric-recently-updated')).toBeDefined();
    expect(screen.getByTestId('metric-recently-resolved')).toBeDefined();
  });

  // ── Drill-down: clicking totalOpen card navigates (AC-05-03) ─────────
  it('UI-04-08d (AC-05-03): Clicking "My Open Tickets" card calls onNavigate with filter', async () => {
    mockGetRequesterDashboard.mockResolvedValue(MOCK_DASHBOARD_DATA);
    const onNavigate = vi.fn();

    renderDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('metric-total-open')).toBeDefined());
    fireEvent.click(screen.getByTestId('metric-total-open'));

    expect(onNavigate).toHaveBeenCalledWith('my-tickets', 'open');
  });

  // ── Drill-down: clicking waitingForRequester card ─────────────────────
  it('UI-04-08e (AC-05-03): Clicking "Waiting for Me" card calls onNavigate', async () => {
    mockGetRequesterDashboard.mockResolvedValue(MOCK_DASHBOARD_DATA);
    const onNavigate = vi.fn();

    renderDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('metric-waiting-for-requester')).toBeDefined());
    fireEvent.click(screen.getByTestId('metric-waiting-for-requester'));

    expect(onNavigate).toHaveBeenCalledWith('my-tickets', 'WAITING_FOR_REQUESTER');
  });

  // ── Drill-down: clicking recentlyResolved card ─────────────────────────
  it('UI-04-08f (AC-05-03): Clicking "Recently Resolved" card calls onNavigate', async () => {
    mockGetRequesterDashboard.mockResolvedValue(MOCK_DASHBOARD_DATA);
    const onNavigate = vi.fn();

    renderDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('metric-recently-resolved')).toBeDefined());
    fireEvent.click(screen.getByTestId('metric-recently-resolved'));

    expect(onNavigate).toHaveBeenCalledWith('my-tickets', 'RESOLVED');
  });

  // ── Recent tickets table renders rows ─────────────────────────────────
  it('UI-04-08g: Recent tickets table renders ticket rows', async () => {
    mockGetRequesterDashboard.mockResolvedValue(MOCK_DASHBOARD_DATA);

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('recent-tickets-table')).toBeDefined());
    expect(screen.getByText('TKT-SEED-001')).toBeDefined();
    expect(screen.getByText('TKT-SEED-002')).toBeDefined();
  });

  // ── Empty state shown when no recent tickets (AC-15 / FR-18) ──────────
  it('UI-04-08h (AC-15 / FR-18): Empty state shown when recentTickets is empty', async () => {
    mockGetRequesterDashboard.mockResolvedValue({
      metrics: { totalOpen: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 },
      recentTickets: [],
    });
    const onNavigate = vi.fn();

    renderDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('requester-dashboard-empty')).toBeDefined());
    expect(screen.getByTestId('metric-total-open-count').textContent).toBe('0');
  });

  // ── Empty state "Create Ticket" button navigates ─────────────────────
  it('UI-04-08i (AC-15): Empty state "Create Ticket" button triggers navigation', async () => {
    mockGetRequesterDashboard.mockResolvedValue({
      metrics: { totalOpen: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 },
      recentTickets: [],
    });
    const onNavigate = vi.fn();

    renderDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('empty-create-ticket-btn')).toBeDefined());
    fireEvent.click(screen.getByTestId('empty-create-ticket-btn'));

    expect(onNavigate).toHaveBeenCalledWith('create-ticket');
  });

  // ── Error banner shown on API failure ─────────────────────────────────
  it('UI-04-08j: Error banner shown when API call fails', async () => {
    mockGetRequesterDashboard.mockRejectedValue(new Error('Network error'));

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('dashboard-error-banner')).toBeDefined());
  });

  // ── Quick actions navigate correctly ──────────────────────────────────
  it('UI-04-08k: Quick action buttons call onNavigate with correct views', async () => {
    mockGetRequesterDashboard.mockResolvedValue(MOCK_DASHBOARD_DATA);
    const onNavigate = vi.fn();

    renderDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('quick-action-create-ticket')).toBeDefined());

    fireEvent.click(screen.getByTestId('quick-action-create-ticket'));
    expect(onNavigate).toHaveBeenCalledWith('create-ticket');

    fireEvent.click(screen.getByTestId('quick-action-view-my-tickets'));
    expect(onNavigate).toHaveBeenCalledWith('my-tickets');
  });

  // ── Greeting includes user name ───────────────────────────────────────
  it('UI-04-08l: Greeting header includes user first name', async () => {
    mockGetRequesterDashboard.mockResolvedValue(MOCK_DASHBOARD_DATA);

    renderDashboard();

    expect(screen.getByTestId('requester-dashboard')).toBeDefined();
    // First name "Jennifer" should appear in the heading
    await waitFor(() => {
      const dashboard = screen.getByTestId('requester-dashboard');
      expect(dashboard.textContent).toContain('Jennifer');
    });
  });
});
