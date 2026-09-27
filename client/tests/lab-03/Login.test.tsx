import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Login } from '../../src/components/Login';
import * as api from '../../src/api';
import { AuthProvider } from '../../src/context/AuthContext';

describe('UI-01: Login Form Validation & Busy States (FR-01, AC-3.1)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Default mock for getMe during AuthProvider init
    vi.spyOn(api, 'getMeApi').mockRejectedValue(new Error('Unauthenticated'));
  });

  const renderLogin = () => {
    return render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
  };

  it('renders login form elements and accessibility labels per ui-spec §3.1', async () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays inline validation errors when submitting empty fields', async () => {
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('displays inline validation error for malformed email', async () => {
    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email-format' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility when eye button is clicked', async () => {
    renderLogin();

    const passwordInput = screen.getByLabelText(/password \*/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput.type).toBe('password');
  });

  it('displays safe error banner on authentication failure (BR-04, AC-3.1)', async () => {
    vi.spyOn(api, 'loginApi').mockRejectedValueOnce({
      statusCode: 401,
      message: 'Invalid email or password',
      errorData: { message: 'Invalid email or password' },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'alex.turner@toktickit.kmutt.ac.th' },
    });
    fireEvent.change(screen.getByLabelText(/password \*/i), {
      target: { value: 'WrongPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/invalid email or password/i);
    });
  });

  it('displays busy spinner and disables button during submission', async () => {
    let resolveLogin: (val: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    vi.spyOn(api, 'loginApi').mockReturnValue(loginPromise as any);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jennifer.anderson@kmutt.ac.th' },
    });
    fireEvent.change(screen.getByLabelText(/password \*/i), {
      target: { value: 'Password123!' },
    });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Button should show spinner and be disabled
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/signing in.../i)).toBeInTheDocument();

    // Resolve login
    resolveLogin!({
      user: {
        id: 1,
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@kmutt.ac.th',
        role: 'REQUESTER',
        requiresPasswordChange: false,
      },
      token: 'mock-token',
    });
  });
});
