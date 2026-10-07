/**
 * client/tests/lab-04/StaffDashboard.test.tsx
 *
 * Vitest / React Testing Library unit tests for StaffDashboard.
 * Covers UI-04-09 (AC-13, AC-14 / FR-15):
 *   - 5 operational metric cards render with correct counts
 *   - Clicking a card calls onNavigate with correct filter (drill-down)
 *   - Admin user additionally sees user stats section
 *   - Empty state shown when no recent tickets
 *   - Error banner shown on API failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StaffDashboard } from '../../src/components/StaffDashboard';
import * as api from '../../src/api';
import * as AuthContext from '../../src/context/AuthContext';

// ─── Mock api module ─────────────────────────────────────────────────────────
vi.mock('../../src/api', async (importOriginal) => {
  const original = await importOriginal<typeof api>();
  return {
    ...original,
    getStaffDashboard: vi.fn(),
    getAdminDashboard: vi.fn(),
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

const mockGetStaffDashboard = api.getStaffDashboard as ReturnType<typeof vi.fn>;
const mockGetAdminDashboard = api.getAdminDashboard as ReturnType<typeof vi.fn>;
const mockUseAuth = AuthContext.useAuth as ReturnType<typeof vi.fn>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const STAFF_USER = {
  id: 20,
  name: 'Alex Turner',
  email: 'alex.turner@toktickit.kmutt.ac.th',
  role: 'IT_STAFF' as api.Role,
  requiresPasswordChange: false,
};

const ADMIN_USER = {
  id: 1,
  name: 'System Admin',
  email: 'admin@toktickit.kmutt.ac.th',
  role: 'ADMIN' as api.Role,
  requiresPasswordChange: false,
};

const MOCK_STAFF_METRICS: api.StaffDashboardMetrics = {
  newTickets: 2,
  openTickets: 5,
  inProgressTickets: 3,
  waitingForRequesterTickets: 1,
  myAssignedTickets: 4,
};

const MOCK_RECENT_TICKETS: api.DashboardRecentTicket[] = [
  {
    id: 1,
    ticketNumber: 'TKT-SEED-001',
    title: 'Laptop battery drains quickly',
    status: 'IN_PROGRESS',
    itPriority: 'HIGH',
    updatedAt: new Date('2026-05-12T09:14:00.000Z').toISOString(),
  },
  {
    id: 2,
    ticketNumber: 'TKT-SEED-003',
    title: 'Email client crashes on startup',
    status: 'OPEN',
    itPriority: 'MEDIUM',
    updatedAt: new Date('2026-05-11T07:30:00.000Z').toISOString(),
  },
];

const MOCK_STAFF_DATA: api.StaffDashboardData = {
  metrics: MOCK_STAFF_METRICS,
  recentTickets: MOCK_RECENT_TICKETS,
};

const MOCK_ADMIN_DATA: api.AdminDashboardData = {
  operational: MOCK_STAFF_METRICS,
  userStats: {
    activeRequesters: 10,
    activeStaff: 3,
    activeAdmins: 1,
    totalUsers: 15,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function renderStaffDashboard(onNavigate = vi.fn()) {
  return render(<StaffDashboard onNavigate={onNavigate} />);
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('StaffDashboard (UI-04-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: STAFF_USER,
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    });
    // Default: admin dashboard returns not-called (staff only)
    mockGetAdminDashboard.mockResolvedValue(MOCK_ADMIN_DATA);
  });

  // ── 5 metric cards render with correct counts ─────────────────────────
  it('UI-04-09a (AC-13 / FR-15): Renders 5 operational metric cards with correct counts', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);

    renderStaffDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('metric-new-tickets-count')).toBeDefined();
    });

    expect(screen.getByTestId('metric-new-tickets-count').textContent).toBe('2');
    expect(screen.getByTestId('metric-open-tickets-count').textContent).toBe('5');
    expect(screen.getByTestId('metric-in-progress-tickets-count').textContent).toBe('3');
    expect(screen.getByTestId('metric-waiting-tickets-count').textContent).toBe('1');
    expect(screen.getByTestId('metric-my-assigned-count').textContent).toBe('4');
  });

  // ── All 5 card containers present ────────────────────────────────────
  it('UI-04-09b: All 5 metric cards are present in the DOM', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);

    renderStaffDashboard();

    await waitFor(() => expect(screen.getByTestId('metric-new-tickets')).toBeDefined());
    expect(screen.getByTestId('metric-open-tickets')).toBeDefined();
    expect(screen.getByTestId('metric-in-progress-tickets')).toBeDefined();
    expect(screen.getByTestId('metric-waiting-tickets')).toBeDefined();
    expect(screen.getByTestId('metric-my-assigned')).toBeDefined();
  });

  // ── Drill-down: clicking "New" card ────────────────────────────────────
  it('UI-04-09c (AC-14): Clicking "New" metric card calls onNavigate with NEW filter', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);
    const onNavigate = vi.fn();

    renderStaffDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('metric-new-tickets')).toBeDefined());
    fireEvent.click(screen.getByTestId('metric-new-tickets'));

    expect(onNavigate).toHaveBeenCalledWith('staff-queue', 'NEW');
  });

  // ── Drill-down: clicking "Open" card ──────────────────────────────────
  it('UI-04-09d (AC-14): Clicking "Open" metric card calls onNavigate with OPEN filter', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);
    const onNavigate = vi.fn();

    renderStaffDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('metric-open-tickets')).toBeDefined());
    fireEvent.click(screen.getByTestId('metric-open-tickets'));

    expect(onNavigate).toHaveBeenCalledWith('staff-queue', 'OPEN');
  });

  // ── Drill-down: clicking "My Assigned" card ────────────────────────────
  it('UI-04-09e (AC-14): Clicking "My Assigned" card navigates to personal queue', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);
    const onNavigate = vi.fn();

    renderStaffDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('metric-my-assigned')).toBeDefined());
    fireEvent.click(screen.getByTestId('metric-my-assigned'));

    expect(onNavigate).toHaveBeenCalledWith('staff-queue', 'me');
  });

  // ── Recent tickets table renders ─────────────────────────────────────
  it('UI-04-09f: Recent tickets table renders rows with ticket numbers', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);

    renderStaffDashboard();

    await waitFor(() => expect(screen.getByTestId('staff-recent-tickets-table')).toBeDefined());
    expect(screen.getByText('TKT-SEED-001')).toBeDefined();
    expect(screen.getByText('TKT-SEED-003')).toBeDefined();
  });

  // ── Empty state when no recent tickets ────────────────────────────────
  it('UI-04-09g (AC-15): Empty state rendered when no recent tickets', async () => {
    mockGetStaffDashboard.mockResolvedValue({ metrics: MOCK_STAFF_METRICS, recentTickets: [] });

    renderStaffDashboard();

    await waitFor(() => expect(screen.getByTestId('staff-dashboard-empty')).toBeDefined());
  });

  // ── Error banner ──────────────────────────────────────────────────────
  it('UI-04-09h: Error banner shown when API call fails', async () => {
    mockGetStaffDashboard.mockRejectedValue(new Error('500 Internal Server Error'));

    renderStaffDashboard();

    await waitFor(() => expect(screen.getByTestId('dashboard-error-banner')).toBeDefined());
  });

  // ── Quick actions present ─────────────────────────────────────────────
  it('UI-04-09i: Quick action buttons are present and call onNavigate', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);
    const onNavigate = vi.fn();

    renderStaffDashboard(onNavigate);

    await waitFor(() => expect(screen.getByTestId('quick-action-create-ticket')).toBeDefined());

    fireEvent.click(screen.getByTestId('quick-action-create-ticket'));
    expect(onNavigate).toHaveBeenCalledWith('create-ticket');

    fireEvent.click(screen.getByTestId('quick-action-search-tickets'));
    expect(onNavigate).toHaveBeenCalledWith('staff-queue');

    fireEvent.click(screen.getByTestId('quick-action-my-queue'));
    expect(onNavigate).toHaveBeenCalledWith('staff-queue', 'me');
  });

  // ── Admin user gets additional user stats section ──────────────────────
  it('UI-04-09j (AC-14): Admin user sees admin user stats section', async () => {
    mockUseAuth.mockReturnValue({
      user: ADMIN_USER,
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    });
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);
    mockGetAdminDashboard.mockResolvedValue(MOCK_ADMIN_DATA);

    renderStaffDashboard();

    await waitFor(() => expect(screen.getByTestId('admin-user-stats')).toBeDefined());
    expect(screen.getByTestId('admin-stat-requesters-count').textContent).toBe('10');
    expect(screen.getByTestId('admin-stat-staff-count').textContent).toBe('3');
    expect(screen.getByTestId('admin-stat-admins-count').textContent).toBe('1');
    expect(screen.getByTestId('admin-stat-total-count').textContent).toBe('15');
  });

  // ── IT_STAFF does NOT see admin user stats ─────────────────────────────
  it('UI-04-09k: IT_STAFF does not see admin user stats section', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);

    renderStaffDashboard();

    await waitFor(() => expect(screen.getByTestId('metric-new-tickets')).toBeDefined());

    // admin-user-stats should not exist for non-admin
    expect(screen.queryByTestId('admin-user-stats')).toBeNull();
  });

  // ── Greeting includes user name ───────────────────────────────────────
  it('UI-04-09l: Greeting header includes user first name', async () => {
    mockGetStaffDashboard.mockResolvedValue(MOCK_STAFF_DATA);

    renderStaffDashboard();

    await waitFor(() => {
      const dashboard = screen.getByTestId('staff-dashboard');
      expect(dashboard.textContent).toContain('Alex');
    });
  });
});
