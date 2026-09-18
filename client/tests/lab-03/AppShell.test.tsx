import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../../src/App';
import * as api from '../../src/api';

describe('UI-03: App Shell Renders User Name and Role Badge (FR-04, AC-3.5)', () => {
  const requesterUser: api.User = {
    id: 1,
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@kmutt.ac.th',
    role: 'REQUESTER',
    requiresPasswordChange: false,
  };

  const staffUser: api.User = {
    id: 5,
    name: 'Alex Turner',
    email: 'alex.turner@toktickit.kmutt.ac.th',
    role: 'IT_STAFF',
    requiresPasswordChange: false,
  };

  const adminUser: api.User = {
    id: 9,
    name: 'Admin Boss',
    email: 'admin@toktickit.kmutt.ac.th',
    role: 'ADMIN',
    requiresPasswordChange: false,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Mock getTickets to prevent empty ticket load error
    vi.spyOn(api, 'apiFetch').mockImplementation((endpoint: string) => {
      if (endpoint.includes('/api/tickets')) {
        return Promise.resolve({
          items: [],
          pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false },
        }) as any;
      }
      return Promise.resolve([]) as any;
    });
  });

  it('renders authenticated Requester name, initials, role badge and requester links', async () => {
    localStorage.setItem('toktickit_auth_token', 'req-token');
    vi.spyOn(api, 'getMeApi').mockResolvedValue(requesterUser);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('TokTickIT')).toBeInTheDocument();
      expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument();
      expect(screen.getByText('JA')).toBeInTheDocument();
      expect(screen.getByText('Requester')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /my tickets/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ create ticket/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    // Verify old Development Requester selector & warning banner are completely removed
    expect(screen.queryByText(/Select a Development Requester/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DEVELOPMENT MODE — Logged in as testing requester/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Change Requester/i)).not.toBeInTheDocument();
  });

  it('renders IT Staff navigation tabs and staff role badge', async () => {
    localStorage.setItem('toktickit_auth_token', 'staff-token');
    vi.spyOn(api, 'getMeApi').mockResolvedValue(staffUser);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Alex Turner')).toBeInTheDocument();
      expect(screen.getByText('AT')).toBeInTheDocument();
      expect(screen.getByText('IT Staff')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ticket queue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ create ticket/i })).toBeInTheDocument();
    });
  });

  it('renders Administrator navigation tab and admin role badge', async () => {
    localStorage.setItem('toktickit_auth_token', 'admin-token');
    vi.spyOn(api, 'getMeApi').mockResolvedValue(adminUser);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Admin Boss')).toBeInTheDocument();
      expect(screen.getByText('AB')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /user management/i })).toBeInTheDocument();
    });
  });

  it('clicking Logout clears session and redirects immediately to Login view', async () => {
    localStorage.setItem('toktickit_auth_token', 'req-token');
    vi.spyOn(api, 'getMeApi').mockResolvedValue(requesterUser);
    const logoutSpy = vi.spyOn(api, 'logoutApi').mockResolvedValue({ message: 'Logged out successfully' });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
      // Should now render Login screen
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByText('Jennifer Anderson')).not.toBeInTheDocument();
    });
  });
});
